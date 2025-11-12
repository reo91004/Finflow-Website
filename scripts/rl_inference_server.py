#!/usr/bin/env python3
"""
FinFlow inference server backed by the IRT reinforcement learning model.

This server exposes portfolio prediction, explainability, and analytics APIs that the
Next.js frontend consumes. It reuses the pre-computed evaluation artefacts stored under
`scripts/irt_assets/20251016_192706` so responses remain fast while still reflecting
the behaviour of the trained IRT policy.
"""

import json
import math
import os
import warnings
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import uvicorn
import yfinance as yf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Optional HTTP session (curl_cffi) for more reliable financial data fetching
# ---------------------------------------------------------------------------
try:
    from curl_cffi import requests  # type: ignore

    session = requests.Session(impersonate="chrome")
    print("curl_cffi 세션 생성 성공 - Chrome 모방 모드")
except Exception:
    session = None
    print("curl_cffi 미설치 - 기본 HTTP 세션 사용")

# ---------------------------------------------------------------------------
# Inference artefacts (model, evaluation results, etc.)
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
BASE_DIR = SCRIPT_DIR.parent
IRT_ASSETS_DIR = SCRIPT_DIR / "irt_assets"
MODEL_BUNDLE_DIR = IRT_ASSETS_DIR / "20251016_192706"

DEFAULT_DOW_30_TICKERS = [
    "AAPL",
    "MSFT",
    "JPM",
    "GS",
    "BA",
    "CAT",
    "MMM",
    "HON",
    "IBM",
    "NVDA",
    "KO",
    "MCD",
    "MRK",
    "MS",
    "NKE",
    "PG",
    "TRV",
    "UNH",
    "V",
    "VZ",
    "WMT",
    "CVX",
    "XOM",
    "AMGN",
    "AXP",
    "CRM",
    "CSCO",
    "DIS",
    "HD",
    "JNJ",
]
DEFAULT_TEST_START = "2021-01-01"
DEFAULT_TEST_END = "2024-12-31"


# ---------------------------------------------------------------------------
# Pydantic models (request/response contracts)
# ---------------------------------------------------------------------------
class PredictionRequest(BaseModel):
    investment_amount: float
    risk_tolerance: str = "moderate"
    investment_horizon: int = 12  # months


class AllocationItem(BaseModel):
    symbol: str
    weight: float


class MetricsResponse(BaseModel):
    total_return: float
    annual_return: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    volatility: float
    win_rate: float
    profit_loss_ratio: float


class PredictionResponse(BaseModel):
    allocation: List[AllocationItem]
    metrics: MetricsResponse


class XAIRequest(BaseModel):
    investment_amount: float
    risk_tolerance: str = "moderate"
    investment_horizon: int = 12
    method: str = "fast"  # "fast" or "accurate"


class FeatureImportance(BaseModel):
    feature_name: str
    importance_score: float
    asset_name: str


class AttentionWeight(BaseModel):
    from_asset: str
    to_asset: str
    weight: float


class XAIResponse(BaseModel):
    feature_importance: List[FeatureImportance]
    attention_weights: List[AttentionWeight]
    explanation_text: str


class HistoricalRequest(BaseModel):
    portfolio_allocation: List[AllocationItem]
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class PerformanceHistory(BaseModel):
    date: str
    portfolio: float
    spy: float
    qqq: float


class HistoricalResponse(BaseModel):
    performance_history: List[PerformanceHistory]


class CorrelationRequest(BaseModel):
    tickers: List[str]
    period: str = "1y"


class CorrelationData(BaseModel):
    stock1: str
    stock2: str
    correlation: float


class CorrelationResponse(BaseModel):
    correlation_data: List[CorrelationData]


class RiskReturnRequest(BaseModel):
    portfolio_allocation: List[AllocationItem]
    period: str = "1y"


class RiskReturnData(BaseModel):
    symbol: str
    risk: float
    return_rate: float
    allocation: float


class RiskReturnResponse(BaseModel):
    risk_return_data: List[RiskReturnData]


class MarketData(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    last_updated: str


class MarketStatusResponse(BaseModel):
    market_data: List[MarketData]
    last_updated: str


# ---------------------------------------------------------------------------
# IRT-backed analysis service
# ---------------------------------------------------------------------------
class IRTBackendService:
    def __init__(self) -> None:
        self.model_path = MODEL_BUNDLE_DIR / "irt_final.zip"
        if not self.model_path.exists():
            raise FileNotFoundError(f"IRT 모델 파일을 찾을 수 없습니다: {self.model_path}")
        self.model_dir = self.model_path.parent
        self.eval_results_path = self.model_dir / "evaluation_results.json"

        self.stock_tickers = list(DEFAULT_DOW_30_TICKERS)
        self.test_start = DEFAULT_TEST_START
        self.test_end = DEFAULT_TEST_END

        self.analysis_cache: Dict[Tuple[float, str, int, str], Dict[str, Any]] = {}
        self.signature_cache: Dict[str, Dict[str, Any]] = {}
        self.benchmark_cache: Dict[Tuple[str, str, int], Dict[str, List[float]]] = {}
        self.last_analysis: Optional[Dict[str, Any]] = None

        self.precomputed = self._load_precomputed()

        self.growth_tickers = [
            ticker
            for ticker in ("AMZN", "GOOGL", "NVDA", "TSLA", "MSFT")
            if ticker in self.stock_tickers
        ]
        self.defensive_tickers = [
            ticker
            for ticker in ("JNJ", "PG", "KO", "WMT", "MRK")
            if ticker in self.stock_tickers
        ]

    # ------------------------------------------------------------------ utils
    def bootstrap(self) -> None:
        if self.model_path.is_file():
            size_mb = self.model_path.stat().st_size / (1024 * 1024)
            print(f"IRT 모델 확인: {self.model_path} ({size_mb:.1f} MB)")
        elif self.model_path.is_dir():
            file_count = sum(1 for _ in self.model_path.iterdir())
            print(f"IRT 모델 디렉터리 확인: {self.model_path} (파일 {file_count}개)")
        else:
            print(f"IRT 모델 경로를 확인할 수 없습니다: {self.model_path}")

    @staticmethod
    def _normalize_risk(risk: str) -> str:
        mapping = {
            "conservative": "conservative",
            "moderate": "moderate",
            "aggressive": "aggressive",
            "low": "conservative",
            "medium": "moderate",
            "high": "aggressive",
        }
        return mapping.get((risk or "moderate").lower(), "moderate")

    @staticmethod
    def _normalize_mode(mode: str) -> str:
        return "accurate" if (mode or "fast").lower() in {"accurate", "full", "deep"} else "fast"

    @staticmethod
    def _analysis_key(
        amount: float, risk: str, horizon: int, mode: str
    ) -> Tuple[float, str, int, str]:
        return (round(float(amount), 2), risk, int(horizon), mode)

    def _load_precomputed(self) -> Dict[str, Any]:
        if not self.eval_results_path.exists():
            raise FileNotFoundError(
                f"평가 결과 파일을 찾을 수 없습니다: {self.eval_results_path}"
            )

        with self.eval_results_path.open("r", encoding="utf-8") as fp:
            payload = json.load(fp)

        results = payload.get("results", {})
        metrics = results.get("metrics", {})
        series = results.get("series", {})
        irt = results.get("irt", {})
        test_period = results.get("test_period", {})
        self.test_start = test_period.get("start", self.test_start)
        self.test_end = test_period.get("end", self.test_end)

        if irt.get("symbols"):
            self.stock_tickers = list(irt["symbols"])

        portfolio_values = np.asarray(series.get("portfolio_values", []), dtype=np.float64)
        value_returns = np.asarray(series.get("value_returns", []), dtype=np.float64)
        if value_returns.size == 0 and portfolio_values.size > 1:
            prev = np.clip(portfolio_values[:-1], 1e-8, None)
            value_returns = (portfolio_values[1:] - portfolio_values[:-1]) / prev
        exec_returns = np.asarray(series.get("per_step_returns", []), dtype=np.float64)
        cash_series = np.asarray(series.get("cash_ratio", []), dtype=np.float64)
        dates = list(series.get("dates", []))

        weights_history = np.asarray(irt.get("actual_weights", []), dtype=np.float64)
        if weights_history.ndim == 1 and weights_history.size:
            weights_history = weights_history.reshape(1, -1)

        avg_crisis = None
        crisis_levels = np.asarray(irt.get("crisis_levels", []), dtype=np.float64)
        if crisis_levels.size:
            avg_crisis = float(np.clip(np.nanmean(crisis_levels), 0.0, 1.0))

        cumulative_returns = (
            np.cumprod(1.0 + value_returns) - 1.0
            if value_returns.size
            else np.array([], dtype=np.float64)
        )

        if cash_series.size == 0 and weights_history.size:
            cash_series = 1.0 - weights_history.sum(axis=1)

        steps = cumulative_returns.shape[0]
        if steps:
            if weights_history.size:
                if weights_history.shape[0] > steps:
                    weights_history = weights_history[:steps]
                elif weights_history.shape[0] < steps and weights_history.shape[0] > 0:
                    pad = np.repeat(weights_history[-1:], steps - weights_history.shape[0], axis=0)
                    weights_history = np.vstack([weights_history, pad])
            elif steps:
                weights_history = np.zeros((steps, len(self.stock_tickers)), dtype=np.float64)
            if cash_series.size:
                if cash_series.size > steps:
                    cash_series = cash_series[:steps]
                elif cash_series.size < steps:
                    cash_series = np.pad(
                        cash_series,
                        (0, steps - cash_series.size),
                        constant_values=(cash_series[-1],),
                    )
            if len(dates) != steps:
                normalized_dates: List[str] = []
                cursor = self._parse_date(dates[0]) if dates else None
                if cursor is None:
                    cursor = datetime.strptime(self.test_start, "%Y-%m-%d")
                for idx in range(steps):
                    if idx < len(dates):
                        value = dates[idx]
                        normalized_dates.append(value)
                        parsed = self._parse_date(value)
                        if parsed is not None:
                            cursor = parsed
                    else:
                        cursor = cursor + pd.Timedelta(days=1)
                        normalized_dates.append(cursor.strftime("%Y-%m-%d"))
                dates = normalized_dates

        return {
            "metrics": dict(metrics),
            "portfolio_values": portfolio_values,
            "portfolio_returns": cumulative_returns,
            "exec_returns": exec_returns,
            "weights_history": weights_history,
            "cash_series": cash_series,
            "dates": dates,
            "avg_crisis": avg_crisis,
        }

    @staticmethod
    def _allocation_signature(allocation: List[Dict[str, float]]) -> str:
        normalized: List[Tuple[str, float]] = []
        for item in allocation:
            symbol = item.get("symbol")
            if not symbol:
                continue
            weight = float(item.get("weight", 0.0))
            normalized.append((symbol, round(weight, 6)))

        normalized.sort(key=lambda x: x[0])
        return "|".join(f"{sym}:{wt:.6f}" for sym, wt in normalized)

    @staticmethod
    def _parse_date(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        try:
            return pd.to_datetime(value).to_pydatetime()
        except Exception:
            return None

    def _download_prices(
        self,
        tickers: List[str],
        start: Optional[str] = None,
        end: Optional[str] = None,
        period: Optional[str] = None,
    ) -> pd.DataFrame:
        if isinstance(tickers, str):
            tickers = [tickers]
        tickers = [t for t in tickers if t]
        if not tickers:
            return pd.DataFrame()

        # Preferred path: curl_cffi-backed session per ticker (rate-limit friendly)
        if session is not None:
            frames: Dict[str, pd.Series] = {}
            for ticker in tickers:
                try:
                    ticker_obj = yf.Ticker(ticker, session=session)
                    history = (
                        ticker_obj.history(period=period)
                        if period
                        else ticker_obj.history(start=start, end=end)
                    )
                    if not history.empty and "Close" in history:
                        close_series = history["Close"]
                        if hasattr(close_series.index, "tzlocalize") and close_series.index.tz is not None:
                            close_series = close_series.tz_localize(None)
                        frames[ticker] = close_series
                except Exception:
                    continue
            if frames:
                close = pd.DataFrame(frames).dropna()
                if not close.empty and hasattr(close.index, "tz") and close.index.tz is not None:
                    close.index = close.index.tz_localize(None)
                if not close.empty:
                    return close

        # Fallback: bulk download via yfinance
        try:
            data = (
                yf.download(tickers, period=period, progress=False)
                if period
                else yf.download(tickers, start=start, end=end, progress=False)
            )
        except Exception:
            return pd.DataFrame()

        if data.empty:
            return pd.DataFrame()

        if isinstance(data.columns, pd.MultiIndex):
            close = data["Close"].copy()
        else:
            close = data["Close"].to_frame()
            close.columns = tickers
        close = close.dropna()
        if not close.empty:
            try:
                close.index = close.index.tz_localize(None)
            except TypeError:
                pass
        return close

    def _prepare_benchmarks(self, dates: List[str]) -> Dict[str, List[float]]:
        if not dates:
            return {"dates": [], "spy": [], "qqq": []}

        start, end = dates[0], dates[-1]
        cache_key = (start, end, len(dates))
        cached = self.benchmark_cache.get(cache_key)
        if cached:
            return {
                "dates": list(cached["dates"]),
                "spy": list(cached["spy"]),
                "qqq": list(cached["qqq"]),
            }

        close = self._download_prices(["SPY", "QQQ"], start=start, end=end)
        if close.empty:
            result = {
                "dates": dates,
                "spy": [0.0] * len(dates),
                "qqq": [0.0] * len(dates),
            }
            self.benchmark_cache[cache_key] = result
            return result

        daily_returns = close.pct_change().fillna(0)
        cumulative = (1 + daily_returns).cumprod() - 1

        index = pd.to_datetime(dates)
        aligned = cumulative.reindex(index, method="pad").fillna(method="bfill").fillna(0)

        spy_series = (
            aligned["SPY"].astype(float).tolist() if "SPY" in aligned else [0.0] * len(dates)
        )
        qqq_series = (
            aligned["QQQ"].astype(float).tolist() if "QQQ" in aligned else [0.0] * len(dates)
        )

        result = {"dates": dates, "spy": spy_series, "qqq": qqq_series}
        self.benchmark_cache[cache_key] = result
        return result

    def _apply_risk_profile(
        self,
        weights: np.ndarray,
        cash_weight: float,
        risk: str,
        horizon_months: int,
    ) -> Tuple[np.ndarray, float]:
        weights = np.clip(weights.astype(np.float64), 0.0, None)
        cash_weight = float(max(cash_weight, 0.0))

        total = weights.sum() + cash_weight
        if total > 0:
            weights /= total
            cash_weight /= total
        else:
            weights = np.full_like(weights, 1.0 / max(len(weights), 1))
            cash_weight = 0.0

        risk = self._normalize_risk(risk)
        if risk == "conservative":
            boost = min(0.18, 1.0 - cash_weight)
            if boost > 0:
                cash_weight += boost
                weights *= 1.0 - boost
            if self.defensive_tickers and weights.sum() > 0:
                indices = [
                    self.stock_tickers.index(t) for t in self.defensive_tickers if t in self.stock_tickers
                ]
                for idx in indices:
                    weights[idx] *= 1.05
        elif risk == "aggressive":
            reduction = min(0.15, cash_weight)
            if reduction > 0 and weights.sum() > 0:
                cash_weight -= reduction
                weights += (weights / weights.sum()) * reduction

        months = max(int(horizon_months), 1)
        if months <= 6:
            buffer = min(0.1, 1.0 - cash_weight)
            if buffer > 0:
                cash_weight += buffer
                weights *= 1.0 - buffer
        elif months >= 60 and self.growth_tickers:
            indices = [
                self.stock_tickers.index(t) for t in self.growth_tickers if t in self.stock_tickers
            ]
            for idx in indices:
                weights[idx] *= 1.08
            cash_weight *= 0.92

        total = weights.sum() + cash_weight
        if total > 0:
            weights /= total
            cash_weight /= total

        weights = np.clip(weights, 0.0, None)
        if weights.sum() > 0:
            weights /= weights.sum() + cash_weight

        return weights, cash_weight

    def _format_allocation(
        self,
        weights: np.ndarray,
        cash_weight: float,
        amount: float,
    ) -> Tuple[List[Dict[str, float]], float]:
        allocation: List[Dict[str, float]] = []
        for idx, weight in enumerate(weights):
            if idx >= len(self.stock_tickers):
                break
            allocation.append({"symbol": self.stock_tickers[idx], "weight": float(weight)})

        if cash_weight > 0:
            allocation.append({"symbol": "현금", "weight": float(cash_weight)})

        total = sum(item["weight"] for item in allocation)
        if total > 0:
            for item in allocation:
                item["weight"] = float(item["weight"] / total)

        allocation.sort(key=lambda x: x["weight"], reverse=True)
        cash_amount = amount * next(
            (item["weight"] for item in allocation if item["symbol"] == "현금"), 0.0
        )
        return allocation, cash_amount

    @staticmethod
    def _additional_metrics(exec_returns: np.ndarray) -> Tuple[float, float]:
        if exec_returns.size == 0:
            return 0.0, 0.0
        win_rate = float((exec_returns > 0).mean() * 100.0)
        gains = exec_returns[exec_returns > 1e-8]
        losses = -exec_returns[exec_returns < -1e-8]
        if gains.size and losses.size and losses.mean() > 0:
            profit_loss_ratio = float(gains.mean() / losses.mean())
        else:
            profit_loss_ratio = 0.0
        return win_rate, profit_loss_ratio

    def _format_metrics(
        self,
        metrics_raw: Dict[str, float],
        exec_returns: np.ndarray,
    ) -> Dict[str, float]:
        win_rate, profit_loss_ratio = self._additional_metrics(exec_returns)
        total_return = float(metrics_raw.get("total_return", 0.0) * 100)
        annual_return = float(metrics_raw.get("annualized_return", 0.0) * 100)
        sharpe_ratio = float(metrics_raw.get("sharpe_ratio", 0.0))
        sortino_ratio = float(metrics_raw.get("sortino_ratio", 0.0))
        max_drawdown = float(abs(metrics_raw.get("max_drawdown", 0.0)) * 100)
        volatility = float(metrics_raw.get("volatility", 0.0) * 100)
        return {
            "total_return": total_return,
            "annual_return": annual_return,
            "sharpe_ratio": sharpe_ratio,
            "sortino_ratio": sortino_ratio,
            "max_drawdown": max_drawdown,
            "volatility": volatility,
            "win_rate": win_rate,
            "profit_loss_ratio": profit_loss_ratio,
        }

    def _build_feature_importance(self, weights_history: np.ndarray) -> List[Dict[str, float]]:
        if weights_history.size == 0:
            return []

        avg_weights = np.clip(weights_history.mean(axis=0), 0.0, None)
        vol_weights = np.clip(weights_history.std(axis=0), 0.0, None)

        rows: List[Dict[str, float]] = []
        for idx, symbol in enumerate(self.stock_tickers):
            if idx >= avg_weights.size:
                break
            importance = float(avg_weights[idx])
            variability = float(vol_weights[idx])
            if importance > 0:
                rows.append(
                    {
                        "feature_name": "평균 비중",
                        "asset_name": symbol,
                        "importance_score": importance,
                    }
                )
            if variability > 0:
                rows.append(
                    {
                        "feature_name": "비중 변동성",
                        "asset_name": symbol,
                        "importance_score": variability,
                    }
                )

        rows.sort(key=lambda x: x["importance_score"], reverse=True)
        return rows[:40]

    def _build_attention_weights(self, weights_history: np.ndarray) -> List[Dict[str, float]]:
        if weights_history.shape[0] < 2:
            return []

        df = pd.DataFrame(weights_history, columns=self.stock_tickers)
        corr = df.corr()

        attention: List[Dict[str, float]] = []
        for i, sym1 in enumerate(self.stock_tickers):
            for j in range(i + 1, len(self.stock_tickers)):
                sym2 = self.stock_tickers[j]
                if sym1 not in corr.columns or sym2 not in corr.columns:
                    continue
                value = corr.loc[sym1, sym2]
                if not np.isnan(value):
                    attention.append(
                        {"from_asset": sym1, "to_asset": sym2, "weight": float(value)}
                    )

        attention.sort(key=lambda x: abs(x["weight"]), reverse=True)
        return attention[:40]

    def _build_explanation_text(self, analysis: Dict[str, Any]) -> str:
        metrics = analysis["metrics"]
        params = analysis["params"]
        allocation = analysis["allocation"]
        avg_crisis = analysis.get("avg_crisis_level")

        mode_label = "정밀" if analysis["analysis_mode"] == "accurate" else "빠른"
        risk_labels = {
            "conservative": "보수형",
            "moderate": "중립형",
            "aggressive": "공격형",
        }
        risk_label = risk_labels.get(params["risk_tolerance"], params["risk_tolerance"])

        lines = []
        lines.append(
            f"분석 모드: {mode_label}, 투자 성향: {risk_label}, 목표 투자 기간: {params['investment_horizon']}개월."
        )
        lines.append(
            f"누적 수익률 {metrics['total_return']:.2f}%, 연환산 {metrics['annual_return']:.2f}% "
            f"(샤프 {metrics['sharpe_ratio']:.2f}, 변동성 {metrics['volatility']:.2f}%)."
        )

        if avg_crisis is not None:
            crisis_state = (
                "안정적"
                if avg_crisis < 0.4
                else "중립적"
                if avg_crisis < 0.6
                else "위기 민감"
            )
            lines.append(f"평균 위기 레벨 {avg_crisis:.2f} → {crisis_state} 시장 국면을 감지했습니다.")

        top_assets = [item for item in allocation if item["symbol"] != "현금"][:3]
        if top_assets:
            asset_text = ", ".join(
                f"{item['symbol']} {item['weight'] * 100:.1f}%"
                for item in top_assets
            )
            lines.append(f"주요 편입 종목: {asset_text}.")

        cash_item = next((item for item in allocation if item["symbol"] == "현금"), None)
        if cash_item:
            lines.append(
                f"현금 비중은 {cash_item['weight'] * 100:.1f}%로 변동성 완충 및 재진입 여력을 확보했습니다."
            )

        lines.append(
            "IRT Actor는 위기 감지 신호와 프로토타입 혼합을 활용해 일중 리밸런싱을 수행했습니다."
        )
        return "\n".join(lines)

    # ---------------------------------------------------------------- eval
    def _run_evaluation(
        self,
        amount: float,
        mode: str,
    ) -> Dict[str, Any]:
        return {
            "portfolio_values": np.copy(self.precomputed["portfolio_values"]),
            "portfolio_returns": np.copy(self.precomputed["portfolio_returns"]),
            "weights_history": np.copy(self.precomputed["weights_history"]),
            "cash_series": np.copy(self.precomputed["cash_series"]),
            "exec_returns": np.copy(self.precomputed["exec_returns"]),
            "metrics": dict(self.precomputed["metrics"]),
            "dates": list(self.precomputed["dates"]),
            "avg_crisis": self.precomputed["avg_crisis"],
        }

    def _create_analysis(
        self,
        amount: float,
        risk: str,
        horizon: int,
        mode: str,
    ) -> Dict[str, Any]:
        evaluation = self._run_evaluation(amount, mode)

        weights_history = evaluation["weights_history"]
        cash_series = evaluation["cash_series"]
        exec_returns = evaluation["exec_returns"]
        metrics_raw = evaluation["metrics"]
        dates = evaluation["dates"]
        portfolio_returns = evaluation["portfolio_returns"]
        avg_crisis = evaluation.get("avg_crisis")

        steps = len(portfolio_returns)
        if steps == 0:
            base_weights = np.full(len(self.stock_tickers), 1.0 / max(len(self.stock_tickers), 1))
            cash_weight = 0.0
        else:
            target_idx = min(max(int(horizon) * 21, 0), steps - 1)
            weights_vec = (
                weights_history[target_idx] if weights_history.size else np.full(len(self.stock_tickers), 1.0 / len(self.stock_tickers))
            )
            cash_weight = float(cash_series[target_idx]) if cash_series.size else 0.0
            base_weights, cash_weight = self._apply_risk_profile(
                weights_vec, cash_weight, risk, horizon
            )

        allocation, cash_amount = self._format_allocation(base_weights, cash_weight, amount)
        metrics_fmt = self._format_metrics(metrics_raw, exec_returns)
        feature_importance = self._build_feature_importance(weights_history)
        attention_weights = self._build_attention_weights(weights_history)
        benchmarks = self._prepare_benchmarks(dates)

        analysis = {
            "params": {
                "investment_amount": float(amount),
                "risk_tolerance": risk,
                "investment_horizon": int(horizon),
            },
            "analysis_mode": mode,
            "allocation": allocation,
            "allocation_signature": self._allocation_signature(allocation),
            "metrics": metrics_fmt,
            "cash_amount": cash_amount,
            "portfolio_returns": portfolio_returns.tolist(),
            "portfolio_values": evaluation["portfolio_values"].tolist(),
            "dates": dates,
            "benchmarks": benchmarks,
            "cash_series": cash_series.tolist(),
            "exec_returns": exec_returns.tolist(),
            "feature_importance": feature_importance,
            "attention_weights": attention_weights,
            "avg_crisis_level": avg_crisis,
        }
        analysis["explanation_text"] = self._build_explanation_text(analysis)
        return analysis

    # ---------------------------------------------------------------- public
    def get_analysis(
        self,
        amount: float,
        risk: str,
        horizon: int,
        mode: str,
    ) -> Dict[str, Any]:
        risk_norm = self._normalize_risk(risk)
        mode_norm = self._normalize_mode(mode)
        key = self._analysis_key(amount, risk_norm, horizon, mode_norm)

        analysis = self.analysis_cache.get(key)
        if analysis is None:
            analysis = self._create_analysis(amount, risk_norm, horizon, mode_norm)
            self.analysis_cache[key] = analysis
            self.signature_cache[analysis["allocation_signature"]] = analysis

        self.last_analysis = analysis
        return analysis

    def get_analysis_by_allocation(
        self,
        allocation_payload: List[Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        normalized = [
            {"symbol": item["symbol"], "weight": float(item["weight"])}
            for item in allocation_payload
            if item.get("symbol")
        ]
        signature = self._allocation_signature(normalized)
        analysis = self.signature_cache.get(signature)
        if analysis is not None:
            return analysis
        if self.last_analysis and self.last_analysis.get("allocation_signature") == signature:
            return self.last_analysis
        return None

    def build_performance_history(
        self,
        analysis: Dict[str, Any],
        start_date: Optional[str],
        end_date: Optional[str],
    ) -> List[PerformanceHistory]:
        dates = analysis.get("dates", [])
        returns = analysis.get("portfolio_returns", [])
        benchmarks = analysis.get("benchmarks", {"spy": [], "qqq": []})

        start_dt = self._parse_date(start_date)
        end_dt = self._parse_date(end_date)

        history: List[PerformanceHistory] = []
        for idx, date_str in enumerate(dates):
            dt = self._parse_date(date_str)
            if start_dt and dt and dt < start_dt:
                continue
            if end_dt and dt and dt > end_dt:
                continue
            portfolio = float(returns[idx]) if idx < len(returns) else 0.0
            spy = float(benchmarks.get("spy", [0.0])[idx] if idx < len(benchmarks.get("spy", [])) else 0.0)
            qqq = float(benchmarks.get("qqq", [0.0])[idx] if idx < len(benchmarks.get("qqq", [])) else 0.0)
            history.append(PerformanceHistory(date=date_str, portfolio=portfolio, spy=spy, qqq=qqq))
        return history

    def calculate_correlation(
        self,
        tickers: List[str],
        period: str,
    ) -> List[CorrelationData]:
        stock_tickers = [ticker for ticker in tickers if ticker and ticker != "현금"]
        if len(stock_tickers) < 2:
            return []

        close = self._download_prices(stock_tickers, period=period)
        if close.empty:
            return []

        returns = close.pct_change().dropna()
        corr_matrix = returns.corr()

        data: List[CorrelationData] = []
        for i, stock1 in enumerate(stock_tickers):
            for j in range(i + 1, len(stock_tickers)):
                stock2 = stock_tickers[j]
                value = corr_matrix.loc[stock1, stock2]
                if not math.isnan(value):
                    data.append(CorrelationData(stock1=stock1, stock2=stock2, correlation=float(value)))

        data.sort(key=lambda item: abs(item.correlation), reverse=True)
        return data

    def calculate_risk_return(
        self,
        allocation_payload: List[Dict[str, Any]],
        period: str,
    ) -> List[RiskReturnData]:
        tickers = [
            item["symbol"] for item in allocation_payload if item.get("symbol") and item["symbol"] != "현금"
        ]
        if not tickers:
            return []

        close = self._download_prices(tickers, period=period)
        if close.empty:
            return []

        returns = close.pct_change().dropna()
        weights_map = {
            item["symbol"]: float(item.get("weight", 0.0)) for item in allocation_payload if item.get("symbol")
        }

        result: List[RiskReturnData] = []
        for symbol in tickers:
            series = returns[symbol]
            annual_return = float(series.mean() * 252 * 100)
            annual_risk = float(series.std() * np.sqrt(252) * 100)
            allocation_pct = float(weights_map.get(symbol, 0.0) * 100)
            result.append(
                RiskReturnData(
                    symbol=symbol,
                    risk=annual_risk,
                    return_rate=annual_return,
                    allocation=allocation_pct,
                )
            )
        return result

    def get_market_status(self) -> MarketStatusResponse:
        market_symbols = {
            "^GSPC": "S&P 500",
            "^IXIC": "NASDAQ",
            "^VIX": "VIX 변동성 지수",
            "KRW=X": "USD/KRW 환율",
        }

        market_data: List[MarketData] = []
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        for symbol, name in market_symbols.items():
            try:
                ticker = yf.Ticker(symbol, session=session) if session else yf.Ticker(symbol)
                history = ticker.history(period="2d")
                if history.empty or "Close" not in history:
                    continue
                closes = history["Close"].tolist()
                price = float(closes[-1])
                prev = float(closes[-2]) if len(closes) > 1 else price
                change = price - prev
                change_pct = (change / prev * 100) if prev else 0.0
                market_data.append(
                    MarketData(
                        symbol=symbol,
                        name=name,
                        price=price,
                        change=change,
                        change_percent=change_pct,
                        last_updated=current_time,
                    )
                )
            except Exception:
                continue

        return MarketStatusResponse(market_data=market_data, last_updated=current_time)

    def health_status(self) -> Dict[str, Any]:
        return {
            "model_path": str(self.model_path),
            "cached_runs": len(self.analysis_cache),
            "last_params": self.last_analysis["params"] if self.last_analysis else None,
            "precomputed_steps": int(self.precomputed["portfolio_returns"].shape[0]),
        }


# ---------------------------------------------------------------------------
# FastAPI application setup
# ---------------------------------------------------------------------------
service = IRTBackendService()

app = FastAPI(title="FinFlow RL Inference Server", version="2.0.0")

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",")

environment = os.getenv("ENVIRONMENT", "development")
print(f"현재 환경: {environment}")
if environment == "production":
    production_origins = [
        "https://finflow.reo91004.com",
        "https://www.finflow.reo91004.com",
    ]
    CORS_ORIGINS.extend(production_origins)
print(f"최종 CORS 허용 도메인: {CORS_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    service.bootstrap()


@app.get("/")
async def root() -> Dict[str, str]:
    return {"message": "FinFlow IRT inference server is running."}


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {"status": "ok", **service.health_status()}


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest) -> PredictionResponse:
    if request.investment_amount <= 0:
        raise HTTPException(status_code=400, detail="투자 금액은 0보다 커야 합니다.")

    try:
        analysis = service.get_analysis(
            amount=request.investment_amount,
            risk=request.risk_tolerance,
            horizon=request.investment_horizon,
            mode="fast",
        )
        allocation_models = [
            AllocationItem(symbol=item["symbol"], weight=item["weight"])
            for item in analysis["allocation"]
        ]
        metrics_model = MetricsResponse(**analysis["metrics"])
        return PredictionResponse(allocation=allocation_models, metrics=metrics_model)
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[predict] 오류: {exc}")
        raise HTTPException(
            status_code=500, detail="포트폴리오 예측 중 오류가 발생했습니다."
        )


@app.post("/explain", response_model=XAIResponse)
async def explain(request: XAIRequest) -> XAIResponse:
    if request.investment_amount <= 0:
        raise HTTPException(status_code=400, detail="투자 금액은 0보다 커야 합니다.")

    try:
        analysis = service.get_analysis(
            amount=request.investment_amount,
            risk=request.risk_tolerance,
            horizon=request.investment_horizon,
            mode=request.method,
        )
        feature_models = [
            FeatureImportance(
                feature_name=item["feature_name"],
                importance_score=item["importance_score"],
                asset_name=item["asset_name"],
            )
            for item in analysis["feature_importance"]
        ]
        attention_models = [
            AttentionWeight(
                from_asset=item["from_asset"],
                to_asset=item["to_asset"],
                weight=item["weight"],
            )
            for item in analysis["attention_weights"]
        ]
        return XAIResponse(
            feature_importance=feature_models,
            attention_weights=attention_models,
            explanation_text=analysis["explanation_text"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[explain] 오류: {exc}")
        raise HTTPException(
            status_code=500, detail="설명 가능성 분석 중 오류가 발생했습니다."
        )


@app.post("/historical-performance", response_model=HistoricalResponse)
async def historical_performance(request: HistoricalRequest) -> HistoricalResponse:
    try:
        allocation_payload = [item.dict() for item in request.portfolio_allocation]
        analysis = service.get_analysis_by_allocation(allocation_payload)
        if analysis is None:
            analysis = service.last_analysis or service.get_analysis(
                amount=1_000_000,
                risk="moderate",
                horizon=12,
                mode="fast",
            )
        history = service.build_performance_history(
            analysis, request.start_date, request.end_date
        )
        return HistoricalResponse(performance_history=history)
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[historical-performance] 오류: {exc}")
        raise HTTPException(
            status_code=500, detail="성과 히스토리 조회 중 오류가 발생했습니다."
        )


@app.post("/correlation-analysis", response_model=CorrelationResponse)
async def correlation_analysis(request: CorrelationRequest) -> CorrelationResponse:
    try:
        data = service.calculate_correlation(request.tickers, request.period)
        return CorrelationResponse(correlation_data=data)
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[correlation-analysis] 오류: {exc}")
        raise HTTPException(
            status_code=500, detail="상관관계 분석 중 오류가 발생했습니다."
        )


@app.post("/risk-return-analysis", response_model=RiskReturnResponse)
async def risk_return_analysis(request: RiskReturnRequest) -> RiskReturnResponse:
    try:
        allocation_payload = [item.dict() for item in request.portfolio_allocation]
        data = service.calculate_risk_return(allocation_payload, request.period)
        return RiskReturnResponse(risk_return_data=data)
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[risk-return-analysis] 오류: {exc}")
        raise HTTPException(
            status_code=500, detail="리스크-수익률 분석 중 오류가 발생했습니다."
        )


@app.get("/market-status", response_model=MarketStatusResponse)
async def market_status() -> MarketStatusResponse:
    try:
        return service.get_market_status()
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[market-status] 오류: {exc}")
        raise HTTPException(
            status_code=500, detail="시장 데이터 조회 중 오류가 발생했습니다."
        )


if __name__ == "__main__":
    # uvicorn은 모듈 경로 문자열 대신 직접 FastAPI 앱 객체를 받아도 된다.
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=False,
    )

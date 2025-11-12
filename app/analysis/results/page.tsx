"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Brain, Activity, BarChart3, Target, Shield, PieChart, CheckCircle, Moon, Sun, Settings, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useTheme } from "next-themes";
import MarketStatusHeader from "@/components/analysis/MarketStatusHeader";

// 타입 임포트
import {
	TabsData,
	LoadingState,
	PortfolioAllocation,
	PerformanceMetrics,
	QuickMetrics,
	XAIData,
	PerformanceHistory,
	CorrelationData,
	RiskReturnData,
	AnalysisMode,
	PredictRequest,
	PredictResponse,
	CorrelationRequest,
	ExplainRequest,
	HistoricalPerformanceRequest,
	RiskReturnRequest,
} from "@/lib/types";
import { apiCallWithRetry } from "@/lib/config";
import { useRequireAuth } from "@/hooks/use-require-auth";

// 색상 팔레트
const COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#84CC16", "#F97316", "#EC4899", "#6366F1"];

// 헬퍼 함수들
const formatCurrency = (amount: number): string => {
	return new Intl.NumberFormat("ko-KR", {
		style: "currency",
		currency: "KRW",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
};

const formatPercent = (value: number): string => {
	return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
};

const formatDate = (dateString: string): string => {
	return new Date(dateString).toLocaleDateString("ko-KR");
};

const getRiskLabel = (risk: string): string => {
	const riskNum = Number(risk);
	if (riskNum <= 3) return "안전형";
	if (riskNum <= 6) return "중간형";
	return "공격형";
};

const getHorizonLabel = (horizon: string): string => {
	const horizonNum = Number(horizon);
	if (horizonNum <= 12) return "단기 (1년 이하)";
	if (horizonNum <= 60) return "중기 (5년 이하)";
	return "장기 (5년 이상)";
};

const TRADING_DAYS_PER_YEAR = 252;

const calculateStandardDeviation = (values: number[]): number => {
	const filtered = values.filter((value) => Number.isFinite(value));
	if (!filtered.length) return 0;
	const mean = filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
	const variance = filtered.reduce((sum, value) => sum + (value - mean) ** 2, 0) / filtered.length;
	return Math.sqrt(variance);
};

const calculateDailyReturns = (cumulativeSeries: number[]): number[] => {
	const returns: number[] = [];
	for (let i = 1; i < cumulativeSeries.length; i++) {
		const prev = cumulativeSeries[i - 1];
		const current = cumulativeSeries[i];
		if (!Number.isFinite(prev) || !Number.isFinite(current) || prev === 0) {
			continue;
		}
		returns.push(current / prev - 1);
	}
	return returns;
};

const calculateMaxDrawdown = (series: number[]): number => {
	if (!series.length) return 0;
	const cumulative = series.map((value) => 1 + value);
	let peak = 1;
	let maxDrawdown = 0;

	for (const value of cumulative) {
		if (!Number.isFinite(value)) {
			continue;
		}
		if (value > peak) {
			peak = value;
		}
		if (peak <= 0) {
			continue;
		}
		const drawdown = value / peak - 1;
		if (drawdown < maxDrawdown) {
			maxDrawdown = drawdown;
		}
	}

	return Math.abs(maxDrawdown) * 100;
};

type BenchmarkStats = {
	totalReturn: number;
	annualReturn: number;
	sharpeRatio: number;
	sortinoRatio: number;
	maxDrawdown: number;
	volatility: number;
};

const computeBenchmarkStats = (series: number[]): BenchmarkStats => {
	if (!series.length) {
		return {
			totalReturn: 0,
			annualReturn: 0,
			sharpeRatio: 0,
			sortinoRatio: 0,
			maxDrawdown: 0,
			volatility: 0,
		};
	}

	const cumulative = series.map((value) => 1 + value);
	const dailyReturns = calculateDailyReturns(cumulative);
	const tradingDays = dailyReturns.length;
	const meanDaily = tradingDays ? dailyReturns.reduce((sum, value) => sum + value, 0) / tradingDays : 0;
	const stdDaily = calculateStandardDeviation(dailyReturns);
	const downsideStd = calculateStandardDeviation(dailyReturns.filter((value) => value < 0));
	const lastValue = cumulative[cumulative.length - 1] || 1;
	const totalReturnPct = (lastValue - 1) * 100;
	const annualizedReturnPct = tradingDays ? (Math.pow(lastValue, TRADING_DAYS_PER_YEAR / tradingDays) - 1) * 100 : totalReturnPct;
	const sharpe = stdDaily > 0 ? (meanDaily / stdDaily) * Math.sqrt(TRADING_DAYS_PER_YEAR) : 0;
	const sortino = downsideStd > 0 ? (meanDaily * TRADING_DAYS_PER_YEAR) / (downsideStd * Math.sqrt(TRADING_DAYS_PER_YEAR)) : 0;
	const volatilityPct = stdDaily * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;
	const maxDrawdownPct = calculateMaxDrawdown(series);

	const sanitize = (value: number) => {
		if (!Number.isFinite(value)) return 0;
		if (Math.abs(value) < 1e-8) return 0;
		return value;
	};

	return {
		totalReturn: sanitize(totalReturnPct),
		annualReturn: sanitize(annualizedReturnPct),
		sharpeRatio: sanitize(sharpe),
		sortinoRatio: sanitize(sortino),
		maxDrawdown: sanitize(maxDrawdownPct),
		volatility: sanitize(volatilityPct),
	};
};

const calculateBenchmarkMetrics = (history: PerformanceHistory[]) => {
	if (!history?.length) return null;

	const spySeries = history.map((item) => item.spy ?? 0);
	const qqqSeries = history.map((item) => item.qqq ?? 0);

	return {
		spy: computeBenchmarkStats(spySeries),
		qqq: computeBenchmarkStats(qqqSeries),
	};
};

const mergeBenchmarkMetrics = (metrics: PerformanceMetrics[], history: PerformanceHistory[]): PerformanceMetrics[] => {
	if (!metrics.length || !history.length) return metrics;

	const benchmarkStats = calculateBenchmarkMetrics(history);
	if (!benchmarkStats) return metrics;

	const formatPercentage = (value: number, decimals = 2) => {
		const normalized = Number.isFinite(value) ? (Math.abs(value) < 1e-6 ? 0 : value) : 0;
		return `${normalized.toFixed(decimals)}%`;
	};

	const formatRatio = (value: number, decimals = 4) => {
		const normalized = Number.isFinite(value) ? (Math.abs(value) < 1e-8 ? 0 : value) : 0;
		return normalized.toFixed(decimals);
	};

	return metrics.map((metric) => {
		switch (metric.label) {
			case "총 수익률":
				return {
					...metric,
					spy: formatPercentage(benchmarkStats.spy.totalReturn),
					qqq: formatPercentage(benchmarkStats.qqq.totalReturn),
				};
			case "연간 수익률":
				return {
					...metric,
					spy: formatPercentage(benchmarkStats.spy.annualReturn),
					qqq: formatPercentage(benchmarkStats.qqq.annualReturn),
				};
			case "샤프 비율":
				return {
					...metric,
					spy: formatRatio(benchmarkStats.spy.sharpeRatio),
					qqq: formatRatio(benchmarkStats.qqq.sharpeRatio),
				};
			case "소르티노 비율":
				return {
					...metric,
					spy: formatRatio(benchmarkStats.spy.sortinoRatio),
					qqq: formatRatio(benchmarkStats.qqq.sortinoRatio),
				};
			case "최대 낙폭":
				return {
					...metric,
					spy: formatPercentage(benchmarkStats.spy.maxDrawdown),
					qqq: formatPercentage(benchmarkStats.qqq.maxDrawdown),
				};
			case "변동성":
				return {
					...metric,
					spy: formatPercentage(benchmarkStats.spy.volatility),
					qqq: formatPercentage(benchmarkStats.qqq.volatility),
				};
			default:
				return metric;
		}
	});
};

// 로딩 컴포넌트
const LoadingCard = ({ title, description }: { title: string; description: string }) => (
	<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
		<CardContent className="p-6">
			<div className="flex items-center space-x-3">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				<div>
					<h3 className="font-semibold">{title}</h3>
					<p className="text-sm text-muted-foreground">{description}</p>
				</div>
			</div>
		</CardContent>
	</Card>
);

// 에러 컴포넌트
const ErrorCard = ({ title, error, onRetry }: { title: string; error: string; onRetry: () => void }) => (
	<Card className="backdrop-blur-sm bg-red-50/90 dark:bg-red-950/90 border border-red-200/50 dark:border-red-800/50 rounded-3xl">
		<CardContent className="p-6">
			<div className="flex items-start justify-between">
				<div className="flex items-start space-x-3">
					<AlertTriangle className="h-5 w-5 text-red-600 mt-1" />
					<div>
						<h3 className="font-semibold text-red-900 dark:text-red-100">{title}</h3>
						<p className="text-sm text-red-800 dark:text-red-200 mt-1">{error}</p>
					</div>
				</div>
				<Button variant="outline" size="sm" onClick={onRetry} className="rounded-2xl">
					<RefreshCw className="h-4 w-4 mr-1" />
					재시도
				</Button>
			</div>
		</CardContent>
	</Card>
);

// 포트폴리오 탭 컴포넌트
const PortfolioTab = ({ allocation, metrics, quickMetrics }: { allocation: PortfolioAllocation[]; metrics: PerformanceMetrics[]; quickMetrics: QuickMetrics }) => (
	<div className="space-y-6">
		{/* 퀵 메트릭 카드들 */}
		<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
			<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
				<CardContent className="p-4">
					<div className="flex items-center space-x-2">
						<div className="w-8 h-8 bg-green-500 rounded-2xl flex items-center justify-center">
							<TrendingUp className="h-4 w-4 text-white" />
						</div>
						<div>
							<p className="text-xs text-muted-foreground">연간 수익률</p>
							<p className="text-lg font-bold text-green-600">{quickMetrics.annualReturn}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
				<CardContent className="p-4">
					<div className="flex items-center space-x-2">
						<div className="w-8 h-8 bg-blue-500 rounded-2xl flex items-center justify-center">
							<Target className="h-4 w-4 text-white" />
						</div>
						<div>
							<p className="text-xs text-muted-foreground">샤프 비율</p>
							<p className="text-lg font-bold text-blue-600">{quickMetrics.sharpeRatio}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
				<CardContent className="p-4">
					<div className="flex items-center space-x-2">
						<div className="w-8 h-8 bg-red-500 rounded-2xl flex items-center justify-center">
							<AlertTriangle className="h-4 w-4 text-white" />
						</div>
						<div>
							<p className="text-xs text-muted-foreground">최대 낙폭</p>
							<p className="text-lg font-bold text-red-600">{quickMetrics.maxDrawdown}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
				<CardContent className="p-4">
					<div className="flex items-center space-x-2">
						<div className="w-8 h-8 bg-purple-500 rounded-2xl flex items-center justify-center">
							<BarChart3 className="h-4 w-4 text-white" />
						</div>
						<div>
							<p className="text-xs text-muted-foreground">변동성</p>
							<p className="text-lg font-bold text-orange-600">{quickMetrics.volatility}</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>

		{/* 포트폴리오 구성 */}
		<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
			<CardHeader>
				<CardTitle className="flex items-center space-x-2">
					<PieChart className="h-5 w-5 text-blue-600" />
					<span>포트폴리오 구성</span>
				</CardTitle>
				<CardDescription>AI가 제안한 최적의 자산 배분</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[420px]">
					{/* 자산 리스트 */}
					<div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 lg:pr-3">
						{allocation.map((asset, index) => (
							<div key={asset.stock} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
								<div className="flex items-center space-x-3">
									<div className={`w-8 h-8 rounded-2xl flex items-center justify-center text-white font-bold text-sm`} style={{ backgroundColor: COLORS[index % COLORS.length] }}>
										{asset.stock === "현금" ? "$" : asset.stock.charAt(0)}
									</div>
									<div>
										<div className="font-semibold">{asset.stock}</div>
										<div className="text-xs text-muted-foreground">{formatCurrency(asset.amount)}</div>
									</div>
								</div>
								<div className="text-right">
									<div className="font-bold">{asset.percentage.toFixed(1)}%</div>
									<Progress value={asset.percentage} className="w-16 h-2 mt-1" />
								</div>
							</div>
						))}
					</div>

					{/* 파이 차트 */}
					<div className="flex items-center justify-center">
						<ResponsiveContainer width="100%" height={300}>
							<RechartsPieChart>
								<Pie
									data={allocation.map((item, index) => ({
										name: item.stock,
										value: item.percentage,
										amount: item.amount,
									}))}
									cx="50%"
									cy="50%"
									innerRadius={60}
									outerRadius={120}
									paddingAngle={2}
									dataKey="value"
								>
									{allocation.map((_, index) => (
										<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
									))}
								</Pie>
								<Tooltip
									formatter={(value, name, entry) => [`${(value as number).toFixed(1)}%`, name, `${formatCurrency(entry.payload?.amount || 0)}`]}
									contentStyle={{
										backgroundColor: "rgba(255, 255, 255, 0.95)",
										border: "none",
										borderRadius: "12px",
										boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
									}}
								/>
								<Legend verticalAlign="bottom" height={36} formatter={(value, entry) => `${value} (${(entry.payload?.value || 0).toFixed(1)}%)`} />
							</RechartsPieChart>
						</ResponsiveContainer>
					</div>
				</div>
			</CardContent>
		</Card>

		{/* 성과 지표 테이블 */}
		<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
			<CardHeader>
				<CardTitle className="flex items-center space-x-2">
					<BarChart3 className="h-5 w-5 text-blue-600" />
					<span>상세 성과 지표</span>
				</CardTitle>
				<CardDescription>포트폴리오와 벤치마크 비교</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto max-h-[600px] overflow-y-auto">
					<table className="w-full text-sm">
						<thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
							<tr className="border-b border-gray-200 dark:border-gray-700">
								<th className="text-left py-3 font-medium">지표</th>
								<th className="text-center py-3 font-medium">포트폴리오</th>
								<th className="text-center py-3 font-medium">S&P 500</th>
								<th className="text-center py-3 font-medium">NASDAQ</th>
							</tr>
						</thead>
						<tbody>
							{metrics.map((metric, index) => (
								<tr key={index} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
									<td className="py-3 font-medium">{metric.label}</td>
									<td className="text-center py-3 font-semibold text-blue-600">{metric.portfolio}</td>
									<td className="text-center py-3 text-muted-foreground">{metric.spy}</td>
									<td className="text-center py-3 text-muted-foreground">{metric.qqq}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</CardContent>
		</Card>
	</div>
);

// 성과 차트 탭 컴포넌트
const PerformanceTab = ({ history }: { history: PerformanceHistory[] }) => {
	const chartData = history.map((item) => ({
		date: formatDate(item.date),
		포트폴리오: item.portfolio * 100,
		"S&P 500": item.spy * 100,
		NASDAQ: item.qqq * 100,
	}));

	// Y축 범위 계산
	const allValues = chartData.flatMap((item) => [item.포트폴리오, item["S&P 500"], item.NASDAQ]);
	const minValue = Math.min(...allValues);
	const maxValue = Math.max(...allValues);
	const padding = (maxValue - minValue) * 0.1; // 10% 패딩
	const yAxisMin = minValue - padding;
	const yAxisMax = maxValue + padding;

	return (
		<div className="space-y-6">
			<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Activity className="h-5 w-5 text-blue-600" />
						<span>성과 비교 차트</span>
					</CardTitle>
					<CardDescription>포트폴리오 vs 벤치마크 성과 비교 (최근 1년)</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-[650px]">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={chartData} margin={{ top: 30, right: 40, left: 60, bottom: 80 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
								<XAxis
									dataKey="date"
									stroke="#888"
									fontSize={12}
									angle={-45}
									textAnchor="end"
									height={60}
									interval={Math.floor(chartData.length / 8)}
									tickFormatter={(value) => value.split(".").slice(1).join(".")}
								/>
								<YAxis stroke="#888" fontSize={12} width={60} domain={[yAxisMin, yAxisMax]} tickFormatter={(value) => `${value.toFixed(1)}%`} />
								<Tooltip
									contentStyle={{
										backgroundColor: "rgba(255, 255, 255, 0.95)",
										border: "none",
										borderRadius: "12px",
										boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
									}}
									formatter={(value, name) => [`${(value as number).toFixed(2)}%`, name]}
								/>
								<Legend wrapperStyle={{ paddingTop: "20px" }} />
								<Line type="monotone" dataKey="포트폴리오" stroke="#3B82F6" strokeWidth={3} dot={false} />
								<Line type="monotone" dataKey="S&P 500" stroke="#10B981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
								<Line type="monotone" dataKey="NASDAQ" stroke="#8B5CF6" strokeWidth={2} dot={false} strokeDasharray="5 5" />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

// XAI 탭 컴포넌트
const XAITab = ({
	xaiData,
	analysisMode,
	onModeChange,
	onRegenerate,
	isRegenerating,
}: {
	xaiData: XAIData;
	analysisMode: AnalysisMode;
	onModeChange: (mode: AnalysisMode) => void;
	onRegenerate: () => void;
	isRegenerating: boolean;
}) => {
	const featureChartData = (xaiData.feature_importance || []).slice(0, 10).map((item) => ({
		name: `${item.asset_name}-${item.feature_name}`,
		importance: item.importance_score,
		asset: item.asset_name,
		feature: item.feature_name,
	}));

	const hasFeatureData = featureChartData.length > 0;

	return (
		<div className="space-y-6">
			{/* XAI 모드 선택 */}
			<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
				<CardContent className="p-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-3">
							<Brain className="h-5 w-5 text-purple-600" />
							<div>
								<h3 className="font-semibold">AI 설명 모드</h3>
								<p className="text-sm text-muted-foreground">분석 방식을 선택하여 설명을 재생성할 수 있습니다</p>
							</div>
						</div>
						<div className="flex items-center space-x-3">
							<Select value={analysisMode} onValueChange={onModeChange}>
								<SelectTrigger className="w-40 rounded-2xl">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="fast">
										<div className="flex items-center space-x-2">
											<Zap className="h-4 w-4" />
											<span>빠른 분석</span>
										</div>
									</SelectItem>
									<SelectItem value="accurate">
										<div className="flex items-center space-x-2">
											<Timer className="h-4 w-4" />
											<span>정밀 분석</span>
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
							<Button onClick={onRegenerate} disabled={isRegenerating} className="rounded-2xl">
								{isRegenerating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
								재생성
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Feature Importance 차트 */}
			<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<BarChart3 className="h-5 w-5 text-purple-600" />
						<span>특성 중요도 분석</span>
					</CardTitle>
					<CardDescription>AI 모델의 투자 결정에 영향을 준 주요 특성들</CardDescription>
				</CardHeader>
				<CardContent>
					{hasFeatureData ? (
						<div className="h-[500px]">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={featureChartData} margin={{ top: 20, right: 30, left: 20, bottom: 120 }}>
									<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
									<XAxis dataKey="name" stroke="#888" fontSize={10} angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 9 }} />
									<YAxis stroke="#888" fontSize={12} tickFormatter={(value) => value.toFixed(3)} domain={[0, "dataMax + 0.1"]} />
									<Tooltip
										contentStyle={{
											backgroundColor: "rgba(255, 255, 255, 0.95)",
											border: "none",
											borderRadius: "12px",
											boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
										}}
										formatter={(value: any, name: any) => [`${(value as number).toFixed(4)}`, "중요도 점수"]}
										labelFormatter={(label: any, payload: any) => {
											if (payload && payload[0] && payload[0].payload) {
												const data = payload[0].payload;
												return `${data.asset} - ${data.feature}`;
											}
											return label;
										}}
									/>
									<Bar dataKey="importance" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
								</BarChart>
							</ResponsiveContainer>
						</div>
					) : (
						<div className="h-[400px] flex items-center justify-center">
							<div className="text-center space-y-3">
								<div className="w-16 h-16 mx-auto bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center">
									<BarChart3 className="h-8 w-8 text-purple-600" />
								</div>
								<div>
									<h3 className="font-medium text-muted-foreground">특성 데이터가 없습니다</h3>
									<p className="text-sm text-muted-foreground mt-1">AI 분석이 완료되면 특성 중요도 차트가 표시됩니다</p>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* AI 설명 텍스트 */}
			<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Info className="h-5 w-5 text-purple-600" />
						<span>AI 분석 설명</span>
						<Badge variant="secondary" className="ml-2 rounded-2xl">
							{analysisMode === "fast" ? "빠른 모드" : "정밀 모드"}
						</Badge>
					</CardTitle>
					<CardDescription>포트폴리오 구성 근거와 투자 전략 해설</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-2xl border border-purple-200 dark:border-purple-800/30">
						<pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans text-purple-900 dark:text-purple-100">{xaiData.explanation_text}</pre>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

// 상관관계 탭 컴포넌트
const CorrelationTab = ({ correlationData }: { correlationData: CorrelationData[] }) => {
	// 상관관계 매트릭스 데이터 구성
	const stocks = Array.from(new Set([...correlationData.map((d) => d.stock1), ...correlationData.map((d) => d.stock2)]));

	// 히트맵용 매트릭스 데이터 생성
	const matrixData = stocks.map((stock1) => {
		const row: any = { name: stock1 };
		stocks.forEach((stock2) => {
			if (stock1 === stock2) {
				row[stock2] = 1.0; // 자기 자신과의 상관계수는 1
			} else {
				const correlation = correlationData.find((d) => (d.stock1 === stock1 && d.stock2 === stock2) || (d.stock1 === stock2 && d.stock2 === stock1));
				row[stock2] = correlation ? correlation.correlation : 0;
			}
		});
		return row;
	});

	// 히트맵을 위한 개별 셀 데이터 생성
	const heatmapData = [];
	stocks.forEach((stock1, i) => {
		stocks.forEach((stock2, j) => {
			const correlation = matrixData[i][stock2] || 0;
			heatmapData.push({
				x: j,
				y: i,
				stock1,
				stock2,
				correlation,
				color: correlation >= 0.7 ? "#EF4444" : correlation >= 0.4 ? "#F59E0B" : correlation >= 0.1 ? "#10B981" : "#6B7280",
			});
		});
	});

	return (
		<div className="space-y-6">
			{/* 상관관계 히트맵 */}
			<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Activity className="h-5 w-5 text-blue-600" />
						<span>상관관계 히트맵</span>
					</CardTitle>
					<CardDescription>종목 간 상관관계를 시각적으로 표현한 히트맵</CardDescription>
				</CardHeader>
				<CardContent>
					{stocks.length > 0 ? (
						<div className="flex justify-center max-h-[800px] overflow-auto">
							<div className="overflow-x-auto">
								{/* 커스텀 히트맵 */}
								<div className="mx-auto inline-block">
									<div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(${stocks.length}, 60px)` }}>
										{/* 헤더 행 */}
										<div></div>
										{stocks.map((stock) => (
											<div key={stock} className="text-center text-xs font-medium p-2 transform -rotate-45 h-16 flex items-end justify-center">
												{stock}
											</div>
										))}

										{/* 데이터 행들 */}
										{stocks.map((stock1, i) => (
											<React.Fragment key={`row-${i}`}>
												<div className="text-xs font-medium p-2 flex items-center">{stock1}</div>
												{stocks.map((stock2, j) => {
													const correlation = matrixData[i][stock2] || 0;
													const absCorr = Math.abs(correlation);
													const intensity = absCorr;
													const bgColor =
														correlation >= 0.7
															? `rgba(239, 68, 68, ${intensity})`
															: correlation >= 0.4
															? `rgba(245, 158, 11, ${intensity})`
															: correlation >= 0.1
															? `rgba(16, 185, 129, ${intensity})`
															: `rgba(107, 114, 128, ${intensity})`;

													return (
														<div
															key={`${i}-${j}`}
															className="w-14 h-14 flex items-center justify-center text-xs font-mono border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:scale-105 transition-transform"
															style={{ backgroundColor: bgColor }}
															title={`${stock1} vs ${stock2}: ${correlation.toFixed(3)}`}
														>
															{correlation.toFixed(2)}
														</div>
													);
												})}
											</React.Fragment>
										))}
									</div>

									{/* 범례 */}
									<div className="mt-6 flex flex-col items-center space-y-2 text-sm">
										<div className="flex items-center space-x-2">
											<div className="w-4 h-4 bg-red-500 rounded"></div>
											<span>강한 상관관계 (≥0.7)</span>
										</div>
										<div className="flex items-center space-x-2">
											<div className="w-4 h-4 bg-yellow-500 rounded"></div>
											<span>보통 상관관계 (0.4-0.7)</span>
										</div>
										<div className="flex items-center space-x-2">
											<div className="w-4 h-4 bg-green-500 rounded"></div>
											<span>약한 상관관계 (0.1-0.4)</span>
										</div>
										<div className="flex items-center space-x-2">
											<div className="w-4 h-4 bg-gray-500 rounded"></div>
											<span>상관관계 없음 (&lt;0.1)</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="h-64 flex items-center justify-center">
							<div className="text-center space-y-3">
								<div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center">
									<Activity className="h-8 w-8 text-blue-600" />
								</div>
								<div>
									<h3 className="font-medium text-muted-foreground">상관관계 데이터가 없습니다</h3>
									<p className="text-sm text-muted-foreground mt-1">포트폴리오 분석이 완료되면 상관관계 히트맵이 표시됩니다</p>
								</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* 상세 테이블 */}
			<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<BarChart3 className="h-5 w-5 text-blue-600" />
						<span>종목 간 상관관계 상세</span>
					</CardTitle>
					<CardDescription>포트폴리오 내 자산들의 상관관계 분석 (최근 1년 기준)</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto max-h-[600px] overflow-y-auto">
						<table className="w-full text-sm">
							<thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
								<tr>
									<th className="text-left p-3 font-medium">종목 1</th>
									<th className="text-left p-3 font-medium">종목 2</th>
									<th className="text-center p-3 font-medium">상관계수</th>
									<th className="text-center p-3 font-medium">관계 강도</th>
								</tr>
							</thead>
							<tbody>
								{correlationData.map((item, index) => {
									const absCorr = Math.abs(item.correlation);
									const strength = absCorr > 0.7 ? "강함" : absCorr > 0.4 ? "보통" : "약함";
									const strengthColor = absCorr > 0.7 ? "text-red-600" : absCorr > 0.4 ? "text-yellow-600" : "text-green-600";

									return (
										<tr key={index} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
											<td className="p-3 font-semibold">{item.stock1}</td>
											<td className="p-3 font-semibold">{item.stock2}</td>
											<td className="text-center p-3 font-mono">{item.correlation.toFixed(3)}</td>
											<td className={`text-center p-3 font-medium ${strengthColor}`}>{strength}</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

// 리스크 분석 탭 컴포넌트
const RiskAnalysisTab = ({ riskReturnData }: { riskReturnData: RiskReturnData[] }) => {
	const chartData = riskReturnData.map((item) => ({
		...item,
		size: item.allocation * 10, // 원의 크기를 비중에 비례
	}));

	return (
		<div className="space-y-6">
			<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Shield className="h-5 w-5 text-red-600" />
						<span>위험-수익률 분석</span>
					</CardTitle>
					<CardDescription>각 종목의 위험 대비 수익률 포지션 (원의 크기는 포트폴리오 비중)</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="h-96">
						<ResponsiveContainer width="100%" height="100%">
							<ScatterChart>
								<CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
								<XAxis type="number" dataKey="risk" name="위험도" stroke="#888" fontSize={12} tickFormatter={(value) => `${value}%`} />
								<YAxis type="number" dataKey="return_rate" name="수익률" stroke="#888" fontSize={12} tickFormatter={(value) => `${value}%`} />
								<Tooltip
									contentStyle={{
										backgroundColor: "rgba(255, 255, 255, 0.95)",
										border: "none",
										borderRadius: "12px",
										boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
									}}
									formatter={(value, name) => {
										if (name === "risk") return [`${value}%`, "위험도"];
										if (name === "return_rate") return [`${value}%`, "수익률"];
										return [value, name];
									}}
								/>
								<Scatter name="종목" data={chartData}>
									{chartData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
									))}
								</Scatter>
							</ScatterChart>
						</ResponsiveContainer>
					</div>
				</CardContent>
			</Card>

			{/* 위험도별 종목 리스트 */}
			<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl">
				<CardHeader>
					<CardTitle>종목별 위험-수익 지표</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
						{riskReturnData
							.sort((a, b) => b.return_rate - a.return_rate)
							.map((item, index) => (
								<div key={item.symbol} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
									<div className="flex items-center space-x-3">
										<div className="w-8 h-8 rounded-2xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
											{item.symbol.charAt(0)}
										</div>
										<div>
											<div className="font-semibold">{item.symbol}</div>
											<div className="text-sm text-muted-foreground">비중: {item.allocation.toFixed(1)}%</div>
										</div>
									</div>
									<div className="text-right space-y-1">
										<div className="text-sm">
											<span className="text-green-600 font-semibold">수익률: {formatPercent(item.return_rate)}</span>
										</div>
										<div className="text-sm">
											<span className="text-red-600 font-semibold">위험도: {item.risk.toFixed(1)}%</span>
										</div>
									</div>
								</div>
							))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

// 메인 컴포넌트
function AnalysisResultsContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { theme, setTheme } = useTheme();
	const { user, loading } = useRequireAuth();
	const [mounted, setMounted] = useState(false);

	// 상태 관리
	const [tabsData, setTabsData] = useState<TabsData | null>(null);
	const [loadingStates, setLoadingStates] = useState({
		portfolio: { isLoading: true, progress: 0, error: null },
		xai: { isLoading: true, progress: 0, error: null },
		performance: { isLoading: true, progress: 0, error: null },
		correlation: { isLoading: true, progress: 0, error: null },
		riskReturn: { isLoading: true, progress: 0, error: null },
	});
	const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("fast");
	const [isRegeneratingXAI, setIsRegeneratingXAI] = useState(false);

	// URL 파라미터
	const investmentAmount = searchParams.get("amount") || "1000000";
	const riskToleranceNum = searchParams.get("risk") || "5";
	const investmentHorizon = searchParams.get("horizon") || "12";

	// Risk tolerance를 백엔드 형식으로 매핑
	const mapRiskTolerance = (risk: string): string => {
		const riskNum = Number(risk);
		if (riskNum <= 3) return "conservative";
		if (riskNum <= 6) return "moderate";
		return "aggressive";
	};

	const riskTolerance = mapRiskTolerance(riskToleranceNum);

	useEffect(() => {
		if (loading || !user) {
			return;
		}

		let alive = true;
		setMounted(true);

		(async () => {
			await Promise.allSettled([
				loadPortfolioData(alive),
				loadXAIData(alive),
				loadPerformanceData(alive), // 초기엔 allocation 없으면 return
				loadCorrelationData(alive),
				loadRiskReturnData(alive),
			]);
		})();

		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loading, user]);

	// portfolio 완료 후 의존 데이터 재로딩
	useEffect(() => {
		if (loading || !user) {
			return;
		}

		if (!tabsData?.portfolio?.allocation?.length) return;

		let alive = true;
		(async () => {
			await Promise.allSettled([loadPerformanceData(alive), loadCorrelationData(alive), loadRiskReturnData(alive)]);
		})();

		return () => {
			alive = false;
		};
		// eslint-disable-next-line react-hooks-exhaustive-deps
	}, [loading, user, tabsData?.portfolio?.allocation?.length]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
				<div className="text-center space-y-4">
					<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
					<p className="text-muted-foreground">인증 상태를 확인하는 중입니다</p>
				</div>
			</div>
		);
	}

	if (!user) {
		return null;
	}

	// const loadAllData = async () => {
	// 	// 모든 API 호출을 병렬로 실행
	// 	await Promise.allSettled([
	// 		loadPortfolioData(),
	// 		loadXAIData(),
	// 		loadPerformanceData(),
	// 		loadCorrelationData(),
	// 		loadRiskReturnData(),
	// 	]);
	// };

	const loadPortfolioData = async (alive = true) => {
		try {
			updateLoadingState("portfolio", { isLoading: true, progress: 20 });

			const req: PredictRequest = {
				investment_amount: Number(investmentAmount),
				risk_tolerance: riskTolerance as "conservative" | "moderate" | "aggressive",
				investment_horizon: Number(investmentHorizon),
			};

			const response = await apiCallWithRetry<PredictResponse>("/predict", {
				method: "POST",
				body: JSON.stringify(req),
			});

			if (!alive) return;
			updateLoadingState("portfolio", { isLoading: true, progress: 80 });

			// 응답 데이터를 프론트엔드 형식으로 변환
			const portfolioData = transformPortfolioData(response as any, investmentAmount);

			if (!alive) return;
			setTabsData((prev) => ({
				portfolio: {
					...portfolioData,
					metrics: mergeBenchmarkMetrics(portfolioData.metrics, prev?.performance?.history || []),
				},
				performance: prev?.performance ?? { history: [] },
				xai: prev?.xai ?? { feature_importance: [], attention_weights: [], explanation_text: "" },
				correlation: prev?.correlation ?? [],
				riskReturn: prev?.riskReturn ?? [],
			}));

			updateLoadingState("portfolio", { isLoading: false, progress: 100 });
		} catch (error) {
			if (!alive) return;
			updateLoadingState("portfolio", {
				isLoading: false,
				progress: 0,
				error: (error as Error).message,
			});
		}
	};

	const loadXAIData = async (alive = true) => {
		try {
			updateLoadingState("xai", { isLoading: true, progress: 30 });

			const req: ExplainRequest = {
				investment_amount: Number(investmentAmount),
				risk_tolerance: riskTolerance as "conservative" | "moderate" | "aggressive",
				investment_horizon: Number(investmentHorizon),
				method: analysisMode,
			};

			const response = await apiCallWithRetry("/explain", {
				method: "POST",
				body: JSON.stringify(req),
			});

			if (!alive) return;
			updateLoadingState("xai", { isLoading: true, progress: 90 });

			setTabsData((prev) => ({
				...prev!,
				xai: response as XAIData,
			}));

			updateLoadingState("xai", { isLoading: false, progress: 100 });
		} catch (error) {
			if (!alive) return;
			updateLoadingState("xai", {
				isLoading: false,
				progress: 0,
				error: (error as Error).message,
			});
		}
	};

	const loadPerformanceData = async (alive = true) => {
		if (!tabsData?.portfolio?.allocation?.length) return;

		try {
			updateLoadingState("performance", { isLoading: true, progress: 40 });

			const req: HistoricalPerformanceRequest = {
				portfolio_allocation: tabsData.portfolio.allocation.map((item) => ({
					symbol: item.stock,
					weight: item.percentage / 100,
				})),
				period: "1y",
			};

			const response = await apiCallWithRetry("/historical-performance", {
				method: "POST",
				body: JSON.stringify(req),
			});

			const performanceHistory = ((response as any).performance_history || []) as PerformanceHistory[];

			if (!alive) return;
			setTabsData((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					portfolio: {
						...prev.portfolio,
						metrics: mergeBenchmarkMetrics(prev.portfolio.metrics, performanceHistory),
					},
					performance: { history: performanceHistory },
				};
			});

			updateLoadingState("performance", { isLoading: false, progress: 100 });
		} catch (error) {
			if (!alive) return;
			updateLoadingState("performance", {
				isLoading: false,
				progress: 0,
				error: (error as Error).message,
			});
		}
	};

	const loadCorrelationData = async (alive = true) => {
		if (!tabsData?.portfolio?.allocation?.length) return;

		try {
			updateLoadingState("correlation", { isLoading: true, progress: 50 });

			const tickers = tabsData.portfolio.allocation.filter((item) => item.stock !== "현금" && item.stock).map((item) => item.stock);

			if (tickers.length === 0) return;

			const req: CorrelationRequest = {
				tickers,
				period: "1y",
			};

			const response = await apiCallWithRetry("/correlation-analysis", {
				method: "POST",
				body: JSON.stringify(req),
			});

			if (!alive) return;
			setTabsData((prev) => ({
				...prev!,
				correlation: (response as any).correlation_data,
			}));

			updateLoadingState("correlation", { isLoading: false, progress: 100 });
		} catch (error) {
			if (!alive) return;
			updateLoadingState("correlation", {
				isLoading: false,
				progress: 0,
				error: (error as Error).message,
			});
		}
	};

	const loadRiskReturnData = async (alive = true) => {
		if (!tabsData?.portfolio?.allocation?.length) return;

		try {
			updateLoadingState("riskReturn", { isLoading: true, progress: 60 });

			const req: RiskReturnRequest = {
				portfolio_allocation: tabsData.portfolio.allocation.map((item) => ({
					symbol: item.stock,
					weight: item.percentage / 100,
				})),
				period: "1y",
			};

			const response = await apiCallWithRetry("/risk-return-analysis", {
				method: "POST",
				body: JSON.stringify(req),
			});

			if (!alive) return;
			setTabsData((prev) => ({
				...prev!,
				riskReturn: (response as any).risk_return_data,
			}));

			updateLoadingState("riskReturn", { isLoading: false, progress: 100 });
		} catch (error) {
			if (!alive) return;
			updateLoadingState("riskReturn", {
				isLoading: false,
				progress: 0,
				error: (error as Error).message,
			});
		}
	};

	const updateLoadingState = (key: keyof typeof loadingStates, update: Partial<LoadingState>) => {
		setLoadingStates((prev) => ({
			...prev,
			[key]: { ...prev[key], ...update },
		}));
	};

	const transformPortfolioData = (backendData: any, investmentAmount: string) => {
		try {
			const amount = Number(investmentAmount);

			// 데이터 검증
			if (!backendData || typeof backendData !== "object") {
				throw new Error("Invalid backend data format");
			}

			if (!backendData.allocation || !Array.isArray(backendData.allocation)) {
				console.warn("Missing or invalid allocation data, using empty array");
				backendData.allocation = [];
			}

			if (!backendData.metrics || typeof backendData.metrics !== "object") {
				console.warn("Missing or invalid metrics data, using defaults");
				backendData.metrics = {
					total_return: 0,
					annual_return: 0,
					sharpe_ratio: 0,
					sortino_ratio: 0,
					max_drawdown: 0,
					volatility: 0,
				};
			}

			return {
				allocation: backendData.allocation.map((item: any) => ({
					stock: item?.symbol || "Unknown",
					percentage: (item?.weight || 0) * 100,
					amount: amount * (item?.weight || 0),
				})),
				metrics: [
					{
						label: "총 수익률",
						portfolio: `${(backendData.metrics.total_return || 0).toFixed(2)}%`,
						spy: "0.00%",
						qqq: "0.00%",
					},
					{
						label: "연간 수익률",
						portfolio: `${(backendData.metrics.annual_return || 0).toFixed(2)}%`,
						spy: "0.00%",
						qqq: "0.00%",
					},
					{
						label: "샤프 비율",
						portfolio: (backendData.metrics.sharpe_ratio || 0).toFixed(4),
						spy: "0.0000",
						qqq: "0.0000",
					},
					{
						label: "소르티노 비율",
						portfolio: (backendData.metrics.sortino_ratio || 0).toFixed(4),
						spy: "0.0000",
						qqq: "0.0000",
					},
					{
						label: "최대 낙폭",
						portfolio: `${(backendData.metrics.max_drawdown || 0).toFixed(2)}%`,
						spy: "0.00%",
						qqq: "0.00%",
					},
					{
						label: "변동성",
						portfolio: `${(backendData.metrics.volatility || 0).toFixed(2)}%`,
						spy: "0.00%",
						qqq: "0.00%",
					},
				],
				quickMetrics: {
					annualReturn: `+${(backendData.metrics.annual_return || 0).toFixed(1)}%`,
					sharpeRatio: (backendData.metrics.sharpe_ratio || 0).toFixed(2),
					maxDrawdown: `-${(backendData.metrics.max_drawdown || 0).toFixed(1)}%`,
					volatility: `${(backendData.metrics.volatility || 0).toFixed(1)}%`,
				},
			};
		} catch (error) {
			console.error("Portfolio data transformation error:", error);

			// 완전히 실패한 경우 기본값 반환
			return {
				allocation: [],
				metrics: [
					{ label: "총 수익률", portfolio: "0.00%", spy: "0.00%", qqq: "0.00%" },
					{ label: "연간 수익률", portfolio: "0.00%", spy: "0.00%", qqq: "0.00%" },
					{ label: "샤프 비율", portfolio: "0.0000", spy: "0.0000", qqq: "0.0000" },
					{ label: "소르티노 비율", portfolio: "0.0000", spy: "0.0000", qqq: "0.0000" },
					{ label: "최대 낙폭", portfolio: "0.00%", spy: "0.00%", qqq: "0.00%" },
					{ label: "변동성", portfolio: "0.00%", spy: "0.00%", qqq: "0.00%" },
				],
				quickMetrics: {
					annualReturn: "+0.0%",
					sharpeRatio: "0.00",
					maxDrawdown: "-0.0%",
					volatility: "0.0%",
				},
			};
		}
	};

	const handleXAIModeChange = async (mode: AnalysisMode) => {
		setAnalysisMode(mode);
		setIsRegeneratingXAI(true);

		try {
			const req: ExplainRequest = {
				investment_amount: Number(investmentAmount),
				risk_tolerance: riskTolerance as "conservative" | "moderate" | "aggressive",
				investment_horizon: Number(investmentHorizon),
				method: mode,
			};

			const response = await apiCallWithRetry("/explain", {
				method: "POST",
				body: JSON.stringify(req),
			});

			setTabsData((prev) => ({
				...prev!,
				xai: response as XAIData,
			}));
		} catch (error) {
			console.error("XAI 재생성 실패", error);
		} finally {
			setIsRegeneratingXAI(false);
		}
	};

	const handleRetry = (dataType: keyof typeof loadingStates) => {
		switch (dataType) {
			case "portfolio":
				loadPortfolioData(true);
				break;
			case "xai":
				loadXAIData(true);
				break;
			case "performance":
				loadPerformanceData(true);
				break;
			case "correlation":
				loadCorrelationData(true);
				break;
			case "riskReturn":
				loadRiskReturnData(true);
				break;
		}
	};

	// 초기 상태 설정
	if (!tabsData) {
		setTabsData({
			portfolio: {
				allocation: [],
				metrics: [],
				quickMetrics: { annualReturn: "0%", sharpeRatio: "0", maxDrawdown: "0%", volatility: "0%" },
			},
			performance: { history: [] },
			xai: { feature_importance: [], attention_weights: [], explanation_text: "" },
			correlation: [],
			riskReturn: [],
		});
		return null;
	}

	return (
		<div className="min-h-screen overflow-x-hidden">
			{/* 격자 패턴 배경 - 스크롤 시에도 유지 */}
			<div className="fixed inset-0 bg-[linear-gradient(to_right,#d0d0d0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] -z-20"></div>
			{/* 그라데이션 오버레이 */}
			<div className="fixed inset-0 bg-gradient-to-br from-gray-50/80 to-blue-50/80 dark:from-gray-900/80 dark:to-blue-900/20 -z-10"></div>

			{/* 상단 헤더 */}
			<div className="relative backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-10">
				<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex items-center justify-between h-16">
						<div className="flex items-center space-x-4">
							<Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
								<Button variant="ghost" size="sm" className="px-2 sm:px-4">
									<ArrowLeft className="w-4 h-4 sm:mr-2" />
									<span className="hidden sm:inline">홈으로 돌아가기</span>
								</Button>
							</Link>
							<div className="flex items-center space-x-1.5 sm:space-x-2">
								<div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center">
									<Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
								</div>
								<h1 className="text-base sm:text-xl font-bold">
									<span className="sm:hidden">AI 분석 결과</span>
									<span className="hidden sm:inline">AI 포트폴리오 분석 결과</span>
								</h1>
								<Badge className="hidden sm:inline-flex bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-0 rounded-xl sm:rounded-2xl text-xs sm:text-sm px-2 py-0.5 sm:px-3 sm:py-1">
									분석 완료
								</Badge>
							</div>
						</div>
						<div className="flex items-center space-x-2">
							<Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="text-muted-foreground hover:text-foreground rounded-2xl">
								{mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
							</Button>
							<Button
								onClick={() => router.push(`/analysis/loading?amount=${investmentAmount}&risk=${riskTolerance}&horizon=${investmentHorizon}`)}
								className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl"
							>
								<Brain className="w-4 h-4 mr-2" />
								재분석
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* 메인 콘텐츠 */}
			<div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="space-y-8">
					{/* 실시간 시장 상황 헤더 */}
					<MarketStatusHeader />
					{/* 투자 요약 헤더 */}
					<div className="text-center space-y-4">
						<div className="flex items-center justify-center space-x-2 mb-4">
							<div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
								<CheckCircle className="w-6 h-6 text-white" />
							</div>
						</div>
						<h2 className="text-xl sm:text-2xl lg:text-3xl font-bold">포트폴리오 분석이 완료되었습니다</h2>
						<p className="text-muted-foreground text-sm sm:text-base lg:text-lg">투자 금액 {formatCurrency(Number(investmentAmount))}에 대한 AI 최적화 포트폴리오를 제안합니다</p>
						<div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
							<div>
								투자 성향: <span className="font-medium">{getRiskLabel(riskTolerance)}</span>
							</div>
							<div>•</div>
							<div>
								투자 기간: <span className="font-medium">{getHorizonLabel(investmentHorizon)}</span>
							</div>
						</div>
					</div>

					{/* 탭 콘텐츠 - 모바일 최적화 */}
					<Tabs defaultValue="portfolio" className="w-full">
						{/* 모바일: 가로 스크롤, 데스크톱: 5열 그리드 */}
						<div className="overflow-x-auto scrollbar-hide">
							<TabsList className="flex sm:grid sm:w-full sm:grid-cols-5 w-max sm:w-full rounded-3xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
								<TabsTrigger value="portfolio" className="rounded-2xl whitespace-nowrap">
									<PieChart className="w-4 h-4 mr-1 sm:mr-2" />
									<span className="text-xs sm:text-sm">포트폴리오</span>
								</TabsTrigger>
								<TabsTrigger value="performance" className="rounded-2xl whitespace-nowrap">
									<Activity className="w-4 h-4 mr-1 sm:mr-2" />
									<span className="text-xs sm:text-sm">성과분석</span>
								</TabsTrigger>
								<TabsTrigger value="xai" className="rounded-2xl whitespace-nowrap">
									<Brain className="w-4 h-4 mr-1 sm:mr-2" />
									<span className="text-xs sm:text-sm">AI설명</span>
								</TabsTrigger>
								<TabsTrigger value="correlation" className="rounded-2xl whitespace-nowrap">
									<BarChart3 className="w-4 h-4 mr-1 sm:mr-2" />
									<span className="text-xs sm:text-sm">상관관계</span>
								</TabsTrigger>
								<TabsTrigger value="risk" className="rounded-2xl whitespace-nowrap">
									<Shield className="w-4 h-4 mr-1 sm:mr-2" />
									<span className="text-xs sm:text-sm">위험분석</span>
								</TabsTrigger>
							</TabsList>
						</div>

						<TabsContent value="portfolio" className="space-y-6 mt-8">
							{loadingStates.portfolio.isLoading ? (
								<LoadingCard title="포트폴리오 생성 중..." description="AI가 최적의 자산 배분을 계산하고 있습니다" />
							) : loadingStates.portfolio.error ? (
								<ErrorCard title="포트폴리오 생성 실패" error={loadingStates.portfolio.error} onRetry={() => handleRetry("portfolio")} />
							) : (
								<PortfolioTab allocation={tabsData.portfolio.allocation} metrics={tabsData.portfolio.metrics} quickMetrics={tabsData.portfolio.quickMetrics} />
							)}
						</TabsContent>

						<TabsContent value="performance" className="space-y-6 mt-8">
							{loadingStates.performance.isLoading ? (
								<LoadingCard title="성과 데이터 분석 중..." description="백테스트 기반 성과 히스토리를 생성하고 있습니다" />
							) : loadingStates.performance.error ? (
								<ErrorCard title="성과 분석 실패" error={loadingStates.performance.error} onRetry={() => handleRetry("performance")} />
							) : (
								<PerformanceTab history={tabsData.performance.history} />
							)}
						</TabsContent>

						<TabsContent value="xai" className="space-y-6 mt-8">
							{loadingStates.xai.isLoading ? (
								<LoadingCard title="AI 설명 생성 중..." description={`${analysisMode === "fast" ? "빠른" : "정밀"} 모드로 투자 결정 근거를 분석하고 있습니다`} />
							) : loadingStates.xai.error ? (
								<ErrorCard title="AI 설명 생성 실패" error={loadingStates.xai.error} onRetry={() => handleRetry("xai")} />
							) : (
								<XAITab
									xaiData={tabsData.xai}
									analysisMode={analysisMode}
									onModeChange={handleXAIModeChange}
									onRegenerate={() => handleXAIModeChange(analysisMode)}
									isRegenerating={isRegeneratingXAI}
								/>
							)}
						</TabsContent>

						<TabsContent value="correlation" className="space-y-6 mt-8">
							{loadingStates.correlation.isLoading ? (
								<LoadingCard title="상관관계 분석 중..." description="종목 간 상관관계를 실시간으로 계산하고 있습니다" />
							) : loadingStates.correlation.error ? (
								<ErrorCard title="상관관계 분석 실패" error={loadingStates.correlation.error} onRetry={() => handleRetry("correlation")} />
							) : (
								<CorrelationTab correlationData={tabsData.correlation} />
							)}
						</TabsContent>

						<TabsContent value="risk" className="space-y-6 mt-8">
							{loadingStates.riskReturn.isLoading ? (
								<LoadingCard title="위험 분석 중..." description="종목별 위험-수익률 특성을 분석하고 있습니다" />
							) : loadingStates.riskReturn.error ? (
								<ErrorCard title="위험 분석 실패" error={loadingStates.riskReturn.error} onRetry={() => handleRetry("riskReturn")} />
							) : (
								<RiskAnalysisTab riskReturnData={tabsData.riskReturn} />
							)}
						</TabsContent>
					</Tabs>

					{/* 액션 버튼 */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
						<Button onClick={() => router.push("/onboarding")} variant="outline" className="rounded-2xl h-12 px-8 border-gray-300 dark:border-gray-600">
							<Settings className="h-4 w-4 mr-2" />
							다른 조건으로 분석
						</Button>
						<Button onClick={() => window.print()} className="rounded-2xl h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white">
							<Download className="h-4 w-4 mr-2" />
							결과 저장하기
						</Button>
					</div>
				</div>

				{/* 장식적 요소 */}
				<div className="absolute -top-10 -right-10 -z-10 h-[200px] w-[200px] rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl opacity-70"></div>
				<div className="absolute -bottom-10 -left-10 -z-10 h-[200px] w-[200px] rounded-full bg-gradient-to-br from-purple-400/20 to-blue-400/20 blur-3xl opacity-70"></div>
			</div>
		</div>
	);
}

export default function AnalysisResultsPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center">
					<div className="text-center space-y-4">
						<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
						<p className="text-muted-foreground">AI 분석 결과를 준비하고 있습니다</p>
					</div>
				</div>
			}
		>
			<AnalysisResultsContent />
		</Suspense>
	);
}

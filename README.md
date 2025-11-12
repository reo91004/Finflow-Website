# FinFlow UI

AI 기반 포트폴리오 리밸런싱 웹 애플리케이션

## 개요

FinFlow UI는 강화학습 모델을 활용하여 동적 포트폴리오 배분과 성과 예측을 제공하는 웹 애플리케이션이다.
[finflow-rl](https://github.com/reo91004/finflow-rl) 프로젝트에서 학습된 강화학습 모델을 통합하여 실시간 포트폴리오 최적화를 수행한다.

## 주요 기능

-   **동적 포트폴리오 배분**: 강화학습 모델을 통한 실시간 자산 배분 최적화
-   **성과 예측**: 백테스트 기반 수익률, 샤프비율, 최대낙폭 등 주요 지표 예측
-   **리스크 관리**: 사용자 리스크 성향에 따른 맞춤형 포트폴리오 구성
-   **실시간 분석**: 최신 시장 데이터와 기술적 지표를 활용한 분석
-   **XAI 분석**: 도메인 지식 기반의 휴리스틱 방식으로 포트폴리오 결정 요인 설명
    -   빠른 분석 (5-10초): 실시간 의사결정 지원
    -   정확한 분석 (30초-2분): 상세한 투자 근거 제공

## 기술 스택

### 프론트엔드

-   Next.js 15.2.4
-   React 19
-   TypeScript
-   Tailwind CSS
-   shadcn/ui

### 백엔드 (추론 서버)

-   FastAPI
-   PyTorch
-   pandas, numpy
-   yfinance (시장 데이터)
-   scikit-learn (XAI 분석)

## 환경 설정

### 환경 변수 설정

프로젝트는 로컬 개발 환경과 프로덕션 환경을 모두 지원한다.

#### 로컬 개발 환경 (.env.local 파일 생성)

```bash
# 백엔드 API 서버 URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# 환경 구분
NEXT_PUBLIC_ENVIRONMENT=development
```

#### 프로덕션 환경 (배포 시 환경 변수 설정)

```bash
# 백엔드 API 서버 URL
NEXT_PUBLIC_API_BASE_URL=https://api.finflow.reo91004.com

# 환경 구분
NEXT_PUBLIC_ENVIRONMENT=production
```

#### 백엔드 서버 환경 변수

```bash
# CORS 허용 도메인 (쉼표로 구분)
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# 프로덕션 환경에서는
CORS_ORIGINS=https://finflow.reo91004.com,https://www.finflow.reo91004.com
ENVIRONMENT=production
```

## 설치 및 실행

### 1. 프론트엔드 설정

```bash
# 의존성 설치
npm install

# 환경 변수 파일 생성 (로컬 개발용)
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000" > .env.local
echo "NEXT_PUBLIC_ENVIRONMENT=development" >> .env.local

# 개발 서버 실행
npm run dev
```

### 2. 강화학습 모델 추론 서버 설정

```bash
# 환경 변수 설정 (로컬 개발용)
export CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
export ENVIRONMENT="development"

# 추론 서버 시작 (자동으로 가상환경 생성 및 패키지 설치)
./scripts/start_rl_server.sh
```

또는 수동으로:

```bash
cd scripts

# Python 가상환경 생성
python3 -m venv venv
source venv/bin/activate

# 패키지 설치
pip install -r requirements.txt

# 환경 변수 설정
export CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
export ENVIRONMENT="development"

# 서버 실행
python rl_inference_server.py
```

### 3. 프로덕션 배포

#### 프론트엔드 빌드 및 배포

```bash
# 환경 변수 설정
export NEXT_PUBLIC_API_BASE_URL=https://api.finflow.reo91004.com
export NEXT_PUBLIC_ENVIRONMENT=production

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm run start
```

#### 백엔드 서버 배포

```bash
# 환경 변수 설정
export CORS_ORIGINS="https://finflow.reo91004.com,https://www.finflow.reo91004.com"
export ENVIRONMENT="production"

# 서버 실행
python scripts/rl_inference_server.py
```

### 4. finflow-rl 프로젝트 연동

1. [finflow-rl](https://github.com/reo91004/finflow-rl) 프로젝트를 클론한다:

```bash
git clone https://github.com/reo91004/finflow-rl.git
```

2. `scripts/models` 디렉토리에 모델 파일을 넣는다:

    - `best_model.pth` 파일을 `scripts/models` 디렉토리에 복사

3. RL 추론 서버를 실행한다:
    ```bash
    cd scripts
    ./start_rl_server.sh
    ```

## 사용법

1. 웹 브라우저에서 접속
    - 로컬: `http://localhost:3000`
    - 프로덕션: `https://finflow.reo91004.com`
2. 투자 금액 입력
3. "지금 바로 시작하기" 버튼 클릭
4. AI 분석 완료 후 추천 포트폴리오 확인

## API 엔드포인트

### POST /api/portfolio

포트폴리오 예측 요청

**요청 본문:**

```json
{
    "investmentAmount": 1000000
}
```

**응답:**

```json
{
    "portfolioAllocation": [
        {
            "stock": "AAPL",
            "percentage": 15,
            "amount": 150000
        }
    ],
    "performanceMetrics": [
        {
            "label": "연간 수익률",
            "portfolio": "16.24%",
            "spy": "0.00%",
            "qqq": "0.00%"
        }
    ],
    "quickMetrics": {
        "annualReturn": "+16.2%",
        "sharpeRatio": "0.92",
        "maxDrawdown": "-18.7%",
        "volatility": "17.9%"
    }
}
```

### POST /api/explain

XAI 분석 결과 요청

**요청 본문:**

```json
{
    "investmentAmount": 1000000,
    "riskTolerance": "moderate",
    "investmentHorizon": 252,
    "method": "fast" // "fast" 또는 "accurate"
}
```

**응답:**

```json
{
    "feature_importance": [
        {
            "feature_name": "Close",
            "importance_score": 0.245,
            "asset_name": "AAPL"
        }
    ],
    "attention_weights": [
        {
            "from_asset": "AAPL",
            "to_asset": "MSFT",
            "weight": 0.23
        }
    ],
    "explanation_text": "AI 포트폴리오 결정 근거..."
}
```

**분석 방식:**

1. **빠른 분석 (fast)**

    - 도메인 지식 기반 휴리스틱 방식
    - 5-10초 내 결과 제공
    - 실시간 의사결정에 최적화

2. **정확한 분석 (accurate)**
    - 상세한 특성 중요도 분석
    - 30초-2분 소요
    - 투자 근거에 대한 상세 설명 제공

## 강화학습 모델 통합

### 모델 서버 구조

-   **포트**: 8000
-   **엔드포인트**: `/predict`
-   **폴백 모드**: 모델 로드 실패 시 규칙 기반 예측 제공

### 지원 기능

-   실시간 시장 데이터 수집 (yfinance)
-   기술적 지표 계산 (MACD, RSI, 이동평균)
-   리스크 성향별 포트폴리오 조정
-   성과 지표 백테스트

## 개발 정보

### 프로젝트 구조

```
finflow-ui/
├── app/                    # Next.js 앱 라우터
│   ├── api/portfolio/      # 포트폴리오 API
│   ├── page.tsx           # 메인 페이지
│   └── layout.tsx         # 레이아웃
├── components/            # UI 컴포넌트
├── lib/                   # 유틸리티 및 타입
├── scripts/               # 추론 서버 스크립트
│   ├── rl_inference_server.py
│   ├── requirements.txt
│   └── start_rl_server.sh
└── public/               # 정적 파일
```

### 환경 변수

현재 환경 변수는 필요하지 않지만, 프로덕션 환경에서는 다음을 고려할 수 있다:

-   `RL_SERVER_URL`: 추론 서버 URL
-   `MARKET_DATA_API_KEY`: 시장 데이터 API 키

## 배포

### Vercel 배포

```bash
npm run build
```

### 추론 서버 배포

Docker를 사용한 배포 예시:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY scripts/requirements.txt .
RUN pip install -r requirements.txt
COPY scripts/rl_inference_server.py .
EXPOSE 8000
CMD ["python", "rl_inference_server.py"]
```

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포된다.

## 기여

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 관련 프로젝트

-   [finflow-rl](https://github.com/CBNU-FinFlow/IRT): 강화학습 모델 학습 프로젝트

#!/usr/bin/env bash
# FinFlow RL environment bootstrapper
# Creates a local Python virtual environment and installs the packages required
# for running the FinFlow reinforcement-learning inference server.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${VENV_DIR:-${ROOT_DIR}/.venv}"
FORCE_RECREATE="${FORCE_RECREATE:-0}"

log() {
	echo "[setup] $*"
}

abort() {
	echo "[setup] ERROR: $*" >&2
	exit 1
}

pick_python() {
	if [[ -n "${PYTHON:-}" ]]; then
		if command -v "${PYTHON}" >/dev/null 2>&1; then
			echo "${PYTHON}"
			return 0
		fi
		abort "환경 변수 PYTHON='${PYTHON}' 으로 지정된 인터프리터를 찾을 수 없습니다."
	fi

	for candidate in python3.11 python3.10 python3.9 python3; do
		if command -v "${candidate}" >/dev/null 2>&1; then
			echo "${candidate}"
			return 0
		fi
	done

	abort "python3 인터프리터를 찾을 수 없습니다. PATH를 확인하거나 PYTHON 환경 변수를 설정하세요."
}

PYTHON_BIN="$(pick_python)"
log "사용할 Python 인터프리터: ${PYTHON_BIN}"

if [[ "${FORCE_RECREATE}" == "1" && -d "${VENV_DIR}" ]]; then
	log "기존 가상환경(${VENV_DIR}) 제거"
	rm -rf "${VENV_DIR}"
fi

if [[ ! -d "${VENV_DIR}" ]]; then
	log "가상환경 생성: ${VENV_DIR}"
	"${PYTHON_BIN}" -m venv "${VENV_DIR}" || abort "가상환경 생성 실패"
else
	log "기존 가상환경 사용: ${VENV_DIR}"
fi

ACTIVATE="${VENV_DIR}/bin/activate"
[[ -f "${ACTIVATE}" ]] || abort "가상환경 활성화 스크립트를 찾을 수 없습니다: ${ACTIVATE}"

# shellcheck disable=SC1090
source "${ACTIVATE}"

log "pip 최신화"
python -m pip install --upgrade pip setuptools wheel

log "기본 패키지 설치 (inference server)"
python -m pip install \
	fastapi \
	uvicorn[standard] \
	curl_cffi \
	numpy \
	pandas \
	yfinance \
	scikit-learn \
	torch --upgrade

if ! python -m pip install "stable-baselines3[extra]"; then
	log "stable-baselines3[extra] 설치가 실패했습니다. 기본 패키지를 다시 시도합니다."
	python -m pip install stable-baselines3
fi

ASSETS_DIR="${ROOT_DIR}/scripts/irt_assets/20251016_192706"
if [[ -d "${ASSETS_DIR}" ]]; then
	log "IRT 추론 자산 디렉터리 확인: ${ASSETS_DIR}"
else
	log "IRT 추론 자산 디렉터리를 찾을 수 없습니다: ${ASSETS_DIR}"
	log "필요한 모델 파일이 없으면 추론 서버가 실행되지 않을 수 있습니다."
fi

log "설치 완료. 가상환경 활성화 방법:"
echo "  source \"${VENV_DIR}/bin/activate\""
log "추론 서버 실행 예:"
echo "  python scripts/rl_inference_server.py"

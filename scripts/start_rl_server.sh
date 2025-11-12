#!/bin/bash

# 강화학습 모델 추론 서버 시작 스크립트
set -euo pipefail

echo "FinFlow RL 추론 서버 시작 중..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
LOG_DIR="${ROOT_DIR}/logs"
MODELS_DIR="${SCRIPT_DIR}/models"
DEFAULT_VENV_DIR="${ROOT_DIR}/.venv"
LEGACY_VENV_DIR="${SCRIPT_DIR}/venv"
VENV_DIR="${VENV_DIR:-}"

# 필요한 디렉토리 생성
mkdir -p "${LOG_DIR}"

# 가상환경 경로 결정
if [[ -z "${VENV_DIR}" ]]; then
	if [[ -d "${DEFAULT_VENV_DIR}" ]]; then
		VENV_DIR="${DEFAULT_VENV_DIR}"
	elif [[ -d "${LEGACY_VENV_DIR}" ]]; then
		VENV_DIR="${LEGACY_VENV_DIR}"
	else
		echo "가상환경을 찾을 수 없습니다. 먼저 setup.sh를 실행하세요."
		exit 1
	fi
elif [[ ! -d "${VENV_DIR}" ]]; then
	echo "VENV_DIR='${VENV_DIR}' 가 존재하지 않습니다. 경로를 확인하세요."
	exit 1
fi

# 가상환경 활성화
ACTIVATE="${VENV_DIR}/bin/activate"
if [[ ! -f "${ACTIVATE}" ]]; then
	echo "가상환경 활성화 스크립트를 찾을 수 없습니다: ${ACTIVATE}"
	echo "setup.sh를 다시 실행하거나 VENV_DIR을 올바르게 설정하세요."
	exit 1
fi

# shellcheck disable=SC1090
source "${ACTIVATE}"

# 모델 디렉토리 확인
if [[ ! -d "${MODELS_DIR}" ]]; then
	echo "models 디렉토리를 찾을 수 없습니다."
	echo "models 디렉토리를 생성하고 모델 파일을 넣어주세요."
	mkdir -p "${MODELS_DIR}"
	exit 1
fi

# 서버 실행
echo "RL 추론 서버를 시작합니다..."
cd "${SCRIPT_DIR}"
python rl_inference_server.py

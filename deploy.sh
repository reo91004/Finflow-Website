#!/bin/bash
# deploy.sh - 로컬 빌드 후 배포 스크립트

# .env 파일 불러오기
set -a
source .env
set +a

set -e

# EC2_IP는 .env 파일에서 불러옴
SSH_KEY="~/.ssh/finflow-us-ui.pem"
DEPLOY_USER="ubuntu"

echo "🚀 FinFlow 배포 시작..."

# 1. 환경 변수 설정
echo "📝 환경 변수 설정 중..."
cat > .env.local << EOF
NEXT_PUBLIC_API_BASE_URL=https://api.finflow.reo91004.com
NEXT_PUBLIC_ENVIRONMENT=production
EOF

# 2. 빌드
echo "🔨 빌드 중..."
npm install
npm run build

# 3. 압축
echo "📦 압축 중..."
tar -czf build.tar.gz \
	.next \
	public \
	package.json \
	package-lock.json \
	next.config.mjs \
	scripts

# 4. 업로드
echo "📤 업로드 중..."
scp -i $SSH_KEY build.tar.gz $DEPLOY_USER@$EC2_IP:/var/www/finflow/

# 5. 서버에서 배포
echo "🚀 서버 배포 중..."
ssh -i $SSH_KEY $DEPLOY_USER@$EC2_IP << 'EOF'
cd /var/www/finflow
tar -xzf build.tar.gz
npm ci --only=production
pm2 restart finflow-frontend
pm2 restart finflow-backend
rm build.tar.gz
EOF

# 6. 정리
rm build.tar.gz
rm .env.local

echo "✅ 배포 완료!"
echo "🌐 사이트: https://finflow.reo91004.com"
echo "📊 API: https://api.finflow.reo91004.com"
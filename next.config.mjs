/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        unoptimized: true,
        remotePatterns: [
            {
                protocol: "https",
                hostname: "logo.clearbit.com",
            },
        ],
    },
    // 환경 변수 설정
    env: {
        NEXT_PUBLIC_API_BASE_URL:
            process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
        NEXT_PUBLIC_ENVIRONMENT:
            process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
    },
    // API 라우트 CORS 설정
    async headers() {
        return [
            {
                source: "/api/:path*",
                headers: [
                    {
                        key: "Access-Control-Allow-Origin",
                        value:
                            process.env.NODE_ENV === "production"
                                ? "https://finflow.reo91004.com"
                                : "http://localhost:3000",
                    },
                    {
                        key: "Access-Control-Allow-Methods",
                        value: "GET, POST, PUT, DELETE, OPTIONS",
                    },
                    {
                        key: "Access-Control-Allow-Headers",
                        value: "Content-Type, Authorization",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;

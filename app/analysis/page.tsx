"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";

function AnalysisContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { user, loading } = useRequireAuth();

	useEffect(() => {
		if (loading || !user) {
			return;
		}

		// URL 파라미터를 loading 페이지로 전달
		const params = new URLSearchParams();
		
		// onboarding에서 받은 데이터를 적절히 변환
		const amount = searchParams.get("amount") || "1000000";
		const period = searchParams.get("period") || "1year";
		const risk = searchParams.get("risk") || "moderate";
		
		// 기간을 월 단위로 변환
		let horizon = "12";
		switch (period) {
			case "1year": horizon = "12"; break;
			case "3years": horizon = "36"; break;
			case "5years": horizon = "60"; break;
			case "10years": horizon = "120"; break;
		}
		
		// 리스크를 숫자로 변환
		let riskLevel = "5";
		switch (risk) {
			case "conservative": riskLevel = "3"; break;
			case "moderate": riskLevel = "5"; break;
			case "aggressive": riskLevel = "8"; break;
		}
		
		params.set("amount", amount);
		params.set("horizon", horizon);
		params.set("risk", riskLevel);
		
		// loading 페이지로 리다이렉트
		router.replace(`/analysis/loading?${params.toString()}`);
	}, [router, searchParams, loading, user]);

	if (loading) {
		return (
			<div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
				<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return (
		<div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
			<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
		</div>
	);
}

export default function AnalysisPage() {
	return (
		<Suspense fallback={
			<div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
				<div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
			</div>
		}>
			<AnalysisContent />
		</Suspense>
	);
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/use-require-auth";

export default function OnboardingPage() {
	const { user, loading } = useRequireAuth();
	const [step, setStep] = useState(1);
	const [formData, setFormData] = useState({
		investmentAmount: "",
		investmentPeriod: "",
		riskTolerance: "",
	});
	const router = useRouter();

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
			</div>
		);
	}

	if (!user) {
		return null;
	}

	const handleNext = () => {
		if (step < 3) {
			setStep(step + 1);
		} else {
			// 완료 처리 - /analysis로 이동 (데이터와 함께)
			console.log("투자 정보:", formData);
			const params = new URLSearchParams();
			params.set("amount", formData.investmentAmount.replace(/,/g, ""));
			params.set("period", formData.investmentPeriod);
			params.set("risk", formData.riskTolerance);
			
			router.push(`/analysis?${params.toString()}`);
		}
	};

	const handlePrev = () => {
		if (step > 1) {
			setStep(step - 1);
		}
	};

	const isStepValid = () => {
		switch (step) {
			case 1:
				return formData.investmentAmount !== "";
			case 2:
				return formData.investmentPeriod !== "";
			case 3:
				return formData.riskTolerance !== "";
			default:
				return false;
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center p-4 overflow-hidden">
			{/* 배경 패턴 */}
			<div className="absolute inset-0 bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30"></div>
			
			<div className="relative w-full max-w-md px-4 sm:px-0">
				{/* 헤더 */}
				<div className="text-center mb-6 sm:mb-8">
					<Link href="/" className="inline-flex items-center gap-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6">
						<ArrowLeft className="size-3.5 sm:size-4" />
						돌아가기
					</Link>
					<div className="font-bold text-xl sm:text-2xl mb-2">FinFlow</div>
					<p className="text-sm sm:text-base text-muted-foreground">투자 정보를 설정해주세요</p>
				</div>

				{/* 진행도 표시 */}
				<div className="flex justify-center mb-6 sm:mb-8">
					{[1, 2, 3].map((num) => (
						<div key={num} className="flex items-center">
							<div
								className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors ${
									step >= num
										? "bg-blue-600 text-white"
										: "bg-gray-200 dark:bg-gray-700 text-gray-500"
								}`}
							>
								{num}
							</div>
							{num < 3 && (
								<div
									className={`w-8 sm:w-12 h-1 mx-1 sm:mx-2 transition-colors ${
										step > num ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
									}`}
								/>
							)}
						</div>
					))}
				</div>

				<motion.div
					key={step}
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -20 }}
					transition={{ duration: 0.3 }}
				>
					<Card className="backdrop-blur-sm bg-white/90 dark:bg-gray-900/90 border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-xl">
						<CardContent className="p-8">
							{step === 1 && (
								<div className="space-y-6">
									<div className="text-center">
										<h2 className="text-2xl font-bold mb-2">투자 금액</h2>
										<p className="text-muted-foreground">초기 투자하실 금액을 입력해주세요</p>
									</div>
									<div className="space-y-2">
										<Label htmlFor="amount">투자 금액 (원)</Label>
										<Input
											id="amount"
											type="text"
											placeholder="예: 1,000,000"
											value={formData.investmentAmount}
											onChange={(e) => {
												// 숫자와 콤마만 허용
												const value = e.target.value.replace(/[^\d,]/g, "");
												setFormData({ ...formData, investmentAmount: value });
											}}
											className="h-12 text-lg rounded-2xl"
										/>
									</div>
									<div className="grid grid-cols-2 gap-3">
										{["500,000", "1,000,000", "3,000,000", "5,000,000"].map((amount) => (
											<Button
												key={amount}
												variant="outline"
												className="h-12 rounded-2xl"
												onClick={() =>
													setFormData({ ...formData, investmentAmount: amount })
												}
											>
												{amount}원
											</Button>
										))}
									</div>
								</div>
							)}

							{step === 2 && (
								<div className="space-y-6">
									<div className="text-center">
										<h2 className="text-2xl font-bold mb-2">투자 기간</h2>
										<p className="text-muted-foreground">투자하실 기간을 선택해주세요</p>
									</div>
									<div className="space-y-2">
										<Label>투자 기간</Label>
										<Select
											value={formData.investmentPeriod}
											onValueChange={(value) =>
												setFormData({ ...formData, investmentPeriod: value })
											}
										>
											<SelectTrigger className="h-12 rounded-2xl">
												<SelectValue placeholder="투자 기간을 선택해주세요" />
											</SelectTrigger>
											<SelectContent align="end">
												<SelectItem value="1year">1년</SelectItem>
												<SelectItem value="3years">3년</SelectItem>
												<SelectItem value="5years">5년</SelectItem>
												<SelectItem value="10years">10년 이상</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							)}

							{step === 3 && (
								<div className="space-y-6">
									<div className="text-center">
										<h2 className="text-2xl font-bold mb-2">투자 성향</h2>
										<p className="text-muted-foreground">본인의 투자 성향을 선택해주세요</p>
									</div>
									<RadioGroup
										value={formData.riskTolerance}
										onValueChange={(value) =>
											setFormData({ ...formData, riskTolerance: value })
										}
										className="space-y-4"
									>
										<div 
											className={`flex items-start space-x-3 p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
												formData.riskTolerance === "conservative" 
													? "border-blue-600 bg-blue-50 dark:bg-blue-950/50" 
													: "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
											}`}
											onClick={() => setFormData({ ...formData, riskTolerance: "conservative" })}
										>
											<RadioGroupItem value="conservative" id="conservative" className="mt-1" />
											<div className="space-y-1">
												<Label htmlFor="conservative" className="font-medium cursor-pointer">
													안정형 (보수적)
												</Label>
												<p className="text-sm text-muted-foreground">
													원금 보존을 중시하며 안정적인 수익을 추구
												</p>
											</div>
										</div>
										<div 
											className={`flex items-start space-x-3 p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
												formData.riskTolerance === "moderate" 
													? "border-blue-600 bg-blue-50 dark:bg-blue-950/50" 
													: "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
											}`}
											onClick={() => setFormData({ ...formData, riskTolerance: "moderate" })}
										>
											<RadioGroupItem value="moderate" id="moderate" className="mt-1" />
											<div className="space-y-1">
												<Label htmlFor="moderate" className="font-medium cursor-pointer">
													중립형 (균형적)
												</Label>
												<p className="text-sm text-muted-foreground">
													적당한 위험을 감수하며 균형 잡힌 수익 추구
												</p>
											</div>
										</div>
										<div 
											className={`flex items-start space-x-3 p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
												formData.riskTolerance === "aggressive" 
													? "border-blue-600 bg-blue-50 dark:bg-blue-950/50" 
													: "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
											}`}
											onClick={() => setFormData({ ...formData, riskTolerance: "aggressive" })}
										>
											<RadioGroupItem value="aggressive" id="aggressive" className="mt-1" />
											<div className="space-y-1">
												<Label htmlFor="aggressive" className="font-medium cursor-pointer">
													공격형 (적극적)
												</Label>
												<p className="text-sm text-muted-foreground">
													높은 위험을 감수하더라도 높은 수익을 추구
												</p>
											</div>
										</div>
									</RadioGroup>
								</div>
							)}

							{/* 버튼 */}
							<div className="flex gap-3 mt-8">
								{step > 1 && (
									<Button
										variant="outline"
										onClick={handlePrev}
										className="flex-1 h-12 rounded-2xl"
									>
										<ArrowLeft className="size-4 mr-2" />
										이전
									</Button>
								)}
								<Button
									onClick={handleNext}
									disabled={!isStepValid()}
									className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white"
								>
									{step === 3 ? "완료" : "다음"}
									{step < 3 && <ArrowRight className="size-4 ml-2" />}
								</Button>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* 장식적 요소 */}
				<div className="absolute -top-10 -right-10 -z-10 h-[200px] w-[200px] rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl opacity-70"></div>
				<div className="absolute -bottom-10 -left-10 -z-10 h-[200px] w-[200px] rounded-full bg-gradient-to-br from-purple-400/20 to-blue-400/20 blur-3xl opacity-70"></div>
			</div>
		</div>
	);
}

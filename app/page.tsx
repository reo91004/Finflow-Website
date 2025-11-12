"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Shield, Target, ExternalLink, Biohazard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";

export default function LandingPage() {
	const container = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: {
				staggerChildren: 0.1,
			},
		},
	};

	const item = {
		hidden: { opacity: 0, y: 20 },
		show: { opacity: 1, y: 0 },
	};

	const features = [
		{
			title: "면역체계에서 영감을 받은 모델",
			description: "FinFlow는 생물학적 면역체계에서 착안한 구조로 설계되었습니다.\n\nB-Cell과 T-Cell이 협력하듯, 다양한 정책과 메모리가 함께 작동하여 시장 변화에 유연하게 대응합니다.",
			icon: <Biohazard className="size-6" />,
		},
		{
			title: "자동화된 포트폴리오 관리",
			description: "FinFlow는 데이터 기반 강화학습으로 포트폴리오를 자동으로 관리합니다.\n\n시장의 흐름을 실시간으로 반영하여, 위험을 줄이고 기회를 포착하는 결정을 스스로 내립니다.",
			icon: <Target className="size-6" />,
		},
		{
			title: "투명한 의사 결정",
			description: "FinFlow는 단순한 예측을 넘어, 왜 그런 의사결정을 내렸는지 설명할 수 있습니다.\n\n투명한 분석과 시각화를 통해 투자자에게 신뢰할 수 있는 근거를 제공합니다.",
			icon: <Shield className="size-6" />,
		},
	];

	// 다우존스 30 주요 종목들
	const companyLogos = [
		{ name: "Apple", ticker: "AAPL", domain: "apple.com" },
		{ name: "Microsoft", ticker: "MSFT", domain: "microsoft.com" },
		{ name: "Amazon", ticker: "AMZN", domain: "amazon.com" },
		{ name: "NVIDIA", ticker: "NVDA", domain: "nvidia.com" },
		{ name: "JPMorgan", ticker: "JPM", domain: "jpmorganchase.com" },
		{ name: "Johnson & Johnson", ticker: "JNJ", domain: "jnj.com" },
		{ name: "Visa", ticker: "V", domain: "visa.com" },
		{ name: "Procter & Gamble", ticker: "PG", domain: "pg.com" },
		{ name: "Coca-Cola", ticker: "KO", domain: "coca-cola.com" },
		{ name: "McDonald's", ticker: "MCD", domain: "mcdonalds.com" },
		{ name: "Nike", ticker: "NKE", domain: "nike.com" },
		{ name: "Boeing", ticker: "BA", domain: "boeing.com" },
	];

	return (
		<div className="flex min-h-[100dvh] flex-col">
			<Navbar />

			<main className="flex-1">
				{/* Hero Section */}
				<section className="w-full py-20 md:py-32 lg:py-40 overflow-hidden relative">
					<div className="container px-4 md:px-6 relative">
						<div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-black bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f1f1f_1px,transparent_1px),linear-gradient(to_bottom,#1f1f1f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>

						<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center max-w-4xl mx-auto mb-12">
							<Badge className="mb-4 rounded-2xl px-4 py-1.5 text-sm font-medium bg-slate-100 text-slate-700 border-0">AI 기반 리스크 관리</Badge>
							<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-balance bg-gradient-to-r from-gray-900 via-blue-800 to-purple-900 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
								포트폴리오 관리, 이제 AI로 스마트하게
							</h1>
							<p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto text-balance" style={{ fontSize: "1rem", lineHeight: "1.5" }}>
								실시간 변동성 감지, 리밸런싱 제안, 스트레스 시각화.
								<br />
								강화학습 기반의 지능형 리스크 관리로 투자를 보호하세요.
							</p>
							<div className="flex flex-col sm:flex-row gap-4 justify-center">
								<Link href="/onboarding">
									<Button size="lg" className="rounded-2xl h-12 px-8 text-base bg-black hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-300 text-white dark:text-black">
										시작하기
									</Button>
								</Link>
								<Button size="lg" variant="outline" className="rounded-2xl h-12 px-8 text-base bg-transparent">
									<span
										onClick={() => {
											window.open("https://www.youtube.com/watch?v=uVVgNtTpUoI", "_blank");
										}}
										style={{
											cursor: "pointer",
											display: "flex",
											alignItems: "center",
										}}
									>
										데모 보기
										<ExternalLink className="ml-2 size-4" />
									</span>
								</Button>
							</div>
						</motion.div>

						<motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="relative mx-auto max-w-3xl">
							<motion.div
								className="relative rounded-tl-3xl rounded-tr-3xl overflow-hidden h-[300px] md:h-[380px] lg:h-[420px]"
								initial={{
									boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
								}}
								whileHover={{
									y: -8,
									scale: 1.02,
									boxShadow: "0 30px 40px -10px rgb(0 0 0 / 0.2), 0 15px 20px -8px rgb(0 0 0 / 0.15)",
								}}
								transition={{
									duration: 0.4,
									ease: [0.25, 0.46, 0.45, 0.94],
								}}
							>
								<motion.div
									className="w-full h-full"
									whileHover={{ scale: 1.05 }}
									transition={{
										duration: 0.6,
										ease: "easeOut",
									}}
								>
									<Image src="/banner.png" alt="FinFlow 포트폴리오 관리 플랫폼" width={1200} height={675} className="w-full h-full object-cover object-top" priority />
								</motion.div>
								<motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/30" whileHover={{ opacity: 0.7 }} transition={{ duration: 0.4 }} />
								<motion.div
									className="absolute inset-0 bg-gradient-to-t from-blue-500/0 via-transparent to-transparent"
									initial={{ opacity: 0 }}
									whileHover={{ opacity: 0.15 }}
									transition={{ duration: 0.4 }}
								/>
							</motion.div>
							<div className="absolute -bottom-10 -right-10 -z-10 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 blur-3xl opacity-70"></div>
							<div className="absolute -top-10 -left-10 -z-10 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-purple-400/20 to-blue-400/20 blur-3xl opacity-70"></div>
						</motion.div>
					</div>
				</section>

				{/* Feature Cards Section */}
				<section className="w-full py-20 md:py-32 relative overflow-hidden">
					{/* 배경 그라데이션 */}
					<div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent dark:via-blue-950/10"></div>
					<div className="container px-4 md:px-6 relative">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5 }}
							className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
						>
							<h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">
								AI 포트폴리오 관리,
								<br />
								투자자의 든든한 동반자
							</h2>
							<p className="max-w-[800px] text-muted-foreground md:text-lg text-balance">첨단 알고리즘과 실시간 분석을 통해 당신의 투자 포트폴리오를 보호하고 최적화합니다.</p>
						</motion.div>

						<motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
							{features.map((feature, i) => (
								<motion.div
									key={i}
									variants={item}
									whileHover={{
										y: -5,
										transition: { duration: 0.2 },
									}}
									className="group"
								>
									<Card className="h-full overflow-hidden border bg-white dark:bg-gray-800 transition-all duration-300 hover:shadow-lg rounded-3xl">
										<CardContent className="p-8 flex flex-col h-full text-center">
											<div className="size-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
												{feature.icon}
											</div>
											<h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100 leading-tight">{feature.title}</h3>
											<p className="text-gray-600 dark:text-gray-300 leading-relaxed flex-1 whitespace-pre-line">{feature.description}</p>
											<div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
												<div className="w-8 h-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
											</div>
										</CardContent>
									</Card>
								</motion.div>
							))}
						</motion.div>
					</div>
				</section>

				{/* Company Logos Section */}
				<section className="w-full py-4 md:py-8 bg-gray-50 dark:bg-gray-900/30 relative overflow-hidden">
					<div className="container px-4 md:px-6 relative">
						<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-16">
							<div className="relative mx-auto max-w-4xl mb-12">
								<div className="relative mx-auto w-full max-w-xl aspect-square mb-12">
									{/* 회전하는 원형 컨테이너 */}
									<motion.div
										className="absolute inset-0"
										animate={{ rotate: 360 }}
										transition={{
											duration: 80,
											repeat: Number.POSITIVE_INFINITY,
											ease: "linear",
										}}
									>
										{companyLogos.map((logo, i) => {
											const angle = (i / companyLogos.length) * 2 * Math.PI;
											const radius = 42; // 중심에서의 거리 (%)
											const x = 50 + radius * Math.cos(angle);
											const y = 50 + radius * Math.sin(angle);

											return (
												<motion.div
													key={logo.ticker}
													className="absolute"
													style={{
														left: `${x}%`,
														top: `${y}%`,
														transform: "translate(-50%, -50%)",
													}}
													whileHover={{
														scale: 1.12,
														zIndex: 10,
													}}
												>
													{/* 역회전으로 로고를 항상 똑바로 유지 */}
													<motion.div
														animate={{
															rotate: -360,
														}}
														transition={{
															duration: 80,
															repeat: Number.POSITIVE_INFINITY,
															ease: "linear",
														}}
														className="size-16 md:size-20 rounded-2xl bg-white dark:bg-gray-800 shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700"
													>
														<Image
															src={`https://logo.clearbit.com/${logo.domain}`}
															alt={`${logo.name} 로고`}
															width={96}
															height={96}
															className="w-full h-full object-cover"
															onError={(e) => {
																const target = e.target as HTMLImageElement;
																target.style.display = "none";
																const parent = target.parentElement;
																if (parent) {
																	parent.innerHTML = `<span class=\"text-gray-900 dark:text-gray-100 font-bold text-xs md:text-sm\">${logo.ticker}</span>`;
																}
															}}
														/>
													</motion.div>
												</motion.div>
											);
										})}
									</motion.div>

									{/* 중앙 장식 */}
									<div className="absolute inset-0 flex items-center justify-center z-0">
										<div className="size-32 md:size-40 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm border-2 border-blue-300/30 dark:border-blue-600/30" />
									</div>
								</div>

								{/* 장식적인 원형 궤도 */}
								<div className="absolute inset-0 z-0">
									<motion.div
										animate={{ rotate: 360 }}
										transition={{
											duration: 120,
											repeat: Number.POSITIVE_INFINITY,
											ease: "linear",
										}}
										className="absolute inset-0 rounded-full border-2 border-blue-300/50 dark:border-blue-800/30"
										style={{
											width: "120%",
											height: "120%",
											left: "-10%",
											top: "-10%",
										}}
									/>
									<motion.div
										animate={{ rotate: -360 }}
										transition={{
											duration: 200,
											repeat: Number.POSITIVE_INFINITY,
											ease: "linear",
										}}
										className="absolute inset-0 rounded-full border-2 border-purple-300/50 dark:border-purple-800/20"
										style={{
											width: "140%",
											height: "140%",
											left: "-20%",
											top: "-20%",
										}}
									/>
								</div>
							</div>

							<h2 className="text-2xl md:text-3xl font-bold mb-4 text-balance relative z-10 bg-gradient-to-r from-gray-900 via-blue-700 to-purple-800 dark:from-white dark:via-blue-300 dark:to-purple-300 bg-clip-text text-transparent">
								<span className="text-black dark:text-white">FinFlow와 함께하는 믿을 수 있는 투자</span>
							</h2>
							<p className="text-muted-foreground md:text-lg max-w-2xl mx-auto text-balance mb-8 relative z-10">
								전 세계 주요 기업들의 주식을 포함한 다양한 자산군에서 최적의 포트폴리오를 구성하세요.
							</p>
							<Link href="/onboarding">
								<Button className="rounded-2xl bg-blue-600 hover:bg-blue-700 px-8 py-3 relative z-10 text-white">시작하기</Button>
							</Link>
						</motion.div>
					</div>
				</section>

				{/* FAQ Section */}
				<section className="w-full py-20 md:py-32 relative overflow-hidden">
					{/* 배경 그라데이션 */}
					<div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-50/20 to-transparent dark:via-purple-950/10"></div>
					<div className="container px-4 md:px-6 relative">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5 }}
							className="flex flex-col items-center justify-center space-y-4 text-center mb-12"
						>
							<h2 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">자주 묻는 질문</h2>
							<p className="max-w-[800px] text-muted-foreground md:text-lg text-balance">FinFlow 포트폴리오 리스크 관리 플랫폼에 대한 궁금한 점을 확인하세요.</p>
						</motion.div>

						<div className="mx-auto max-w-3xl">
							<Accordion type="single" collapsible className="w-full">
								{[
									{
										question: "내 데이터는 안전하게 보관되나요?",
										answer: "민감한 정보는 암호화되어 저장되며 접근이 최소화됩니다. 업계 표준 보안 관행을 따르고 금융 데이터 보호 규정을 준수합니다.",
									},
									{
										question: "무료로 이용이 가능한가요?",
										answer: "네, 저희는 무료로 서비스를 제공합니다.",
									},
									{
										question: "어떤 주식들을 지원하나요?",
										answer: "저희는 다우 존스 산업평균지수에 포함된 30개의 주요 종목들을 지원합니다.",
									},
									{
										question: "알고리즘은 어떻게 작동하나요?",
										answer: "저희는 면역 모방 강화학습 모델을 사용하여 최적의 포트폴리오를 구성합니다.",
									},
								].map((faq, i) => (
									<motion.div
										key={i}
										initial={{ opacity: 0, y: 10 }}
										whileInView={{ opacity: 1, y: 0 }}
										viewport={{ once: true }}
										transition={{
											duration: 0.3,
											delay: i * 0.05,
										}}
									>
										<AccordionItem value={`item-${i}`} className="border-b border-border/40 py-2">
											<AccordionTrigger className="text-left font-medium hover:no-underline">{faq.question}</AccordionTrigger>
											<AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
										</AccordionItem>
									</motion.div>
								))}
							</Accordion>
						</div>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="w-full border-t bg-background">
				<div className="container px-4 py-10 md:px-6">
					<div className="flex flex-col gap-6">
						{/* FinFlow 로고 */}
						<div className="flex items-center gap-2 font-bold text-xl">
							<span>FinFlow</span>
						</div>

						{/* 주소 */}
						<div className="space-y-2">
							<h4 className="text-sm font-semibold">Location</h4>
							<p className="text-sm text-muted-foreground">
								충북 청주시 서원구 충대로1 충북대학교 전자정보대학 소프트웨어학부
								<br />
								S4-1동(전자정보 3관)
							</p>
						</div>

						{/* 팀원 정보 */}
						<div className="space-y-3">
							<h4 className="text-sm font-semibold">Team Members</h4>
							<div className="grid gap-3 sm:grid-cols-3">
								<div className="space-y-1">
									<p className="text-sm font-medium">류정환</p>
									<p className="text-xs text-muted-foreground">
										<a href="mailto:ryujh030820@gmail.com" className="hover:text-foreground transition-colors">
											ryujh030820@gmail.com
										</a>
									</p>
									<p className="text-xs text-muted-foreground">
										<a href="https://github.com/ryujh030820" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
											github.com/ryujh030820
										</a>
									</p>
								</div>
								<div className="space-y-1">
									<p className="text-sm font-medium">박용성</p>
									<p className="text-xs text-muted-foreground">
										<a href="mailto:reo91004@gmail.com" className="hover:text-foreground transition-colors">
											reo91004@gmail.com
										</a>
									</p>
									<p className="text-xs text-muted-foreground">
										<a href="https://github.com/reo91004" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
											github.com/reo91004
										</a>
									</p>
								</div>
								<div className="space-y-1">
									<p className="text-sm font-medium">김금영</p>
									<p className="text-xs text-muted-foreground">
										<a href="mailto:ay6656@naver.com" className="hover:text-foreground transition-colors">
											ay6656@naver.com
										</a>
									</p>
									<p className="text-xs text-muted-foreground">
										<a href="https://github.com/gamgomyang" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
											github.com/gamgomyang
										</a>
									</p>
								</div>
							</div>
						</div>

						{/* Copyright */}
						<div className="pt-6 border-t border-border/40">
							<p className="text-xs text-muted-foreground text-center">© 2025 FinFlow. All rights reserved.</p>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}

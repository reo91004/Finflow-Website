"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/navbar";
import { signup as signupRequest } from "@/lib/auth";

export default function SignupPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        confirmPassword: "",
        name: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 비밀번호 확인
        if (formData.password !== formData.confirmPassword) {
            toast({
                title: "비밀번호 불일치",
                description: "비밀번호가 일치하지 않습니다.",
                variant: "destructive",
            });
            return;
        }

        // 비밀번호 길이 확인
        if (formData.password.length < 8) {
            toast({
                title: "비밀번호 오류",
                description: "비밀번호는 최소 8자 이상이어야 합니다.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            await signupRequest({
                email: formData.email,
                password: formData.password,
                name: formData.name,
            });
            toast({
                title: "회원가입 성공",
                description: "계정이 생성되었습니다. 로그인해주세요.",
            });
            router.push("/login");
        } catch (error) {
            toast({
                title: "오류 발생",
                description: error instanceof Error ? error.message : "회원가입 중 오류가 발생했습니다.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="flex min-h-screen flex-col">
            <Navbar />
            <div className="flex flex-1 items-center justify-center bg-background p-4">
                <div className="w-full max-w-md">
                    {/* 로고 섹션 */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold mb-2">FinFlow</h1>
                        <p className="text-muted-foreground">
                            AI 기반 포트폴리오 리스크 관리
                        </p>
                    </div>

                    {/* 회원가입 카드 */}
                    <Card className="border">
                        <CardHeader className="space-y-1 pb-6">
                            <CardTitle className="text-3xl font-bold text-center">
                                회원가입
                            </CardTitle>
                            <CardDescription className="text-center text-base">
                                새로운 계정을 만들어 시작하세요
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-8">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="name"
                                        className="text-sm font-semibold"
                                    >
                                        이름
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        type="text"
                                        placeholder="홍길동"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        disabled={isLoading}
                                        className="h-12 px-4"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="email"
                                        className="text-sm font-semibold"
                                    >
                                        이메일
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="example@email.com"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        disabled={isLoading}
                                        className="h-12 px-4"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="password"
                                        className="text-sm font-semibold"
                                    >
                                        비밀번호
                                    </Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        disabled={isLoading}
                                        className="h-12 px-4"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        최소 8자 이상
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="confirmPassword"
                                        className="text-sm font-semibold"
                                    >
                                        비밀번호 확인
                                    </Label>
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        disabled={isLoading}
                                        className="h-12 px-4"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-12 text-base font-semibold bg-blue-500 hover:bg-blue-700 text-white"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "가입 중..." : "회원가입"}
                                </Button>
                            </form>
                        </CardContent>
                        <CardFooter className="flex flex-col space-y-4 pb-8 px-8">
                            <div className="relative w-full">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">
                                        또는
                                    </span>
                                </div>
                            </div>
                            <div className="text-center text-sm text-muted-foreground">
                                이미 계정이 있으신가요?{" "}
                                <Link
                                    href="/login"
                                    className="font-semibold text-blue-500 underline-offset-4 hover:underline "
                                >
                                    로그인
                                </Link>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}

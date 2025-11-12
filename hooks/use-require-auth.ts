"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/types/auth";

interface UseRequireAuthResult {
	user: User | null;
	loading: boolean;
}

export function useRequireAuth(): UseRequireAuthResult {
	const router = useRouter();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let active = true;

		const checkAuth = async () => {
			try {
				const current = await getCurrentUser();

				if (!active) return;

				if (current) {
					setUser(current);
				} else {
					setUser(null);
					const redirectPath = `${window.location.pathname}${window.location.search}`;
					router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
				}
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		};

		checkAuth();

		return () => {
			active = false;
		};
	}, [router]);

	return { user, loading };
}

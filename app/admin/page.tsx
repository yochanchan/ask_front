"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearAccessToken } from "../lib/auth-client";
import { fetchMe, MeUser } from "../lib/session";

export default function AdminHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const me = await fetchMe();
        if (me.role !== "admin") {
          router.replace("/me");
          return;
        }
        setUser(me);
      } catch (err) {
        console.error(err);
        setError("管理ページの読み込みに失敗しました。");
        clearAccessToken();
        router.replace("/login");
      }
    };
    run();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-slate-900">管理トップ</h1>
        <p className="mt-1 text-sm text-slate-600">
          ユーザー管理などの管理者機能にアクセスできます。
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/users"
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-slate-900">ユーザー管理</h2>
            <p className="mt-2 text-sm text-slate-600">
              ユーザーの一覧、登録、削除、CSV一括操作を行います。
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch } from "../lib/api-client";
import { clearAccessToken, setAccessToken } from "../lib/auth-client";

type LocalLoginResponse = {
  token: {
    access_token: string;
    token_type: string;
    expires_in: number;
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLocalLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const trimmedId = loginId.trim();
    const trimmedPass = password.trim();
    if (!trimmedId || !trimmedPass) {
      setError("IDとパスワードを入力してください。");
      return;
    }
    setLoading(true);
    try {
      const result = await apiFetch<LocalLoginResponse>(
        "/auth/login/local",
        {
          method: "POST",
          body: JSON.stringify({ login_id: trimmedId, password: trimmedPass }),
        }
      );
      setAccessToken(result.token.access_token);
      router.push("/me");
    } catch (err) {
      console.error(err);
      clearAccessToken();
      setError("IDまたはパスワードが正しくありません。");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      const data = await apiFetch<{ authorization_url: string }>(
        "/auth/google/login",
        { method: "GET" },
        null
      );
      window.location.href = data.authorization_url;
    } catch (err) {
      console.error(err);
      setError("Googleログインの開始に失敗しました。");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-2xl font-semibold text-slate-900">ログイン</h1>
        <p className="mt-2 text-sm text-slate-600">
          生徒はGoogleログインのみ利用できます。先生・管理者はローカルIDも利用できます。
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Googleでログイン</h2>
            <p className="mt-1 text-sm text-slate-600">
              @gmail.com のみ許可しています。
            </p>
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="mt-6 w-full rounded-md bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Googleでログイン
            </button>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              先生・管理者用（ローカルID）
            </h2>
            <form className="mt-4 space-y-4" onSubmit={handleLocalLogin}>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  ログインID
                </label>
                <input
                  type="text"
                  name="loginId"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  パスワード
                </label>
                <input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "ログイン中..." : "ログイン"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

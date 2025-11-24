"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetch, apiFetchBlob } from "../../lib/api-client";
import { clearAccessToken } from "../../lib/auth-client";
import { ensureAccessToken, fetchMe, MeUser } from "../../lib/session";

type UserListItem = {
  id: number;
  school_person_id: string | null;
  role: "student" | "teacher" | "admin";
  full_name: string;
  full_name_kana: string | null;
  date_of_birth: string | null;
  email: string;
  grade: number | null;
  class_name: string | null;
  gender: string;
  is_active: boolean;
  is_deleted: boolean;
  updated_at: string;
};

type UserListResponse = {
  items: UserListItem[];
  total: number;
  page: number;
  page_size: number;
};

type BulkRowResult = {
  line_number: number;
  status: "ok" | "error";
  message?: string | null;
};

type BulkResult = {
  total: number;
  success: number;
  errors: number;
  rows: BulkRowResult[];
};

const roleLabel: Record<UserListItem["role"], string> = {
  student: "生徒",
  teacher: "先生",
  admin: "管理者",
};

const pageSize = 20;

export default function AdminUsersPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [list, setList] = useState<UserListResponse | null>(null);
  const [filters, setFilters] = useState({
    role: "",
    grade: "",
    class_name: "",
    keyword: "",
    include_deleted: false,
    page: 1,
  });
  const [createForm, setCreateForm] = useState({
    role: "student",
    full_name: "",
    full_name_kana: "",
    email: "",
    gender: "unknown",
    school_person_id: "",
    date_of_birth: "",
    grade: "",
    class_name: "",
  });
  const [localForm, setLocalForm] = useState({
    role: "teacher",
    full_name: "",
    full_name_kana: "",
    date_of_birth: "",
    gender: "unknown",
    email: "",
    school_person_id: "",
    login_id: "",
    password: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<BulkResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [deleteResult, setDeleteResult] = useState<BulkResult | null>(null);
  const [deleteFile, setDeleteFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await fetchMe();
        if (user.role !== "admin") {
          router.replace("/me");
          return;
        }
        setMe(user);
        await loadList(1, user);
      } catch (err) {
        console.error(err);
        setError("管理者権限がないか、セッションが無効です。");
        clearAccessToken();
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadList = async (page: number, user?: MeUser) => {
    const token = await ensureAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    if (filters.role) params.set("role", filters.role);
    if (filters.grade) params.set("grade", filters.grade);
    if (filters.class_name) params.set("class_name", filters.class_name);
    if (filters.keyword) params.set("keyword", filters.keyword);
    if (filters.include_deleted) params.set("include_deleted", "true");
    try {
      const data = await apiFetch<UserListResponse>(
        `/admin/users?${params.toString()}`,
        {},
        token
      );
      setList(data);
      setFilters((prev) => ({ ...prev, page }));
    } catch (err) {
      console.error(err);
      setError("ユーザー一覧の取得に失敗しました。");
    }
  };

  const handleFilterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadList(1);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setBusy(true);
    const token = await ensureAccessToken();
    if (!token) {
      router.replace("/login");
      setBusy(false);
      return;
    }
    const payload = {
      ...createForm,
      grade:
        createForm.role === "student" && createForm.grade
          ? Number(createForm.grade)
          : null,
      class_name: createForm.role === "student" ? createForm.class_name || null : null,
      school_person_id: createForm.school_person_id || null,
      date_of_birth: createForm.date_of_birth || null,
      full_name_kana: createForm.full_name_kana || null,
    };
    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify(payload),
      }, token);
      setMessage("登録しました。");
      await loadList(1);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "登録に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const handleCreateLocal = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (localForm.password.length < 4) {
      setError("パスワードは4文字以上で入力してください");
      return;
    }
    setBusy(true);
    const token = await ensureAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const payload = {
      ...localForm,
      school_person_id: localForm.school_person_id || null,
      date_of_birth: localForm.date_of_birth || null,
      full_name_kana: localForm.full_name_kana || null,
    };
    try {
      await apiFetch(
        "/admin/users/local",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        token
      );
      setMessage("登録しました");
      setLocalForm({
        role: "teacher",
        full_name: "",
        full_name_kana: "",
        date_of_birth: "",
        gender: "unknown",
        email: "",
        school_person_id: "",
        login_id: "",
        password: "",
      });
      await loadList(1);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "登録に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm("このユーザーを論理削除します。よろしいですか？")) return;
    setError(null);
    setBusy(true);
    const token = await ensureAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    try {
      await apiFetch(`/admin/users/${userId}`, { method: "DELETE" }, token);
      setMessage("削除しました。");
      await loadList(filters.page);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "削除に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const handleImportPreview = async (file: File | null) => {
    if (!file) return;
    setImportFile(file);
    await handleBulkAction(file, true, "/admin/users/bulk_import", setImportResult);
  };

  const handleImportExecute = async () => {
    if (!importFile || !importResult || importResult.errors > 0) return;
    await handleBulkAction(importFile, false, "/admin/users/bulk_import", setImportResult);
    await loadList(filters.page);
  };

  const handleDeletePreview = async (file: File | null) => {
    if (!file) return;
    setDeleteFile(file);
    await handleBulkAction(file, true, "/admin/users/bulk_delete", setDeleteResult);
  };

  const handleDeleteExecute = async () => {
    if (!deleteFile || !deleteResult || deleteResult.errors > 0) return;
    await handleBulkAction(deleteFile, false, "/admin/users/bulk_delete", setDeleteResult);
    await loadList(filters.page);
  };

  const handleBulkAction = async (
    file: File,
    dryRun: boolean,
    path: string,
    setter: (result: BulkResult) => void
  ) => {
    setBusy(true);
    setError(null);
    const token = await ensureAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await apiFetch<BulkResult>(
        `${path}?dry_run=${dryRun ? "true" : "false"}`,
        { method: "POST", body: form },
        token
      );
      setter(res);
      if (!dryRun && res.errors === 0) {
        setMessage("完了しました。");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "処理に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const canImport = useMemo(
    () => importResult && importResult.errors === 0,
    [importResult]
  );
  const canBulkDelete = useMemo(
    () => deleteResult && deleteResult.errors === 0,
    [deleteResult]
  );

  const handleExport = async (type: "full" | "template") => {
    const token = await ensureAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    const params = new URLSearchParams();
    params.set("type", type);
    if (type === "full") {
      if (filters.role) params.set("role", filters.role);
      if (filters.grade) params.set("grade", filters.grade);
      if (filters.class_name) params.set("class_name", filters.class_name);
      if (filters.keyword) params.set("keyword", filters.keyword);
      if (filters.include_deleted) params.set("include_deleted", "true");
    }
    try {
      const blob = await apiFetchBlob(
        `/admin/users/export?${params.toString()}`,
        { method: "GET" },
        token
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = type === "template" ? "users_template.csv" : "users.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "CSV出力に失敗しました。");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <p className="text-sm text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">ユーザー管理</h1>
            <p className="mt-1 text-sm text-slate-600">
              一覧・登録・削除、CSV一括操作を行います。
            </p>
          </div>
        </div>

        {message && <p className="mt-4 text-sm text-green-700">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">検索・フィルタ</h2>
          <form className="mt-4 grid gap-4 sm:grid-cols-3" onSubmit={handleFilterSubmit}>
            <div>
              <label className="text-sm text-slate-700">ロール</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={filters.role}
                onChange={(e) => setFilters((p) => ({ ...p, role: e.target.value }))}
              >
                <option value="">All</option>
                <option value="student">student</option>
                <option value="teacher">teacher</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-700">学年</label>
              <input
                type="number"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={filters.grade}
                onChange={(e) => setFilters((p) => ({ ...p, grade: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-slate-700">クラス</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={filters.class_name}
                onChange={(e) => setFilters((p) => ({ ...p, class_name: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-slate-700">キーワード</label>
              <input
                type="text"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="学内ID / 氏名 / メール"
                value={filters.keyword}
                onChange={(e) => setFilters((p) => ({ ...p, keyword: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="include_deleted"
                type="checkbox"
                className="h-4 w-4"
                checked={filters.include_deleted}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, include_deleted: e.target.checked }))
                }
              />
              <label htmlFor="include_deleted" className="text-sm text-slate-700">
                削除済みを含める
              </label>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                検索
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8 rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">一覧</h2>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                onClick={() => handleExport("full")}
              >
                一覧をCSV出力
              </button>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                onClick={() => handleExport("template")}
              >
                カラムのみCSV
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-3 py-2 text-left font-medium text-slate-600">ID</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    学校内ID
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">氏名</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">ロール</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">学年</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">クラス</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    メール
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    ステータス
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600">
                    最終更新
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-slate-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list?.items.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 py-2">{u.id}</td>
                    <td className="px-3 py-2">{u.school_person_id ?? "—"}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{u.full_name}</div>
                      <div className="text-xs text-slate-500">{u.full_name_kana}</div>
                    </td>
                    <td className="px-3 py-2">{roleLabel[u.role]}</td>
                    <td className="px-3 py-2">{u.grade ?? "—"}</td>
                    <td className="px-3 py-2">{u.class_name ?? "—"}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`mr-2 rounded-full px-2 py-1 text-xs ${u.is_active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-700"
                          }`}
                      >
                        {u.is_active ? "有効" : "無効"}
                      </span>
                      {u.is_deleted && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                          削除
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {u.updated_at ? new Date(u.updated_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id)}
                        className="rounded-md border border-red-200 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                        disabled={u.is_deleted || busy}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {list && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <div>
                {list.total} 件中 {(filters.page - 1) * pageSize + 1}-
                {Math.min(filters.page * pageSize, list.total)} を表示
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => loadList(filters.page - 1)}
                  disabled={filters.page <= 1}
                  className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
                >
                  前へ
                </button>
                <button
                  type="button"
                  onClick={() => loadList(filters.page + 1)}
                  disabled={list.total <= filters.page * pageSize}
                  className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-50"
                >
                  次へ
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">新規ユーザー登録（Google認証）</h3>
            <form className="mt-4 space-y-3" onSubmit={handleCreate}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-700">ロール *</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={createForm.role}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, role: e.target.value }))
                    }
                    required
                  >
                    <option value="student">student</option>
                    <option value="teacher">teacher</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-700">性別</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={createForm.gender}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, gender: e.target.value }))
                    }
                  >
                    <option value="unknown">unknown</option>
                    <option value="male">male</option>
                    <option value="female">female</option>
                    <option value="other">other</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-700">氏名（漢字） *</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                    value={createForm.full_name}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, full_name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-700">氏名（カナ）</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={createForm.full_name_kana}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, full_name_kana: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-700">メールアドレス *</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-700">学内ID（6桁）</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={createForm.school_person_id}
                    onChange={(e) =>
                      setCreateForm((p) => ({
                        ...p,
                        school_person_id: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-700">生年月日</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={createForm.date_of_birth}
                    onChange={(e) =>
                      setCreateForm((p) => ({ ...p, date_of_birth: e.target.value }))
                    }
                  />
                </div>
                {createForm.role === "student" && (
                  <>
                    <div>
                      <label className="text-sm text-slate-700">学年 *</label>
                      <input
                        type="number"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        required
                        value={createForm.grade}
                        onChange={(e) =>
                          setCreateForm((p) => ({ ...p, grade: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-700">クラス</label>
                      <input
                        type="text"
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={createForm.class_name}
                        onChange={(e) =>
                          setCreateForm((p) => ({ ...p, class_name: e.target.value }))
                        }
                      />
                    </div>
                  </>
                )}
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                登録
              </button>
            </form>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">新規ユーザー登録（パスワード認証）</h3>
            <form className="mt-4 space-y-3" onSubmit={handleCreateLocal}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-700">ロール</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={localForm.role}
                    onChange={(e) =>
                      setLocalForm((p) => ({ ...p, role: e.target.value }))
                    }
                    required
                  >
                    <option value="teacher">teacher</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-700">性別 *</label>
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={localForm.gender}
                    onChange={(e) =>
                      setLocalForm((p) => ({ ...p, gender: e.target.value }))
                    }
                    required
                  >
                    <option value="unknown">unknown</option>
                    <option value="male">male</option>
                    <option value="female">female</option>
                    <option value="other">other</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-700">氏名（漢字） *</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                    value={localForm.full_name}
                    onChange={(e) =>
                      setLocalForm((p) => ({ ...p, full_name: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-700">氏名（カナ） *</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                    value={localForm.full_name_kana}
                    onChange={(e) =>
                      setLocalForm((p) => ({ ...p, full_name_kana: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-700">生年月日 *</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                    value={localForm.date_of_birth}
                    onChange={(e) =>
                      setLocalForm((p) => ({ ...p, date_of_birth: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-700">メールアドレス *</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                    value={localForm.email}
                    onChange={(e) =>
                      setLocalForm((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-slate-700">ログインID *</label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                    value={localForm.login_id}
                    onChange={(e) =>
                      setLocalForm((p) => ({ ...p, login_id: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-700">パスワード（4桁以上） *</label>
                  <input
                    type="password"
                    minLength={4}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    required
                    value={localForm.password}
                    onChange={(e) =>
                      setLocalForm((p) => ({ ...p, password: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-700">学内ID（6桁）</label>
                <input
                  type="text"
                  maxLength={6}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={localForm.school_person_id}
                  onChange={(e) =>
                    setLocalForm((p) => ({ ...p, school_person_id: e.target.value }))
                  }
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                登録
              </button>
            </form>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">一括登録（CSV）</h3>
            <input
              type="file"
              accept=".csv"
              className="mt-3 text-sm"
              onChange={(e) => handleImportPreview(e.target.files?.[0] ?? null)}
            />
            {importResult && (
              <div className="mt-3 text-sm">
                <p>
                  プレビュー: 成功 {importResult.success} / 失敗 {importResult.errors} / 合計{" "}
                  {importResult.total}
                </p>
                <div className="mt-2 max-h-40 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 text-xs">
                  {importResult.rows.map((r) => (
                    <div key={r.line_number} className={r.status === "error" ? "text-red-600" : ""}>
                      行 {r.line_number}: {r.status}
                      {r.message ? ` - ${r.message}` : ""}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleImportExecute}
                  disabled={!canImport || busy}
                  className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  登録実行
                </button>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">一括削除（CSV）</h3>
            <input
              type="file"
              accept=".csv"
              className="mt-3 text-sm"
              onChange={(e) => handleDeletePreview(e.target.files?.[0] ?? null)}
            />
            {deleteResult && (
              <div className="mt-3 text-sm">
                <p>
                  プレビュー: 成功 {deleteResult.success} / 失敗 {deleteResult.errors} / 合計{" "}
                  {deleteResult.total}
                </p>
                <div className="mt-2 max-h-40 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 text-xs">
                  {deleteResult.rows.map((r) => (
                    <div key={r.line_number} className={r.status === "error" ? "text-red-600" : ""}>
                      行 {r.line_number}: {r.status}
                      {r.message ? ` - ${r.message}` : ""}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleDeleteExecute}
                  disabled={!canBulkDelete || busy}
                  className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  削除実行
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

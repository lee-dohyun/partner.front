"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Field, Input } from "@posselect/ui";

/** 로그인 후 돌아갈 곳. 같은 사이트의 /partner/** 만 허용한다(오픈 리다이렉트 방지). */
function safeNext(raw: string | null): string {
  return raw && /^\/partner(\/|$)/.test(raw) && !raw.startsWith("//") ? raw : "/partner/products";
}

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.status === 403) {
        setError("판매자 정보가 연결되지 않은 계정입니다. 담당자에게 문의해 주세요.");
        return;
      }
      if (!res.ok) {
        setError("아이디 또는 비밀번호가 올바르지 않습니다.");
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("일시적인 오류입니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field label="아이디">
        <Input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
      </Field>
      <Field label="비밀번호">
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {error && (
        <p className="text-sm" role="alert" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
      <Button type="submit" variant="primary" block disabled={loading}>
        {loading ? "로그인 중..." : "로그인"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="max-w-sm mx-auto p-8 mt-20">
      <h1 className="text-2xl font-bold mb-2 text-center">파트너센터 로그인</h1>
      <p className="text-sm text-center mb-6" style={{ color: "var(--color-neutral-600)" }}>
        계정은 입점 승인 후 발급됩니다.
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}

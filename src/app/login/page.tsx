"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const mode = "login" as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Authentication failed");
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-mid), var(--bg-gradient-end))",
      }}
    >
      <div className="flex w-full max-w-[420px] flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1
            className="text-[24px] font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Hyprnova
          </h1>
          <p
            className="text-[14px]"
            style={{ color: "var(--text-tertiary)" }}
          >
            Your tasks keep moving, even when you don&apos;t.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full flex flex-col gap-4 rounded-2xl p-6"
          style={{
            background: "var(--surface-glass)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[13px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors"
              style={{
                background: "var(--chatbox-bg)",
                border: "1px solid var(--chatbox-border)",
                color: "var(--chatbox-text)",
              }}
              placeholder="you@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-[13px] font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors"
              style={{
                background: "var(--chatbox-bg)",
                border: "1px solid var(--chatbox-border)",
                color: "var(--chatbox-text)",
              }}
              placeholder="Min 8 characters"
            />
          </div>

          {error && (
            <p className="text-[13px]" style={{ color: "var(--error)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 rounded-xl py-2.5 text-[14px] font-semibold transition-all disabled:opacity-40"
            style={{
              background: "var(--accent-text)",
              color: "#FFFFFF",
            }}
          >
            {isLoading ? "Loading..." : "Sign In"}
          </button>

        </form>
      </div>
    </div>
  );
}

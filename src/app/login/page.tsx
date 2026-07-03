"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Only allow redirect-back to admin paths to prevent open redirects.
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/admin")) return raw;
  return "/admin";
}

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setLocked(false);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const next = safeNext(
          new URLSearchParams(window.location.search).get("next"),
        );
        router.push(next);
        return; // keep loading state until navigation completes
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setLocked(true);
        setError(
          data.error ?? "Too many attempts — locked for a bit, try again later",
        );
      } else {
        setError(data.error ?? "Wrong password");
      }
    } catch {
      setError("Something went wrong, try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="w-80">
          <CardHeader>
            <CardTitle>👩‍🍳 Kitchen door</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 grid w-9 place-items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {error && (
                <p
                  role="alert"
                  aria-live="polite"
                  className={
                    locked
                      ? "text-sm text-muted-foreground"
                      : "text-sm text-destructive"
                  }
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || locked}
              >
                Enter
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

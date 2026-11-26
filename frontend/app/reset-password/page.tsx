
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type AuthMode = "login" | "register" | "forgot";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          }
        );

        if (error) throw error;

        setMessage("Password reset instructions have been sent. Check your email.");
      } else if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          setMessage("Registration successful!");
          router.push("/");
        } else {
          setMessage("Account created. Check your email to confirm your registration.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setMessage("Login successful!");
        router.push("/");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  const title =
    mode === "login"
      ? "Welcome Back!"
      : mode === "register"
        ? "Create Your Account"
        : "Forgot Password?";

  const description =
    mode === "login"
      ? "Log in to continue managing your notes."
      : mode === "register"
        ? "Join NoteSpace and organize your ideas."
        : "Enter your email to receive a password reset link.";

  const theme =
    mode === "login"
      ? "from-blue-600 to-indigo-700"
      : mode === "register"
        ? "from-purple-600 to-fuchsia-700"
        : "from-orange-500 to-amber-600";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100 px-5 py-10">

      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* Colourful Header */}
        <div className={`bg-gradient-to-r ${theme} px-8 py-10 text-center text-white`}>

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl font-bold shadow-lg">
            N
          </div>

          <h1 className="text-3xl font-extrabold tracking-wide">
            NoteSpace
          </h1>

          <p className="mt-2 text-sm text-white/90">
            Your ideas. Your notes. Your space.
          </p>

        </div>

        <div className="p-8">

          <h2 className="mb-2 text-center text-2xl font-bold text-slate-800">
            {title}
          </h2>

          <p className="mb-7 text-center text-sm text-slate-500">
            {description}
          </p>

          {/* Authentication Options */}
          <div className="mb-7 grid grid-cols-3 gap-2">

            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
                setError("");
              }}
              className={`rounded-xl border-2 px-2 py-3 text-sm font-semibold transition ${
                mode === "login"
                  ? "border-blue-600 bg-blue-600 text-white shadow-md"
                  : "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("register");
                setMessage("");
                setError("");
              }}
              className={`rounded-xl border-2 px-2 py-3 text-sm font-semibold transition ${
                mode === "register"
                  ? "border-purple-600 bg-purple-600 text-white shadow-md"
                  : "border-purple-100 bg-purple-50 text-purple-700 hover:bg-purple-100"
              }`}
            >
              Register
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setMessage("");
                setError("");
              }}
              className={`rounded-xl border-2 px-2 py-3 text-sm font-semibold transition ${
                mode === "forgot"
                  ? "border-orange-500 bg-orange-500 text-white shadow-md"
                  : "border-orange-100 bg-orange-50 text-orange-700 hover:bg-orange-100"
              }`}
            >
              Forgot?
            </button>

          </div>

          {/* Messages */}
          {message && (
            <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-5">

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email Address
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Password
                </label>

                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl bg-gradient-to-r ${theme} py-3.5 font-bold text-white shadow-lg transition hover:scale-[1.01] hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Login to NoteSpace"
                  : mode === "register"
                    ? "Create My Account"
                    : "Send Reset Link"}
            </button>

          </form>

          {/* Footer */}
          <div className="mt-7 border-t border-slate-100 pt-5 text-center">

            {mode === "login" && (
              <p className="text-sm text-slate-600">
                New to NoteSpace?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setMessage("");
                    setError("");
                  }}
                  className="font-bold text-purple-600 hover:underline"
                >
                  Create an account
                </button>
              </p>
            )}

            {mode === "register" && (
              <p className="text-sm text-slate-600">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setMessage("");
                    setError("");
                  }}
                  className="font-bold text-blue-600 hover:underline"
                >
                  Login here
                </button>
              </p>
            )}

            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setMessage("");
                  setError("");
                }}
                className="font-bold text-blue-600 hover:underline"
              >
                ← Back to Login
              </button>
            )}

          </div>

        </div>

        <div className="bg-slate-50 px-5 py-4 text-center text-xs text-slate-400">
          © 2026 NoteSpace. All rights reserved.
        </div>

      </div>

    </main>
  );
}

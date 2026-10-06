import { useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Flame, Mail, Lock, ArrowRight, Loader2, Target, BookOpen, BarChart3 } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { ApiError, getGoogleOAuthUrl } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/app";

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.code === "INVALID_CREDENTIALS"
            ? "Invalid email or password."
            : err.message,
        );
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    setGoogleLoading(true);
    window.location.href = getGoogleOAuthUrl();
  }

  return (
    <div className="min-h-screen flex bg-ink-800">
      <div className="hidden lg:flex lg:w-[42%] flex-col relative overflow-hidden bg-gradient-to-br from-slate-900 via-ink-900 to-slate-900 border-r border-slate-700/50">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 25px 25px, white 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }} />
        <div className="relative z-10 flex flex-col justify-between p-10 h-full">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-ember-500 flex items-center justify-center transition-transform group-hover:scale-105">
              <Flame size={17} className="text-ink-900" strokeWidth={2.5} />
            </div>
            <span className="font-display text-[18px] text-paper">Jumpstart</span>
          </Link>

          <div className="space-y-8">
            <div>
              <h2 className="font-display text-[32px] text-paper leading-tight mb-3">
                Plan. Learn.<br />
                <span className="text-ember-400">Achieve.</span>
              </h2>
              <p className="text-[14px] text-mist-400 leading-relaxed max-w-sm">
                Your personal learning operating system — build roadmaps, track progress, and turn goals into habits.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Target, text: "Custom learning roadmaps" },
                { icon: BookOpen, text: "Rich notes & resource library" },
                { icon: BarChart3, text: "Progress analytics & streaks" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3 text-mist-300">
                  <div className="w-7 h-7 rounded-md bg-slate-800/80 flex items-center justify-center">
                    <item.icon size={14} className="text-ember-400" />
                  </div>
                  <span className="text-[13px]">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11.5px] font-mono text-mist-700">© {new Date().getFullYear()} Jumpstart</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-ember-500 flex items-center justify-center">
              <Flame size={17} className="text-ink-900" strokeWidth={2.5} />
            </div>
            <span className="font-display text-[18px] text-paper">Jumpstart</span>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-[26px] text-paper mb-1.5">Welcome back</h1>
            <p className="text-[13.5px] text-mist-400">Sign in to continue your learning journey.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-[12px] text-mist-400 mb-1.5 block font-medium">Email</label>
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3.5 py-2.5 focus-within:border-ember-500/50 focus-within:ring-1 focus-within:ring-ember-500/20 transition-all duration-200">
                <Mail size={15} className="text-mist-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 bg-transparent outline-none text-[13.5px] text-paper placeholder:text-mist-600"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] text-mist-400 font-medium">Password</label>
                <button type="button" className="text-[11.5px] text-mist-500 hover:text-ember-400 transition-colors">Forgot password?</button>
              </div>
              <div className="flex items-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800/50 px-3.5 py-2.5 focus-within:border-ember-500/50 focus-within:ring-1 focus-within:ring-ember-500/20 transition-all duration-200">
                <Lock size={15} className="text-mist-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex-1 bg-transparent outline-none text-[13.5px] text-paper placeholder:text-mist-600"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5">
                <p className="text-[12px] text-rose-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-ember-500 text-ink-900 font-semibold py-2.5 text-[13.5px] hover:bg-ember-400 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <>Sign in <ArrowRight size={15} /></>}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700/60" />
            </div>
            <div className="relative flex justify-center text-[11.5px]">
              <span className="bg-ink-800 px-3 text-mist-500">or continue with</span>
            </div>
          </div>

          <button
            type="button"
            disabled={googleLoading}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-slate-700 bg-slate-800/30 text-mist-200 py-2.5 text-[13.5px] hover:bg-slate-700/50 hover:border-slate-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            Continue with Google
          </button>

          <p className="text-[12.5px] text-mist-500 mt-6 text-center">
            New to Jumpstart?{" "}
            <Link to="/register" className="text-ember-400 hover:text-ember-200 font-medium transition-colors">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

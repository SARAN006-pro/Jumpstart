import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Flame } from "lucide-react";
import { setTokens, authMe } from "../lib/api";
import { useAuthStore } from "../store/auth";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuthStore();
  const [error, setError] = useState("");

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (!accessToken || !refreshToken) {
      setError("Invalid authentication response from Google.");
      return;
    }

    setTokens(accessToken, refreshToken);

    authMe()
      .then((user) => {
        setUser(user);
        navigate("/app", { replace: true });
      })
      .catch(() => {
        setError("Failed to verify authentication. Please try again.");
      });
  }, [searchParams, navigate, setUser]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ink-800 p-6">
        <div className="w-8 h-8 rounded-lg bg-ember-500 flex items-center justify-center mb-4">
          <Flame size={17} className="text-ink-900" strokeWidth={2.5} />
        </div>
        <p className="text-[13px] text-ember-400 mb-4">{error}</p>
        <button
          onClick={() => navigate("/login")}
          className="rounded-lg bg-ember-500 text-ink-900 font-medium px-4 py-2 text-[13px] hover:bg-ember-400 transition-colors"
        >
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-ink-800 gap-4">
      <div className="w-10 h-10 rounded-lg bg-ember-500 flex items-center justify-center">
        <Flame size={20} className="text-ink-900" strokeWidth={2.5} />
      </div>
      <Loader2 size={24} className="animate-spin text-ember-400" />
      <p className="text-[13px] text-mist-500">Completing sign in...</p>
    </div>
  );
}
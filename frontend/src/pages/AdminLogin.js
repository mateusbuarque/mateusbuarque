import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d) => d.msg || JSON.stringify(d)).join(" "));
      else setError("Credenciais invalidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" data-testid="admin-login-page">
      <div className="dot-pattern absolute inset-0" />
      <div className="brutalist-card p-8 md:p-12 w-full max-w-md relative">
        <h1 className="font-['Outfit'] text-3xl font-black uppercase tracking-tighter mb-2 text-zinc-950">
          Admin
        </h1>
        <p className="text-zinc-500 text-sm mb-8">Acesso restrito ao criador</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="brutalist-input"
              required
              data-testid="admin-email-input"
            />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="brutalist-input"
              required
              data-testid="admin-password-input"
            />
          </div>
          {error && (
            <div className="bg-red-50 border-2 border-red-500 p-3 text-red-700 text-sm font-bold" data-testid="login-error">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="brutalist-btn w-full"
            data-testid="admin-login-submit"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

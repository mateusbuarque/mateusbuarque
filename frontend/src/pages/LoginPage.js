import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authAPI } from "../lib/api";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUserDirect } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        if (!form.name || !form.phone) {
          setError("Preencha todos os campos");
          setLoading(false);
          return;
        }
        const res = await authAPI.register({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
        });
        setUserDirect(res.data);
      } else {
        const res = await authAPI.login(form.email, form.password);
        setUserDirect(res.data);
      }
      navigate("/");
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d) => d.msg || JSON.stringify(d)).join(" "));
      else setError(isRegister ? "Erro ao criar conta" : "Email ou senha incorretos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" data-testid="login-page">
      <div className="dot-pattern absolute inset-0" />
      <div className="brutalist-card p-8 md:p-12 w-full max-w-md relative">
        <h1 className="font-['Outfit'] text-3xl font-black uppercase tracking-tighter mb-2 text-zinc-950">
          {isRegister ? "Criar Conta" : "Entrar"}
        </h1>
        <p className="text-zinc-500 text-sm mb-8">
          {isRegister ? "Crie sua conta para apoiar projetos e comprar produtos" : "Acesse sua conta para apoiar projetos e comprar"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Nome</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="brutalist-input"
                  required
                  data-testid="register-name-input"
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Celular</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="brutalist-input"
                  required
                  data-testid="register-phone-input"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </>
          )}
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="brutalist-input"
              required
              data-testid="login-email-input"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="brutalist-input"
              required
              data-testid="login-password-input"
              placeholder="Minimo 6 caracteres"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-500 p-3 text-red-700 text-sm font-bold" data-testid="auth-error">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="brutalist-btn w-full" data-testid="auth-submit-btn">
            {loading ? "Aguarde..." : isRegister ? "Criar Conta" : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsRegister(!isRegister); setError(""); }}
            className="text-sm text-zinc-500 hover:text-zinc-950 font-bold uppercase tracking-wider"
            data-testid="toggle-auth-mode"
          >
            {isRegister ? "Ja tem conta? Entrar" : "Nao tem conta? Cadastre-se"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-zinc-400">
            Suporte: <a href="mailto:mateusbuarquepugli@gmail.com" className="underline hover:text-zinc-700">mateusbuarquepugli@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}

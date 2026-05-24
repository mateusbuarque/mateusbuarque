import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const getErrorMessage = (err) => {
    const code = err?.code || "";

    if (code.includes("auth/email-already-in-use")) return "Este e-mail já está cadastrado.";
    if (code.includes("auth/invalid-email")) return "E-mail inválido.";
    if (code.includes("auth/weak-password")) return "A senha precisa ter pelo menos 6 caracteres.";
    if (code.includes("auth/user-not-found")) return "Usuário não encontrado.";
    if (code.includes("auth/wrong-password")) return "Senha incorreta.";
    if (code.includes("auth/invalid-credential")) return "E-mail ou senha incorretos.";

    return isRegister ? "Erro ao criar conta." : "Erro ao entrar.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!form.name || !form.phone) {
          setError("Preencha todos os campos.");
          setLoading(false);
          return;
        }

        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
        });
      } else {
        await login(form.email, form.password);
      }

      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
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
          {isRegister
            ? "Crie sua conta para acessar o site"
            : "Acesse sua conta"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="brutalist-input"
                  required
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">
                  Celular
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="brutalist-input"
                  required
                  placeholder="(11) 99999-9999"
                />
              </div>
            </>
          )}

          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="brutalist-input"
              required
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">
              Senha
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="brutalist-input"
              required
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-500 p-3 text-red-700 text-sm font-bold">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="brutalist-btn w-full">
            {loading ? "Aguarde..." : isRegister ? "Criar Conta" : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="text-sm text-zinc-500 hover:text-zinc-950 font-bold uppercase tracking-wider"
          >
            {isRegister ? "Já tem conta? Entrar" : "Não tem conta? Cadastre-se"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-zinc-400 underline">
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

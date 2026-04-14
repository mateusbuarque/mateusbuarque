import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { checkoutAPI } from "../lib/api";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState("checking");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }
    pollStatus();
  }, [sessionId]);

  const pollStatus = async () => {
    if (attempts >= 5) {
      setStatus("timeout");
      return;
    }
    try {
      const res = await checkoutAPI.status(sessionId);
      if (res.data.payment_status === "paid") {
        setStatus("success");
      } else if (res.data.status === "expired") {
        setStatus("expired");
      } else {
        setTimeout(() => {
          setAttempts((a) => a + 1);
          pollStatus();
        }, 2000);
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4" data-testid="payment-success-page">
      <div className="brutalist-card p-8 md:p-12 text-center max-w-lg w-full">
        {status === "checking" && (
          <>
            <Loader2 size={48} className="mx-auto mb-4 animate-spin text-zinc-400" />
            <h1 className="font-['Outfit'] text-2xl font-black uppercase mb-2">Verificando pagamento...</h1>
            <p className="text-zinc-500">Aguarde enquanto confirmamos seu apoio.</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-100 border-2 border-green-600 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h1 className="font-['Outfit'] text-2xl font-black uppercase mb-2 text-green-700">Pagamento confirmado!</h1>
            <p className="text-zinc-600 mb-6">Obrigado por apoiar a comedia! Seu produto sera entregue conforme a recompensa escolhida.</p>
            <Link to="/" className="brutalist-btn inline-block" data-testid="back-home-btn">Voltar ao Inicio</Link>
          </>
        )}
        {(status === "error" || status === "expired" || status === "timeout") && (
          <>
            <div className="w-16 h-16 bg-red-100 border-2 border-red-600 mx-auto mb-4 flex items-center justify-center">
              <XCircle size={32} className="text-red-600" />
            </div>
            <h1 className="font-['Outfit'] text-2xl font-black uppercase mb-2 text-red-700">
              {status === "timeout" ? "Tempo esgotado" : "Erro no pagamento"}
            </h1>
            <p className="text-zinc-600 mb-6">
              {status === "timeout"
                ? "Nao conseguimos confirmar o pagamento. Verifique seu email."
                : "Ocorreu um erro. Tente novamente."
              }
            </p>
            <Link to="/" className="brutalist-btn inline-block">Voltar ao Inicio</Link>
          </>
        )}
      </div>
    </div>
  );
}

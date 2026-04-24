import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { subscriptionAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useSiteSettings } from "../contexts/SiteSettingsContext";
import { Crown, Check, QrCode, Copy, Mail } from "lucide-react";

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [mySub, setMySub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pixModal, setPixModal] = useState(null);
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    Promise.all([
      subscriptionAPI.plans(),
      user ? subscriptionAPI.mySubscription() : Promise.resolve({ data: { is_subscribed: false } }),
    ]).then(([plansRes, subRes]) => {
      setPlans(plansRes.data.filter(p => p.is_active));
      setMySub(subRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const handleSubscribePix = async (plan) => {
    if (!user) { navigate("/login"); return; }
    setProcessing(plan.id);
    try {
      const res = await subscriptionAPI.subscribePix(plan.id);
      setPixModal({ ...res.data, plan_name: plan.name });
    } catch (err) { alert(err.response?.data?.detail || "Erro"); }
    finally { setProcessing(null); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse font-bold uppercase text-xl">Carregando...</div></div>;

  return (
    <div className="py-16 md:py-24" data-testid="subscription-page">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-[var(--site-primary,#FFDE00)] border-2 border-zinc-950 mx-auto flex items-center justify-center mb-4">
            <Crown size={28} className="text-zinc-950" />
          </div>
          <h1 className="font-['Outfit'] text-3xl md:text-5xl font-black uppercase tracking-tighter" style={{ color: settings.heading_color }}>
            Seja Assinante
          </h1>
          <p className="text-zinc-600 mt-3 max-w-lg mx-auto">Acesse lives exclusivas, videos e gravacoes disponveis apenas para assinantes.</p>
        </div>

        {mySub?.is_subscribed && (
          <div className="brutalist-card p-6 mb-8 bg-green-50 border-green-500">
            <div className="flex items-center gap-3">
              <Check size={24} className="text-green-600" />
              <div>
                <p className="font-bold text-green-800">Voce e assinante!</p>
                <p className="text-sm text-green-600">Plano: {mySub.subscription?.plan_name} - Ativo ate {new Date(mySub.subscription?.expires_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          </div>
        )}

        {plans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <div key={plan.id} className="brutalist-card p-6 flex flex-col" data-testid={`plan-card-${i}`}>
                <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-2">{plan.name}</h3>
                <p className="text-sm text-zinc-600 mb-4 flex-1">{plan.description}</p>
                <div className="mb-4">
                  <span className="font-['Outfit'] font-black text-3xl">R$ {parseFloat(plan.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  <span className="text-zinc-500 text-sm">/{plan.duration_days} dias</span>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm"><Check size={14} className="text-green-600" /> Lives exclusivas</li>
                  <li className="flex items-center gap-2 text-sm"><Check size={14} className="text-green-600" /> Videos para assinantes</li>
                  <li className="flex items-center gap-2 text-sm"><Check size={14} className="text-green-600" /> Gravacoes de lives</li>
                </ul>
                {mySub?.is_subscribed ? (
                  <div className="text-center text-sm font-bold text-green-600 py-3">Ja assinante</div>
                ) : (
                  <button onClick={() => handleSubscribePix(plan)} disabled={!!processing} className="brutalist-btn w-full text-sm flex items-center justify-center gap-2" data-testid={`plan-pix-btn-${i}`}>
                    <QrCode size={16} /> {processing === plan.id ? "Processando..." : "Assinar via Pix"}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="brutalist-card p-12 text-center">
            <p className="text-zinc-500 font-bold uppercase">Nenhum plano disponivel no momento</p>
          </div>
        )}
      </div>

      {pixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="pix-modal">
          <div className="brutalist-card bg-white w-full max-w-md p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-['Outfit'] font-black text-xl uppercase">Assinar via Pix</h2>
              <button onClick={() => setPixModal(null)} className="p-2 hover:bg-zinc-100" data-testid="pix-modal-close"><span className="text-xl">&times;</span></button>
            </div>
            <div className="text-center mb-4">
              <p className="font-['Outfit'] font-black text-3xl">R$ {(pixModal.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-zinc-500">{pixModal.plan_name}</p>
            </div>
            <div className="bg-zinc-50 border-2 border-zinc-950 p-4 mb-4">
              <p className="text-xs font-bold uppercase text-zinc-500 mb-2">Chave Pix</p>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg flex-1 break-all">{pixModal.pix_key}</span>
                <button onClick={() => { navigator.clipboard.writeText(pixModal.pix_key); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2 border-2 border-zinc-950 hover:bg-zinc-100" data-testid="copy-pix-key-btn">
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            {copied && <p className="text-green-600 text-sm font-bold text-center mb-4">Copiado!</p>}
            <div className="bg-[#FFDE00] border-2 border-zinc-950 p-4 mb-4">
              <ol className="space-y-2 text-sm font-bold text-zinc-950">
                <li>1. Abra o app do seu banco</li>
                <li>2. Escolha pagar com Pix</li>
                <li>3. Cole a chave acima</li>
                <li>4. Envie o valor</li>
              </ol>
            </div>
            <div className="bg-red-50 border-2 border-red-400 p-4 mb-4">
              <div className="flex items-start gap-3">
                <Mail size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800 mb-1">Envie o comprovante por e-mail:</p>
                  <p className="text-sm text-red-700 font-bold break-all" data-testid="comprovante-email">{pixModal.comprovante_email || "mateuabuarquepugli@gmail.com"}</p>
                  <p className="text-xs text-red-600 mt-2">Sua assinatura sera ativada manualmente apos analise do comprovante.</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 text-center mb-4 font-bold">
              Status: Aguardando confirmacao de pagamento
            </p>
            <button onClick={() => { setPixModal(null); navigate("/meus-pedidos"); }} className="brutalist-btn w-full text-sm" data-testid="pix-done-btn">Ja fiz o Pix e enviei o comprovante</button>
          </div>
        </div>
      )}
    </div>
  );
}

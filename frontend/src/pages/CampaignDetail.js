import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { campaignAPI, checkoutAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Calendar, Users, Target, ArrowLeft, Truck, CreditCard, QrCode, Copy, Check } from "lucide-react";

export default function CampaignDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [donationAmounts, setDonationAmounts] = useState({});
  const [pixModal, setPixModal] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    campaignAPI.getOne(id)
      .then((res) => {
        setCampaign(res.data);
        const amounts = {};
        (res.data.tiers || []).forEach(t => {
          amounts[t.id] = t.price;
        });
        setDonationAmounts(amounts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleCardPayment = async (tier) => {
    if (!user) { navigate("/login"); return; }
    setCheckoutLoading(tier.id + "_card");
    try {
      const res = await checkoutAPI.campaign({
        campaign_id: campaign.id,
        tier_id: tier.id,
        custom_amount: donationAmounts[tier.id],
        payment_method: "card",
      });
      if (res.data.url) window.location.href = res.data.url;
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao processar pagamento");
    } finally { setCheckoutLoading(null); }
  };

  const handlePixPayment = async (tier) => {
    if (!user) { navigate("/login"); return; }
    setCheckoutLoading(tier.id + "_pix");
    try {
      const res = await checkoutAPI.pix({
        type: "campaign",
        campaign_id: campaign.id,
        tier_id: tier.id,
        custom_amount: donationAmounts[tier.id],
      });
      setPixModal(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || "Erro ao gerar Pix");
    } finally { setCheckoutLoading(null); }
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixModal?.pix_key || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="font-['Outfit'] font-black text-2xl uppercase animate-pulse">Carregando...</div></div>;
  }

  if (!campaign) {
    return <div className="min-h-screen flex items-center justify-center"><div className="brutalist-card p-8 text-center"><p className="font-['Outfit'] font-bold text-xl">Campanha nao encontrada</p><a href="/" className="brutalist-btn inline-block mt-4">Voltar</a></div></div>;
  }

  const progress = campaign.goal_amount > 0 ? Math.min((campaign.raised_amount / campaign.goal_amount) * 100, 100) : 0;
  const daysLeft = Math.max(0, Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="py-8 md:py-16" data-testid="campaign-detail-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <a href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-950 font-bold text-sm uppercase tracking-wider mb-8 transition-colors">
          <ArrowLeft size={16} /> Voltar
        </a>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8">
            <div className="brutalist-card overflow-hidden mb-8">
              <img src={campaign.cover_image} alt={campaign.title} className="w-full h-64 sm:h-96 object-cover" data-testid="campaign-cover-image" />
            </div>
            <h1 className="font-['Outfit'] text-3xl md:text-5xl font-black uppercase tracking-tighter mb-6 text-zinc-950" data-testid="campaign-title">{campaign.title}</h1>
            <div className="brutalist-card p-6 md:p-8">
              <h3 className="font-['Outfit'] font-bold text-xl mb-4 uppercase">Sobre esta campanha</h3>
              <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap" data-testid="campaign-description">{campaign.description}</p>
              <div className="mt-6 p-4 bg-zinc-50 border-2 border-zinc-950">
                <div className="flex items-center gap-2 text-zinc-700">
                  <Truck size={18} />
                  <span className="font-bold text-sm uppercase">Produto entregue ao comprador mesmo que fature R$0</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Stats */}
              <div className="brutalist-card p-6" data-testid="campaign-stats">
                <div className="brutalist-progress mb-3"><div className="brutalist-progress-fill" style={{ width: `${progress}%` }} /></div>
                <div className="flex justify-between mb-4">
                  <span className="font-['Outfit'] font-black text-2xl text-zinc-950">R$ {(campaign.raised_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  <span className="text-sm text-zinc-500 self-end">{progress.toFixed(0)}%</span>
                </div>
                <div className="text-sm text-zinc-500 mb-6">meta de R$ {(campaign.goal_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2"><Users size={16} className="text-zinc-500" /><div><div className="font-bold text-zinc-950">{campaign.backers_count || 0}</div><div className="text-xs text-zinc-500">apoiadores</div></div></div>
                  <div className="flex items-center gap-2"><Calendar size={16} className="text-zinc-500" /><div><div className="font-bold text-zinc-950">{daysLeft}</div><div className="text-xs text-zinc-500">dias restantes</div></div></div>
                </div>
                <div className="mt-4 p-3 bg-zinc-50 border-2 border-zinc-200">
                  <div className="flex items-center gap-2"><Target size={14} className="text-zinc-400" /><span className="text-xs text-zinc-500">Taxa da plataforma: 5%</span></div>
                </div>
              </div>

              {/* Login prompt */}
              {!user && (
                <div className="brutalist-card p-6 bg-[#FFDE00]">
                  <p className="font-bold text-sm text-zinc-950 uppercase mb-3">Faca login para apoiar esta campanha</p>
                  <Link to="/login" className="brutalist-btn-dark inline-block text-sm" data-testid="campaign-login-btn">Entrar / Cadastrar</Link>
                </div>
              )}

              {/* Tiers */}
              <h4 className="font-['Outfit'] font-bold text-sm uppercase tracking-wider">Recompensas / Doacao</h4>
              {campaign.tiers && campaign.tiers.length > 0 ? (
                campaign.tiers.map((tier, i) => {
                  const minDonation = tier.min_donation || tier.price;
                  const currentAmount = donationAmounts[tier.id] || tier.price;
                  return (
                    <div key={tier.id} className="brutalist-card p-6" data-testid={`tier-card-${i}`}>
                      <h5 className="font-bold text-zinc-950 mb-2">{tier.title}</h5>
                      <p className="text-sm text-zinc-600 mb-3">{tier.description}</p>
                      {tier.items && tier.items.length > 0 && (
                        <ul className="mb-3 space-y-1">
                          {tier.items.map((item, j) => (
                            <li key={j} className="text-sm text-zinc-600 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-[#FFDE00] border border-zinc-950 inline-block" />{item}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="text-xs text-zinc-400 mb-3">Entrega: {tier.delivery_date}</p>

                      {/* Donation amount */}
                      <div className="mb-4">
                        <label className="font-bold text-xs uppercase tracking-wider text-zinc-500 block mb-1">
                          Valor da doacao (min R$ {minDonation.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min={minDonation}
                          value={currentAmount}
                          onChange={(e) => setDonationAmounts({ ...donationAmounts, [tier.id]: parseFloat(e.target.value) || minDonation })}
                          className="brutalist-input text-sm"
                          data-testid={`tier-amount-input-${i}`}
                        />
                        {currentAmount > tier.price && (
                          <p className="text-xs text-green-600 font-bold mt-1">
                            + R$ {(currentAmount - tier.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} extra
                          </p>
                        )}
                      </div>

                      {/* Payment buttons */}
                      <div className="space-y-2">
                        <button
                          onClick={() => handleCardPayment(tier)}
                          disabled={!!checkoutLoading}
                          className="brutalist-btn w-full text-sm flex items-center justify-center gap-2"
                          data-testid={`tier-card-btn-${i}`}
                        >
                          <CreditCard size={16} />
                          {checkoutLoading === tier.id + "_card" ? "Processando..." : "Pagar com Cartao"}
                        </button>
                        <button
                          onClick={() => handlePixPayment(tier)}
                          disabled={!!checkoutLoading}
                          className="brutalist-btn-dark w-full text-sm flex items-center justify-center gap-2"
                          data-testid={`tier-pix-btn-${i}`}
                        >
                          <QrCode size={16} />
                          {checkoutLoading === tier.id + "_pix" ? "Gerando..." : "Pagar com Pix"}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="brutalist-card p-6 text-center">
                  <p className="text-zinc-500 text-sm">Nenhuma recompensa disponivel</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pix Modal */}
      {pixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="pix-modal">
          <div className="brutalist-card bg-white w-full max-w-md p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-['Outfit'] font-black text-xl uppercase">Pagar com Pix</h2>
              <button onClick={() => setPixModal(null)} className="p-2 hover:bg-zinc-100"><span className="text-xl">&times;</span></button>
            </div>

            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-[#FFDE00] border-2 border-zinc-950 mx-auto flex items-center justify-center mb-4">
                <QrCode size={40} className="text-zinc-950" />
              </div>
              <p className="font-['Outfit'] font-black text-3xl text-zinc-950">
                R$ {(pixModal.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-zinc-500 mt-1">{pixModal.item_title}</p>
            </div>

            <div className="bg-zinc-50 border-2 border-zinc-950 p-4 mb-4">
              <p className="text-xs font-bold uppercase text-zinc-500 mb-2">Chave Pix ({pixModal.pix_key_type})</p>
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-950 text-lg flex-1 break-all" data-testid="pix-key-display">{pixModal.pix_key}</span>
                <button
                  onClick={copyPixKey}
                  className="p-2 border-2 border-zinc-950 hover:bg-zinc-100 flex-shrink-0"
                  data-testid="copy-pix-key-btn"
                >
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            {copied && <p className="text-green-600 text-sm font-bold text-center mb-4">Chave copiada!</p>}

            <div className="bg-[#FFDE00] border-2 border-zinc-950 p-4 mb-4">
              <ol className="space-y-2 text-sm font-bold text-zinc-950">
                <li>1. Abra o app do seu banco</li>
                <li>2. Escolha pagar com Pix</li>
                <li>3. Cole a chave acima</li>
                <li>4. Envie R$ {(pixModal.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</li>
                <li>5. Pronto! O admin confirmara seu pagamento</li>
              </ol>
            </div>

            <p className="text-xs text-zinc-400 text-center">Apos o envio, o administrador confirmara o pagamento e seu apoio sera registrado.</p>

            <button onClick={() => { setPixModal(null); navigate("/meus-pedidos"); }} className="brutalist-btn w-full mt-4 text-sm" data-testid="pix-done-btn">
              Ja fiz o Pix
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

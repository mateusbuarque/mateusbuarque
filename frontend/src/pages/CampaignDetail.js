import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { campaignAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useSiteSettings } from "../contexts/SiteSettingsContext";
import { Calendar, Users, Target, ArrowLeft, Truck } from "lucide-react";
import PaymentButton from "../components/PaymentButton";

export default function CampaignDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { settings } = useSiteSettings();

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [donationAmounts, setDonationAmounts] = useState({});

  useEffect(() => {
    campaignAPI
      .getOne(id)
      .then((res) => {
        setCampaign(res.data);

        const amounts = {};
        (res.data.tiers || []).forEach((tier) => {
          amounts[tier.id] = tier.price;
        });

        setDonationAmounts(amounts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-['Outfit'] font-black text-2xl uppercase animate-pulse">
          Carregando...
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="brutalist-card p-8 text-center">
          <p className="font-['Outfit'] font-bold text-xl">Campanha não encontrada</p>
          <a href="/" className="brutalist-btn inline-block mt-4">
            Voltar
          </a>
        </div>
      </div>
    );
  }

  const progress =
    campaign.goal_amount > 0
      ? Math.min((campaign.raised_amount / campaign.goal_amount) * 100, 100)
      : 0;

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="py-8 md:py-16" data-testid="campaign-detail-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-950 font-bold text-sm uppercase tracking-wider mb-8 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </a>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-8">
            <div className="brutalist-card overflow-hidden mb-8">
              <img
                src={campaign.cover_image}
                alt={campaign.title}
                className="w-full h-64 sm:h-96 object-cover"
                data-testid="campaign-cover-image"
              />
            </div>

            <h1
              className="font-['Outfit'] text-3xl md:text-5xl font-black uppercase tracking-tighter mb-6 text-zinc-950"
              data-testid="campaign-title"
            >
              {campaign.title}
            </h1>

            <div className="brutalist-card p-6 md:p-8">
              <h3 className="font-['Outfit'] font-bold text-xl mb-4 uppercase">
                Sobre esta campanha
              </h3>

              <p
                className="text-zinc-700 leading-relaxed whitespace-pre-wrap"
                data-testid="campaign-description"
              >
                {campaign.description}
              </p>

              <div className="mt-6 p-4 bg-zinc-50 border-2 border-zinc-950">
                <div className="flex items-center gap-2 text-zinc-700">
                  <Truck size={18} />
                  <span className="font-bold text-sm uppercase">
                    Produto entregue ao comprador mesmo que fature R$0
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <div className="lg:sticky lg:top-24 space-y-6">
              <div className="brutalist-card p-6" data-testid="campaign-stats">
                <div className="brutalist-progress mb-3">
                  <div
                    className="brutalist-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex justify-between mb-4">
                  <span className="font-['Outfit'] font-black text-2xl text-zinc-950">
                    R$ {(campaign.raised_amount || 0).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>

                  <span className="text-sm text-zinc-500 self-end">
                    {progress.toFixed(0)}%
                  </span>
                </div>

                <div className="text-sm text-zinc-500 mb-6">
                  meta de R${" "}
                  {(campaign.goal_amount || 0).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-zinc-500" />
                    <div>
                      <div className="font-bold text-zinc-950">
                        {campaign.backers_count || 0}
                      </div>
                      <div className="text-xs text-zinc-500">apoiadores</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-zinc-500" />
                    <div>
                      <div className="font-bold text-zinc-950">{daysLeft}</div>
                      <div className="text-xs text-zinc-500">dias restantes</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-zinc-50 border-2 border-zinc-200">
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-zinc-400" />
                    <span className="text-xs text-zinc-500">
                      Taxa da plataforma: 5%
                    </span>
                  </div>
                </div>
              </div>

              {!user && (
                <div className="brutalist-card p-6 bg-[#FFDE00]">
                  <p className="font-bold text-sm text-zinc-950 uppercase mb-3">
                    Você pode pagar com Pix ou cartão pelo Mercado Pago
                  </p>

                  <Link
                    to="/login"
                    className="brutalist-btn-dark inline-block text-sm"
                    data-testid="campaign-login-btn"
                  >
                    Entrar / Cadastrar
                  </Link>
                </div>
              )}

              <h4 className="font-['Outfit'] font-bold text-sm uppercase tracking-wider">
                Recompensas / Doação
              </h4>

              {campaign.tiers && campaign.tiers.length > 0 ? (
                campaign.tiers.map((tier, i) => {
                  const minDonation = tier.min_donation || tier.price;
                  const currentAmount = donationAmounts[tier.id] || tier.price;

                  return (
                    <div
                      key={tier.id}
                      className="brutalist-card p-6"
                      data-testid={`tier-card-${i}`}
                    >
                      <h5 className="font-bold text-zinc-950 mb-2">
                        {tier.title}
                      </h5>

                      <p className="text-sm text-zinc-600 mb-3">
                        {tier.description}
                      </p>

                      {tier.items && tier.items.length > 0 && (
                        <ul className="mb-3 space-y-1">
                          {tier.items.map((item, j) => (
                            <li
                              key={j}
                              className="text-sm text-zinc-600 flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 bg-[#FFDE00] border border-zinc-950 inline-block" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      )}

                      <p className="text-xs text-zinc-400 mb-3">
                        Entrega: {tier.delivery_date}
                      </p>

                      <div className="mb-4">
                        <label className="font-bold text-xs uppercase tracking-wider text-zinc-500 block mb-1">
                          Valor da doação mínimo R${" "}
                          {minDonation.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </label>

                        <input
                          type="number"
                          step="0.01"
                          min={minDonation}
                          value={currentAmount}
                          onChange={(e) =>
                            setDonationAmounts({
                              ...donationAmounts,
                              [tier.id]: parseFloat(e.target.value) || minDonation,
                            })
                          }
                          className="brutalist-input text-sm"
                          data-testid={`tier-amount-input-${i}`}
                        />

                        {currentAmount > tier.price && (
                          <p className="text-xs text-green-600 font-bold mt-1">
                            + R${" "}
                            {(currentAmount - tier.price).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}{" "}
                            extra
                          </p>
                        )}
                      </div>

                      <PaymentButton
                        title={`${campaign.title} - ${tier.title}`}
                        price={Number(currentAmount)}
                      />
                    </div>
                  );
                })
              ) : (
                <div className="brutalist-card p-6 text-center">
                  <p className="text-zinc-500 text-sm">
                    Nenhuma recompensa disponível
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

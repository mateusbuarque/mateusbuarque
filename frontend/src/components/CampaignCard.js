import { Link } from "react-router-dom";

export default function CampaignCard({ campaign, index }) {
  const progress = campaign.goal_amount > 0
    ? Math.min((campaign.raised_amount / campaign.goal_amount) * 100, 100)
    : 0;

  const daysLeft = Math.max(0, Math.ceil(
    (new Date(campaign.end_date) - new Date()) / (1000 * 60 * 60 * 24)
  ));

  return (
    <Link
      to={`/campaign/${campaign.id}`}
      className="brutalist-card block overflow-hidden group"
      data-testid={`campaign-card-${index}`}
    >
      <div className="border-b-2 border-zinc-950 overflow-hidden">
        <img
          src={campaign.cover_image}
          alt={campaign.title}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="bg-zinc-950 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
            {campaign.is_active ? (daysLeft > 0 ? `${daysLeft} dias` : "Encerrada") : "Inativa"}
          </span>
          <span className="text-xs font-bold text-zinc-500 uppercase">
            {campaign.backers_count || 0} apoiadores
          </span>
        </div>

        <h3 className="font-['Outfit'] font-bold text-xl mb-4 text-zinc-950 leading-tight">
          {campaign.title}
        </h3>

        <div className="brutalist-progress mb-2">
          <div className="brutalist-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-950">
            R$ {(campaign.raised_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
          <span className="text-sm text-zinc-500">
            de R$ {(campaign.goal_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>

        <p className="text-xs text-zinc-400 mt-2 font-bold uppercase">
          Produto entregue mesmo se faturar R$0
        </p>
      </div>
    </Link>
  );
}

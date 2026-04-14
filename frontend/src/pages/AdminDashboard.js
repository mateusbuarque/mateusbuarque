import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { campaignAPI, adminAPI, galleryAPI, bioAPI, newsletterAPI } from "../lib/api";
import { Plus, Trash2, Edit2, BarChart3, Image, FileText, Mail, X } from "lucide-react";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("campaigns");
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [bio, setBio] = useState({ content: "", photo_url: "" });
  const [subscribers, setSubscribers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/admin/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && user.role === "admin") {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [campRes, statsRes, galRes, bioRes, subRes] = await Promise.all([
        campaignAPI.getAll(),
        adminAPI.stats(),
        galleryAPI.getAll(),
        bioAPI.get(),
        newsletterAPI.getSubscribers(),
      ]);
      setCampaigns(campRes.data);
      setStats(statsRes.data);
      setGallery(galRes.data);
      setBio(bioRes.data);
      setSubscribers(subRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta campanha?")) return;
    await campaignAPI.delete(id);
    loadData();
  };

  const handleDeleteGallery = async (id) => {
    await galleryAPI.delete(id);
    loadData();
  };

  const handleSaveBio = async () => {
    await bioAPI.update(bio);
    alert("Biografia atualizada!");
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse font-bold uppercase">Carregando...</div></div>;
  if (!user || user.role !== "admin") return null;

  const tabs = [
    { id: "campaigns", label: "Campanhas", icon: <BarChart3 size={16} /> },
    { id: "gallery", label: "Galeria", icon: <Image size={16} /> },
    { id: "bio", label: "Biografia", icon: <FileText size={16} /> },
    { id: "subscribers", label: "Newsletter", icon: <Mail size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-50" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <h1 className="font-['Outfit'] text-3xl font-black uppercase tracking-tighter text-zinc-950">
            Painel Admin
          </h1>
          {stats && (
            <div className="flex gap-4 mt-4 sm:mt-0">
              <div className="brutalist-card p-3 text-center">
                <div className="text-xs font-bold uppercase text-zinc-500">Arrecadado</div>
                <div className="font-['Outfit'] font-black text-lg">R$ {stats.total_raised.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="brutalist-card p-3 text-center">
                <div className="text-xs font-bold uppercase text-zinc-500">Taxa (5%)</div>
                <div className="font-['Outfit'] font-black text-lg text-[#FFDE00]" style={{ WebkitTextStroke: "1px #09090B" }}>
                  R$ {stats.platform_fee_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="brutalist-card p-3 text-center">
                <div className="text-xs font-bold uppercase text-zinc-500">Apoiadores</div>
                <div className="font-['Outfit'] font-black text-lg">{stats.total_backers}</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 font-bold text-sm uppercase tracking-wider border-2 border-zinc-950 transition-all whitespace-nowrap ${
                tab === t.id
                  ? "bg-zinc-950 text-[#FFDE00]"
                  : "bg-white text-zinc-950 hover:bg-zinc-100"
              }`}
              data-testid={`admin-tab-${t.id}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Campaigns Tab */}
        {tab === "campaigns" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-zinc-500 font-bold uppercase">
                {campaigns.filter(c => c.is_active).length} / {10} campanhas ativas
              </p>
              <button
                onClick={() => { setEditingCampaign(null); setShowCreateModal(true); }}
                className="brutalist-btn flex items-center gap-2 text-sm"
                data-testid="admin-create-campaign"
                disabled={campaigns.filter(c => c.is_active).length >= 10}
              >
                <Plus size={16} /> Nova Campanha
              </button>
            </div>

            <div className="space-y-4">
              {campaigns.map((c) => {
                const progress = c.goal_amount > 0 ? Math.min((c.raised_amount / c.goal_amount) * 100, 100) : 0;
                return (
                  <div key={c.id} className="brutalist-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4" data-testid={`admin-campaign-${c.id}`}>
                    <img src={c.cover_image} alt={c.title} className="w-20 h-20 object-cover border-2 border-zinc-950 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-zinc-950 truncate">{c.title}</h3>
                      <div className="brutalist-progress mt-2 mb-1" style={{ height: "8px" }}>
                        <div className="brutalist-progress-fill" style={{ width: `${progress}%`, height: "100%" }} />
                      </div>
                      <div className="flex gap-4 text-xs text-zinc-500">
                        <span>R$ {(c.raised_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} / R$ {(c.goal_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        <span>{c.backers_count || 0} apoiadores</span>
                        <span>Taxa: R$ {((c.raised_amount || 0) * 0.05).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <span className={`px-2 py-1 text-xs font-bold uppercase ${c.is_active ? "bg-green-100 text-green-800 border border-green-300" : "bg-zinc-100 text-zinc-500 border border-zinc-300"}`}>
                        {c.is_active ? "Ativa" : "Inativa"}
                      </span>
                      <button
                        onClick={() => { setEditingCampaign(c); setShowCreateModal(true); }}
                        className="p-2 border-2 border-zinc-950 hover:bg-zinc-100"
                        data-testid={`edit-campaign-${c.id}`}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(c.id)}
                        className="p-2 border-2 border-red-500 text-red-500 hover:bg-red-50"
                        data-testid={`delete-campaign-${c.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {campaigns.length === 0 && (
                <div className="brutalist-card p-8 text-center">
                  <p className="text-zinc-500 font-bold uppercase">Nenhuma campanha criada</p>
                </div>
              )}
            </div>

            {/* Transactions */}
            {stats && stats.transactions && stats.transactions.length > 0 && (
              <div className="mt-12">
                <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-4">Transacoes Recentes</h3>
                <div className="brutalist-card overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-950 text-white">
                      <tr>
                        <th className="p-3 text-left font-bold uppercase text-xs">Data</th>
                        <th className="p-3 text-left font-bold uppercase text-xs">Nome</th>
                        <th className="p-3 text-left font-bold uppercase text-xs">Valor</th>
                        <th className="p-3 text-left font-bold uppercase text-xs">Taxa</th>
                        <th className="p-3 text-left font-bold uppercase text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.transactions.map((tx) => (
                        <tr key={tx.id || tx.session_id} className="border-b-2 border-zinc-100">
                          <td className="p-3 text-zinc-600">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="p-3 text-zinc-800 font-medium">{tx.backer_name || "-"}</td>
                          <td className="p-3 font-bold">R$ {(tx.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-zinc-500">R$ {(tx.platform_fee || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 text-xs font-bold uppercase ${
                              tx.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {tx.payment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gallery Tab */}
        {tab === "gallery" && (
          <GalleryTab gallery={gallery} onDelete={handleDeleteGallery} onAdd={loadData} />
        )}

        {/* Bio Tab */}
        {tab === "bio" && (
          <div>
            <div className="brutalist-card p-6 md:p-8 space-y-4">
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">URL da Foto</label>
                <input
                  type="text"
                  value={bio.photo_url}
                  onChange={(e) => setBio({ ...bio, photo_url: e.target.value })}
                  className="brutalist-input"
                  data-testid="bio-photo-input"
                />
              </div>
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Biografia</label>
                <textarea
                  value={bio.content}
                  onChange={(e) => setBio({ ...bio, content: e.target.value })}
                  className="brutalist-input min-h-[200px]"
                  data-testid="bio-content-input"
                />
              </div>
              <button onClick={handleSaveBio} className="brutalist-btn" data-testid="bio-save-btn">
                Salvar Biografia
              </button>
            </div>
          </div>
        )}

        {/* Subscribers Tab */}
        {tab === "subscribers" && (
          <div>
            <p className="text-sm text-zinc-500 font-bold uppercase mb-4">{subscribers.length} inscritos</p>
            <div className="brutalist-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-950 text-white">
                  <tr>
                    <th className="p-3 text-left font-bold uppercase text-xs">Email</th>
                    <th className="p-3 text-left font-bold uppercase text-xs">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((s) => (
                    <tr key={s.id || s.email} className="border-b-2 border-zinc-100">
                      <td className="p-3 text-zinc-800 font-medium">{s.email}</td>
                      <td className="p-3 text-zinc-500">{s.subscribed_at ? new Date(s.subscribed_at).toLocaleDateString("pt-BR") : "-"}</td>
                    </tr>
                  ))}
                  {subscribers.length === 0 && (
                    <tr><td colSpan="2" className="p-8 text-center text-zinc-500 font-bold uppercase">Nenhum inscrito</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Campaign Modal */}
      {showCreateModal && (
        <CampaignModal
          campaign={editingCampaign}
          onClose={() => setShowCreateModal(false)}
          onSave={() => { setShowCreateModal(false); loadData(); }}
        />
      )}
    </div>
  );
}

function GalleryTab({ gallery, onDelete, onAdd }) {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");

  const handleAdd = async () => {
    if (!url) return;
    await galleryAPI.add({ image_url: url, caption });
    setUrl("");
    setCaption("");
    onAdd();
  };

  return (
    <div>
      <div className="brutalist-card p-6 mb-6">
        <h3 className="font-bold text-sm uppercase mb-4">Adicionar Imagem</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="URL da imagem"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="brutalist-input flex-1"
            data-testid="gallery-url-input"
          />
          <input
            type="text"
            placeholder="Legenda"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="brutalist-input flex-1"
            data-testid="gallery-caption-input"
          />
          <button onClick={handleAdd} className="brutalist-btn whitespace-nowrap" data-testid="gallery-add-btn">
            <Plus size={16} className="inline" /> Adicionar
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {gallery.map((item) => (
          <div key={item.id} className="brutalist-card overflow-hidden">
            <img src={item.image_url} alt={item.caption} className="w-full h-48 object-cover border-b-2 border-zinc-950" />
            <div className="p-4 flex items-center justify-between">
              <p className="text-sm font-bold truncate">{item.caption}</p>
              <button onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignModal({ campaign, onClose, onSave }) {
  const isEdit = !!campaign;
  const [form, setForm] = useState({
    title: campaign?.title || "",
    description: campaign?.description || "",
    cover_image: campaign?.cover_image || "",
    goal_amount: campaign?.goal_amount || "",
    end_date: campaign?.end_date || "",
    is_active: campaign?.is_active !== false,
  });
  const [tiers, setTiers] = useState(campaign?.tiers || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addTier = () => {
    setTiers([...tiers, { id: crypto.randomUUID(), title: "", price: "", description: "", delivery_date: "", items: [] }]);
  };

  const updateTier = (index, field, value) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTiers(newTiers);
  };

  const removeTier = (index) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        goal_amount: parseFloat(form.goal_amount) || 0,
        tiers: tiers.map((t) => ({
          ...t,
          price: parseFloat(t.price) || 0,
          items: typeof t.items === "string" ? t.items.split(",").map((s) => s.trim()).filter(Boolean) : (t.items || []),
        })),
      };

      if (isEdit) {
        await campaignAPI.update(campaign.id, payload);
      } else {
        await campaignAPI.create(payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao salvar campanha");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="brutalist-card bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8" data-testid="campaign-modal">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-['Outfit'] font-black text-2xl uppercase">
            {isEdit ? "Editar Campanha" : "Nova Campanha"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Titulo</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="brutalist-input"
              required
              data-testid="campaign-title-input"
            />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Descricao</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="brutalist-input min-h-[120px]"
              required
              data-testid="campaign-description-input"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">URL da Capa</label>
              <input
                type="text"
                value={form.cover_image}
                onChange={(e) => setForm({ ...form, cover_image: e.target.value })}
                className="brutalist-input"
                required
                data-testid="campaign-cover-input"
              />
            </div>
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Meta (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.goal_amount}
                onChange={(e) => setForm({ ...form, goal_amount: e.target.value })}
                className="brutalist-input"
                required
                data-testid="campaign-goal-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Data Final</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="brutalist-input"
                required
                data-testid="campaign-date-input"
              />
            </div>
            {isEdit && (
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-5 h-5 border-2 border-zinc-950"
                  />
                  <span className="font-bold text-sm uppercase">Ativa</span>
                </label>
              </div>
            )}
          </div>

          {/* Tiers */}
          <div className="border-t-2 border-zinc-950 pt-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-['Outfit'] font-bold text-sm uppercase">Recompensas</h3>
              <button type="button" onClick={addTier} className="brutalist-btn text-xs py-2 px-3" data-testid="add-tier-btn">
                <Plus size={14} className="inline" /> Nivel
              </button>
            </div>
            {tiers.map((tier, i) => (
              <div key={tier.id || i} className="border-2 border-zinc-300 p-4 mb-3 space-y-3" data-testid={`tier-form-${i}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase text-zinc-500">Nivel {i + 1}</span>
                  <button type="button" onClick={() => removeTier(i)} className="text-red-500 text-xs font-bold uppercase">Remover</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Titulo" value={tier.title} onChange={(e) => updateTier(i, "title", e.target.value)} className="brutalist-input text-sm" />
                  <input type="number" step="0.01" placeholder="Preco (R$)" value={tier.price} onChange={(e) => updateTier(i, "price", e.target.value)} className="brutalist-input text-sm" />
                </div>
                <input type="text" placeholder="Descricao" value={tier.description} onChange={(e) => updateTier(i, "description", e.target.value)} className="brutalist-input text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Data de entrega" value={tier.delivery_date} onChange={(e) => updateTier(i, "delivery_date", e.target.value)} className="brutalist-input text-sm" />
                  <input type="text" placeholder="Itens (separados por virgula)" value={Array.isArray(tier.items) ? tier.items.join(", ") : tier.items} onChange={(e) => updateTier(i, "items", e.target.value)} className="brutalist-input text-sm" />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-zinc-50 border-2 border-zinc-300 p-3">
            <p className="text-xs text-zinc-500 font-bold uppercase">
              Nota: Todas as campanhas devem entregar o produto ao comprador, mesmo que faturem R$0. A plataforma cobra 5% do valor final arrecadado.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-500 p-3 text-red-700 text-sm font-bold" data-testid="campaign-modal-error">
              {error}
            </div>
          )}

          <button type="submit" disabled={saving} className="brutalist-btn w-full" data-testid="campaign-save-btn">
            {saving ? "Salvando..." : isEdit ? "Atualizar Campanha" : "Criar Campanha"}
          </button>
        </form>
      </div>
    </div>
  );
}

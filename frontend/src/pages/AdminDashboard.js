import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSiteSettings } from "../contexts/SiteSettingsContext";
import { campaignAPI, productAPI, adminAPI, galleryAPI, bioAPI, newsletterAPI, siteSettingsAPI, uploadAPI } from "../lib/api";
import { Plus, Trash2, Edit2, BarChart3, Image, FileText, Mail, X, ShoppingBag, Settings, Wallet, ArrowDownToLine, Upload } from "lucide-react";
import ImageUpload from "../components/ImageUpload";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const { settings: currentSettings, refresh: refreshSettings } = useSiteSettings();
  const navigate = useNavigate();
  const [tab, setTab] = useState("campaigns");
  const [campaigns, setCampaigns] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [bio, setBio] = useState({ content: "", photo_url: "" });
  const [subscribers, setSubscribers] = useState([]);
  const [siteConfig, setSiteConfig] = useState({});
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/admin/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && user.role === "admin") loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [campRes, prodRes, statsRes, galRes, bioRes, subRes, settRes] = await Promise.all([
        campaignAPI.getAll(), productAPI.getAll(), adminAPI.stats(),
        galleryAPI.getAll(), bioAPI.get(), newsletterAPI.getSubscribers(),
        siteSettingsAPI.get(),
      ]);
      setCampaigns(campRes.data);
      setProducts(prodRes.data);
      setStats(statsRes.data);
      setGallery(galRes.data);
      setBio(bioRes.data);
      setSubscribers(subRes.data);
      setSiteConfig(settRes.data);
    } catch (err) { console.error(err); }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm("Excluir esta campanha?")) return;
    await campaignAPI.delete(id);
    loadData();
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Excluir este produto?")) return;
    await productAPI.delete(id);
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
    { id: "balance", label: "Saldo", icon: <Wallet size={16} /> },
    { id: "campaigns", label: "Campanhas", icon: <BarChart3 size={16} /> },
    { id: "products", label: "Loja", icon: <ShoppingBag size={16} /> },
    { id: "gallery", label: "Galeria", icon: <Image size={16} /> },
    { id: "bio", label: "Biografia", icon: <FileText size={16} /> },
    { id: "subscribers", label: "Newsletter", icon: <Mail size={16} /> },
    { id: "settings", label: "Config. Site", icon: <Settings size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-50" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <h1 className="font-['Outfit'] text-3xl font-black uppercase tracking-tighter text-zinc-950">
            Painel Admin
          </h1>
          {stats && (
            <div className="flex gap-3 mt-4 sm:mt-0 flex-wrap">
              <div className="brutalist-card p-3 text-center">
                <div className="text-xs font-bold uppercase text-zinc-500">Total</div>
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
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 font-bold text-sm uppercase tracking-wider border-2 border-zinc-950 transition-all whitespace-nowrap ${
                tab === t.id ? "bg-zinc-950 text-[#FFDE00]" : "bg-white text-zinc-950 hover:bg-zinc-100"
              }`} data-testid={`admin-tab-${t.id}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Balance Tab */}
        {tab === "balance" && (
          <BalanceTab />
        )}

        {/* Campaigns Tab */}
        {tab === "campaigns" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-zinc-500 font-bold uppercase">{campaigns.filter(c => c.is_active).length} / 10 campanhas ativas</p>
              <button onClick={() => { setEditingCampaign(null); setShowCampaignModal(true); }}
                className="brutalist-btn flex items-center gap-2 text-sm" data-testid="admin-create-campaign"
                disabled={campaigns.filter(c => c.is_active).length >= 10}>
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
                      <button onClick={() => { setEditingCampaign(c); setShowCampaignModal(true); }} className="p-2 border-2 border-zinc-950 hover:bg-zinc-100">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteCampaign(c.id)} className="p-2 border-2 border-red-500 text-red-500 hover:bg-red-50">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {campaigns.length === 0 && <div className="brutalist-card p-8 text-center"><p className="text-zinc-500 font-bold uppercase">Nenhuma campanha criada</p></div>}
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
                        <th className="p-3 text-left font-bold uppercase text-xs">Tipo</th>
                        <th className="p-3 text-left font-bold uppercase text-xs">Usuario</th>
                        <th className="p-3 text-left font-bold uppercase text-xs">Valor</th>
                        <th className="p-3 text-left font-bold uppercase text-xs">Taxa</th>
                        <th className="p-3 text-left font-bold uppercase text-xs">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.transactions.map((tx) => (
                        <tr key={tx.id || tx.session_id} className="border-b-2 border-zinc-100">
                          <td className="p-3 text-zinc-600">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</td>
                          <td className="p-3"><span className={`px-2 py-1 text-xs font-bold uppercase ${tx.type === "product" ? "bg-blue-100 text-blue-800" : "bg-yellow-100 text-yellow-800"}`}>{tx.type === "product" ? "Loja" : "Campanha"}</span></td>
                          <td className="p-3 text-zinc-800 font-medium">{tx.user_name || tx.user_email || "-"}</td>
                          <td className="p-3 font-bold">R$ {(tx.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-zinc-500">R$ {(tx.platform_fee || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                          <td className="p-3"><span className={`px-2 py-1 text-xs font-bold uppercase ${tx.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{tx.payment_status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Products Tab */}
        {tab === "products" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-zinc-500 font-bold uppercase">{products.filter(p => p.is_active).length} / 10 produtos ativos</p>
              <button onClick={() => { setEditingProduct(null); setShowProductModal(true); }}
                className="brutalist-btn flex items-center gap-2 text-sm" data-testid="admin-create-product"
                disabled={products.filter(p => p.is_active).length >= 10}>
                <Plus size={16} /> Novo Produto
              </button>
            </div>
            <div className="space-y-4">
              {products.map((p) => (
                <div key={p.id} className="brutalist-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4" data-testid={`admin-product-${p.id}`}>
                  <img src={p.image_url} alt={p.title} className="w-20 h-20 object-cover border-2 border-zinc-950 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-zinc-950 truncate">{p.title}</h3>
                    <div className="flex gap-4 text-xs text-zinc-500 mt-1">
                      <span>R$ {parseFloat(p.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      <span>Estoque: {p.stock}</span>
                      <span>Vendidos: {p.sold_count || 0}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <span className={`px-2 py-1 text-xs font-bold uppercase ${p.is_active ? "bg-green-100 text-green-800 border border-green-300" : "bg-zinc-100 text-zinc-500 border border-zinc-300"}`}>
                      {p.is_active ? "Ativo" : "Inativo"}
                    </span>
                    <button onClick={() => { setEditingProduct(p); setShowProductModal(true); }} className="p-2 border-2 border-zinc-950 hover:bg-zinc-100">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="p-2 border-2 border-red-500 text-red-500 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {products.length === 0 && <div className="brutalist-card p-8 text-center"><p className="text-zinc-500 font-bold uppercase">Nenhum produto criado</p></div>}
            </div>
          </div>
        )}

        {/* Gallery Tab */}
        {tab === "gallery" && <GalleryTab gallery={gallery} onDelete={handleDeleteGallery} onAdd={loadData} />}

        {/* Bio Tab */}
        {tab === "bio" && (
          <div>
            <div className="brutalist-card p-6 md:p-8 space-y-4">
              <ImageUpload value={bio.photo_url} onChange={(url) => setBio({ ...bio, photo_url: url })} label="Foto do Edegar" />
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Biografia</label>
                <textarea value={bio.content} onChange={(e) => setBio({ ...bio, content: e.target.value })} className="brutalist-input min-h-[200px]" data-testid="bio-content-input" />
              </div>
              <button onClick={handleSaveBio} className="brutalist-btn" data-testid="bio-save-btn">Salvar Biografia</button>
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
                  {subscribers.length === 0 && <tr><td colSpan="2" className="p-8 text-center text-zinc-500 font-bold uppercase">Nenhum inscrito</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === "settings" && (
          <SiteSettingsTab config={siteConfig} onSave={() => { loadData(); refreshSettings(); }} />
        )}
      </div>

      {showCampaignModal && <CampaignModal campaign={editingCampaign} onClose={() => setShowCampaignModal(false)} onSave={() => { setShowCampaignModal(false); loadData(); }} />}
      {showProductModal && <ProductModal product={editingProduct} onClose={() => setShowProductModal(false)} onSave={() => { setShowProductModal(false); loadData(); }} />}
    </div>
  );
}

function GalleryTab({ gallery, onDelete, onAdd }) {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const handleAdd = async () => {
    if (!url) return;
    await galleryAPI.add({ image_url: url, caption });
    setUrl(""); setCaption(""); onAdd();
  };
  return (
    <div>
      <div className="brutalist-card p-6 mb-6">
        <h3 className="font-bold text-sm uppercase mb-4">Adicionar Imagem</h3>
        <div className="space-y-3">
          <ImageUpload value={url} onChange={setUrl} label="Imagem da Galeria" />
          <input type="text" placeholder="Legenda" value={caption} onChange={(e) => setCaption(e.target.value)} className="brutalist-input" data-testid="gallery-caption-input" />
          <button onClick={handleAdd} className="brutalist-btn" data-testid="gallery-add-btn" disabled={!url}><Plus size={16} className="inline" /> Adicionar a Galeria</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {gallery.map((item) => (
          <div key={item.id} className="brutalist-card overflow-hidden">
            <img src={item.image_url} alt={item.caption} className="w-full h-48 object-cover border-b-2 border-zinc-950" />
            <div className="p-4 flex items-center justify-between">
              <p className="text-sm font-bold truncate">{item.caption}</p>
              <button onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"><Trash2 size={14} /></button>
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
    title: campaign?.title || "", description: campaign?.description || "",
    cover_image: campaign?.cover_image || "", goal_amount: campaign?.goal_amount || "",
    end_date: campaign?.end_date || "", is_active: campaign?.is_active !== false,
  });
  const [tiers, setTiers] = useState(campaign?.tiers || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addTier = () => setTiers([...tiers, { id: crypto.randomUUID(), title: "", price: "", description: "", delivery_date: "", items: [] }]);
  const updateTier = (i, field, value) => { const n = [...tiers]; n[i] = { ...n[i], [field]: value }; setTiers(n); };
  const removeTier = (i) => setTiers(tiers.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const payload = {
        ...form, goal_amount: parseFloat(form.goal_amount) || 0,
        tiers: tiers.map((t) => ({ ...t, price: parseFloat(t.price) || 0, items: typeof t.items === "string" ? t.items.split(",").map(s => s.trim()).filter(Boolean) : (t.items || []) })),
      };
      if (isEdit) await campaignAPI.update(campaign.id, payload);
      else await campaignAPI.create(payload);
      onSave();
    } catch (err) { setError(err.response?.data?.detail || "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="brutalist-card bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8" data-testid="campaign-modal">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-['Outfit'] font-black text-2xl uppercase">{isEdit ? "Editar Campanha" : "Nova Campanha"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Titulo</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="brutalist-input" required data-testid="campaign-title-input" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Descricao</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="brutalist-input min-h-[120px]" required data-testid="campaign-description-input" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <ImageUpload value={form.cover_image} onChange={(url) => setForm({ ...form, cover_image: url })} label="Capa da Campanha" />
            </div>
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Meta (R$)</label>
              <input type="number" step="0.01" value={form.goal_amount} onChange={(e) => setForm({ ...form, goal_amount: e.target.value })} className="brutalist-input" required data-testid="campaign-goal-input" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Data Final</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="brutalist-input" required data-testid="campaign-date-input" />
            </div>
            {isEdit && (
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-5 h-5 border-2 border-zinc-950" />
                  <span className="font-bold text-sm uppercase">Ativa</span>
                </label>
              </div>
            )}
          </div>
          <div className="border-t-2 border-zinc-950 pt-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-['Outfit'] font-bold text-sm uppercase">Recompensas</h3>
              <button type="button" onClick={addTier} className="brutalist-btn text-xs py-2 px-3" data-testid="add-tier-btn"><Plus size={14} className="inline" /> Nivel</button>
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
                  <input type="text" placeholder="Itens (virgula)" value={Array.isArray(tier.items) ? tier.items.join(", ") : tier.items} onChange={(e) => updateTier(i, "items", e.target.value)} className="brutalist-input text-sm" />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-zinc-50 border-2 border-zinc-300 p-3">
            <p className="text-xs text-zinc-500 font-bold uppercase">Todas as campanhas devem entregar o produto ao comprador, mesmo que faturem R$0. Taxa de 5% sobre o valor arrecadado.</p>
          </div>
          {error && <div className="bg-red-50 border-2 border-red-500 p-3 text-red-700 text-sm font-bold">{error}</div>}
          <button type="submit" disabled={saving} className="brutalist-btn w-full" data-testid="campaign-save-btn">
            {saving ? "Salvando..." : isEdit ? "Atualizar" : "Criar Campanha"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProductModal({ product, onClose, onSave }) {
  const isEdit = !!product;
  const [form, setForm] = useState({
    title: product?.title || "", description: product?.description || "",
    image_url: product?.image_url || "", price: product?.price || "",
    stock: product?.stock ?? 999, is_active: product?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0, stock: parseInt(form.stock) || 0 };
      if (isEdit) await productAPI.update(product.id, payload);
      else await productAPI.create(payload);
      onSave();
    } catch (err) { setError(err.response?.data?.detail || "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="brutalist-card bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 md:p-8" data-testid="product-modal">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-['Outfit'] font-black text-2xl uppercase">{isEdit ? "Editar Produto" : "Novo Produto"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Nome do Produto</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="brutalist-input" required data-testid="product-title-input" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Descricao</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="brutalist-input min-h-[100px]" required data-testid="product-description-input" />
          </div>
          <div>
            <ImageUpload value={form.image_url} onChange={(url) => setForm({ ...form, image_url: url })} label="Imagem do Produto" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Preco (R$)</label>
              <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="brutalist-input" required data-testid="product-price-input" />
            </div>
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Estoque</label>
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="brutalist-input" data-testid="product-stock-input" />
            </div>
          </div>
          {isEdit && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-5 h-5 border-2 border-zinc-950" />
              <span className="font-bold text-sm uppercase">Ativo</span>
            </label>
          )}
          {error && <div className="bg-red-50 border-2 border-red-500 p-3 text-red-700 text-sm font-bold">{error}</div>}
          <button type="submit" disabled={saving} className="brutalist-btn w-full" data-testid="product-save-btn">
            {saving ? "Salvando..." : isEdit ? "Atualizar" : "Criar Produto"}
          </button>
        </form>
      </div>
    </div>
  );
}


function SiteSettingsTab({ config, onSave }) {
  const [form, setForm] = useState({
    site_name: config?.site_name || "Edegar Agostinho",
    site_subtitle: config?.site_subtitle || "",
    logo_url: config?.logo_url || "",
    primary_color: config?.primary_color || "#FFDE00",
    secondary_color: config?.secondary_color || "#09090B",
    accent_color: config?.accent_color || "#FF3B30",
    bg_color: config?.bg_color || "#FFFFFF",
    text_color: config?.text_color || "#09090B",
    hero_title: config?.hero_title || "",
    hero_subtitle: config?.hero_subtitle || "",
    support_email: config?.support_email || "mateusbuarquepugli@gmail.com",
    marquee_text: config?.marquee_text || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) setForm((prev) => ({ ...prev, ...config }));
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await siteSettingsAPI.update(form);
      alert("Configuracoes salvas!");
      onSave();
    } catch (err) { alert("Erro ao salvar"); }
    finally { setSaving(false); }
  };

  const colorFields = [
    { key: "primary_color", label: "Cor Primaria (botoes, destaques)" },
    { key: "secondary_color", label: "Cor Secundaria (fundo escuro, textos)" },
    { key: "accent_color", label: "Cor Acentuada" },
    { key: "bg_color", label: "Cor de Fundo" },
    { key: "text_color", label: "Cor do Texto" },
  ];

  return (
    <div className="space-y-6" data-testid="settings-tab">
      <div className="brutalist-card p-6 md:p-8">
        <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-6">Identidade do Site</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Nome do Site</label>
              <input type="text" value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} className="brutalist-input" data-testid="settings-site-name" />
            </div>
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Subtitulo</label>
              <input type="text" value={form.site_subtitle} onChange={(e) => setForm({ ...form, site_subtitle: e.target.value })} className="brutalist-input" data-testid="settings-site-subtitle" />
            </div>
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">URL do Logo (deixe vazio para texto)</label>
            <input type="text" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} className="brutalist-input" placeholder="https://..." data-testid="settings-logo-url" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Email de Suporte</label>
            <input type="email" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} className="brutalist-input" data-testid="settings-support-email" />
          </div>
        </div>
      </div>

      <div className="brutalist-card p-6 md:p-8">
        <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-6">Cores</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {colorFields.map(({ key, label }) => (
            <div key={key}>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">{label}</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-10 h-10 border-2 border-zinc-950 cursor-pointer p-0" />
                <input type="text" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="brutalist-input flex-1 text-sm" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-4 border-2 border-zinc-300 flex gap-3 items-center">
          <span className="text-xs font-bold uppercase text-zinc-500">Preview:</span>
          <div className="w-8 h-8 border-2 border-zinc-950" style={{ backgroundColor: form.primary_color }} title="Primaria" />
          <div className="w-8 h-8 border-2 border-zinc-950" style={{ backgroundColor: form.secondary_color }} title="Secundaria" />
          <div className="w-8 h-8 border-2 border-zinc-950" style={{ backgroundColor: form.accent_color }} title="Acentuada" />
          <div className="w-8 h-8 border-2 border-zinc-950" style={{ backgroundColor: form.bg_color }} title="Fundo" />
          <div className="w-8 h-8 border-2 border-zinc-950" style={{ backgroundColor: form.text_color }} title="Texto" />
        </div>
      </div>

      <div className="brutalist-card p-6 md:p-8">
        <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-6">Textos do Site</h3>
        <div className="space-y-4">
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Titulo do Hero (separar frases com ponto)</label>
            <input type="text" value={form.hero_title} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} className="brutalist-input" data-testid="settings-hero-title" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Subtitulo do Hero</label>
            <textarea value={form.hero_subtitle} onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })} className="brutalist-input min-h-[80px]" data-testid="settings-hero-subtitle" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Texto do Marquee (separar com *)</label>
            <input type="text" value={form.marquee_text} onChange={(e) => setForm({ ...form, marquee_text: e.target.value })} className="brutalist-input" data-testid="settings-marquee-text" />
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="brutalist-btn w-full sm:w-auto" data-testid="settings-save-btn">
        {saving ? "Salvando..." : "Salvar Configuracoes"}
      </button>
    </div>
  );
}


function BalanceTab() {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", pix_key: "", pix_key_type: "cpf" });
  const [withdrawing, setWithdrawing] = useState(false);
  const [message, setMessage] = useState("");

  const loadBalance = () => {
    setLoading(true);
    adminAPI.balance()
      .then((res) => setBalance(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadBalance(); }, []);

  const handleWithdraw = async () => {
    setMessage("");
    if (!withdrawForm.amount || parseFloat(withdrawForm.amount) <= 0) {
      setMessage("Informe um valor valido");
      return;
    }
    if (!withdrawForm.pix_key || withdrawForm.pix_key.trim().length < 5) {
      setMessage("Informe uma chave Pix valida");
      return;
    }
    setWithdrawing(true);
    try {
      const res = await adminAPI.withdraw({
        amount: parseFloat(withdrawForm.amount),
        pix_key: withdrawForm.pix_key,
        pix_key_type: withdrawForm.pix_key_type,
      });
      setMessage(res.data.message);
      setWithdrawForm({ amount: "", pix_key: "", pix_key_type: "cpf" });
      setShowWithdraw(false);
      loadBalance();
    } catch (err) {
      setMessage(err.response?.data?.detail || "Erro ao processar saque");
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading || !balance) {
    return <div className="text-center py-12"><div className="animate-pulse font-bold uppercase">Carregando saldo...</div></div>;
  }

  const pixKeyTypes = [
    { value: "cpf", label: "CPF" },
    { value: "cnpj", label: "CNPJ" },
    { value: "email", label: "E-mail" },
    { value: "phone", label: "Telefone" },
    { value: "random", label: "Chave Aleatoria" },
  ];

  return (
    <div className="space-y-6" data-testid="balance-tab">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="brutalist-card p-6 text-center" style={{ background: "#FFDE00" }}>
          <div className="text-xs font-bold uppercase text-zinc-700 mb-1">Saldo Disponivel</div>
          <div className="font-['Outfit'] font-black text-3xl text-zinc-950" data-testid="available-balance">
            R$ {balance.available_balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="brutalist-card p-6 text-center">
          <div className="text-xs font-bold uppercase text-zinc-500 mb-1">Receita Total</div>
          <div className="font-['Outfit'] font-black text-2xl text-zinc-950">
            R$ {balance.total_revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="brutalist-card p-6 text-center">
          <div className="text-xs font-bold uppercase text-zinc-500 mb-1">Taxa Plataforma (5%)</div>
          <div className="font-['Outfit'] font-black text-2xl text-red-600">
            - R$ {balance.platform_fee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="brutalist-card p-6 text-center">
          <div className="text-xs font-bold uppercase text-zinc-500 mb-1">Total Sacado</div>
          <div className="font-['Outfit'] font-black text-2xl text-zinc-950">
            R$ {balance.total_withdrawn.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Withdraw Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setShowWithdraw(!showWithdraw)}
          className="brutalist-btn flex items-center gap-2"
          data-testid="withdraw-btn"
          disabled={balance.available_balance <= 0}
        >
          <ArrowDownToLine size={18} /> Sacar
        </button>
        {balance.available_balance <= 0 && (
          <span className="text-sm text-zinc-500 font-bold">Sem saldo disponivel para saque</span>
        )}
      </div>

      {message && (
        <div className={`p-4 border-2 font-bold text-sm ${message.includes("sucesso") ? "bg-green-50 border-green-500 text-green-800" : "bg-red-50 border-red-500 text-red-800"}`} data-testid="withdraw-message">
          {message}
        </div>
      )}

      {/* Withdraw Form */}
      {showWithdraw && (
        <div className="brutalist-card p-6 md:p-8" data-testid="withdraw-form">
          <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-6">Sacar via Pix</h3>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Valor do Saque (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={balance.available_balance}
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                className="brutalist-input"
                placeholder={`Maximo: R$ ${balance.available_balance.toFixed(2)}`}
                data-testid="withdraw-amount-input"
              />
            </div>
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Tipo de Chave Pix</label>
              <div className="flex flex-wrap gap-2">
                {pixKeyTypes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setWithdrawForm({ ...withdrawForm, pix_key_type: t.value })}
                    className={`px-4 py-2 border-2 border-zinc-950 font-bold text-xs uppercase transition-all ${
                      withdrawForm.pix_key_type === t.value ? "bg-zinc-950 text-[#FFDE00]" : "bg-white text-zinc-950 hover:bg-zinc-100"
                    }`}
                    data-testid={`pix-type-${t.value}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Sua Chave Pix</label>
              <input
                type="text"
                value={withdrawForm.pix_key}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, pix_key: e.target.value })}
                className="brutalist-input"
                placeholder={
                  withdrawForm.pix_key_type === "cpf" ? "000.000.000-00" :
                  withdrawForm.pix_key_type === "cnpj" ? "00.000.000/0000-00" :
                  withdrawForm.pix_key_type === "email" ? "seu@email.com" :
                  withdrawForm.pix_key_type === "phone" ? "+5511999999999" :
                  "Chave aleatoria"
                }
                data-testid="withdraw-pix-key-input"
              />
            </div>
            <div className="bg-zinc-50 border-2 border-zinc-300 p-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-600">Valor do saque:</span>
                <span className="font-bold">R$ {(parseFloat(withdrawForm.amount) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Pix ({pixKeyTypes.find(t => t.value === withdrawForm.pix_key_type)?.label}):</span>
                <span className="font-bold">{withdrawForm.pix_key || "---"}</span>
              </div>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="brutalist-btn w-full flex items-center justify-center gap-2"
              data-testid="confirm-withdraw-btn"
            >
              <ArrowDownToLine size={16} />
              {withdrawing ? "Processando..." : "Confirmar Saque"}
            </button>
          </div>
        </div>
      )}

      {/* Withdrawal History */}
      {balance.withdrawals && balance.withdrawals.length > 0 && (
        <div>
          <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-4">Historico de Saques</h3>
          <div className="brutalist-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950 text-white">
                <tr>
                  <th className="p-3 text-left font-bold uppercase text-xs">Data</th>
                  <th className="p-3 text-left font-bold uppercase text-xs">Valor</th>
                  <th className="p-3 text-left font-bold uppercase text-xs">Chave Pix</th>
                  <th className="p-3 text-left font-bold uppercase text-xs">Tipo</th>
                  <th className="p-3 text-left font-bold uppercase text-xs">Status</th>
                </tr>
              </thead>
              <tbody>
                {balance.withdrawals.map((w) => (
                  <tr key={w.id} className="border-b-2 border-zinc-100">
                    <td className="p-3 text-zinc-600">{new Date(w.created_at).toLocaleDateString("pt-BR")} {new Date(w.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="p-3 font-bold text-zinc-950">R$ {(w.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                    <td className="p-3 text-zinc-700">{w.pix_key}</td>
                    <td className="p-3 text-zinc-500 uppercase text-xs font-bold">{w.pix_key_type}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 text-xs font-bold uppercase ${w.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                        {w.status === "completed" ? "Concluido" : "Pendente"}
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
  );
}

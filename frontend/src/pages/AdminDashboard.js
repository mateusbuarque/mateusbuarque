import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSiteSettings } from "../contexts/SiteSettingsContext";
import { campaignAPI, productAPI, adminAPI, galleryAPI, bioAPI, newsletterAPI, siteSettingsAPI, uploadAPI, adminPixAPI, showcaseAPI, videosAPI, subscriptionAPI, liveAPI, couponAPI } from "../lib/api";
import { Plus, Trash2, Edit2, BarChart3, Image, FileText, Mail, X, ShoppingBag, Settings, Wallet, ArrowDownToLine, Upload, Radio, Sparkles, Video, Eye, EyeOff, Play, Crown, Lock, Tag, Percent } from "lucide-react";
import ImageUpload from "../components/ImageUpload";
import AdminLivePanel from "../components/AdminLivePanel";
import VisibilitySelector from "../components/VisibilitySelector";

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
  const [showcaseItems, setShowcaseItems] = useState([]);
  const [videosList, setVideosList] = useState([]);
  const [subPlans, setSubPlans] = useState([]);
  const [allSubs, setAllSubs] = useState([]);
  const [coupons, setCoupons] = useState([]);
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
      const [campRes, prodRes, statsRes, galRes, bioRes, subRes, settRes, showRes, vidRes, plansRes, allSubsRes, couponsRes] = await Promise.all([
        campaignAPI.getAll(), productAPI.getAll(), adminAPI.stats(),
        galleryAPI.getAll(), bioAPI.get(), newsletterAPI.getSubscribers(),
        siteSettingsAPI.get(), showcaseAPI.getAll(), videosAPI.getAll(),
        subscriptionAPI.plans(), adminAPI.subscriptions(), couponAPI.getAll(),
      ]);
      setCampaigns(campRes.data);
      setProducts(prodRes.data);
      setStats(statsRes.data);
      setGallery(galRes.data);
      setBio(bioRes.data);
      setSubscribers(subRes.data);
      setSiteConfig(settRes.data);
      setShowcaseItems(showRes.data);
      setVideosList(vidRes.data);
      setSubPlans(plansRes.data);
      setAllSubs(allSubsRes.data);
      setCoupons(couponsRes.data);
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
    { id: "live", label: "Live", icon: <Radio size={16} /> },
    { id: "videos", label: "Videos", icon: <Video size={16} /> },
    { id: "subscriptions", label: "Assinaturas", icon: <Crown size={16} /> },
    { id: "coupons", label: "Cupons", icon: <Tag size={16} /> },
    { id: "showcase", label: "Vitrine", icon: <Sparkles size={16} /> },
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
            {/* Pedidos Aguardando Confirmacao */}
            {stats && stats.transactions && stats.transactions.filter(t => t.payment_status === "awaiting_pix" || t.payment_status === "pending").length > 0 && (
              <div className="mt-8">
                <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-4 flex items-center gap-2">
                  <span className="w-3 h-3 bg-[#FFDE00] border-2 border-zinc-950 inline-block animate-pulse" />
                  Aguardando Confirmacao de Pagamento
                </h3>
                <div className="space-y-3">
                  {stats.transactions.filter(t => t.payment_status === "awaiting_pix" || t.payment_status === "pending").map((tx) => (
                    <div key={tx.id} className="brutalist-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-l-4 border-l-[#FFDE00]" data-testid={`pix-pending-${tx.id}`}>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-zinc-950">{tx.user_name || tx.user_email}</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {tx.type === "campaign" ? "Campanha" : tx.type === "subscription" ? "Assinatura" : "Loja"} - {new Date(tx.created_at).toLocaleDateString("pt-BR")} {new Date(tx.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-bold uppercase">Aguardando comprovante</span>
                        </div>
                      </div>
                      <div className="font-['Outfit'] font-black text-xl">R$ {(tx.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Confirmar pagamento de R$ ${tx.amount.toFixed(2)} de ${tx.user_name || tx.user_email}?`)) return;
                          try {
                            await adminPixAPI.confirm(tx.id);
                            loadData();
                          } catch (err) { alert(err.response?.data?.detail || "Erro"); }
                        }}
                        className="brutalist-btn text-sm py-2 px-4 whitespace-nowrap"
                        data-testid={`confirm-pix-${tx.id}`}
                      >
                        Confirmar Pagamento
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                          <td className="p-3"><span className={`px-2 py-1 text-xs font-bold uppercase ${tx.payment_status === "paid" ? "bg-green-100 text-green-800" : tx.payment_status === "awaiting_pix" ? "bg-orange-100 text-orange-800" : "bg-yellow-100 text-yellow-800"}`}>{tx.payment_status === "paid" ? "Pagamento confirmado" : tx.payment_status === "awaiting_pix" ? "Aguardando confirmacao" : "Pendente"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}


        {/* Live Tab */}
        {tab === "live" && <AdminLivePanel />}

        {/* Videos Tab */}
        {tab === "videos" && <VideosTab videos={videosList} onRefresh={loadData} />}

        {/* Showcase Tab */}
        {tab === "showcase" && <ShowcaseTab items={showcaseItems} onRefresh={loadData} />}

        {/* Subscriptions Tab */}
        {tab === "subscriptions" && <SubscriptionsTab plans={subPlans} allSubs={allSubs} onRefresh={loadData} />}
        {tab === "coupons" && <CouponsTab coupons={coupons} onRefresh={loadData} />}

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

  const addTier = () => setTiers([...tiers, { id: crypto.randomUUID(), title: "", price: "", min_donation: "", description: "", delivery_date: "", items: [] }]);
  const updateTier = (i, field, value) => { const n = [...tiers]; n[i] = { ...n[i], [field]: value }; setTiers(n); };
  const removeTier = (i) => setTiers(tiers.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const payload = {
        ...form, goal_amount: parseFloat(form.goal_amount) || 0,
        tiers: tiers.map((t) => ({ ...t, price: parseFloat(t.price) || 0, min_donation: parseFloat(t.min_donation) || 0, items: typeof t.items === "string" ? t.items.split(",").map(s => s.trim()).filter(Boolean) : (t.items || []) })),
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
                  <input type="number" step="0.01" placeholder="Preco sugerido (R$)" value={tier.price} onChange={(e) => updateTier(i, "price", e.target.value)} className="brutalist-input text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" placeholder="Doacao minima (R$)" value={tier.min_donation || ""} onChange={(e) => updateTier(i, "min_donation", e.target.value)} className="brutalist-input text-sm" />
                  <div className="text-xs text-zinc-400 self-center">Se vazio, minimo = preco sugerido. Doador pode doar mais.</div>
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
    btn_color: config?.btn_color || "#FFDE00",
    btn_text_color: config?.btn_text_color || "#09090B",
    hero_title: config?.hero_title || "",
    hero_subtitle: config?.hero_subtitle || "",
    support_email: config?.support_email || "mateusbuarquepugli@gmail.com",
    marquee_text: config?.marquee_text || "",
    nav_label_home: config?.nav_label_home || "Inicio",
    nav_label_campaigns: config?.nav_label_campaigns || "Campanhas",
    nav_label_store: config?.nav_label_store || "Loja",
    nav_label_bio: config?.nav_label_bio || "Biografia",
    nav_label_gallery: config?.nav_label_gallery || "Galeria",
    nav_url_home: config?.nav_url_home || "/",
    nav_url_campaigns: config?.nav_url_campaigns || "/#campanhas",
    nav_url_store: config?.nav_url_store || "/loja",
    nav_url_bio: config?.nav_url_bio || "/#biografia",
    nav_url_gallery: config?.nav_url_gallery || "/#galeria",
    btn_label_hero_primary: config?.btn_label_hero_primary || "Ver Campanhas",
    btn_label_hero_secondary: config?.btn_label_hero_secondary || "Sobre Edegar",
    btn_label_support: config?.btn_label_support || "Apoiar",
    btn_label_buy_pix: config?.btn_label_buy_pix || "Pagar com Pix",
    header_icon_url: config?.header_icon_url || "",
    heading_color: config?.heading_color || "#09090B",
    subtitle_color: config?.subtitle_color || "#52525B",
    link_color: config?.link_color || "#3F3F46",
    custom_domain: config?.custom_domain || "",
    footer_text: config?.footer_text || "Todos os direitos reservados.",
    footer_bg_color: config?.footer_bg_color || "#09090B",
    footer_text_color: config?.footer_text_color || "#a1a1aa",
    footer_heading_color: config?.footer_heading_color || "#FFDE00",
    footer_link_color: config?.footer_link_color || "#a1a1aa",
    footer_border_color: config?.footer_border_color || "#27272a",
    custom_links: config?.custom_links || [],
    custom_buttons: config?.custom_buttons || [],
    header_bg_color: config?.header_bg_color || "#ffffff",
    header_border_color: config?.header_border_color || "#09090B",
    sidebar_bg_color: config?.sidebar_bg_color || "#ffffff",
    sidebar_text_color: config?.sidebar_text_color || "#52525B",
    sidebar_active_color: config?.sidebar_active_color || "#09090B",
    marquee_bg_color: config?.marquee_bg_color || "#09090B",
    marquee_text_color: config?.marquee_text_color || "#FF3B30",
    card_bg_color: config?.card_bg_color || "#ffffff",
    card_border_color: config?.card_border_color || "#09090B",
    section_bg_alt_color: config?.section_bg_alt_color || "#fafafa",
    badge_bg_color: config?.badge_bg_color || "#FFDE00",
    badge_text_color: config?.badge_text_color || "#09090B",
    progress_bar_color: config?.progress_bar_color || "#FFDE00",
    progress_bg_color: config?.progress_bg_color || "#e4e4e7",
    input_bg_color: config?.input_bg_color || "#ffffff",
    input_border_color: config?.input_border_color || "#09090B",
    input_text_color: config?.input_text_color || "#09090B",
    stats_icon_bg_color: config?.stats_icon_bg_color || "#FFDE00",
    section_title_campaigns: config?.section_title_campaigns || "Campanhas",
    section_title_products: config?.section_title_products || "Projetos & Produtos",
    section_title_bio: config?.section_title_bio || "Biografia",
    section_title_gallery: config?.section_title_gallery || "Galeria",
    social_instagram: config?.social_instagram || "",
    social_youtube: config?.social_youtube || "",
    social_tiktok: config?.social_tiktok || "",
    social_twitter: config?.social_twitter || "",
    social_facebook: config?.social_facebook || "",
    nav_label_live: config?.nav_label_live || "Live",
    nav_label_videos: config?.nav_label_videos || "Videos",
    nav_label_subscription: config?.nav_label_subscription || "Assinatura",
    nav_url_live: config?.nav_url_live || "/live",
    nav_url_videos: config?.nav_url_videos || "/videos",
    nav_url_subscription: config?.nav_url_subscription || "/assinatura",
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
    { group: "Cores Gerais", fields: [
      { key: "primary_color", label: "Primaria (destaques)" },
      { key: "secondary_color", label: "Secundaria (fundo escuro)" },
      { key: "accent_color", label: "Cor de Destaque" },
      { key: "bg_color", label: "Fundo do Site" },
      { key: "text_color", label: "Texto Geral" },
      { key: "heading_color", label: "Titulos" },
      { key: "subtitle_color", label: "Subtitulos" },
      { key: "link_color", label: "Links" },
    ]},
    { group: "Botoes", fields: [
      { key: "btn_color", label: "Fundo do Botao" },
      { key: "btn_text_color", label: "Texto do Botao" },
    ]},
    { group: "Header / Topo", fields: [
      { key: "header_bg_color", label: "Fundo do Header" },
      { key: "header_border_color", label: "Borda do Header" },
    ]},
    { group: "Menu Lateral", fields: [
      { key: "sidebar_bg_color", label: "Fundo do Menu" },
      { key: "sidebar_text_color", label: "Texto do Menu" },
      { key: "sidebar_active_color", label: "Item Ativo" },
    ]},
    { group: "Marquee / Faixa", fields: [
      { key: "marquee_bg_color", label: "Fundo da Faixa" },
      { key: "marquee_text_color", label: "Texto da Faixa" },
    ]},
    { group: "Cards / Caixas", fields: [
      { key: "card_bg_color", label: "Fundo do Card" },
      { key: "card_border_color", label: "Borda do Card" },
    ]},
    { group: "Secoes / Fundo Alternativo", fields: [
      { key: "section_bg_alt_color", label: "Fundo Secao Alternativa" },
    ]},
    { group: "Badges / Etiquetas", fields: [
      { key: "badge_bg_color", label: "Fundo Badge" },
      { key: "badge_text_color", label: "Texto Badge" },
    ]},
    { group: "Barra de Progresso", fields: [
      { key: "progress_bar_color", label: "Cor da Barra" },
      { key: "progress_bg_color", label: "Fundo da Barra" },
    ]},
    { group: "Campos de Entrada", fields: [
      { key: "input_bg_color", label: "Fundo do Input" },
      { key: "input_border_color", label: "Borda do Input" },
      { key: "input_text_color", label: "Texto do Input" },
    ]},
    { group: "Icones / Estatisticas", fields: [
      { key: "stats_icon_bg_color", label: "Fundo Icone Stats" },
    ]},
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
            <ImageUpload value={form.header_icon_url} onChange={(url) => setForm({ ...form, header_icon_url: url })} label="Icone ao lado do nome (canto superior esquerdo)" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Email de Suporte</label>
            <input type="email" value={form.support_email} onChange={(e) => setForm({ ...form, support_email: e.target.value })} className="brutalist-input" data-testid="settings-support-email" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Dominio Customizado</label>
            <input type="text" value={form.custom_domain} onChange={(e) => setForm({ ...form, custom_domain: e.target.value })} className="brutalist-input" placeholder="https://seudominio.com.br" data-testid="settings-custom-domain" />
            <p className="text-xs text-zinc-400 mt-1">Para conectar seu dominio: faca deploy do site na Emergent, clique em "Link Domain" e siga as instrucoes. A propagacao DNS leva 5-15 min.</p>
          </div>
        </div>
      </div>

      <div className="brutalist-card p-6 md:p-8">
        <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-6">Cores do Site</h3>
        <div className="space-y-6">
          {colorFields.map(({ group, fields }) => (
            <div key={group}>
              <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-500 mb-3 pb-2 border-b border-zinc-200">{group}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {fields.map(({ key, label }) => (
                  <div key={key}>
                    <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">{label}</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form[key] || "#000000"} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-10 h-10 border-2 border-zinc-950 cursor-pointer p-0" />
                      <input type="text" value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="brutalist-input flex-1 text-sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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

      <div className="brutalist-card p-6 md:p-8">
        <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-6">Menu de Navegacao</h3>
        <p className="text-xs text-zinc-500 mb-4">Mude o nome e URL de cada link do menu</p>
        <div className="space-y-3">
          {[
            { labelKey: "nav_label_home", urlKey: "nav_url_home", name: "Home" },
            { labelKey: "nav_label_campaigns", urlKey: "nav_url_campaigns", name: "Campanhas" },
            { labelKey: "nav_label_store", urlKey: "nav_url_store", name: "Loja" },
            { labelKey: "nav_label_bio", urlKey: "nav_url_bio", name: "Biografia" },
            { labelKey: "nav_label_gallery", urlKey: "nav_url_gallery", name: "Galeria" },
            { labelKey: "nav_label_live", urlKey: "nav_url_live", name: "Live" },
            { labelKey: "nav_label_videos", urlKey: "nav_url_videos", name: "Videos" },
            { labelKey: "nav_label_subscription", urlKey: "nav_url_subscription", name: "Assinatura" },
          ].map(({ labelKey, urlKey, name }) => (
            <div key={labelKey} className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-500 block mb-1">Nome: {name}</label>
                <input type="text" value={form[labelKey] || ""} onChange={(e) => setForm({ ...form, [labelKey]: e.target.value })} className="brutalist-input text-sm" />
              </div>
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-500 block mb-1">URL</label>
                <input type="text" value={form[urlKey] || ""} onChange={(e) => setForm({ ...form, [urlKey]: e.target.value })} className="brutalist-input text-sm" placeholder="/ ou /#secao ou https://..." />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="brutalist-card p-6 md:p-8">
        <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-6">Textos dos Botoes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Botao Hero Principal</label>
            <input type="text" value={form.btn_label_hero_primary} onChange={(e) => setForm({ ...form, btn_label_hero_primary: e.target.value })} className="brutalist-input text-sm" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Botao Hero Secundario</label>
            <input type="text" value={form.btn_label_hero_secondary} onChange={(e) => setForm({ ...form, btn_label_hero_secondary: e.target.value })} className="brutalist-input text-sm" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Botao Apoiar (campanhas)</label>
            <input type="text" value={form.btn_label_support} onChange={(e) => setForm({ ...form, btn_label_support: e.target.value })} className="brutalist-input text-sm" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Botao Pagar Pix</label>
            <input type="text" value={form.btn_label_buy_pix} onChange={(e) => setForm({ ...form, btn_label_buy_pix: e.target.value })} className="brutalist-input text-sm" />
          </div>
        </div>
      </div>

      <div className="brutalist-card p-6 md:p-8">
        <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-6">Titulos das Secoes</h3>
        <p className="text-xs text-zinc-500 mb-4">Mude os titulos que aparecem em cada secao do site</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Secao Campanhas</label>
            <input type="text" value={form.section_title_campaigns} onChange={(e) => setForm({ ...form, section_title_campaigns: e.target.value })} className="brutalist-input text-sm" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Secao Produtos</label>
            <input type="text" value={form.section_title_products} onChange={(e) => setForm({ ...form, section_title_products: e.target.value })} className="brutalist-input text-sm" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Secao Biografia</label>
            <input type="text" value={form.section_title_bio} onChange={(e) => setForm({ ...form, section_title_bio: e.target.value })} className="brutalist-input text-sm" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Secao Galeria</label>
            <input type="text" value={form.section_title_gallery} onChange={(e) => setForm({ ...form, section_title_gallery: e.target.value })} className="brutalist-input text-sm" />
          </div>
        </div>
      </div>

      <div className="brutalist-card p-6 md:p-8">
        <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-6">Rodape (Fundo Secundario)</h3>
        <div className="space-y-4">
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Texto do Rodape</label>
            <input type="text" value={form.footer_text} onChange={(e) => setForm({ ...form, footer_text: e.target.value })} className="brutalist-input" data-testid="settings-footer-text" />
          </div>
          <h4 className="font-bold text-sm uppercase text-zinc-700 pt-2">Cores do Rodape</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: "footer_bg_color", label: "Fundo do Rodape" },
              { key: "footer_text_color", label: "Texto do Rodape" },
              { key: "footer_heading_color", label: "Titulos do Rodape" },
              { key: "footer_link_color", label: "Links do Rodape" },
              { key: "footer_border_color", label: "Borda/Separador" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">{label}</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={form[key] || "#000000"} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="w-10 h-10 border-2 border-zinc-950 cursor-pointer p-0" />
                  <input type="text" value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="brutalist-input flex-1 text-sm" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-4 border-2 border-zinc-300">
            <span className="text-xs font-bold uppercase text-zinc-500 mr-3">Preview:</span>
            <div className="mt-2 p-3 flex gap-3 items-center" style={{ backgroundColor: form.footer_bg_color || "#09090B", borderTop: `2px solid ${form.footer_border_color || "#27272a"}` }}>
              <span className="font-bold text-sm" style={{ color: form.footer_heading_color || "#FFDE00" }}>Titulo</span>
              <span className="text-sm" style={{ color: form.footer_text_color || "#a1a1aa" }}>Texto</span>
              <span className="text-sm underline" style={{ color: form.footer_link_color || "#a1a1aa" }}>Link</span>
            </div>
          </div>
        </div>
      </div>

      <div className="brutalist-card p-6 md:p-8">
        <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-4">Links Customizados</h3>
        <p className="text-xs text-zinc-500 mb-4">Adicione links que aparecem no menu lateral e no rodape do site</p>
        <div className="space-y-2 mb-4">
          {(form.custom_links || []).map((link, i) => (
            <div key={i} className="flex items-center gap-2 bg-zinc-50 border-2 border-zinc-200 p-3">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <input type="text" value={link.label} onChange={(e) => { const links = [...form.custom_links]; links[i] = { ...links[i], label: e.target.value }; setForm({ ...form, custom_links: links }); }} className="brutalist-input text-sm" placeholder="Nome" />
                <input type="text" value={link.url} onChange={(e) => { const links = [...form.custom_links]; links[i] = { ...links[i], url: e.target.value }; setForm({ ...form, custom_links: links }); }} className="brutalist-input text-sm" placeholder="URL (ex: /pagina ou https://...)" />
              </div>
              <button onClick={() => setForm({ ...form, custom_links: form.custom_links.filter((_, j) => j !== i) })} className="p-2 border-2 border-red-500 text-red-500 hover:bg-red-50 flex-shrink-0" data-testid={`remove-link-${i}`}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <button onClick={() => setForm({ ...form, custom_links: [...(form.custom_links || []), { label: "", url: "" }] })} className="flex items-center gap-2 px-4 py-2 border-2 border-zinc-950 font-bold text-xs uppercase hover:bg-zinc-100" data-testid="add-link-btn"><Plus size={14} /> Adicionar Link</button>
      </div>

      <div className="brutalist-card p-6 md:p-8">
        <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-4">Botoes Customizados</h3>
        <p className="text-xs text-zinc-500 mb-4">Adicione botoes que aparecem na home ou no menu do site</p>
        <div className="space-y-2 mb-4">
          {(form.custom_buttons || []).map((btn, i) => (
            <div key={i} className="bg-zinc-50 border-2 border-zinc-200 p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input type="text" value={btn.label} onChange={(e) => { const btns = [...form.custom_buttons]; btns[i] = { ...btns[i], label: e.target.value }; setForm({ ...form, custom_buttons: btns }); }} className="brutalist-input text-sm" placeholder="Texto do botao" />
                  <input type="text" value={btn.url} onChange={(e) => { const btns = [...form.custom_buttons]; btns[i] = { ...btns[i], url: e.target.value }; setForm({ ...form, custom_buttons: btns }); }} className="brutalist-input text-sm" placeholder="URL (ex: /loja ou https://...)" />
                </div>
                <button onClick={() => setForm({ ...form, custom_buttons: form.custom_buttons.filter((_, j) => j !== i) })} className="p-2 border-2 border-red-500 text-red-500 hover:bg-red-50 flex-shrink-0" data-testid={`remove-btn-${i}`}><Trash2 size={14} /></button>
              </div>
              <div className="flex gap-2 mt-2">
                <select value={btn.style || "primary"} onChange={(e) => { const btns = [...form.custom_buttons]; btns[i] = { ...btns[i], style: e.target.value }; setForm({ ...form, custom_buttons: btns }); }} className="brutalist-input text-xs w-auto">
                  <option value="primary">Primario (destaque)</option>
                  <option value="secondary">Secundario (escuro)</option>
                  <option value="outline">Contorno</option>
                </select>
                <select value={btn.position || "home"} onChange={(e) => { const btns = [...form.custom_buttons]; btns[i] = { ...btns[i], position: e.target.value }; setForm({ ...form, custom_buttons: btns }); }} className="brutalist-input text-xs w-auto">
                  <option value="home">Home (hero)</option>
                  <option value="menu">Menu lateral</option>
                  <option value="footer">Rodape</option>
                </select>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setForm({ ...form, custom_buttons: [...(form.custom_buttons || []), { label: "", url: "", style: "primary", position: "home" }] })} className="flex items-center gap-2 px-4 py-2 border-2 border-zinc-950 font-bold text-xs uppercase hover:bg-zinc-100" data-testid="add-btn-btn"><Plus size={14} /> Adicionar Botao</button>
      </div>

      <div className="brutalist-card p-6 md:p-8">
        <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-6">Redes Sociais</h3>
        <p className="text-xs text-zinc-500 mb-4">Cole os links das suas redes sociais. Deixe vazio para ocultar.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Instagram</label>
            <input type="text" value={form.social_instagram} onChange={(e) => setForm({ ...form, social_instagram: e.target.value })} className="brutalist-input text-sm" placeholder="https://instagram.com/seu_perfil" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">YouTube</label>
            <input type="text" value={form.social_youtube} onChange={(e) => setForm({ ...form, social_youtube: e.target.value })} className="brutalist-input text-sm" placeholder="https://youtube.com/@seu_canal" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">TikTok</label>
            <input type="text" value={form.social_tiktok} onChange={(e) => setForm({ ...form, social_tiktok: e.target.value })} className="brutalist-input text-sm" placeholder="https://tiktok.com/@seu_perfil" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Twitter / X</label>
            <input type="text" value={form.social_twitter} onChange={(e) => setForm({ ...form, social_twitter: e.target.value })} className="brutalist-input text-sm" placeholder="https://x.com/seu_perfil" />
          </div>
          <div>
            <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Facebook</label>
            <input type="text" value={form.social_facebook} onChange={(e) => setForm({ ...form, social_facebook: e.target.value })} className="brutalist-input text-sm" placeholder="https://facebook.com/sua_pagina" />
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
          <div className="text-xs font-bold uppercase text-zinc-500 mb-1">Incl. Taxa 5% (seu lucro)</div>
          <div className="font-['Outfit'] font-black text-2xl text-green-700">
            + R$ {balance.platform_fee.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
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


function ShowcaseTab({ items, onRefresh }) {
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");

  const handleAdd = async () => {
    if (!imageUrl) return;
    await showcaseAPI.add({ image_url: imageUrl, title, link, order: items.length });
    setImageUrl(""); setTitle(""); setLink("");
    onRefresh();
  };

  const handleDelete = async (id) => {
    await showcaseAPI.delete(id);
    onRefresh();
  };

  return (
    <div data-testid="showcase-tab">
      <div className="brutalist-card p-6 mb-6">
        <h3 className="font-bold text-sm uppercase mb-4">Adicionar a Vitrine (aparece na Home)</h3>
        <div className="space-y-3">
          <ImageUpload value={imageUrl} onChange={setImageUrl} label="Imagem do projeto/produto" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="Titulo (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} className="brutalist-input text-sm" data-testid="showcase-title-input" />
            <input type="text" placeholder="Link (ex: /campaign/xxx ou /loja)" value={link} onChange={(e) => setLink(e.target.value)} className="brutalist-input text-sm" data-testid="showcase-link-input" />
          </div>
          <button onClick={handleAdd} className="brutalist-btn text-sm" disabled={!imageUrl} data-testid="showcase-add-btn">
            <Plus size={14} className="inline mr-1" /> Adicionar a Vitrine
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => (
          <div key={item.id} className="brutalist-card overflow-hidden">
            <div className="aspect-square overflow-hidden border-b-2 border-zinc-950">
              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-3 flex items-center justify-between">
              <p className="text-xs font-bold truncate flex-1">{item.title || "Sem titulo"}</p>
              <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <div className="brutalist-card p-8 text-center"><p className="text-zinc-500 font-bold uppercase text-sm">Vitrine vazia. Adicione imagens de seus projetos e produtos!</p></div>}
    </div>
  );
}


function VideosTab({ videos, onRefresh }) {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: "", description: "", thumbnail_url: "" });
  const [videoFile, setVideoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileRef = useRef(null);

  const handleUpload = async () => {
    if (!videoFile || !uploadForm.title.trim()) {
      alert("Selecione um video e defina um titulo");
      return;
    }
    setUploading(true);
    setUploadProgress("Enviando video...");
    try {
      const uploadRes = await videosAPI.upload(videoFile);
      setUploadProgress("Salvando informacoes...");
      await videosAPI.create({
        title: uploadForm.title,
        description: uploadForm.description,
        thumbnail_url: uploadForm.thumbnail_url,
        file_id: uploadRes.data.file_id,
        storage_path: uploadRes.data.storage_path,
        content_type: uploadRes.data.content_type,
        size: uploadRes.data.size,
        is_public: true,
      });
      setUploadForm({ title: "", description: "", thumbnail_url: "" });
      setVideoFile(null);
      setShowUpload(false);
      if (fileRef.current) fileRef.current.value = "";
      onRefresh();
      alert("Video publicado!");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Erro ao enviar video");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  };

  const toggleVisibility = async (vid) => {
    await videosAPI.update(vid.id, { is_public: !vid.is_public });
    onRefresh();
  };

  const deleteVideo = async (id) => {
    if (!window.confirm("Excluir este video?")) return;
    await videosAPI.delete(id);
    onRefresh();
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes > 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div data-testid="videos-tab">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-500 font-bold uppercase">{videos.length} video(s)</p>
        <button onClick={() => setShowUpload(!showUpload)} className="brutalist-btn flex items-center gap-2 text-sm" data-testid="add-video-btn">
          <Plus size={16} /> Novo Video
        </button>
      </div>

      {showUpload && (
        <div className="brutalist-card p-6 mb-6" data-testid="video-upload-form">
          <h3 className="font-bold text-sm uppercase mb-4">Publicar Video</h3>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Titulo</label>
              <input type="text" value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} className="brutalist-input" placeholder="Titulo do video" data-testid="video-title-input" />
            </div>
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Descricao (opcional)</label>
              <textarea value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} className="brutalist-input min-h-[80px]" placeholder="Sobre o que e este video..." data-testid="video-description-input" />
            </div>
            <div>
              <ImageUpload value={uploadForm.thumbnail_url} onChange={(url) => setUploadForm({ ...uploadForm, thumbnail_url: url })} label="Thumbnail / Capa (opcional)" />
            </div>
            <div>
              <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Arquivo de Video</label>
              <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="brutalist-input text-sm" data-testid="video-file-input" />
              <p className="text-xs text-zinc-400 mt-1">MP4, WebM, MOV, AVI (max 500MB)</p>
            </div>
            {videoFile && (
              <p className="text-xs text-zinc-600 font-bold">Arquivo: {videoFile.name} ({formatSize(videoFile.size)})</p>
            )}
            {uploadProgress && <p className="text-sm text-zinc-600 font-bold animate-pulse">{uploadProgress}</p>}
            <div className="flex gap-3">
              <button onClick={handleUpload} disabled={uploading} className="brutalist-btn flex items-center gap-2 text-sm" data-testid="publish-video-btn">
                <Upload size={14} /> {uploading ? "Enviando..." : "Publicar Video"}
              </button>
              <button onClick={() => { setShowUpload(false); setVideoFile(null); }} className="px-4 py-2 border-2 border-zinc-300 text-zinc-500 font-bold text-xs uppercase">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {videos.map((vid) => (
          <div key={vid.id} className="brutalist-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4" data-testid={`video-item-${vid.id}`}>
            <div className="w-24 h-16 bg-zinc-900 border-2 border-zinc-950 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {vid.thumbnail_url ? (
                <img src={vid.thumbnail_url} alt={vid.title} className="w-full h-full object-cover" />
              ) : (
                <Play size={20} className="text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-zinc-950 truncate">{vid.title}</h4>
              <div className="flex gap-3 text-xs text-zinc-500 mt-1">
                <span>{new Date(vid.created_at).toLocaleDateString("pt-BR")}</span>
                {vid.size > 0 && <span>{formatSize(vid.size)}</span>}
              </div>
              {vid.description && <p className="text-xs text-zinc-500 mt-1 truncate">{vid.description}</p>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <VisibilitySelector
                value={{ is_public: vid.is_public, subscribers_only: vid.subscribers_only, allowed_plan_ids: vid.allowed_plan_ids || [] }}
                onChange={async (vis) => { await videosAPI.update(vid.id, vis); onRefresh(); }}
              />
              <a href={videosAPI.streamUrl(vid.id)} target="_blank" rel="noopener noreferrer" className="p-2 border-2 border-zinc-950 hover:bg-zinc-100" title="Assistir"><Play size={14} /></a>
              <button onClick={() => deleteVideo(vid.id)} className="p-2 border-2 border-red-500 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {videos.length === 0 && (
          <div className="brutalist-card p-8 text-center">
            <Video size={40} className="mx-auto mb-3 text-zinc-300" />
            <p className="text-zinc-500 font-bold uppercase text-sm">Nenhum video publicado</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SubscriptionsTab({ plans, allSubs, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [newFeature, setNewFeature] = useState("");
  const [editNewFeature, setEditNewFeature] = useState("");

  const emptyForm = { name: "", description: "", price: "", duration_days: "30", features: [], access_lives: true, access_videos: true, access_recordings: true, access_chat: true, highlight: false };
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const addFeature = (isEdit) => {
    const val = isEdit ? editNewFeature.trim() : newFeature.trim();
    if (!val) return;
    if (isEdit) {
      setEditForm(prev => ({ ...prev, features: [...(prev.features || []), val] }));
      setEditNewFeature("");
    } else {
      setForm(prev => ({ ...prev, features: [...(prev.features || []), val] }));
      setNewFeature("");
    }
  };

  const removeFeature = (idx, isEdit) => {
    if (isEdit) {
      setEditForm(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
    } else {
      setForm(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.price) { alert("Preencha nome e preco"); return; }
    setSaving(true);
    try {
      await subscriptionAPI.createPlan({ ...form, price: parseFloat(form.price), duration_days: parseInt(form.duration_days) || 30 });
      setForm(emptyForm);
      setShowCreate(false);
      onRefresh();
    } catch (err) { alert("Erro ao criar plano"); }
    finally { setSaving(false); }
  };

  const startEdit = (plan) => {
    setEditingPlan(plan);
    setEditForm({
      name: plan.name || "",
      description: plan.description || "",
      price: String(plan.price || ""),
      duration_days: String(plan.duration_days || "30"),
      features: plan.features || [],
      access_lives: plan.access_lives !== false,
      access_videos: plan.access_videos !== false,
      access_recordings: plan.access_recordings !== false,
      access_chat: plan.access_chat !== false,
      highlight: plan.highlight || false,
    });
  };

  const handleEdit = async () => {
    if (!editForm.name || !editForm.price) { alert("Preencha nome e preco"); return; }
    setSaving(true);
    try {
      await subscriptionAPI.updatePlan(editingPlan.id, {
        ...editForm,
        price: parseFloat(editForm.price),
        duration_days: parseInt(editForm.duration_days) || 30,
      });
      setEditingPlan(null);
      onRefresh();
    } catch (err) { alert("Erro ao atualizar plano"); }
    finally { setSaving(false); }
  };

  const deletePlan = async (id) => {
    if (!window.confirm("Excluir plano?")) return;
    await subscriptionAPI.deletePlan(id);
    onRefresh();
  };

  const toggleActive = async (plan) => {
    await subscriptionAPI.updatePlan(plan.id, { is_active: !plan.is_active });
    onRefresh();
  };

  const AccessToggles = ({ data, setData, prefix, features, newVal, setNewVal, onAdd, onRemove }) => (
    <div className="border-2 border-zinc-200 p-4">
      <p className="font-bold text-xs uppercase tracking-wider text-zinc-700 mb-3">O que este plano oferece</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: "access_lives", label: "Lives exclusivas" },
          { key: "access_videos", label: "Videos para assinantes" },
          { key: "access_recordings", label: "Gravacoes de lives" },
          { key: "access_chat", label: "Chat ao vivo" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={data[key] !== false} onChange={(e) => setData({ ...data, [key]: e.target.checked })} className="w-4 h-4 border-2 border-zinc-950" data-testid={`${prefix}-${key}`} />
            <span className="text-sm font-bold text-zinc-700">{label}</span>
          </label>
        ))}
      </div>

      {/* Custom items */}
      {(features || []).length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-200 space-y-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-green-500 bg-green-100 flex items-center justify-center flex-shrink-0"><span className="text-green-600 text-xs font-bold">+</span></span>
              <span className="text-sm font-bold text-zinc-700 flex-1">{f}</span>
              <button type="button" onClick={() => onRemove(i)} className="text-red-500 hover:text-red-700" data-testid={`${prefix}-remove-feature-${i}`}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-zinc-200">
        <p className="text-xs text-zinc-500 mb-2">Adicionar item personalizado:</p>
        <div className="flex gap-2">
          <input type="text" value={newVal} onChange={(e) => setNewVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onAdd())} placeholder="Ex: Acesso a conteudo exclusivo" className="brutalist-input text-sm flex-1" data-testid={`${prefix}-feature-input`} />
          <button type="button" onClick={onAdd} className="px-3 py-2 border-2 border-zinc-950 font-bold text-xs uppercase hover:bg-zinc-100" data-testid={`${prefix}-add-feature`}>+</button>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer mt-3 pt-3 border-t border-zinc-200">
        <input type="checkbox" checked={data.highlight || false} onChange={(e) => setData({ ...data, highlight: e.target.checked })} className="w-4 h-4 border-2 border-zinc-950" data-testid={`${prefix}-highlight`} />
        <span className="text-sm font-bold text-amber-700">Destacar plano (recomendado)</span>
      </label>
    </div>
  );

  return (
    <div data-testid="subscriptions-tab">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-['Outfit'] font-bold text-xl uppercase">Planos de Assinatura</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="brutalist-btn flex items-center gap-2 text-sm" data-testid="create-plan-btn">
          <Plus size={16} /> Novo Plano
        </button>
      </div>

      {showCreate && (
        <div className="brutalist-card p-6 mb-6">
          <h4 className="font-bold text-sm uppercase mb-4">Criar Novo Plano</h4>
          <div className="space-y-4 max-w-lg">
            <input type="text" placeholder="Nome do plano" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="brutalist-input text-sm" data-testid="plan-name-input" />
            <textarea placeholder="Descricao do plano" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="brutalist-input text-sm min-h-[60px]" />
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="0.01" placeholder="Preco (R$)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="brutalist-input text-sm" data-testid="plan-price-input" />
              <input type="number" placeholder="Duracao (dias)" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} className="brutalist-input text-sm" />
            </div>
            <AccessToggles data={form} setData={setForm} prefix="create" features={form.features} newVal={newFeature} setNewVal={setNewFeature} onAdd={() => addFeature(false)} onRemove={(i) => removeFeature(i, false)} />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving} className="brutalist-btn text-sm" data-testid="save-plan-btn">{saving ? "Salvando..." : "Criar Plano"}</button>
              <button onClick={() => { setShowCreate(false); setForm(emptyForm); }} className="px-4 py-2 border-2 border-zinc-300 text-zinc-500 font-bold text-xs uppercase hover:bg-zinc-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 mb-10">
        {plans.map((plan) => (
          <div key={plan.id} className="brutalist-card p-4" data-testid={`plan-${plan.id}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-zinc-950">{plan.name}</h4>
                  {plan.highlight && <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold uppercase border border-amber-300">Destaque</span>}
                </div>
                <p className="text-xs text-zinc-500 mt-1">{plan.description}</p>
                {plan.features && plan.features.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {plan.features.map((f, i) => (
                      <span key={i} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-xs font-bold border border-zinc-200">{f}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 mt-2">
                  {plan.access_lives !== false && <span className="text-xs text-green-600 font-bold">Lives</span>}
                  {plan.access_videos !== false && <span className="text-xs text-green-600 font-bold">Videos</span>}
                  {plan.access_recordings !== false && <span className="text-xs text-green-600 font-bold">Gravacoes</span>}
                  {plan.access_chat !== false && <span className="text-xs text-green-600 font-bold">Chat</span>}
                </div>
              </div>
              <div className="font-['Outfit'] font-black text-lg">R$ {parseFloat(plan.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}<span className="text-xs text-zinc-500 font-normal">/{plan.duration_days}d</span></div>
              <div className="flex gap-2">
                <button onClick={() => toggleActive(plan)} className={`px-3 py-1 border-2 text-xs font-bold uppercase ${plan.is_active ? "border-green-500 text-green-700 bg-green-50" : "border-zinc-300 text-zinc-500"}`} data-testid={`toggle-plan-${plan.id}`}>
                  {plan.is_active ? "Ativo" : "Inativo"}
                </button>
                <button onClick={() => startEdit(plan)} className="p-2 border-2 border-zinc-950 hover:bg-zinc-100" data-testid={`edit-plan-${plan.id}`} title="Editar"><Edit2 size={14} /></button>
                <button onClick={() => deletePlan(plan.id)} className="p-2 border-2 border-red-500 text-red-500 hover:bg-red-50" data-testid={`delete-plan-${plan.id}`}><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
        {plans.length === 0 && <div className="brutalist-card p-6 text-center"><p className="text-zinc-500 font-bold uppercase text-sm">Crie seu primeiro plano de assinatura</p></div>}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="brutalist-card bg-white w-full max-w-lg p-6 md:p-8 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-['Outfit'] font-black text-xl uppercase">Editar Plano</h2>
              <button onClick={() => setEditingPlan(null)} className="p-2 hover:bg-zinc-100"><span className="text-xl">&times;</span></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Nome do Plano</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="brutalist-input text-sm" data-testid="edit-plan-name" />
              </div>
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Descricao</label>
                <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="brutalist-input text-sm min-h-[80px]" data-testid="edit-plan-description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Preco (R$)</label>
                  <input type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} className="brutalist-input text-sm" data-testid="edit-plan-price" />
                </div>
                <div>
                  <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Duracao (dias)</label>
                  <input type="number" value={editForm.duration_days} onChange={(e) => setEditForm({ ...editForm, duration_days: e.target.value })} className="brutalist-input text-sm" data-testid="edit-plan-duration" />
                </div>
              </div>
              <AccessToggles data={editForm} setData={setEditForm} prefix="edit" features={editForm.features} newVal={editNewFeature} setNewVal={setEditNewFeature} onAdd={() => addFeature(true)} onRemove={(i) => removeFeature(i, true)} />
              <div className="flex gap-3 pt-2">
                <button onClick={handleEdit} disabled={saving} className="brutalist-btn text-sm flex-1" data-testid="save-edit-plan-btn">{saving ? "Salvando..." : "Salvar Alteracoes"}</button>
                <button onClick={() => setEditingPlan(null)} className="px-4 py-2 border-2 border-zinc-300 text-zinc-500 font-bold text-xs uppercase hover:bg-zinc-50">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscribers list */}
      <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-4">Assinantes ({allSubs.length})</h3>
      {allSubs.length > 0 ? (
        <div className="brutalist-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 text-white">
              <tr>
                <th className="p-3 text-left font-bold uppercase text-xs">Nome</th>
                <th className="p-3 text-left font-bold uppercase text-xs">Email</th>
                <th className="p-3 text-left font-bold uppercase text-xs">Plano</th>
                <th className="p-3 text-left font-bold uppercase text-xs">Expira</th>
                <th className="p-3 text-left font-bold uppercase text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {allSubs.map((s) => (
                <tr key={s.id} className="border-b-2 border-zinc-100">
                  <td className="p-3 font-medium">{s.user_name}</td>
                  <td className="p-3 text-zinc-600">{s.user_email}</td>
                  <td className="p-3">{s.plan_name}</td>
                  <td className="p-3 text-zinc-500">{new Date(s.expires_at).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3"><span className={`px-2 py-1 text-xs font-bold uppercase ${s.status === "active" ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-500"}`}>{s.status === "active" ? "Ativo" : s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="brutalist-card p-6 text-center"><p className="text-zinc-500 font-bold uppercase text-sm">Nenhum assinante ainda</p></div>
      )}
    </div>
  );
}


function CouponsTab({ coupons, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { code: "", discount_type: "fixed", discount_value: "", max_uses: "", applies_to: "all", expires_at: "" };
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const handleCreate = async () => {
    if (!form.code || !form.discount_value) { alert("Preencha o codigo e valor do desconto"); return; }
    setSaving(true);
    try {
      await couponAPI.create({ ...form, discount_value: parseFloat(form.discount_value), max_uses: form.max_uses ? parseInt(form.max_uses) : null });
      setForm(emptyForm);
      setShowCreate(false);
      onRefresh();
    } catch (err) { alert(err.response?.data?.detail || "Erro ao criar cupom"); }
    finally { setSaving(false); }
  };

  const startEdit = (c) => {
    setEditing(c);
    setEditForm({ code: c.code, discount_type: c.discount_type, discount_value: String(c.discount_value), max_uses: c.max_uses ? String(c.max_uses) : "", applies_to: c.applies_to || "all", expires_at: c.expires_at ? c.expires_at.split("T")[0] : "" });
  };

  const handleEdit = async () => {
    if (!editForm.code || !editForm.discount_value) { alert("Preencha o codigo e valor"); return; }
    setSaving(true);
    try {
      await couponAPI.update(editing.id, { ...editForm, discount_value: parseFloat(editForm.discount_value), max_uses: editForm.max_uses ? parseInt(editForm.max_uses) : null });
      setEditing(null);
      onRefresh();
    } catch (err) { alert(err.response?.data?.detail || "Erro"); }
    finally { setSaving(false); }
  };

  const toggleActive = async (c) => {
    await couponAPI.update(c.id, { is_active: !c.is_active });
    onRefresh();
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm("Excluir cupom?")) return;
    await couponAPI.delete(id);
    onRefresh();
  };

  const appliesLabel = { all: "Tudo", campaigns: "Campanhas", products: "Produtos", subscriptions: "Assinaturas" };

  const CouponForm = ({ data, setData, onSave, onCancel, btnLabel }) => (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Codigo do Cupom</label>
        <input type="text" value={data.code} onChange={(e) => setData({ ...data, code: e.target.value.toUpperCase() })} placeholder="Ex: DESCONTO20" className="brutalist-input text-sm font-mono" data-testid="coupon-code-input" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Tipo de Desconto</label>
          <select value={data.discount_type} onChange={(e) => setData({ ...data, discount_type: e.target.value })} className="brutalist-input text-sm" data-testid="coupon-type-select">
            <option value="fixed">Valor fixo (R$)</option>
            <option value="percent">Porcentagem (%)</option>
          </select>
        </div>
        <div>
          <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">{data.discount_type === "percent" ? "Desconto (%)" : "Desconto (R$)"}</label>
          <input type="number" step="0.01" value={data.discount_value} onChange={(e) => setData({ ...data, discount_value: e.target.value })} placeholder={data.discount_type === "percent" ? "Ex: 15" : "Ex: 10.00"} className="brutalist-input text-sm" data-testid="coupon-value-input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Valido para</label>
          <select value={data.applies_to} onChange={(e) => setData({ ...data, applies_to: e.target.value })} className="brutalist-input text-sm" data-testid="coupon-applies-select">
            <option value="all">Tudo (campanhas, loja, assinaturas)</option>
            <option value="campaigns">Somente Campanhas</option>
            <option value="products">Somente Produtos</option>
            <option value="subscriptions">Somente Assinaturas</option>
          </select>
        </div>
        <div>
          <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Maximo de usos (0 = ilimitado)</label>
          <input type="number" value={data.max_uses} onChange={(e) => setData({ ...data, max_uses: e.target.value })} placeholder="0" className="brutalist-input text-sm" data-testid="coupon-max-uses" />
        </div>
      </div>
      <div>
        <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Data de expiracao (opcional)</label>
        <input type="date" value={data.expires_at} onChange={(e) => setData({ ...data, expires_at: e.target.value })} className="brutalist-input text-sm" data-testid="coupon-expires" />
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} disabled={saving} className="brutalist-btn text-sm" data-testid="coupon-save-btn">{saving ? "Salvando..." : btnLabel}</button>
        <button onClick={onCancel} className="px-4 py-2 border-2 border-zinc-300 text-zinc-500 font-bold text-xs uppercase hover:bg-zinc-50">Cancelar</button>
      </div>
    </div>
  );

  return (
    <div data-testid="coupons-tab">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-['Outfit'] font-bold text-xl uppercase">Cupons de Desconto</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="brutalist-btn flex items-center gap-2 text-sm" data-testid="create-coupon-btn">
          <Plus size={16} /> Novo Cupom
        </button>
      </div>

      {showCreate && (
        <div className="brutalist-card p-6 mb-6">
          <h4 className="font-bold text-sm uppercase mb-4">Criar Novo Cupom</h4>
          <CouponForm data={form} setData={setForm} onSave={handleCreate} onCancel={() => { setShowCreate(false); setForm(emptyForm); }} btnLabel="Criar Cupom" />
        </div>
      )}

      <div className="space-y-3">
        {coupons.map((c) => (
          <div key={c.id} className="brutalist-card p-4" data-testid={`coupon-${c.id}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--site-primary,#FFDE00)] border-2 border-zinc-950 flex items-center justify-center flex-shrink-0">
                  {c.discount_type === "percent" ? <Percent size={18} /> : <Tag size={18} />}
                </div>
                <div>
                  <h4 className="font-mono font-bold text-lg text-zinc-950">{c.code}</h4>
                  <p className="text-xs text-zinc-500">
                    {c.discount_type === "percent" ? `${c.discount_value}% de desconto` : `R$ ${parseFloat(c.discount_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de desconto`}
                    {" "}em <span className="font-bold">{appliesLabel[c.applies_to] || "Tudo"}</span>
                  </p>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-3 text-xs text-zinc-500">
                <span>{c.uses || 0}{c.max_uses ? `/${c.max_uses}` : ""} usos</span>
                {c.expires_at && <span>Expira: {new Date(c.expires_at).toLocaleDateString("pt-BR")}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleActive(c)} className={`px-3 py-1 border-2 text-xs font-bold uppercase ${c.is_active ? "border-green-500 text-green-700 bg-green-50" : "border-zinc-300 text-zinc-500"}`} data-testid={`toggle-coupon-${c.id}`}>
                  {c.is_active ? "Ativo" : "Inativo"}
                </button>
                <button onClick={() => startEdit(c)} className="p-2 border-2 border-zinc-950 hover:bg-zinc-100" data-testid={`edit-coupon-${c.id}`}><Edit2 size={14} /></button>
                <button onClick={() => deleteCoupon(c.id)} className="p-2 border-2 border-red-500 text-red-500 hover:bg-red-50" data-testid={`delete-coupon-${c.id}`}><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
        {coupons.length === 0 && <div className="brutalist-card p-8 text-center"><Tag size={36} className="mx-auto mb-3 text-zinc-300" /><p className="text-zinc-500 font-bold uppercase text-sm">Nenhum cupom criado ainda</p></div>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="brutalist-card bg-white w-full max-w-lg p-6 md:p-8 my-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-['Outfit'] font-black text-xl uppercase">Editar Cupom</h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-zinc-100"><span className="text-xl">&times;</span></button>
            </div>
            <CouponForm data={editForm} setData={setEditForm} onSave={handleEdit} onCancel={() => setEditing(null)} btnLabel="Salvar Alteracoes" />
          </div>
        </div>
      )}
    </div>
  );
}


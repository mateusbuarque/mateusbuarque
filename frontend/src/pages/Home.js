import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CampaignCard from "../components/CampaignCard";
import Marquee from "../components/Marquee";
import { useSiteSettings } from "../contexts/SiteSettingsContext";
import { campaignAPI, bioAPI, galleryAPI, newsletterAPI, showcaseAPI } from "../lib/api";
import { ArrowRight, BookOpen, Users, Target } from "lucide-react";

export default function Home() {
  const { settings } = useSiteSettings();
  const [campaigns, setCampaigns] = useState([]);
  const [bio, setBio] = useState({ content: "", photo_url: "" });
  const [gallery, setGallery] = useState([]);
  const [showcase, setShowcase] = useState([]);
  const [email, setEmail] = useState("");
  const [subMsg, setSubMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      campaignAPI.getAll(),
      bioAPI.get(),
      galleryAPI.getAll(),
      showcaseAPI.getAll(),
    ]).then(([campRes, bioRes, galRes, showRes]) => {
      setCampaigns(campRes.data);
      setBio(bioRes.data);
      setGallery(galRes.data);
      setShowcase(showRes.data);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await newsletterAPI.subscribe(email);
      setSubMsg(res.data.message);
      setEmail("");
    } catch {
      setSubMsg("Erro ao inscrever. Tente novamente.");
    }
  };

  const featured = campaigns.find((c) => c.is_active) || campaigns[0];
  const activeCampaigns = campaigns.filter((c) => c.is_active);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-['Outfit'] font-black text-2xl uppercase animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      {/* HERO */}
      <section className="relative py-16 md:py-24 overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 dot-pattern" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-12 gap-8 items-center">
            <div className="col-span-12 md:col-span-7">
              <h1 className="font-['Outfit'] text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-6" style={{ color: settings.text_color }}>
                {(settings.hero_title || "Apoie a Comedia. Leia um livro.").split(".").map((part, i, arr) => (
                  <span key={i}>
                    {i === 0 ? part : <><span style={{ color: settings.primary_color, WebkitTextStroke: `2px ${settings.secondary_color}` }}>{part}</span></>}
                    {i < arr.length - 1 ? "." : ""}
                    {i === 0 && <br />}
                  </span>
                ))}
              </h1>
              <p className="text-base md:text-lg text-zinc-600 leading-relaxed mb-8 max-w-lg">
                {settings.hero_subtitle}
              </p>
              <div className="flex flex-wrap gap-4">
                <a href={settings.nav_url_campaigns || "#campanhas"} className="brutalist-btn flex items-center gap-2" data-testid="hero-support-btn" style={{ backgroundColor: settings.btn_color, color: settings.btn_text_color }}>
                  {settings.btn_label_hero_primary || "Ver Campanhas"} <ArrowRight size={18} />
                </a>
                <a href={settings.nav_url_bio || "#biografia"} className="brutalist-btn-dark flex items-center gap-2">
                  {settings.btn_label_hero_secondary || "Sobre Edegar"}
                </a>
                {(settings.custom_buttons || []).filter(b => b.label && b.url && b.position === "home").map((btn, i) => (
                  <a key={i} href={btn.url} className={`flex items-center gap-2 font-bold text-sm uppercase tracking-wider px-6 py-3 border-2 border-zinc-950 transition-all ${
                    btn.style === "secondary" ? "bg-zinc-950 text-white hover:bg-zinc-800" :
                    btn.style === "outline" ? "bg-transparent text-zinc-950 hover:bg-zinc-100" :
                    "hover:translate-y-[-2px]"
                  }`} style={btn.style === "primary" ? { backgroundColor: settings.btn_color, color: settings.btn_text_color } : {}} data-testid={`hero-custom-btn-${i}`}>
                    {btn.label}
                  </a>
                ))}
              </div>

              <div className="flex gap-8 mt-12">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center">
                    <BookOpen size={20} className="text-zinc-950" />
                  </div>
                  <div>
                    <div className="font-['Outfit'] font-black text-2xl">{campaigns.length}</div>
                    <div className="text-xs text-zinc-500 font-bold uppercase">Campanhas</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center">
                    <Users size={20} className="text-zinc-950" />
                  </div>
                  <div>
                    <div className="font-['Outfit'] font-black text-2xl">
                      {campaigns.reduce((s, c) => s + (c.backers_count || 0), 0)}
                    </div>
                    <div className="text-xs text-zinc-500 font-bold uppercase">Apoiadores</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center">
                    <Target size={20} className="text-zinc-950" />
                  </div>
                  <div>
                    <div className="font-['Outfit'] font-black text-2xl">
                      R$ {campaigns.reduce((s, c) => s + (c.raised_amount || 0), 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-zinc-500 font-bold uppercase">Arrecadado</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 md:col-span-5">
              {featured ? (
                <Link to={`/campaign/${featured.id}`} className="brutalist-card block overflow-hidden" data-testid="featured-campaign">
                  <div className="border-b-2 border-zinc-950">
                    <img src={featured.cover_image} alt={featured.title} className="w-full h-72 object-cover" />
                  </div>
                  <div className="p-6">
                    <span className="bg-[#FFDE00] text-zinc-950 px-3 py-1 text-xs font-bold uppercase tracking-wider border-2 border-zinc-950 inline-block mb-3">
                      Em Destaque
                    </span>
                    <h3 className="font-['Outfit'] font-bold text-xl mb-3">{featured.title}</h3>
                    <div className="brutalist-progress mb-2">
                      <div
                        className="brutalist-progress-fill"
                        style={{ width: `${featured.goal_amount > 0 ? Math.min((featured.raised_amount / featured.goal_amount) * 100, 100) : 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-bold">R$ {(featured.raised_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                      <span className="text-zinc-500">meta: R$ {(featured.goal_amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="brutalist-card p-8 text-center">
                  <p className="text-zinc-500 font-bold uppercase text-sm">Nenhuma campanha ativa no momento</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <Marquee />

      {/* SHOWCASE / VITRINE */}
      {showcase.length > 0 && (
        <section className="py-16 md:py-24 bg-zinc-50" data-testid="showcase-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-['Outfit'] text-3xl md:text-5xl font-extrabold uppercase tracking-tighter mb-12" style={{ color: settings.heading_color }}>
              Projetos & Produtos
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {showcase.map((item, i) => (
                <a
                  key={item.id}
                  href={item.link || "#"}
                  className="brutalist-card overflow-hidden group block"
                  data-testid={`showcase-item-${i}`}
                >
                  <div className="aspect-square overflow-hidden border-b-2 border-zinc-950">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  {item.title && (
                    <div className="p-3">
                      <p className="font-bold text-sm text-center truncate" style={{ color: settings.text_color }}>{item.title}</p>
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CAMPAIGNS */}
      <section id="campanhas" className="py-24 md:py-32" data-testid="campaigns-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-['Outfit'] text-3xl md:text-5xl font-extrabold uppercase tracking-tighter mb-12" style={{ color: settings.heading_color }}>
            {settings.nav_label_campaigns || "Campanhas"}
          </h2>
          {activeCampaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {activeCampaigns.map((c, i) => (
                <CampaignCard key={c.id} campaign={c} index={i} />
              ))}
            </div>
          ) : (
            <div className="brutalist-card p-12 text-center">
              <p className="font-['Outfit'] font-bold text-xl text-zinc-500 uppercase">
                Nenhuma campanha ativa no momento
              </p>
              <p className="text-zinc-400 mt-2">Volte em breve para novidades!</p>
            </div>
          )}
        </div>
      </section>

      {/* BIOGRAPHY */}
      <section id="biografia" className="py-24 md:py-32 bg-zinc-50" data-testid="biography-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-['Outfit'] text-3xl md:text-5xl font-extrabold uppercase tracking-tighter mb-12" style={{ color: settings.heading_color }}>
            {settings.nav_label_bio || "Biografia"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-4">
              <div className="brutalist-card overflow-hidden">
                <img
                  src={bio.photo_url || "https://images.unsplash.com/photo-1607207355078-b66a28c30db2?w=600"}
                  alt="Edegar Agostinho"
                  className="w-full h-96 object-cover"
                />
              </div>
            </div>
            <div className="md:col-span-8">
              <div className="brutalist-card p-8">
                <p className="text-base md:text-lg text-zinc-700 leading-relaxed first-letter:text-6xl first-letter:font-black first-letter:font-['Outfit'] first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-[#FFDE00]" style={{ WebkitTextStroke: "0" }}>
                  {bio.content || "Biografia em breve..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="galeria" className="py-24 md:py-32" data-testid="gallery-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-['Outfit'] text-3xl md:text-5xl font-extrabold uppercase tracking-tighter mb-12" style={{ color: settings.heading_color }}>
            {settings.nav_label_gallery || "Galeria"}
          </h2>
          {gallery.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {gallery.map((item, i) => (
                <div key={item.id} className="brutalist-card overflow-hidden" data-testid={`gallery-item-${i}`}>
                  <img src={item.image_url} alt={item.caption} className="w-full h-64 object-cover border-b-2 border-zinc-950" />
                  <div className="p-4">
                    <p className="font-bold text-sm text-zinc-700">{item.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="brutalist-card p-12 text-center">
              <p className="text-zinc-500 font-bold uppercase">Galeria em breve</p>
            </div>
          )}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="bg-[#FFDE00] py-24 md:py-32 border-y-2 border-zinc-950" data-testid="newsletter-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-['Outfit'] text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4 text-zinc-950">
            Receba piadas (e spam de livros) no seu email.
          </h2>
          <p className="text-zinc-800 mb-8 text-base md:text-lg">Cadastre-se na newsletter e fique por dentro das novidades.</p>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4 max-w-xl">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="brutalist-input flex-1"
              data-testid="newsletter-email-input"
            />
            <button type="submit" className="brutalist-btn-dark whitespace-nowrap" data-testid="newsletter-submit-btn">
              Inscrever
            </button>
          </form>
          {subMsg && (
            <p className="mt-4 font-bold text-sm text-zinc-800" data-testid="newsletter-message">{subMsg}</p>
          )}
        </div>
      </section>
    </div>
  );
}

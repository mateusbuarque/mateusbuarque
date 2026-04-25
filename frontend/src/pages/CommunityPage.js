import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { communityAPI, subscriptionAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useSiteSettings } from "../contexts/SiteSettingsContext";
import { Users, Lock, Tag, Link2, Pin, Video, FileText, ExternalLink } from "lucide-react";

export default function CommunityPage() {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    subscriptionAPI.plans().then(r => setPlans(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setError("login");
      return;
    }
    communityAPI.getPosts()
      .then(r => setPosts(r.data))
      .catch(err => {
        if (err.response?.status === 403) setError("not_subscriber");
        else if (err.response?.status === 401) setError("login");
        else setError("generic");
      })
      .finally(() => setLoading(false));
  }, [user]);

  const getPlanName = (id) => {
    const p = plans.find(pl => pl.id === id);
    return p ? p.name : id;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse font-bold uppercase text-xl">Carregando...</div></div>;

  if (error === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="brutalist-card p-8 md:p-12 text-center max-w-md w-full">
          <Lock size={48} className="mx-auto mb-4 text-zinc-400" />
          <h2 className="font-['Outfit'] font-black text-2xl uppercase mb-3">Area Exclusiva</h2>
          <p className="text-zinc-600 mb-6">Faca login para acessar a comunidade.</p>
          <Link to="/login" className="brutalist-btn inline-block text-sm" data-testid="community-login-btn">Entrar / Cadastrar</Link>
        </div>
      </div>
    );
  }

  if (error === "not_subscriber") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="brutalist-card p-8 md:p-12 text-center max-w-md w-full">
          <Users size={48} className="mx-auto mb-4 text-amber-500" />
          <h2 className="font-['Outfit'] font-black text-2xl uppercase mb-3">Comunidade Exclusiva</h2>
          <p className="text-zinc-600 mb-6">Esta area e exclusiva para assinantes. Assine um plano para participar da comunidade e receber novidades, cupons e conteudos especiais.</p>
          <Link to="/assinatura" className="brutalist-btn inline-block text-sm" data-testid="community-subscribe-btn">Ver Planos</Link>
        </div>
      </div>
    );
  }

  const pinned = posts.filter(p => p.pinned);
  const regular = posts.filter(p => !p.pinned);

  const typeIcon = (type) => {
    switch(type) {
      case "coupon": return <Tag size={18} />;
      case "video": return <Video size={18} />;
      case "link": return <Link2 size={18} />;
      default: return <FileText size={18} />;
    }
  };

  const typeLabel = (type) => {
    switch(type) {
      case "coupon": return "Cupom";
      case "video": return "Video";
      case "link": return "Link";
      default: return "Novidade";
    }
  };

  const PostCard = ({ post }) => (
    <div className={`brutalist-card p-6 ${post.pinned ? "border-l-4 border-l-amber-400" : ""}`} data-testid={`community-post-${post.id}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 border-2 border-zinc-950" style={{ backgroundColor: settings.primary_color || "#FFDE00" }}>
          {typeIcon(post.post_type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {post.pinned && <Pin size={14} className="text-amber-600" />}
            <span className="px-2 py-0.5 text-xs font-bold uppercase border" style={{ borderColor: settings.primary_color, color: settings.primary_color }}>{typeLabel(post.post_type)}</span>
            {post.target_plans && post.target_plans.length > 0 && (
              <span className="text-xs text-zinc-400">{post.target_plans.map(id => getPlanName(id)).join(", ")}</span>
            )}
          </div>
          <h3 className="font-['Outfit'] font-bold text-lg text-zinc-950">{post.title}</h3>
          <p className="text-sm text-zinc-600 mt-2 whitespace-pre-wrap">{post.content}</p>

          {post.coupon_code && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-green-500 bg-green-50">
              <Tag size={16} className="text-green-600" />
              <span className="font-mono font-bold text-green-800 text-lg">{post.coupon_code}</span>
              <button onClick={() => { navigator.clipboard.writeText(post.coupon_code); }} className="text-xs text-green-600 font-bold uppercase hover:underline">Copiar</button>
            </div>
          )}

          {post.media_url && (
            <div className="mt-3">
              {post.post_type === "video" ? (
                <video src={post.media_url} controls className="w-full max-w-lg aspect-video bg-black border-2 border-zinc-950" />
              ) : (
                <img src={post.media_url} alt="" className="max-w-lg w-full border-2 border-zinc-950" />
              )}
            </div>
          )}

          {post.links && post.links.length > 0 && (
            <div className="mt-3 space-y-1">
              {post.links.filter(l => l.url).map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold hover:underline" style={{ color: settings.link_color || "#3F3F46" }} data-testid={`post-link-${i}`}>
                  <ExternalLink size={14} /> {link.label || link.url}
                </a>
              ))}
            </div>
          )}

          <p className="text-xs text-zinc-400 mt-3">
            {post.author_name} - {new Date(post.created_at).toLocaleDateString("pt-BR")} {new Date(post.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="py-16 md:py-24" data-testid="community-page">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-14 h-14 flex items-center justify-center border-2 border-zinc-950" style={{ backgroundColor: settings.primary_color || "#FFDE00" }}>
            <Users size={24} className="text-zinc-950" />
          </div>
          <div>
            <h1 className="font-['Outfit'] text-3xl md:text-5xl font-black uppercase tracking-tighter" style={{ color: settings.heading_color }}>Comunidade</h1>
            <p className="text-sm font-bold uppercase" style={{ color: settings.subtitle_color }}>Area exclusiva para assinantes</p>
          </div>
        </div>

        <div className="space-y-4">
          {pinned.map(post => <PostCard key={post.id} post={post} />)}
          {regular.map(post => <PostCard key={post.id} post={post} />)}
          {posts.length === 0 && (
            <div className="brutalist-card p-12 text-center">
              <Users size={48} className="mx-auto mb-4 text-zinc-300" />
              <p className="font-['Outfit'] font-bold text-xl text-zinc-500 uppercase">Nenhuma novidade ainda</p>
              <p className="text-sm text-zinc-400 mt-2">O admin publicara conteudos exclusivos aqui em breve.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

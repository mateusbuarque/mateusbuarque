import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { videosAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useSiteSettings } from "../contexts/SiteSettingsContext";
import { Play, Video, Lock } from "lucide-react";

export default function VideosPage() {
  const { settings } = useSiteSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [playing, setPlaying] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    videosAPI.getAll()
      .then((r) => setVideos(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePlay = (vid) => {
    if (vid.locked) {
      if (!user) {
        navigate("/login");
      } else {
        navigate("/assinatura");
      }
      return;
    }
    setPlaying(vid);
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="font-['Outfit'] font-black text-2xl uppercase animate-pulse">Carregando...</div></div>;
  }

  return (
    <div className="py-16 md:py-24" data-testid="videos-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-14 h-14 bg-[var(--site-primary,#FFDE00)] border-2 border-zinc-950 flex items-center justify-center">
            <Video size={24} className="text-zinc-950" />
          </div>
          <div>
            <h1 className="font-['Outfit'] text-3xl md:text-5xl font-black uppercase tracking-tighter" style={{ color: settings.heading_color }}>Videos</h1>
            <p className="text-sm font-bold uppercase" style={{ color: settings.subtitle_color }}>{videos.length} video(s)</p>
          </div>
        </div>

        {/* Player */}
        {playing && !playing.locked && (
          <div className="mb-10" data-testid="video-player-section">
            <video
              src={videosAPI.streamUrl(playing.id)}
              controls
              autoPlay
              className="w-full max-w-4xl aspect-video bg-black border-2 border-zinc-950"
              data-testid="video-player"
            />
            <div className="mt-4 max-w-4xl">
              <h2 className="font-['Outfit'] font-bold text-2xl" style={{ color: settings.heading_color }}>{playing.title}</h2>
              {playing.description && <p className="text-zinc-600 mt-2">{playing.description}</p>}
              <p className="text-xs text-zinc-400 mt-2">{new Date(playing.created_at).toLocaleDateString("pt-BR")}</p>
            </div>
          </div>
        )}

        {/* Grid */}
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((vid, i) => (
              <button
                key={vid.id}
                onClick={() => handlePlay(vid)}
                className={`brutalist-card overflow-hidden text-left group ${playing?.id === vid.id ? "ring-4 ring-[var(--site-primary,#FFDE00)]" : ""} ${vid.locked ? "opacity-80" : ""}`}
                data-testid={`video-tile-${i}`}
              >
                <div className="relative aspect-video bg-zinc-900 border-b-2 border-zinc-950 overflow-hidden">
                  {vid.thumbnail_url ? (
                    <img src={vid.thumbnail_url} alt={vid.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play size={40} className="text-zinc-600" />
                    </div>
                  )}
                  {vid.locked ? (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <Lock size={32} className="text-white" />
                      <span className="text-white text-xs font-bold uppercase tracking-wider px-3 py-1 bg-amber-500 border border-amber-600">
                        Exclusivo para assinantes
                      </span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play size={24} className="text-zinc-950 ml-1" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-zinc-950 truncate flex-1">{vid.title}</h3>
                    {vid.locked && <Lock size={14} className="text-amber-600 flex-shrink-0" />}
                  </div>
                  <div className="flex gap-3 text-xs text-zinc-500 mt-1">
                    <span>{new Date(vid.created_at).toLocaleDateString("pt-BR")}</span>
                    {vid.size > 0 && <span>{formatSize(vid.size)}</span>}
                  </div>
                  {vid.description && <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{vid.description}</p>}
                  {vid.locked && (
                    <p className="text-xs text-amber-600 font-bold mt-2 uppercase">
                      {!user ? "Faca login para assistir" : "Assine para desbloquear"}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="brutalist-card p-12 text-center">
            <Video size={48} className="mx-auto mb-4 text-zinc-300" />
            <p className="font-['Outfit'] font-bold text-xl text-zinc-500 uppercase">Nenhum video disponivel</p>
            <Link to="/" className="brutalist-btn inline-block mt-6 text-sm">Voltar ao Inicio</Link>
          </div>
        )}
      </div>
    </div>
  );
}

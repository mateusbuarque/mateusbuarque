import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSiteSettings } from "../contexts/SiteSettingsContext";
import api from "../lib/api";
import { Radio, Users, MessageCircle, Send } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://");

export default function LivePage() {
  const { user } = useAuth();
  const { settings } = useSiteSettings();
  const [liveStatus, setLiveStatus] = useState({ is_live: false, title: "", viewer_count: 0 });
  const [chat, setChat] = useState([]);
  const [chatMsg, setChatMsg] = useState("");
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const queueRef = useRef([]);
  const chatEndRef = useRef(null);

  // Poll live status
  useEffect(() => {
    const poll = () => {
      api.get("/live/status").then(r => setLiveStatus(r.data)).catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  // Load chat
  useEffect(() => {
    if (liveStatus.is_live) {
      api.get("/live/chat").then(r => setChat(r.data)).catch(() => {});
    }
  }, [liveStatus.is_live]);

  // Connect to stream WebSocket
  useEffect(() => {
    if (!liveStatus.is_live) return;

    const video = videoRef.current;
    if (!video) return;

    // MediaSource for playback
    const ms = new MediaSource();
    mediaSourceRef.current = ms;
    video.src = URL.createObjectURL(ms);

    ms.addEventListener("sourceopen", () => {
      try {
        const sb = ms.addSourceBuffer('video/webm; codecs="vp8,opus"');
        sourceBufferRef.current = sb;
        sb.mode = "sequence";
        sb.addEventListener("updateend", () => {
          if (queueRef.current.length > 0 && !sb.updating) {
            sb.appendBuffer(queueRef.current.shift());
          }
        });
      } catch (e) {
        console.error("SourceBuffer error:", e);
      }
    });

    // WebSocket viewer connection
    const ws = new WebSocket(`${WS_URL}/ws/live/watch`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onmessage = (event) => {
      if (typeof event.data === "string") {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "chat") {
            setChat(prev => [...prev.slice(-49), msg.data]);
          } else if (msg.type === "live_ended") {
            setLiveStatus(prev => ({ ...prev, is_live: false }));
          }
        } catch {}
        return;
      }

      const sb = sourceBufferRef.current;
      if (sb && !sb.updating) {
        try { sb.appendBuffer(new Uint8Array(event.data)); } catch { queueRef.current.push(new Uint8Array(event.data)); }
      } else {
        queueRef.current.push(new Uint8Array(event.data));
      }
    };

    ws.onclose = () => console.log("Viewer WS closed");

    return () => {
      ws.close();
      if (video.src) URL.revokeObjectURL(video.src);
      queueRef.current = [];
    };
  }, [liveStatus.is_live]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendChat = async () => {
    if (!chatMsg.trim() || !user) return;
    try {
      await api.post("/live/chat", { message: chatMsg });
      setChatMsg("");
    } catch {}
  };

  return (
    <div className="min-h-screen bg-zinc-950" data-testid="live-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {liveStatus.is_live ? (
          <div className="grid grid-cols-12 gap-6">
            {/* Video */}
            <div className="col-span-12 lg:col-span-8">
              <div className="relative">
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                  <span className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider animate-pulse">
                    <Radio size={14} /> AO VIVO
                  </span>
                  <span className="flex items-center gap-2 bg-black/70 text-white px-3 py-1 text-xs font-bold">
                    <Users size={14} /> {liveStatus.viewer_count}
                  </span>
                </div>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted={false}
                  className="w-full aspect-video bg-black border-2 border-zinc-800"
                  data-testid="live-video"
                />
              </div>
              <div className="mt-4">
                <h1 className="font-['Outfit'] font-black text-2xl text-white uppercase">{liveStatus.title}</h1>
                <p className="text-zinc-400 text-sm mt-1">{settings.site_name} - Ao Vivo</p>
              </div>
            </div>

            {/* Chat */}
            <div className="col-span-12 lg:col-span-4">
              <div className="border-2 border-zinc-800 h-[calc(56.25vw-2rem)] lg:h-[500px] flex flex-col bg-zinc-900">
                <div className="p-3 border-b-2 border-zinc-800 flex items-center gap-2">
                  <MessageCircle size={16} className="text-zinc-400" />
                  <span className="font-bold text-sm text-white uppercase">Chat ao Vivo</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {chat.map((msg, i) => (
                    <div key={msg.id || i} className="text-sm">
                      <span className="font-bold text-[var(--site-primary,#FFDE00)]">{msg.user_name}: </span>
                      <span className="text-zinc-300">{msg.message}</span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                {user ? (
                  <div className="p-3 border-t-2 border-zinc-800 flex gap-2">
                    <input
                      type="text"
                      value={chatMsg}
                      onChange={(e) => setChatMsg(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChat()}
                      placeholder="Envie uma mensagem..."
                      className="flex-1 bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 outline-none focus:border-[var(--site-primary,#FFDE00)]"
                      data-testid="live-chat-input"
                    />
                    <button onClick={sendChat} className="p-2 bg-[var(--site-primary,#FFDE00)] text-zinc-950" data-testid="live-chat-send">
                      <Send size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="p-3 border-t-2 border-zinc-800 text-center">
                    <Link to="/login" className="text-[var(--site-primary,#FFDE00)] text-sm font-bold hover:underline">Faca login para enviar mensagens</Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-24 h-24 border-2 border-zinc-700 flex items-center justify-center mb-6">
              <Radio size={40} className="text-zinc-600" />
            </div>
            <h1 className="font-['Outfit'] font-black text-3xl text-white uppercase mb-2">Nenhuma live no momento</h1>
            <p className="text-zinc-500 mb-8">Volte mais tarde ou fique de olho nas redes sociais!</p>
            <Link to="/" className="brutalist-btn text-sm">Voltar ao Inicio</Link>
          </div>
        )}
      </div>
    </div>
  );
}

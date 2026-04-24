import { useState, useRef, useEffect } from "react";
import api from "../lib/api";
import { recordingsAPI, subscriptionAPI } from "../lib/api";
import { Radio, VideoOff, Monitor, Camera, Settings2, Download, Eye, EyeOff, Trash2, Play, Upload, Lock, Unlock } from "lucide-react";
import VisibilitySelector from "./VisibilitySelector";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://");

export default function AdminLivePanel() {
  const [isLive, setIsLive] = useState(false);
  const [title, setTitle] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [sourceType, setSourceType] = useState("camera");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [subscribersOnly, setSubscribersOnly] = useState(false);
  const [allowedPlanIds, setAllowedPlanIds] = useState([]);
  const [plans, setPlans] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [downloadReady, setDownloadReady] = useState(null);
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const localRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const startTimeRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devs => {
      const videoDevs = devs.filter(d => d.kind === "videoinput");
      setDevices(videoDevs);
      if (videoDevs.length > 0) setSelectedDevice(videoDevs[0].deviceId);
    }).catch(() => {});
    loadRecordings();
    subscriptionAPI.plans().then(r => setPlans(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      api.get("/live/status").then(r => setViewerCount(r.data.viewer_count)).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive]);

  const loadRecordings = () => {
    recordingsAPI.getAll().then(r => setRecordings(r.data)).catch(() => {});
  };

  const startLive = async () => {
    if (!title.trim()) { alert("Defina um titulo para a live"); return; }
    try {
      let stream;
      if (sourceType === "screen") {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: selectedDevice ? { deviceId: { exact: selectedDevice } } : true, audio: true });
      }
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; }

      await api.post("/live/start", { title, subscribers_only: subscribersOnly, allowed_plan_ids: allowedPlanIds });
      setIsLive(true);
      startTimeRef.current = Date.now();

      // WebSocket for broadcasting
      const ws = new WebSocket(`${WS_URL}/api/ws/live/stream`);
      wsRef.current = ws;
      ws.onopen = () => {
        const rec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus", videoBitsPerSecond: 1500000 });
        recorderRef.current = rec;
        rec.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            e.data.arrayBuffer().then(buf => ws.send(buf));
          }
        };
        rec.start(500);
      };

      // Local recorder for saving
      recordedChunksRef.current = [];
      const localRec = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8,opus", videoBitsPerSecond: 2500000 });
      localRecorderRef.current = localRec;
      localRec.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      localRec.start(1000);

      stream.getTracks().forEach(track => { track.onended = () => stopLive(); });
    } catch (err) {
      console.error(err);
      alert("Erro ao iniciar stream. Verifique permissoes de camera/tela.");
    }
  };

  const stopLive = async () => {
    const duration = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0;

    // Stop recorders
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
    if (localRecorderRef.current?.state !== "inactive") localRecorderRef.current?.stop();
    wsRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;

    try { await api.post("/live/stop"); } catch {}
    setIsLive(false);
    setViewerCount(0);

    // Wait for local recorder to finish
    await new Promise(resolve => setTimeout(resolve, 500));

    const chunks = recordedChunksRef.current;
    if (chunks.length > 0) {
      const blob = new Blob(chunks, { type: "video/webm" });
      // Offer local download
      const url = URL.createObjectURL(blob);
      setDownloadReady({ url, title, duration, blob });
    }
  };

  const saveToServer = async () => {
    if (!downloadReady) return;
    setSaving(true);
    try {
      const file = new File([downloadReady.blob], `${downloadReady.title}.webm`, { type: "video/webm" });
      const uploadRes = await recordingsAPI.upload(file);
      await recordingsAPI.create({
        title: downloadReady.title,
        file_id: uploadRes.data.file_id,
        storage_path: uploadRes.data.storage_path,
        duration: downloadReady.duration,
        size: uploadRes.data.size,
      });
      loadRecordings();
      alert("Gravacao salva no site!");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar gravacao no servidor");
    } finally {
      setSaving(false);
    }
  };

  const downloadLocal = () => {
    if (!downloadReady) return;
    const a = document.createElement("a");
    a.href = downloadReady.url;
    a.download = `${downloadReady.title || "live"}.webm`;
    a.click();
  };

  const toggleVisibility = async (rec) => {
    await recordingsAPI.toggleVisibility(rec.id, { is_public: !rec.is_public });
    loadRecordings();
  };

  const deleteRecording = async (id) => {
    if (!window.confirm("Excluir gravacao?")) return;
    await recordingsAPI.delete(id);
    loadRecordings();
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const formatSize = (bytes) => {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="space-y-6" data-testid="admin-live-panel">
      {!isLive && !downloadReady ? (
        <>
          {/* Start Live Form */}
          <div className="brutalist-card p-6 md:p-8">
            <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-6 flex items-center gap-2"><Radio size={20} /> Iniciar Live</h3>
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Titulo da Live</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="brutalist-input" placeholder="Ex: Lancamento do novo livro!" data-testid="live-title-input" />
              </div>
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Fonte de Video</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSourceType("camera")} className={`flex items-center gap-2 px-4 py-2 border-2 border-zinc-950 font-bold text-xs uppercase ${sourceType === "camera" ? "bg-zinc-950 text-[#FFDE00]" : "bg-white"}`} data-testid="source-camera">
                    <Camera size={14} /> Camera / OBS
                  </button>
                  <button type="button" onClick={() => setSourceType("screen")} className={`flex items-center gap-2 px-4 py-2 border-2 border-zinc-950 font-bold text-xs uppercase ${sourceType === "screen" ? "bg-zinc-950 text-[#FFDE00]" : "bg-white"}`} data-testid="source-screen">
                    <Monitor size={14} /> Tela
                  </button>
                </div>
              </div>
              {sourceType === "camera" && devices.length > 1 && (
                <div>
                  <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Selecionar Camera</label>
                  <select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)} className="brutalist-input" data-testid="camera-select">
                    {devices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 8)}`}</option>)}
                  </select>
                </div>
              )}
              <div className="bg-zinc-50 border-2 border-zinc-300 p-3">
                <p className="text-xs text-zinc-500 font-bold">A live sera gravada automaticamente. Apos encerrar, voce pode baixar e/ou salvar no site.</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={subscribersOnly} onChange={(e) => setSubscribersOnly(e.target.checked)} className="w-5 h-5 border-2 border-zinc-950" />
                <span className="font-bold text-sm uppercase flex items-center gap-1"><Lock size={14} /> Apenas para assinantes</span>
              </label>
              {subscribersOnly && plans.length > 0 && (
                <div className="border-2 border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs font-bold uppercase text-amber-700 mb-2">Quais planos podem assistir? (vazio = todos)</p>
                  <div className="flex flex-wrap gap-2">
                    {plans.map(p => (
                      <label key={p.id} className="flex items-center gap-2 px-3 py-1 border-2 cursor-pointer text-xs font-bold uppercase" style={{ borderColor: allowedPlanIds.includes(p.id) ? "#d97706" : "#d4d4d8", background: allowedPlanIds.includes(p.id) ? "#fef3c7" : "#fff" }}>
                        <input type="checkbox" checked={allowedPlanIds.includes(p.id)} onChange={() => setAllowedPlanIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])} className="w-4 h-4" />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <button onClick={startLive} className="brutalist-btn flex items-center gap-2" data-testid="start-live-btn"><Radio size={16} /> Ir ao Vivo</button>
            </div>
          </div>

          {/* OBS Virtual Camera Instructions */}
          <div className="brutalist-card p-6 md:p-8">
            <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-4 flex items-center gap-2"><Settings2 size={20} /> Como usar com OBS Studio</h3>
            
            <div className="bg-amber-50 border-2 border-amber-400 p-4 mb-6">
              <p className="text-sm font-bold text-amber-800">O OBS Studio funciona atraves da Camera Virtual. O OBS envia o video para o navegador, e o navegador transmite para os espectadores.</p>
            </div>

            <h4 className="font-bold text-sm uppercase mb-3 text-zinc-700">Passo a passo</h4>
            <ol className="space-y-3 text-sm text-zinc-700">
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
                <span>No OBS, configure suas cenas e fontes de video normalmente</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
                <span>Va em <strong>Ferramentas &gt; Iniciar Camera Virtual</strong> (ou clique "Iniciar Camera Virtual" no painel inferior)</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
                <span>Aqui no painel, selecione <strong>"Camera / OBS"</strong> como fonte de video</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center font-bold text-xs flex-shrink-0">4</span>
                <span>Na lista de cameras, escolha <strong>"OBS Virtual Camera"</strong></span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center font-bold text-xs flex-shrink-0">5</span>
                <span>Defina o titulo da live e clique <strong>"Ir ao Vivo"</strong></span>
              </li>
            </ol>
            
            <div className="mt-4 bg-zinc-50 border-2 border-zinc-300 p-3">
              <p className="text-xs text-zinc-500 font-bold">Sem OBS? Voce tambem pode usar diretamente a camera do computador ou compartilhar a tela. Basta escolher a fonte de video desejada acima e clicar "Ir ao Vivo".</p>
            </div>
          </div>
        </>
      ) : isLive ? (
        /* Live Active */
        <div className="brutalist-card p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider animate-pulse"><Radio size={14} /> AO VIVO + GRAVANDO</span>
              <span className="text-sm font-bold text-zinc-500">{viewerCount} espectadores</span>
            </div>
            <button onClick={stopLive} className="flex items-center gap-2 px-4 py-2 border-2 border-red-500 text-red-600 font-bold text-xs uppercase hover:bg-red-50" data-testid="stop-live-btn">
              <VideoOff size={14} /> Encerrar Live
            </button>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={async () => {
                const newVal = !subscribersOnly;
                setSubscribersOnly(newVal);
                try { await api.post("/live/visibility", { subscribers_only: newVal, allowed_plan_ids: newVal ? allowedPlanIds : [] }); } catch {}
              }}
              className={`flex items-center gap-2 px-4 py-2 border-2 font-bold text-xs uppercase transition-all ${subscribersOnly ? "border-amber-500 bg-amber-50 text-amber-700" : "border-zinc-300 text-zinc-500"}`}
              data-testid="toggle-live-visibility"
            >
              {subscribersOnly ? <><Lock size={14} /> Apenas Assinantes</> : <><Unlock size={14} /> Publico</>}
            </button>
            {subscribersOnly && plans.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {plans.map(p => (
                  <button key={p.id} onClick={async () => {
                    const newIds = allowedPlanIds.includes(p.id) ? allowedPlanIds.filter(id => id !== p.id) : [...allowedPlanIds, p.id];
                    setAllowedPlanIds(newIds);
                    await api.post("/live/visibility", { subscribers_only: true, allowed_plan_ids: newIds });
                  }} className={`px-2 py-1 border text-xs font-bold uppercase ${allowedPlanIds.includes(p.id) ? "border-amber-500 bg-amber-100 text-amber-800" : "border-zinc-200 text-zinc-400"}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            <span className="text-xs text-zinc-400">Mude a visibilidade durante a live</span>
          </div>
          <h2 className="font-['Outfit'] font-bold text-xl mb-4">{title}</h2>
          <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-2xl aspect-video bg-black border-2 border-zinc-950" data-testid="admin-live-preview" />
          <p className="text-xs text-zinc-400 mt-2">Preview local | Gravacao em andamento</p>
        </div>
      ) : downloadReady ? (
        /* Post-Live: Download & Save */
        <div className="brutalist-card p-6 md:p-8" data-testid="post-live-panel">
          <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-6">Live Encerrada - Gravacao Pronta</h3>
          <div className="bg-zinc-50 border-2 border-zinc-950 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-zinc-950">{downloadReady.title}</p>
                <p className="text-xs text-zinc-500 mt-1">Duracao: {formatDuration(downloadReady.duration)} | Tamanho: {formatSize(downloadReady.blob.size)}</p>
              </div>
              <Play size={24} className="text-zinc-400" />
            </div>
          </div>
          <video src={downloadReady.url} controls className="w-full max-w-2xl aspect-video bg-black border-2 border-zinc-950 mb-6" />
          <div className="flex flex-wrap gap-3">
            <button onClick={downloadLocal} className="brutalist-btn flex items-center gap-2 text-sm" data-testid="download-recording-btn">
              <Download size={16} /> Baixar no Dispositivo
            </button>
            <button onClick={saveToServer} disabled={saving} className="brutalist-btn-dark flex items-center gap-2 text-sm" data-testid="save-recording-btn">
              <Upload size={16} /> {saving ? "Salvando..." : "Salvar no Site"}
            </button>
            <button onClick={() => setDownloadReady(null)} className="px-4 py-2 border-2 border-zinc-300 text-zinc-500 font-bold text-xs uppercase hover:bg-zinc-50">
              Descartar
            </button>
          </div>
        </div>
      ) : null}

      {/* Saved Recordings */}
      <div>
        <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-4">Gravacoes Salvas</h3>
        {recordings.length > 0 ? (
          <div className="space-y-3">
            {recordings.map((rec) => (
              <div key={rec.id} className="brutalist-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4" data-testid={`recording-${rec.id}`}>
                <div className="w-16 h-16 bg-zinc-900 border-2 border-zinc-950 flex items-center justify-center flex-shrink-0">
                  <Play size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-zinc-950 truncate">{rec.title}</h4>
                  <div className="flex gap-3 text-xs text-zinc-500 mt-1">
                    <span>{new Date(rec.created_at).toLocaleDateString("pt-BR")}</span>
                    {rec.duration > 0 && <span>{formatDuration(rec.duration)}</span>}
                    {rec.size > 0 && <span>{formatSize(rec.size)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <VisibilitySelector
                    value={{ is_public: rec.is_public, subscribers_only: rec.subscribers_only }}
                    onChange={async (vis) => { await recordingsAPI.toggleVisibility(rec.id, vis); loadRecordings(); }}
                  />
                  <a href={recordingsAPI.streamUrl(rec.id)} target="_blank" rel="noopener noreferrer" className="p-2 border-2 border-zinc-950 hover:bg-zinc-100" title="Assistir">
                    <Play size={14} />
                  </a>
                  <button onClick={() => deleteRecording(rec.id)} className="p-2 border-2 border-red-500 text-red-500 hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="brutalist-card p-8 text-center">
            <p className="text-zinc-500 font-bold uppercase text-sm">Nenhuma gravacao salva. Faca uma live para comecar!</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import api from "../lib/api";
import { Radio, VideoOff, Monitor, Camera, Settings2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const WS_URL = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://");

export default function AdminLivePanel() {
  const [isLive, setIsLive] = useState(false);
  const [title, setTitle] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [sourceType, setSourceType] = useState("camera");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);

  // Get devices
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(devs => {
      const videoDevs = devs.filter(d => d.kind === "videoinput");
      setDevices(videoDevs);
      if (videoDevs.length > 0) setSelectedDevice(videoDevs[0].deviceId);
    }).catch(() => {});
  }, []);

  // Poll status
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      api.get("/live/status").then(r => setViewerCount(r.data.viewer_count)).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [isLive]);

  const startLive = async () => {
    if (!title.trim()) { alert("Defina um titulo para a live"); return; }

    try {
      let stream;
      if (sourceType === "screen") {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else {
        const constraints = { video: selectedDevice ? { deviceId: { exact: selectedDevice } } : true, audio: true };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }

      // Notify backend
      await api.post("/live/start", { title });
      setIsLive(true);

      // Connect WebSocket
      const ws = new WebSocket(`${WS_URL}/ws/live/stream`);
      wsRef.current = ws;

      ws.onopen = () => {
        // Start MediaRecorder
        const recorder = new MediaRecorder(stream, {
          mimeType: "video/webm;codecs=vp8,opus",
          videoBitsPerSecond: 1500000,
        });
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            e.data.arrayBuffer().then(buf => ws.send(buf));
          }
        };
        recorder.start(500); // Send chunks every 500ms
      };

      ws.onclose = () => console.log("Stream WS closed");

      // Handle stream end (e.g., user stops screen share)
      stream.getTracks().forEach(track => {
        track.onended = () => stopLive();
      });

    } catch (err) {
      console.error("Failed to start stream:", err);
      alert("Erro ao iniciar stream. Verifique permissoes de camera/tela.");
    }
  };

  const stopLive = async () => {
    if (recorderRef.current?.state !== "inactive") {
      recorderRef.current?.stop();
    }
    wsRef.current?.close();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;

    try { await api.post("/live/stop"); } catch {}
    setIsLive(false);
    setViewerCount(0);
  };

  return (
    <div className="space-y-6" data-testid="admin-live-panel">
      {!isLive ? (
        <>
          <div className="brutalist-card p-6 md:p-8">
            <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-6 flex items-center gap-2">
              <Radio size={20} /> Iniciar Live
            </h3>
            <div className="space-y-4 max-w-lg">
              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Titulo da Live</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="brutalist-input"
                  placeholder="Ex: Lancamento do novo livro!"
                  data-testid="live-title-input"
                />
              </div>

              <div>
                <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Fonte de Video</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSourceType("camera")}
                    className={`flex items-center gap-2 px-4 py-2 border-2 border-zinc-950 font-bold text-xs uppercase ${sourceType === "camera" ? "bg-zinc-950 text-[#FFDE00]" : "bg-white"}`}
                    data-testid="source-camera"
                  >
                    <Camera size={14} /> Camera / OBS Virtual Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType("screen")}
                    className={`flex items-center gap-2 px-4 py-2 border-2 border-zinc-950 font-bold text-xs uppercase ${sourceType === "screen" ? "bg-zinc-950 text-[#FFDE00]" : "bg-white"}`}
                    data-testid="source-screen"
                  >
                    <Monitor size={14} /> Tela
                  </button>
                </div>
              </div>

              {sourceType === "camera" && devices.length > 1 && (
                <div>
                  <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">Selecionar Camera</label>
                  <select
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    className="brutalist-input"
                    data-testid="camera-select"
                  >
                    {devices.map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0, 8)}`}</option>
                    ))}
                  </select>
                </div>
              )}

              <button onClick={startLive} className="brutalist-btn flex items-center gap-2" data-testid="start-live-btn">
                <Radio size={16} /> Ir ao Vivo
              </button>
            </div>
          </div>

          <div className="brutalist-card p-6 md:p-8">
            <h3 className="font-['Outfit'] font-bold text-xl uppercase mb-4 flex items-center gap-2">
              <Settings2 size={20} /> Como usar com OBS Studio
            </h3>
            <ol className="space-y-3 text-sm text-zinc-700">
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
                <span>No OBS, va em <strong>Ferramentas &gt; Camera Virtual</strong> e ative</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
                <span>Aqui no painel, selecione <strong>"Camera / OBS Virtual Camera"</strong> como fonte</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
                <span>Escolha <strong>"OBS Virtual Camera"</strong> na lista de cameras</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center font-bold text-xs flex-shrink-0">4</span>
                <span>Clique em <strong>"Ir ao Vivo"</strong> - sua cena do OBS sera transmitida!</span>
              </li>
            </ol>
          </div>
        </>
      ) : (
        <div className="brutalist-card p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 bg-red-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider animate-pulse">
                <Radio size={14} /> AO VIVO
              </span>
              <span className="text-sm font-bold text-zinc-500">{viewerCount} espectadores</span>
            </div>
            <button onClick={stopLive} className="flex items-center gap-2 px-4 py-2 border-2 border-red-500 text-red-600 font-bold text-xs uppercase hover:bg-red-50" data-testid="stop-live-btn">
              <VideoOff size={14} /> Encerrar Live
            </button>
          </div>
          <h2 className="font-['Outfit'] font-bold text-xl mb-4">{title}</h2>
          <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-2xl aspect-video bg-black border-2 border-zinc-950" data-testid="admin-live-preview" />
          <p className="text-xs text-zinc-400 mt-2">Preview local (espectadores veem com audio)</p>
        </div>
      )}
    </div>
  );
}

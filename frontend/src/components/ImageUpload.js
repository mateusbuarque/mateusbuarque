import { useState, useRef } from "react";
import { uploadAPI } from "../lib/api";
import { Upload, X, Image as ImageIcon } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ImageUpload({ value, onChange, label = "Imagem" }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setError("Use JPG, PNG, WebP ou GIF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Arquivo muito grande (max 5MB)");
      return;
    }

    setError("");
    setUploading(true);
    try {
      const res = await uploadAPI.upload(file);
      const imageUrl = `${BACKEND_URL}${res.data.url}`;
      onChange(imageUrl);
    } catch (err) {
      setError(err.response?.data?.detail || "Erro no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div data-testid="image-upload">
      <label className="font-bold text-xs uppercase tracking-wider text-zinc-700 block mb-2">{label}</label>

      {/* URL input */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="brutalist-input flex-1 text-sm"
          placeholder="Cole uma URL ou faca upload abaixo"
          data-testid="image-url-input"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-2 border-2 border-zinc-950 hover:bg-zinc-100 flex-shrink-0"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Upload button */}
      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="image-file-input"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 border-2 border-zinc-950 bg-white font-bold text-xs uppercase tracking-wider hover:bg-zinc-100 transition-all"
          data-testid="image-upload-btn"
        >
          <Upload size={14} />
          {uploading ? "Enviando..." : "Upload Arquivo"}
        </button>
        <span className="text-xs text-zinc-400">JPG, PNG, WebP, GIF (max 5MB)</span>
      </div>

      {error && <p className="text-red-600 text-xs font-bold mt-1">{error}</p>}

      {/* Preview */}
      {value && (
        <div className="mt-3 border-2 border-zinc-300 inline-block">
          <img
            src={value}
            alt="Preview"
            className="max-h-32 max-w-[200px] object-cover"
            onError={(e) => { e.target.style.display = "none"; }}
            data-testid="image-preview"
          />
        </div>
      )}
    </div>
  );
}

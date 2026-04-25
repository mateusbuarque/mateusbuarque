import { useState } from "react";
import { couponAPI } from "../lib/api";
import { Tag, Check, X } from "lucide-react";

export default function CouponInput({ onApply, onRemove, appliedCoupon }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleValidate = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await couponAPI.validate(code.trim());
      onApply(res.data);
      setCode("");
    } catch (err) {
      setError(err.response?.data?.detail || "Cupom invalido");
    } finally { setLoading(false); }
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border-2 border-green-300 p-3" data-testid="coupon-applied">
        <Tag size={16} className="text-green-600" />
        <span className="text-sm font-bold text-green-800 flex-1">
          {appliedCoupon.code} - {appliedCoupon.discount_type === "percent" ? `${appliedCoupon.discount_value}%` : `R$ ${parseFloat(appliedCoupon.discount_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} off
        </span>
        <button onClick={onRemove} className="p-1 text-red-500 hover:text-red-700" data-testid="remove-coupon-btn"><X size={16} /></button>
      </div>
    );
  }

  return (
    <div data-testid="coupon-input-section">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleValidate()}
          placeholder="Cupom de desconto"
          className="brutalist-input text-sm flex-1 font-mono"
          data-testid="coupon-code-field"
        />
        <button onClick={handleValidate} disabled={loading || !code.trim()} className="px-4 py-2 border-2 border-zinc-950 font-bold text-xs uppercase hover:bg-zinc-100 disabled:opacity-50" data-testid="apply-coupon-btn">
          {loading ? "..." : "Aplicar"}
        </button>
      </div>
      {error && <p className="text-xs text-red-600 font-bold mt-1" data-testid="coupon-error">{error}</p>}
    </div>
  );
}

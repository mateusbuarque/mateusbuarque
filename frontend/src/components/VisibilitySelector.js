import { Eye, EyeOff, Lock } from "lucide-react";

const STATES = [
  { value: "public", label: "Publico", icon: <Eye size={12} />, cls: "border-green-500 text-green-700 bg-green-50" },
  { value: "subscribers", label: "Assinantes", icon: <Lock size={12} />, cls: "border-amber-500 text-amber-700 bg-amber-50" },
  { value: "private", label: "Privado", icon: <EyeOff size={12} />, cls: "border-zinc-400 text-zinc-600 bg-zinc-100" },
];

export default function VisibilitySelector({ value, onChange }) {
  // Derive current state from is_public + subscribers_only
  let current = "public";
  if (!value.is_public) current = "private";
  else if (value.subscribers_only) current = "subscribers";

  const cycle = () => {
    const idx = STATES.findIndex(s => s.value === current);
    const next = STATES[(idx + 1) % STATES.length];
    if (next.value === "public") onChange({ is_public: true, subscribers_only: false });
    else if (next.value === "subscribers") onChange({ is_public: true, subscribers_only: true });
    else onChange({ is_public: false, subscribers_only: false });
  };

  const state = STATES.find(s => s.value === current);

  return (
    <button
      onClick={cycle}
      className={`flex items-center gap-1 px-3 py-1 border-2 font-bold text-xs uppercase transition-all ${state.cls}`}
      title={`Clique para alternar: Publico > Assinantes > Privado`}
    >
      {state.icon} {state.label}
    </button>
  );
}

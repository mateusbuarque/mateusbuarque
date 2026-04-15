import { useState, useEffect } from "react";
import { Eye, EyeOff, Lock, ChevronDown } from "lucide-react";
import { subscriptionAPI } from "../lib/api";

const VIS_STATES = [
  { value: "public", label: "Publico", icon: <Eye size={12} />, cls: "border-green-500 text-green-700 bg-green-50" },
  { value: "subscribers", label: "Assinantes", icon: <Lock size={12} />, cls: "border-amber-500 text-amber-700 bg-amber-50" },
  { value: "private", label: "Privado", icon: <EyeOff size={12} />, cls: "border-zinc-400 text-zinc-600 bg-zinc-100" },
];

export default function VisibilitySelector({ value, onChange }) {
  const [plans, setPlans] = useState([]);
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    subscriptionAPI.plans().then(r => setPlans(r.data)).catch(() => {});
  }, []);

  let current = "public";
  if (!value.is_public) current = "private";
  else if (value.subscribers_only) current = "subscribers";

  const selectedPlanIds = value.allowed_plan_ids || [];

  const cycle = () => {
    const idx = VIS_STATES.findIndex(s => s.value === current);
    const next = VIS_STATES[(idx + 1) % VIS_STATES.length];
    if (next.value === "public") {
      onChange({ is_public: true, subscribers_only: false, allowed_plan_ids: [] });
      setShowPlans(false);
    } else if (next.value === "subscribers") {
      onChange({ is_public: true, subscribers_only: true, allowed_plan_ids: selectedPlanIds });
      setShowPlans(true);
    } else {
      onChange({ is_public: false, subscribers_only: false, allowed_plan_ids: [] });
      setShowPlans(false);
    }
  };

  const togglePlan = (planId) => {
    const newIds = selectedPlanIds.includes(planId)
      ? selectedPlanIds.filter(id => id !== planId)
      : [...selectedPlanIds, planId];
    onChange({ ...value, allowed_plan_ids: newIds });
  };

  const state = VIS_STATES.find(s => s.value === current);

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          onClick={cycle}
          className={`flex items-center gap-1 px-3 py-1 border-2 font-bold text-xs uppercase transition-all ${state.cls}`}
          title="Clique para alternar: Publico > Assinantes > Privado"
        >
          {state.icon} {state.label}
        </button>

        {current === "subscribers" && plans.length > 0 && (
          <button
            onClick={() => setShowPlans(!showPlans)}
            className={`flex items-center gap-1 px-2 py-1 border-2 font-bold text-xs uppercase transition-all ${
              selectedPlanIds.length > 0 ? "border-amber-500 text-amber-700 bg-amber-50" : "border-zinc-300 text-zinc-500"
            }`}
            title="Selecionar planos"
          >
            {selectedPlanIds.length > 0 ? `${selectedPlanIds.length} plano(s)` : "Todos"} <ChevronDown size={12} />
          </button>
        )}
      </div>

      {showPlans && current === "subscribers" && plans.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-white border-2 border-zinc-950 shadow-lg min-w-[200px]">
          <div className="p-2 border-b-2 border-zinc-200">
            <p className="text-xs font-bold uppercase text-zinc-500">Planos permitidos</p>
            <p className="text-xs text-zinc-400">Vazio = todos os planos</p>
          </div>
          {plans.map((plan) => (
            <label key={plan.id} className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={selectedPlanIds.includes(plan.id)}
                onChange={() => togglePlan(plan.id)}
                className="w-4 h-4 border-2 border-zinc-950"
              />
              <span className="font-bold text-zinc-800">{plan.name}</span>
              <span className="text-xs text-zinc-400 ml-auto">R$ {parseFloat(plan.price).toFixed(2)}</span>
            </label>
          ))}
          <button onClick={() => setShowPlans(false)} className="w-full p-2 text-xs font-bold uppercase text-zinc-500 hover:bg-zinc-100 border-t-2 border-zinc-200">
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}

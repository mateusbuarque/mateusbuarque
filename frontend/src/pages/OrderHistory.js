import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import api from "../lib/api";
import { Package, ArrowLeft, ShoppingBag, Target } from "lucide-react";

export default function OrderHistory() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
      return;
    }
    if (user) {
      api.get("/user/orders")
        .then((res) => setOrders(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-['Outfit'] font-black text-2xl uppercase animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="py-16 md:py-24" data-testid="order-history-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-950 font-bold text-sm uppercase tracking-wider mb-8 transition-colors">
          <ArrowLeft size={16} /> Voltar
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-[var(--site-primary,#FFDE00)] border-2 border-zinc-950 flex items-center justify-center">
            <Package size={24} className="text-zinc-950" />
          </div>
          <div>
            <h1 className="font-['Outfit'] text-3xl font-black uppercase tracking-tighter text-zinc-950">Meus Pedidos</h1>
            <p className="text-zinc-500 text-sm">{orders.length} pedido(s)</p>
          </div>
        </div>

        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order, i) => (
              <div key={order.id || i} className="brutalist-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4" data-testid={`order-item-${i}`}>
                {order.item_image && (
                  <img src={order.item_image} alt={order.item_title} className="w-20 h-20 object-cover border-2 border-zinc-950 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {order.type === "campaign" ? (
                      <Target size={14} className="text-zinc-400" />
                    ) : (
                      <ShoppingBag size={14} className="text-zinc-400" />
                    )}
                    <span className="text-xs font-bold uppercase text-zinc-400">
                      {order.type === "campaign" ? "Campanha" : "Loja"}
                    </span>
                  </div>
                  <h3 className="font-bold text-zinc-950">{order.item_title}</h3>
                  <div className="flex gap-4 text-xs text-zinc-500 mt-1">
                    <span>{new Date(order.created_at).toLocaleDateString("pt-BR")}</span>
                    {order.quantity && order.quantity > 1 && <span>Qtd: {order.quantity}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="font-['Outfit'] font-black text-lg">
                    R$ {(order.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={`px-2 py-1 text-xs font-bold uppercase ${
                    order.payment_status === "paid"
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : order.payment_status === "pending"
                        ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                        : "bg-red-100 text-red-800 border border-red-300"
                  }`}>
                    {order.payment_status === "paid" ? "Pago" : order.payment_status === "pending" ? "Pendente" : order.payment_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="brutalist-card p-12 text-center">
            <Package size={48} className="mx-auto mb-4 text-zinc-300" />
            <p className="font-['Outfit'] font-bold text-xl text-zinc-500 uppercase">Nenhum pedido ainda</p>
            <p className="text-zinc-400 mt-2">Apoie uma campanha ou compre um produto para comecar!</p>
            <div className="flex gap-4 justify-center mt-6">
              <Link to="/#campanhas" className="brutalist-btn text-sm">Ver Campanhas</Link>
              <Link to="/loja" className="brutalist-btn-dark text-sm">Ir para Loja</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

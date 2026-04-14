import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { productAPI, checkoutAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { ShoppingBag, ArrowRight } from "lucide-react";

export default function StorePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    productAPI.getAll()
      .then((res) => setProducts(res.data.filter((p) => p.is_active)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleBuy = async (product) => {
    if (!user) {
      navigate("/login");
      return;
    }
    setCheckoutLoading(product.id);
    try {
      const res = await checkoutAPI.product({
        product_id: product.id,
        quantity: 1,
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      const msg = err.response?.data?.detail || "Erro ao processar compra";
      alert(msg);
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-['Outfit'] font-black text-2xl uppercase animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="py-16 md:py-24" data-testid="store-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-14 h-14 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center">
            <ShoppingBag size={24} className="text-zinc-950" />
          </div>
          <div>
            <h1 className="font-['Outfit'] text-3xl md:text-5xl font-black uppercase tracking-tighter text-zinc-950">
              Loja
            </h1>
            <p className="text-zinc-500 text-sm font-bold uppercase">Compra direta de produtos</p>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, i) => (
              <div key={product.id} className="brutalist-card overflow-hidden" data-testid={`product-card-${i}`}>
                <div className="border-b-2 border-zinc-950 overflow-hidden">
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-['Outfit'] font-bold text-xl mb-2 text-zinc-950">{product.title}</h3>
                  <p className="text-sm text-zinc-600 mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-['Outfit'] font-black text-2xl text-zinc-950">
                      R$ {parseFloat(product.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    {product.stock <= 10 && product.stock > 0 && (
                      <span className="text-xs font-bold text-red-600 uppercase">
                        Ultimas {product.stock} unidades
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleBuy(product)}
                    disabled={checkoutLoading === product.id || product.stock <= 0}
                    className="brutalist-btn w-full flex items-center justify-center gap-2 text-sm"
                    data-testid={`buy-product-${i}`}
                  >
                    {checkoutLoading === product.id ? (
                      "Processando..."
                    ) : product.stock <= 0 ? (
                      "Esgotado"
                    ) : (
                      <>Comprar <ArrowRight size={16} /></>
                    )}
                  </button>
                  {!user && (
                    <p className="text-xs text-zinc-400 text-center mt-2">
                      <Link to="/login" className="underline hover:text-zinc-700">Faca login</Link> para comprar
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="brutalist-card p-12 text-center">
            <ShoppingBag size={48} className="mx-auto mb-4 text-zinc-300" />
            <p className="font-['Outfit'] font-bold text-xl text-zinc-500 uppercase">Nenhum produto disponivel no momento</p>
            <p className="text-zinc-400 mt-2">Volte em breve para novidades!</p>
            <Link to="/" className="brutalist-btn inline-block mt-6">Ver Campanhas</Link>
          </div>
        )}
      </div>
    </div>
  );
}

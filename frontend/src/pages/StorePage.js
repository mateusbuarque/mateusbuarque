import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { productAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { ShoppingBag } from "lucide-react";
import PaymentButton from "../components/PaymentButton";

export default function StorePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    productAPI
      .getAll()
      .then((res) => setProducts(res.data.filter((p) => p.is_active)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-['Outfit'] font-black text-2xl uppercase animate-pulse">
          Carregando...
        </div>
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
            <p className="text-zinc-500 text-sm font-bold uppercase">
              Compra automática via Mercado Pago
            </p>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, i) => {
              const price = Number(product.price || 0);

              return (
                <div
                  key={product.id}
                  className="brutalist-card overflow-hidden"
                  data-testid={`product-card-${i}`}
                >
                  <div className="border-b-2 border-zinc-950 overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="p-6">
                    <h3 className="font-['Outfit'] font-bold text-xl mb-2 text-zinc-950">
                      {product.title}
                    </h3>

                    <p className="text-sm text-zinc-600 mb-4 line-clamp-2">
                      {product.description}
                    </p>

                    <div className="flex items-center justify-between mb-4">
                      <span className="font-['Outfit'] font-black text-2xl text-zinc-950">
                        R$ {price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>

                      {product.stock <= 10 && product.stock > 0 && (
                        <span className="text-xs font-bold text-red-600 uppercase">
                          Últimas {product.stock}
                        </span>
                      )}
                    </div>

                    {product.stock <= 0 ? (
                      <button
                        disabled
                        className="brutalist-btn w-full opacity-50 cursor-not-allowed"
                      >
                        Esgotado
                      </button>
                    ) : (
                      <PaymentButton
                        title={product.title}
                        price={price}
                      />
                    )}

                    {!user && (
                      <p className="text-xs text-zinc-400 text-center mt-2">
                        <Link to="/login" className="underline hover:text-zinc-700">
                          Faça login
                        </Link>{" "}
                        para acompanhar sua compra depois.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="brutalist-card p-12 text-center">
            <ShoppingBag size={48} className="mx-auto mb-4 text-zinc-300" />
            <p className="font-['Outfit'] font-bold text-xl text-zinc-500 uppercase">
              Nenhum produto disponível
            </p>
            <Link to="/" className="brutalist-btn inline-block mt-6">
              Ver Campanhas
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { productAPI, checkoutAPI } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { ShoppingBag, CreditCard, QrCode, Copy, Check } from "lucide-react";

export default function StorePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [pixModal, setPixModal] = useState(null);
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    productAPI.getAll()
      .then((res) => setProducts(res.data.filter((p) => p.is_active)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleBuyCard = async (product) => {
    if (!user) { navigate("/login"); return; }
    setCheckoutLoading(product.id + "_card");
    try {
      const res = await checkoutAPI.product({ product_id: product.id, quantity: 1 });
      if (res.data.url) window.location.href = res.data.url;
    } catch (err) { alert(err.response?.data?.detail || "Erro"); }
    finally { setCheckoutLoading(null); }
  };

  const handleBuyPix = async (product) => {
    if (!user) { navigate("/login"); return; }
    setCheckoutLoading(product.id + "_pix");
    try {
      const res = await checkoutAPI.pix({ type: "product", product_id: product.id, quantity: 1 });
      setPixModal(res.data);
    } catch (err) { alert(err.response?.data?.detail || "Erro"); }
    finally { setCheckoutLoading(null); }
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText(pixModal?.pix_key || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="font-['Outfit'] font-black text-2xl uppercase animate-pulse">Carregando...</div></div>;
  }

  return (
    <div className="py-16 md:py-24" data-testid="store-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-14 h-14 bg-[#FFDE00] border-2 border-zinc-950 flex items-center justify-center">
            <ShoppingBag size={24} className="text-zinc-950" />
          </div>
          <div>
            <h1 className="font-['Outfit'] text-3xl md:text-5xl font-black uppercase tracking-tighter text-zinc-950">Loja</h1>
            <p className="text-zinc-500 text-sm font-bold uppercase">Compra direta de produtos</p>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product, i) => (
              <div key={product.id} className="brutalist-card overflow-hidden" data-testid={`product-card-${i}`}>
                <div className="border-b-2 border-zinc-950 overflow-hidden">
                  <img src={product.image_url} alt={product.title} className="w-full h-64 object-cover hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="p-6">
                  <h3 className="font-['Outfit'] font-bold text-xl mb-2 text-zinc-950">{product.title}</h3>
                  <p className="text-sm text-zinc-600 mb-4 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-['Outfit'] font-black text-2xl text-zinc-950">
                      R$ {parseFloat(product.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                    {product.stock <= 10 && product.stock > 0 && (
                      <span className="text-xs font-bold text-red-600 uppercase">Ultimas {product.stock}</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleBuyCard(product)}
                      disabled={!!checkoutLoading || product.stock <= 0}
                      className="brutalist-btn w-full flex items-center justify-center gap-2 text-sm"
                      data-testid={`buy-card-${i}`}
                    >
                      <CreditCard size={16} />
                      {checkoutLoading === product.id + "_card" ? "Processando..." : product.stock <= 0 ? "Esgotado" : "Cartao"}
                    </button>
                    <button
                      onClick={() => handleBuyPix(product)}
                      disabled={!!checkoutLoading || product.stock <= 0}
                      className="brutalist-btn-dark w-full flex items-center justify-center gap-2 text-sm"
                      data-testid={`buy-pix-${i}`}
                    >
                      <QrCode size={16} />
                      {checkoutLoading === product.id + "_pix" ? "Gerando..." : "Pix"}
                    </button>
                  </div>
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
            <p className="font-['Outfit'] font-bold text-xl text-zinc-500 uppercase">Nenhum produto disponivel</p>
            <Link to="/" className="brutalist-btn inline-block mt-6">Ver Campanhas</Link>
          </div>
        )}
      </div>

      {/* Pix Modal */}
      {pixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-testid="pix-modal">
          <div className="brutalist-card bg-white w-full max-w-md p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-['Outfit'] font-black text-xl uppercase">Pagar com Pix</h2>
              <button onClick={() => setPixModal(null)} className="p-2 hover:bg-zinc-100"><span className="text-xl">&times;</span></button>
            </div>
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-[#FFDE00] border-2 border-zinc-950 mx-auto flex items-center justify-center mb-4">
                <QrCode size={40} className="text-zinc-950" />
              </div>
              <p className="font-['Outfit'] font-black text-3xl text-zinc-950">R$ {(pixModal.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-sm text-zinc-500 mt-1">{pixModal.item_title}</p>
            </div>
            <div className="bg-zinc-50 border-2 border-zinc-950 p-4 mb-4">
              <p className="text-xs font-bold uppercase text-zinc-500 mb-2">Chave Pix ({pixModal.pix_key_type})</p>
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-950 text-lg flex-1 break-all">{pixModal.pix_key}</span>
                <button onClick={copyPixKey} className="p-2 border-2 border-zinc-950 hover:bg-zinc-100 flex-shrink-0">
                  {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
            {copied && <p className="text-green-600 text-sm font-bold text-center mb-4">Chave copiada!</p>}
            <div className="bg-[#FFDE00] border-2 border-zinc-950 p-4 mb-4">
              <ol className="space-y-2 text-sm font-bold text-zinc-950">
                <li>1. Abra o app do seu banco</li>
                <li>2. Escolha pagar com Pix</li>
                <li>3. Cole a chave acima</li>
                <li>4. Envie R$ {(pixModal.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</li>
                <li>5. Admin confirmara seu pagamento</li>
              </ol>
            </div>
            <button onClick={() => { setPixModal(null); navigate("/meus-pedidos"); }} className="brutalist-btn w-full mt-2 text-sm">Ja fiz o Pix</button>
          </div>
        </div>
      )}
    </div>
  );
}

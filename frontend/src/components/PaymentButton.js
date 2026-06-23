import { useState } from "react";

export default function PaymentButton({ title = "Produto Mateus Buarque", price = 25 }) {
  const [loading, setLoading] = useState(false);

  async function pagar() {
    setLoading(true);

    try {
      const res = await fetch("/.netlify/functions/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, price, quantity: 1 }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Erro ao criar pagamento.");
        return;
      }

      window.location.href = data.init_point;
    } catch (err) {
      alert("Erro ao iniciar pagamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={pagar} disabled={loading} className="brutalist-btn">
      {loading ? "Abrindo pagamento..." : "Comprar com Pix ou Cartão"}
    </button>
  );
}

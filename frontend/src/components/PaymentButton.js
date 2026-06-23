import { useState } from "react";

export default function PaymentButton({
  title = "Ingresso Mateus Buarque",
  price = 25,
  quantity = 1,
}) {
  const [loading, setLoading] = useState(false);

  async function handlePayment() {
    setLoading(true);

    try {
      const response = await fetch("/.netlify/functions/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          price,
          quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Erro ao criar pagamento.");
        return;
      }

      window.location.href = data.init_point;
    } catch (error) {
      alert("Erro ao iniciar pagamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handlePayment} disabled={loading} className="brutalist-btn">
      {loading ? "Carregando..." : "Comprar com Pix ou Cartão"}
    </button>
  );
}

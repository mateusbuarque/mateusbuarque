exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Método não permitido" }),
    };
  }

  try {
    const { title, price, quantity } = JSON.parse(event.body || "{}");

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Access Token do Mercado Pago não configurado no Netlify." }),
      };
    }

    const siteUrl = process.env.SITE_URL || "https://mateusbuarque.com.br";

    const preference = {
      items: [
        {
          title: title || "Produto Mateus Buarque",
          quantity: Number(quantity || 1),
          currency_id: "BRL",
          unit_price: Number(price || 25),
        },
      ],
      back_urls: {
        success: `${siteUrl}/pagamento-sucesso`,
        failure: `${siteUrl}/pagamento-erro`,
        pending: `${siteUrl}/pagamento-pendente`,
      },
      auto_return: "approved",
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Erro ao criar pagamento no Mercado Pago",
          details: data,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: data.id,
        init_point: data.init_point,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erro interno",
        details: error.message,
      }),
    };
  }
};

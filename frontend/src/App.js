import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SiteSettingsProvider } from "./contexts/SiteSettingsContext";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import CampaignDetail from "./pages/CampaignDetail";
import LoginPage from "./pages/LoginPage";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import PaymentSuccess from "./pages/PaymentSuccess";
import StorePage from "./pages/StorePage";
import OrderHistory from "./pages/OrderHistory";
import LivePage from "./pages/LivePage";
import VideosPage from "./pages/VideosPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import CommunityPage from "./pages/CommunityPage"; 

if (typeof document !== "undefined") {
  document.title = "Mateus Buarque";

  let favicon = document.querySelector("link[rel='icon']");
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }

  favicon.href = "/favicon.ico?v=10";
}
function forceSiteCleanup() {
  if (typeof document === "undefined") return;

  document.title = "Mateus Buarque";

  const existingIcons = document.querySelectorAll("link[rel*='icon']");
  existingIcons.forEach((icon) => icon.remove());

  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = "image/x-icon";
  favicon.href = "/favicon.ico?v=9999";
  document.head.appendChild(favicon);

  document.querySelectorAll("script").forEach((script) => {
    if (script.src && script.src.includes("emergent")) {
      script.remove();
    }
  });

  document.querySelectorAll("a, div, button, span").forEach((el) => {
    const text = (el.innerText || "").toLowerCase();
    const href = (el.getAttribute("href") || "").toLowerCase();
    const id = (el.id || "").toLowerCase();
    const cls = (el.className || "").toString().toLowerCase();

    if (
      text.includes("feito com emergent") ||
      text.includes("made with emergent") ||
      href.includes("emergent") ||
      id.includes("emergent") ||
      cls.includes("emergent")
    ) {
      el.remove();
    }
  });
}

forceSiteCleanup();
setInterval(forceSiteCleanup, 500);
function App() {
  return (
    <AuthProvider>
      <SiteSettingsProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/campaign/:id" element={<CampaignDetail />} />
                <Route path="/loja" element={<StorePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/meus-pedidos" element={<OrderHistory />} />
              <Route path="/live" element={<LivePage />} />
              <Route path="/videos" element={<VideosPage />} />
              <Route path="/assinatura" element={<SubscriptionPage />} />
              <Route path="/comunidade" element={<CommunityPage />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/payment/success" element={<PaymentSuccess />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </SiteSettingsProvider>
    </AuthProvider>
  );
}

export default App;

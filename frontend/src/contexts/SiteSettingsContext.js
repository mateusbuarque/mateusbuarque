import { createContext, useContext, useState, useEffect } from "react";
import api from "../lib/api";

const SiteSettingsContext = createContext({});

const DEFAULTS = {
  site_name: "Edegar Agostinho",
  site_subtitle: "Comediante, escritor e ilustrador",
  logo_url: "",
  primary_color: "#FFDE00",
  secondary_color: "#09090B",
  accent_color: "#FF3B30",
  bg_color: "#FFFFFF",
  text_color: "#09090B",
  btn_color: "#FFDE00",
  btn_text_color: "#09090B",
  hero_title: "Apoie a Comedia. Leia um livro.",
  hero_subtitle: "Financiamento coletivo dos livros de Edegar Agostinho. Apoie a comedia brasileira e receba seu livro em casa.",
  support_email: "mateusbuarquepugli@gmail.com",
  marquee_text: "FINANCIAMENTO COLETIVO * PRODUTO ENTREGUE MESMO SE FATURAR R$0 * APOIE A COMEDIA * EDEGAR AGOSTINHO *",
  nav_label_home: "Inicio",
  nav_label_campaigns: "Campanhas",
  nav_label_store: "Loja",
  nav_label_bio: "Biografia",
  nav_label_gallery: "Galeria",
  nav_url_home: "/",
  nav_url_campaigns: "/#campanhas",
  nav_url_store: "/loja",
  nav_url_bio: "/#biografia",
  nav_url_gallery: "/#galeria",
  btn_label_hero_primary: "Ver Campanhas",
  btn_label_hero_secondary: "Sobre Edegar",
  btn_label_support: "Apoiar",
  btn_label_buy_card: "Pagar com Cartao",
  btn_label_buy_pix: "Pagar com Pix",
  header_icon_url: "",
  heading_color: "#09090B",
  subtitle_color: "#52525B",
  link_color: "#3F3F46",
  showcase_images: [],
};

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get("/site-settings")
      .then((res) => setSettings({ ...DEFAULTS, ...res.data }))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const refresh = () => {
    api.get("/site-settings")
      .then((res) => setSettings({ ...DEFAULTS, ...res.data }))
      .catch(() => {});
  };

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    root.style.setProperty("--site-primary", settings.primary_color);
    root.style.setProperty("--site-secondary", settings.secondary_color);
    root.style.setProperty("--site-accent", settings.accent_color);
    root.style.setProperty("--site-bg", settings.bg_color);
    root.style.setProperty("--site-text", settings.text_color);
    root.style.setProperty("--site-btn", settings.btn_color);
    root.style.setProperty("--site-btn-text", settings.btn_text_color);
    root.style.setProperty("--site-heading", settings.heading_color);
    root.style.setProperty("--site-subtitle", settings.subtitle_color);
    root.style.setProperty("--site-link", settings.link_color);
  }, [settings, loaded]);

  return (
    <SiteSettingsContext.Provider value={{ settings, refresh }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

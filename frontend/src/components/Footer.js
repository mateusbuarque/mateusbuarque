import { useSiteSettings } from "../contexts/SiteSettingsContext";

export default function Footer() {
  const { settings } = useSiteSettings();

  const bgColor = settings.footer_bg_color || settings.secondary_color || "#09090B";
  const textColor = settings.footer_text_color || "#a1a1aa";
  const headingColor = settings.footer_heading_color || settings.primary_color || "#FFDE00";
  const linkColor = settings.footer_link_color || "#a1a1aa";
  const borderColor = settings.footer_border_color || "#27272a";

  const footerLinks = (settings.custom_links || []).filter(l => l.label && l.url);
  const footerButtons = (settings.custom_buttons || []).filter(b => b.label && b.url && b.position === "footer");

  return (
    <footer data-testid="main-footer" className="py-12 border-t-2" style={{ backgroundColor: bgColor, borderColor: bgColor, color: textColor }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-['Outfit'] font-black text-2xl uppercase mb-2" style={{ color: "#fff" }}>
              {settings.site_name?.split(" ")[0]}<span style={{ color: headingColor }}>.</span>{settings.site_name?.split(" ").slice(1).join(" ")}
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: textColor }}>{settings.site_subtitle}</p>
            {footerButtons.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {footerButtons.map((btn, i) => (
                  <a key={i} href={btn.url} className={`inline-block px-4 py-2 font-bold text-xs uppercase tracking-wider border-2 transition-colors ${
                    btn.style === "secondary" ? "border-zinc-600 text-white hover:bg-zinc-800" :
                    btn.style === "outline" ? "border-current hover:opacity-80" :
                    "text-zinc-950 hover:opacity-90"
                  }`} style={btn.style === "primary" ? { backgroundColor: headingColor, borderColor: headingColor } : {}} data-testid={`footer-btn-${i}`}>
                    {btn.label}
                  </a>
                ))}
              </div>
            )}
          </div>
          <div>
            <h4 className="font-['Outfit'] font-bold text-sm uppercase tracking-wider mb-4" style={{ color: headingColor }}>Links</h4>
            <div className="flex flex-col gap-2">
              <a href="/#campanhas" className="text-sm transition-colors hover:opacity-80" style={{ color: linkColor }}>{settings.nav_label_campaigns || "Campanhas"}</a>
              <a href="/loja" className="text-sm transition-colors hover:opacity-80" style={{ color: linkColor }}>{settings.nav_label_store || "Loja"}</a>
              <a href="/#biografia" className="text-sm transition-colors hover:opacity-80" style={{ color: linkColor }}>{settings.nav_label_bio || "Biografia"}</a>
              <a href="/#galeria" className="text-sm transition-colors hover:opacity-80" style={{ color: linkColor }}>{settings.nav_label_gallery || "Galeria"}</a>
              {footerLinks.map((link, i) => (
                <a key={i} href={link.url} className="text-sm transition-colors hover:opacity-80" style={{ color: linkColor }} data-testid={`footer-link-${i}`}>{link.label}</a>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-['Outfit'] font-bold text-sm uppercase tracking-wider mb-4" style={{ color: headingColor }}>Plataforma</h4>
            <p className="text-sm mb-3" style={{ color: textColor }}>Taxa de 5% sobre o valor arrecadado. Produto entregue ao comprador mesmo que fature R$0.</p>
            <h4 className="font-['Outfit'] font-bold text-sm uppercase tracking-wider mb-2 mt-4" style={{ color: headingColor }}>Suporte</h4>
            <a href={`mailto:${settings.support_email}`} className="text-sm transition-colors hover:opacity-80" style={{ color: linkColor }}>{settings.support_email}</a>
          </div>
        </div>
        <div className="mt-8 pt-8 text-center text-sm" style={{ borderTop: `1px solid ${borderColor}`, color: textColor }}>
          {new Date().getFullYear()} {settings.site_name}. {settings.footer_text || "Todos os direitos reservados."}
        </div>
      </div>
    </footer>
  );
}

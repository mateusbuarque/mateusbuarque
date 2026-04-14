import { useSiteSettings } from "../contexts/SiteSettingsContext";

export default function Footer() {
  const { settings } = useSiteSettings();
  return (
    <footer data-testid="main-footer" className="py-12 border-t-2" style={{ backgroundColor: settings.secondary_color, borderColor: settings.secondary_color, color: "#fff" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-['Outfit'] font-black text-2xl uppercase mb-2">
              {settings.site_name?.split(" ")[0]}<span style={{ color: settings.primary_color }}>.</span>{settings.site_name?.split(" ").slice(1).join(" ")}
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{settings.site_subtitle}</p>
          </div>
          <div>
            <h4 className="font-['Outfit'] font-bold text-sm uppercase tracking-wider mb-4" style={{ color: settings.primary_color }}>Links</h4>
            <div className="flex flex-col gap-2">
              <a href="/#campanhas" className="text-zinc-400 hover:text-white text-sm transition-colors">Campanhas</a>
              <a href="/loja" className="text-zinc-400 hover:text-white text-sm transition-colors">Loja</a>
              <a href="/#biografia" className="text-zinc-400 hover:text-white text-sm transition-colors">Biografia</a>
              <a href="/#galeria" className="text-zinc-400 hover:text-white text-sm transition-colors">Galeria</a>
            </div>
          </div>
          <div>
            <h4 className="font-['Outfit'] font-bold text-sm uppercase tracking-wider mb-4" style={{ color: settings.primary_color }}>Plataforma</h4>
            <p className="text-zinc-400 text-sm mb-3">Taxa de 5% sobre o valor arrecadado. Produto entregue ao comprador mesmo que fature R$0.</p>
            <h4 className="font-['Outfit'] font-bold text-sm uppercase tracking-wider mb-2 mt-4" style={{ color: settings.primary_color }}>Suporte</h4>
            <a href={`mailto:${settings.support_email}`} className="text-zinc-400 hover:text-white text-sm transition-colors">{settings.support_email}</a>
          </div>
        </div>
        <div className="border-t border-zinc-800 mt-8 pt-8 text-center text-zinc-500 text-sm">
          {new Date().getFullYear()} {settings.site_name}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}

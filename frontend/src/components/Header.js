import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSiteSettings } from "../contexts/SiteSettingsContext";
import { Menu, X, LogOut, Package } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const { settings } = useSiteSettings();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/#campanhas", label: "Campanhas" },
    { to: "/loja", label: "Loja", isLink: true },
    { to: "/#biografia", label: "Biografia" },
    { to: "/#galeria", label: "Galeria" },
  ];

  const handleNavClick = (to) => {
    setMobileOpen(false);
    if (to.includes("#")) {
      const id = to.split("#")[1];
      if (location.pathname === "/") {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      } else {
        window.location.href = to;
      }
    }
  };

  const nameParts = (settings.site_name || "Edegar Agostinho").split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  return (
    <header data-testid="main-header" className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b-2" style={{ borderColor: settings.secondary_color }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link to="/" className="font-['Outfit'] font-black text-xl sm:text-2xl uppercase tracking-tight" style={{ color: settings.text_color }}>
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={settings.site_name} className="h-10" />
          ) : (
            <>{firstName}<span style={{ color: settings.primary_color }}>.</span>{lastName}</>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            l.isLink ? (
              <Link key={l.to} to={l.to} className="font-['Outfit'] font-bold text-sm uppercase tracking-wider text-zinc-700 hover:text-zinc-950 transition-colors">{l.label}</Link>
            ) : (
              <button key={l.to} onClick={() => handleNavClick(l.to)} className="font-['Outfit'] font-bold text-sm uppercase tracking-wider text-zinc-700 hover:text-zinc-950 transition-colors">{l.label}</button>
            )
          ))}
          {user ? (
            <div className="flex items-center gap-3">
              {user.role === "admin" && (
                <Link to="/admin" className="brutalist-btn text-xs py-2 px-4" data-testid="admin-panel-link">Admin</Link>
              )}
              <Link to="/meus-pedidos" className="text-zinc-500 hover:text-zinc-950 transition-colors" data-testid="orders-link" title="Meus Pedidos">
                <Package size={18} />
              </Link>
              <span className="text-xs text-zinc-500 font-bold max-w-[100px] truncate">{user.name || user.email}</span>
              <button onClick={logout} className="text-zinc-500 hover:text-zinc-950" data-testid="logout-btn"><LogOut size={18} /></button>
            </div>
          ) : (
            <Link to="/login" className="brutalist-btn text-xs py-2 px-4" data-testid="login-link">Entrar</Link>
          )}
        </nav>

        <button className="md:hidden" style={{ color: settings.text_color }} onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-toggle">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t-2 border-zinc-950 bg-white">
          <div className="px-4 py-4 flex flex-col gap-3">
            {links.map((l) => (
              l.isLink ? (
                <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="font-['Outfit'] font-bold text-sm uppercase tracking-wider text-zinc-700 text-left">{l.label}</Link>
              ) : (
                <button key={l.to} onClick={() => handleNavClick(l.to)} className="font-['Outfit'] font-bold text-sm uppercase tracking-wider text-zinc-700 text-left">{l.label}</button>
              )
            ))}
            {user ? (
              <>
                <Link to="/meus-pedidos" onClick={() => setMobileOpen(false)} className="font-['Outfit'] font-bold text-sm uppercase tracking-wider text-zinc-700 text-left">Meus Pedidos</Link>
                {user.role === "admin" && <Link to="/admin" className="brutalist-btn text-xs py-2 px-4 text-center" onClick={() => setMobileOpen(false)}>Admin</Link>}
                <button onClick={() => { logout(); setMobileOpen(false); }} className="text-zinc-500 text-left text-sm font-bold uppercase">Sair</button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="brutalist-btn text-xs py-2 px-4 text-center">Entrar</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

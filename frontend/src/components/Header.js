import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useSiteSettings } from "../contexts/SiteSettingsContext";
import { Menu, X, LogOut, Package, Radio, Home, Target, ShoppingBag, BookOpen, Image, Video, Crown, Tv, User, Settings } from "lucide-react";
import api from "../lib/api";

export default function Header() {
  const { user, logout } = useAuth();
  const { settings } = useSiteSettings();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const check = () => api.get("/live/status").then(r => setIsLive(r.data.is_live)).catch(() => {});
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  const navSections = [
    {
      title: "Navegacao",
      items: [
        { to: "/", label: settings.nav_label_home || "Inicio", icon: <Home size={18} /> },
        { to: settings.nav_url_campaigns || "/#campanhas", label: settings.nav_label_campaigns || "Campanhas", icon: <Target size={18} /> },
        { to: settings.nav_url_store || "/loja", label: settings.nav_label_store || "Loja", icon: <ShoppingBag size={18} />, isLink: true },
        { to: settings.nav_url_bio || "/#biografia", label: settings.nav_label_bio || "Biografia", icon: <BookOpen size={18} /> },
        { to: settings.nav_url_gallery || "/#galeria", label: settings.nav_label_gallery || "Galeria", icon: <Image size={18} /> },
      ]
    },
    {
      title: "Conteudo",
      items: [
        { to: "/videos", label: "Videos", icon: <Video size={18} />, isLink: true },
        { to: "/live", label: isLive ? "AO VIVO" : "Live", icon: <Tv size={18} />, isLink: true, isLive: true },
        { to: "/assinatura", label: "Assinatura", icon: <Crown size={18} />, isLink: true },
      ]
    },
    {
      title: "Minha Conta",
      items: [
        ...(user ? [
          { to: "/meus-pedidos", label: "Meus Pedidos", icon: <Package size={18} />, isLink: true },
          ...(user.role === "admin" ? [{ to: "/admin", label: "Painel Admin", icon: <Settings size={18} />, isLink: true }] : []),
        ] : [
          { to: "/login", label: "Entrar / Cadastrar", icon: <User size={18} />, isLink: true },
        ]),
      ]
    }
  ];

  const handleNavClick = (to) => {
    setSidebarOpen(false);
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

  const isActive = (to) => {
    if (to === "/") return location.pathname === "/";
    if (to.includes("#")) return false;
    return location.pathname === to;
  };

  return (
    <>
      <header data-testid="main-header" className="sticky top-0 z-40 backdrop-blur-xl border-b-2" style={{ backgroundColor: `${settings.header_bg_color || '#ffffff'}e6`, borderColor: settings.header_border_color || settings.secondary_color }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          {/* Menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 hover:bg-zinc-100 transition-colors"
            style={{ color: settings.text_color }}
            data-testid="sidebar-toggle"
          >
            <Menu size={24} />
          </button>

          {/* Logo center */}
          <Link to="/" className="font-['Outfit'] font-black text-xl sm:text-2xl uppercase tracking-tight flex items-center gap-2 absolute left-1/2 -translate-x-1/2" style={{ color: settings.text_color }}>
            {settings.header_icon_url && <img src={settings.header_icon_url} alt="" className="h-8 w-8 object-contain" />}
            {settings.logo_url ? (
              <img src={settings.logo_url} alt={settings.site_name} className="h-10" />
            ) : (
              <>{firstName}<span style={{ color: settings.primary_color }}>.</span>{lastName}</>
            )}
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isLive && (
              <Link to="/live" className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider animate-pulse" data-testid="live-badge">
                <Radio size={12} /> LIVE
              </Link>
            )}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 font-bold max-w-[80px] truncate hidden sm:block">{user.name || user.email}</span>
                <button onClick={logout} className="text-zinc-500 hover:text-zinc-950 p-1" data-testid="logout-btn"><LogOut size={18} /></button>
              </div>
            ) : (
              <Link to="/login" className="brutalist-btn text-xs py-1.5 px-3" data-testid="login-link">Entrar</Link>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50" data-testid="sidebar-overlay">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />

          {/* Sidebar */}
          <aside className="absolute top-0 left-0 h-full w-80 max-w-[85vw] border-r-2 shadow-2xl overflow-y-auto" style={{ backgroundColor: settings.sidebar_bg_color || "#ffffff", borderColor: settings.header_border_color || settings.secondary_color }} data-testid="sidebar-menu">
            {/* Sidebar header */}
            <div className="flex items-center justify-between p-4 border-b-2" style={{ borderColor: settings.header_border_color || settings.secondary_color }}>
              <span className="font-['Outfit'] font-black text-lg uppercase" style={{ color: settings.text_color }}>
                {firstName}<span style={{ color: settings.primary_color }}>.</span>{lastName}
              </span>
              <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-zinc-100" data-testid="sidebar-close">
                <X size={20} />
              </button>
            </div>

            {/* Navigation sections */}
            <div className="p-4 space-y-6">
              {navSections.map((section) => (
                <div key={section.title}>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-3 px-3">{section.title}</h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const active = isActive(item.to);
                      const content = (
                        <div className={`flex items-center gap-3 px-3 py-2.5 font-bold text-sm uppercase tracking-wider transition-all ${
                          item.isLive && isLive
                            ? "text-red-600 bg-red-50"
                            : active
                              ? "text-zinc-950 bg-zinc-100"
                              : "text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50"
                        }`}>
                          <span className={item.isLive && isLive ? "animate-pulse" : ""}>{item.icon}</span>
                          <span>{item.label}</span>
                          {active && <span className="w-1.5 h-1.5 ml-auto" style={{ backgroundColor: settings.primary_color }} />}
                        </div>
                      );

                      if (item.isLink || !item.to.includes("#")) {
                        return (
                          <Link key={item.to} to={item.to} onClick={() => setSidebarOpen(false)} data-testid={`sidebar-link-${item.to.replace(/[/#]/g, "")}`}>
                            {content}
                          </Link>
                        );
                      }
                      return (
                        <button key={item.to} onClick={() => handleNavClick(item.to)} className="w-full text-left" data-testid={`sidebar-link-${item.to.replace(/[/#]/g, "")}`}>
                          {content}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Custom Links */}
              {(settings.custom_links || []).filter(l => l.label && l.url).length > 0 && (
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-400 mb-3 px-3">Links</h3>
                  <div className="space-y-1">
                    {(settings.custom_links || []).filter(l => l.label && l.url).map((link, i) => (
                      <a key={i} href={link.url} onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-50 font-bold text-sm uppercase tracking-wider transition-all" data-testid={`sidebar-custom-link-${i}`}>
                        <span className="w-[18px] h-[18px] border-2 border-current flex items-center justify-center text-xs">+</span>
                        <span>{link.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Menu Buttons */}
              {(settings.custom_buttons || []).filter(b => b.label && b.url && b.position === "menu").length > 0 && (
                <div className="space-y-2">
                  {(settings.custom_buttons || []).filter(b => b.label && b.url && b.position === "menu").map((btn, i) => (
                    <a key={i} href={btn.url} onClick={() => setSidebarOpen(false)} className={`block mx-3 px-4 py-2.5 font-bold text-sm uppercase tracking-wider text-center border-2 border-zinc-950 transition-all ${
                      btn.style === "secondary" ? "bg-zinc-950 text-white hover:bg-zinc-800" :
                      btn.style === "outline" ? "bg-transparent text-zinc-950 hover:bg-zinc-100" :
                      "hover:translate-y-[-1px]"
                    }`} style={btn.style === "primary" ? { backgroundColor: settings.btn_color || "#FFDE00", color: settings.btn_text_color || "#09090B", borderColor: settings.btn_color || "#FFDE00" } : {}} data-testid={`sidebar-custom-btn-${i}`}>
                      {btn.label}
                    </a>
                  ))}
                </div>
              )}

              {/* User logout */}
              {user && (
                <div className="border-t-2 border-zinc-200 pt-4">
                  <button
                    onClick={() => { logout(); setSidebarOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 text-zinc-500 hover:text-red-600 font-bold text-sm uppercase tracking-wider w-full text-left transition-colors"
                    data-testid="sidebar-logout"
                  >
                    <LogOut size={18} />
                    <span>Sair ({user.name || user.email})</span>
                  </button>
                </div>
              )}

              {/* Support */}
              <div className="border-t-2 border-zinc-200 pt-4">
                <p className="text-xs text-zinc-400 px-3">Suporte:</p>
                <a href={`mailto:${settings.support_email}`} className="text-xs text-zinc-500 hover:text-zinc-700 px-3 break-all">{settings.support_email}</a>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

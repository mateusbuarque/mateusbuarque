import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Menu, X, LogOut } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/#campanhas", label: "Campanhas" },
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

  return (
    <header
      data-testid="main-header"
      className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b-2 border-zinc-950"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link to="/" className="font-['Outfit'] font-black text-xl sm:text-2xl uppercase tracking-tight text-zinc-950">
          Edegar<span className="text-[#FFDE00]">.</span>Agostinho
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <button
              key={l.to}
              onClick={() => handleNavClick(l.to)}
              className="font-['Outfit'] font-bold text-sm uppercase tracking-wider text-zinc-700 hover:text-zinc-950 transition-colors"
            >
              {l.label}
            </button>
          ))}
          {user && user.role === "admin" ? (
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                className="brutalist-btn text-xs py-2 px-4"
                data-testid="admin-panel-link"
              >
                Admin
              </Link>
              <button
                onClick={logout}
                className="text-zinc-500 hover:text-zinc-950"
                data-testid="logout-btn"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link
              to="/admin/login"
              className="font-['Outfit'] font-bold text-sm uppercase tracking-wider text-zinc-400 hover:text-zinc-700 transition-colors"
              data-testid="login-link"
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-zinc-950"
          onClick={() => setMobileOpen(!mobileOpen)}
          data-testid="mobile-menu-toggle"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t-2 border-zinc-950 bg-white">
          <div className="px-4 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <button
                key={l.to}
                onClick={() => handleNavClick(l.to)}
                className="font-['Outfit'] font-bold text-sm uppercase tracking-wider text-zinc-700 text-left"
              >
                {l.label}
              </button>
            ))}
            {user && user.role === "admin" ? (
              <>
                <Link to="/admin" className="brutalist-btn text-xs py-2 px-4 text-center" onClick={() => setMobileOpen(false)}>Admin</Link>
                <button onClick={() => { logout(); setMobileOpen(false); }} className="text-zinc-500 text-left text-sm font-bold uppercase">Sair</button>
              </>
            ) : (
              <Link to="/admin/login" onClick={() => setMobileOpen(false)} className="text-zinc-400 text-sm font-bold uppercase">Admin</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

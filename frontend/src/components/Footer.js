export default function Footer() {
  return (
    <footer data-testid="main-footer" className="bg-zinc-950 text-white py-12 border-t-2 border-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-['Outfit'] font-black text-2xl uppercase mb-2">
              Edegar<span className="text-[#FFDE00]">.</span>Agostinho
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Comediante, escritor e ilustrador. Apoie a comedia brasileira.
            </p>
          </div>
          <div>
            <h4 className="font-['Outfit'] font-bold text-sm uppercase tracking-wider mb-4 text-[#FFDE00]">
              Links
            </h4>
            <div className="flex flex-col gap-2">
              <a href="/#campanhas" className="text-zinc-400 hover:text-white text-sm transition-colors">Campanhas</a>
              <a href="/#biografia" className="text-zinc-400 hover:text-white text-sm transition-colors">Biografia</a>
              <a href="/#galeria" className="text-zinc-400 hover:text-white text-sm transition-colors">Galeria</a>
            </div>
          </div>
          <div>
            <h4 className="font-['Outfit'] font-bold text-sm uppercase tracking-wider mb-4 text-[#FFDE00]">
              Plataforma
            </h4>
            <p className="text-zinc-400 text-sm">
              Taxa de 5% sobre o valor arrecadado. Produto entregue ao comprador mesmo que fature R$0.
            </p>
          </div>
        </div>
        <div className="border-t border-zinc-800 mt-8 pt-8 text-center text-zinc-500 text-sm">
          {new Date().getFullYear()} Edegar Agostinho. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}

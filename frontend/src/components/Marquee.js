import MarqueeLib from "react-fast-marquee";

export default function Marquee() {
  return (
    <div
      className="bg-zinc-950 text-[#FFDE00] py-4 border-y-2 border-zinc-950 overflow-hidden"
      data-testid="marquee-strip"
    >
      <MarqueeLib speed={50} gradient={false}>
        <span className="font-['Outfit'] font-black text-lg sm:text-2xl uppercase tracking-wider mx-8">
          FINANCIAMENTO COLETIVO
        </span>
        <span className="font-['Outfit'] font-black text-lg sm:text-2xl uppercase tracking-wider mx-8">
          &bull;
        </span>
        <span className="font-['Outfit'] font-black text-lg sm:text-2xl uppercase tracking-wider mx-8">
          PRODUTO ENTREGUE MESMO SE FATURAR R$0
        </span>
        <span className="font-['Outfit'] font-black text-lg sm:text-2xl uppercase tracking-wider mx-8">
          &bull;
        </span>
        <span className="font-['Outfit'] font-black text-lg sm:text-2xl uppercase tracking-wider mx-8">
          APOIE A COMEDIA
        </span>
        <span className="font-['Outfit'] font-black text-lg sm:text-2xl uppercase tracking-wider mx-8">
          &bull;
        </span>
        <span className="font-['Outfit'] font-black text-lg sm:text-2xl uppercase tracking-wider mx-8">
          EDEGAR AGOSTINHO
        </span>
        <span className="font-['Outfit'] font-black text-lg sm:text-2xl uppercase tracking-wider mx-8">
          &bull;
        </span>
      </MarqueeLib>
    </div>
  );
}

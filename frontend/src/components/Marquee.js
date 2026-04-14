import MarqueeLib from "react-fast-marquee";
import { useSiteSettings } from "../contexts/SiteSettingsContext";

export default function Marquee() {
  const { settings } = useSiteSettings();
  const parts = (settings.marquee_text || "").split("*").filter(Boolean).map(s => s.trim());

  return (
    <div className="py-4 border-y-2 overflow-hidden" style={{ backgroundColor: settings.secondary_color, borderColor: settings.secondary_color, color: settings.primary_color }} data-testid="marquee-strip">
      <MarqueeLib speed={50} gradient={false}>
        {parts.map((text, i) => (
          <span key={i}>
            <span className="font-['Outfit'] font-black text-lg sm:text-2xl uppercase tracking-wider mx-8">{text}</span>
            <span className="font-['Outfit'] font-black text-lg sm:text-2xl uppercase tracking-wider mx-4">&bull;</span>
          </span>
        ))}
      </MarqueeLib>
    </div>
  );
}

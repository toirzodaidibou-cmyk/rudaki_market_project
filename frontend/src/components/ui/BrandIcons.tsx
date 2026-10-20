import type { SimpleIcon } from "simple-icons";
import { siInstagram, siTelegram, siWhatsapp } from "simple-icons";

// Логотипҳои расмии брендҳо (Simple Icons). Ранг — currentColor; ранги бренд: BRAND_COLORS.
function Brand({ icon, className = "" }: { icon: SimpleIcon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d={icon.path} />
    </svg>
  );
}

export const BRAND_COLORS = {
  telegram: `#${siTelegram.hex}`,
  whatsapp: `#${siWhatsapp.hex}`,
  instagram: `#${siInstagram.hex}`,
};

export const TelegramIcon = ({ className }: { className?: string }) => <Brand icon={siTelegram} className={className} />;
export const WhatsAppIcon = ({ className }: { className?: string }) => <Brand icon={siWhatsapp} className={className} />;
export const InstagramIcon = ({ className }: { className?: string }) => <Brand icon={siInstagram} className={className} />;

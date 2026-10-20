// «Парвози мол ба сабад»: нусхаи сурати мол бо хати каҷ ба иконаи сабад (менюи поён) меравад,
// баъд сабад «меҷунбад» (ҳодисаи CART_BUMP). Бе китобхона — Web Animations API.

export const CART_BUMP = "rm:cart-bump";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Иконаи сабади намоён (дар компютер ва телефон — менюи поён). */
function cartTarget(): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>("[data-cart-target]");
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

/**
 * from — элементе, ки аз он «парвоз» оғоз мешавад (тугма). Сурат аз наздиктарин [data-fly-root] гирифта мешавад;
 * агар сурат набошад — доираи сабз аз худи тугма.
 */
export function flyToCart(from: HTMLElement) {
  if (typeof window === "undefined") return;
  const target = cartTarget();
  const bump = () => window.dispatchEvent(new Event(CART_BUMP));
  if (!target || reducedMotion()) return bump();

  const img = from.closest("[data-fly-root]")?.querySelector<HTMLImageElement>("img");
  const source = img && img.getBoundingClientRect().width > 0 ? img : from;
  const s = source.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const size = Math.min(96, Math.max(44, Math.min(s.width, s.height) * 0.6));

  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${s.left + s.width / 2 - size / 2}px`,
    top: `${s.top + s.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "9999px",
    zIndex: "200",
    pointerEvents: "none",
    background: img ? `#fff url("${img.currentSrc || img.src}") center / 78% no-repeat` : "var(--accent)",
    boxShadow: "0 10px 28px -8px rgba(0,0,0,.35), 0 0 0 3px rgba(255,255,255,.9)",
    willChange: "transform, opacity",
  });
  document.body.appendChild(ghost);

  const dx = t.left + t.width / 2 - (s.left + s.width / 2);
  const dy = t.top + t.height / 2 - (s.top + s.height / 2);
  // Каҷӣ: аввал каме боло, баъд ба сабад (мисли партофтан)
  const lift = Math.min(160, Math.abs(dy) * 0.35 + 60);
  const anim = ghost.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${dy * 0.25 - lift}px) scale(0.85)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.18)`, opacity: 0.6 },
    ],
    { duration: 720, easing: "cubic-bezier(.45,.05,.55,.95)" },
  );
  const done = () => {
    ghost.remove();
    bump();
  };
  anim.onfinish = done;
  anim.oncancel = done;
}

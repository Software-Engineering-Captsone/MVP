/**
 * Landing in-page scroll: Athletes / Brands are peer cards — use instant scroll
 * for short hops so switching between them doesn’t feel like a jarring animation.
 */
export function scrollBehaviorForSection(
  el: HTMLElement,
  id: string,
  reducedMotion: boolean
): ScrollBehavior {
  if (reducedMotion) return "auto";
  if (id !== "athletes" && id !== "brands") return "smooth";

  const marginTop = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
  const top = el.getBoundingClientRect().top + window.scrollY;
  const targetY = top - marginTop;
  const distance = Math.abs(targetY - window.scrollY);
  const threshold = Math.min(640, window.innerHeight * 0.85);
  return distance < threshold ? "auto" : "smooth";
}

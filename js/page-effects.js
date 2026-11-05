// Shared behaviour of the long editorial pages (case studies): smooth scrolling inside the page's own
// scroll box (Lenis), subtle image parallax, edge drift, reveal-on-enter, close buttons.
// Ported from components/useEditorialScroll.ts. Returns a function that undoes everything.
import { fillAdjacent } from "./adjacent.js";

// Close / Back: when the visitor came from the home page, step back in history, so the browser restores the
// board exactly as it was (same panel open). Otherwise open the home page on the finished board (index.html#board
// skips the intro). Browsers with cross-document view transitions crossfade by themselves (css/base.css);
// older ones get a short fade-out first.
function goHome() {
  const home = new URL("index.html", document.baseURI);
  let fromHome = false;
  try {
    const ref = new URL(document.referrer);
    fromHome = ref.origin === home.origin && (ref.pathname === home.pathname || ref.pathname === home.pathname.replace(/index\.html$/, ""));
  } catch {}
  const go = () => (fromHome && history.length > 1 ? history.back() : location.assign(`${home.href}#board`));
  if ("onpagereveal" in window || matchMedia("(prefers-reduced-motion: reduce)").matches) return go();
  document.documentElement.classList.add("leaving");
  setTimeout(go, 280);
}
addEventListener("pageshow", (e) => { if (e.persisted) document.documentElement.classList.remove("leaving"); });

export function editorialScroll(cs) {
  const content = cs.querySelector("[data-cs-content]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  cs.focus({ preventScroll: true });

  let lenis = null;
  let raf = 0;
  if (window.Lenis && !reduced) {
    lenis = new window.Lenis({ wrapper: cs, content, lerp: 0.11, smoothWheel: true });
    cs.lenis = lenis; // pages use it to glide to a section (e.g. the Elevator Empire section nav)
    const loop = (t) => {
      lenis.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  const layers = [...cs.querySelectorAll("[data-parallax]")];
  const drift = [...cs.querySelectorAll("[data-drift]")];
  const parallax = () => {
    const vh = innerHeight;
    for (const el of layers) {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      const p = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.transform = `translate3d(0, ${(p * -7).toFixed(2)}%, 0)`;
    }
    if (reduced) return;
    for (const el of drift) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      el.style.setProperty("--drift", `${(((r.top + r.height / 2) / vh - 0.5) * -48).toFixed(1)}px`);
    }
  };
  cs.addEventListener("scroll", parallax, { passive: true });
  parallax();
  const late = setTimeout(parallax, 400);

  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("in");
        const v = e.target.querySelector("video[data-autoplay]");
        if (v) e.isIntersecting ? v.play().catch(() => {}) : v.pause();
      }),
    { root: cs, threshold: 0.12 },
  );
  cs.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

  // Previous / Next project at the end of the page (js/adjacent.js)
  fillAdjacent(cs).catch((e) => console.error("Could not build the previous / next links", e));

  // Close buttons: when the 3D home page loaded this page it listens for "project:close";
  // opened on its own, they simply go back to the home page.
  const onClick = (e) => {
    // opened from the 3D home page: slide to the other project in place instead of loading a new page
    const sw = e.target.closest("[data-switch]");
    if (sw && !document.body.hasAttribute("data-standalone")) {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent("project:switch", { detail: { slug: sw.dataset.switch, dir: Number(sw.dataset.dir) || 1 } }));
      return;
    }
    if (!e.target.closest("[data-action=close]")) return;
    if (document.body.hasAttribute("data-standalone")) goHome();
    else document.dispatchEvent(new CustomEvent("project:close"));
  };
  cs.addEventListener("click", onClick);

  return () => {
    clearTimeout(late);
    cancelAnimationFrame(raf);
    lenis?.destroy();
    io.disconnect();
    cs.removeEventListener("scroll", parallax);
    cs.removeEventListener("click", onClick);
  };
}

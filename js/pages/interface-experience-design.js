// Interface and Experience Design (ParallelConnect dashboards): the shared editorial scroll, a reading-progress
// line, a section index that follows the reader, the "build a path" explorer, a click-to-enlarge image viewer and
// a count-up number. The page's HTML is projects/interface-experience-design.html.
import { editorialScroll } from "../page-effects.js";

// Journey stages and options exactly as shown in the Coca-Cola Journey Mapping screen ([label, share %]).
// `pick` is the path highlighted in that screen.
const STAGES = [
  { name: "Main Objectives", pick: 1, nodes: [["Convenient & Quick", 24], ["Affordable", 21], ["Explore New Places", 16], ["Relax", 14], ["Affordable Comfort", 10], ["Enjoyable Experiences", 9], ["Extend Leisure", 5]] },
  { name: "Visits Planned", pick: 0, nodes: [["Unplanned", 66], ["Planned", 34]] },
  { name: "Where Decided", pick: 1, nodes: [["At Home", 37], ["In Street", 29], ["In Car", 19], ["At Work", 11]] },
  { name: "Mode of Delivery", pick: 0, nodes: [["Dine in", 77], ["Take away", 17], ["Delivery", 4], ["Drive-Thru", 2]] },
  { name: "With Food vs Without Food", pick: 0, nodes: [["Both food & beverages", 87], ["Food only", 12], ["Beverages Only", 1]] },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function explorer(cs) {
  const box = cs.querySelector("[data-explorer]");
  if (!box) return () => {};
  const grid = box.querySelector("[data-explorer-grid]");
  const out = box.querySelector("[data-explorer-path]");
  const sel = STAGES.map((s) => s.pick);
  const total = STAGES.reduce((n, s) => n * s.nodes.length, 1);

  grid.innerHTML =
    `<div class="ixd-x-root"><b>Total AFH Shoppers</b>281.2M · 100%</div>` +
    STAGES.map(
      (s, si) =>
        `<fieldset class="ixd-x-stage"><legend>${esc(s.name)}</legend>` +
        s.nodes
          .map(
            ([label, v], ni) =>
              `<button type="button" class="ixd-x-node" data-s="${si}" data-n="${ni}" aria-pressed="${sel[si] === ni}">` +
              `<span class="ixd-x-bar" style="--v:${v}"><i></i></span><span><span>${esc(label)}</span><span>${v}%</span></span></button>`,
          )
          .join("") +
        `</fieldset>`,
    ).join("");

  const render = () => {
    grid.querySelectorAll(".ixd-x-node").forEach((b) => b.setAttribute("aria-pressed", String(sel[b.dataset.s] === Number(b.dataset.n))));
    out.innerHTML =
      STAGES.map((s, i) => `<strong>${esc(s.nodes[sel[i]][0])}</strong> ${s.nodes[sel[i]][1]}%`).join(" → ") +
      `<small>Labels and shares as shown in the screen; here they stay static, whereas the delivered tool may recalculate downstream shares for the chosen path. ${total} possible paths.</small>`;
  };
  const onClick = (e) => {
    const b = e.target.closest(".ixd-x-node");
    if (!b) return;
    sel[b.dataset.s] = Number(b.dataset.n);
    render();
  };
  grid.addEventListener("click", onClick);
  render();
  return () => grid.removeEventListener("click", onClick);
}

function lightbox(cs) {
  let box = null;
  let lastFocus = null;
  const close = () => {
    box?.remove();
    box = null;
    cs.lenis?.start();
    lastFocus?.focus({ preventScroll: true });
  };
  const open = (img) => {
    lastFocus = document.activeElement;
    box = document.createElement("div");
    box.className = "ixd-lb";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Enlarged image");
    box.innerHTML =
      `<div class="ixd-lb-bar"><span>Click the image for actual size</span><button type="button" data-lb-close>Close ×</button></div>` +
      `<div class="ixd-lb-view" data-lenis-prevent><img src="${esc(img.currentSrc || img.src)}" alt="${esc(img.alt)}" /></div>`;
    cs.appendChild(box);
    cs.lenis?.stop();
    box.querySelector("[data-lb-close]").focus();
  };
  const onClick = (e) => {
    if (box) {
      if (e.target.closest("[data-lb-close]")) close();
      else if (e.target.closest(".ixd-lb-view img")) box.classList.toggle("zoomed");
      else if (e.target.classList.contains("ixd-lb-view")) close();
      return;
    }
    const z = e.target.closest("[data-zoom]");
    if (z) open(z.querySelector("img"));
  };
  const onKey = (e) => {
    if (!box) return;
    if (e.key === "Escape") {
      e.stopPropagation(); // don't also close the project
      close();
    } else if (e.key === "Tab") {
      e.preventDefault(); // one control in the dialog: keep focus on it
      box.querySelector("[data-lb-close]").focus();
    }
  };
  cs.addEventListener("click", onClick);
  cs.addEventListener("keydown", onKey, true);
  return () => {
    close();
    cs.removeEventListener("click", onClick);
    cs.removeEventListener("keydown", onKey, true);
  };
}

function sectionIndex(cs) {
  const nav = cs.querySelector(".ixd-index");
  if (!nav) return () => {};
  const links = [...nav.querySelectorAll("a[data-goto]")];
  const targets = links.map((a) => cs.querySelector(a.getAttribute("href")));
  const hero = cs.querySelector(".ixd-hero");
  let raf = 0;
  const update = () => {
    raf = 0;
    const mid = innerHeight * 0.35;
    let cur = -1;
    targets.forEach((t, i) => {
      if (t && t.getBoundingClientRect().top <= mid) cur = i;
    });
    links.forEach((a, i) => (i === cur ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
    nav.classList.toggle("on", hero.getBoundingClientRect().bottom < innerHeight * 0.5);
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  const onClick = (e) => {
    const a = e.target.closest("a[data-goto]");
    if (!a) return;
    e.preventDefault(); // stay on this page; glide inside the project's own scroll box
    const t = cs.querySelector(a.getAttribute("href"));
    if (cs.lenis) cs.lenis.scrollTo(t, { offset: -40 });
    else t.scrollIntoView({ block: "start" });
  };
  cs.addEventListener("scroll", onScroll, { passive: true });
  nav.addEventListener("click", onClick);
  update();
  return () => {
    cancelAnimationFrame(raf);
    cs.removeEventListener("scroll", onScroll);
    nav.removeEventListener("click", onClick);
  };
}

function progress(cs) {
  const bar = cs.querySelector(".ixd-progress");
  let raf = 0;
  const set = () => {
    raf = 0;
    const max = cs.scrollHeight - cs.clientHeight;
    bar?.style.setProperty("--p", max > 0 ? (cs.scrollTop / max).toFixed(4) : "0");
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(set);
  };
  cs.addEventListener("scroll", onScroll, { passive: true });
  set();
  return () => {
    cancelAnimationFrame(raf);
    cs.removeEventListener("scroll", onScroll);
  };
}

function countUp(cs) {
  const el = cs.querySelector("[data-count]");
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const end = Number(el.dataset.count);
  let raf = 0;
  const io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / 1400);
        el.textContent = String(Math.round(end * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    },
    { root: cs, threshold: 0.6 },
  );
  io.observe(el);
  return () => {
    io.disconnect();
    cancelAnimationFrame(raf);
    el.textContent = String(end);
  };
}

export function mount(cs) {
  const undo = [editorialScroll(cs), explorer(cs), lightbox(cs), sectionIndex(cs), progress(cs), countUp(cs)];
  return () => undo.reverse().forEach((f) => f());
}

// opened on its own (not loaded by the 3D home page)
if (document.body.hasAttribute("data-standalone")) {
  mount(document.querySelector(".cs"));
}

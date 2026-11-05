// Landing board (landing.html).
//  - desktop: the 1440 x 1024 world is pinned; scrolling pulls the camera back from a zoomed-in view of the
//    intro note while every card flies in from outside the frame and settles at its Figma position.
//  - phones / narrow windows: a vertical board; each card rises into place as it scrolls into view.
//  - every card has its own hover / tap micro-interaction (mostly CSS, see css/landing.css); this file adds
//    pointer tilt, the game-boy d-pad, draggable stickers, the panels, the contact / gallery / blogs actions.
await import(`./data.js?v=${Date.now()}`).catch(() => {});
const SITE = window.SITE || { projects: [], profile: { name: "Thavanesh Nagarajan", roles: [], skills: [], education: [], links: [], email: "thavanesh.n.official@gmail.com" } };
const profile = SITE.profile;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const narrow = matchMedia("(max-width: 899px)");

const scene = $("[data-scene]");
const viewport = $("[data-viewport]");
const world = $("[data-world]");
const skip = $(".skip");
const cue = $(".scroll-cue");
const intro = $(".el-intro");
const els = $$(".el", world);

/* ------------------------------------------------------------------ layout / camera */
const Z0 = 2.05; // starting zoom of the camera
let vw = 0, vh = 0, sw = 1440, sh = 1024, fit = 1, mobile = false, S = 1, lenis = null, progress = 0;

const num = (cs, name, d = 0) => {
  const v = parseFloat(cs.getPropertyValue(name));
  return Number.isFinite(v) ? v : d;
};

function measure() {
  vw = innerWidth;
  vh = innerHeight;
  mobile = narrow.matches;
  const wcs = getComputedStyle(world);
  sw = num(wcs, "--sw", 1440);
  sh = num(wcs, "--sh", 1024);
  fit = mobile ? vw / sw : Math.min(vw / sw, vh / sh);
  for (const el of els) {
    const cs = getComputedStyle(el);
    const cx = num(cs, "--cx"), cy = num(cs, "--cy");
    const idx = el.dataset.fly === "none" || el.dataset.fly === undefined ? -1 : Number(el.dataset.fly);
    const vx = cx - sw / 2, vy = cy - sh / 2, len = Math.hypot(vx, vy) || 1;
    el._m = {
      cx, cy, r: num(cs, "--r"), k: num(cs, "--k", 1), idx,
      // where it comes from: outwards along its own direction, beyond the camera frame
      fx: mobile ? (cx < sw / 2 ? -46 : 46) : vx * 1.45 + (vx / len) * 80,
      fy: mobile ? 110 : vy * 1.45 + (vy / len) * 80,
      fr: (cx < sw / 2 ? -1 : 1) * (mobile ? 9 : 16 + (idx % 3) * 5),
      h: num(cs, "--h"),
    };
  }
  if (mobile) viewport.style.height = `${sh * fit}px`;
  else viewport.style.height = "";
  if (reduced && !mobile) scene.style.height = "100vh";
  else if (!mobile) scene.style.height = "";
}

function place(el, q, extraScale = 1) {
  const m = el._m;
  if (q >= 1) {
    el.style.transform = `rotate(${m.r}deg) scale(${m.k * extraScale})`;
    el.style.opacity = "";
    el.style.pointerEvents = "";
    return;
  }
  el.style.transform = `translate(${m.fx * (1 - q)}px, ${m.fy * (1 - q)}px) rotate(${m.r + m.fr * (1 - q)}deg) scale(${m.k * (0.72 + 0.28 * q) * extraScale})`;
  el.style.opacity = String(clamp(q * 2.6));
  el.style.pointerEvents = q < 0.7 ? "none" : "";
}

function render() {
  if (!vw) return;
  if (mobile) {
    S = fit;
    world.style.transform = `scale(${fit})`;
    const top = viewport.getBoundingClientRect().top;
    for (const el of els) {
      const m = el._m;
      if (m.idx < 0 || m.idx === 0) { place(el, 1); continue; }
      if (reduced) { place(el, 1); continue; }
      const screenY = top + m.cy * fit;
      place(el, easeOut(clamp((vh * 0.96 - screenY) / (vh * 0.32))));
    }
    return;
  }
  const p = reduced ? 1 : progress;
  const ez = easeInOut(clamp((p - 0.03) / 0.87));
  const zoom = lerp(Z0, 1, ez);
  const cxw = lerp(sw / 2, sw / 2, ez), cyw = lerp(sh / 2 - 6, sh / 2, ez);
  S = fit * zoom;
  world.style.transform = `translate(${vw / 2 - cxw * S}px, ${vh / 2 - cyw * S}px) scale(${S})`;
  for (const el of els) {
    const m = el._m;
    if (m.idx < 0) {
      // the intro note: readable at the start, folds away as the cards arrive
      const a = reduced ? 0 : 1 - clamp((p - 0.26) / 0.26);
      el.style.opacity = String(a);
      el.style.visibility = a <= 0.001 ? "hidden" : "visible";
      el.style.pointerEvents = "none";
      el.style.transform = `rotate(${m.r}deg) scale(${m.k * (1 - (1 - a) * 0.12)})`;
    } else if (m.idx === 0) {
      place(el, 1);
    } else {
      const d = 0.1 + m.idx * 0.045;
      place(el, reduced ? 1 : easeOut(clamp((p - d) / 0.46)));
    }
  }
  cue.style.opacity = String(clamp(1 - p * 9));
  skip.classList.toggle("gone", p > 0.94 || reduced);
}

function readProgress() {
  const max = scene.offsetHeight - vh;
  progress = max > 0 ? clamp(-scene.getBoundingClientRect().top / max) : 1;
}

let raf = 0;
const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (!mobile) readProgress(); render(); }); };

measure();
readProgress();
render();
addEventListener("scroll", queue, { passive: true });
addEventListener("resize", () => { measure(); queue(); });
narrow.addEventListener("change", () => { measure(); queue(); });
document.fonts?.ready.then(() => { measure(); queue(); });

if (window.Lenis && !reduced) {
  lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 0.95 });
  const loop = (t) => { lenis.raf(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
}

function jumpToBoard(smooth = true) {
  if (mobile) return;
  const y = scene.offsetTop + scene.offsetHeight - vh;
  if (lenis) lenis.scrollTo(y, { duration: smooth ? 1.6 : 0, immediate: !smooth });
  else scrollTo({ top: y, behavior: smooth && !reduced ? "smooth" : "auto" });
}
skip?.addEventListener("click", (e) => { e.preventDefault(); jumpToBoard(); $(".c-about")?.focus({ preventScroll: true }); });
// keyboard users tabbing into a card before the board is open: open it first
world.addEventListener("focusin", (e) => { if (!mobile && !reduced && progress < 0.9 && e.target.closest(".card, .sticker")) jumpToBoard(false); });

/* ------------------------------------------------------------------ toast */
const toastEl = $("#toast");
let toastT = 0;
function toast(msg, ms = 2400) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => toastEl.classList.remove("show"), ms);
}

/* ------------------------------------------------------------------ pointer tilt + per-card pointer effects */
const finePointer = matchMedia("(hover: hover)").matches;
for (const card of $$(".tilt")) {
  const about = card.classList.contains("c-about");
  const gb = card.classList.contains("c-gb");
  const dpad = gb ? $(".gb-dpad", card) : null;
  card.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch" || reduced) return;
    const r = card.getBoundingClientRect();
    const px = clamp((e.clientX - r.left) / r.width), py = clamp((e.clientY - r.top) / r.height);
    card.classList.add("tracking");
    card.style.setProperty("--rx", `${((0.5 - py) * 7).toFixed(2)}deg`);
    card.style.setProperty("--ry", `${((px - 0.5) * 9).toFixed(2)}deg`);
    if (about) {
      card.style.setProperty("--px", ((px - 0.5) * 2).toFixed(3));
      card.style.setProperty("--py", ((py - 0.5) * 2).toFixed(3));
    }
    if (dpad) {
      const d = dpad.getBoundingClientRect();
      const dx = e.clientX - (d.left + d.width / 2), dy = e.clientY - (d.top + d.height / 2);
      if (Math.hypot(dx, dy) < 110) dpad.dataset.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      else delete dpad.dataset.dir;
    }
  });
  const reset = () => {
    card.classList.remove("tracking");
    card.style.removeProperty("--rx");
    card.style.removeProperty("--ry");
    card.style.removeProperty("--px");
    card.style.removeProperty("--py");
    if (dpad) delete dpad.dataset.dir;
  };
  card.addEventListener("pointerleave", reset);
  card.addEventListener("blur", reset);
  // touch has no hover: a tap plays the hover animation
  card.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    card.classList.add("is-hot");
    setTimeout(() => card.classList.remove("is-hot"), 1400);
  });
}

/* ------------------------------------------------------------------ draggable stickers */
for (const st of $$(".sticker")) {
  let sx = 0, sy = 0, ox = 0, oy = 0, moved = false, active = false;
  const offset = () => (st._off ||= { x: 0, y: 0 });
  const apply = () => { st.style.translate = `${offset().x}px ${offset().y}px`; };
  st.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    active = true; moved = false;
    sx = e.clientX; sy = e.clientY; ox = offset().x; oy = offset().y;
    st.setPointerCapture(e.pointerId);
  });
  st.addEventListener("pointermove", (e) => {
    if (!active) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) < 5) return;
    if (!moved) { moved = true; st.classList.add("dragging"); }
    offset().x = ox + dx / S; offset().y = oy + dy / S;
    apply();
  });
  const end = () => {
    if (!active) return;
    active = false;
    st.classList.remove("dragging");
    if (!moved) { st.classList.remove("bounce"); void st.offsetWidth; st.classList.add("bounce"); setTimeout(() => st.classList.remove("bounce"), 1100); }
  };
  st.addEventListener("pointerup", end);
  st.addEventListener("pointercancel", end);
  st.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 40 : 14;
    const k = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!k) return;
    e.preventDefault();
    offset().x += k[0]; offset().y += k[1]; apply();
  });
}

/* ------------------------------------------------------------------ panels */
const panel = $("#panel");
const sheet = $("[data-sheet]");
let lastFocus = null;

const projectBySlug = (slug) => SITE.projects.find((p) => p.slug === slug);
function projectRows(slugs) {
  return `<ul class="rowlist">${slugs.map(projectBySlug).filter(Boolean).map((p) => {
    const img = p.thumbnailSmall ? `<img src="${esc(p.thumbnailSmall)}" alt="" loading="lazy">` : `<span class="ph" aria-hidden="true"></span>`;
    const inner = `${img}<span><b>${esc(p.title)}</b><small>${esc(p.subtitle)} · ${esc(p.year)}</small></span><span class="go" aria-hidden="true">${p.page ? "↗" : ""}</span>`;
    return p.page
      ? `<li><a class="row" href="${esc(p.page)}">${inner}</a></li>`
      : `<li><div class="row soon" aria-label="${esc(p.title)}, coming soon">${inner.replace('<span class="go" aria-hidden="true"></span>', '<small>Coming soon</small>')}</div></li>`;
  }).join("")}</ul>`;
}

const PANELS = {
  games: () => ({ k: "Game design", t: "Games and systems", html: `<p>Narrative games, casual simulations and live-ops design. Pick a project.</p>${projectRows(["songs-of-saaja", "umbrella-man", "elevator-empire", "farmville-2-event-design"])}` }),
  interaction: () => ({ k: "Interaction design", t: "Interfaces and experiences", html: `<p>Enterprise dashboards, data experiences and interface systems.</p>${projectRows(["interface-experience-design", "powerui-library"])}` }),
  resume: () => ({
    k: "Resume", t: "A paper can decide my fate?",
    html: `<p>Two versions, depending on what you are looking for.</p><ul class="rowlist">
      <li><a class="row" href="resume/Thavanesh_TheGameDesigner.pdf" target="_blank" rel="noopener"><span class="ph" aria-hidden="true"></span><span><b>The Game Designer</b><small>PDF</small></span><span class="go" aria-hidden="true">↗</span></a></li>
      <li><a class="row" href="resume/Thavanesh_TheExperienceDesigner.pdf" target="_blank" rel="noopener"><span class="ph" aria-hidden="true"></span><span><b>The Experience Designer</b><small>PDF</small></span><span class="go" aria-hidden="true">↗</span></a></li></ul>`,
  }),
  about: () => ({
    k: "About me", t: profile.name,
    html: `<ul class="chips">${(profile.roles || []).map((r) => `<li>${esc(r)}</li>`).join("")}</ul>
      <p>${esc(profile.intro)}</p>
      <h3>Education</h3><p>${(profile.education || []).map(esc).join("<br>")}</p>
      <h3>Skills</h3><ul class="chips">${(profile.skills || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      <h3>Find me</h3><p><a class="link" href="mailto:${esc(profile.email)}">${esc(profile.email)}</a>${(profile.links || []).map((l) => ` &nbsp;·&nbsp; <a class="link" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || new URL(l.url).hostname)}</a>`).join("")}</p>`,
  }),
  gallery: () => ({ k: "Gallery", t: "Moments", html: `<img class="lb-img" src="images/landing/gallery-photo.png" alt="A framed photograph from my gallery"><p style="margin-top:14px">More photographs are on the way.</p>` }),
};

function openPanel(id, from) {
  const c = PANELS[id]?.();
  if (!c) return;
  lastFocus = from || document.activeElement;
  $("#panel-k").textContent = c.k;
  $("#panel-title").textContent = c.t;
  $("#panel-body").innerHTML = c.html;
  panel.hidden = false;
  void panel.offsetWidth;
  panel.classList.add("open");
  sheet.scrollTop = 0;
  lenis?.stop();
  document.documentElement.style.overflow = "hidden";
  $("[data-close]", sheet).focus({ preventScroll: true });
}
function closePanel() {
  if (panel.hidden) return;
  panel.classList.remove("open");
  setTimeout(() => { panel.hidden = true; }, reduced ? 0 : 320);
  lenis?.start();
  document.documentElement.style.overflow = "";
  lastFocus?.focus?.({ preventScroll: true });
}
panel.addEventListener("click", (e) => { if (e.target === panel || e.target.closest("[data-close]")) closePanel(); });
addEventListener("keydown", (e) => {
  if (panel.hidden) return;
  if (e.key === "Escape") { e.preventDefault(); closePanel(); }
  else if (e.key === "Tab") {
    const f = $$("a[href], button", sheet).filter((n) => !n.disabled);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

/* ------------------------------------------------------------------ card actions */
world.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;
  const act = card.dataset.action, id = card.dataset.panel;
  if (act === "contact") {
    const email = profile.email || "thavanesh.n.official@gmail.com";
    navigator.clipboard?.writeText(email).then(() => toast(`Email copied: ${email}`)).catch(() => toast(email));
    card.classList.remove("sent"); void card.offsetWidth; card.classList.add("sent");
    return; // the mailto: link still opens the mail app
  }
  e.preventDefault();
  if (act === "blogs") {
    card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake");
    $$(".cone").forEach((c) => c.classList.add("fall"));
    toast("Blogs are under construction. Check back soon.");
    setTimeout(() => $$(".cone").forEach((c) => c.classList.remove("fall")), 2600);
    return;
  }
  const key = act === "gallery" ? "gallery" : id;
  if (card.classList.contains("c-phone")) { card.classList.add("press"); setTimeout(() => card.classList.remove("press"), 220); }
  if (card.classList.contains("c-gb")) { card.classList.remove("flick"); void card.offsetWidth; card.classList.add("flick"); }
  setTimeout(() => openPanel(key, card), reduced ? 0 : 200);
});

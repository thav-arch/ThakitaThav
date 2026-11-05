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
const hud = $("[data-hud]");
const lines = $('[data-role="lines"]', world);
const els = $$(".el", world);

/* ------------------------------------------------------------------ layout / camera
   The flow follows the reference recording, mapped onto scroll progress p (0 to 1):
     p 0 to .55    the start screen holds still (camera zoomed in 2x) while the cards slowly creep in from outside
     p .55 to .90  the camera pulls back fast; the grey tile and grid lines dissolve, the cards snap into place,
                   the smiley travels from the start tile to its spot on the board
     p .90 to 1    rest on the finished board                                                                      */
const Z0 = 2; // the start screen (Figma 556:1033) is the board seen at 2x
const A_END = 0.55, ZOOM_FROM = 0.58, ZOOM_LEN = 0.32;
// the smiley on the start screen: screen (376,648) 103x105 at 2x  ->  world offset from its final spot, and size ratio
const SMILEY = { dx: 720 + (376 + 51.5 - 720) / 2 - 706.99, dy: 512 + (648 + 52.5 - 512) / 2 - 497, k: 51.5 / 124 };
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
  // half of the world area the zoomed-in camera sees at the start
  const hx = vw / (2 * fit * Z0), hy = vh / (2 * fit * Z0);
  for (const el of els) {
    const cs = getComputedStyle(el);
    const cx = num(cs, "--cx"), cy = num(cs, "--cy"), k = num(cs, "--k", 1);
    const idx = el.dataset.fly === "none" || el.dataset.fly === undefined ? -1 : Number(el.dataset.fly);
    const vx = cx - sw / 2, vy = cy - sh / 2, len = Math.hypot(vx, vy) || 1;
    const ux = vx / len, uy = vy / len;
    const hw = (num(cs, "--w") / 2) * k, hh = (num(cs, "--h") / 2) * k;
    // distance along its own direction at which the card is just outside the camera frame (d0) and
    // peeking in by about 90 px at the end of the slow drift (dA); never closer than its final spot
    const edge = Math.min(Math.abs(ux) > 1e-6 ? hx / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-6 ? hy / Math.abs(uy) : 1e9);
    const ext = Math.abs(ux) * hw + Math.abs(uy) * hh;
    el._m = {
      cx, cy, r: num(cs, "--r"), k, idx, role: el.dataset.role || "", ux, uy, len,
      d0: Math.max(len, edge + ext + 40), dA: Math.max(len, edge + ext - 90),
      // mobile: a short rise from the side
      fx: cx < sw / 2 ? -46 : 46, fy: 110,
      fr: (cx < sw / 2 ? -1 : 1) * (mobile ? 9 : 6 + (idx % 3) * 3),
    };
  }
  if (mobile) viewport.style.height = `${sh * fit}px`;
  else viewport.style.height = "";
  if (reduced && !mobile) scene.style.height = "100vh";
  else if (!mobile) scene.style.height = "";
}

/* mobile: a card rises into place when it scrolls into view */
function place(el, q) {
  const m = el._m;
  if (q >= 1) {
    el.style.transform = `rotate(${m.r}deg) scale(${m.k})`;
    el.style.opacity = "";
    el.style.pointerEvents = "";
    return;
  }
  el.style.transform = `translate(${m.fx * (1 - q)}px, ${m.fy * (1 - q)}px) rotate(${m.r + m.fr * (1 - q)}deg) scale(${m.k * (0.72 + 0.28 * q)})`;
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
      if (m.role === "start" || m.idx <= 0 || reduced) { place(el, 1); continue; }
      const screenY = top + m.cy * fit;
      place(el, easeOut(clamp((vh * 0.96 - screenY) / (vh * 0.32))));
    }
    return;
  }

  const p = reduced ? 1 : progress;
  const zoom = lerp(Z0, 1, easeInOut(clamp((p - ZOOM_FROM) / ZOOM_LEN)));
  S = fit * zoom;
  // the camera looks at the middle of the world the whole time
  world.style.transform = `translate(${vw / 2 - (sw / 2) * S}px, ${vh / 2 - (sh / 2) * S}px) scale(${S})`;
  hud.style.transform = `scale(${fit})`;
  hud.style.opacity = String(clamp(1 - p / 0.06));
  skip.classList.toggle("gone", p > 0.9 || reduced);

  const drift = easeOut(clamp(p / A_END)); // slow phase
  const fade = clamp((p - 0.6) / 0.2); // grey tile / lines dissolving
  if (lines) lines.style.opacity = String(1 - clamp((p - 0.58) / 0.2));

  for (const el of els) {
    const m = el._m;
    if (m.role === "start") {
      el.style.opacity = String(1 - fade);
      el.style.visibility = fade >= 1 ? "hidden" : "visible";
      el.style.transform = `scale(${1 - 0.4 * fade})`;
    } else if (m.role === "bg") {
      el.style.opacity = String(0.61 * easeOut(clamp((p - 0.62) / 0.3)));
    } else if (m.role === "smiley") {
      const qs = easeInOut(clamp((p - ZOOM_FROM) / 0.34));
      el.style.transform = `translate(${SMILEY.dx * (1 - qs)}px, ${SMILEY.dy * (1 - qs)}px) rotate(${360 * (1 - qs)}deg) scale(${lerp(SMILEY.k, 1, qs)})`;
    } else {
      // card: slow drift from outside the frame, then the fast move to its place
      const qb = easeInOut(clamp((p - A_END - Math.max(0, m.idx) * 0.006) / 0.32));
      const d = p < A_END ? lerp(m.d0, m.dA, drift) : lerp(m.dA, m.len, qb);
      const ox = m.ux * d - (m.cx - sw / 2), oy = m.uy * d - (m.cy - sh / 2);
      el.style.transform = `translate(${ox}px, ${oy}px) rotate(${m.r + m.fr * (1 - qb)}deg) scale(${m.k})`;
      el.style.pointerEvents = qb < 0.9 ? "none" : "";
    }
  }
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
  gallery: () => ({ k: "Gallery", t: "Moments", html: `<img class="lb-img" src="images/landing/gallery-photo.webp" alt="A framed photograph from my gallery"><p style="margin-top:14px">More photographs are on the way.</p>` }),
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

// Landing board (index.html, the home page).
//  - desktop: scrolling pulls the camera back from a zoomed-in view of the intro note while every card flies
//    in from outside the frame and settles at its Figma position (see "intro driver" below).
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
const hud = $("[data-hud]");
const lines = $('[data-role="lines"]', world);
const els = $$(".el", world);

/* ------------------------------------------------------------------ layout / camera
   The flow follows the reference recording, mapped onto an intro progress p (0 to 1):
     p 0 to .55    the start screen holds still (camera zoomed in 2x) while the cards slowly creep in from outside
     p .55 to .90  the camera pulls back fast; the grey tile and grid lines dissolve, the cards snap into place,
                   the smiley travels from the start tile to its spot on the board
     p .90 to 1    rest on the finished board
   p is not tied to the scroll position. While the intro runs the page is locked; the wheel, touch and keys
   scrub p, and as soon as the input stops the intro finishes on its own in the direction it was going, so it
   never rests half way. At p = 1 the page unlocks; scrolling up from the top of the board plays it back.
   The finished board always fills the window width (no side gaps); if it is taller than the window the page
   simply scrolls down to the footer.                                                                          */
const Z0 = 2; // the start screen (Figma 556:1033) is the board seen at 2x the window width
const A_END = 0.55, ZOOM_FROM = 0.58, ZOOM_LEN = 0.32;
// the smiley on the start screen: screen (376,648) 103x105 at 2x  ->  world offset from its final spot, and size ratio
const SMILEY = { dx: 720 + (376 + 51.5 - 720) / 2 - 706.99, dy: 512 + (648 + 52.5 - 512) / 2 - 497, k: 51.5 / 124 };
let vw = 0, vh = 0, sw = 1440, sh = 1024, fit = 1, mobile = false, S = 1, progress = 0;
let S0 = 2, extraW = 0, cable = null;

const num = (cs, name, d = 0) => {
  const v = parseFloat(cs.getPropertyValue(name));
  return Number.isFinite(v) ? v : d;
};
const kind = (el) => [...el.classList].find((c) => c.startsWith("el-") && c !== "el")?.slice(3) || "";

function measure() {
  vw = document.documentElement.clientWidth || innerWidth;
  vh = innerHeight;
  mobile = narrow.matches;
  for (const el of els) { el.style.removeProperty("--w"); }
  const wcs = getComputedStyle(world);
  sw = num(wcs, "--sw", 1440);
  sh = num(wcs, "--sh", 1024);
  // phones: the vertical board fills the width. Desktop: the whole board, footer included, fits on one
  // screen in the exact Figma composition; on windows wider than the 1440 x 1024 frame the board's
  // background and the footer strip run on to the window edges
  fit = mobile ? vw / sw : Math.min(vw / sw, vh / sh);
  S0 = Z0 * (vw / sw); // the start screen matches the Figma frame across the window width
  extraW = mobile ? 0 : Math.max(0, vw / fit - sw);
  const base = new Map();
  for (const el of els) {
    const cs = getComputedStyle(el);
    base.set(kind(el), { cs, cx: num(cs, "--cx") });
  }
  // half of the world area the zoomed-in camera sees at the start
  const hx = vw / (2 * S0), hy = vh / (2 * S0);
  for (const el of els) {
    const k0 = kind(el), { cs, cx } = base.get(k0);
    const cy = num(cs, "--cy"), k = num(cs, "--k", 1);
    const idx = el.dataset.fly === "none" || el.dataset.fly === undefined ? -1 : Number(el.dataset.fly);
    // the footer strip and the background run the full width of the window
    if (!mobile && (k0 === "footer" || k0 === "bg")) el.style.setProperty("--w", num(cs, "--w") + extraW);
    const vx = cx - sw / 2, vy = cy - sh / 2, len = Math.hypot(vx, vy) || 1;
    const ux = vx / len, uy = vy / len;
    const hw = (num(cs, "--w") / 2) * k, hh = (num(cs, "--h") / 2) * k;
    // distance along its own direction at which the card is fully outside the start frame (d0) and
    // peeking in by about 90 px at the end of the slow drift (dA); never closer than its final spot
    const edge = Math.min(Math.abs(ux) > 1e-6 ? hx / Math.abs(ux) : 1e9, Math.abs(uy) > 1e-6 ? hy / Math.abs(uy) : 1e9);
    const ext = Math.abs(ux) * hw + Math.abs(uy) * hh;
    el._m = {
      cx, cy, r: num(cs, "--r"), k, idx, role: el.dataset.role || "", kind: k0, ux, uy, len,
      d0: Math.max(len, edge + Math.hypot(hw, hh) + 40), dA: Math.max(len, edge + ext - 90),
      // mobile: a short rise from the side
      fx: cx < sw / 2 ? -46 : 46, fy: 110,
      fr: (cx < sw / 2 ? -1 : 1) * (mobile ? 9 : 6 + (idx % 3) * 3),
    };
  }
  // the cable runs on from the left edge of the window to the plug
  const cab = base.get("cable");
  cable = cab && !mobile ? { dx: -extraW / 2, sx: (num(cab.cs, "--w") + extraW / 2) / num(cab.cs, "--w") } : null;
  viewport.style.height = mobile ? `${sh * fit}px` : `${vh}px`;
  setLock(!mobile && !reduced && progress < 1);
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
    hud.style.opacity = "0";
    const top = viewport.getBoundingClientRect().top;
    for (const el of els) {
      const m = el._m;
      if (m.role === "start" || m.role === "static" || m.idx <= 0 || reduced) { place(el, 1); continue; }
      const screenY = top + m.cy * fit;
      place(el, easeOut(clamp((vh * 0.96 - screenY) / (vh * 0.32))));
    }
    return;
  }

  const p = reduced ? 1 : progress;
  const zt = easeInOut(clamp((p - ZOOM_FROM) / ZOOM_LEN));
  // zoom in log space so the pull-back feels even all the way; the camera stays on the middle of the world
  S = S0 * Math.pow(fit / S0, zt);
  world.style.transform = `translate(${vw / 2 - (sw / 2) * S}px, ${vh / 2 - (sh / 2) * S}px) scale(${S})`;
  hud.style.opacity = String(clamp(1 - p / 0.06));

  const drift = easeOut(clamp(p / A_END)); // slow phase
  const fade = clamp((p - 0.6) / 0.2); // grey tile / lines dissolving
  if (lines) lines.style.opacity = String(1 - clamp((p - 0.58) / 0.2));

  for (const el of els) {
    const m = el._m;
    if (m.role === "static") {
      // cable and plug: never animated, only placed for the window width
      if (m.kind === "cable" && cable) { el.style.transformOrigin = "0 50%"; el.style.transform = `translateX(${cable.dx}px) scaleX(${cable.sx})`; }
      else el.style.transform = `rotate(${m.r}deg) scale(${m.k})`;
      continue;
    }
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

let raf = 0;
const queue = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); };

/* ------------------------------------------------------------------ intro driver */
const root = document.documentElement;
let locked = false;
function setLock(on) {
  if (on === locked) return;
  locked = on;
  root.classList.toggle("intro-lock", on);
  if (on && scrollY) scrollTo(0, 0);
}
// While the intro moves, the world and every card get their own GPU layer (class "moving"), so a frame
// only re-composites the layers instead of repainting the board with its shadows and blend modes.
// At rest (start screen, finished board) the layers are dropped and the browser redraws everything at
// full resolution, so text and artwork stay sharp at the 2x start zoom.
let restT = 0;
const rest = () => world.classList.remove("moving");
function setP(v) {
  progress = clamp(v);
  if (progress >= 1) setLock(false);
  world.classList.add("moving");
  clearTimeout(restT);
  restT = setTimeout(() => { if (!anim && !idleT) rest(); }, 260);
  queue();
}

// autoplay: the slow drift part goes by quickly, the pull-back keeps its own pace
let anim = 0, animTo = 0;
const rate = (p, fwd) => (p < A_END ? (fwd ? 0.55 / 420 : 0.55 / 320) : (fwd ? 0.45 / 1500 : 0.45 / 1050)); // p per ms
function stopAnim() { cancelAnimationFrame(anim); anim = 0; }
function animateTo(to, speed = 1) {
  stopAnim();
  animTo = to;
  let last = performance.now();
  const step = (t) => {
    const dt = Math.min(100, t - last); last = t;
    const fwd = animTo > progress;
    const next = progress + (fwd ? 1 : -1) * rate(progress, fwd) * dt * speed;
    if (fwd ? next >= animTo : next <= animTo) { anim = 0; setP(animTo); return; }
    setP(next);
    anim = requestAnimationFrame(step);
  };
  anim = requestAnimationFrame(step);
}

// scrub: input moves p directly; when it goes quiet the intro completes in the last direction
let idleT = 0, gestureFrom = 0, lastDir = 1;
function scrub(dp) {
  if (anim) {
    if (Math.sign(dp) === Math.sign(animTo - progress)) return; // already heading that way
    stopAnim();
  }
  if (!idleT) gestureFrom = progress;
  lastDir = Math.sign(dp) || lastDir;
  setP(progress + dp);
  clearTimeout(idleT);
  idleT = setTimeout(settle, 140);
}
function settle() {
  idleT = 0;
  if (progress <= 0 || progress >= 1) { if (!anim) rest(); return; }
  // a tiny nudge goes back to where it was; anything more finishes the move
  if (Math.abs(progress - gestureFrom) < 0.025) animateTo(gestureFrom <= 0.5 ? 0 : 1);
  else animateTo(lastDir > 0 ? 1 : 0);
}
function reopen() { // from the top of the board, back to the start screen
  setLock(true);
  gestureFrom = 1;
}

const panelOpen = () => !$("#panel")?.hidden;
const active = () => !mobile && !reduced && !panelOpen();
// a wheel "gesture" ends after 200 ms without events (this also swallows trackpad inertia)
let lastWheel = 0, gestureAtTop = true, gestureLocked = false, topAt = 0;
// the board has to rest at the top for a moment before scrolling up plays the intro back,
// so scrolling up from the footer stops on the board first
const restedAtTop = () => scrollY <= 0 && performance.now() - topAt > 450;
addEventListener("wheel", (e) => {
  if (!active()) return;
  const now = performance.now();
  const fresh = now - lastWheel > 200;
  lastWheel = now;
  if (fresh) { gestureAtTop = scrollY <= 0; gestureLocked = locked; }
  const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1);
  if (locked) {
    e.preventDefault();
    scrub(dy / 1000);
  } else if (dy < 0 && gestureAtTop && fresh && restedAtTop()) {
    e.preventDefault();
    reopen();
    gestureLocked = true;
    scrub(dy / 1000);
  } else if (gestureLocked) {
    e.preventDefault(); // inertia of the gesture that just unlocked the page
  }
}, { passive: false });

let touchY = null, touchLocked = false;
addEventListener("touchstart", (e) => {
  if (!active() || e.touches.length !== 1) return;
  touchY = e.touches[0].clientY;
  touchLocked = locked || restedAtTop();
}, { passive: true });
addEventListener("touchmove", (e) => {
  if (touchY == null || !active()) return;
  const y = e.touches[0].clientY, dy = touchY - y;
  touchY = y;
  if (!locked && !(touchLocked && dy < 0 && scrollY <= 0)) return;
  if (!locked) reopen();
  e.preventDefault();
  scrub((dy * 1.6) / Math.max(600, vh));
}, { passive: false });
addEventListener("touchend", () => { touchY = null; }, { passive: true });

addEventListener("keydown", (e) => {
  if (!active() || e.altKey || e.ctrlKey || e.metaKey) return;
  const k = e.key;
  const fwd = k === "ArrowDown" || k === "PageDown" || k === "End" || (k === " " && !e.shiftKey);
  const back = k === "ArrowUp" || k === "PageUp" || k === "Home" || (k === " " && e.shiftKey);
  if (!fwd && !back) return;
  // leave keys alone on buttons and links (space) and on the board itself (stickers move with the arrows)
  if (e.target.closest?.("a, button, input, textarea, select, [contenteditable], [data-world]")) return;
  if (locked) {
    e.preventDefault();
    animateTo(fwd ? 1 : 0);
  } else if (back && restedAtTop()) {
    e.preventDefault();
    reopen();
    animateTo(0);
  }
});

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
// coming back from a project page (its Close / Back buttons link to index.html#board): no intro, straight
// to the finished board, with the panel the visitor opened the project from
// (or Back from a project, when the browser had to reload this page instead of restoring it from its cache)
let cameBack = false;
try { cameBack = performance.getEntriesByType("navigation")[0]?.type === "back_forward" && sessionStorage.getItem("tt-panel") !== null; } catch {}
const returning = location.hash === "#board" || cameBack;
// tidy the address once the page has faded in (changing it during the crossfade cancels the crossfade)
if (location.hash === "#board") setTimeout(() => history.replaceState(null, "", location.pathname + location.search), 1500);
progress = reduced || returning ? 1 : 0;
measure();
render();
// the board container clips its content; focus must never scroll it (older browsers without overflow: clip)
viewport.addEventListener("scroll", () => { viewport.scrollTop = 0; viewport.scrollLeft = 0; });
let wasTop = true;
addEventListener("scroll", () => {
  if (mobile) queue();
  const top = scrollY <= 0;
  if (top && !wasTop) topAt = performance.now();
  wasTop = top;
}, { passive: true });
addEventListener("resize", () => { measure(); queue(); });
narrow.addEventListener("change", () => { measure(); queue(); });
document.fonts?.ready.then(() => { measure(); queue(); });

function jumpToBoard(smooth = true) {
  if (mobile) return;
  if (smooth && !reduced) animateTo(1, 2.2);
  else { stopAnim(); setP(1); }
}
// keyboard users tabbing into a card before the board is open: open it first
world.addEventListener("focusin", (e) => { if (!mobile && !reduced && progress < 1 && e.target.closest(".card, .sticker")) jumpToBoard(false); });

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
let lastFocus = null, openId = null;

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
  openId = id;
  $("#panel-k").textContent = c.k;
  $("#panel-title").textContent = c.t;
  $("#panel-body").innerHTML = c.html;
  panel.hidden = false;
  void panel.offsetWidth;
  panel.classList.add("open");
  sheet.scrollTop = 0;
  document.documentElement.style.overflow = "hidden";
  $("[data-close]", sheet).focus({ preventScroll: true });
}
function closePanel() {
  if (panel.hidden) return;
  openId = null;
  panel.classList.remove("open");
  setTimeout(() => { panel.hidden = true; }, reduced ? 0 : 320);
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

/* ------------------------------------------------------------------ page to page
   Browsers with cross-document view transitions crossfade to the project page by themselves (css/landing.css);
   older ones get a short fade-out first. The open panel is remembered so closing the project comes back to it. */
const crossfades = "onpagereveal" in window;
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!a || a.target === "_blank" || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !/\/projects\/[^/]+\.html$/.test(url.pathname)) return;
  try { sessionStorage.setItem("tt-panel", openId || ""); } catch {}
  if (crossfades || reduced) return;
  e.preventDefault();
  document.documentElement.classList.add("leaving");
  setTimeout(() => { location.href = a.href; }, 280);
});
// back / forward from the page cache: show the page again as it was left
addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  document.documentElement.classList.remove("leaving");
  try { sessionStorage.removeItem("tt-panel"); } catch {}
});
if (returning) {
  let id = "";
  try { id = sessionStorage.getItem("tt-panel") || ""; sessionStorage.removeItem("tt-panel"); } catch {}
  if (id && PANELS[id]) openPanel(id, $(`[data-panel="${id}"]`));
}

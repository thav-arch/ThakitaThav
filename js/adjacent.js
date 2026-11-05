// "Previous / Next project" at the end of every case study (ported from the old ProjectCaseStudy).
// It is filled from js/data.js, so a new project page gets it automatically: the list is every project
// that has a page, in the order of js/data.js, and it wraps around (after the last comes the first).
//
// A page only needs   <div class="cs" data-slug="<its slug>">  and   <nav class="cs-adjacent" data-adjacent></nav>
// The links are ordinary links. (The old 3D home page could open a project in place; a click then asked it
// to slide to the other project via "project:switch". Project pages now always open on their own.)
const ROOT = new URL("../", import.meta.url); // the site root (this file is in js/)

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export async function fillAdjacent(cs) {
  const nav = cs.querySelector("[data-adjacent]");
  const slug = cs.dataset.slug;
  if (!nav || !slug) return;
  // on the home page the list is already loaded; a page opened on its own loads it (fresh, like the home page)
  if (!window.SITE) await import(new URL(`js/data.js?v=${Date.now()}`, ROOT).href);
  const list = window.SITE.projects.filter((p) => p.page);
  const i = list.findIndex((p) => p.slug === slug);
  if (i < 0 || list.length < 2) {
    nav.hidden = true;
    return;
  }
  const prev = list[(i - 1 + list.length) % list.length];
  const next = list[(i + 1) % list.length];
  const link = (p, dir, label) =>
    `<a class="cs-adj${dir > 0 ? " cs-adj-next" : ""}" href="${esc(new URL(p.page, ROOT).href)}" data-switch="${esc(p.slug)}" data-dir="${dir}">` +
    `<span>${label}</span><strong>${esc(p.title)}</strong></a>`;
  nav.innerHTML = link(prev, -1, "Previous") + link(next, 1, "Next");
}

# Thavanesh Nagarajan — portfolio

A plain static website: HTML, CSS and JavaScript files in a folder. No framework, no database, no build step, no installs.

## Run it on your computer

1. Open this folder in VS Code and install the **Live Server** extension (Ritwick Dey).
2. Right-click `index.html` → **Open with Live Server**.

(Opening `index.html` by double-click will not work: browsers block the 3D code from loading off `file://`. Any local web server works — Live Server is just the easiest.)

## Put it online (free)

Upload the folder as-is — there is nothing to build.

- **GitHub Pages:** push this folder to a GitHub repository → Settings → Pages → deploy from the `main` branch, root folder. (Free Pages needs a public repository.)
- **Cloudflare Pages:** create a project from the repository, leave the build command empty and set the output directory to `/`.

A custom domain can be attached on either.

## What is where

```
index.html            the landing page (3D strip, Featured / Full views, Profile, Resume menu)
projects/             one HTML file per project page
  songs-of-saaja.html
  elevator-empire.html
  umbrella-man.html
  interface-experience-design.html
css/                  fonts.css · base.css · world.css (landing) · case.css (all project pages) · saaja.css · elevator-empire.css · umbrella-man.css
js/data.js            ALL the content of the landing page: projects (title, year, cover…) and the Profile text
js/main.js            starts everything
js/core, js/world     the 3D film strip, shaders, loading (three.js is in js/vendor)
js/ui                 navigation, Full view, opening / closing project pages, intro.js (the scroll intro)
js/pages/saaja.js     scroll animations of the Songs of Saaja page
js/pages/umbrella-man.js   text reveal and reading-progress line of The Umbrella Man page
js/pages/elevator-empire.js   text reveal, counting numbers and videos of the Elevator Empire page
js/video-manager.js   looping videos: one plays at a time, sound control per video, lazy loading (reusable)
js/page-effects.js    smooth scrolling, reveal and parallax shared by project pages
images/covers/        the landing-page card images (<slug>.webp = up to 1920px, <slug>-sm.webp = 480px). Any shape works: every card on the strip is 16:9 and the image is cropped to fill it, centred (16:9 images fit exactly)
images/saaja/         images of the Songs of Saaja page
images/elevator-empire/   the Elevator Empire artwork (p00-p15.webp slices), video posters, and video/ (put the 4 videos here)
fonts/                Inter Tight, Marcellus SC, Jersey 25, Cabin Condensed (self-hosted)
images/umbrella-man/  The Umbrella Man artwork slices (p00-p17.webp) and the photos that lift on hover (ph-*.webp)
images/interface-experience-design/   dashboard screenshots for the Interface and Experience Design page
images/intro/         three extra small images used in the scroll intro (with the project covers)
resume/               the two résumé PDFs linked from the Resume menu (top right). Replace a file with one of the same name to update it
```

## Everyday edits

- **After changing a CSS or JS file:** in `index.html` and the project pages, the links end in `?v=20261020c`. Change that number (e.g. to today’s date) everywhere, so visitors’ browsers fetch the new file instead of a saved copy. (Find and replace `?v=20261020c` across the folder in VS Code.)

- **Change text on the landing page / Profile:** edit `js/data.js`.
- **Change a project page:** edit its file in `projects/` (and `css/<page>.css`). It is ordinary HTML.
- **Change the look of the 3D world** (grid glow, cursor ripple, corner rounding): the `motion.theme` block at the top of `js/main.js`.
- **Change the shape of the strip** (angle of the side projects, lens, how many show each side, per desktop / tablet / phone): the table at the top of `js/core/layout.js` (`diag`, `fov`, `maxSlot`, `maxLeft`).

## The scroll intro

The first time someone opens the site (once per browser session) a short scroll-driven intro plays before the 3D strip: pieces of work float on black around your name, gather into a ring as they scroll, a blue portal opens inside it, they are pulled in, and the camera dives through to the strip. "Skip intro" (or Escape) ends it; visitors who prefer reduced motion never see it.

- **Text:** your name, roles and one-line intro come from `profile` in `js/data.js`.
- **After the portal:** the lines that appear one by one, and the "Welcome to my portfolio" screen that follows, are `intro.lines` and `intro.welcome` in `js/data.js`.
- **Project descriptions** (two lines above the project in focus): `description` on each project in `js/data.js` (empty = none shown).
- **Images:** the list in `js/main.js` (search for `startIntro`): project covers plus the files in `images/intro/`.
- **Timing / length:** `T` (the stages, 0 → 1) at the top of `js/ui/intro.js`; the scroll length is `.intro-track { height }` in `css/intro.css`.
- **To see it again** (it plays once per browser tab): add `?intro` to the address, e.g. `http://127.0.0.1:5500/index.html?intro` or `https://thav-arch.github.io/ThakitaThav/?intro`.

## Add a project page

1. Copy `projects/songs-of-saaja.html` to `projects/<name>.html` and replace the content between `<article class="cs-content" …>` and its footer. Keep `<base href="../">` — it lets every path in the file be written from the site root, so the page works on its own **and** when the landing page opens it.
2. Put its images in `images/<name>/`, its styles in `css/<name>.css` (linked in the page's `<head>`), and — only if it needs scripting — a module in `js/pages/<name>.js` exporting `mount(cs)` that returns a clean-up function (see `js/pages/saaja.js`). Link it with `<script type="module" data-page src="js/pages/<name>.js">`.
3. In `js/data.js`, set the project's `"page"` to `"projects/<name>.html"`. Projects with `"page": null` show "case study coming soon" when clicked.

Add a brand-new project to the strip by adding an entry in `js/data.js` plus its two cover images in `images/covers/` (the 3D strip shows all entries automatically).

## Videos on a project page

A project page can hold any number of looping videos; `js/video-manager.js` makes them behave: they start muted, **only the video most on screen plays**, each has its own mute button and volume slider, and a video is only downloaded when it is near the screen. Mark one up like the `.ee-vid` boxes in `projects/elevator-empire.html` (a `<video data-src="…" poster="…" muted loop playsinline>` plus the two small control blocks) and call `initVideos(scroller)` from the page script. A missing file just leaves the poster image. File names and compression for Elevator Empire: `images/elevator-empire/video/README.txt`.

## Known state

- **Songs of Saaja**, **Elevator Empire**, **The Umbrella Man** and **Interface and Experience Design** have project pages; the other two cards show "coming soon".
- **The Umbrella Man** trailer is a YouTube embed (muted autoplay, loop) at the top of `projects/umbrella-man.html`; to change the video, replace the ID `XIdpNlEZ2z4` (twice) in its `src`. The "Check out the Narrative Document" button becomes a link when you give the `<a class="um-btn">` an `href`.
- **Elevator Empire** is the Figma page exported as artwork slices with live text and videos on top, scaled to the window width. On phones it is the same layout scaled down (pinch-zoom works); a dedicated phone layout needs the artwork cut into separate pieces.
- **Interface and Experience Design** (`projects/interface-experience-design.html`) documents the ParallelConnect dashboard work (Coca-Cola, NAPA, marketing analytics, Newell). It is a fluid HTML page, not Figma slices; its images are in `images/interface-experience-design/`, styles in `css/interface-experience-design.css`, and the path explorer, image viewer and section index in `js/pages/interface-experience-design.js`.
- *PowerUI Library* has no cover image yet, so it shows a generated placeholder card. Drop `<slug>.webp` and `<slug>-sm.webp` into `images/covers/` and fill `thumbnail` / `thumbnailSmall` in `js/data.js`.
- Not included in this version: Playground, Journal, About, background music.
- The old version of the site (Next.js + database + dashboard) is kept in Git history: commit `947d14a`.

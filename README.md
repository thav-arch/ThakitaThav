# Thavanesh Nagarajan — portfolio

A plain static website: HTML, CSS and JavaScript files in a folder. No framework, no database, no build step, no installs.

## Run it on your computer

1. Open this folder in VS Code and install the **Live Server** extension (Ritwick Dey).
2. Right-click `index.html` → **Open with Live Server**.

(Opening `index.html` by double-click will not work: browsers block the page's JavaScript modules from loading off `file://`. Any local web server works; Live Server is just the easiest.)

## Put it online (free)

Upload the folder as-is — there is nothing to build.

- **GitHub Pages:** push this folder to a GitHub repository → Settings → Pages → deploy from the `main` branch, root folder. (Free Pages needs a public repository.)
- **Cloudflare Pages:** create a project from the repository, leave the build command empty and set the output directory to `/`.

A custom domain can be attached on either.

## What is where

```
index.html            the home page: the intro (start screen that zooms out) and the board of cards
projects/             one HTML file per project page
  songs-of-saaja.html
  elevator-empire.html
  umbrella-man.html
  interface-experience-design.html
css/landing.css       everything on the home page: card positions, hover effects, panels, phone layout
css/                  fonts.css · base.css · case.css (all project pages) · saaja.css · elevator-empire.css · umbrella-man.css · interface-experience-design.css
js/landing.js         the home page: the intro camera, card effects, draggable stickers, panels
js/data.js            the content behind the home page panels: projects (title, year, cover, page) and the Profile text
js/pages/saaja.js     scroll animations of the Songs of Saaja page
js/pages/umbrella-man.js   text reveal and reading-progress line of The Umbrella Man page
js/pages/elevator-empire.js   text reveal, counting numbers and videos of the Elevator Empire page
js/pages/interface-experience-design.js   path explorer, image viewer and section index of that page
js/video-manager.js   looping videos: one plays at a time, sound control per video, lazy loading (reusable)
js/page-effects.js    smooth scrolling, reveal and parallax shared by project pages
images/landing/       the home page artwork exported from Figma (SVG and WebP); clients/ holds the footer logos
images/covers/        project images shown in the Game design / Interaction design panels (<slug>-sm.webp is used there)
images/saaja/         images of the Songs of Saaja page
images/elevator-empire/   the Elevator Empire artwork (p00-p15.webp slices), video posters, and video/ (put the 4 videos here)
images/umbrella-man/  The Umbrella Man artwork slices (p00-p17.webp) and the photos that lift on hover (ph-*.webp)
images/interface-experience-design/   dashboard screenshots for the Interface and Experience Design page
fonts/                self-hosted fonts (the home page uses Google Sans Flex, Instrument Sans, Datatype, Fjalla One, Jersey 20, New Amsterdam, Archivo Narrow)
resume/               the two résumé PDFs linked from the Resume panel. Replace a file with one of the same name to update it
```

## Everyday edits

- **After changing a CSS or JS file:** the links to it end in a version like `?v=20261105c`. Change that number (e.g. to today's date) in the page that links it, so visitors' browsers fetch the new file instead of a saved copy.
- **Change the Profile / project list in the panels:** edit `js/data.js`.
- **Change a project page:** edit its file in `projects/` (and `css/<page>.css`). It is ordinary HTML.

## The home page

The page is built from two Figma frames: the start screen (node 556:1033) and the finished board (node 550:851). It opens on the start screen, zoomed in 2x on the grey tile. Scrolling (wheel, trackpad, swipe, arrow keys, Page Down, Space) pulls the camera back while the cards fly in from outside and settle on the board; once the scrolling stops the intro finishes by itself, so it never rests half way. Scrolling up from the top of the board plays it back. The finished board always fills the window width; on a short window the page then scrolls down to the footer. Visitors who prefer reduced motion see the board straight away. Below 900px wide (phones) the cards stack into a vertical board and rise in as they scroll into view.

- **Card positions and sizes:** the `--cx --cy --w --h --r` values at the top of `css/landing.css` (centre, size and tilt in Figma pixels of the 1440 x 1024 frame); the phone positions are in the `@media (max-width: 899px)` block.
- **Intro timing:** `A_END`, `ZOOM_FROM`, `ZOOM_LEN` near the top of `js/landing.js` (stages of the intro, 0 to 1) and `rate()` (how fast it plays on its own).
- **What a card opens:** the `PANELS` list in `js/landing.js`.

## Add a project page

1. Copy `projects/songs-of-saaja.html` to `projects/<name>.html` and replace the content between `<article class="cs-content" …>` and its footer. Keep `<base href="../">` — it lets every path in the file be written from the site root, so every path works from inside `projects/`.
2. Put its images in `images/<name>/`, its styles in `css/<name>.css` (linked in the page's `<head>`), and — only if it needs scripting — a module in `js/pages/<name>.js` exporting `mount(cs)` that returns a clean-up function (see `js/pages/saaja.js`). Link it with `<script type="module" data-page src="js/pages/<name>.js">`.
3. In `js/data.js`, set the project's `"page"` to `"projects/<name>.html"`. Projects with `"page": null` are listed in the panels as coming soon.

Add a brand-new project by adding an entry in `js/data.js` plus its cover images in `images/covers/`; the Game design and Interaction design panels list the projects from there.

## Videos on a project page

A project page can hold any number of looping videos; `js/video-manager.js` makes them behave: they start muted, **only the video most on screen plays**, each has its own mute button and volume slider, and a video is only downloaded when it is near the screen. Mark one up like the `.ee-vid` boxes in `projects/elevator-empire.html` (a `<video data-src="…" poster="…" muted loop playsinline>` plus the two small control blocks) and call `initVideos(scroller)` from the page script. A missing file just leaves the poster image. File names and compression for Elevator Empire: `images/elevator-empire/video/README.txt`.

## Known state

- **Songs of Saaja**, **Elevator Empire**, **The Umbrella Man** and **Interface and Experience Design** have project pages; the others are listed as coming soon.
- **The Umbrella Man** trailer is a YouTube embed (muted autoplay, loop) at the top of `projects/umbrella-man.html`; to change the video, replace the ID `XIdpNlEZ2z4` (twice) in its `src`. The "Check out the Narrative Document" button becomes a link when you give the `<a class="um-btn">` an `href`.
- **Elevator Empire** is the Figma page exported as artwork slices with live text and videos on top, scaled to the window width. On phones it is the same layout scaled down (pinch-zoom works); a dedicated phone layout needs the artwork cut into separate pieces.
- **Interface and Experience Design** (`projects/interface-experience-design.html`) documents the ParallelConnect dashboard work (Coca-Cola, NAPA, marketing analytics, Newell). It is a fluid HTML page, not Figma slices; its images are in `images/interface-experience-design/`, styles in `css/interface-experience-design.css`, and the path explorer, image viewer and section index in `js/pages/interface-experience-design.js`.
- *PowerUI Library* has no cover image yet, so its panel row shows a striped placeholder. Drop `<slug>-sm.webp` into `images/covers/` and fill `thumbnailSmall` in `js/data.js`.
- The Blogs card is a placeholder ("under construction"); clicking it tips the cones over.
- The previous 3D film-strip home page and its scroll intro are kept in Git history (the last commit on `master` before the new home page).
- The old version of the site (Next.js + database + dashboard) is kept in Git history: commit `947d14a`.

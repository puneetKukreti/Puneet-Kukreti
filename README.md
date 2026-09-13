# Scroll-Driven Canvas Portfolio

A modern portfolio website featuring a 60fps canvas image sequence scroll animation powered by 66 cinematic frames in `ezgif-split/`.

## 🚀 Getting Started

You can open the project in any of the following ways:

### Option A: Double-Click (No Installation Required)
Simply double-click `index.html` to open it directly in your web browser (Chrome, Edge, Firefox, Safari).

### Option B: Local Web Server (Recommended)
Using a lightweight local server ensures optimal performance and caching:

**Using Node.js:**
```bash
npx serve .
```
or
```bash
npx http-server .
```

**Using Python:**
```bash
python -m http.server 3000
```
Then visit `http://localhost:3000` in your browser.

---

## 📁 File Structure

- **`index.html`**: Semantic layout containing the sticky canvas sequence container, milestone text cards, and portfolio sections (About, Projects, Skills, Contact).
- **`style.css`**: Modern dark glassmorphism styling, ambient glow blends, custom scrollbars, and responsive typography.
- **`script.js`**: Canvas controller featuring:
  - Asset preloader with progress tracking
  - High-DPI (`devicePixelRatio`) responsive canvas resizing
  - `requestAnimationFrame` linear interpolation (lerp) loop for fluid scroll scrubbing
  - Timed narrative text overlay transitions
- **`ezgif-split/`**: 66 PNG image sequence frames (`frame_000` to `frame_065`).

---

## 🛠️ Customization

- **Your Name / Branding**: Update the header in `index.html` (`<span class="logo-text">PORTFOLIO</span>`).
- **Narrative Overlays**: Adjust the milestone headlines and descriptions inside `<div class="scroll-milestone">` elements in `index.html`.
- **Projects & Skills**: Add or edit projects, live demo links, and tech pills inside the `<section id="projects">` and `<section id="skills">` sections.
- **Scroll Speed / Track Length**: Adjust `height: 420vh;` in `.sequence-section` (`style.css`) to make scrolling faster or slower.

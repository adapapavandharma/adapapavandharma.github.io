# adapapavandharma.github.io

Personal portfolio for **Pavan Dharma Adapa** — one site, two switchable profiles.

Hand-written HTML/CSS/JS. No framework, no build step, no dependencies, no tracking.
Open `index.html` in a browser and it just works.

---

## The two-track idea

I apply across two job families, so the site carries both and lets the reader pick:

| Track | Framing | Link to send |
|---|---|---|
| `epic` | Healthcare Data Analyst — Clarity, Cogito, Caboodle, revenue cycle, population health | `…/?track=epic` |
| `analytics` | Data Analyst / BI — SQL, Python, Tableau, Power BI, predictive modeling | `…/?track=analytics` |

**Put the matching link in each application.** A healthcare recruiter lands on the Epic
framing; a BI recruiter lands on the analytics framing. Same site, right first impression.
The choice also persists in `localStorage`, and the accent colour shifts (cyan for
healthcare, green for analytics) so the switch is visible, not just semantic.

Bare URL with no `?track=` defaults to `epic` — change `DEFAULT_TRACK` at the top of
[`main.js`](main.js) to flip that.

---

## Editing content

Everything lives in [`index.html`](index.html) as plain markup. Each track-specific element
carries a `data-track` attribute:

```html
<li data-track="epic">Only shows on the healthcare profile</li>
<li data-track="analytics">Only shows on the data analyst profile</li>
<li data-track="both">Always shows</li>
<li>No attribute — also always shows</li>
```

`main.js` hides whatever doesn't match. With JavaScript disabled the whole document renders,
which is the correct fallback for search-engine crawlers.

To add a project, copy an existing `<article class="card">` block and set its `data-track`.

### Things to keep in sync when content changes

- The **metric tiles** in the hero (`data-count` attributes)
- The **typed hero lines** — `TRACK_COPY` at the top of `main.js`
- The **JSON-LD block** in `<head>` (helps Google show a proper knowledge panel for your name)
- The **OG image** at `assets/og.png`, regenerated from `tools/make-og.ps1`

---

## Résumé PDFs

`resume/` holds the PDF exported per track:

- `Pavan_Dharma_Adapa_Healthcare_Data_Analyst.pdf`
- `Pavan_Dharma_Adapa_Data_Analyst.pdf`

The download button swaps to the right one based on the active track. Re-export from the
master `.docx` files whenever they change and keep the filenames identical.

---

## Deploying to GitHub Pages

The repo must be named exactly `adapapavandharma.github.io` for the clean root URL.

```bash
git remote add origin https://github.com/adapapavandharma/adapapavandharma.github.io.git
git branch -M main
git push -u origin main
```

Then on github.com: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.

Live in ~1 minute at <https://adapapavandharma.github.io>.

`.nojekyll` is present so GitHub serves the files as-is instead of running them through Jekyll.

### Custom domain (optional, later)

Buy a domain, add a `CNAME` file containing just the domain, and point DNS at GitHub's
Pages IPs. A real domain on a résumé reads better than a `github.io` subdomain, but it is
not worth blocking the launch over.

---

## Local preview

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>. Opening `index.html` directly via `file://` works too,
but the clipboard buttons fall back to a legacy copy path and the URL never picks up
`?track=`.

---

## Keyboard

| Key | Action |
|---|---|
| <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>K</kbd> | Command palette |
| <kbd>/</kbd> | Command palette |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd> | Navigate and run |
| <kbd>Esc</kbd> | Close |

The palette can jump between sections, switch tracks, copy contact details, and trigger
print-to-PDF.

---

## Accessibility & performance notes

- Semantic landmarks, a skip link, visible focus rings, and `aria-selected` on the track tabs
- Respects `prefers-reduced-motion` — the typing effect, counters, and reveals all stand down
- Respects `prefers-color-scheme` on first visit; the theme toggle then persists a choice
- System font stacks only, so there are no webfont requests and no layout shift
- Print stylesheet strips chrome and lays the page out as a readable document

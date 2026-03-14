# 📼 VHS Mix — Tape Studio

> Make your tape. Share the vibe. Rewind forever.

A browser-based VHS tape maker with a **Sony HiFi deck aesthetic**, **twee + Windows 7 Aero** visual style, YouTube embedding, Spotify playlist support, and custom cover image uploads.

---

## ✨ Features

- 🎵 **YouTube embed** — paste a YouTube URL and it plays right in the deck
- 🎶 **Spotify playlist embed** — paste a full Spotify playlist link to embed the whole playlist
- 📼 **Cassette animation** — the tape drops into the deck slot when you press play
- 🖼 **Custom cover upload** — upload your own image to appear on the cassette label
- 🎨 **Label colours** — 6 colour options for your tape label
- ⦿ **Record mode** — name your tape, add a vibe/subtitle, artist, year, and personal message
- ♡ **Share tab** — generate a shareable link, tweet it, WhatsApp it, or download the tracklist as a `.txt` file
- 💻 **Win7 Aero UI** — glass titlebar, taskbar, real-time clock
- ✿ **Twee background** — soft pastel radial gradients with floating ✿ ♪ ★ decorations

---

## 🚀 Deploy to GitHub Pages (free hosting)

### Step 1 — Create a GitHub repo

1. Go to [github.com](https://github.com) and sign in (or create a free account)
2. Click the **+** icon → **New repository**
3. Name it `vhsmix` (or anything you like)
4. Set it to **Public**
5. Leave "Add a README" **unchecked** (you already have one)
6. Click **Create repository**

---

### Step 2 — Upload the files

**Option A — GitHub web interface (easiest)**

1. On your new repo page, click **uploading an existing file**
2. Drag and drop the entire `vhsmix/` folder contents:
   ```
   index.html
   css/
     style.css
   js/
     app.js
   README.md
   ```
3. Scroll down, add a commit message like `Initial commit`, click **Commit changes**

**Option B — Git command line**

```bash
# Inside the vhsmix/ folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/vhsmix.git
git push -u origin main
```

---

### Step 3 — Enable GitHub Pages

1. In your repo, go to **Settings** → **Pages** (left sidebar)
2. Under **Source**, select **Deploy from a branch**
3. Set branch to **main**, folder to **/ (root)**
4. Click **Save**

After ~1 minute your site will be live at:
```
https://YOUR_USERNAME.github.io/vhsmix/
```

---

## 🌐 Custom Domain (optional)

If you own a domain (e.g. `vhsmix.app`):

1. In **Settings → Pages**, enter your domain in the **Custom domain** field
2. Add a `CNAME` file to the repo root containing just your domain:
   ```
   vhsmix.app
   ```
3. At your domain registrar, add these DNS records:
   | Type  | Name | Value                  |
   |-------|------|------------------------|
   | A     | @    | 185.199.108.153        |
   | A     | @    | 185.199.109.153        |
   | A     | @    | 185.199.110.153        |
   | A     | @    | 185.199.111.153        |
   | CNAME | www  | YOUR_USERNAME.github.io |

DNS changes take up to 48 hours to propagate.

---

## 📁 Project Structure

```
vhsmix/
├── index.html        # Main HTML — all markup and structure
├── css/
│   └── style.css     # All styles — twee/Win7 aesthetic, Sony deck, animations
├── js/
│   └── app.js        # All JavaScript — playback, embeds, state, waveform
└── README.md         # This file
```

---

## 🛠 Local Development

No build tools needed. Just open `index.html` in your browser:

```bash
# macOS / Linux
open index.html

# Windows
start index.html

# Or use VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

> **Note:** YouTube autoplay requires the page to be served over HTTP/HTTPS (not `file://`). Use Live Server or any local server for full YouTube embed functionality.

---

## 🎨 Customisation Tips

| What you want to change | Where to look |
|-------------------------|---------------|
| Background colours      | `.bg` in `css/style.css` |
| Twee decorations        | `.twee-deco` divs in `index.html` |
| Cassette body colour    | `.cassette`, `.big-cassette` in `css/style.css` |
| Amber display colour    | `.disp-time`, `.disp-track` in `css/style.css` |
| Label colour options    | `.color-chips` in `index.html` + `setCC` in `js/app.js` |
| Waveform colours        | `drawWave()` in `js/app.js` |
| Sony model name         | `.sony-model` in `index.html` |

---

## 📝 Notes

- **YouTube embeds** only autoplay when the page is served over HTTP/HTTPS (GitHub Pages handles this automatically)
- **Spotify embeds** work for public playlists; private playlists will not embed
- The **shareable link** in the Share tab is a demo URL — to make it truly functional you would need a backend or a URL-encoding scheme (e.g. storing the tracklist in the URL hash)
- **Cover images** are stored in browser memory and are not persisted between page reloads — users would need to re-upload on each visit unless you add `localStorage` support

---

## 🪄 Future Ideas

- [ ] Save tapes to `localStorage` so they persist between visits
- [ ] Export tape as a shareable image (using `html2canvas`)
- [ ] B-side / A-side tape flip
- [ ] Drag-to-reorder tracklist
- [ ] More deck skins (Walkman, boombox, mini hi-fi)

---

Made with ✿ and a lot of cassette tape.

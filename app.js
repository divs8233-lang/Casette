/* ============================================================
   VHS MIX — app.js
   ============================================================ */

/* ── State ── */
let songs       = [];
let curIdx      = -1;
let isPlaying   = false;
let labelBg     = '#8b5cf6';
let labelFg     = '#e8d8ff';
let recLabelBg  = '#8b5cf6';
let recLabelFg  = '#e8d8ff';
let tapeTitle   = '';
let tapeSub     = '';

let simTime     = 0;
let simDur      = 200;
let progInt     = null;
let afId        = null;
let recSecs     = 0;
let recIntId    = null;

/* ── Win7 clock ── */
function updateClock() {
  const now = new Date();
  const t   = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const d   = now.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const el  = document.getElementById('w7clock');
  if (el) el.innerHTML = t + '<br>' + d;
}
updateClock();
setInterval(updateClock, 30000);

/* ── Tab navigation ── */
function goTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  el.setAttribute('aria-selected', 'true');
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'share') refreshShare();
}



/* ── Label colours ── */


function setRecCC(el, bg, fg) {
  document.querySelectorAll('#recChips .cc').forEach(c => {
    c.classList.remove('sel');
    c.setAttribute('aria-checked', 'false');
  });
  el.classList.add('sel');
  el.setAttribute('aria-checked', 'true');
  recLabelBg = bg; recLabelFg = fg;
  document.getElementById('bcLabel').style.background = bg;
  document.getElementById('bclTitle').style.color     = fg;
  document.getElementById('bclSub').style.color       = fg;
}

function applyLabelToAll() {
  ['cassLabelArea','mtLabel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.background = labelBg;
  });
  ['cassLabelText','mtTitle','mtSub'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.color = labelFg;
  });
  // Update colour wheel preview swatches
  const sw  = document.getElementById('cwSwatch');
  const hex = document.getElementById('cwHex');
  if (sw)  sw.style.background = labelBg;
  if (hex) hex.textContent     = labelBg;
}

/* ── Cover upload ── */




/* ── Add song ── */
function addItem() {
  const name = document.getElementById('sName').value.trim();
  const url  = document.getElementById('sUrl').value.trim();
  if (!name) { showToast('Enter a song name ✿'); return; }
  if (!url)  { showToast('Paste a YouTube URL ✿'); return; }
  if (!getYTId(url)) { showToast('Paste a YouTube link (youtube.com or youtu.be) ✿'); return; }
  songs.push({ name, url, platform: 'youtube', type: 'single' });
  document.getElementById('sName').value = '';
  document.getElementById('sUrl').value  = '';
  renderList();
  onTapeChanged();
}

function removeSong(i) {
  songs.splice(i, 1);
  if (curIdx >= songs.length) curIdx = songs.length - 1;
  renderList();
  onTapeChanged();
  if (!songs.length) ejectTape();
}

function renderList() {
  const list = document.getElementById('songList');
  if (!songs.length) {
    list.innerHTML = '<div style="text-align:center;color:#aabbd0;font-size:11px;padding:12px 0;font-family:\'Architects Daughter\',cursive;">no tracks yet ✿</div>';
    return;
  }
  list.innerHTML = songs.map((s, i) => {
    return `<div class="song-item ${i === curIdx ? 'active' : ''}" onclick="selectTrack(${i})" role="listitem">
      <span class="plat-badge badge-yt">YT</span>
      <span class="sname">${escHtml(s.name)}</span>
      <button class="del-btn" onclick="event.stopPropagation();removeSong(${i})" aria-label="Remove ${escHtml(s.name)}">✕</button>
    </div>`;
  }).join('');
}

function updateMiniTape() {
  const count = songs.length + ' track' + (songs.length !== 1 ? 's' : '');
  const el1 = document.getElementById('mtCount');
  const el2 = document.getElementById('mtInfoCount'); // may not exist — fine
  if (el1) el1.textContent = count;
  if (el2) el2.textContent = count;
}

/* ── Playback ── */
function selectTrack(i) {
  curIdx = i; isPlaying = true;
  renderList();
  insertCass();
  loadEmbed();
  startWave();
  updateDisplay();
  updatePlayBtn();
  startProg();
}

function insertCass() {
  document.getElementById('cassEl').classList.add('in');
  document.getElementById('slotLbl').style.display = 'none';
  document.getElementById('cr1').classList.add('rolling');
  document.getElementById('cr2').classList.add('rolling');
}

function ejectTape() {
  document.getElementById('cassEl').classList.remove('in');
  document.getElementById('slotLbl').style.display = '';
  document.getElementById('cr1').classList.remove('rolling');
  document.getElementById('cr2').classList.remove('rolling');
  isPlaying = false;
  updatePlayBtn();
  document.getElementById('dispTrack').textContent = 'NO TAPE LOADED';
  document.getElementById('dispTime').textContent  = '0:00';
  document.getElementById('progFill').style.width  = '0%';
  document.getElementById('tCur').textContent      = '0:00';
  document.getElementById('tDur').textContent      = '0:00';
  clearEmbed();
  clearInterval(progInt);
}

function togglePlay() {
  if (!songs.length)  { showToast('Add songs first ✿');  return; }
  if (curIdx < 0)     { selectTrack(0);                  return; }
  isPlaying = !isPlaying;
  updatePlayBtn();
  updateDisplay();
  if (isPlaying) {
    insertCass();
    document.getElementById('cr1').classList.add('rolling');
    document.getElementById('cr2').classList.add('rolling');
    startWave();
  } else {
    document.getElementById('cr1').classList.remove('rolling');
    document.getElementById('cr2').classList.remove('rolling');
  }
}

function prevTrack() {
  if (!songs.length) return;
  curIdx = (curIdx - 1 + songs.length) % songs.length;
  isPlaying = true;
  renderList(); insertCass(); loadEmbed(); startWave(); updateDisplay(); updatePlayBtn(); startProg();
}

function nextTrack() {
  if (!songs.length) return;
  curIdx = (curIdx + 1) % songs.length;
  isPlaying = true;
  renderList(); insertCass(); loadEmbed(); startWave(); updateDisplay(); updatePlayBtn(); startProg();
}

function updatePlayBtn() {
  const b  = document.getElementById('playBtn');
  const pd = document.getElementById('playDot');
  if (b)  b.textContent = isPlaying ? '⏸ PAUSE' : '▶ PLAY';
  if (pd) pd.classList.toggle('on', isPlaying);
}

function updateDisplay() {
  const s = songs[curIdx];
  document.getElementById('dispTrack').textContent = s ? s.name.toUpperCase() : 'NO TAPE LOADED';
  document.getElementById('dispSrc').textContent   = s ? 'YOUTUBE' : 'TAPE';
  const lt = document.getElementById('cassLabelText');
  if (lt && s) lt.textContent = s.name.slice(0, 12);
}

/* ── Volume ── */
function setVolume(v) {
  document.getElementById('volSlider').style.setProperty('--v', v + '%');
}

/* ── Progress (simulated — real timing from YouTube is handled by the iframe) ── */
function startProg() {
  clearInterval(progInt);
  simTime = 0; simDur = 180 + Math.floor(Math.random() * 120);
  document.getElementById('tDur').textContent = fmt(simDur);
  progInt = setInterval(() => {
    if (!isPlaying) return;
    simTime = Math.min(simTime + 1, simDur);
    const pct = Math.round(simTime / simDur * 100);
    document.getElementById('progFill').style.width = pct + '%';
    document.getElementById('progBg').setAttribute('aria-valuenow', pct);
    document.getElementById('dispTime').textContent = fmt(simTime);
    document.getElementById('tCur').textContent     = fmt(simTime);
    if (simTime >= simDur) nextTrack();
  }, 1000);
}

function seekClick(e) {
  const bg = document.getElementById('progBg');
  const pct = e.offsetX / bg.offsetWidth;
  simTime = Math.round(pct * simDur);
  document.getElementById('progFill').style.width  = Math.round(pct * 100) + '%';
  document.getElementById('tCur').textContent      = fmt(simTime);
}

function fmt(s) {
  s = Math.round(s);
  return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
}

/* ── YouTube audio (video hidden, only audio plays) ── */
function getYTId(url) {
  if (!url) return null;
  // Handle all YouTube URL formats:
  // youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID,
  // music.youtube.com/watch?v=ID, youtube.com/shorts/ID
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/v\/([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function loadEmbed() {
  const song = songs[curIdx];
  if (!song) return;
  const fr  = document.getElementById('ytFr');
  const ph  = document.getElementById('audioBarPh');
  const pl  = document.getElementById('audioBarPlaying');
  const ttl = document.getElementById('audioBarTitle');
  const lnk = document.getElementById('audioBarLink');

  const id = getYTId(song.url);
  if (id) {
    // Audio-only: tiny 1px iframe plays sound, video never visible
    fr.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
    ph.style.display  = 'none';
    pl.style.display  = 'flex';
    ttl.textContent   = song.name.toUpperCase();
    lnk.href          = song.url;
  } else {
    ph.style.display  = '';
    ph.textContent    = 'Invalid YouTube URL ✕';
    pl.style.display  = 'none';
    fr.src = '';
  }
}

function clearEmbed() {
  const fr  = document.getElementById('ytFr');
  const ph  = document.getElementById('audioBarPh');
  const pl  = document.getElementById('audioBarPlaying');
  fr.src = '';
  ph.style.display = '';
  ph.textContent   = '\u266a select a track to play';
  pl.style.display = 'none';
}

/* ── Waveform canvas ── */
const wCanvas = document.getElementById('wc');
const wCtx    = wCanvas.getContext('2d');
const bars    = Array.from({ length: 36 }, () => ({ h: 0.04, t: Math.random() * 0.3 + 0.04 }));

function drawWave() {
  const W = wCanvas.width, H = wCanvas.height;
  wCtx.clearRect(0, 0, W, H);
  const bw = Math.floor(W / bars.length) - 1;
  bars.forEach((b, i) => {
    if (isPlaying) {
      b.t += (Math.random() - 0.5) * 0.22;
      b.t  = Math.max(0.03, Math.min(0.93, b.t));
      b.h += (b.t - b.h) * 0.18;
      if (Math.random() < 0.05) b.t = Math.random() * 0.9 + 0.04;
    } else {
      b.h += (0.04 - b.h) * 0.1;
    }
    const bh = Math.round(b.h * H * 0.86);
    const x  = i * (bw + 1);
    const y  = Math.floor((H - bh) / 2);
    const a  = 0.4 + b.h * 0.6;
    wCtx.fillStyle = i % 3 === 0
      ? `rgba(255,153,0,${a})`
      : i % 3 === 1
        ? `rgba(255,200,0,${a * 0.7})`
        : `rgba(255,120,0,${a * 0.5})`;
    wCtx.fillRect(x, y, bw, bh);
  });
  afId = requestAnimationFrame(drawWave);
}

function startWave() {
  if (afId) cancelAnimationFrame(afId);
  drawWave();
}
startWave();

/* ── Record tab ── */
function updateRecVis() {
  const t = document.getElementById('recTitle').value || 'UNTITLED TAPE';
  const s = document.getElementById('recSub').value   || 'add a vibe above';
  document.getElementById('bclTitle').textContent = t;
  document.getElementById('bclSub').textContent   = s;

  document.getElementById('brs1').classList.add('roll');
  document.getElementById('brs2').classList.add('roll');
  document.getElementById('recInd').classList.add('active');

  clearTimeout(window._recAnimTO);
  window._recAnimTO = setTimeout(() => {
    document.getElementById('brs1').classList.remove('roll');
    document.getElementById('brs2').classList.remove('roll');
    document.getElementById('recInd').classList.remove('active');
  }, 800);

  if (!recIntId) {
    recIntId = setInterval(() => {
      recSecs++;
      const h = Math.floor(recSecs / 3600);
      const m = Math.floor((recSecs % 3600) / 60);
      const s = recSecs % 60;
      document.getElementById('recCtr').textContent =
        (h < 10 ? '0' : '') + h + ':' +
        (m < 10 ? '0' : '') + m + ':' +
        (s < 10 ? '0' : '') + s;
    }, 1000);
  }
}

function saveTape() {
  tapeTitle  = document.getElementById('recTitle').value || 'UNTITLED TAPE';
  tapeSub    = document.getElementById('recSub').value   || '';
  labelBg    = recLabelBg;
  labelFg    = recLabelFg;

  // Apply to player label
  const mt   = document.getElementById('mtInfoTitle');
  const mts  = document.getElementById('mtInfoSub');
  const mtt  = document.getElementById('mtTitle');
  const mtsb = document.getElementById('mtSub');
  const ml   = document.getElementById('mtLabel');
  const ca   = document.getElementById('cassLabelArea');
  const clt  = document.getElementById('cassLabelText');

  if (mt)   mt.textContent   = tapeTitle;
  if (mts)  mts.textContent  = tapeSub || '✿';
  if (mtt)  { mtt.textContent = tapeTitle; mtt.style.color = labelFg; }
  if (mtsb) { mtsb.textContent = tapeSub; mtsb.style.color = labelFg; }
  if (ml)   ml.style.background  = labelBg;
  if (ca)   ca.style.background  = labelBg;
  if (clt)  { clt.textContent = tapeTitle.slice(0, 12); clt.style.color = labelFg; }

  // Share cassette
  const bscLabel = document.getElementById('bscLabel');
  const bscTitle = document.getElementById('bscTitle');
  const bscSub   = document.getElementById('bscSub');
  const bscCount = document.getElementById('bscCount');
  if (bscLabel) bscLabel.style.background = labelBg;
  if (bscTitle) { bscTitle.textContent = tapeTitle; bscTitle.style.color = labelFg; }
  if (bscSub)   { bscSub.textContent   = tapeSub;   bscSub.style.color   = labelFg; }
  if (bscCount) bscCount.style.color = labelBg;



  applyLabelToAll();
  onTapeChanged();
  showToast('Tape saved! ✿');
}

/* ════════════════════════════════════════════════════════════
   URL-HASH STATE — the entire tape is encoded into the URL
   so anyone opening the link sees the exact same tape.

   Format:  #v1/<base64url(JSON)>
   The JSON payload is:
   {
     title:   string,
     sub:     string,
     artist:  string,
     year:    string,
     msg:     string,
     labelBg: string,
     labelFg: string,
     songs: [{ name, url, platform, type }, ...]
   }
   Cover images are NOT included (too large for a URL).
   ════════════════════════════════════════════════════════════ */

/* ── URL STATE ENCODING ─────────────────────────────────────
   Cover images are stored in localStorage under a short ID.
   Only the ID goes in the URL, keeping it short.
   Tape data uses minimal keys: t=title, s=sub, a=artist,
   y=year, m=msg, b=labelBg, f=labelFg, c=coverID, q=songs
   ─────────────────────────────────────────────────────────── */






function buildStatePayload() {
  const p = {};
  if (tapeTitle) p.t = tapeTitle;
  if (tapeSub)   p.s = tapeSub;
  const artist = (document.getElementById('recArtist') || {}).value || '';
  const year   = (document.getElementById('recYear')   || {}).value || '';
  const msg    = (document.getElementById('recMsg')    || {}).value || '';
  if (artist) p.a = artist;
  if (year)   p.y = year;
  if (msg)    p.m = msg;
  // Store hex colours without leading # to save 2 chars each
  p.b = labelBg.replace('#', '');
  p.f = labelFg.replace('#', '');
  // Songs: just YouTube video ID (11 chars) instead of full URL
  p.q = songs.map(s => ({ n: s.name, v: getYTId(s.url) || s.url }));
  return p;
}

function encodeState(payload) {
  try {
    const json = JSON.stringify(payload);
    const b64  = btoa(unescape(encodeURIComponent(json)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch(e) { return ''; }
}

function decodeState(hash) {
  try {
    const raw  = hash.replace(/^#/, '').replace(/^v[12]\//, '');
    const b64  = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad  = b64.length % 4 ? b64 + '===='.slice(b64.length % 4) : b64;
    const json = decodeURIComponent(escape(atob(pad)));
    const p    = JSON.parse(json);
    // Normalise: support both old long-key format and new short-key format
    return {
      title:   p.title   || p.t || '',
      sub:     p.sub     || p.s || '',
      artist:  p.artist  || p.a || '',
      year:    p.year    || p.y || '',
      msg:     p.msg     || p.m || '',
      labelBg: p.labelBg ? p.labelBg : (p.b ? '#'+p.b : '#8b5cf6'),
      labelFg: p.labelFg ? p.labelFg : (p.f ? '#'+p.f : '#e8d8ff'),
      songs: (p.songs || p.q || []).map(s => ({
        name: s.name || s.n || '',
        // restore full YouTube URL from short ID
        url:  s.url  ? s.url
              : s.v && s.v.length === 11
                ? 'https://www.youtube.com/watch?v=' + s.v
                : s.v || ''
      }))
    };
  } catch(e) { console.error('decodeState', e); return null; }
}

function buildShareUrl() {
  const payload = buildStatePayload();
  const encoded = encodeState(payload);
  const base    = window.location.href.split('#')[0];
  return `${base}#v2/${encoded}`;
}

/* Load tape state from URL hash on page load */
function loadFromHash() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#v1/')) return;

  const state = decodeState(hash);
  if (!state) { showToast('Could not load tape from link ✕'); return; }

  // Restore metadata
  tapeTitle  = state.title   || '';
  tapeSub    = state.sub     || '';
  labelBg    = state.labelBg || '#8b5cf6';
  labelFg    = state.labelFg || '#e8d8ff';

  if (document.getElementById('recTitle'))  document.getElementById('recTitle').value  = tapeTitle;
  if (document.getElementById('recSub'))    document.getElementById('recSub').value    = tapeSub;
  if (document.getElementById('recArtist')) document.getElementById('recArtist').value = state.artist || '';
  if (document.getElementById('recYear'))   document.getElementById('recYear').value   = state.year   || '';
  if (document.getElementById('recMsg'))    document.getElementById('recMsg').value    = state.msg    || '';

  // Restore songs
  songs = (state.songs || []).map(s => ({
    name:     s.name || '',
    url:      s.url  || '',
    platform: 'youtube',
    type:     'single'
  }));



  // Re-render everything
  renderList();
  updateMiniTape();
  applyLabelToAll();
  saveTape();
  showViewMode(state);
}

function showSharedBanner(title) {
  const existing = document.getElementById('sharedBanner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'sharedBanner';
  banner.innerHTML = `
    <span style="font-size:16px;">📼</span>
    <span>Someone shared <strong>${escHtml(title || 'a tape')}</strong> with you!</span>
    <button onclick="document.getElementById('sharedBanner').remove()" style="
      background:none;border:none;color:#2255aa;cursor:pointer;font-size:14px;
      font-weight:700;padding:0 0 0 12px;">✕</button>`;
  banner.style.cssText = `
    position:fixed;top:44px;left:50%;transform:translateX(-50%);
    background:rgba(230,245,255,0.97);border:1px solid rgba(100,160,220,0.5);
    color:#2255aa;font-family:'Nunito',sans-serif;font-size:12px;font-weight:600;
    padding:10px 20px;border-radius:8px;z-index:9997;
    box-shadow:0 4px 20px rgba(60,100,180,0.2);
    display:flex;align-items:center;gap:8px;
    animation:slideDown 0.4s cubic-bezier(0.34,1.2,0.64,1);`;

  // Inject keyframe if not present
  if (!document.getElementById('bannerKf')) {
    const style = document.createElement('style');
    style.id = 'bannerKf';
    style.textContent = '@keyframes slideDown{from{transform:translateX(-50%) translateY(-20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}';
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);
}

/* ── Share tab ── */
function refreshShare() {
  const url      = buildShareUrl();
  const tlItems  = document.getElementById('tlItems');
  const bscCount = document.getElementById('bscCount');
  const linkEl   = document.getElementById('shareLinkEl');

  if (linkEl)   linkEl.textContent   = url;
  if (bscCount) bscCount.textContent = songs.length + ' track' + (songs.length !== 1 ? 's' : '');

  if (!songs.length) {
    tlItems.innerHTML = '<span style="color:#aabbd0;font-family:\'Architects Daughter\',cursive;">No tracks yet — add some in the Player tab ✿</span>';
    return;
  }
  tlItems.innerHTML = songs.map((s, i) =>
    `<div class="tlp-item">${i + 1}. ${escHtml(s.name)}</div>`
  ).join('');
}

/* Legacy alias used elsewhere */
function updateShareLink() {
  refreshShare();
}

function copyLink() {
  const url = buildShareUrl();
  // Update the displayed link first
  const linkEl = document.getElementById('shareLinkEl');
  if (linkEl) linkEl.textContent = url;

  navigator.clipboard.writeText(url)
    .then(()  => showToast('Link copied! ♪ Anyone can open it'))
    .catch(()  => {
      // Fallback: select the text for manual copy
      if (linkEl) {
        const range = document.createRange();
        range.selectNode(linkEl);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
      }
      showToast('Press Ctrl+C / ⌘C to copy ♪');
    });
}

function downloadTape() {
  const url = buildShareUrl();
  let txt = `=== VHS MIX TAPE ===\n${tapeTitle}\n${tapeSub}\n\nTRACKLIST:\n`;
  songs.forEach((s, i) => {
    txt += `${i + 1}. ${s.name}\n   ${s.url}\n`;
  });
  txt += `\n=== ${songs.length} ITEM${songs.length !== 1 ? 'S' : ''} ===`;
  txt += `\n\nSHAREABLE LINK:\n${url}`;
  const a   = document.createElement('a');
  a.href    = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
  a.download = (tapeTitle || 'tape').replace(/[^a-z0-9]/gi, '_') + '_vhsmix.txt';
  a.click();
  showToast('Downloaded! ⬇');
}

function tweetTape() {
  const url  = buildShareUrl();
  const text = encodeURIComponent(`🎵 Check out my VHS Mix tape: ${tapeTitle || 'Untitled Tape'} — ${url}`);
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
}

function whatsappTape() {
  const url  = buildShareUrl();
  const text = encodeURIComponent(`🎵 Check out my VHS Mix tape: ${tapeTitle || 'Untitled Tape'}\n${url}`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

/* Update the URL bar as the user edits (without reloading the page) */
function pushStateToUrl() {
  const url = buildShareUrl();
  try {
    window.history.replaceState(null, '', url);
  } catch (e) { /* file:// protocol doesn't support pushState */ }
}

/* Call this whenever tape content changes so the URL stays live */
function onTapeChanged() {
  updateMiniTape();
  pushStateToUrl();
  // Refresh share tab if it's open
  if (document.getElementById('tab-share').classList.contains('active')) {
    refreshShare();
  }
}

/* ── Toast ── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

/* ── Utils ── */
function escHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

/* ── Boot: load tape from URL hash if present ── */
window.addEventListener('DOMContentLoaded', () => {
  loadFromHash();
});

/* Handle browser back/forward */
window.addEventListener('hashchange', () => {
  loadFromHash();
});

/* ══════════════════════════════════════════════════════════════
   VIEW MODE — shown when someone opens a shared tape link.
   Completely separate player state from the editor.
   ══════════════════════════════════════════════════════════════ */

let vSongs   = [];
let vCurIdx  = -1;
let vPlaying = false;
let vSimTime = 0, vSimDur = 200, vProgInt = null, vAfId = null;

function showViewMode(state) {
  // Hide editor, show viewer
  const editor = document.getElementById('editorApp');
  const viewer = document.getElementById('viewApp');
  if (editor) editor.style.display = 'none';
  if (!viewer) return;
  viewer.style.display = '';

  // Update window title
  const title = state.title || 'Untitled Tape';
  document.title = title + ' — VHS Mix';
  const tb = document.getElementById('viewTitleBar');
  if (tb) tb.textContent = '📼 ' + title;

  // "Make your own" button points to same page without hash
  const ctaBtn = document.getElementById('viewCtaBtn');
  if (ctaBtn) ctaBtn.href = window.location.href.split('#')[0];

  // Apply cassette label
  const bg = state.labelBg || '#8b5cf6';
  const fg = state.labelFg || '#e8d8ff';
  const vbl = document.getElementById('vBigLabel');
  if (vbl) vbl.style.background = bg;
  const vbt = document.getElementById('vBigTitle');
  if (vbt) { vbt.textContent = title; vbt.style.color = fg; }
  const vbs = document.getElementById('vBigSub');
  if (vbs) { vbs.textContent = state.sub || ''; vbs.style.color = fg; }

  const vcl = document.getElementById('vCassLabel');
  if (vcl) vcl.style.background = bg;
  const vct = document.getElementById('vCassText');
  if (vct) { vct.textContent = title.slice(0, 12); vct.style.color = fg; }

);
  }

  // Meta info (artist, year, message)
  const metaEl = document.getElementById('viewMeta');
  if (metaEl) {
    let html = '';
    if (state.artist || state.year) {
      html += `<div class="vm-row">`;
      if (state.artist) html += `<strong>Mix by</strong> ${escHtml(state.artist)}`;
      if (state.artist && state.year) html += ' &bull; ';
      if (state.year) html += escHtml(state.year);
      html += `</div>`;
    }
    if (state.msg) {
      html += `<div class="vm-msg">"${escHtml(state.msg)}"</div>`;
    }
    metaEl.innerHTML = html;
  }

  // Load songs
  vSongs = (state.songs || []).map(s => ({ name: s.name || '', url: s.url || '' }));
  vRenderList();

  // Start waveform
  vStartWave();
}

function vRenderList() {
  const list = document.getElementById('vSongList');
  if (!list) return;
  if (!vSongs.length) {
    list.innerHTML = '<div style="color:#aabbd0;font-size:11px;padding:8px 0;font-family:\'Architects Daughter\',cursive;">No tracks on this tape ✿</div>';
    return;
  }
  list.innerHTML = vSongs.map((s, i) =>
    `<div class="song-item ${i === vCurIdx ? 'active' : ''}" onclick="vSelectTrack(${i})" role="listitem">
      <span class="plat-badge badge-yt">YT</span>
      <span class="sname">${escHtml(s.name)}</span>
    </div>`
  ).join('');
}

function vSelectTrack(i) {
  vCurIdx = i; vPlaying = true;
  vRenderList();
  vInsertCass();
  vLoadEmbed();
  vStartWave();
  vUpdateDisplay();
  vUpdatePlayBtn();
  vStartProg();
}

function vInsertCass() {
  const c = document.getElementById('vCassEl');
  const l = document.getElementById('vSlotLbl');
  const brs1 = document.getElementById('vBrs1');
  const brs2 = document.getElementById('vBrs2');
  if (c) c.classList.add('in');
  if (l) l.style.display = 'none';
  if (document.getElementById('vcr1')) document.getElementById('vcr1').classList.add('rolling');
  if (document.getElementById('vcr2')) document.getElementById('vcr2').classList.add('rolling');
  if (brs1) brs1.classList.add('roll');
  if (brs2) brs2.classList.add('roll');
}

function vEjectTape() {
  const c = document.getElementById('vCassEl');
  const l = document.getElementById('vSlotLbl');
  if (c) c.classList.remove('in');
  if (l) l.style.display = '';
  if (document.getElementById('vcr1')) document.getElementById('vcr1').classList.remove('rolling');
  if (document.getElementById('vcr2')) document.getElementById('vcr2').classList.remove('rolling');
  const brs1 = document.getElementById('vBrs1');
  const brs2 = document.getElementById('vBrs2');
  if (brs1) brs1.classList.remove('roll');
  if (brs2) brs2.classList.remove('roll');
  vPlaying = false;
  vUpdatePlayBtn();
  const dt = document.getElementById('vDispTrack');
  if (dt) dt.textContent = 'NO TAPE LOADED';
  const pf = document.getElementById('vProgFill');
  if (pf) pf.style.width = '0%';
  vClearEmbed();
  clearInterval(vProgInt);
}

function vTogglePlay() {
  if (!vSongs.length) return;
  if (vCurIdx < 0) { vSelectTrack(0); return; }
  vPlaying = !vPlaying;
  vUpdatePlayBtn();
  if (vPlaying) {
    vInsertCass();
  } else {
    if (document.getElementById('vcr1')) document.getElementById('vcr1').classList.remove('rolling');
    if (document.getElementById('vcr2')) document.getElementById('vcr2').classList.remove('rolling');
  }
}

function vPrevTrack() {
  if (!vSongs.length) return;
  vCurIdx = (vCurIdx - 1 + vSongs.length) % vSongs.length;
  vPlaying = true;
  vRenderList(); vInsertCass(); vLoadEmbed(); vStartWave(); vUpdateDisplay(); vUpdatePlayBtn(); vStartProg();
}

function vNextTrack() {
  if (!vSongs.length) return;
  vCurIdx = (vCurIdx + 1) % vSongs.length;
  vPlaying = true;
  vRenderList(); vInsertCass(); vLoadEmbed(); vStartWave(); vUpdateDisplay(); vUpdatePlayBtn(); vStartProg();
}

function vUpdatePlayBtn() {
  const b  = document.getElementById('vPlayBtn');
  const pd = document.getElementById('vPlayDot');
  if (b)  b.textContent = vPlaying ? '⏸ PAUSE' : '▶ PLAY';
  if (pd) pd.classList.toggle('on', vPlaying);
}

function vUpdateDisplay() {
  const s = vSongs[vCurIdx];
  const dt = document.getElementById('vDispTrack');
  const ds = document.getElementById('vDispSrc');
  if (dt) dt.textContent = s ? s.name.toUpperCase() : 'NO TAPE LOADED';
  if (ds) ds.textContent = s ? 'YOUTUBE' : 'TAPE';
}

function vStartProg() {
  clearInterval(vProgInt);
  vSimTime = 0; vSimDur = 180 + Math.floor(Math.random() * 120);
  const td = document.getElementById('vTDur');
  if (td) td.textContent = fmt(vSimDur);
  vProgInt = setInterval(() => {
    if (!vPlaying) return;
    vSimTime = Math.min(vSimTime + 1, vSimDur);
    const pct = Math.round(vSimTime / vSimDur * 100);
    const pf = document.getElementById('vProgFill');
    const tc = document.getElementById('vTCur');
    const dt = document.getElementById('vDispTime');
    if (pf) pf.style.width = pct + '%';
    if (tc) tc.textContent = fmt(vSimTime);
    if (dt) dt.textContent = fmt(vSimTime);
    if (vSimTime >= vSimDur) vNextTrack();
  }, 1000);
}

function vSeekClick(e) {
  const bg = document.getElementById('vProgBg');
  if (!bg) return;
  const pct = e.offsetX / bg.offsetWidth;
  vSimTime = Math.round(pct * vSimDur);
  const pf = document.getElementById('vProgFill');
  const tc = document.getElementById('vTCur');
  if (pf) pf.style.width = Math.round(pct * 100) + '%';
  if (tc) tc.textContent = fmt(vSimTime);
}

function vLoadEmbed() {
  const song = vSongs[vCurIdx];
  if (!song) return;
  const fr  = document.getElementById('vYtFr');
  const ph  = document.getElementById('vAudioPh');
  const pl  = document.getElementById('vAudioPlaying');
  const ttl = document.getElementById('vAudioTitle');
  const lnk = document.getElementById('vAudioLink');
  const id  = getYTId(song.url);
  if (id) {
    if (fr)  fr.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
    if (ph)  ph.style.display = 'none';
    if (pl)  pl.style.display = 'flex';
    if (ttl) ttl.textContent  = song.name.toUpperCase();
    if (lnk) lnk.href         = song.url;
  } else {
    if (ph)  { ph.style.display = ''; ph.textContent = 'Invalid URL ✕'; }
    if (pl)  pl.style.display = 'none';
    if (fr)  fr.src = '';
  }
}

function vClearEmbed() {
  const fr  = document.getElementById('vYtFr');
  const ph  = document.getElementById('vAudioPh');
  const pl  = document.getElementById('vAudioPlaying');
  if (fr) fr.src = '';
  if (ph) { ph.style.display = ''; ph.textContent = '\u266a select a track to play'; }
  if (pl) pl.style.display = 'none';
}

/* View mode waveform */
function vStartWave() {
  const vc = document.getElementById('vWc');
  if (!vc) return;
  if (vAfId) cancelAnimationFrame(vAfId);
  const ctx2 = vc.getContext('2d');
  const vBars = Array.from({ length: 36 }, () => ({ h: 0.04, t: Math.random() * 0.3 + 0.04 }));
  function drawV() {
    const W = vc.width, H = vc.height;
    ctx2.clearRect(0, 0, W, H);
    const bw = Math.floor(W / vBars.length) - 1;
    vBars.forEach((b, i) => {
      if (vPlaying) {
        b.t += (Math.random() - 0.5) * 0.22;
        b.t  = Math.max(0.03, Math.min(0.93, b.t));
        b.h += (b.t - b.h) * 0.18;
        if (Math.random() < 0.05) b.t = Math.random() * 0.9 + 0.04;
      } else {
        b.h += (0.04 - b.h) * 0.1;
      }
      const bh = Math.round(b.h * H * 0.86);
      const x  = i * (bw + 1);
      const y  = Math.floor((H - bh) / 2);
      const a  = 0.4 + b.h * 0.6;
      ctx2.fillStyle = i % 3 === 0
        ? `rgba(255,153,0,${a})`
        : i % 3 === 1
          ? `rgba(255,200,0,${a * 0.7})`
          : `rgba(255,120,0,${a * 0.5})`;
      ctx2.fillRect(x, y, bw, bh);
    });
    vAfId = requestAnimationFrame(drawV);
  }
  drawV();
}

/* ══════════════════════════════════════════════════════════════
   COLOUR WHEELS — HSL wheel drawn on canvas
   Click anywhere to pick label colour.
   Brightness (lightness) is calculated from the Y position.
   ══════════════════════════════════════════════════════════════ */

function drawWheel(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx  = canvas.width  / 2;
  const cy  = canvas.height / 2;
  const r   = cx - 2;

  // Draw full HSL hue wheel
  for (let angle = 0; angle < 360; angle++) {
    const startAngle = (angle - 1) * Math.PI / 180;
    const endAngle   =  angle      * Math.PI / 180;
    // Inner gradient: white centre → saturated colour → black outer ring
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0,   'white');
    grad.addColorStop(0.5, `hsl(${angle}, 100%, 50%)`);
    grad.addColorStop(1,   'black');
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // White dot at current colour position
  const pos = hslToWheelPos(labelBg, cx, cy, r);
  if (pos) {
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function hslToWheelPos(hex, cx, cy, r) {
  try {
    const rgb = hexToRgb(hex);
    if (!rgb) return null;
    const {h, s, l} = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const angle = h * Math.PI / 180;
    const dist  = s * (l < 0.5 ? l * 2 : (1 - l) * 2) * r * 0.48 + (0.5 - Math.abs(l - 0.5)) * r * 0.5;
    return {
      x: cx + Math.cos(angle) * Math.min(dist, r - 4),
      y: cy + Math.sin(angle) * Math.min(dist, r - 4)
    };
  } catch(e) { return null; }
}

function wheelPickColour(event, canvasId, isRec) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top)  * scaleY;

  const ctx = canvas.getContext('2d');
  const px  = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
  if (px[3] < 10) return; // clicked outside wheel

  const hex = rgbToHex(px[0], px[1], px[2]);
  const fg  = luminance(px[0], px[1], px[2]) > 0.4 ? '#1a1a2a' : '#ffffff';

  if (isRec) {
    recLabelBg = hex; recLabelFg = fg;
    const bcl = document.getElementById('bcLabel');
    const bt  = document.getElementById('bclTitle');
    const bs  = document.getElementById('bclSub');
    const sw  = document.getElementById('recCwSwatch');
    const hx  = document.getElementById('recCwHex');
    if (bcl) bcl.style.background = hex;
    if (bt)  bt.style.color       = fg;
    if (bs)  bs.style.color       = fg;
    if (sw)  sw.style.background  = hex;
    if (hx)  hx.textContent       = hex;
  } else {
    labelBg = hex; labelFg = fg;
    applyLabelToAll();
    onTapeChanged();
  }
  // Redraw wheel with new indicator dot
  drawWheel(canvasId);
}

function wheelClick(e)    { wheelPickColour(e, 'colourWheel',    false); }
function recWheelClick(e) { wheelPickColour(e, 'recColourWheel', true);  }

/* ── Colour utilities ── */
function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : null;
}
function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch(max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
    h *= 360;
  }
  return { h, s, l };
}
function luminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/* Draw wheels after DOM loads */
window.addEventListener('DOMContentLoaded', () => {
  drawWheel('colourWheel');
  drawWheel('recColourWheel');
});

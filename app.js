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
let coverDataUrl = '';
let addType     = 'single';
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

/* ── Add-type toggle ── */
function setAddType(t, el) {
  addType = t;
  document.querySelectorAll('.tt-btn').forEach(b => b.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('singleForm').style.display   = t === 'single'   ? '' : 'none';
  document.getElementById('playlistForm').style.display = t === 'playlist' ? '' : 'none';
}

/* ── Label colours ── */
function setCC(el, bg, fg) {
  document.querySelectorAll('#chipRow .cc').forEach(c => {
    c.classList.remove('sel');
    c.setAttribute('aria-checked', 'false');
  });
  el.classList.add('sel');
  el.setAttribute('aria-checked', 'true');
  labelBg = bg; labelFg = fg;
  applyLabelToAll();
}

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
  const cassArea = document.getElementById('cassLabelArea');
  const mtLabel  = document.getElementById('mtLabel');
  if (cassArea) cassArea.style.background = labelBg;
  if (mtLabel)  mtLabel.style.background  = labelBg;

  ['cassLabelText', 'mtTitle', 'mtSub'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.color = labelFg;
  });
}

/* ── Cover upload ── */
function handleCoverUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    coverDataUrl = ev.target.result;
    ['cassLabelImg', 'mtLabelImg', 'bclImg', 'bscImg'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.src = coverDataUrl; el.classList.add('show'); }
    });
    const prev = document.getElementById('coverPreview');
    if (prev) { prev.src = coverDataUrl; prev.classList.add('show'); }
    const inner = document.getElementById('cuaInner');
    if (inner) inner.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

/* ── Add song / playlist ── */
function addItem() {
  if (addType === 'single') {
    const name = document.getElementById('sName').value.trim();
    const url  = document.getElementById('sUrl').value.trim();
    const plat = document.getElementById('sPlatform').value;
    if (!name) { showToast('Enter a song name ✿'); return; }
    if (!url)  { showToast('Paste a URL ✿');        return; }
    songs.push({ name, url, platform: plat, type: 'single' });
    document.getElementById('sName').value = '';
    document.getElementById('sUrl').value  = '';
  } else {
    const name = document.getElementById('plName').value.trim();
    const url  = document.getElementById('plUrl').value.trim();
    if (!name) { showToast('Enter a playlist name ✿'); return; }
    if (!url)  { showToast('Paste a Spotify URL ✿');   return; }
    songs.push({ name, url, platform: 'spotify', type: 'playlist' });
    document.getElementById('plName').value = '';
    document.getElementById('plUrl').value  = '';
  }
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
    const badgeClass = s.type === 'playlist' ? 'badge-pl' : s.platform === 'youtube' ? 'badge-yt' : 'badge-sp';
    const badgeLabel = s.type === 'playlist' ? 'PL' : s.platform === 'youtube' ? 'YT' : 'SP';
    return `<div class="song-item ${i === curIdx ? 'active' : ''}" onclick="selectTrack(${i})" role="listitem">
      <span class="plat-badge ${badgeClass}">${badgeLabel}</span>
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
  document.getElementById('dispSrc').textContent   = s ? (s.type === 'playlist' ? 'PLAYLIST' : s.platform.toUpperCase()) : 'TAPE';
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

/* ── Embeds ── */
function getYTId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
function getSPPlaylistId(url) {
  const m = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}

function loadEmbed() {
  const song  = songs[curIdx];
  if (!song) return;
  const ph    = document.getElementById('ytPh');
  const fr    = document.getElementById('ytFr');
  const spw   = document.getElementById('spWrap');
  const spfr  = document.getElementById('spFr');
  const badge = document.getElementById('embedBadge');

  ph.classList.add('gone');
  fr.classList.remove('open');
  spw.classList.remove('open');
  badge.style.display = 'none';

  if (song.platform === 'youtube') {
    const id = getYTId(song.url);
    if (id) {
      fr.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
      fr.classList.add('open');
      badge.style.display    = '';
      badge.style.background = 'rgba(255,0,0,0.85)';
      badge.textContent      = 'YOUTUBE';
      return;
    }
  }

  if (song.platform === 'spotify') {
    if (song.type === 'playlist') {
      const id = getSPPlaylistId(song.url);
      if (id) {
        spfr.src = `https://open.spotify.com/embed/playlist/${id}?utm_source=generator`;
        spw.classList.add('open');
        badge.style.display    = '';
        badge.style.background = 'rgba(29,185,84,0.9)';
        badge.textContent      = 'SPOTIFY';
        return;
      }
    } else {
      // Single Spotify track — link out
      ph.classList.remove('gone');
      ph.innerHTML = `<span style="font-size:24px;">🎵</span>
        <span style="font-size:12px;color:#888;cursor:pointer;"
          onclick="window.open('${escHtml(song.url)}','_blank')">Open in Spotify ↗</span>`;
      badge.style.display    = '';
      badge.style.background = 'rgba(29,185,84,0.9)';
      badge.textContent      = 'SPOTIFY';
      return;
    }
  }

  ph.classList.remove('gone');
  ph.innerHTML = '<span style="font-size:24px;">▶</span><span>INVALID URL</span>';
}

function clearEmbed() {
  const fr   = document.getElementById('ytFr');
  const spfr = document.getElementById('spFr');
  const ph   = document.getElementById('ytPh');
  fr.classList.remove('open'); fr.src = '';
  document.getElementById('spWrap').classList.remove('open'); spfr.src = '';
  ph.classList.remove('gone');
  ph.innerHTML = '<span style="font-size:24px;">▶</span><span>SELECT A TRACK</span>';
  document.getElementById('embedBadge').style.display = 'none';
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

  if (coverDataUrl) {
    ['bscImg', 'bclImg'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.src = coverDataUrl; el.classList.add('show'); }
    });
  }

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

function buildStatePayload() {
  return {
    title:   tapeTitle  || '',
    sub:     tapeSub    || '',
    artist:  document.getElementById('recArtist') ? document.getElementById('recArtist').value : '',
    year:    document.getElementById('recYear')   ? document.getElementById('recYear').value   : '',
    msg:     document.getElementById('recMsg')    ? document.getElementById('recMsg').value    : '',
    labelBg: labelBg,
    labelFg: labelFg,
    songs:   songs.map(s => ({ name: s.name, url: s.url, platform: s.platform, type: s.type }))
  };
}

function encodeState(payload) {
  try {
    const json    = JSON.stringify(payload);
    const b64     = btoa(unescape(encodeURIComponent(json)));
    // Make base64 URL-safe
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error('encodeState failed', e);
    return '';
  }
}

function decodeState(hash) {
  try {
    // Strip leading # and version prefix
    const raw  = hash.replace(/^#/, '').replace(/^v1\//, '');
    // Restore base64 padding
    const b64  = raw.replace(/-/g, '+').replace(/_/g, '/');
    const pad  = b64.length % 4 ? b64 + '===='.slice(b64.length % 4) : b64;
    const json = decodeURIComponent(escape(atob(pad)));
    return JSON.parse(json);
  } catch (e) {
    console.error('decodeState failed', e);
    return null;
  }
}

function buildShareUrl() {
  const payload = buildStatePayload();
  const encoded = encodeState(payload);
  const base    = window.location.href.split('#')[0];
  return `${base}#v1/${encoded}`;
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
    name:     s.name     || '',
    url:      s.url      || '',
    platform: s.platform || 'youtube',
    type:     s.type     || 'single'
  }));

  // Re-render everything
  renderList();
  updateMiniTape();
  applyLabelToAll();
  saveTape();          // applies title/sub/colours to all UI elements

  // Show a "loaded from link" banner
  showSharedBanner(tapeTitle);
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
    `<div class="tlp-item">${i + 1}. [${s.type === 'playlist' ? 'Playlist' : s.platform}] ${escHtml(s.name)}</div>`
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
    txt += `${i + 1}. [${s.type === 'playlist' ? 'PLAYLIST' : s.platform.toUpperCase()}] ${s.name}\n   ${s.url}\n`;
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

/* ============================================================
   VHS MIX — app.js  (clean rewrite)
   ============================================================ */

/* ── State ── */
let songs           = [];
let curIdx          = -1;
let isPlaying       = false;
let currentPlatform = 'youtube';
let labelBg         = '#8b5cf6';
let labelFg         = '#e8d8ff';
let recLabelBg      = '#8b5cf6';
let recLabelFg      = '#e8d8ff';
let tapeTitle       = '';
let tapeSub         = '';
let simTime = 0, simDur = 200, progInt = null, afId = null;
let recSecs = 0, recIntId = null;

/* ── Win7 clock ── */
function updateClock() {
  const now = new Date();
  const el  = document.getElementById('w7clock');
  if (el) el.innerHTML =
    now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) + '<br>' +
    now.toLocaleDateString([], {month:'short',day:'numeric'});
}
updateClock();
setInterval(updateClock, 30000);

/* ── Tabs ── */
function goTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  el.classList.add('active'); el.setAttribute('aria-selected','true');
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'share') refreshShare();
}

/* ── Platform toggle ── */
function setPlatform(plat, el) {
  currentPlatform = plat;
  document.querySelectorAll('.pt-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  const lbl  = document.getElementById('sUrlLabel');
  const inp  = document.getElementById('sUrl');
  const hint = document.getElementById('scHint');
  if (plat === 'youtube') {
    if (lbl)  lbl.textContent    = 'YouTube URL';
    if (inp)  inp.placeholder    = 'https://youtube.com/watch?v=...';
    if (hint) hint.style.display = 'none';
  } else {
    if (lbl)  lbl.textContent    = 'SoundCloud embed src URL';
    if (inp)  inp.placeholder    = 'https://w.soundcloud.com/player/?url=...';
    if (hint) hint.style.display = '';
  }
}

/* ── Label colours (player tab — colour chips) ── */
function setCC(bg, fg) {
  labelBg = bg; labelFg = fg;
  applyLabelToAll();
  onTapeChanged();
}

function setRecCC(bg, fg) {
  recLabelBg = bg; recLabelFg = fg;
  const bcl = document.getElementById('bcLabel');
  const bt  = document.getElementById('bclTitle');
  const bs  = document.getElementById('bclSub');
  if (bcl) bcl.style.background = bg;
  if (bt)  bt.style.color = fg;
  if (bs)  bs.style.color = fg;
  // Sync colour wheel swatch in record tab
  const sw = document.getElementById('recCwSwatch');
  const hx = document.getElementById('recCwHex');
  if (sw) sw.style.background = bg;
  if (hx) hx.textContent = bg;
  drawWheel('recColourWheel');
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
  // Update colour chip active state
  document.querySelectorAll('#chipRow .cc').forEach(c => {
    c.classList.toggle('sel', c.dataset.bg === labelBg);
  });
}

/* ── Add song ── */
function addItem() {
  const name = document.getElementById('sName').value.trim();
  const url  = document.getElementById('sUrl').value.trim();
  if (!name) { showToast('Enter a song name ✿'); return; }
  if (!url)  { showToast('Paste a URL ✿'); return; }
  if (currentPlatform === 'youtube' && !getYTId(url)) {
    showToast('Paste a valid YouTube URL ✿'); return;
  }
  if (currentPlatform === 'soundcloud' && !url.includes('soundcloud.com')) {
    showToast('Paste a SoundCloud embed src URL ✿'); return;
  }
  songs.push({ name, url, platform: currentPlatform });
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
  if (!list) return;
  document.getElementById('mtCount').textContent = songs.length + ' track' + (songs.length !== 1 ? 's' : '');
  if (!songs.length) {
    list.innerHTML = '<div style="text-align:center;color:#aabbd0;font-size:11px;padding:12px 0;font-family:\'Architects Daughter\',cursive;">no tracks yet ✿</div>';
    return;
  }
  list.innerHTML = songs.map((s, i) => {
    const isSC = s.platform === 'soundcloud';
    return `<div class="song-item ${i === curIdx ? 'active' : ''}" onclick="selectTrack(${i})" role="listitem">
      <span class="plat-badge ${isSC ? 'badge-sc' : 'badge-yt'}">${isSC ? 'SC' : 'YT'}</span>
      <span class="sname">${escHtml(s.name)}</span>
      <button class="del-btn" onclick="event.stopPropagation();removeSong(${i})">✕</button>
    </div>`;
  }).join('');
}

/* ── Playback ── */
function selectTrack(i) {
  curIdx = i; isPlaying = true;
  renderList(); insertCass(); loadEmbed(); startWave(); updateDisplay(); updatePlayBtn(); startProg();
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
  isPlaying = false; updatePlayBtn();
  document.getElementById('dispTrack').textContent = 'NO TAPE LOADED';
  document.getElementById('dispTime').textContent  = '0:00';
  document.getElementById('progFill').style.width  = '0%';
  document.getElementById('tCur').textContent      = '0:00';
  document.getElementById('tDur').textContent      = '0:00';
  clearEmbed(); clearInterval(progInt);
}

function togglePlay() {
  if (!songs.length) { showToast('Add songs first ✿'); return; }
  if (curIdx < 0)    { selectTrack(0); return; }
  isPlaying = !isPlaying;
  updatePlayBtn(); updateDisplay();
  if (isPlaying) {
    insertCass();
    document.getElementById('cr1').classList.add('rolling');
    document.getElementById('cr2').classList.add('rolling');
    startWave();
    mediaCommand('play');
  } else {
    document.getElementById('cr1').classList.remove('rolling');
    document.getElementById('cr2').classList.remove('rolling');
    mediaCommand('pause');
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
  document.getElementById('dispSrc').textContent   = s ? (s.platform === 'soundcloud' ? 'SNDCLD' : 'YOUTUBE') : 'TAPE';
  const lt = document.getElementById('cassLabelText');
  if (lt && s) lt.textContent = s.name.slice(0, 12);
}

function setVolume(v) {
  document.getElementById('volSlider').style.setProperty('--v', v + '%');
}

/* ── Progress ── */
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
  const bg  = document.getElementById('progBg');
  const pct = e.offsetX / bg.offsetWidth;
  simTime   = Math.round(pct * simDur);
  document.getElementById('progFill').style.width = Math.round(pct * 100) + '%';
  document.getElementById('tCur').textContent     = fmt(simTime);
}

function fmt(s) {
  s = Math.round(s);
  return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
}

/* ── Media helpers ── */
function getYTId(url) {
  if (!url) return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
    /\/v\/([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) { const m = url.match(p); if (m) return m[1]; }
  return null;
}

function mediaCommand(cmd) {
  const song = songs[curIdx];
  if (!song) return;
  if (song.platform === 'soundcloud') {
    const fr = document.getElementById('scFr');
    if (fr && fr.contentWindow) {
      try { fr.contentWindow.postMessage(JSON.stringify({ method: cmd }), '*'); } catch(e) {}
    }
  } else {
    const fr = document.getElementById('ytFr');
    if (fr && fr.contentWindow) {
      const func = cmd === 'play' ? 'playVideo' : 'pauseVideo';
      try { fr.contentWindow.postMessage(JSON.stringify({ event:'command', func, args:'' }), '*'); } catch(e) {}
    }
  }
}

function loadEmbed() {
  const song    = songs[curIdx];
  if (!song) return;
  const ytFr    = document.getElementById('ytFr');
  const scFr    = document.getElementById('scFr');
  const scWrap  = document.getElementById('scEmbedWrap');
  const audioBar= document.getElementById('audioBar');
  const ph      = document.getElementById('audioBarPh');
  const pl      = document.getElementById('audioBarPlaying');
  const ttl     = document.getElementById('audioBarTitle');
  const lnk     = document.getElementById('audioBarLink');

  // Reset
  if (ytFr)   ytFr.src = '';
  if (scFr)   scFr.src = '';
  if (scWrap) scWrap.style.display = 'none';

  if (song.platform === 'soundcloud') {
    // Show the visible SC embed panel; hide the audio-bar playing state
    if (scFr)   scFr.src = `https://w.soundcloud.com/player/?url=${song.url}&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true&color=%23ff5500`;
    if (scWrap) scWrap.style.display = '';
    // Audio bar shows track name as "now selected"
    if (ph)  ph.style.display = 'none';
    if (pl)  pl.style.display = 'flex';
    if (ttl) ttl.textContent  = song.name.toUpperCase();
    if (lnk) { lnk.href = song.url; lnk.textContent = '↗'; }
  } else {
    // YouTube: hidden iframe, audio bar shows playing state
    if (scWrap) scWrap.style.display = 'none';
    const id = getYTId(song.url);
    if (id && ytFr) {
      ytFr.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;
      if (ph)  ph.style.display = 'none';
      if (pl)  pl.style.display = 'flex';
      if (ttl) ttl.textContent  = song.name.toUpperCase();
      if (lnk) { lnk.href = song.url; lnk.textContent = '↗'; }
    } else {
      if (ph) { ph.style.display = ''; ph.textContent = 'Invalid URL ✕'; }
      if (pl) pl.style.display = 'none';
    }
  }
}

function clearEmbed() {
  const ytFr   = document.getElementById('ytFr');
  const scFr   = document.getElementById('scFr');
  const scWrap = document.getElementById('scEmbedWrap');
  const ph     = document.getElementById('audioBarPh');
  const pl     = document.getElementById('audioBarPlaying');
  if (ytFr)   ytFr.src = '';
  if (scFr)   scFr.src = '';
  if (scWrap) scWrap.style.display = 'none';
  if (ph) { ph.style.display = ''; ph.textContent = '♪ select a track to play'; }
  if (pl) pl.style.display = 'none';
}

/* ── Waveform ── */
const wCanvas = document.getElementById('wc');
const wCtx    = wCanvas ? wCanvas.getContext('2d') : null;
const bars    = Array.from({ length: 36 }, () => ({ h: 0.04, t: Math.random() * 0.3 + 0.04 }));

function drawWaveFrame() {
  if (!wCtx) return;
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
    wCtx.fillStyle = i % 3 === 0 ? `rgba(255,153,0,${a})` : i % 3 === 1 ? `rgba(255,200,0,${a*0.7})` : `rgba(255,120,0,${a*0.5})`;
    wCtx.fillRect(x, y, bw, bh);
  });
  afId = requestAnimationFrame(drawWaveFrame);
}

function startWave() {
  if (afId) cancelAnimationFrame(afId);
  drawWaveFrame();
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
  clearTimeout(window._rt);
  window._rt = setTimeout(() => {
    document.getElementById('brs1').classList.remove('roll');
    document.getElementById('brs2').classList.remove('roll');
    document.getElementById('recInd').classList.remove('active');
  }, 800);
  if (!recIntId) {
    recIntId = setInterval(() => {
      recSecs++;
      const h = Math.floor(recSecs / 3600), m = Math.floor((recSecs % 3600) / 60), s = recSecs % 60;
      document.getElementById('recCtr').textContent =
        (h<10?'0':'')+h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s;
    }, 1000);
  }
}

function saveTape() {
  tapeTitle  = document.getElementById('recTitle').value || 'UNTITLED TAPE';
  tapeSub    = document.getElementById('recSub').value   || '';
  // Sync rec wheel colour to player label
  labelBg = recLabelBg; labelFg = recLabelFg;

  const mt  = document.getElementById('mtInfoTitle');
  const mts = document.getElementById('mtInfoSub');
  const mtt = document.getElementById('mtTitle');
  const msb = document.getElementById('mtSub');
  const ml  = document.getElementById('mtLabel');
  const ca  = document.getElementById('cassLabelArea');
  const clt = document.getElementById('cassLabelText');
  if (mt)  mt.textContent  = tapeTitle;
  if (mts) mts.textContent = tapeSub || '✿';
  if (mtt) { mtt.textContent = tapeTitle; mtt.style.color = labelFg; }
  if (msb) { msb.textContent = tapeSub;   msb.style.color = labelFg; }
  if (ml)  ml.style.background  = labelBg;
  if (ca)  ca.style.background  = labelBg;
  if (clt) { clt.textContent = tapeTitle.slice(0, 12); clt.style.color = labelFg; }

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

/* ── URL state ── */
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
  p.b = labelBg.replace('#', '');
  p.f = labelFg.replace('#', '');
  p.q = songs.map(s => {
    if (s.platform === 'soundcloud') return { n: s.name, u: s.url, p: 'sc' };
    return { n: s.name, v: getYTId(s.url) || s.url };
  });
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
    return {
      title:   p.title   || p.t || '',
      sub:     p.sub     || p.s || '',
      artist:  p.artist  || p.a || '',
      year:    p.year    || p.y || '',
      msg:     p.msg     || p.m || '',
      labelBg: p.labelBg ? p.labelBg : (p.b ? '#'+p.b : '#8b5cf6'),
      labelFg: p.labelFg ? p.labelFg : (p.f ? '#'+p.f : '#e8d8ff'),
      songs: (p.songs || p.q || []).map(s => ({
        name:     s.name || s.n || '',
        platform: s.p === 'sc' ? 'soundcloud' : (s.platform || 'youtube'),
        url:  s.url ? s.url : s.u ? s.u
              : (s.v && s.v.length === 11 ? 'https://www.youtube.com/watch?v=' + s.v : s.v || '')
      }))
    };
  } catch(e) { return null; }
}

function buildShareUrl() {
  const payload = buildStatePayload();
  const encoded = encodeState(payload);
  return window.location.href.split('#')[0] + '#v2/' + encoded;
}

function pushStateToUrl() {
  try { window.history.replaceState(null, '', buildShareUrl()); } catch(e) {}
}

function onTapeChanged() {
  const mc = document.getElementById('mtCount');
  if (mc) mc.textContent = songs.length + ' track' + (songs.length !== 1 ? 's' : '');
  pushStateToUrl();
  if (document.getElementById('tab-share').classList.contains('active')) refreshShare();
}

/* ── Share tab ── */
function refreshShare() {
  const url = buildShareUrl();
  const el  = document.getElementById('shareLinkEl');
  const bc  = document.getElementById('bscCount');
  if (el) el.textContent = url;
  if (bc) bc.textContent = songs.length + ' track' + (songs.length !== 1 ? 's' : '');
  const tl = document.getElementById('tlItems');
  if (!tl) return;
  if (!songs.length) { tl.innerHTML = '<span style="color:#aabbd0;font-family:\'Architects Daughter\',cursive;">No tracks yet.</span>'; return; }
  tl.innerHTML = songs.map((s, i) => `<div class="tlp-item">${i + 1}. ${escHtml(s.name)}</div>`).join('');
}

function updateShareLink() { refreshShare(); }

function copyLink() {
  const url = buildShareUrl();
  const el  = document.getElementById('shareLinkEl');
  if (el) el.textContent = url;
  navigator.clipboard.writeText(url)
    .then(() => showToast('Link copied! ♪'))
    .catch(() => showToast('Press Ctrl+C to copy'));
}

function downloadTape() {
  let txt = `=== VHS MIX TAPE ===\n${tapeTitle}\n${tapeSub}\n\nTRACKLIST:\n`;
  songs.forEach((s, i) => { txt += `${i+1}. [${s.platform.toUpperCase()}] ${s.name}\n   ${s.url}\n`; });
  txt += `\n=== ${songs.length} TRACKS ===\n\nSHAREABLE LINK:\n${buildShareUrl()}`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
  a.download = (tapeTitle || 'tape').replace(/[^a-z0-9]/gi, '_') + '_vhsmix.txt';
  a.click();
  showToast('Downloaded! ⬇');
}

function tweetTape() {
  const url  = buildShareUrl();
  const text = encodeURIComponent(`🎵 Check out my VHS Mix tape: ${tapeTitle || 'Untitled'} — ${url}`);
  window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
}

function whatsappTape() {
  const url  = buildShareUrl();
  const text = encodeURIComponent(`🎵 VHS Mix tape: ${tapeTitle || 'Untitled'}\n${url}`);
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

/* ── Load from URL hash on page load ── */
function loadFromHash() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#v')) return;
  const state = decodeState(hash);
  if (!state) { showToast('Could not load tape from link ✕'); return; }

  tapeTitle  = state.title   || '';
  tapeSub    = state.sub     || '';
  labelBg    = state.labelBg || '#8b5cf6';
  labelFg    = state.labelFg || '#e8d8ff';
  recLabelBg = labelBg; recLabelFg = labelFg;

  const flds = [['recTitle',tapeTitle],['recSub',tapeSub],['recArtist',state.artist||''],['recYear',state.year||''],['recMsg',state.msg||'']];
  flds.forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.value = val; });

  songs = (state.songs || []).map(s => ({ name: s.name || '', url: s.url || '', platform: s.platform || 'youtube' }));

  renderList(); applyLabelToAll(); saveTape();
  showViewMode(state);
}

window.addEventListener('hashchange', loadFromHash);

/* ── Toast ── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2400);
}

/* ── Utils ── */
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ═══════════════════════════════════════════════════════════
   VIEW MODE
   ═══════════════════════════════════════════════════════════ */
let vSongs = [], vCurIdx = -1, vPlaying = false;
let vSimTime = 0, vSimDur = 200, vProgInt = null, vAfId = null;

function showViewMode(state) {
  const editor = document.getElementById('editorApp');
  const viewer = document.getElementById('viewApp');
  if (editor) editor.style.display = 'none';
  if (!viewer) return;
  viewer.style.display = '';

  const title = state.title || 'Untitled Tape';
  document.title = title + ' — VHS Mix';
  const tb = document.getElementById('viewTitleBar');
  if (tb) tb.textContent = '📼 ' + title;

  const ctaBtn = document.getElementById('viewCtaBtn');
  if (ctaBtn) ctaBtn.href = window.location.href.split('#')[0];

  const bg = state.labelBg || '#8b5cf6';
  const fg = state.labelFg || '#e8d8ff';

  ['vBigLabel','vCassLabel'].forEach(id => { const el = document.getElementById(id); if (el) el.style.background = bg; });

  const vbt = document.getElementById('vBigTitle');
  const vbs = document.getElementById('vBigSub');
  const vct = document.getElementById('vCassText');
  if (vbt) { vbt.textContent = title; vbt.style.color = fg; }
  if (vbs) { vbs.textContent = state.sub || ''; vbs.style.color = fg; }
  if (vct) { vct.textContent = title.slice(0,12); vct.style.color = fg; }

  const metaEl = document.getElementById('viewMeta');
  if (metaEl) {
    let html = '';
    if (state.artist || state.year) {
      html += '<div class="vm-row">';
      if (state.artist) html += `<strong>Mix by</strong> ${escHtml(state.artist)}`;
      if (state.artist && state.year) html += ' &bull; ';
      if (state.year) html += escHtml(state.year);
      html += '</div>';
    }
    if (state.msg) html += `<div class="vm-msg">"${escHtml(state.msg)}"</div>`;
    metaEl.innerHTML = html;
  }

  vSongs = (state.songs || []).map(s => ({ name: s.name||'', url: s.url||'', platform: s.platform||'youtube' }));
  vRenderList();
  vStartWave();
}

function vRenderList() {
  const list = document.getElementById('vSongList');
  if (!list) return;
  if (!vSongs.length) { list.innerHTML = '<div style="color:#aabbd0;font-size:11px;padding:8px 0;font-family:\'Architects Daughter\',cursive;">No tracks ✿</div>'; return; }
  list.innerHTML = vSongs.map((s, i) => {
    const isSC = s.platform === 'soundcloud';
    return `<div class="song-item ${i===vCurIdx?'active':''}" onclick="vSelectTrack(${i})" role="listitem">
      <span class="plat-badge ${isSC?'badge-sc':'badge-yt'}">${isSC?'SC':'YT'}</span>
      <span class="sname">${escHtml(s.name)}</span>
    </div>`;
  }).join('');
}

function vSelectTrack(i) {
  vCurIdx = i; vPlaying = true;
  vRenderList(); vInsertCass(); vLoadEmbed(); vStartWave(); vUpdateDisplay(); vUpdatePlayBtn(); vStartProg();
}

function vInsertCass() {
  const c = document.getElementById('vCassEl');
  const l = document.getElementById('vSlotLbl');
  if (c) c.classList.add('in');
  if (l) l.style.display = 'none';
  ['vcr1','vcr2','vBrs1','vBrs2'].forEach(id => { const el=document.getElementById(id); if(el) el.classList.add(id.startsWith('v')?'rolling':'roll'); });
  const r1=document.getElementById('vcr1'), r2=document.getElementById('vcr2');
  if(r1) r1.classList.add('rolling'); if(r2) r2.classList.add('rolling');
  const b1=document.getElementById('vBrs1'), b2=document.getElementById('vBrs2');
  if(b1) b1.classList.add('roll'); if(b2) b2.classList.add('roll');
}

function vEjectTape() {
  const c=document.getElementById('vCassEl'), l=document.getElementById('vSlotLbl');
  if(c) c.classList.remove('in'); if(l) l.style.display='';
  ['vcr1','vcr2'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('rolling');});
  ['vBrs1','vBrs2'].forEach(id=>{const el=document.getElementById(id);if(el)el.classList.remove('roll');});
  vPlaying=false; vUpdatePlayBtn(); vClearEmbed(); clearInterval(vProgInt);
  const dt=document.getElementById('vDispTrack'), pf=document.getElementById('vProgFill');
  if(dt) dt.textContent='NO TAPE LOADED'; if(pf) pf.style.width='0%';
}

function vTogglePlay() {
  if (!vSongs.length) return;
  if (vCurIdx < 0) { vSelectTrack(0); return; }
  vPlaying = !vPlaying;
  vUpdatePlayBtn();
  if (vPlaying) {
    vInsertCass();
    const r1=document.getElementById('vcr1'), r2=document.getElementById('vcr2');
    if(r1) r1.classList.add('rolling'); if(r2) r2.classList.add('rolling');
    vMediaCommand('play');
  } else {
    const r1=document.getElementById('vcr1'), r2=document.getElementById('vcr2');
    if(r1) r1.classList.remove('rolling'); if(r2) r2.classList.remove('rolling');
    vMediaCommand('pause');
  }
}

function vPrevTrack() {
  if(!vSongs.length) return;
  vCurIdx=(vCurIdx-1+vSongs.length)%vSongs.length; vPlaying=true;
  vRenderList(); vInsertCass(); vLoadEmbed(); vStartWave(); vUpdateDisplay(); vUpdatePlayBtn(); vStartProg();
}

function vNextTrack() {
  if(!vSongs.length) return;
  vCurIdx=(vCurIdx+1)%vSongs.length; vPlaying=true;
  vRenderList(); vInsertCass(); vLoadEmbed(); vStartWave(); vUpdateDisplay(); vUpdatePlayBtn(); vStartProg();
}

function vUpdatePlayBtn() {
  const b=document.getElementById('vPlayBtn'), pd=document.getElementById('vPlayDot');
  if(b)  b.textContent = vPlaying ? '⏸ PAUSE' : '▶ PLAY';
  if(pd) pd.classList.toggle('on', vPlaying);
}

function vUpdateDisplay() {
  const s=vSongs[vCurIdx];
  const dt=document.getElementById('vDispTrack'), ds=document.getElementById('vDispSrc');
  if(dt) dt.textContent = s ? s.name.toUpperCase() : 'NO TAPE LOADED';
  if(ds) ds.textContent = s ? (s.platform==='soundcloud'?'SNDCLD':'YOUTUBE') : 'TAPE';
}

function vStartProg() {
  clearInterval(vProgInt);
  vSimTime=0; vSimDur=180+Math.floor(Math.random()*120);
  const td=document.getElementById('vTDur'); if(td) td.textContent=fmt(vSimDur);
  vProgInt=setInterval(()=>{
    if(!vPlaying) return;
    vSimTime=Math.min(vSimTime+1,vSimDur);
    const pct=Math.round(vSimTime/vSimDur*100);
    const pf=document.getElementById('vProgFill'), tc=document.getElementById('vTCur'), dt=document.getElementById('vDispTime');
    if(pf) pf.style.width=pct+'%'; if(tc) tc.textContent=fmt(vSimTime); if(dt) dt.textContent=fmt(vSimTime);
    if(vSimTime>=vSimDur) vNextTrack();
  },1000);
}

function vSeekClick(e) {
  const bg=document.getElementById('vProgBg'); if(!bg) return;
  const pct=e.offsetX/bg.offsetWidth;
  vSimTime=Math.round(pct*vSimDur);
  const pf=document.getElementById('vProgFill'), tc=document.getElementById('vTCur');
  if(pf) pf.style.width=Math.round(pct*100)+'%'; if(tc) tc.textContent=fmt(vSimTime);
}

function vMediaCommand(cmd) {
  const song=vSongs[vCurIdx]; if(!song) return;
  if(song.platform==='soundcloud'){
    const fr=document.getElementById('vScFr');
    if(fr&&fr.contentWindow) try{fr.contentWindow.postMessage(JSON.stringify({method:cmd}),'*');}catch(e){}
  } else {
    const fr=document.getElementById('vYtFr');
    if(fr&&fr.contentWindow){
      const func=cmd==='play'?'playVideo':'pauseVideo';
      try{fr.contentWindow.postMessage(JSON.stringify({event:'command',func,args:''}),'*');}catch(e){}
    }
  }
}

function vLoadEmbed() {
  const song    = vSongs[vCurIdx]; if (!song) return;
  const ytFr    = document.getElementById('vYtFr');
  const scFr    = document.getElementById('vScFr');
  const scWrap  = document.getElementById('vScEmbedWrap');
  const ph      = document.getElementById('vAudioPh');
  const pl      = document.getElementById('vAudioPlaying');
  const ttl     = document.getElementById('vAudioTitle');
  const lnk     = document.getElementById('vAudioLink');

  if (ytFr)   ytFr.src = '';
  if (scFr)   scFr.src = '';
  if (scWrap) scWrap.style.display = 'none';

  if (song.platform === 'soundcloud') {
    // If user pasted the embed src directly, use it; otherwise wrap the track URL
    const scSrc = song.url.includes('w.soundcloud.com/player')
      ? song.url
      : `https://w.soundcloud.com/player/?url=${song.url}&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=true&color=%23ff5500`;
    if (scFr)   scFr.src = scSrc;
    if (scWrap) scWrap.style.display = '';
    if (ph)  ph.style.display = 'none';
    if (pl)  pl.style.display = 'flex';
    if (ttl) ttl.textContent  = song.name.toUpperCase();
    if (lnk) { lnk.href = song.url; lnk.textContent = '↗'; }
  } else {
    const id = getYTId(song.url);
    if (id && ytFr) {
      ytFr.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1`;
      if (ph)  ph.style.display = 'none';
      if (pl)  pl.style.display = 'flex';
      if (ttl) ttl.textContent  = song.name.toUpperCase();
      if (lnk) { lnk.href = song.url; lnk.textContent = '↗'; }
    } else {
      if (ph) { ph.style.display = ''; ph.textContent = 'Invalid URL ✕'; }
      if (pl) pl.style.display = 'none';
    }
  }
}

function vClearEmbed() {
  const ytFr   = document.getElementById('vYtFr');
  const scFr   = document.getElementById('vScFr');
  const scWrap = document.getElementById('vScEmbedWrap');
  const ph     = document.getElementById('vAudioPh');
  const pl     = document.getElementById('vAudioPlaying');
  if (ytFr)   ytFr.src = '';
  if (scFr)   scFr.src = '';
  if (scWrap) scWrap.style.display = 'none';
  if (ph) { ph.style.display = ''; ph.textContent = '♪ select a track to play'; }
  if (pl) pl.style.display = 'none';
}

function vStartWave() {
  const vc=document.getElementById('vWc'); if(!vc) return;
  if(vAfId) cancelAnimationFrame(vAfId);
  const ctx=vc.getContext('2d');
  const vb=Array.from({length:36},()=>({h:0.04,t:Math.random()*0.3+0.04}));
  function dv(){
    const W=vc.width,H=vc.height; ctx.clearRect(0,0,W,H);
    const bw=Math.floor(W/vb.length)-1;
    vb.forEach((b,i)=>{
      if(vPlaying){b.t+=(Math.random()-0.5)*0.22;b.t=Math.max(0.03,Math.min(0.93,b.t));b.h+=(b.t-b.h)*0.18;if(Math.random()<0.05)b.t=Math.random()*0.9+0.04;}
      else{b.h+=(0.04-b.h)*0.1;}
      const bh=Math.round(b.h*H*0.86),x=i*(bw+1),y=Math.floor((H-bh)/2),a=0.4+b.h*0.6;
      ctx.fillStyle=i%3===0?`rgba(255,153,0,${a})`:i%3===1?`rgba(255,200,0,${a*0.7})`:`rgba(255,120,0,${a*0.5})`;
      ctx.fillRect(x,y,bw,bh);
    });
    vAfId=requestAnimationFrame(dv);
  }
  dv();
}

/* ═══════════════════════════════════════════════════════════
   COLOUR WHEEL (Record tab only)
   ═══════════════════════════════════════════════════════════ */

function drawWheel(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = canvas.width / 2, cy = canvas.height / 2, r = cx - 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let angle = 0; angle < 360; angle++) {
    const start = (angle - 1) * Math.PI / 180;
    const end   = angle       * Math.PI / 180;
    const grad  = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0,   'white');
    grad.addColorStop(0.5, `hsl(${angle},100%,50%)`);
    grad.addColorStop(1,   'black');
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }
  // Draw indicator dot for current rec colour
  const rgb = hexToRgb(recLabelBg);
  if (rgb) {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const ang = hsl.h * Math.PI / 180;
    const sat = hsl.s;
    const dist = sat * Math.min(hsl.l, 1 - hsl.l) * 2 * r * 0.9;
    const dx = cx + Math.cos(ang) * Math.min(dist, r - 6);
    const dy = cy + Math.sin(ang) * Math.min(dist, r - 6);
    ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke();
  }
}

function recWheelClick(e) {
  const canvas = document.getElementById('recColourWheel');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scX = canvas.width  / rect.width;
  const scY = canvas.height / rect.height;
  const x   = Math.round((e.clientX - rect.left) * scX);
  const y   = Math.round((e.clientY - rect.top)  * scY);
  const ctx = canvas.getContext('2d');
  const px  = ctx.getImageData(x, y, 1, 1).data;
  if (px[3] < 10) return;
  const hex = rgbToHex(px[0], px[1], px[2]);
  const fg  = (0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2]) / 255 > 0.55 ? '#1a1a2a' : '#ffffff';
  setRecCC(hex, fg);
}

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1],16), g: parseInt(r[2],16), b: parseInt(r[3],16) } : null;
}
function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
}
function rgbToHsl(r, g, b) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h, s, l=(max+min)/2;
  if (max===min) { h=s=0; }
  else {
    const d=max-min;
    s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){
      case r: h=((g-b)/d+(g<b?6:0))/6; break;
      case g: h=((b-r)/d+2)/6; break;
      case b: h=((r-g)/d+4)/6; break;
    }
    h*=360;
  }
  return {h,s,l};
}

/* ── Boot ── */
window.addEventListener('DOMContentLoaded', () => {
  drawWheel('recColourWheel');
  loadFromHash();
});

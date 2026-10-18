// Needs More Cowbell: screens, input, hints, squirrels, rewards, closet and scoreboard.
(function () {
  'use strict';

  const P = window.Puzzle;
  const A = window.Art;
  const S = window.Scores;
  const $ = sel => document.querySelector(sel);

  const DOG = 'Cowbell';
  const SAVE_KEY = 'needsmorecowbell.save.v1';
  const HINT_COST = 10;
  const BRIBE_COST = 3;
  const DAILY_SIZE = 8;
  const DOUBLE_TAP_MS = 350;
  const SQUIRREL_CHANCE = 0.3;     // odds that a hint summons the squirrel instead
  const SQUIRREL_FROM_STAGE = 4;   // early stages are squirrel-free
  const COWBELL_ADVICE_SIZE = 8;   // warn before ringing on boards smaller than this

  const REGIONS = [
    { color: '#ffd6a5', name: 'peach' },
    { color: '#c5f2b8', name: 'mint' },
    { color: '#a8e8f5', name: 'sky' },
    { color: '#cdc4ff', name: 'lavender' },
    { color: '#ffc8ec', name: 'pink' },
    { color: '#fbf5a6', name: 'lemon' },
    { color: '#a9c8ff', name: 'blue' },
    { color: '#ffb3ae', name: 'coral' },
    { color: '#e6cfae', name: 'kibble' },
    { color: '#b5e3d3', name: 'seafoam' },
  ];

  const SHOP = [
    { id: 'cowbell', slot: 'neck', name: 'Signature Cowbell', cost: { bones: 10 } },
    { id: 'bandana', slot: 'neck', name: 'Red Bandana', cost: { bones: 40 } },
    { id: 'collar', slot: 'neck', name: 'Good Pup Collar', cost: { bones: 60 } },
    { id: 'bowtie', slot: 'neck', name: 'Dapper Bow Tie', cost: { bacon: 6 } },
    { id: 'shades', slot: 'face', name: 'Cool Shades', cost: { cheese: 6 } },
    { id: 'hearts', slot: 'face', name: 'Heart Glasses', cost: { bones: 50, cheese: 4 } },
    { id: 'partyhat', slot: 'head', name: 'Party Hat', cost: { bones: 80, bacon: 3 } },
    { id: 'flowers', slot: 'head', name: 'Flower Crown', cost: { bacon: 4, cheese: 8 } },
    { id: 'chef', slot: 'head', name: 'Bacon Chef Hat', cost: { bacon: 15 } },
    { id: 'crown', slot: 'head', name: 'Top Dog Crown', cost: { bones: 200, bacon: 10, cheese: 10 } },
  ];

  const CHEERS = ['Woof!', 'Good spot!', '*tail wags*', 'Arf arf!', 'Sniffed it out!', 'Pawsome!', 'Zoomies time!'];
  const OOPS = ['Ruh-roh! No pup fits there.', 'Sniff sniff... nope!', 'Oops, wrong yard!', 'Hmm, that spot smells wrong.'];
  const HOME_LINES = [
    'Wanna play?', 'I smell bacon...', 'Is that cheese?!', 'Pit, husky AND leopard dog!', 'Gotta have more cowbell!',
    'Let’s win some treats!', 'One pup per yard, please!', '*happy awoo*', 'Did someone say squirrel?',
  ];

  // ---------- Save data ----------
  function defaultSave() {
    return {
      v: 1, stage: 1, bones: 20, bacon: 0, cheese: 0, cowbells: 1, freeHints: 3,
      owned: ['cowbell'], equip: { neck: 'cowbell' }, settings: { sound: true }, tool: 'mark',
      daily: {}, seenHelp: false, best: {}, stats: { solved: 0, flawless: 0, squirrels: 0 }, current: null,
      player: null, scores: {}, pendingScores: [],
    };
  }
  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        const d = defaultSave();
        return Object.assign(d, s, { settings: Object.assign(d.settings, s.settings), stats: Object.assign(d.stats, s.stats) });
      }
    } catch (e) { /* storage unavailable */ }
    return defaultSave();
  }
  let save = loadSave();
  if (!save.player) save.player = S.newPlayer();
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* storage unavailable */ }
  }

  // ---------- Helpers ----------
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];
  function sizeForStage(s) {
    if (s <= 3) return 5;
    if (s <= 10) return 6;
    if (s <= 20) return 7;
    if (s <= 35) return 8;
    if (s <= 55) return 9;
    return 10;
  }
  const parFor = n => n * n * 4;
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const fmtNum = n => Number(n).toLocaleString();
  function boardLabel(key) {
    if (key.startsWith('stage-')) return `Stage ${key.slice(6)}`;
    if (key.startsWith('daily-')) {
      const d = new Date(key.slice(6) + 'T12:00:00');
      return `Daily Walk, ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    }
    return key;
  }
  function costHTML(cost) {
    return Object.keys(cost).map(k => {
      const short = (save[k] || 0) < cost[k];
      return `<span class="${short ? 'short' : ''}">${A.icon(k)}${cost[k]}</span>`;
    }).join('');
  }
  const canAfford = cost => Object.keys(cost).every(k => (save[k] || 0) >= cost[k]);

  // ---------- Sound ----------
  const sfx = (() => {
    let ctx = null;
    function ac() {
      if (!save.settings.sound) return null;
      try {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === 'suspended') ctx.resume();
      } catch (e) { return null; }
      return ctx;
    }
    function tone(freq, dur, type, vol, when, slideTo, filter) {
      const c = ac();
      if (!c) return;
      const t = c.currentTime + (when || 0);
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.1, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      let node = o;
      if (filter) {
        const f = c.createBiquadFilter();
        f.type = filter.type; f.frequency.value = filter.hz; f.Q.value = filter.q || 6;
        o.connect(f); node = f;
      }
      node.connect(g).connect(c.destination);
      o.start(t); o.stop(t + dur + 0.03);
    }
    // The classic drum-machine cowbell: two detuned square waves through a band-pass.
    function clank(when) {
      const bp = { type: 'bandpass', hz: 2640, q: 1.2 };
      tone(540, 0.4, 'square', 0.09, when, null, bp);
      tone(800, 0.4, 'square', 0.09, when, null, bp);
    }
    return {
      tick: () => tone(700, 0.05, 'triangle', 0.05),
      untick: () => tone(480, 0.05, 'triangle', 0.04),
      woof: () => { tone(330, 0.13, 'sawtooth', 0.16, 0, 150, { type: 'lowpass', hz: 900 }); tone(500, 0.08, 'square', 0.03, 0, 260); },
      wrong: () => { tone(220, 0.18, 'square', 0.07, 0, 110); tone(160, 0.25, 'square', 0.06, 0.15, 80); },
      hint: () => { tone(880, 0.1, 'sine', 0.09); tone(1320, 0.14, 'sine', 0.07, 0.08); },
      cowbell: () => { clank(0); clank(0.22); clank(0.34); },
      squirrel: () => [0, 0.09, 0.18, 0.4, 0.49].forEach(t => tone(1700, 0.07, 'sine', 0.08, t, 2700)),
      coin: () => tone(1046, 0.09, 'triangle', 0.08),
      win: () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, 0.2, 'triangle', 0.11, k * 0.1)),
      lose: () => [392, 330, 262].forEach((f, k) => tone(f, 0.28, 'triangle', 0.1, k * 0.18)),
    };
  })();

  // ---------- UI basics ----------
  function show(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + screen));
    if (screen === 'home') renderHome();
  }

  function renderWallet(bump) {
    const html = ['bones', 'bacon', 'cheese'].map(k =>
      `<span class="pill${bump && bump.includes(k) ? ' bump' : ''}" title="${k}">${A.icon(k)}<b>${save[k]}</b></span>`).join('');
    document.querySelectorAll('[data-wallet]').forEach(w => { w.innerHTML = html; });
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  let modalOpenedAt = 0;
  function openModal(html, onMount) {
    modalOpenedAt = performance.now();
    $('#modal-body').innerHTML = html;
    $('#modal').classList.remove('hidden');
    if (onMount) onMount($('#modal-body'));
  }
  function closeModal() {
    $('#modal').classList.add('hidden');
    $('#modal-body').innerHTML = '';
  }

  function rainTreats(count) {
    const box = $('#confetti');
    const kinds = ['bones', 'bones', 'bacon', 'cheese'];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'treat-fall';
      el.innerHTML = A.icon(rand(kinds));
      el.style.left = (Math.random() * 100) + 'vw';
      el.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
      el.style.animationDelay = (Math.random() * 0.8) + 's';
      el.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      box.appendChild(el);
      setTimeout(() => el.remove(), 4500);
    }
  }

  // ---------- Home ----------
  function renderHome() {
    renderWallet();
    $('#home-mascot').innerHTML = A.dog({ acc: save.equip, blinkDelay: 1 });
    const n = sizeForStage(save.stage);
    const resuming = save.current && save.current.kind === 'stage' && save.current.stage === save.stage;
    $('#play-title').textContent = `${resuming ? 'Continue' : 'Play'} Stage ${save.stage}`;
    $('#play-sub').textContent = `${n}×${n} backyard`;
    $('#daily-sub').textContent = save.daily[todayKey()] ? 'Done today ✓ · play again for fun'
      : `${DAILY_SIZE}×${DAILY_SIZE} · double treats + bonus cheese`;
  }

  function petMascot() {
    const m = $('#home-mascot');
    m.classList.remove('wiggle');
    void m.offsetWidth;
    m.classList.add('wiggle');
    $('#home-bubble').textContent = rand(HOME_LINES.filter(l => l !== $('#home-bubble').textContent));
    sfx.woof();
  }

  // ---------- Game state ----------
  let G = null;
  let cellEls = [];
  let timerId = 0;

  function startGame(kind, opts, resume) {
    const n = kind === 'daily' ? DAILY_SIZE : sizeForStage(opts.stage);
    G = {
      kind, stage: opts.stage || null, date: opts.date || null, n,
      board: kind === 'daily' ? 'daily-' + opts.date : 'stage-' + opts.stage,
      regions: null, solution: null,
      cells: new Array(n * n).fill(0), hearts: 3, mistakes: 0, hints: 0, cowbells: 0, squirrels: 0, elapsed: 0,
      over: false, busy: false, history: [],
    };
    const resumable = resume && resume.cells && resume.cells.length === n * n && resume.regions && resume.solution;
    if (resumable) {
      Object.assign(G, {
        regions: resume.regions, solution: resume.solution, cells: resume.cells.slice(), hearts: resume.hearts,
        mistakes: resume.mistakes, hints: resume.hints, cowbells: resume.cowbells || 0,
        squirrels: resume.squirrels || 0, elapsed: resume.elapsed,
      });
    } else {
      const pz = P.generate(n, P.hashString('needsmorecowbell-' + G.board));
      G.regions = pz.regions;
      G.solution = pz.solution;
    }
    show('game');
    $('#game-name').textContent = kind === 'daily' ? 'Daily Walk' : `Stage ${G.stage}`;
    $('#par').innerHTML = `${A.cheese()} ${fmtTime(parFor(n))}`;
    $('#coach-dog').innerHTML = A.dog({ acc: save.equip });
    $('#board').classList.remove('won');
    buildBoard();
    renderHearts();
    renderTools();
    updateTimer();
    coach(resumable ? 'Welcome back! Let’s keep sniffing.'
      : kind === 'daily' ? 'Daily walk! Find one spot in every yard.'
        : G.stage === 1 ? 'Help me find one spot in every yard!' : rand(['Ready when you are!', 'New backyard, new treats!', 'Let’s go, let’s go!']), 0);
    startTimer();
    saveGame();
    if (!save.seenHelp) { save.seenHelp = true; persist(); openHelp(); }
  }

  function saveGame() {
    if (!G) return;
    save.current = G.over ? null : {
      kind: G.kind, stage: G.stage, date: G.date, regions: G.regions, solution: G.solution,
      cells: G.cells, hearts: G.hearts, mistakes: G.mistakes, hints: G.hints, cowbells: G.cowbells,
      squirrels: G.squirrels, elapsed: G.elapsed,
    };
    persist();
  }

  function startTimer() {
    clearInterval(timerId);
    timerId = setInterval(() => {
      if (!G || G.over || document.hidden || !$('#screen-game').classList.contains('active') || !$('#modal').classList.contains('hidden')) return;
      G.elapsed++;
      updateTimer();
      if (G.elapsed % 5 === 0) saveGame();
    }, 1000);
  }
  function updateTimer() {
    $('#timer').textContent = fmtTime(G.elapsed);
    $('#par').classList.toggle('missed', G.elapsed > parFor(G.n));
  }

  function coach(text, wiggle) {
    const b = $('#coach-text');
    b.textContent = text;
    b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
    if (wiggle !== 0) {
      const d = $('#coach-dog');
      d.classList.remove('wiggle'); void d.offsetWidth; d.classList.add('wiggle');
    }
  }

  // ---------- Board ----------
  const rowOf = i => Math.floor(i / G.n);
  const colOf = i => i % G.n;
  function sees(a, b) {
    if (a === b) return false;
    const ra = rowOf(a), ca = colOf(a), rb = rowOf(b), cb = colOf(b);
    return ra === rb || ca === cb || G.regions[a] === G.regions[b] || (Math.abs(ra - rb) <= 1 && Math.abs(ca - cb) <= 1);
  }
  const isSolution = i => G.solution[rowOf(i)] === colOf(i);

  function buildBoard() {
    const n = G.n;
    const board = $('#board');
    board.style.setProperty('--n', n);
    board.innerHTML = '';
    cellEls = [];
    const thick = '1.5px';
    for (let i = 0; i < n * n; i++) {
      const r = rowOf(i), c = colOf(i), k = G.regions[i];
      const el = document.createElement('div');
      el.className = 'cell';
      el.setAttribute('role', 'gridcell');
      el.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}, ${REGIONS[k].name} yard`);
      el.style.setProperty('--c', REGIONS[k].color);
      if (r > 0 && G.regions[i - n] !== k) el.style.setProperty('--t', thick);
      if (r < n - 1 && G.regions[i + n] !== k) el.style.setProperty('--b', thick);
      if (c > 0 && G.regions[i - 1] !== k) el.style.setProperty('--l', thick);
      if (c < n - 1 && G.regions[i + 1] !== k) el.style.setProperty('--r', thick);
      el.innerHTML = '<svg class="x" viewBox="0 0 10 10"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
      board.appendChild(el);
      cellEls.push(el);
      renderCell(i, false);
    }
  }

  function renderCell(i, animate) {
    const el = cellEls[i];
    const v = G.cells[i];
    el.classList.toggle('marked', v === 1);
    el.classList.toggle('dog', v === 2);
    const pup = el.querySelector('.pup:not(.wrong)');
    if (v === 2 && !pup) {
      const p = document.createElement('div');
      p.className = 'pup';
      if (!animate) p.style.animation = 'none';
      p.innerHTML = A.dog({ acc: save.equip });
      el.appendChild(p);
    } else if (v !== 2 && pup) {
      pup.remove();
    }
  }

  function renderHearts(breakIdx) {
    let html = '';
    for (let k = 0; k < 3; k++) html += A.heart();
    const box = $('#hearts');
    box.innerHTML = html;
    box.querySelectorAll('.heart').forEach((h, k) => {
      if (k >= G.hearts) h.classList.add('lost');
      if (k === breakIdx) h.classList.add('breaking');
    });
    box.setAttribute('aria-label', `${G.hearts} hearts left`);
  }

  function renderTools() {
    const pupMode = save.tool === 'pup';
    $('#mode-icon').innerHTML = pupMode ? A.dog({ acc: save.equip, blinkDelay: 0 }) :
      '<svg class="icon" viewBox="0 0 10 10"><path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    $('#mode-label').textContent = pupMode ? 'Tap: Pup' : 'Tap: ✕';
    $('#btn-mode').classList.toggle('on', pupMode);
    $('#controls-tip').textContent = pupMode
      ? `Tap to place ${DOG} · Switch back to ✕ to mark`
      : `Tap to mark ✕ · Double-tap to place ${DOG} · Drag to mark lots`;
    $('#hint-icon').innerHTML = save.freeHints > 0 ? A.paw() : A.bone();
    $('#hint-label').textContent = save.freeHints > 0 ? `Hint ·${save.freeHints} free` : `Hint ·${HINT_COST}`;
    $('#cowbell-icon').innerHTML = A.cowbell();
    $('#cowbell-label').textContent = `Cowbell ×${save.cowbells}`;
    $('#btn-cowbell').classList.toggle('empty', save.cowbells <= 0);
  }

  // ---------- Input ----------
  let ptr = null;
  let lastTap = null;

  function cellAt(x, y) {
    const rect = $('#board').getBoundingClientRect();
    const inner = rect.width - 6; // 3px border each side
    const c = Math.floor((x - rect.left - 3) / inner * G.n);
    const r = Math.floor((y - rect.top - 3) / inner * G.n);
    if (r < 0 || c < 0 || r >= G.n || c >= G.n) return -1;
    return r * G.n + c;
  }

  function onPointerDown(e) {
    if (!G || G.over || G.busy || e.button > 0) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i < 0) return;
    e.preventDefault();
    try { $('#board').setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const now = performance.now();

    if (save.tool === 'pup') { ptr = { id: e.pointerId, start: i, pup: true }; return; }

    if (lastTap && lastTap.i === i && now - lastTap.time < DOUBLE_TAP_MS) {
      // Double tap: undo the first tap's mark toggle, then place a pup.
      if (lastTap.changed) {
        G.cells[i] = lastTap.prev;
        const top = G.history[G.history.length - 1];
        if (top && top.length === 1 && top[0].i === i) G.history.pop();
        renderCell(i, false);
      }
      lastTap = null;
      ptr = null;
      placeDog(i, false);
      return;
    }

    const v = G.cells[i];
    lastTap = { i, time: now, prev: v, changed: v !== 2 };
    if (v === 2) { ptr = null; return; }
    ptr = { id: e.pointerId, mode: v === 0 ? 'mark' : 'clear', last: i, changes: [] };
    dragApply(i);
  }

  function onPointerMove(e) {
    if (!ptr || ptr.pup || ptr.id !== e.pointerId) return;
    const i = cellAt(e.clientX, e.clientY);
    if (i < 0 || i === ptr.last) return;
    // Fill in any cells skipped by a fast swipe.
    const r0 = rowOf(ptr.last), c0 = colOf(ptr.last), r1 = rowOf(i), c1 = colOf(i);
    const steps = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0));
    for (let s = 1; s <= steps; s++) {
      dragApply(Math.round(r0 + (r1 - r0) * s / steps) * G.n + Math.round(c0 + (c1 - c0) * s / steps));
    }
    ptr.last = i;
    lastTap = null;
  }

  function onPointerUp(e) {
    if (!ptr || ptr.id !== e.pointerId) return;
    if (ptr.pup) {
      const i = cellAt(e.clientX, e.clientY);
      if (i === ptr.start) placeDog(i, false);
    } else if (ptr.changes.length) {
      G.history.push(ptr.changes);
      saveGame();
    }
    ptr = null;
  }

  function dragApply(i) {
    const v = G.cells[i];
    if (ptr.mode === 'mark' && v === 0) {
      G.cells[i] = 1; ptr.changes.push({ i, prev: 0 }); renderCell(i); sfx.tick();
    } else if (ptr.mode === 'clear' && v === 1) {
      G.cells[i] = 0; ptr.changes.push({ i, prev: 1 }); renderCell(i); sfx.untick();
    }
  }

  function undo() {
    if (!G || G.over || G.busy) return;
    const step = G.history.pop();
    if (!step) { toast('Nothing to undo'); return; }
    for (const ch of step) {
      if (G.cells[ch.i] === 2) continue;
      G.cells[ch.i] = ch.prev;
      renderCell(ch.i);
    }
    sfx.untick();
    saveGame();
  }

  function clearMarks() {
    if (!G || G.over || G.busy) return;
    const changes = [];
    G.cells.forEach((v, i) => { if (v === 1) { changes.push({ i, prev: 1 }); G.cells[i] = 0; renderCell(i); } });
    if (!changes.length) { toast('No marks to clear'); return; }
    G.history.push(changes);
    sfx.untick();
    saveGame();
  }

  // ---------- Placing pups ----------
  function dogCount() { return G.cells.filter(v => v === 2).length; }

  function placeDog(i, quiet) {
    if (G.over || G.cells[i] === 2) return;
    if (isSolution(i)) {
      G.cells[i] = 2;
      renderCell(i, true);
      sfx.woof();
      if (!quiet) coach(rand(CHEERS));
      if (dogCount() === G.n) { win(); return; }
    } else {
      G.hearts--;
      G.mistakes++;
      G.cells[i] = 1;
      renderCell(i);
      const el = cellEls[i];
      const ghost = document.createElement('div');
      ghost.className = 'pup wrong';
      ghost.innerHTML = A.dog({ acc: save.equip });
      el.appendChild(ghost);
      el.classList.remove('oops'); void el.offsetWidth; el.classList.add('oops');
      setTimeout(() => { ghost.remove(); el.classList.remove('oops'); }, 1000);
      sfx.wrong();
      renderHearts(G.hearts);
      if (navigator.vibrate) { try { navigator.vibrate(120); } catch (err) { /* ignore */ } }
      if (G.hearts <= 0) { G.over = true; setTimeout(lose, 800); }
      else coach(`${rand(OOPS)} ${G.hearts === 1 ? 'Last heart, careful!' : ''}`);
    }
    saveGame();
  }

  // ---------- Hints ----------
  function groupsOf() {
    const n = G.n, groups = [];
    for (let r = 0; r < n; r++) groups.push({ label: `row ${r + 1}`, cells: Array.from({ length: n }, (_, c) => r * n + c) });
    for (let c = 0; c < n; c++) groups.push({ label: `column ${c + 1}`, cells: Array.from({ length: n }, (_, r) => r * n + c) });
    for (let k = 0; k < n; k++) {
      const cells = [];
      for (let i = 0; i < n * n; i++) if (G.regions[i] === k) cells.push(i);
      groups.push({ label: `the ${REGIONS[k].name} yard`, cells, region: k });
    }
    return groups;
  }

  // Hints reveal squares that can't hold a pup (they never place one for you).
  function findHint() {
    const N = G.n * G.n;
    const all = Array.from({ length: N }, (_, i) => i);
    const cand = i => G.cells[i] === 0;

    const badMark = all.find(i => G.cells[i] === 1 && isSolution(i));
    if (badMark !== undefined) {
      return { kind: 'unmark', cells: [badMark], area: [], text: `Sniff sniff... this ✕ is covering a real pup spot! I cleared it for you.` };
    }

    const dogs = all.filter(i => G.cells[i] === 2);
    for (const d of dogs) {
      const list = all.filter(j => cand(j) && sees(d, j));
      if (list.length) {
        return { kind: 'mark', cells: list, area: [d], text: `Pups need space! Nothing goes in the same row, column or yard as a pup, or right next to one.` };
      }
    }

    const groups = groupsOf().filter(g => !g.cells.some(i => G.cells[i] === 2));

    // A yard squeezed into one row/column claims that whole line (and vice versa).
    for (const g of groups) {
      const cs = g.cells.filter(cand);
      if (!cs.length) continue;
      if (g.region !== undefined) {
        for (const axis of ['row', 'column']) {
          const key = axis === 'row' ? rowOf : colOf;
          const lines = new Set(cs.map(key));
          if (lines.size !== 1) continue;
          const line = [...lines][0];
          const targets = all.filter(i => cand(i) && key(i) === line && G.regions[i] !== g.region);
          if (targets.length) {
            return { kind: 'mark', cells: targets, area: cs, text: `The ${REGIONS[g.region].name} yard's pup has to be in ${axis} ${line + 1}, so the rest of that ${axis} stays empty.` };
          }
        }
      } else {
        const regs = new Set(cs.map(i => G.regions[i]));
        if (regs.size === 1) {
          const k = [...regs][0];
          const targets = all.filter(i => cand(i) && G.regions[i] === k && !g.cells.includes(i));
          if (targets.length) {
            return { kind: 'mark', cells: targets, area: cs, text: `${g.label[0].toUpperCase() + g.label.slice(1)} can only use the ${REGIONS[k].name} yard, so the rest of that yard stays empty.` };
          }
        }
      }
    }

    // A spot that would leave some other line or yard with nowhere to go.
    for (const x of all) {
      if (!cand(x)) continue;
      for (const g of groups) {
        if (g.cells.includes(x)) continue;
        const cs = g.cells.filter(cand);
        if (cs.length && cs.every(i => sees(x, i))) {
          return { kind: 'mark', cells: [x], area: cs, text: `If a pup sat here, ${g.label} would have no room left. So, ✕!` };
        }
      }
    }

    for (const g of groups) {
      const cs = g.cells.filter(cand);
      if (cs.length === 1) {
        return { kind: 'nudge', cells: [], area: g.cells, text: `Psst... ${g.label} only has one open spot left.` };
      }
    }

    // Nothing simple left: sniff out a batch of empty squares in the busiest line or yard.
    let best = null;
    for (const g of groups) {
      const free = g.cells.filter(i => cand(i) && !isSolution(i));
      if (!best || free.length > best.free.length) best = { g, free };
    }
    if (best && best.free.length) {
      const take = best.free.sort(() => Math.random() - 0.5).slice(0, Math.max(1, Math.ceil(best.free.length * 0.6)));
      return { kind: 'mark', cells: take, area: best.g.cells, text: `I sniffed around ${best.g.label}. No pups hiding in these spots!` };
    }
    return { kind: 'nudge', cells: [], area: all.filter(cand), text: `Every open spot left is a pup spot. You've got this!` };
  }

  function showHint(h) {
    document.querySelectorAll('.cell.hint, .cell.hint-area').forEach(el => el.classList.remove('hint', 'hint-area'));
    h.area.forEach(i => cellEls[i].classList.add('hint-area'));
    h.cells.forEach(i => cellEls[i].classList.add('hint'));
    setTimeout(() => cellEls.forEach(el => el.classList.remove('hint', 'hint-area')), 2800);
  }

  function useHint() {
    if (!G || G.over || G.busy) return;
    if (save.freeHints > 0) save.freeHints--;
    else if (save.bones >= HINT_COST) { save.bones -= HINT_COST; renderWallet(['bones']); }
    else { toast(`Hints cost ${HINT_COST} treats. Solve puzzles to earn more!`); return; }
    G.hints++;
    renderTools();

    const squirrelAllowed = (G.kind === 'daily' || G.stage >= SQUIRREL_FROM_STAGE) && G.n - dogCount() >= 2;
    if (squirrelAllowed && Math.random() < SQUIRREL_CHANCE) { squirrelAttack(); return; }

    const h = findHint();
    showHint(h);
    sfx.hint();
    coach(h.text);
    if (h.kind === 'unmark') { G.cells[h.cells[0]] = 0; renderCell(h.cells[0]); }
    else if (h.kind === 'mark') { h.cells.forEach(i => { G.cells[i] = 1; renderCell(i); }); }
    saveGame();
  }

  // The squirrel tears through the fences: the yards are redrawn, placed pups stay put, marks are wiped.
  function squirrelAttack() {
    G.busy = true;
    G.squirrels++;
    save.stats.squirrels++;
    const fixed = {};
    G.cells.forEach((v, i) => { if (v === 2) fixed[rowOf(i)] = colOf(i); });
    const pz = P.generate(G.n, (Math.random() * 4294967296) >>> 0, fixed);
    sfx.squirrel();
    coach('SQUIRREL!!!');
    const runner = document.createElement('div');
    runner.className = 'squirrel-run';
    runner.innerHTML = A.squirrel();
    $('.board-wrap').appendChild(runner);
    $('#board').classList.add('dig');
    setTimeout(() => {
      G.regions = pz.regions;
      G.solution = pz.solution;
      G.cells = G.cells.map(v => (v === 2 ? 2 : 0));
      G.history = [];
      buildBoard();
      sfx.woof();
      coach(`Oops! I chased that squirrel right through the fences. The yards moved, but your pups stayed put. Time to rework it!`);
      saveGame();
    }, 950);
    setTimeout(() => {
      runner.remove();
      $('#board').classList.remove('dig');
      G.busy = false;
    }, 1900);
  }

  // ---------- More Cowbell (reveal a pup) ----------
  function useCowbell() {
    if (!G || G.over || G.busy) return;
    if (save.cowbells <= 0) {
      toast('No cowbells yet! Earn one every 10 stages, or with a perfect solve on an 8×8 or bigger.');
      return;
    }
    if (G.n >= COWBELL_ADVICE_SIZE) { ringCowbell(); return; }
    openModal(`
      <div class="modal-icon">${A.cowbell()}</div>
      <h2>Ring the cowbell?</h2>
      <p class="sub">Cowbells are rare! They're best saved for big, tough boards. You have ${save.cowbells}.</p>
      <div class="actions">
        <button class="btn" data-act="save">Save it for later</button>
        <button class="btn primary" data-act="ring">Ring it anyway</button>
      </div>`, body => {
      body.querySelector('[data-act="save"]').onclick = closeModal;
      body.querySelector('[data-act="ring"]').onclick = () => { closeModal(); ringCowbell(); };
    });
  }

  function ringCowbell() {
    // Reveal the pup in the biggest yard that still needs one.
    let spot = -1, bestSize = -1;
    for (let r = 0; r < G.n; r++) {
      const i = r * G.n + G.solution[r];
      if (G.cells[i] === 2) continue;
      const size = G.regions.filter(k => k === G.regions[i]).length;
      if (size > bestSize) { bestSize = size; spot = i; }
    }
    if (spot < 0) return;
    save.cowbells--;
    G.cowbells++;
    renderTools();
    sfx.cowbell();
    coach('MORE COWBELL! I came running to the right spot.');
    const btn = $('#btn-cowbell');
    btn.classList.remove('ring'); void btn.offsetWidth; btn.classList.add('ring');
    showHint({ cells: [spot], area: [] });
    setTimeout(() => placeDog(spot, true), 450);
    persist();
  }

  // ---------- Win / lose ----------
  function win() {
    G.over = true;
    clearInterval(timerId);
    $('#board').classList.add('won');
    const n = G.n;
    const flawless = G.mistakes === 0;
    const fast = G.elapsed <= parFor(n);
    const daily = G.kind === 'daily';
    const firstDaily = daily && !save.daily[G.date];
    const rewarded = !daily || firstDaily;

    let bones = 5 * n - 10;
    let bacon = flawless ? n - 3 : 0;
    let cheese = fast ? 2 : 0;
    if (daily) { bones *= 2; cheese += 3; }
    let cowbells = 0;
    if (!daily && G.stage % 10 === 0) cowbells++;
    if (n >= 8 && flawless && fast && !G.hints && !G.cowbells) cowbells++;
    if (!rewarded) bones = bacon = cheese = cowbells = 0;

    save.bones += bones; save.bacon += bacon; save.cheese += cheese; save.cowbells += cowbells;
    save.stats.solved++;
    if (flawless) save.stats.flawless++;
    const bestKey = String(n);
    const newBest = !save.best[bestKey] || G.elapsed < save.best[bestKey];
    if (newBest) save.best[bestKey] = G.elapsed;
    if (daily) save.daily[G.date] = true;
    else if (G.stage === save.stage) save.stage++;
    save.current = null;

    const pts = S.points({ n, time: G.elapsed, par: parFor(n), mistakes: G.mistakes, hints: G.hints, cowbells: G.cowbells });
    const prev = save.scores[G.board];
    const newHigh = !prev || pts > prev.points;
    if (newHigh) {
      save.scores[G.board] = { points: pts, time: G.elapsed, mistakes: G.mistakes, hints: G.hints, size: n };
      if (S.online) {
        save.pendingScores = save.pendingScores.filter(s => s.board !== G.board);
        save.pendingScores.push({ board: G.board, size: n, points: pts, time: G.elapsed, mistakes: G.mistakes, hints: G.hints + G.cowbells });
      }
    }
    persist();

    sfx.win();
    coach(rand(['We did it! Treat time!', 'Best. Day. Ever!', 'Every yard has a pup!']));
    setTimeout(() => {
      rainTreats(rewarded ? 34 : 14);
      const reward = (k, amt, label) =>
        `<div class="reward${amt ? '' : ' none'}">${A.icon(k)}<b>+${amt}</b><small>${label}</small></div>`;
      openModal(`
        <div class="modal-dog dance">${A.dog({ acc: save.equip })}</div>
        <h2>Good pup!</h2>
        <p class="sub">${daily ? 'Daily walk complete!' : `Stage ${G.stage} solved!`}${rewarded ? '' : ' (Treats already claimed today.)'}</p>
        <div class="score-big">${fmtNum(pts)} <small>points${newHigh && prev ? ' · new high score!' : ''}</small></div>
        <div class="rewards">
          ${reward('bones', bones, daily ? 'Treats ×2' : 'Treats')}
          ${reward('bacon', bacon, flawless ? 'No mistakes!' : 'Solve with no mistakes')}
          ${reward('cheese', cheese, fast ? (daily ? 'Fast + daily bonus' : 'Beat par time!') : (daily ? 'Daily bonus' : `Beat ${fmtTime(parFor(n))}`))}
        </div>
        ${cowbells ? `<div class="cowbell-earned">${A.cowbell()} <b>+${cowbells} Cowbell!</b> Save it for a big board.</div>` : ''}
        <p class="stats-line">Time ${fmtTime(G.elapsed)}${newBest ? ' · fastest yet!' : ''}${G.hints ? ` · ${G.hints} hint${G.hints > 1 ? 's' : ''}` : ''}${G.squirrels ? ` · ${G.squirrels} squirrel${G.squirrels > 1 ? 's' : ''}` : ''}</p>
        <p class="post-status" id="post-status">${S.online && newHigh ? 'Posting to the scoreboard…' : ''}</p>
        <div class="actions">
          ${daily ? '' : `<button class="btn primary big" data-act="next"><span class="btn-title">Next: Stage ${save.stage}</span></button>`}
          <div class="menu-row two">
            <button class="btn" data-act="scores">Scoreboard</button>
            <button class="btn" data-act="home">Home</button>
          </div>
        </div>`, body => {
        renderWallet(['bones', 'bacon', 'cheese'].filter(k => ({ bones, bacon, cheese })[k]));
        body.querySelector('[data-act="home"]').onclick = () => { closeModal(); show('home'); };
        body.querySelector('[data-act="scores"]').onclick = () => openScoreboard(G.board);
        const next = body.querySelector('[data-act="next"]');
        if (next) next.onclick = () => { closeModal(); startGame('stage', { stage: save.stage }); };
      });
      flushScores();
    }, 900);
  }

  function lose() {
    clearInterval(timerId);
    sfx.lose();
    coach('Squirrel!! ...wait, where was I?');
    saveGame();
    const canBribe = save.bacon >= BRIBE_COST;
    openModal(`
      <div class="modal-dog sad">${A.dog({ acc: save.equip })}</div>
      <h2>Out of hearts!</h2>
      <p class="sub">${DOG} got distracted by a squirrel.</p>
      <div class="actions">
        <button class="btn primary" data-act="bribe" ${canBribe ? '' : 'disabled'}>
          <span class="btn-title">Keep going: +1 heart</span>
          <span class="btn-sub">Bribe with ${A.bacon()} ${BRIBE_COST} bacon${canBribe ? '' : ' (not enough)'}</span>
        </button>
        <button class="btn sky" data-act="retry">Start puzzle over</button>
        <button class="btn" data-act="home">Home</button>
      </div>`, body => {
      body.querySelector('[data-act="bribe"]').onclick = () => {
        save.bacon -= BRIBE_COST;
        G.hearts = 1; G.over = false;
        closeModal(); renderWallet(['bacon']); renderHearts(); startTimer();
        coach('Mmm, bacon! OK, I’m focused now.');
        saveGame();
      };
      body.querySelector('[data-act="retry"]').onclick = () => { closeModal(); startGame(G.kind, { stage: G.stage, date: G.date }); };
      body.querySelector('[data-act="home"]').onclick = () => {
        closeModal();
        save.current = null; persist();
        show('home');
      };
    });
  }

  // ---------- Scoreboard ----------
  let flushing = false;
  async function flushScores() {
    if (!S.online || flushing) return;
    const status = msg => { const el = document.getElementById('post-status'); if (el) el.textContent = msg; };
    flushing = true;
    try {
      if (!save.player.synced) { await S.register(save.player); persist(); }
      while (save.pendingScores.length) {
        await S.submit(save.player, save.pendingScores[0]);
        save.pendingScores.shift();
        persist();
        status('Posted to the scoreboard ✓');
      }
    } catch (e) {
      status('Couldn’t reach the scoreboard. I’ll try again later.');
    } finally {
      flushing = false;
    }
  }

  function renamePlayer(name) {
    name = name.replace(/\s+/g, ' ').trim().slice(0, 24);
    if (!name) { toast('Pick a name with at least one letter'); return false; }
    save.player.name = name;
    save.player.synced = false;
    persist();
    flushScores();
    return true;
  }

  function openScoreboard(initialBoard) {
    const state = { tab: initialBoard ? 'board' : 'overall', board: initialBoard || (G ? G.board : 'stage-' + Math.max(1, save.stage - 1)), editing: false };
    const myBoards = () => {
      const keys = new Set(Object.keys(save.scores));
      keys.add(state.board);
      return [...keys].sort((a, b) => {
        const da = a.startsWith('daily-'), db = b.startsWith('daily-');
        if (da !== db) return da ? 1 : -1;
        return da ? b.localeCompare(a) : parseInt(b.slice(6), 10) - parseInt(a.slice(6), 10);
      });
    };
    const myTotal = () => Object.values(save.scores).reduce((sum, s) => sum + s.points, 0);

    function rowsHTML(rows, cols) {
      if (!rows.length) return '<p class="empty-board">No scores yet. Be the first!</p>';
      return `<ol class="ranks">${rows.map((r, k) => `
        <li class="${r.me ? 'me' : ''}"><span class="rank">${k + 1}</span><span class="who">${esc(r.name)}</span>${cols(r)}</li>`).join('')}</ol>`;
    }

    async function loadList(body) {
      const list = body.querySelector('#rank-list');
      const note = body.querySelector('#rank-note');
      if (!S.online) {
        if (state.tab === 'overall') {
          list.innerHTML = rowsHTML([{ name: save.player.name, me: true, total: myTotal(), count: Object.keys(save.scores).length }],
            r => `<span class="pts">${fmtNum(r.total)}</span><span class="extra">${r.count} boards</span>`);
        } else {
          const s = save.scores[state.board];
          list.innerHTML = rowsHTML(s ? [Object.assign({ name: save.player.name, me: true }, s)] : [],
            r => `<span class="pts">${fmtNum(r.points)}</span><span class="extra">${fmtTime(r.time)}</span>`);
        }
        note.textContent = 'Scores are saved on this device. The online scoreboard isn’t connected yet.';
        return;
      }
      list.innerHTML = '<p class="empty-board">Fetching scores…</p>';
      note.textContent = '';
      try {
        if (state.tab === 'overall') {
          const rows = await S.overallTop();
          list.innerHTML = rowsHTML(rows.map(r => ({ name: r.name, me: r.player_id === save.player.id, total: r.total_points, count: r.boards_solved })),
            r => `<span class="pts">${fmtNum(r.total)}</span><span class="extra">${r.count} boards</span>`);
        } else {
          const rows = await S.boardTop(state.board);
          list.innerHTML = rowsHTML(rows.map(r => ({ name: r.name, me: r.player_id === save.player.id, points: r.points, time: r.time_s })),
            r => `<span class="pts">${fmtNum(r.points)}</span><span class="extra">${fmtTime(r.time)}</span>`);
        }
        if (save.pendingScores.length) note.textContent = 'Some of your scores haven’t posted yet. They’ll go up next time you’re online.';
      } catch (e) {
        list.innerHTML = '<p class="empty-board">Couldn’t reach the scoreboard right now.</p>';
      }
    }

    function render(body) {
      const boards = myBoards();
      body.innerHTML = `
        <h2>Scoreboard</h2>
        <div class="me-row">
          ${state.editing
            ? `<input id="name-input" maxlength="24" value="${esc(save.player.name)}" aria-label="Your name" autocomplete="nickname">
               <button class="btn small primary" data-act="save-name">Save</button>`
            : `<span>Playing as <b>${esc(save.player.name)}</b></span>
               <button class="btn small" data-act="edit-name">Change name</button>`}
        </div>
        <div class="tabs" role="tablist">
          <button role="tab" aria-selected="${state.tab === 'overall'}" data-tab="overall">Overall</button>
          <button role="tab" aria-selected="${state.tab === 'board'}" data-tab="board">By board</button>
        </div>
        ${state.tab === 'board' ? `<select id="board-pick" aria-label="Board">${boards.map(k =>
          `<option value="${esc(k)}" ${k === state.board ? 'selected' : ''}>${esc(boardLabel(k))}</option>`).join('')}</select>` : ''}
        <div id="rank-list"></div>
        <p class="note" id="rank-note"></p>
        <div class="actions"><button class="btn primary" data-act="close">Done</button></div>`;

      body.querySelectorAll('[data-tab]').forEach(b => {
        b.onclick = () => { state.tab = b.dataset.tab; render(body); };
      });
      const pick = body.querySelector('#board-pick');
      if (pick) pick.onchange = () => { state.board = pick.value; loadList(body); };
      const edit = body.querySelector('[data-act="edit-name"]');
      if (edit) edit.onclick = () => { state.editing = true; render(body); const inp = body.querySelector('#name-input'); inp.focus(); inp.select(); };
      const saveName = () => { if (renamePlayer(body.querySelector('#name-input').value)) { state.editing = false; render(body); toast('Name saved!'); } };
      const saveBtn = body.querySelector('[data-act="save-name"]');
      if (saveBtn) {
        saveBtn.onclick = saveName;
        body.querySelector('#name-input').onkeydown = e => { if (e.key === 'Enter') saveName(); };
      }
      body.querySelector('[data-act="close"]').onclick = () => { closeModal(); if ($('#screen-home').classList.contains('active')) renderHome(); };
      loadList(body);
    }
    openModal('', render);
  }

  // ---------- Other modals ----------
  function openHelp() {
    openModal(`
      <div class="modal-dog">${A.dog({ acc: save.equip })}</div>
      <h2>How to play</h2>
      <p class="sub">Help ${DOG} find a spot in every yard!</p>
      <ol class="rules">
        <li><span class="num">1</span><span>Every colored <b>yard</b> needs exactly <b>one pup</b>.</span></li>
        <li><span class="num">2</span><span>Only one pup per <b>row</b> and one per <b>column</b>.</span></li>
        <li><span class="num">3</span><span>Pups need personal space: they <b>can't touch</b>, not even diagonally.</span></li>
        <li><span class="num">4</span><span><b>Tap</b> to mark ✕ where a pup can't go. <b>Double-tap</b> to place ${DOG}. Drag to mark lots of squares. Keeping your board tidy is up to you!</span></li>
        <li><span class="num">5</span><span>A pup in the wrong spot costs a heart. Lose all 3 and you start over (or bribe ${DOG} with bacon).</span></li>
        <li><span class="num">6</span><span><b>Hints are a gamble.</b> Usually ${DOG} sniffs out squares that can't hold a pup. But sometimes a <b>squirrel</b> shows up, ${DOG} gives chase, and the yards get rearranged. Your pups stay put, but you'll have to rework the board!</span></li>
        <li><span class="num">7</span><span>${A.cowbell()} <b>More Cowbell!</b> reveals a pup. They're rare: earn one every 10 stages, or with a perfect solve on an 8×8 or bigger. Save them for big, tough boards.</span></li>
        <li><span class="num">8</span><span>Win ${A.bone()} <b>treats</b> every puzzle, ${A.bacon()} <b>bacon</b> for no mistakes, and ${A.cheese()} <b>cheese</b> for beating par time. Spend them on hints and outfits!</span></li>
      </ol>
      <div class="actions"><button class="btn primary" data-act="ok">Let's go!</button></div>`, body => {
      body.querySelector('[data-act="ok"]').onclick = closeModal;
    });
  }

  function openSettings() {
    const row = (key, title, desc) => `
      <div class="settings-row"><span>${title}<small>${desc}</small></span>
      <button class="switch" role="switch" aria-checked="${!!save.settings[key]}" data-key="${key}" aria-label="${title}"></button></div>`;
    openModal(`
      <h2>Settings</h2>
      ${row('sound', 'Sound', 'Woofs, clanks and squirrel chatter')}
      <div class="settings-row"><span>Stats<small>${save.stats.solved} solved · ${save.stats.flawless} with no mistakes · ${save.stats.squirrels} squirrels chased</small></span></div>
      <div class="actions">
        <button class="btn" data-act="reset">Reset all progress</button>
        <button class="btn primary" data-act="ok">Done</button>
      </div>`, body => {
      body.querySelectorAll('.switch').forEach(sw => {
        sw.onclick = () => {
          const k = sw.dataset.key;
          save.settings[k] = !save.settings[k];
          sw.setAttribute('aria-checked', save.settings[k]);
          persist();
          if (k === 'sound' && save.settings.sound) sfx.woof();
        };
      });
      const reset = body.querySelector('[data-act="reset"]');
      reset.onclick = () => {
        if (reset.dataset.armed) {
          const player = save.player;
          save = defaultSave();
          save.player = player;
          save.seenHelp = true;
          persist(); closeModal(); show('home'); toast('Fresh start!');
        } else {
          reset.dataset.armed = '1';
          reset.textContent = 'Tap again to erase everything';
          reset.classList.add('primary');
        }
      };
      body.querySelector('[data-act="ok"]').onclick = closeModal;
    });
  }

  function openCloset() {
    function render(body) {
      const items = SHOP.map(it => {
        const owned = save.owned.includes(it.id);
        const wearing = save.equip[it.slot] === it.id;
        let btn;
        if (wearing) btn = `<button class="btn small good" data-act="off" data-id="${it.id}">Wearing ✓</button>`;
        else if (owned) btn = `<button class="btn small" data-act="wear" data-id="${it.id}">Wear</button>`;
        else btn = `<button class="btn small primary" data-act="buy" data-id="${it.id}" ${canAfford(it.cost) ? '' : 'disabled'}>Buy</button>`;
        return `<div class="item${wearing ? ' wearing' : ''}">
          <div class="item-dog">${A.dog({ acc: { [it.slot]: it.id }, blinkDelay: 2 })}</div>
          <div class="name">${it.name}</div>
          ${owned ? '' : `<div class="cost">${costHTML(it.cost)}</div>`}
          ${btn}</div>`;
      }).join('');
      body.innerHTML = `
        <h2>${DOG}’s Closet</h2>
        <div class="closet-preview">${A.dog({ acc: save.equip })}</div>
        <div class="wallet" data-wallet style="justify-content:center"></div>
        <div class="shop">${items}</div>
        <div class="actions"><button class="btn primary" data-act="close">Done</button></div>`;
      renderWallet();
      body.querySelectorAll('[data-act]').forEach(b => {
        b.onclick = () => {
          const it = SHOP.find(s => s.id === b.dataset.id);
          if (b.dataset.act === 'close') { closeModal(); renderHome(); return; }
          if (b.dataset.act === 'buy') {
            if (!canAfford(it.cost)) return;
            Object.keys(it.cost).forEach(k => { save[k] -= it.cost[k]; });
            save.owned.push(it.id);
            save.equip[it.slot] = it.id;
            sfx.coin(); sfx.woof();
            toast(`${DOG} loves the ${it.name}!`);
          } else if (b.dataset.act === 'wear') {
            save.equip[it.slot] = it.id; sfx.tick();
            if (it.id === 'cowbell') sfx.cowbell();
          } else if (b.dataset.act === 'off') {
            delete save.equip[it.slot]; sfx.untick();
          }
          persist();
          render(body);
        };
      });
    }
    openModal('', render);
  }

  // ---------- Wiring ----------
  function playStage() {
    const resume = save.current && save.current.kind === 'stage' && save.current.stage === save.stage ? save.current : null;
    startGame('stage', { stage: save.stage }, resume);
  }
  function playDaily() {
    const date = todayKey();
    const resume = save.current && save.current.kind === 'daily' && save.current.date === date ? save.current : null;
    startGame('daily', { date }, resume);
  }

  function init() {
    persist();
    $('#btn-play').onclick = playStage;
    $('#btn-daily').onclick = playDaily;
    $('#btn-closet').onclick = openCloset;
    $('#btn-scores').onclick = () => openScoreboard();
    $('#btn-help').onclick = openHelp;
    $('#btn-settings').onclick = openSettings;
    $('#home-mascot').onclick = petMascot;
    $('#btn-back').onclick = () => { if (G && G.busy) return; saveGame(); clearInterval(timerId); show('home'); };
    $('#btn-undo').onclick = undo;
    $('#btn-clear').onclick = clearMarks;
    $('#btn-hint').onclick = useHint;
    $('#btn-cowbell').onclick = useCowbell;
    $('#btn-mode').onclick = () => {
      save.tool = save.tool === 'pup' ? 'mark' : 'pup';
      persist(); renderTools(); sfx.tick();
    };
    $('#coach-dog').onclick = () => { coach(rand(CHEERS)); sfx.woof(); };

    const board = $('#board');
    board.addEventListener('pointerdown', onPointerDown);
    board.addEventListener('pointermove', onPointerMove);
    board.addEventListener('pointerup', onPointerUp);
    board.addEventListener('pointercancel', onPointerUp);
    // iOS Safari decides on double-tap zoom at touchend; cancelling it here stops the zoom
    // without affecting the pointer events the board uses.
    board.addEventListener('touchend', e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
    board.addEventListener('contextmenu', e => e.preventDefault());
    board.addEventListener('dblclick', e => e.preventDefault());

    const stuck = () => G && G.over && G.hearts <= 0 && $('#screen-game').classList.contains('active');
    $('#modal').addEventListener('click', e => {
      if (performance.now() - modalOpenedAt < 500) return;
      if (e.target.id === 'modal' && !stuck()) closeModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !$('#modal').classList.contains('hidden') && !stuck()) closeModal();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });

    show('home');
    flushScores();
  }

  init();
})();

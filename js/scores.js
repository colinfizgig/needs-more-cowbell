// Scoreboard: player identity, scoring, and the optional online board (Supabase).
// The online board turns on only when js/config.js has a Supabase URL and anon key.
(function (global) {
  'use strict';

  const cfg = global.SCOREBOARD || {};
  const base = (cfg.supabaseUrl || '').replace(/\/+$/, '');
  const key = cfg.supabaseAnonKey || '';
  const online = !!(base && key);

  function headers() {
    return { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  }
  async function rpc(name, body) {
    const res = await fetch(`${base}/rest/v1/rpc/${name}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`${name} failed: ${res.status}`);
  }
  async function get(path) {
    const res = await fetch(`${base}/rest/v1/${path}`, { headers: headers() });
    if (!res.ok) throw new Error(`scoreboard read failed: ${res.status}`);
    return res.json();
  }

  function randomHex(bytes) {
    const a = new Uint8Array(bytes);
    crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
  }
  function uuid() {
    const h = randomHex(16).split('');
    h[12] = '4';
    h[16] = ((parseInt(h[16], 16) & 3) | 8).toString(16);
    const s = h.join('');
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
  }

  function newPlayer() {
    return { id: uuid(), secret: randomHex(16), name: 'Player #' + (1000 + Math.floor(Math.random() * 9000)), synced: false };
  }

  // Bigger boards are worth more; beating par adds points, mistakes and help cost points.
  function points(r) {
    const area = r.n * r.n;
    return Math.max(area, area * 10 + Math.max(0, r.par - r.time) * 2 - r.mistakes * 25 - r.hints * 15 - r.cowbells * 40);
  }

  async function register(player) {
    await rpc('register_player', { p_id: player.id, p_secret: player.secret, p_name: player.name });
    player.synced = true;
  }

  async function submit(player, s) {
    if (!player.synced) await register(player);
    await rpc('submit_score', {
      p_id: player.id, p_secret: player.secret, p_board: s.board, p_size: s.size,
      p_points: s.points, p_time: s.time, p_mistakes: s.mistakes, p_hints: s.hints,
    });
  }

  const boardTop = board =>
    get(`board_leaderboard?board=eq.${encodeURIComponent(board)}&order=points.desc,time_s.asc&limit=25`);
  const overallTop = () => get('overall_leaderboard?order=total_points.desc,boards_solved.desc&limit=50');

  global.Scores = { online, newPlayer, points, register, submit, boardTop, overallTop };
})(this);

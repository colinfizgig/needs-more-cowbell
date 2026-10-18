// Puzzle generation and solving for Woofdoku.
// A puzzle is an n×n grid split into n contiguous regions ("yards").
// The solution places one pup per row, column and region, with no two pups touching.
(function (global) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function range(n) {
    return Array.from({ length: n }, (_, i) => i);
  }

  function neighbors4(i, n) {
    const r = Math.floor(i / n), c = i % n, out = [];
    if (r > 0) out.push(i - n);
    if (r < n - 1) out.push(i + n);
    if (c > 0) out.push(i - 1);
    if (c < n - 1) out.push(i + 1);
    return out;
  }

  // Random column-per-row placement where consecutive rows never touch.
  // `fixed` optionally pins rows to columns ({ row: col }).
  function randomSolution(n, rng, fixed) {
    const cols = new Array(n);
    const used = new Array(n).fill(false);
    function bt(r) {
      if (r === n) return true;
      const options = fixed && fixed[r] != null ? [fixed[r]] : shuffle(range(n), rng);
      for (const c of options) {
        if (used[c]) continue;
        if (r > 0 && Math.abs(cols[r - 1] - c) <= 1) continue;
        used[c] = true; cols[r] = c;
        if (bt(r + 1)) return true;
        used[c] = false;
      }
      return false;
    }
    bt(0);
    return cols;
  }

  // Grow one region outward from each solution cell, with uneven growth rates for variety.
  function growRegions(n, sol, rng) {
    const reg = new Array(n * n).fill(-1);
    for (let r = 0; r < n; r++) reg[r * n + sol[r]] = r;
    const weights = range(n).map(() => 0.6 + rng() * 1.4);
    let left = n * n - n;
    while (left > 0) {
      const options = [];
      let total = 0;
      for (let i = 0; i < n * n; i++) {
        if (reg[i] !== -1) continue;
        const seen = new Set();
        for (const j of neighbors4(i, n)) {
          const k = reg[j];
          if (k === -1 || seen.has(k)) continue;
          seen.add(k);
          options.push([i, k]);
          total += weights[k];
        }
      }
      let pick = rng() * total;
      let chosen = options[options.length - 1];
      for (const opt of options) {
        pick -= weights[opt[1]];
        if (pick <= 0) { chosen = opt; break; }
      }
      reg[chosen[0]] = chosen[1];
      left--;
    }
    return reg;
  }

  // Backtracking solver. Returns up to `limit` solutions (each an array of columns by row).
  function solve(n, reg, limit) {
    const out = [];
    const colUsed = new Array(n).fill(false);
    const regUsed = new Array(n).fill(false);
    const pos = new Array(n);
    function bt(r) {
      if (out.length >= limit) return;
      if (r === n) { out.push(pos.slice()); return; }
      for (let c = 0; c < n; c++) {
        if (colUsed[c]) continue;
        const k = reg[r * n + c];
        if (regUsed[k]) continue;
        if (r > 0 && Math.abs(pos[r - 1] - c) <= 1) continue;
        colUsed[c] = regUsed[k] = true; pos[r] = c;
        bt(r + 1);
        colUsed[c] = regUsed[k] = false;
        if (out.length >= limit) return;
      }
    }
    bt(0);
    return out;
  }

  function connectedWithout(reg, n, k, removed) {
    const cells = [];
    for (let i = 0; i < n * n; i++) if (reg[i] === k && i !== removed) cells.push(i);
    if (!cells.length) return false;
    const seen = new Set([cells[0]]);
    const stack = [cells[0]];
    while (stack.length) {
      const i = stack.pop();
      for (const j of neighbors4(i, n)) {
        if (j !== removed && reg[j] === k && !seen.has(j)) { seen.add(j); stack.push(j); }
      }
    }
    return seen.size === cells.length;
  }

  // Nudge region borders until `sol` is the only solution. Every alternate solution puts
  // exactly one pup in each region, so moving one of its non-solution pups into a
  // neighbouring region always breaks that alternate.
  function makeUnique(n, sol, reg, rng) {
    for (let iter = 0; iter < 80; iter++) {
      const sols = solve(n, reg, 2);
      if (sols.length === 1) return true;
      const alt = sols.find(s => s.some((c, r) => c !== sol[r]));
      let changed = false;
      for (const r of shuffle(range(n), rng)) {
        if (alt[r] === sol[r]) continue;
        const x = r * n + alt[r];
        const cur = reg[x];
        const nb = [...new Set(neighbors4(x, n).map(j => reg[j]))].filter(k => k !== cur);
        if (!nb.length || !connectedWithout(reg, n, cur, x)) continue;
        reg[x] = nb[Math.floor(rng() * nb.length)];
        changed = true;
        break;
      }
      if (!changed) return false;
    }
    return false;
  }

  // `fixed` ({ row: col }) keeps those pups in the new solution, e.g. when the squirrel
  // digs up the fences mid-game but the player's placed pups stay put.
  function generate(n, seed, fixed) {
    const rng = mulberry32(seed);
    for (let attempt = 0; attempt < 1000; attempt++) {
      const sol = randomSolution(n, rng, fixed);
      const reg = growRegions(n, sol, rng);
      if (!makeUnique(n, sol, reg, rng)) continue;
      // Skip boards where one yard swallows the garden.
      const sizes = new Array(n).fill(0);
      reg.forEach(k => sizes[k]++);
      if (attempt < 400 && Math.max(...sizes) > Math.ceil(n * n * (n <= 6 ? 0.4 : 0.3))) continue;
      // Shuffle region labels so a region's colour says nothing about where its pup sits.
      const relabel = shuffle(range(n), rng);
      return { n, seed, solution: sol, regions: reg.map(k => relabel[k]) };
    }
    throw new Error('Could not generate puzzle');
  }

  const api = { mulberry32, hashString, generate, solve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Puzzle = api;
})(this);

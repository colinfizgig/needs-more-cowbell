// SVG artwork: Cowbell the Pithuskahula (pitbull / husky / Catahoula leopard dog),
// her outfits, treat icons, the cowbell and the squirrel.
(function (global) {
  'use strict';

  const INK = '#2b2b33';
  const PATCH = '#2b2b33';
  const HEAD = 'M50 22 C74 22 88 38 88 58 C88 78 72 92 50 92 C28 92 12 78 12 58 C12 38 26 22 50 22 Z';
  let uid = 0;

  function eye(cx, cy, iris) {
    return `
      <circle cx="${cx}" cy="${cy}" r="7.2" fill="#15151b"/>
      <circle cx="${cx}" cy="${cy}" r="5.4" fill="${iris}"/>
      <circle cx="${cx}" cy="${cy}" r="2.7" fill="#0d0d12"/>
      <circle cx="${cx - 2.1}" cy="${cy - 2.3}" r="1.9" fill="#fff"/>
      <circle cx="${cx + 2}" cy="${cy + 2}" r="0.9" fill="#fff"/>`;
  }

  function flower(x, y, color) {
    let petals = '';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
      petals += `<circle cx="${(x + Math.cos(a) * 3.2).toFixed(2)}" cy="${(y + Math.sin(a) * 3.2).toFixed(2)}" r="2.9" fill="${color}"/>`;
    }
    return `${petals}<circle cx="${x}" cy="${y}" r="2" fill="#ffd23f"/>`;
  }

  const ACCESSORIES = {
    // neck slot
    cowbell: `<path d="M23 84 Q50 99 77 84 L77 89 Q50 104 23 89 Z" fill="#8a5a2b" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M45 93 L55 93 L59 103 Q59 105 57 105 L43 105 Q41 105 41 103 Z" fill="#d9a72c" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M45.5 96 L44 102" stroke="#fff3c4" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="50" cy="105.5" r="1.8" fill="${INK}"/>`,
    bandana: `<path d="M24 85 Q50 97 76 85 L53 104 Q50 107 47 104 Z" fill="#e8434f" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <g fill="#fff"><circle cx="38" cy="90" r="1.6"/><circle cx="50" cy="94" r="1.6"/><circle cx="62" cy="90" r="1.6"/><circle cx="45" cy="99" r="1.4"/><circle cx="55" cy="99" r="1.4"/></g>`,
    collar: `<path d="M22 84 Q50 100 78 84 L78 90 Q50 106 22 90 Z" fill="#33b679" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="50" cy="103" r="5.5" fill="#ffd23f" stroke="${INK}" stroke-width="1.8"/>
      <path d="M47.5 103 h5" stroke="#b07d00" stroke-width="1.6" stroke-linecap="round"/>`,
    bowtie: `<path d="M50 93 L37 85 Q34 93 37 101 Z M50 93 L63 85 Q66 93 63 101 Z" fill="#4b6bff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="50" cy="93" r="3.6" fill="#7d93ff" stroke="${INK}" stroke-width="1.8"/>`,
    // face slot
    shades: `<g stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M25 49 L14 45"/><path d="M75 49 L86 45"/><path d="M46 50 Q50 46.5 54 50"/></g>
      <rect x="24.5" y="44" width="22" height="14" rx="5" fill="#1d1d2b" stroke="${INK}" stroke-width="1.5"/>
      <rect x="53.5" y="44" width="22" height="14" rx="5" fill="#1d1d2b" stroke="${INK}" stroke-width="1.5"/>
      <g stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".55"><path d="M29 48.5 L33.5 46.5"/><path d="M58 48.5 L62.5 46.5"/></g>`,
    hearts: `<g stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"><path d="M25 49 L14 45"/><path d="M75 49 L86 45"/><path d="M45 50 Q50 47 55 50"/></g>
      <path d="M35 59 C24 52 23 43 29.5 43 C32.5 43 34.5 45.5 35 47 C35.5 45.5 37.5 43 40.5 43 C47 43 46 52 35 59 Z" fill="#ff5d8f" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M65 59 C54 52 53 43 59.5 43 C62.5 43 64.5 45.5 65 47 C65.5 45.5 67.5 43 70.5 43 C77 43 76 52 65 59 Z" fill="#ff5d8f" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`,
    // head slot
    partyhat: `<path d="M37 27 L50 -5 L63 27 Q50 31 37 27 Z" fill="#ff6fa8" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M44.5 10 L55.5 10 M41.3 19 L58.7 19" stroke="#ffe066" stroke-width="3"/>
      <circle cx="50" cy="-6" r="4.6" fill="#ffe066" stroke="${INK}" stroke-width="1.8"/>`,
    chef: `<path d="M35 31 L35 18 C25 19 25 3 36 6 C38 -5 62 -5 64 6 C75 3 75 19 65 18 L65 31 Q50 34 35 31 Z" fill="#fff" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M35 25 Q50 28 65 25" stroke="#d9d2cf" stroke-width="2" fill="none"/>
      <path d="M41 13 C43 10 46 15 48.5 12 C51 9 54 14 57 11" stroke="#e05a4f" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    flowers: `<g stroke="none">
      <ellipse cx="30" cy="31" rx="3.4" ry="1.6" fill="#5cbf6a" transform="rotate(-35 30 31)"/>
      <ellipse cx="43" cy="24" rx="3.4" ry="1.6" fill="#5cbf6a" transform="rotate(-12 43 24)"/>
      <ellipse cx="57" cy="24" rx="3.4" ry="1.6" fill="#5cbf6a" transform="rotate(12 57 24)"/>
      <ellipse cx="70" cy="31" rx="3.4" ry="1.6" fill="#5cbf6a" transform="rotate(35 70 31)"/>
      ${flower(24, 36, '#ff8fb8')}${flower(36, 27, '#b79cff')}${flower(50, 23.5, '#ffb347')}${flower(64, 27, '#7fd3ff')}${flower(76, 36, '#ff8fb8')}</g>`,
    crown: `<path d="M33 29 L31 8 L41 17 L50 3 L59 17 L69 8 L67 29 Q50 32 33 29 Z" fill="#ffd23f" stroke="#8a6400" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="50" cy="21" r="3.2" fill="#e8434f" stroke="#8a6400" stroke-width="1.2"/>
      <circle cx="40" cy="24" r="2.2" fill="#3fa9f5" stroke="#8a6400" stroke-width="1.2"/>
      <circle cx="60" cy="24" r="2.2" fill="#3fa9f5" stroke="#8a6400" stroke-width="1.2"/>
      <circle cx="31" cy="8" r="2" fill="#ffd23f" stroke="#8a6400" stroke-width="1.2"/>
      <circle cx="50" cy="3" r="2.2" fill="#ffd23f" stroke="#8a6400" stroke-width="1.2"/>
      <circle cx="69" cy="8" r="2" fill="#ffd23f" stroke="#8a6400" stroke-width="1.2"/>`,
  };

  // acc: { head, face, neck } -> accessory ids
  function dog(opts) {
    opts = opts || {};
    const acc = opts.acc || {};
    const id = 'pd' + (++uid);
    const blinkDelay = opts.blinkDelay != null ? opts.blinkDelay : (Math.random() * 4).toFixed(2);
    const layer = slot => (acc[slot] && ACCESSORIES[acc[slot]]) || '';
    return `<svg class="dog-svg" viewBox="-6 -14 112 122" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><clipPath id="${id}"><path d="${HEAD}"/></clipPath></defs>
  <path d="M17 50 C5 37 -2 17 -1 1 C14 4 32 13 44 27 Z" fill="${PATCH}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M19 41 C11 31 7 19 6.5 9 C17 12 29 18 37 27 Z" fill="#f6b9c6"/>
  <path d="M83 50 C95 37 102 17 101 1 C86 4 68 13 56 27 Z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M81 41 C89 31 93 19 93.5 9 C83 12 71 18 63 27 Z" fill="#f6b9c6"/>
  <circle cx="92" cy="6" r="2.2" fill="${PATCH}"/>
  <path d="${HEAD}" fill="#fff"/>
  <g clip-path="url(#${id})" fill="${PATCH}">
    <path d="M10 40 C18 28 38 27 46 37 C52 45 49 59 41 64 C32 69 19 65 13 57 C9 51 8 45 10 40 Z"/>
    <ellipse cx="73" cy="28" rx="13" ry="8" transform="rotate(18 73 28)"/>
    <ellipse cx="84" cy="74" rx="7" ry="10" transform="rotate(-20 84 74)"/>
    <circle cx="57" cy="29" r="2.4"/><circle cx="80" cy="46" r="2"/><circle cx="23" cy="75" r="2.3"/><circle cx="29" cy="81" r="1.5"/>
  </g>
  <ellipse cx="32" cy="41.5" rx="3.2" ry="2" fill="#fff"/>
  <ellipse cx="66" cy="41.5" rx="3.2" ry="2" fill="${PATCH}"/>
  <path d="${HEAD}" fill="none" stroke="${INK}" stroke-width="2.6"/>
  <ellipse cx="50" cy="71" rx="20" ry="14" fill="#fff" stroke="#e4dcda" stroke-width="1.5"/>
  <ellipse cx="26.5" cy="72" rx="5" ry="3" fill="#ff9fb0" opacity=".6"/>
  <ellipse cx="73.5" cy="72" rx="5" ry="3" fill="#ff9fb0" opacity=".6"/>
  <g class="eyes" style="animation-delay:${blinkDelay}s">${eye(35, 51, '#9a5b2a')}${eye(65, 51, '#9a5b2a')}</g>
  <path d="M46.5 75.2 Q46 84 50 84 Q54 84 53.5 75.2 Z" fill="#ff7d93" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M50 77.5 L50 80.5" stroke="#e05a72" stroke-width="1.2" stroke-linecap="round"/>
  <path d="M50 69 L50 73.5 M41 72 Q45.5 77.5 50 73.5 Q54.5 77.5 59 72" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M43 63 C43 58.5 57 58.5 57 63 C57 67 52.5 69.5 50 69.5 C47.5 69.5 43 67 43 63 Z" fill="#1d1d24"/>
  <ellipse cx="47" cy="61.6" rx="2.4" ry="1.1" fill="#fff" opacity=".55"/>
  ${layer('neck')}${layer('face')}${layer('head')}
</svg>`;
  }

  function bone() {
    const g = `<rect x="6" y="9.6" width="12" height="4.8" rx="1"/><circle cx="6" cy="9.7" r="2.8"/><circle cx="6" cy="14.3" r="2.8"/><circle cx="18" cy="9.7" r="2.8"/><circle cx="18" cy="14.3" r="2.8"/>`;
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(-35 12 12)"><g fill="#8a5a2b" stroke="#8a5a2b" stroke-width="2.6">${g}</g><g fill="#f6e2bd">${g}</g></g></svg>`;
  }

  function bacon() {
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 10 C5 6 8 12 11 8 C14 4 17 10 22 6 L22 13 C17 17 14 11 11 15 C8 19 5 13 2 17 Z" fill="#d9534f" stroke="#7d2622" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M2 13.5 C5 9.5 8 15.5 11 11.5 C14 7.5 17 13.5 22 9.5" fill="none" stroke="#ffd3c4" stroke-width="1.7"/></svg>`;
  }

  function cheese() {
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 13 L22 10 L22 19 L2 19 Z" fill="#ffc933" stroke="#a87400" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M2 13 L15 5 L22 10 Z" fill="#ffe27a" stroke="#a87400" stroke-width="1.2" stroke-linejoin="round"/>
      <g fill="#e3a400"><circle cx="7.5" cy="16" r="1.6"/><circle cx="14.5" cy="14.6" r="1.2"/><circle cx="18.5" cy="17" r="1"/><circle cx="14" cy="8.8" r=".9"/></g></svg>`;
  }

  function heart() {
    return `<svg class="icon heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21 C4 15.5 1.5 11 3.5 7.2 C5.3 3.8 9.8 3.6 12 7 C14.2 3.6 18.7 3.8 20.5 7.2 C22.5 11 20 15.5 12 21 Z" stroke="#7d2622" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  }

  function paw() {
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><ellipse cx="12" cy="16" rx="5" ry="4.2"/><ellipse cx="5.5" cy="10.5" rx="2.2" ry="2.8"/><ellipse cx="9.5" cy="6.5" rx="2.2" ry="2.9"/><ellipse cx="14.5" cy="6.5" rx="2.2" ry="2.9"/><ellipse cx="18.5" cy="10.5" rx="2.2" ry="2.8"/></svg>`;
  }

  function cowbell() {
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 4.5 V2.5 H14 V4.5" fill="none" stroke="#5a3a1a" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M7.5 4.5 H16.5 L19.5 17.5 Q19.5 19 18 19 H6 Q4.5 19 4.5 17.5 Z" fill="#e0b13a" stroke="#6b4a10" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M8.6 7 L7.3 15.5" stroke="#fff3c4" stroke-width="1.5" stroke-linecap="round"/>
      <circle cx="12" cy="20.6" r="1.7" fill="#3a2a1f"/></svg>`;
  }

  function squirrel() {
    return `<svg class="squirrel-svg" viewBox="0 0 100 80" aria-hidden="true">
      <path d="M38 52 C16 62 -1 44 5 23 C10 6 33 1 40 15 C44 25 37 34 30 30 C34 24 30 16 24 18 C15 22 17 42 38 43 Z" fill="#c97a3d" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse cx="54" cy="50" rx="17" ry="12.5" fill="#d98b4a" stroke="${INK}" stroke-width="2.2"/>
      <ellipse cx="59" cy="54" rx="9" ry="7" fill="#f6d9b8"/>
      <ellipse cx="45" cy="62" rx="6" ry="3.5" fill="#b8692e" stroke="${INK}" stroke-width="1.8"/>
      <ellipse cx="63" cy="62" rx="5" ry="3" fill="#b8692e" stroke="${INK}" stroke-width="1.8"/>
      <path d="M64 28 L65 15 L72 26 Z" fill="#d98b4a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="72" cy="36" r="11.5" fill="#d98b4a" stroke="${INK}" stroke-width="2.2"/>
      <circle cx="75.5" cy="33.5" r="2.6" fill="#1d1d24"/><circle cx="74.6" cy="32.6" r=".9" fill="#fff"/>
      <circle cx="83" cy="38.5" r="1.8" fill="#1d1d24"/>
      <ellipse cx="74" cy="42" rx="3.2" ry="2" fill="#ff9fb0" opacity=".7"/>
      <ellipse cx="84" cy="50" rx="4" ry="4.6" fill="#a8743a" stroke="${INK}" stroke-width="1.6"/>
      <path d="M79.5 46 Q84 42 88.5 46 Z" fill="#6b4a22" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
    </svg>`;
  }

  const ICONS = { bones: bone, bacon, cheese, cowbells: cowbell };

  global.Art = { dog, bone, bacon, cheese, cowbell, squirrel, heart, paw, icon: k => ICONS[k](), ACCESSORIES };
})(this);

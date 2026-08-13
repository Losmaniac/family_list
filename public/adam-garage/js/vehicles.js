/* =============================================================================
 *  vehicles.js  –  Sedm strojů
 *  -----------------------------------------------------------------------
 *  Každý stroj je objekt:
 *    id, name, subtitle, emoji, theme, scene
 *    sound     … profil motoru + houkačky
 *    spin      … díly, které se točí pořád (mlátička, kartáč…)
 *    emitters  … odkud a kdy se sypou částice
 *    action    … zvláštní kousek (kopat, sypat, sklízet…)
 *    art(p)    … samotná kresba, p = unikátní prefix pro id přechodů
 *
 *  Souřadnice: viewBox "0 0 560 300", země na y = 262, stroje čelem doprava.
 *  Otáčení dílů: data-part="jmeno" data-pivot="x y"
 *      – díl vpravo od čepu:  kladný úhel = dolů
 *      – díl vlevo  od čepu:  kladný úhel = nahoru
 * ===========================================================================*/
(function (global) {
  'use strict';

  const A = global.ART;
  const R = A.R;

  /* pomocník: dvoubarevný přechod karoserie */
  function bodyGrad(id, light, dark) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="55%" stop-color="${light}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </linearGradient>`;
  }

  /* ===========================================================================
   *  1) TRAKTOR
   * =========================================================================*/
  const traktor = {
    id: 'traktor',
    name: 'Traktor',
    subtitle: 'Oře pole pluhem',
    emoji: '🚜',
    scene: 'pole',
    theme: { main: '#3aa14f', dark: '#1e6b34', accent: '#ffd21e', ink: '#0f3d1e' },
    sound: {
      base: 44, saw: 0.34, square: 0.16, noise: 0.05, whine: 0.010, cutoff: [260, 1500],
      horn: { type: 'square', gain: 0.42, notes: [[523, 0, 0.30], [523, 0.40, 0.36]] }
    },
    emitters: {
      exhaust: { type: 'smoke', when: 'engine', rate: 9 },
      dust: { type: 'dust', when: 'driving', rate: 16 },
      soil: { type: 'soil', when: 'action', rate: 34 }
    },
    action: {
      id: 'pluh', label: 'Pluh', icon: 'plow', duration: 5200, loop: true, sound: 'hydraulic',
      parts: { plow: [[0, 0], [0.16, -20], [0.9, -20], [1, 0]] },
      emitAt: { soil: [0.2, 0.92] }
    },
    art(p) {
      const M = '#3aa14f', D = '#1e6b34', DD = '#155026', Y = '#ffd21e';
      let s = `<defs>${bodyGrad(p + 'b', '#4bbc62', D)}${bodyGrad(p + 'h', '#43ae59', '#1a6030')}</defs>`;

      s += A.shadow({ x: 292, rx: 232, ry: 14 });

      /* ---- PLUH (otáčí se kolem čepu 170,198) ---- */
      s += `<g data-part="plow" data-pivot="170 198">`;
      /* nosný rám */
      s += `<path d="M 170 198 L 126 188 L 56 170" fill="none" stroke="#39414f" stroke-width="14" stroke-linecap="round"/>`;
      s += `<path d="M 170 196 L 126 186 L 56 168" fill="none" stroke="#7d8698" stroke-width="4" stroke-linecap="round"/>`;
      s += `<rect x="152" y="174" width="16" height="36" rx="6" fill="#39414f"/>`;
      /* tři plužní tělesa */
      [[126, 187], [92, 178], [58, 170]].forEach(([mx, my], i) => {
        /* stojina */
        s += `<path d="M ${mx - 3} ${my} l 10 0 l 3 26 l -12 0 z" fill="#2b323d"/>`;
        /* odhrnovačka */
        s += `<path d="M ${mx - 6} ${my + 22} q 20 2 30 16 q -6 14 -24 18 q -12 -14 -6 -34 z" fill="#8b95a6" stroke="#4a5464" stroke-width="2.5" stroke-linejoin="round"/>`;
        s += `<path d="M ${mx - 2} ${my + 28} q 16 4 24 14" fill="none" stroke="#e0e6ef" stroke-width="3.5" stroke-linecap="round"/>`;
        /* ostří */
        s += `<path d="M ${mx + 6} ${my + 52} q 10 -3 18 -14 l 6 6 q -8 12 -20 16 z" fill="#dfe5ee" stroke="#98a1b0" stroke-width="1.6" stroke-linejoin="round"/>`;
        if (i === 2) s += A.emitter('soil', mx - 2, my + 46);
      });
      s += `</g>`;

      /* ---- rám a závěs ---- */
      s += `<rect x="150" y="190" width="330" height="26" rx="8" fill="#2b323d"/>`;
      s += `<rect x="404" y="198" width="66" height="14" rx="6" fill="#39414f"/>`;

      /* ---- kapota ---- */
      s += `<path d="M 330 212 L 330 152 Q 330 139 345 137 L 456 137 Q 490 137 492 168 L 492 208 Q 492 212 486 212 Z" fill="url(#${p}h)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 336 150 L 470 145" fill="none" stroke="#ffffff" stroke-opacity="0.30" stroke-width="5" stroke-linecap="round"/>`;
      /* žebrování na boku kapoty */
      for (let i = 0; i < 4; i++) {
        s += `<rect x="${356 + i * 17}" y="168" width="7" height="34" rx="3.5" fill="${DD}" fill-opacity="0.55"/>`;
      }
      s += `<rect x="330" y="163" width="162" height="7" rx="3.5" fill="${Y}"/>`;
      /* maska chladiče + závaží */
      s += A.grille({ x: 466, y: 152, w: 28, h: 52, bars: 7, rx: 8, frame: '#d8dee8', color: '#1c2129' });
      s += `<rect x="462" y="196" width="40" height="26" rx="6" fill="#39414f"/>`;
      s += A.rivets({ x1: 470, y1: 203, x2: 496, y2: 203, n: 4, r: 2.4, color: '#8b95a6' });
      s += A.rivets({ x1: 470, y1: 214, x2: 496, y2: 214, n: 4, r: 2.4, color: '#8b95a6' });

      /* ---- výfuk ---- */
      s += A.stack({ x: 340, yTop: 56, yBottom: 143, w: 14, color: 'url(#gSteel)' });
      s += A.emitter('exhaust', 340, 50);

      /* ---- kabina ---- */
      s += `<path d="M 196 214 L 196 114 Q 196 101 210 101 L 304 101 L 332 133 L 332 214 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += A.driver({ x: 258, y: 128, s: 0.92, cap: '#ffd21e', shirt: '#2f6fd0' });
      s += A.glass(`M 208 114 L 300 114 L 322 139 L 322 184 L 208 184 Z`, { tint: '#a9dcf6' });
      /* dveřní klika + schůdky */
      s += `<rect x="214" y="192" width="34" height="7" rx="3.5" fill="${DD}"/>`;
      s += `<rect x="188" y="222" width="34" height="8" rx="4" fill="#4a5464"/>`;
      s += `<rect x="188" y="240" width="34" height="8" rx="4" fill="#4a5464"/>`;
      /* střecha */
      s += `<path d="M 182 101 L 348 101 L 342 79 L 188 79 Z" fill="${D}" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<rect x="180" y="76" width="172" height="8" rx="4" fill="${M}"/>`;
      /* zrcátko */
      s += `<path d="M 336 96 L 358 88" stroke="#39414f" stroke-width="5" stroke-linecap="round"/>`;
      s += `<rect x="352" y="76" width="14" height="20" rx="5" fill="#39414f"/>`;
      s += `<rect x="354" y="78" width="10" height="16" rx="4" fill="#b9c1cd"/>`;

      /* ---- blatník zadního kola ---- */
      s += A.fender({ cx: 180, cy: 190, r: 82, color: D, w: 15, from: 202, to: 344 });

      /* ---- kola ---- */
      s += A.wheel({ cx: 432, cy: 224, r: 38, style: 'agri', lugs: 12, spokes: 5, rimColor: Y, rimR: 0.5, bolts: 6 });
      s += A.wheel({ cx: 180, cy: 190, r: 72, style: 'agri', lugs: 16, spokes: 6, rimColor: Y, rimR: 0.46, bolts: 8 });
      s += A.emitter('dust', 180, 258);

      /* ---- světla ---- */
      s += A.lamp({ x: 486, y: 158, r: 9, len: 250, spread: 56 });
      s += A.lamp({ x: 340, y: 88, r: 8, len: 300, spread: 70 });
      s += A.tailLamp({ x: 108, y: 158, r: 7 });
      s += A.reverseLamp({ x: 116, y: 138, r: 6 });
      s += A.beacon({ x: 300, y: 76, w: 20, h: 14 });

      return s;
    }
  };

  /* ===========================================================================
   *  2) BAGR
   * =========================================================================*/
  const bagr = {
    id: 'bagr',
    name: 'Bagr',
    subtitle: 'Nabere plnou lžíci hlíny',
    emoji: '🚧',
    scene: 'stavba',
    theme: { main: '#f7b400', dark: '#c07c00', accent: '#2b323d', ink: '#5a3c00' },
    sound: {
      base: 40, saw: 0.32, square: 0.18, noise: 0.07, whine: 0.008, cutoff: [220, 1300],
      horn: { type: 'square', gain: 0.38, notes: [[784, 0, 0.16], [784, 0.24, 0.16], [784, 0.48, 0.16]] }
    },
    emitters: {
      exhaust: { type: 'smoke', when: 'engine', rate: 10 },
      dust: { type: 'dust', when: 'driving', rate: 18 },
      bucket: { type: 'soil', when: 'action', rate: 40 }
    },
    action: {
      id: 'kopat', label: 'Kopat', icon: 'bucket', duration: 4600, loop: true, sound: 'hydraulic',
      parts: {
        boom: [[0, 0], [0.16, 15], [0.34, 17], [0.56, -16], [0.78, -14], [1, 0]],
        arm: [[0, 0], [0.16, 24], [0.34, 8], [0.56, -26], [0.78, -30], [1, 0]],
        bucket: [[0, 0], [0.14, 30], [0.36, -40], [0.54, -46], [0.70, 55], [0.86, 8], [1, 0]]
      },
      emitAt: { bucket: [[0.22, 0.40], [0.60, 0.74]] }
    },
    art(p) {
      const M = '#f7b400', D = '#c07c00', DD = '#8a5900';
      let s = `<defs>${bodyGrad(p + 'b', '#ffc933', D)}</defs>`;
      s += A.shadow({ x: 240, rx: 190, ry: 13 });

      /* ---- pásový podvozek ---- */
      s += A.track({ x1: 112, x2: 322, cy: 224, r: 30, band: 17, rollers: 5 });

      /* ---- otoč ---- */
      s += `<rect x="136" y="184" width="196" height="18" rx="7" fill="url(#gSteel)"/>`;
      s += `<rect x="150" y="176" width="170" height="12" rx="6" fill="#4a5464"/>`;

      /* ---- protizávaží ---- */
      s += `<path d="M 106 186 L 106 150 Q 106 137 120 136 L 152 136 L 152 186 Z" fill="#5a6373" stroke="#39414f" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += A.rivets({ x1: 114, y1: 148, x2: 114, y2: 178, n: 3, r: 2.6, color: '#8b95a6' });

      /* ---- motorová část ---- */
      s += `<path d="M 148 186 L 148 138 Q 148 128 160 128 L 262 128 L 262 186 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      for (let i = 0; i < 5; i++) {
        s += `<rect x="${176 + i * 14}" y="140" width="6" height="30" rx="3" fill="${DD}" fill-opacity="0.5"/>`;
      }
      s += `<rect x="148" y="172" width="114" height="7" rx="3.5" fill="#2b323d"/>`;
      s += A.stack({ x: 200, yTop: 104, yBottom: 130, w: 12, color: 'url(#gSteel)' });
      s += A.emitter('exhaust', 200, 98);
      /* zábradlí na plošině */
      s += `<path d="M 156 128 L 156 112 L 246 112" fill="none" stroke="#c8cfda" stroke-width="3.5" stroke-linecap="round"/>`;

      /* ---- kabina ---- */
      s += `<path d="M 258 188 L 258 106 Q 258 94 271 94 L 322 94 Q 334 94 334 107 L 334 188 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += A.driver({ x: 300, y: 126, s: 0.78, cap: '#e63946', shirt: '#f4f7fb' });
      s += A.glass(`M 266 104 L 326 104 L 326 166 L 266 166 Z`, { tint: '#a9dcf6' });
      s += `<rect x="264" y="172" width="64" height="10" rx="5" fill="${DD}" fill-opacity="0.6"/>`;
      s += `<path d="M 262 100 L 330 100" stroke="#2b323d" stroke-width="6" stroke-linecap="round"/>`;

      /* ---- rameno: násada → lžíce (vnořené skupiny) ---- */
      s += `<g data-part="boom" data-pivot="334 166">`;
      /* výložník */
      s += `<path d="M 334 166 Q 398 92 452 104" fill="none" stroke="${DD}" stroke-width="30" stroke-linecap="round"/>`;
      s += `<path d="M 334 166 Q 398 92 452 104" fill="none" stroke="${M}" stroke-width="24" stroke-linecap="round"/>`;
      s += `<path d="M 336 160 Q 396 92 448 100" fill="none" stroke="#fff" stroke-opacity="0.28" stroke-width="6" stroke-linecap="round"/>`;
      s += A.piston({ x1: 350, y1: 186, x2: 402, y2: 124, w: 13 });
      s += `<circle cx="334" cy="166" r="9" fill="#39414f"/><circle cx="334" cy="166" r="3.5" fill="#c8cfda"/>`;

      s += `<g data-part="arm" data-pivot="452 104">`;
      s += A.piston({ x1: 418, y1: 106, x2: 470, y2: 132, w: 12 });
      s += `<path d="M 452 104 L 508 178" fill="none" stroke="${DD}" stroke-width="24" stroke-linecap="round"/>`;
      s += `<path d="M 452 104 L 508 178" fill="none" stroke="${M}" stroke-width="18" stroke-linecap="round"/>`;
      s += `<path d="M 450 108 L 504 178" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="4.5" stroke-linecap="round"/>`;
      s += `<circle cx="452" cy="104" r="8" fill="#39414f"/><circle cx="452" cy="104" r="3" fill="#c8cfda"/>`;

      s += `<g data-part="bucket" data-pivot="508 178">`;
      s += A.piston({ x1: 478, y1: 142, x2: 506, y2: 168, w: 10 });
      s += `<path d="M 498 164 L 536 170 Q 550 190 532 212 L 498 202 Q 488 184 498 164 Z" fill="#e0e6ef" stroke="#6f7889" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 502 170 L 530 175 Q 540 190 528 204" fill="none" stroke="#fff" stroke-opacity="0.85" stroke-width="3" stroke-linecap="round"/>`;
      /* zuby lžíce */
      for (let i = 0; i < 4; i++) {
        const tx = 505 + i * 9, ty = 203 + i * 2.4;
        s += `<path d="M ${tx} ${ty} l 9 2 l -3 11 z" fill="#8b95a6" stroke="#5a6373" stroke-width="1.5" stroke-linejoin="round"/>`;
      }
      s += `<circle cx="508" cy="178" r="7" fill="#39414f"/>`;
      s += A.emitter('bucket', 520, 206);
      s += `</g></g></g>`;

      /* ---- kola podvozku už jsou v pásu, jen prach ---- */
      s += A.emitter('dust', 150, 258);

      /* ---- světla ---- */
      s += A.lamp({ x: 330, y: 88, r: 8, len: 260, spread: 60 });
      s += A.lamp({ x: 352, y: 148, r: 7, len: 210, spread: 44 });
      s += A.tailLamp({ x: 112, y: 148, r: 6.5 });
      s += A.reverseLamp({ x: 112, y: 168, r: 6 });
      s += A.beacon({ x: 296, y: 92, w: 18, h: 13 });

      return s;
    }
  };

  /* ===========================================================================
   *  3) BULDOZER
   * =========================================================================*/
  const buldozer = {
    id: 'buldozer',
    name: 'Buldozer',
    subtitle: 'Hrne velkou radlicí',
    emoji: '🏗️',
    scene: 'stavba',
    theme: { main: '#f08a1c', dark: '#b45c05', accent: '#2b323d', ink: '#6b3600' },
    sound: {
      base: 34, saw: 0.38, square: 0.20, noise: 0.08, whine: 0.006, cutoff: [180, 1100],
      horn: { type: 'sawtooth', gain: 0.40, notes: [[165, 0, 0.75], [220, 0, 0.75]] }
    },
    emitters: {
      exhaust: { type: 'smoke', when: 'engine', rate: 13 },
      dust: { type: 'dust', when: 'driving', rate: 22 },
      blade: { type: 'soil', when: 'action', rate: 44 }
    },
    action: {
      id: 'hrnout', label: 'Hrnout', icon: 'blade', duration: 4400, loop: true, sound: 'hydraulic',
      parts: { blade: [[0, 0], [0.14, -22], [0.34, -22], [0.52, 4], [0.86, 4], [1, 0]] },
      emitAt: { blade: [0.5, 0.9] }
    },
    art(p) {
      const M = '#f08a1c', D = '#b45c05', DD = '#7d3f00';
      let s = `<defs>${bodyGrad(p + 'b', '#ffa53d', D)}</defs>`;
      s += A.shadow({ x: 250, rx: 210, ry: 13 });

      /* ---- radlice (kolem čepu 300,206) ---- */
      s += `<g data-part="blade" data-pivot="300 206">`;
      /* tlačné rameno */
      s += `<path d="M 300 206 L 428 228" fill="none" stroke="#39414f" stroke-width="19" stroke-linecap="round"/>`;
      s += `<path d="M 302 202 L 426 224" fill="none" stroke="#7d8698" stroke-width="5" stroke-linecap="round"/>`;
      s += A.piston({ x1: 336, y1: 166, x2: 428, y2: 200, w: 14 });
      /* plát radlice – plná zakřivená deska */
      s += `<path d="M 452 138 Q 416 198 446 250 L 418 256 Q 388 198 424 138 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="3" stroke-linejoin="round"/>`;
      s += `<path d="M 446 148 Q 416 198 440 242" fill="none" stroke="#fff" stroke-opacity="0.32" stroke-width="6" stroke-linecap="round"/>`;
      /* horní lem */
      s += `<path d="M 424 138 L 452 138 L 456 126 L 420 126 Z" fill="${DD}"/>`;
      s += `<path d="M 420 126 L 456 126" stroke="#8b95a6" stroke-width="4" stroke-linecap="round"/>`;
      /* výztuhy vzadu */
      s += `<path d="M 402 162 L 424 156 M 396 200 L 418 198 M 402 238 L 424 242" stroke="${DD}" stroke-width="6" stroke-linecap="round"/>`;
      /* břit */
      s += `<path d="M 416 250 L 448 244 L 476 256 L 440 264 Z" fill="#c8cfda" stroke="#7d8698" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += A.rivets({ x1: 428, y1: 254, x2: 462, y2: 256, n: 4, r: 2.4, color: '#8b95a6' });
      s += A.emitter('blade', 462, 256);
      s += `</g>`;

      /* ---- pásy ---- */
      s += A.track({ x1: 104, x2: 318, cy: 224, r: 31, band: 18, rollers: 5 });

      /* ---- rám ---- */
      s += `<path d="M 100 204 L 100 162 Q 100 152 112 152 L 328 152 Q 340 152 340 164 L 340 204 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<rect x="100" y="186" width="240" height="8" rx="4" fill="#2b323d"/>`;

      /* ---- kapota motoru ---- */
      s += `<path d="M 238 152 L 238 118 Q 238 108 250 108 L 322 108 Q 336 108 338 122 L 340 152 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      for (let i = 0; i < 4; i++) {
        s += `<rect x="${256 + i * 16}" y="120" width="7" height="24" rx="3.5" fill="${DD}" fill-opacity="0.5"/>`;
      }
      s += A.grille({ x: 322, y: 118, w: 18, h: 34, bars: 5, rx: 5, frame: '#c8cfda', color: '#1c2129' });

      /* ---- výfuk ---- */
      s += A.stack({ x: 252, yTop: 52, yBottom: 112, w: 14, color: 'url(#gSteel)' });
      s += A.emitter('exhaust', 252, 46);

      /* ---- kabina / ochranný rám ---- */
      s += `<path d="M 128 152 L 128 92 L 236 92 L 236 152 Z" fill="url(#${p}b)" fill-opacity="0.28"/>`;
      s += A.driver({ x: 182, y: 116, s: 0.82, cap: '#e63946', shirt: '#2b323d' });
      s += A.glass(`M 136 100 L 228 100 L 228 148 L 136 148 Z`, { tint: '#a9dcf6', op: 0.42 });
      /* sloupky */
      s += `<rect x="126" y="88" width="12" height="66" rx="4" fill="${DD}"/>`;
      s += `<rect x="228" y="88" width="12" height="66" rx="4" fill="${DD}"/>`;
      s += `<path d="M 118 92 L 250 92 L 250 78 L 118 78 Z" fill="${D}" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<rect x="114" y="72" width="140" height="8" rx="4" fill="${M}"/>`;

      /* ---- rozrývač vzadu ---- */
      s += `<path d="M 104 184 L 78 190 L 78 210 L 104 206 Z" fill="#5a6373" stroke="#39414f" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 84 200 L 76 226 L 62 250 L 76 254 L 90 228 L 96 202 Z" fill="#6f7889" stroke="#39414f" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 68 240 L 60 252 L 74 256 L 80 244 Z" fill="#c8cfda" stroke="#8b95a6" stroke-width="2"/>`;

      s += A.emitter('dust', 140, 258);

      /* ---- světla ---- */
      s += A.lamp({ x: 246, y: 84, r: 8, len: 300, spread: 68 });
      s += A.lamp({ x: 130, y: 84, r: 7, len: 90, spread: 30 });
      s += A.tailLamp({ x: 108, y: 168, r: 6.5 });
      s += A.reverseLamp({ x: 108, y: 186, r: 6 });
      s += A.beacon({ x: 200, y: 72, w: 18, h: 13 });

      return s;
    }
  };

  /* ===========================================================================
   *  4) AMERICKÝ TRUCK
   * =========================================================================*/
  const truck = {
    id: 'truck',
    name: 'Americký truck',
    subtitle: 'Chrom, komíny a velká houkačka',
    emoji: '🚛',
    scene: 'silnice',
    theme: { main: '#e03131', dark: '#9c1c1c', accent: '#e9edf3', ink: '#5c0f0f' },
    sound: {
      base: 38, saw: 0.36, square: 0.14, noise: 0.06, whine: 0.014, cutoff: [200, 1700],
      horn: { type: 'sawtooth', gain: 0.34, notes: [[131, 0, 1.25], [165, 0.01, 1.24], [196, 0.02, 1.22], [262, 0.02, 1.2]] }
    },
    emitters: {
      exhaustL: { type: 'smoke', when: 'engine', rate: 8 },
      exhaustR: { type: 'smoke', when: 'engine', rate: 8 },
      dust: { type: 'dust', when: 'driving', rate: 10 }
    },
    action: {
      id: 'show', label: 'Blikačky', icon: 'sparkle', duration: 4000, loop: true, sound: 'airhorn',
      parts: {},
      chase: true,
      emitAt: { exhaustL: [0, 1], exhaustR: [0, 1] }
    },
    art(p) {
      const M = '#e03131', D = '#9c1c1c', DD = '#6d1010';
      let s = `<defs>${bodyGrad(p + 'b', '#f24d4d', D)}</defs>`;
      s += A.shadow({ x: 320, rx: 240, ry: 14 });

      /* ---- podvozek ---- */
      s += `<rect x="140" y="196" width="352" height="16" rx="5" fill="#2b323d"/>`;
      s += `<rect x="134" y="198" width="12" height="46" rx="3" fill="#20252e"/>`;

      /* ---- kola (pod karoserií, aby vršek zajížděl pod blatník) ---- */
      [452, 300, 206].forEach((wx) => {
        s += A.wheel({ cx: wx, cy: 220, r: 42, style: 'road', lugs: 20, spokes: 8, rimColor: '#f4f7fb', rimR: 0.58, bolts: 10 });
      });
      s += A.emitter('dust', 250, 258);

      /* ---- blatníky ---- */
      s += A.fender({ cx: 452, cy: 220, r: 52, color: D, w: 15, from: 192, to: 346 });
      s += A.fender({ cx: 252, cy: 218, r: 58, color: D, w: 13, from: 204, to: 336 });

      /* ---- nádrž ---- */
      s += `<rect x="348" y="196" width="88" height="40" rx="20" fill="url(#gChrome)" stroke="#8b95a6" stroke-width="1.5"/>`;
      s += `<rect x="366" y="196" width="7" height="40" rx="3" fill="#7d8698" fill-opacity="0.8"/>`;
      s += `<rect x="412" y="196" width="7" height="40" rx="3" fill="#7d8698" fill-opacity="0.8"/>`;
      s += `<rect x="344" y="186" width="96" height="12" rx="5" fill="url(#gChromeH)"/>`;

      /* ---- spací nástavba ---- */
      s += `<path d="M 148 206 L 148 96 Q 148 82 163 82 L 214 82 L 214 206 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += A.glass(`M 163 104 a 11 11 0 0 1 22 0 a 11 11 0 0 1 -22 0 Z`, { tint: '#8fd0ee' });
      s += `<circle cx="174" cy="104" r="11" fill="none" stroke="#e9edf3" stroke-width="3"/>`;
      s += `<rect x="152" y="150" width="58" height="9" rx="4.5" fill="#e9edf3" fill-opacity="0.85"/>`;
      s += `<rect x="156" y="126" width="48" height="7" rx="3.5" fill="#7d1616" fill-opacity="0.35"/>`;

      /* ---- kabina ---- */
      s += `<path d="M 210 206 L 210 96 Q 210 82 226 82 L 344 82 Q 358 82 358 97 L 358 206 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += A.driver({ x: 320, y: 122, s: 0.86, cap: '#1d3f8f', shirt: '#f4f7fb' });
      s += A.glass(`M 288 96 L 348 96 L 350 152 L 288 152 Z`, { tint: '#a9dcf6' });
      s += `<path d="M 240 96 L 278 96 L 278 152 L 240 152 Z" fill="#7d1616" fill-opacity="0.35"/>`;
      s += `<rect x="238" y="160" width="112" height="9" rx="4.5" fill="#e9edf3" fill-opacity="0.9"/>`;
      s += `<rect x="292" y="158" width="26" height="7" rx="3.5" fill="url(#gChromeH)"/>`;

      /* ---- kapota ---- */
      s += `<path d="M 356 200 L 356 138 Q 356 126 370 124 L 466 118 Q 498 116 502 146 L 504 200 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 364 136 L 480 130" fill="none" stroke="#fff" stroke-opacity="0.35" stroke-width="6" stroke-linecap="round"/>`;
      s += `<rect x="358" y="160" width="146" height="8" rx="4" fill="url(#gChromeH)"/>`;
      /* boční průduchy */
      for (let i = 0; i < 3; i++) {
        s += `<rect x="${386 + i * 20}" y="176" width="12" height="16" rx="4" fill="#5c0f0f" fill-opacity="0.6"/>`;
      }

      /* ---- maska + nárazník ---- */
      s += A.grille({ x: 496, y: 126, w: 28, h: 68, bars: 9, rx: 8 });
      s += `<rect x="492" y="194" width="44" height="22" rx="7" fill="url(#gChromeH)" stroke="#7d8698" stroke-width="1.5"/>`;
      s += `<rect x="498" y="112" width="24" height="16" rx="6" fill="url(#gChromeH)"/>`;
      /* pouzdro světlometu na boku kapoty */
      s += `<rect x="466" y="152" width="30" height="40" rx="10" fill="url(#gChromeH)" stroke="#7d8698" stroke-width="1.5"/>`;

      /* ---- střecha + clona ---- */
      s += `<path d="M 146 82 L 360 82 L 356 68 L 152 68 Z" fill="${D}" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 348 70 L 392 60 L 392 76 L 350 84 Z" fill="url(#gChromeH)" stroke="#7d8698" stroke-width="1.5" stroke-linejoin="round"/>`;

      /* ---- vzduchové trumpety ---- */
      [268, 292].forEach((hx) => {
        s += `<path d="M ${hx} 68 L ${hx} 58 L ${hx + 30} 50 L ${hx + 30} 74 Z" fill="url(#gChromeH)" stroke="#7d8698" stroke-width="1.2" stroke-linejoin="round"/>`;
        s += `<rect x="${hx - 8}" y="58" width="10" height="12" rx="3" fill="url(#gChrome)"/>`;
      });

      /* ---- komíny ---- */
      [214, 236].forEach((sx, i) => {
        s += A.stack({ x: sx, yTop: 44, yBottom: 200, w: 13 });
        s += A.emitter(i ? 'exhaustR' : 'exhaustL', sx, 38);
      });

      /* ---- zrcátka ---- */
      s += `<path d="M 356 96 L 378 90" stroke="#8b95a6" stroke-width="4" stroke-linecap="round"/>`;
      s += `<rect x="372" y="76" width="13" height="30" rx="5" fill="url(#gChrome)" stroke="#7d8698" stroke-width="1.2"/>`;

      /* ---- světla ---- */
      s += A.lamp({ x: 481, y: 172, r: 12, len: 300, spread: 66 });
      s += A.lamp({ x: 512, y: 205, r: 6, len: 200, spread: 34 });
      s += A.tailLamp({ x: 144, y: 150, r: 7 });
      s += A.reverseLamp({ x: 144, y: 172, r: 6 });

      /* ---- obrysová světýlka (běhají při "blikačkách") ---- */
      let mi = 0;
      [304, 318, 332, 346].forEach((mx) => { s += A.marker({ x: mx, y: 74, r: 4.2, i: mi++ }); });
      [502, 512].forEach((mx) => { s += A.marker({ x: mx, y: 120, r: 3.6, i: mi++ }); });
      [498, 524].forEach((mx) => { s += A.marker({ x: mx, y: 205, r: 3.6, i: mi++, color: '#ffb52e' }); });
      [156, 156].forEach((mx, k) => { s += A.marker({ x: mx, y: 122 + k * 22, r: 3.4, i: mi++ }); });
      [418, 440].forEach((mx) => { s += A.marker({ x: mx, y: 184, r: 3.4, i: mi++ }); });

      return s;
    }
  };

  /* ===========================================================================
   *  5) KOMBAJN
   * =========================================================================*/
  const kombajn = {
    id: 'kombajn',
    name: 'Kombajn',
    subtitle: 'Poseká obilí a nasype zrní',
    emoji: '🌾',
    scene: 'obili',
    theme: { main: '#e5391f', dark: '#a41f0e', accent: '#ffd21e', ink: '#5f1105' },
    sound: {
      base: 48, saw: 0.30, square: 0.16, noise: 0.11, whine: 0.020, cutoff: [280, 1900],
      horn: { type: 'square', gain: 0.40, notes: [[440, 0, 0.42], [349, 0.34, 0.5]] }
    },
    spin: { reel: 190 },
    emitters: {
      exhaust: { type: 'smoke', when: 'engine', rate: 10 },
      dust: { type: 'dust', when: 'driving', rate: 16 },
      chaff: { type: 'wheat', when: 'action', rate: 46 },
      auger: { type: 'grain', when: 'action', rate: 40 },
      straw: { type: 'straw', when: 'action', rate: 20 }
    },
    action: {
      id: 'sklizen', label: 'Sklízet', icon: 'wheat', duration: 5200, loop: true, sound: 'thresh',
      parts: { auger: [[0, 0], [0.18, 24], [0.86, 24], [1, 0]] },
      spinBoost: 2.4,
      emitAt: { chaff: [0.02, 0.98], straw: [0.1, 0.98], auger: [0.26, 0.9] }
    },
    art(p) {
      const M = '#e5391f', D = '#a41f0e', DD = '#7a1408', Y = '#ffd21e', YD = '#d69a1e';
      let s = `<defs>${bodyGrad(p + 'b', '#f4523a', D)}${bodyGrad(p + 'y', '#ffdc55', YD)}</defs>`;
      s += A.shadow({ x: 300, rx: 244, ry: 14 });

      /* ---- žací lišta ---- */
      s += `<path d="M 356 168 L 398 194 L 398 234 L 356 214 Z" fill="#5a6373" stroke="#39414f" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 392 188 L 540 188 Q 552 188 552 200 L 552 236 Q 552 248 540 248 L 396 248 Q 390 248 390 240 Z" fill="url(#${p}y)" stroke="${YD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<rect x="396" y="200" width="150" height="8" rx="4" fill="#fff" fill-opacity="0.35"/>`;
      /* prstový řezací nůž */
      for (let i = 0; i < 16; i++) {
        const tx = 400 + i * 9.4;
        s += `<path d="M ${tx} 244 l 8 0 l -4 12 z" fill="#c8cfda" stroke="#8b95a6" stroke-width="1"/>`;
      }
      s += `<rect x="394" y="238" width="156" height="8" rx="4" fill="#5a6373"/>`;
      /* děliče */
      s += `<path d="M 548 236 L 560 212 L 556 240 Z" fill="#c8cfda" stroke="#8b95a6" stroke-width="1.5" stroke-linejoin="round"/>`;
      /* ramena motovidla */
      s += `<path d="M 404 196 L 468 174" stroke="#5a6373" stroke-width="8" stroke-linecap="round"/>`;
      s += `<path d="M 520 194 L 470 174" stroke="#5a6373" stroke-width="6" stroke-linecap="round"/>`;
      /* motovidlo – točí se */
      s += `<g data-spin="reel" data-pivot="470 172">`;
      s += `<circle cx="470" cy="172" r="38" fill="none" stroke="#8b95a6" stroke-width="3" stroke-dasharray="4 6"/>`;
      for (let i = 0; i < 6; i++) {
        const a = (360 / 6) * i;
        s += `<g transform="rotate(${a} 470 172)">`;
        s += `<line x1="470" y1="172" x2="470" y2="136" stroke="#8b95a6" stroke-width="4"/>`;
        s += `<rect x="454" y="128" width="32" height="9" rx="4" fill="${Y}" stroke="${YD}" stroke-width="1.5"/>`;
        for (let k = 0; k < 4; k++) {
          s += `<line x1="${458 + k * 8}" y1="137" x2="${458 + k * 8}" y2="149" stroke="#c8cfda" stroke-width="2.6" stroke-linecap="round"/>`;
        }
        s += `</g>`;
      }
      s += `<circle cx="470" cy="172" r="7" fill="#5a6373"/>`;
      s += `</g>`;
      s += A.emitter('chaff', 470, 226);

      /* ---- tělo ---- */
      s += `<path d="M 104 214 L 104 150 Q 104 136 120 136 L 356 136 L 356 214 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<rect x="104" y="196" width="252" height="9" rx="4.5" fill="${DD}" fill-opacity="0.55"/>`;
      s += `<rect x="108" y="146" width="180" height="7" rx="3.5" fill="#fff" fill-opacity="0.3"/>`;

      /* ---- zásobník zrna ---- */
      s += `<path d="M 152 136 L 152 82 Q 152 70 165 70 L 268 70 Q 280 70 280 82 L 280 136 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 156 82 q 62 -16 120 0 l 0 12 q -58 -14 -120 0 z" fill="url(#gGrain)" stroke="${YD}" stroke-width="1.5"/>`;
      for (let i = 0; i < 9; i++) {
        s += `<circle cx="${164 + i * 13}" cy="${76 + (i % 3) * 3}" r="2.6" fill="#ffe9a8"/>`;
      }

      /* ---- vykládací šnek (otáčí se kolem 196,96) ---- */
      s += `<g data-part="auger" data-pivot="196 96">`;
      s += `<path d="M 196 96 L 96 112" fill="none" stroke="#5a6373" stroke-width="19" stroke-linecap="round"/>`;
      s += `<path d="M 196 96 L 96 112" fill="none" stroke="#8b95a6" stroke-width="7" stroke-linecap="round" transform="translate(0 -4)"/>`;
      s += `<path d="M 88 106 L 104 104 L 108 128 L 90 130 Z" fill="#4a5464" stroke="#2b323d" stroke-width="2" stroke-linejoin="round"/>`;
      s += A.emitter('auger', 96, 130);
      s += `<circle cx="196" cy="96" r="9" fill="#4a5464"/>`;
      s += `</g>`;

      /* ---- kabina ---- */
      s += `<path d="M 268 136 L 268 96 Q 268 84 281 84 L 348 84 L 368 136 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += A.driver({ x: 310, y: 106, s: 0.76, cap: '#2f6fd0', shirt: '#ffd21e' });
      s += A.glass(`M 276 94 L 344 94 L 360 132 L 276 132 Z`, { tint: '#a9dcf6' });
      s += `<path d="M 264 84 L 356 84 L 352 74 L 268 74 Z" fill="${D}" stroke="${DD}" stroke-width="2" stroke-linejoin="round"/>`;

      /* ---- výfuk + drtič slámy ---- */
      s += A.stack({ x: 142, yTop: 100, yBottom: 138, w: 12, color: 'url(#gSteel)' });
      s += A.emitter('exhaust', 142, 94);
      s += `<path d="M 104 178 L 78 186 L 74 214 L 104 210 Z" fill="#5a6373" stroke="#39414f" stroke-width="2" stroke-linejoin="round"/>`;
      s += `<path d="M 78 190 L 100 186" stroke="#8b95a6" stroke-width="3"/>`;
      s += A.emitter('straw', 76, 204);

      /* ---- žebřík ---- */
      s += A.ladder({ x1: 246, y1: 214, x2: 246, y2: 250, steps: 3, w: 18, color: '#4a5464' });

      /* ---- kola ---- */
      s += A.wheel({ cx: 128, cy: 230, r: 32, style: 'agri', lugs: 12, spokes: 5, rimColor: '#f4f7fb', rimR: 0.5, bolts: 6 });
      s += A.wheel({ cx: 288, cy: 208, r: 54, style: 'agri', lugs: 16, spokes: 6, rimColor: '#f4f7fb', rimR: 0.46, bolts: 8 });
      s += A.emitter('dust', 288, 258);

      /* ---- světla ---- */
      s += A.lamp({ x: 352, y: 76, r: 8, len: 260, spread: 66 });
      s += A.lamp({ x: 546, y: 196, r: 7, len: 120, spread: 36 });
      s += A.tailLamp({ x: 108, y: 156, r: 6.5 });
      s += A.reverseLamp({ x: 108, y: 174, r: 6 });
      s += A.beacon({ x: 300, y: 74, w: 18, h: 13 });

      return s;
    }
  };

  /* ===========================================================================
   *  6) DOMÍCHÁVAČ BETONU
   * =========================================================================*/
  const domichavac = {
    id: 'domichavac',
    name: 'Domíchávač',
    subtitle: 'Točí bubnem a lije beton',
    emoji: '🛻',
    scene: 'stavba',
    theme: { main: '#f0541f', dark: '#a83a0c', accent: '#f2f5f9', ink: '#4a5464' },
    sound: {
      base: 42, saw: 0.32, square: 0.15, noise: 0.09, whine: 0.010, cutoff: [230, 1500],
      horn: { type: 'sawtooth', gain: 0.38, notes: [[196, 0, 0.55], [262, 0, 0.55]] }
    },
    emitters: {
      exhaust: { type: 'smoke', when: 'engine', rate: 9 },
      dust: { type: 'dust', when: 'driving', rate: 12 },
      concrete: { type: 'concrete', when: 'action', rate: 44 }
    },
    action: {
      id: 'lit', label: 'Lít beton', icon: 'pour', duration: 5400, loop: true, sound: 'pour',
      parts: { chute: [[0, 0], [0.18, -26], [0.88, -26], [1, 0]] },
      drumBoost: 3.2,
      emitAt: { concrete: [0.3, 0.92] }
    },
    /* buben se "otáčí" posunem šroubovic pod maskou */
    onFrame(ctx) {
      const el = ctx.els.drum;
      if (!el) return;
      const boost = ctx.actionActive ? (this.action.drumBoost || 1) : 1;
      ctx.store.drumX = ((ctx.store.drumX || 0) + ctx.dt * (26 + ctx.throttle * 44) * boost) % 46;
      el.setAttribute('transform', `translate(${-ctx.store.drumX.toFixed(2)} 0)`);
    },
    art(p) {
      const M = '#f0541f', D = '#c23f10', W = '#f2f5f9', WD = '#c4ccd8';
      const drumShape = 'M -132 -28 Q -104 -54 -52 -56 L 46 -56 Q 110 -56 110 -12 L 110 12 Q 110 56 46 56 L -52 56 Q -104 54 -132 28 Q -142 0 -132 -28 Z';
      let s = `<defs>${bodyGrad(p + 'b', '#ff7a3d', D)}${bodyGrad(p + 'w', '#ffffff', WD)}
        <clipPath id="${p}drum"><path d="${drumShape}"/></clipPath>
      </defs>`;
      s += A.shadow({ x: 310, rx: 236, ry: 14 });

      /* ---- podvozek ---- */
      s += `<rect x="136" y="198" width="352" height="18" rx="6" fill="#39414f"/>`;
      s += `<rect x="130" y="200" width="12" height="44" rx="3" fill="#20252e"/>`;

      /* ---- skluz (otáčí se kolem 140,178) ---- */
      s += `<g data-part="chute" data-pivot="140 178">`;
      s += `<path d="M 140 178 L 66 206" fill="none" stroke="#8b95a6" stroke-width="22" stroke-linecap="round"/>`;
      s += `<path d="M 140 178 L 66 206" fill="none" stroke="#5a6373" stroke-width="13" stroke-linecap="round"/>`;
      s += `<path d="M 138 172 L 68 199" fill="none" stroke="#e0e6ef" stroke-width="4" stroke-linecap="round"/>`;
      s += `<path d="M 58 200 L 76 194 L 82 210 L 62 216 Z" fill="#6f7889" stroke="#4a5464" stroke-width="2" stroke-linejoin="round"/>`;
      s += A.emitter('concrete', 62, 214);
      s += `</g>`;

      /* ---- nosná konstrukce bubnu ---- */
      s += `<path d="M 158 200 L 176 150 L 196 152 L 180 200 Z" fill="#5a6373"/>`;
      s += `<path d="M 340 198 L 352 140 L 372 144 L 360 198 Z" fill="#5a6373"/>`;

      /* ---- BUBEN ---- */
      s += `<g transform="translate(256 150) rotate(-10)">`;
      s += `<path d="${drumShape}" fill="url(#${p}w)" stroke="#98a1b0" stroke-width="3" stroke-linejoin="round"/>`;
      /* šroubovice pod maskou */
      s += `<g clip-path="url(#${p}drum)"><g data-drum="1">`;
      for (let i = -8; i < 12; i++) {
        const x = i * 46;
        s += `<path d="M ${x} -72 Q ${x + 20} 0 ${x + 40} 72" fill="none" stroke="${M}" stroke-width="11" stroke-linecap="round"/>`;
        s += `<path d="M ${x + 22} -72 Q ${x + 42} 0 ${x + 62} 72" fill="none" stroke="${D}" stroke-width="4" stroke-linecap="round" opacity="0.5"/>`;
      }
      s += `</g></g>`;
      /* obruče a lesk */
      s += `<path d="M -60 -56 Q -72 0 -60 56" fill="none" stroke="#7d8698" stroke-width="7"/>`;
      s += `<path d="M 40 -56 Q 28 0 40 56" fill="none" stroke="#7d8698" stroke-width="7"/>`;
      s += `<path d="${drumShape}" fill="none" stroke="#000" stroke-opacity="0.2" stroke-width="2"/>`;
      s += `<path d="M -110 -32 Q -60 -46 30 -44" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="8" stroke-linecap="round"/>`;
      /* otvor bubnu vlevo */
      s += `<ellipse cx="-134" cy="0" rx="12" ry="28" fill="#3a424f"/>`;
      s += `<ellipse cx="-131" cy="0" rx="8" ry="22" fill="#20252e"/>`;
      s += `</g>`;

      /* ---- zadní světelný panel ---- */
      s += `<rect x="124" y="192" width="18" height="40" rx="6" fill="#39414f"/>`;
      /* nádrž na vodu */
      s += `<rect x="352" y="176" width="42" height="26" rx="12" fill="url(#gChrome)" stroke="#8b95a6" stroke-width="1.5"/>`;

      /* ---- kabina ---- */
      s += `<path d="M 388 212 L 388 118 Q 388 104 403 104 L 490 104 Q 506 104 508 120 L 514 196 L 514 212 Z" fill="url(#${p}b)" stroke="#8a2c08" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += A.driver({ x: 448, y: 140, s: 0.86, cap: '#f2f5f9', shirt: '#2b323d' });
      s += A.glass(`M 400 116 L 492 116 L 500 164 L 400 164 Z`, { tint: '#a9dcf6' });
      s += `<rect x="396" y="172" width="104" height="9" rx="4.5" fill="#fff" fill-opacity="0.5"/>`;
      s += `<rect x="392" y="186" width="120" height="9" rx="4.5" fill="#2b323d" fill-opacity="0.35"/>`;
      s += A.grille({ x: 500, y: 176, w: 16, h: 26, bars: 4, rx: 5, frame: '#d8dee8', color: '#20252e' });
      s += `<path d="M 386 100 L 512 100 L 508 90 L 390 90 Z" fill="${D}"/>`;
      /* zrcátko */
      s += `<path d="M 512 118 L 528 112" stroke="#6f7889" stroke-width="4" stroke-linecap="round"/>`;
      s += `<rect x="524" y="104" width="12" height="24" rx="4" fill="#5a6373"/>`;

      /* ---- blatníky ---- */
      s += A.fender({ cx: 466, cy: 222, r: 54, color: D, w: 12, from: 196, to: 344 });

      /* ---- kola ---- */
      s += A.wheel({ cx: 466, cy: 226, r: 36, style: 'road', lugs: 18, spokes: 6, rimColor: '#e9edf3', rimR: 0.55, bolts: 8 });
      s += A.wheel({ cx: 276, cy: 226, r: 36, style: 'road', lugs: 18, spokes: 6, rimColor: '#e9edf3', rimR: 0.55, bolts: 8 });
      s += A.wheel({ cx: 194, cy: 226, r: 36, style: 'road', lugs: 18, spokes: 6, rimColor: '#e9edf3', rimR: 0.55, bolts: 8 });
      s += A.emitter('dust', 235, 258);

      /* ---- výfuk ---- */
      s += A.stack({ x: 378, yTop: 118, yBottom: 198, w: 12, color: 'url(#gSteel)' });
      s += A.emitter('exhaust', 378, 112);

      /* ---- světla ---- */
      s += A.lamp({ x: 508, y: 176, r: 8, len: 250, spread: 56 });
      s += A.tailLamp({ x: 133, y: 203, r: 6.5 });
      s += A.reverseLamp({ x: 133, y: 221, r: 6 });
      s += A.beacon({ x: 440, y: 92, w: 18, h: 13 });

      return s;
    }
  };

  /* ===========================================================================
   *  7) ROLBA
   * =========================================================================*/
  const rolba = {
    id: 'rolba',
    name: 'Rolba',
    subtitle: 'Uhladí led na stadionu',
    emoji: '⛸️',
    scene: 'led',
    theme: { main: '#2f6fd0', dark: '#1b4a94', accent: '#ffd21e', ink: '#10305f' },
    sound: {
      base: 62, saw: 0.24, square: 0.12, noise: 0.06, whine: 0.016, cutoff: [320, 1800],
      horn: { type: 'sawtooth', gain: 0.36, notes: [[147, 0, 0.85], [196, 0, 0.85]] }
    },
    spin: { brush: 520 },
    emitters: {
      exhaust: { type: 'smoke', when: 'engine', rate: 7 },
      snow: { type: 'snow', when: 'action', rate: 44 },
      water: { type: 'water', when: 'action', rate: 38 }
    },
    action: {
      id: 'led', label: 'Hladit led', icon: 'snow', duration: 5000, loop: true, sound: 'spray',
      parts: { conditioner: [[0, 0], [0.15, 6], [0.9, 6], [1, 0]] },
      polish: true,
      spinBoost: 2.2,
      emitAt: { snow: [0.08, 0.96], water: [0.14, 0.98] }
    },
    art(p) {
      const M = '#2f6fd0', D = '#1b4a94', DD = '#10305f', W = '#f2f5f9';
      let s = `<defs>${bodyGrad(p + 'b', '#4a8ae8', D)}${bodyGrad(p + 't', '#78b4f5', '#2f6fd0')}</defs>`;
      s += A.shadow({ x: 296, rx: 208, ry: 12 });

      /* ---- kondicionér (hladicí jednotka vzadu) ---- */
      s += `<g data-part="conditioner" data-pivot="262 230">`;
      s += `<path d="M 262 228 L 128 232 Q 116 232 116 244 L 118 258 L 264 252 Z" fill="#5a6373" stroke="#39414f" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<rect x="118" y="248" width="146" height="8" rx="4" fill="#c8cfda"/>`;
      s += `<path d="M 126 232 L 126 250 M 176 231 L 176 250 M 226 230 L 226 249" stroke="#8b95a6" stroke-width="3.5"/>`;
      /* rozstřikovací trubka */
      s += `<rect x="120" y="222" width="150" height="9" rx="4.5" fill="#8b95a6"/>`;
      s += A.emitter('water', 134, 252);
      s += A.emitter('snow', 250, 240);
      s += `</g>`;

      /* ---- podvozek ---- */
      s += `<rect x="140" y="210" width="316" height="18" rx="6" fill="#2b323d"/>`;

      /* ---- kola (vršek zajíždí pod karoserii) ---- */
      s += A.wheel({ cx: 420, cy: 234, r: 28, style: 'road', lugs: 16, spokes: 5, rimColor: '#e9edf3', rimR: 0.5, bolts: 6 });
      s += A.wheel({ cx: 186, cy: 236, r: 26, style: 'road', lugs: 14, spokes: 5, rimColor: '#e9edf3', rimR: 0.5, bolts: 6 });

      /* ---- hlavní tělo ---- */
      s += `<path d="M 122 234 L 122 176 Q 122 162 138 162 L 440 162 Q 462 162 466 182 L 474 226 Q 476 238 462 238 L 134 238 Q 122 238 122 234 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<rect x="126" y="200" width="342" height="13" rx="6" fill="${W}" fill-opacity="0.92"/>`;
      s += `<rect x="126" y="215" width="342" height="7" rx="3.5" fill="#e63946" fill-opacity="0.92"/>`;
      s += `<rect x="130" y="168" width="290" height="7" rx="3.5" fill="#fff" fill-opacity="0.30"/>`;

      /* ---- sněhová vana nahoře (typický tvar rolby) ---- */
      s += `<path d="M 176 162 L 176 104 Q 176 90 192 90 L 372 90 Q 400 90 408 116 L 424 162 Z" fill="url(#${p}t)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 188 104 L 366 104" stroke="#fff" stroke-opacity="0.5" stroke-width="7" stroke-linecap="round"/>`;
      s += `<path d="M 180 150 L 416 150" stroke="${DD}" stroke-opacity="0.35" stroke-width="5" stroke-linecap="round"/>`;
      /* hvězdička jako ozdoba */
      s += `<path d="M 300 112 l 6.5 15 l 16 1 l -12 11 l 4 16 l -14.5 -8.6 l -14.5 8.6 l 4 -16 l -12 -11 l 16 -1 z" fill="#ffd21e" stroke="#d69a1e" stroke-width="1.6" stroke-linejoin="round"/>`;

      /* ---- stanoviště řidiče vzadu nahoře ---- */
      s += `<path d="M 126 162 L 126 118 Q 126 108 138 108 L 178 108 L 178 162 Z" fill="${D}" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += A.driver({ x: 152, y: 118, s: 0.78, cap: '#e63946', shirt: '#ffd21e' });
      s += `<path d="M 120 108 L 120 158" stroke="#c8cfda" stroke-width="5" stroke-linecap="round"/>`;
      s += `<path d="M 120 108 L 184 108" stroke="#c8cfda" stroke-width="5" stroke-linecap="round"/>`;
      s += `<path d="M 120 132 L 184 132" stroke="#c8cfda" stroke-width="3.5" stroke-linecap="round"/>`;
      /* volant */
      s += `<path d="M 182 156 L 190 136" stroke="#39414f" stroke-width="5" stroke-linecap="round"/>`;
      s += `<ellipse cx="191" cy="132" rx="13" ry="5" fill="none" stroke="#2b323d" stroke-width="4"/>`;

      /* ---- přední sběrač sněhu + šnek ---- */
      s += `<path d="M 424 176 L 462 176 L 472 246 L 432 250 Z" fill="${D}" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 430 190 L 466 190 M 432 206 L 468 206 M 434 222 L 470 222" stroke="#78b4f5" stroke-width="4" stroke-linecap="round"/>`;
      s += `<path d="M 428 238 Q 452 232 476 240 L 480 256 L 430 258 Z" fill="#5a6373" stroke="#39414f" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<g data-spin="brush" data-pivot="452 246">`;
      for (let i = 0; i < 8; i++) {
        s += `<line x1="452" y1="246" x2="452" y2="234" stroke="#c8cfda" stroke-width="3.4" stroke-linecap="round" transform="rotate(${i * 45} 452 246)"/>`;
      }
      s += `<circle cx="452" cy="246" r="6" fill="#8b95a6"/>`;
      s += `</g>`;
      s += `<rect x="426" y="250" width="56" height="9" rx="4" fill="#8b95a6"/>`;

      /* ---- nádrž na vodu ---- */
      s += `<rect x="212" y="172" width="112" height="30" rx="14" fill="url(#gChrome)" stroke="#8b95a6" stroke-width="1.5" opacity="0.9"/>`;
      s += `<rect x="228" y="172" width="7" height="30" rx="3" fill="#7d8698" fill-opacity="0.7"/>`;
      s += `<rect x="300" y="172" width="7" height="30" rx="3" fill="#7d8698" fill-opacity="0.7"/>`;

      /* ---- výfuk ---- */
      s += A.stack({ x: 350, yTop: 64, yBottom: 96, w: 11, color: 'url(#gSteel)' });
      s += A.emitter('exhaust', 350, 58);

      /* ---- světla ---- */
      s += A.lamp({ x: 464, y: 186, r: 8, len: 230, spread: 52 });
      s += A.tailLamp({ x: 128, y: 190, r: 6.5 });
      s += A.reverseLamp({ x: 128, y: 172, r: 6 });
      s += A.beacon({ x: 292, y: 88, w: 20, h: 14 });

      return s;
    }
  };

  /* ===========================================================================
   *  8) ČTYŘKOLKA
   * =========================================================================*/
  const ctyrkolka = {
    id: 'ctyrkolka',
    name: 'Čtyřkolka',
    subtitle: 'Prohání se blátem',
    emoji: '🛞',
    scene: 'teren',
    theme: { main: '#8bc93e', dark: '#5a9c1e', accent: '#1c2129', ink: '#2e4a12' },
    sound: {
      base: 56, saw: 0.30, square: 0.20, noise: 0.10, whine: 0.016, cutoff: [300, 1900], lfoDiv: 2.6,
      horn: { type: 'square', gain: 0.34, notes: [[660, 0, 0.12], [660, 0.18, 0.12]] }
    },
    emitters: {
      exhaust: { type: 'smoke', when: 'engine', rate: 6 },
      dust: { type: 'dust', when: 'driving', rate: 20 },
      mud: { type: 'mud', when: 'action', rate: 40 }
    },
    action: {
      id: 'bahno', label: 'Bláto', icon: 'mud', duration: 2600, loop: true, sound: 'spray',
      parts: { rack: [[0, 0], [0.14, -10], [0.5, -10], [0.64, 4], [1, 0]] },
      emitAt: { mud: [0, 1] }
    },
    art(p) {
      const M = '#8bc93e', D = '#5a9c1e', DD = '#3c6e12', K = '#1c2129';
      let s = `<defs>${bodyGrad(p + 'b', '#a3e058', D)}</defs>`;
      s += A.shadow({ x: 280, rx: 210, ry: 13 });

      /* rám a podlaha */
      s += `<rect x="185" y="206" width="190" height="20" rx="8" fill="${K}"/>`;

      /* zadní nosič + madlo */
      s += `<path d="M 122 176 L 122 150 Q 122 140 134 140 L 150 140 Q 160 140 160 150 L 160 176" fill="none" stroke="${K}" stroke-width="8" stroke-linecap="round"/>`;
      s += `<rect x="118" y="176" width="80" height="14" rx="6" fill="${DD}"/>`;
      s += `<rect x="126" y="164" width="64" height="10" rx="5" fill="${D}"/>`;

      /* sedlo + řidič */
      s += `<path d="M 210 200 L 210 172 Q 210 162 222 160 L 300 158 Q 314 158 316 170 L 318 200 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += A.driver({ x: 262, y: 156, s: 0.86, cap: '#1c2129', shirt: '#e63946' });

      /* tělo kolem motoru */
      s += `<path d="M 200 206 L 200 182 Q 200 172 212 172 L 340 172 Q 356 172 358 188 L 360 206 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<rect x="222" y="184" width="90" height="7" rx="3.5" fill="${DD}" fill-opacity="0.5"/>`;

      /* výfuk */
      s += `<rect x="150" y="206" width="60" height="14" rx="7" fill="url(#gSteel)"/>`;
      s += A.emitter('exhaust', 152, 213);

      /* přední nosič a blatník – pohyblivá část ("bláto") */
      s += `<g data-part="rack" data-pivot="358 178">`;
      s += `<path d="M 356 188 Q 356 152 392 150 Q 428 150 430 186" fill="${M}" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<rect x="352" y="150" width="70" height="14" rx="6" fill="${DD}"/>`;
      s += `<rect x="362" y="138" width="50" height="10" rx="5" fill="${D}"/>`;
      s += A.lamp({ x: 420, y: 168, r: 8, len: 220, spread: 50 });
      s += `<path d="M 366 150 L 350 118 M 366 150 L 386 116" stroke="${K}" stroke-width="7" stroke-linecap="round" fill="none"/>`;
      s += `<rect x="338" y="110" width="20" height="10" rx="5" fill="${K}"/>`;
      s += `<rect x="378" y="108" width="20" height="10" rx="5" fill="${K}"/>`;
      s += `</g>`;

      /* kola */
      s += A.wheel({ cx: 165, cy: 222, r: 52, style: 'agri', lugs: 14, spokes: 5, rimColor: '#e9edf3', rimR: 0.42, bolts: 6 });
      s += A.wheel({ cx: 395, cy: 222, r: 48, style: 'agri', lugs: 14, spokes: 5, rimColor: '#e9edf3', rimR: 0.42, bolts: 6 });
      s += A.emitter('dust', 165, 258);
      s += A.emitter('mud', 165, 250);

      /* světla */
      s += A.tailLamp({ x: 122, y: 168, r: 6 });
      s += A.reverseLamp({ x: 138, y: 168, r: 5.5 });

      return s;
    }
  };

  /* ===========================================================================
   *  9) MOTORKA
   * =========================================================================*/
  const motorka = {
    id: 'motorka',
    name: 'Motorka',
    subtitle: 'Umí i kolečko',
    emoji: '🏍️',
    scene: 'silnice',
    theme: { main: '#3b4552', dark: '#20252e', accent: '#e63946', ink: '#0e1116' },
    sound: {
      base: 60, saw: 0.34, square: 0.10, noise: 0.08, whine: 0.020, cutoff: [280, 2000], lfoDiv: 2.0, lfoDepth: 0.22,
      horn: { type: 'square', gain: 0.30, notes: [[740, 0, 0.12], [740, 0.16, 0.12]] }
    },
    emitters: {
      exhaust: { type: 'smoke', when: 'engine', rate: 8 },
      dust: { type: 'dust', when: 'driving', rate: 12 },
      burst: { type: 'smoke', when: 'action', rate: 44 }
    },
    action: {
      id: 'kolecko', label: 'Kolečko', icon: 'wheelie', duration: 2400, loop: true, sound: 'spray',
      parts: { frontFork: [[0, 0], [0.16, -12], [0.6, -12], [0.8, 4], [1, 0]] },
      emitAt: { burst: [0, 0.24] }
    },
    art(p) {
      const M = '#3b4552', D = '#20252e', DD = '#0e1116', R = '#e63946';
      let s = `<defs>${bodyGrad(p + 'b', '#4f5a68', D)}</defs>`;
      s += A.shadow({ x: 290, rx: 220, ry: 13 });

      /* rám (statický, pod vidlicí) */
      s += `<path d="M 150 224 Q 200 200 250 205 L 300 190 Q 330 176 372 172" fill="none" stroke="${DD}" stroke-width="10" stroke-linecap="round"/>`;

      /* motor */
      s += `<rect x="228" y="192" width="66" height="42" rx="8" fill="url(#gSteel)" stroke="${DD}" stroke-width="2"/>`;
      s += `<rect x="238" y="200" width="8" height="26" fill="${DD}" opacity="0.5"/>`;
      s += `<rect x="252" y="200" width="8" height="26" fill="${DD}" opacity="0.5"/>`;
      s += `<rect x="266" y="200" width="8" height="26" fill="${DD}" opacity="0.5"/>`;

      /* výfuk */
      s += `<path d="M 260 228 Q 200 240 176 234" fill="none" stroke="url(#gChromeH)" stroke-width="11" stroke-linecap="round"/>`;
      s += A.emitter('exhaust', 176, 234);
      s += A.emitter('burst', 150, 250);

      /* nádrž */
      s += `<path d="M 288 178 Q 285 150 305 145 L 355 142 Q 372 142 373 158 L 370 182 Q 330 190 288 178 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 300 156 L 358 152" fill="none" stroke="${R}" stroke-width="5" stroke-linecap="round"/>`;

      /* sedlo */
      s += `<path d="M 210 194 Q 208 182 224 180 L 292 178 L 294 194 Q 250 202 210 194 Z" fill="${DD}"/>`;
      s += A.driver({ x: 268, y: 152, s: 0.82, cap: '#e63946', shirt: '#20252e' });

      /* zadní kolo */
      s += A.wheel({ cx: 150, cy: 224, r: 46, style: 'road', lugs: 18, spokes: 6, rimColor: '#e9edf3', rimR: 0.42, bolts: 8 });
      s += A.emitter('dust', 150, 258);

      /* přední vidlice + kolo – pohyblivá skupina ("kolečko") */
      s += `<g data-part="frontFork" data-pivot="372 172">`;
      s += `<path d="M 372 172 L 430 224" fill="none" stroke="url(#gChromeH)" stroke-width="9" stroke-linecap="round"/>`;
      s += `<path d="M 376 168 L 422 214" fill="none" stroke="#fff" stroke-opacity="0.25" stroke-width="3" stroke-linecap="round"/>`;
      s += `<path d="M 412 200 Q 428 196 438 206" fill="none" stroke="${DD}" stroke-width="10" stroke-linecap="round"/>`;
      s += A.wheel({ cx: 430, cy: 224, r: 44, style: 'road', lugs: 18, spokes: 6, rimColor: '#e9edf3', rimR: 0.42, bolts: 8 });
      s += `<path d="M 358 158 L 340 128 M 358 158 L 380 130" stroke="${DD}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
      s += `<rect x="328" y="120" width="18" height="9" rx="4.5" fill="${DD}"/>`;
      s += `<rect x="374" y="122" width="18" height="9" rx="4.5" fill="${DD}"/>`;
      s += `<path d="M 392 126 L 408 118" stroke="#8b95a6" stroke-width="4" stroke-linecap="round"/>`;
      s += `<rect x="404" y="110" width="10" height="14" rx="4" fill="#5a6373"/>`;
      s += A.lamp({ x: 370, y: 176, r: 9, len: 230, spread: 50 });
      s += `</g>`;

      s += A.tailLamp({ x: 152, y: 200, r: 6 });
      s += A.reverseLamp({ x: 168, y: 200, r: 5.5 });

      return s;
    }
  };

  /* ===========================================================================
   *  10) MULTIVAN
   * =========================================================================*/
  const multivan = {
    id: 'multivan',
    name: 'Multivan',
    subtitle: 'Sveze celou rodinu',
    emoji: '🚐',
    scene: 'mesto',
    theme: { main: '#5b7fa6', dark: '#3a5675', accent: '#f4f7fb', ink: '#1e3247' },
    sound: {
      base: 40, saw: 0.30, square: 0.14, noise: 0.06, whine: 0.008, cutoff: [210, 1400],
      horn: { type: 'square', gain: 0.34, notes: [[440, 0, 0.22], [349, 0.28, 0.26]] }
    },
    emitters: {
      exhaust: { type: 'smoke', when: 'engine', rate: 7 },
      dust: { type: 'dust', when: 'driving', rate: 8 }
    },
    action: {
      id: 'dvere', label: 'Dveře', icon: 'door', duration: 3600, loop: true, sound: 'hydraulic',
      parts: { slideDoor: [[0, 0], [0.18, 12], [0.82, 12], [1, 0]] }
    },
    art(p) {
      const M = '#5b7fa6', D = '#3a5675', DD = '#25384b', W = '#f4f7fb';
      let s = `<defs>${bodyGrad(p + 'b', '#7096bb', D)}</defs>`;
      s += A.shadow({ x: 300, rx: 220, ry: 13 });

      /* kola pod karoserií */
      s += A.wheel({ cx: 430, cy: 224, r: 42, style: 'road', lugs: 16, spokes: 6, rimColor: '#e9edf3', rimR: 0.55, bolts: 8 });
      s += A.wheel({ cx: 178, cy: 224, r: 42, style: 'road', lugs: 16, spokes: 6, rimColor: '#e9edf3', rimR: 0.55, bolts: 8 });
      s += A.emitter('dust', 300, 258);
      s += A.fender({ cx: 430, cy: 224, r: 52, color: D, w: 13, from: 196, to: 344 });
      s += A.fender({ cx: 178, cy: 224, r: 52, color: D, w: 13, from: 200, to: 340 });

      /* karoserie – boxatý tvar */
      s += `<path d="M 124 224 L 124 130 Q 124 112 142 112 L 468 112 Q 490 112 494 134 L 500 200 Q 500 224 486 224 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<rect x="124" y="196" width="376" height="9" rx="4.5" fill="${DD}" fill-opacity="0.5"/>`;
      s += `<rect x="130" y="118" width="360" height="7" rx="3.5" fill="#fff" fill-opacity="0.28"/>`;

      /* čelní maska + světla */
      s += A.grille({ x: 470, y: 158, w: 22, h: 34, bars: 5, rx: 6, frame: '#d8dee8', color: '#20252e' });
      s += A.lamp({ x: 496, y: 160, r: 9, len: 240, spread: 54 });

      /* čelní sklo */
      s += A.glass(`M 440 118 L 470 118 L 486 152 L 448 152 Z`, { tint: '#a9dcf6' });

      /* boční okno u řidiče */
      s += A.glass(`M 300 120 L 430 120 L 430 152 L 300 152 Z`, { tint: '#a9dcf6' });

      /* interiér za posuvnými dveřmi – vidět po otevření */
      s += `<rect x="205" y="122" width="84" height="98" rx="4" fill="${DD}" opacity="0.5"/>`;
      s += `<circle cx="232" cy="172" r="12" fill="#e0c9a0"/><rect x="222" y="182" width="20" height="24" rx="6" fill="#8b6a46"/>`;

      /* posuvné dveře – pohyblivá skupina */
      s += `<g data-part="slideDoor" data-pivot="291 220">`;
      s += `<path d="M 205 220 L 205 122 Q 205 120 208 120 L 288 120 L 288 220 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += A.glass(`M 214 128 L 280 128 L 280 156 L 214 156 Z`, { tint: '#a9dcf6' });
      s += `<rect x="214" y="176" width="66" height="7" rx="3.5" fill="${DD}"/>`;
      s += `<rect x="240" y="164" width="14" height="7" rx="3.5" fill="${W}"/>`;
      s += `</g>`;

      s += A.driver({ x: 360, y: 148, s: 0.78, cap: '#274156', shirt: '#f4f7fb' });

      /* výfuk */
      s += A.stack({ x: 150, yTop: 210, yBottom: 226, w: 10, color: 'url(#gSteel)' });
      s += A.emitter('exhaust', 148, 208);

      /* zrcátko */
      s += `<path d="M 494 148 L 512 142" stroke="#3b4c66" stroke-width="4" stroke-linecap="round"/>`;
      s += `<rect x="506" y="132" width="12" height="20" rx="4" fill="#3b4c66"/>`;

      s += A.tailLamp({ x: 130, y: 150, r: 6.5 });
      s += A.reverseLamp({ x: 130, y: 168, r: 6 });

      return s;
    }
  };

  /* ===========================================================================
   *  11) DACIA BIGSTER
   * =========================================================================*/
  const bigster = {
    id: 'bigster',
    name: 'Dacia Bigster',
    subtitle: 'Vyrazí do terénu',
    emoji: '🚙',
    scene: 'teren',
    theme: { main: '#7a8c5c', dark: '#57623f', accent: '#2b323d', ink: '#3a4326' },
    sound: {
      base: 46, saw: 0.34, square: 0.18, noise: 0.09, whine: 0.010, cutoff: [230, 1500],
      horn: { type: 'square', gain: 0.36, notes: [[392, 0, 0.28], [392, 0.34, 0.3]] }
    },
    emitters: {
      exhaust: { type: 'smoke', when: 'engine', rate: 8 },
      dust: { type: 'dust', when: 'driving', rate: 16 },
      mudF: { type: 'mud', when: 'action', rate: 26 },
      mudR: { type: 'mud', when: 'action', rate: 26 }
    },
    action: {
      id: 'teren', label: 'Terén', icon: 'mountain', duration: 3200, loop: true, sound: 'spray',
      parts: { skid: [[0, 0], [0.16, -6], [0.5, -6], [0.66, 3], [1, 0]] },
      emitAt: { mudF: [0, 1], mudR: [0, 1] }
    },
    art(p) {
      const M = '#7a8c5c', D = '#57623f', DD = '#3a4326', K = '#2b323d';
      let s = `<defs>${bodyGrad(p + 'b', '#93a675', D)}</defs>`;
      s += A.shadow({ x: 300, rx: 224, ry: 14 });

      s += A.wheel({ cx: 425, cy: 220, r: 46, style: 'road', lugs: 18, spokes: 6, rimColor: '#dfe5ee', rimR: 0.5, bolts: 8 });
      s += A.wheel({ cx: 175, cy: 220, r: 46, style: 'road', lugs: 18, spokes: 6, rimColor: '#dfe5ee', rimR: 0.5, bolts: 8 });
      s += A.emitter('dust', 300, 258);

      /* černé plastové obložení dole */
      s += `<path d="M 130 222 L 470 222 L 466 198 L 134 198 Z" fill="${K}"/>`;

      /* karoserie */
      s += `<path d="M 140 200 L 140 148 Q 140 138 150 134 L 220 118 Q 300 108 380 118 L 440 136 Q 460 142 462 158 L 466 200 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<rect x="140" y="180" width="326" height="8" rx="4" fill="${DD}" fill-opacity="0.45"/>`;

      /* přední maska */
      s += A.grille({ x: 442, y: 152, w: 20, h: 30, bars: 5, rx: 5, frame: '#c8cfda', color: '#20252e' });
      s += A.lamp({ x: 464, y: 156, r: 8, len: 230, spread: 50 });

      /* okna */
      s += A.glass(`M 232 122 L 300 116 L 336 122 L 336 156 L 232 156 Z`, { tint: '#a9dcf6' });
      s += A.glass(`M 344 122 L 424 138 L 440 158 L 344 158 Z`, { tint: '#a9dcf6' });
      s += `<rect x="336" y="116" width="8" height="42" fill="${DD}"/>`;

      s += A.driver({ x: 400, y: 138, s: 0.72, cap: '#3a4326', shirt: '#e8e2d0' });

      /* střešní ližiny */
      s += `<rect x="210" y="112" width="150" height="6" rx="3" fill="#8b95a6"/>`;
      s += `<rect x="220" y="106" width="8" height="10" fill="#8b95a6"/><rect x="330" y="106" width="8" height="10" fill="#8b95a6"/>`;

      /* podvozkový kryt – nepatrně se naklápí ("terén") */
      s += `<g data-part="skid" data-pivot="450 200">`;
      s += `<path d="M 420 202 L 470 202 L 462 218 L 424 218 Z" fill="#39414f" stroke="#20252e" stroke-width="2" stroke-linejoin="round"/>`;
      s += `</g>`;

      s += A.fender({ cx: 425, cy: 220, r: 56, color: K, w: 14, from: 198, to: 342 });
      s += A.fender({ cx: 175, cy: 220, r: 56, color: K, w: 14, from: 202, to: 338 });

      s += A.stack({ x: 154, yTop: 208, yBottom: 224, w: 11, color: 'url(#gSteel)' });
      s += A.emitter('exhaust', 152, 206);
      s += A.emitter('mudF', 425, 254);
      s += A.emitter('mudR', 175, 254);

      s += A.tailLamp({ x: 144, y: 150, r: 6.5 });
      s += A.reverseLamp({ x: 144, y: 168, r: 6 });

      return s;
    }
  };

  /* ===========================================================================
   *  12) ŠKODA SUPERB
   * =========================================================================*/
  const superb = {
    id: 'superb',
    name: 'Škoda Superb',
    subtitle: 'Elegantní jízda',
    emoji: '🚗',
    scene: 'mesto',
    theme: { main: '#274156', dark: '#182a38', accent: '#c8cfda', ink: '#0e1b26' },
    sound: {
      base: 38, saw: 0.26, square: 0.12, noise: 0.05, whine: 0.007, cutoff: [200, 1350],
      horn: { type: 'triangle', gain: 0.30, notes: [[523, 0, 0.16], [659, 0.18, 0.22]] }
    },
    emitters: {
      exhaust: { type: 'smoke', when: 'engine', rate: 6 },
      dust: { type: 'dust', when: 'driving', rate: 6 }
    },
    action: {
      id: 'kufr', label: 'Kufr', icon: 'trunk', duration: 3400, loop: true, sound: 'hydraulic',
      parts: { trunkLid: [[0, 0], [0.18, -25], [0.82, -25], [1, 0]] }
    },
    art(p) {
      const M = '#274156', D = '#182a38', DD = '#0e1b26', C = '#c8cfda';
      let s = `<defs>${bodyGrad(p + 'b', '#375a75', D)}</defs>`;
      s += A.shadow({ x: 300, rx: 226, ry: 13 });

      s += A.wheel({ cx: 430, cy: 222, r: 40, style: 'road', lugs: 20, spokes: 8, rimColor: '#e9edf3', rimR: 0.56, bolts: 10 });
      s += A.wheel({ cx: 185, cy: 222, r: 40, style: 'road', lugs: 20, spokes: 8, rimColor: '#e9edf3', rimR: 0.56, bolts: 10 });
      s += A.emitter('dust', 300, 258);
      s += A.fender({ cx: 430, cy: 222, r: 48, color: D, w: 11, from: 200, to: 340 });
      s += A.fender({ cx: 185, cy: 222, r: 48, color: D, w: 11, from: 202, to: 338 });

      /* zadní blatník (statický) */
      s += `<path d="M 148 224 L 148 178 Q 150 170 160 168 L 226 166 L 226 224 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      /* zavazadlo uvnitř kufru – vidět po otevření */
      s += `<rect x="160" y="196" width="46" height="22" rx="4" fill="#8b5e34"/>`;
      s += `<rect x="166" y="190" width="26" height="10" rx="3" fill="#a97a45"/>`;

      /* spodek karoserie */
      s += `<path d="M 148 224 L 148 176 Q 150 168 160 166 L 460 152 Q 478 152 480 170 L 486 200 Q 486 224 470 224 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 150 196 L 484 184" stroke="${C}" stroke-width="2.5" opacity="0.55"/>`;

      /* kabina / střecha */
      s += `<path d="M 226 166 Q 250 122 300 116 Q 360 112 404 128 L 430 152 L 226 166 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += A.glass(`M 250 128 Q 288 120 320 122 L 322 152 L 244 158 Z`, { tint: '#a9dcf6' });
      s += A.glass(`M 330 124 L 400 134 L 420 152 L 332 152 Z`, { tint: '#a9dcf6' });
      s += `<rect x="322" y="118" width="8" height="38" fill="${DD}"/>`;
      s += A.driver({ x: 366, y: 138, s: 0.68, cap: '#0e1b26', shirt: '#e8e2d0' });

      /* přední maska – vysoká chromová mřížka */
      s += A.grille({ x: 462, y: 168, w: 24, h: 40, bars: 6, rx: 8, frame: 'url(#gChromeH)', color: '#12181f' });
      s += A.lamp({ x: 486, y: 178, r: 8, len: 220, spread: 48 });

      /* víko kufru – pohyblivé */
      s += `<g data-part="trunkLid" data-pivot="160 176">`;
      s += `<path d="M 156 176 L 210 172 Q 216 172 216 178 L 216 190 L 156 194 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.2" stroke-linejoin="round"/>`;
      s += `<rect x="170" y="180" width="34" height="5" rx="2.5" fill="${C}" opacity="0.6"/>`;
      s += `</g>`;

      s += A.stack({ x: 460, yTop: 214, yBottom: 224, w: 10, color: 'url(#gSteel)' });
      s += A.emitter('exhaust', 462, 216);

      s += A.tailLamp({ x: 152, y: 200, r: 6.5 });
      s += A.reverseLamp({ x: 152, y: 214, r: 6 });

      return s;
    }
  };

  /* ===========================================================================
   *  13) NISSAN LEAF
   * =========================================================================*/
  const leaf = {
    id: 'leaf',
    name: 'Nissan Leaf',
    subtitle: 'Tichá jízda na elektřinu',
    emoji: '🍃',
    scene: 'mesto',
    theme: { main: '#2ec4b6', dark: '#1c8c81', accent: '#eafff9', ink: '#0d4a44' },
    sound: {
      base: 70, saw: 0.06, square: 0.05, noise: 0.03, whine: 0.045, cutoff: [500, 2600], lfoDiv: 6, lfoDepth: 0.05,
      horn: { type: 'triangle', gain: 0.26, notes: [[880, 0, 0.14], [988, 0.16, 0.16]] }
    },
    emitters: {
      dust: { type: 'dust', when: 'driving', rate: 4 },
      electric: { type: 'electric', when: 'action', rate: 30 }
    },
    action: {
      id: 'nabijet', label: 'Nabíjet', icon: 'bolt', duration: 3200, loop: true, sound: 'charge',
      parts: { chargeFlap: [[0, 0], [0.14, -70], [0.86, -70], [1, 0]] },
      emitAt: { electric: [0.16, 0.84] }
    },
    art(p) {
      const M = '#2ec4b6', D = '#1c8c81', DD = '#0d4a44', E = '#eafff9';
      let s = `<defs>${bodyGrad(p + 'b', '#4fd8c8', D)}</defs>`;
      s += A.shadow({ x: 300, rx: 214, ry: 13 });

      s += A.wheel({ cx: 420, cy: 222, r: 40, style: 'road', lugs: 18, spokes: 7, rimColor: '#eafff9', rimR: 0.55, bolts: 8 });
      s += A.wheel({ cx: 175, cy: 222, r: 40, style: 'road', lugs: 18, spokes: 7, rimColor: '#eafff9', rimR: 0.55, bolts: 8 });
      s += A.emitter('dust', 300, 258);
      s += A.fender({ cx: 420, cy: 222, r: 48, color: D, w: 11, from: 198, to: 342 });
      s += A.fender({ cx: 175, cy: 222, r: 48, color: D, w: 11, from: 202, to: 338 });

      /* zaoblená karoserie */
      s += `<path d="M 140 222 L 140 176 Q 142 156 164 150 Q 220 118 300 116 Q 380 116 424 148 Q 456 168 460 196 L 462 222 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 150 198 L 456 198" stroke="${DD}" stroke-opacity="0.3" stroke-width="6" stroke-linecap="round"/>`;

      /* okna */
      s += A.glass(`M 176 152 Q 224 124 296 122 L 296 158 L 176 158 Z`, { tint: '#a9dcf6' });
      s += A.glass(`M 304 122 Q 366 124 408 150 L 420 160 L 304 160 Z`, { tint: '#a9dcf6' });
      s += `<rect x="296" y="120" width="8" height="40" fill="${DD}"/>`;
      s += A.driver({ x: 250, y: 140, s: 0.70, cap: '#1c8c81', shirt: '#eafff9' });

      /* listový odznak – hravá narážka na jméno "Leaf" */
      s += `<path d="M 300 178 q 10 -10 20 0 q -10 10 -20 0 z" fill="${E}" opacity="0.85"/>`;
      s += `<path d="M 300 178 q 8 -6 16 0" fill="none" stroke="${D}" stroke-width="1.6"/>`;

      /* hladký přední panel – elektromobily nemají velkou mřížku */
      s += `<rect x="440" y="168" width="20" height="30" rx="8" fill="${DD}" opacity="0.5"/>`;
      s += A.lamp({ x: 458, y: 174, r: 8, len: 220, spread: 48 });

      /* nabíjecí port (skrytý pod klapkou, dokud se neotevře) */
      s += `<circle cx="452" cy="186" r="8" fill="#12181f"/>`;
      s += `<circle cx="452" cy="186" r="4" fill="${M}"/>`;
      s += A.emitter('electric', 452, 186);

      /* nabíjecí klapka – pohyblivá */
      s += `<g data-part="chargeFlap" data-pivot="440 187">`;
      s += `<rect x="440" y="178" width="20" height="18" rx="4" fill="url(#${p}b)" stroke="${DD}" stroke-width="2"/>`;
      s += `</g>`;

      s += A.tailLamp({ x: 146, y: 174, r: 6.5 });
      s += A.reverseLamp({ x: 146, y: 192, r: 6 });

      return s;
    }
  };

  /* ===========================================================================
   *  14) VELOREX
   * =========================================================================*/
  const velorex = {
    id: 'velorex',
    name: 'Velorex',
    subtitle: 'Kouzelný tříkolák',
    emoji: '🛺',
    scene: 'pole',
    theme: { main: '#d98e3f', dark: '#a8631c', accent: '#3b2a1a', ink: '#5c3c14' },
    sound: {
      base: 50, saw: 0.40, square: 0.10, noise: 0.14, whine: 0.006, cutoff: [260, 1600], lfoDiv: 2.0, lfoDepth: 0.45,
      horn: { type: 'square', gain: 0.30, notes: [[330, 0, 0.18]] }
    },
    emitters: {
      exhaust: { type: 'smoke', when: 'engine', rate: 11 },
      dust: { type: 'dust', when: 'driving', rate: 8 }
    },
    action: {
      id: 'strecha', label: 'Stříška', icon: 'roof', duration: 3600, loop: true, sound: 'hydraulic',
      parts: { roof: [[0, 0], [0.20, 18], [0.80, 18], [1, 0]] }
    },
    art(p) {
      const M = '#d98e3f', D = '#a8631c', DD = '#7a4712', F = '#3b2a1a';
      let s = `<defs>${bodyGrad(p + 'b', '#f0ac5f', D)}</defs>`;
      s += A.shadow({ x: 270, rx: 168, ry: 12 });

      /* vzdálenější zadní kolo – naznačuje třetí kolo tříkoláku */
      s += A.wheel({ cx: 146, cy: 234, r: 26, style: 'road', lugs: 10, spokes: 5, rimColor: '#d8dee8', rimR: 0.5, bolts: 5 });

      /* trubkový rám */
      s += `<path d="M 172 228 Q 220 250 300 246 Q 360 244 390 228" fill="none" stroke="${F}" stroke-width="7" stroke-linecap="round"/>`;
      s += `<path d="M 176 210 L 384 214" fill="none" stroke="${F}" stroke-width="6" stroke-linecap="round"/>`;

      /* motůrek vzadu */
      s += `<rect x="150" y="196" width="34" height="26" rx="5" fill="#5a6373" stroke="#39414f" stroke-width="2"/>`;
      s += `<rect x="156" y="188" width="10" height="10" fill="#8b95a6"/><rect x="170" y="188" width="10" height="10" fill="#8b95a6"/>`;
      s += A.stack({ x: 152, yTop: 178, yBottom: 198, w: 9, color: 'url(#gSteel)' });
      s += A.emitter('exhaust', 152, 172);

      /* plátěná kabina */
      s += `<path d="M 196 224 L 196 168 Q 196 152 214 148 L 330 144 Q 350 144 356 160 L 362 210 L 362 224 Z" fill="url(#${p}b)" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      /* švy na plátně */
      s += `<path d="M 214 150 L 350 160" fill="none" stroke="${DD}" stroke-width="2" stroke-dasharray="6 5" opacity="0.6"/>`;
      s += `<path d="M 260 148 L 258 222 M 300 146 L 300 222" stroke="${DD}" stroke-width="2" stroke-dasharray="6 5" opacity="0.45"/>`;

      /* čelní sklo + řidič */
      s += A.glass(`M 330 150 L 354 162 L 354 196 L 330 196 Z`, { tint: '#a9dcf6' });
      s += A.driver({ x: 280, y: 172, s: 0.72, cap: '#5c3c14', shirt: '#e8c9a0' });

      /* stříška – sklápěcí */
      s += `<g data-part="roof" data-pivot="214 148">`;
      s += `<path d="M 214 148 Q 260 120 330 128 Q 350 132 356 150 L 330 150 Q 268 140 216 156 Z" fill="${D}" stroke="${DD}" stroke-width="2.5" stroke-linejoin="round"/>`;
      s += `<path d="M 226 140 L 320 136" stroke="#fff" stroke-opacity="0.25" stroke-width="4" stroke-linecap="round"/>`;
      s += `</g>`;

      /* maličký reflektor */
      s += A.lamp({ x: 392, y: 208, r: 7, len: 200, spread: 44 });

      /* kola – přední a bližší zadní */
      s += A.wheel({ cx: 390, cy: 228, r: 34, style: 'road', lugs: 12, spokes: 5, rimColor: '#d8dee8', rimR: 0.5, bolts: 6 });
      s += A.wheel({ cx: 172, cy: 228, r: 36, style: 'road', lugs: 12, spokes: 5, rimColor: '#d8dee8', rimR: 0.5, bolts: 6 });
      s += A.emitter('dust', 280, 258);

      s += A.tailLamp({ x: 152, y: 206, r: 5.5 });

      return s;
    }
  };

  /* ===========================================================================
   *  15) KOLO
   * =========================================================================*/
  const kolo = {
    id: 'kolo',
    name: 'Kolo',
    subtitle: 'Zvoní a dělá triky',
    emoji: '🚲',
    scene: 'park',
    theme: { main: '#ff6f59', dark: '#c94a37', accent: '#ffffff', ink: '#7a2e1f' },
    sound: {
      silent: true,
      horn: { type: 'triangle', gain: 0.32, notes: [[1568, 0, 0.09], [1976, 0.10, 0.09], [1568, 0.20, 0.09]] }
    },
    spin: { pedals: 480 },
    emitters: {
      dust: { type: 'dust', when: 'driving', rate: 6 },
      star: { type: 'star', when: 'action', rate: 26 }
    },
    action: {
      id: 'trik', label: 'Trik', icon: 'sparkle', duration: 2200, loop: true, sound: 'spray',
      parts: { frontPop: [[0, 0], [0.16, -13], [0.6, -13], [0.8, 4], [1, 0]] },
      emitAt: { star: [0.1, 0.3] }
    },
    art(p) {
      const D = '#c94a37', DD = '#7a2e1f';
      let s = `<defs>${bodyGrad(p + 'b', '#ff8f7c', D)}</defs>`;
      s += A.shadow({ x: 290, rx: 190, ry: 12 });

      /* zadní kolo */
      s += A.wheel({ cx: 180, cy: 224, r: 54, style: 'smooth', spokes: 12, rimColor: '#fff2ee', rimR: 0.72, bolts: 8, hub: '#39414f' });

      /* rám (diamant) */
      s += `<path d="M 180 224 L 290 224 L 340 130 M 290 224 L 250 150 L 340 130 L 380 172 M 250 150 L 190 150" fill="none" stroke="url(#${p}b)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="M 184 220 L 286 220" stroke="#fff" stroke-opacity="0.3" stroke-width="3" stroke-linecap="round"/>`;

      /* sedlo */
      s += `<path d="M 236 148 Q 250 142 264 148 L 262 156 L 238 156 Z" fill="${DD}"/>`;
      s += `<rect x="248" y="150" width="6" height="4" fill="#8b95a6"/>`;
      s += A.driver({ x: 262, y: 176, s: 0.72, cap: '#ff6f59', shirt: '#ffffff' });

      /* košík vpředu s kytičkami */
      s += `<path d="M 358 168 L 396 168 L 392 190 L 362 190 Z" fill="none" stroke="#8b6a46" stroke-width="3.5" stroke-linejoin="round"/>`;
      s += `<path d="M 362 172 L 392 172 M 364 180 L 390 180" stroke="#8b6a46" stroke-width="2"/>`;
      s += `<circle cx="370" cy="164" r="5" fill="#e2452f"/><circle cx="380" cy="162" r="5" fill="#ffd21e"/><circle cx="388" cy="166" r="5" fill="#f487c4"/>`;

      /* pedály – točí se */
      s += `<g data-spin="pedals" data-pivot="290 224">`;
      s += `<circle cx="290" cy="224" r="24" fill="none" stroke="${DD}" stroke-width="5"/>`;
      s += `<line x1="290" y1="224" x2="314" y2="224" stroke="#39414f" stroke-width="6" stroke-linecap="round"/>`;
      s += `<line x1="290" y1="224" x2="266" y2="224" stroke="#39414f" stroke-width="6" stroke-linecap="round"/>`;
      s += `<rect x="308" y="219" width="14" height="10" rx="3" fill="#20252e"/>`;
      s += `<rect x="258" y="219" width="14" height="10" rx="3" fill="#20252e"/>`;
      s += `</g>`;
      s += `<circle cx="290" cy="224" r="10" fill="#8b95a6"/>`;

      /* přední vidlice + kolo – pohyblivé (trik) */
      s += `<g data-part="frontPop" data-pivot="340 130">`;
      s += `<path d="M 340 130 L 400 224" fill="none" stroke="url(#${p}b)" stroke-width="9" stroke-linecap="round"/>`;
      s += `<path d="M 328 128 L 352 132" stroke="${DD}" stroke-width="7" stroke-linecap="round"/>`;
      s += A.wheel({ cx: 400, cy: 224, r: 54, style: 'smooth', spokes: 12, rimColor: '#fff2ee', rimR: 0.72, bolts: 8, hub: '#39414f' });
      s += A.lamp({ x: 340, y: 126, r: 6, len: 160, spread: 34 });
      s += `</g>`;

      s += A.emitter('dust', 290, 258);
      s += A.emitter('star', 340, 150);

      return s;
    }
  };

  global.VEHICLES = [
    traktor, bagr, buldozer, truck, kombajn, domichavac, rolba,
    ctyrkolka, motorka, multivan, bigster, superb, leaf, velorex, kolo
  ];
  global.VEHICLE_BY_ID = global.VEHICLES.reduce((m, v) => (m[v.id] = v, m), {});
})(typeof window !== 'undefined' ? window : globalThis);

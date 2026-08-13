/* =============================================================================
 *  scenes.js  –  Kulisy (parallaxové pozadí)
 *  -----------------------------------------------------------------------
 *  Každá scéna má oblohu (CSS přechod) a několik vrstev.
 *  Vrstva = dlaždice v SVG, která se vodorovně opakuje a posouvá se
 *  různou rychlostí -> vzniká hloubka.
 *
 *    h      … výška vrstvy jako podíl výšky jeviště
 *    bottom … kde vrstva stojí (podíl výšky jeviště odspodu)
 *    speed  … násobek rychlosti stroje (1 = pohybuje se stejně jako kola)
 *
 *  Scéna navíc má:
 *    groundH … výška terénního pruhu (podíl výšky jeviště)
 *    standH  … kde stojí kola stroje; když je menší než groundH, stojí stroj
 *              kousek "uvnitř" terénu a za ním je vidět kus země (hloubka)
 * ===========================================================================*/
(function (global) {
  'use strict';

  const svgTile = (w, h, content) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${content}</svg>`;

  const uri = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

  /* ---------- opakovaně použité kousky ---------------------------------- */

  const cloud = (x, y, s, o) =>
    `<g transform="translate(${x} ${y}) scale(${s})" fill="#ffffff" fill-opacity="${o}">
      <ellipse cx="0" cy="0" rx="44" ry="26"/><ellipse cx="-38" cy="10" rx="30" ry="18"/>
      <ellipse cx="40" cy="12" rx="32" ry="17"/><rect x="-64" y="2" width="128" height="22" rx="11"/>
     </g>`;

  const tree = (x, base, s, c1, c2) =>
    `<g transform="translate(${x} ${base}) scale(${s})">
      <rect x="-7" y="-40" width="14" height="44" rx="4" fill="#7a5230"/>
      <circle cx="0" cy="-62" r="34" fill="${c1}"/>
      <circle cx="-26" cy="-46" r="24" fill="${c2}"/>
      <circle cx="26" cy="-48" r="26" fill="${c2}"/>
      <circle cx="4" cy="-84" r="22" fill="${c2}"/>
     </g>`;

  const bush = (x, base, s, c) =>
    `<g transform="translate(${x} ${base}) scale(${s})">
      <ellipse cx="0" cy="0" rx="34" ry="22" fill="${c}"/>
      <ellipse cx="-22" cy="6" rx="20" ry="15" fill="${c}"/>
      <ellipse cx="24" cy="6" rx="22" ry="16" fill="${c}"/>
     </g>`;

  /* stébla obilí */
  const wheatStalk = (x, base, h, c) =>
    `<g transform="translate(${x} ${base})">
      <path d="M 0 0 C -3 ${-h * 0.5} 3 ${-h * 0.7} 1 ${-h}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="1" cy="${-h - 8}" rx="5" ry="11" fill="${c}"/>
      <path d="M -4 ${-h - 4} l 10 -4 M -4 ${-h - 10} l 10 -4 M -4 ${-h - 16} l 10 -4" stroke="${c}" stroke-width="2" stroke-linecap="round"/>
     </g>`;

  /* ---------- další opakovaně použité kousky (pro nové scény) ----------- */

  const pine = (x, base, s, c1, c2) =>
    `<g transform="translate(${x} ${base}) scale(${s})">
      <rect x="-4" y="-14" width="8" height="16" fill="#6b4a2e"/>
      <path d="M 0 -108 L 30 -58 L -30 -58 Z" fill="${c1}"/>
      <path d="M 0 -84 L 27 -40 L -27 -40 Z" fill="${c2}"/>
      <path d="M 0 -56 L 24 -14 L -24 -14 Z" fill="${c1}"/>
     </g>`;

  const rock = (x, base, s, c1, c2) =>
    `<g transform="translate(${x} ${base}) scale(${s})">
      <path d="M -30 0 Q -34 -26 -8 -30 Q 20 -40 32 -18 Q 40 0 30 0 Z" fill="${c1}"/>
      <path d="M -18 0 Q -14 -18 4 -20 Q 8 -8 4 0 Z" fill="${c2}"/>
     </g>`;

  const building = (x, base, w, h, c, wc) =>
    `<g transform="translate(${x} ${base})">
      <rect x="0" y="${-h}" width="${w}" height="${h}" fill="${c}"/>
      ${(() => { let o = ''; const rows = Math.max(1, Math.floor((h - 16) / 26)); const cols = Math.max(1, Math.floor((w - 14) / 22));
        for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < cols; c2++)
          o += `<rect x="${8 + c2 * 22}" y="${-h + 14 + r * 26}" width="13" height="15" rx="2" fill="${wc}" opacity="${0.5 + ((r + c2) % 3) * 0.18}"/>`;
        return o; })()}
     </g>`;

  const lamppost = (x, base, s, c) =>
    `<g transform="translate(${x} ${base}) scale(${s})">
      <rect x="-3" y="-88" width="6" height="88" rx="3" fill="${c}"/>
      <path d="M -3 -88 Q -22 -88 -22 -100" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <ellipse cx="-22" cy="-102" rx="9" ry="7" fill="#fff3b0"/>
      <ellipse cx="-22" cy="-102" rx="18" ry="14" fill="#ffe680" opacity="0.25"/>
     </g>`;

  const bench = (x, base, s, c) =>
    `<g transform="translate(${x} ${base}) scale(${s})">
      <rect x="-26" y="-30" width="52" height="7" rx="3" fill="${c}"/>
      <rect x="-26" y="-14" width="52" height="7" rx="3" fill="${c}"/>
      <rect x="-22" y="-8" width="6" height="10" fill="#5a6373"/>
      <rect x="16" y="-8" width="6" height="10" fill="#5a6373"/>
      <rect x="-22" y="-44" width="6" height="16" fill="#5a6373"/>
      <rect x="16" y="-44" width="6" height="16" fill="#5a6373"/>
      <rect x="-26" y="-38" width="52" height="6" rx="3" fill="${c}"/>
     </g>`;

  const flowerbed = (x, base, w, colors) =>
    `<g transform="translate(${x} ${base})">
      <ellipse cx="${w / 2}" cy="0" rx="${w / 2}" ry="10" fill="#4a9a52"/>
      ${[0, 1, 2, 3, 4, 5, 6].map(i => `<circle cx="${8 + i * (w - 16) / 6}" cy="${-2 + (i % 2) * 4}" r="4.5" fill="${colors[i % colors.length]}"/>`).join('')}
     </g>`;

  /* ======================================================================
   *  POLE  (traktor)
   * ==================================================================== */
  const clouds = svgTile(620, 170,
    cloud(110, 60, 1, 0.92) + cloud(360, 34, 0.7, 0.75) + cloud(520, 82, 0.85, 0.85));

  const scenePole = {
    id: 'pole',
    sky: 'linear-gradient(180deg,#3ba9e8 0%,#7fd0f5 52%,#c8ecff 100%)',
    sun: { color: '#fff6b8', x: '84%', y: '15%' },
    groundH: 0.26, standH: 0.245,
    layers: [
      { h: 0.34, bottom: 0.52, speed: 0.05, tile: clouds },
      {
        h: 0.30, bottom: 0.24, speed: 0.16, tile: svgTile(900, 240,
          `<path d="M 0 240 L 0 150 Q 110 96 230 142 Q 350 186 470 128 Q 590 72 720 136 Q 820 182 900 150 L 900 240 Z" fill="#8cc98d"/>
           <path d="M 0 240 L 0 190 Q 150 150 300 186 Q 460 224 620 176 Q 770 132 900 190 L 900 240 Z" fill="#6cb46e"/>`)
      },
      {
        h: 0.26, bottom: 0.235, speed: 0.42, tile: svgTile(560, 175,
          tree(80, 172, 1.15, '#3f9a4a', '#4faa58') +
          tree(290, 174, 0.85, '#398f45', '#48a352') +
          tree(450, 172, 1.3, '#3f9a4a', '#55b25e') +
          bush(190, 172, 0.85, '#3d9448') + bush(370, 174, 0.65, '#46a052'))
      },
      {
        h: 0.13, bottom: 0.225, speed: 0.72, tile: svgTile(320, 120,
          `<rect x="0" y="58" width="320" height="9" rx="4" fill="#b98b55"/>
           <rect x="0" y="84" width="320" height="9" rx="4" fill="#a97c49"/>
           <rect x="36" y="40" width="12" height="72" rx="4" fill="#8f6839"/>
           <rect x="156" y="40" width="12" height="72" rx="4" fill="#8f6839"/>
           <rect x="276" y="40" width="12" height="72" rx="4" fill="#8f6839"/>
           <path d="M 90 120 q 6 -22 12 0 M 104 120 q 5 -16 10 0 M 220 120 q 6 -20 12 0" fill="none" stroke="#4faa58" stroke-width="4" stroke-linecap="round"/>`)
      },
      {
        h: 0.26, bottom: 0, speed: 1, ground: true, tile: svgTile(200, 200,
          `<rect width="200" height="200" fill="#7a5433"/>
           <rect width="200" height="14" fill="#4faa58"/>
           <path d="M 0 14 q 12 -10 24 0 q 12 -10 24 0 q 12 -10 24 0 q 12 -10 24 0 q 12 -10 24 0 q 12 -10 24 0 q 12 -10 24 0 q 12 -10 24 0" fill="#57b862"/>
           ${[-1, 0, 1, 2, 3, 4, 5, 6, 7, 8].map(i =>
            `<path d="M ${i * 25} 16 L ${i * 25 - 26} 200" stroke="#6d4b2e" stroke-width="7" stroke-linecap="round" opacity="0.55"/>`).join('')}
           ${[0, 1, 2, 3, 4, 5].map(i =>
            `<ellipse cx="${18 + i * 34}" cy="${44 + (i % 3) * 46}" rx="7" ry="4" fill="#8d6440" opacity="0.8"/>`).join('')}`)
      }
    ]
  };

  /* ======================================================================
   *  OBILÍ  (kombajn)
   * ==================================================================== */
  const sceneObili = {
    id: 'obili',
    sky: 'linear-gradient(180deg,#39a8e6 0%,#8fd8f7 50%,#ffeec2 100%)',
    sun: { color: '#fff0a0', x: '85%', y: '16%' },
    groundH: 0.26, standH: 0.245,
    layers: [
      { h: 0.32, bottom: 0.54, speed: 0.05, tile: clouds },
      {
        h: 0.28, bottom: 0.24, speed: 0.16, tile: svgTile(900, 230,
          `<path d="M 0 230 L 0 148 Q 140 100 290 140 Q 440 180 590 132 Q 740 88 900 148 L 900 230 Z" fill="#efd07a"/>
           <path d="M 0 230 L 0 188 Q 160 152 320 186 Q 500 224 660 180 Q 790 146 900 188 L 900 230 Z" fill="#e0b74f"/>`)
      },
      {
        h: 0.22, bottom: 0.235, speed: 0.45, tile: svgTile(560, 170,
          tree(110, 168, 0.95, '#4a9a52', '#5cb063') + tree(410, 168, 0.75, '#458f4d', '#57a95f') +
          `<rect x="236" y="98" width="94" height="70" rx="6" fill="#c9603f"/>
           <path d="M 224 102 L 283 62 L 342 102 Z" fill="#8f3c26"/>
           <rect x="266" y="128" width="32" height="40" rx="4" fill="#6b3320"/>`)
      },
      {
        h: 0.19, bottom: 0.24, speed: 0.9, tile: svgTile(200, 118,
          [6, 20, 34, 48, 62, 76, 90, 104, 118, 132, 146, 160, 174, 188].map((x, i) =>
            wheatStalk(x, 118, 74 + (i % 4) * 10, i % 2 ? '#e9c157' : '#d9a838')).join(''))
      },
      {
        h: 0.26, bottom: 0, speed: 1, ground: true, tile: svgTile(200, 200,
          `<rect width="200" height="200" fill="#e2c377"/>
           <rect width="200" height="8" fill="#cfae5c"/>
           ${/* strniště – posekaná stébla */[14, 46, 82, 122, 166].map(y =>
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i =>
              `<path d="M ${i * 16 + 5} ${y} l 0 ${9 + (i % 3) * 3}" stroke="#bb9748" stroke-width="3.4" stroke-linecap="round" opacity="0.85"/>`).join('')).join('')}
           <rect y="60" width="200" height="18" rx="9" fill="#d3b061" opacity="0.6"/>
           <rect y="136" width="200" height="18" rx="9" fill="#d3b061" opacity="0.45"/>
           ${[0, 1, 2, 3, 4, 5].map(i =>
            `<ellipse cx="${14 + i * 34}" cy="${100 + (i % 3) * 34}" rx="10" ry="4" fill="#eeda9f" opacity="0.75"/>`).join('')}`)
      }
    ]
  };

  /* ======================================================================
   *  STAVBA  (bagr, buldozer, domíchávač)
   * ==================================================================== */
  const sceneStavba = {
    id: 'stavba',
    sky: 'linear-gradient(180deg,#4fb3e8 0%,#95d6f2 55%,#dff0f8 100%)',
    sun: { color: '#fff4c0', x: '14%', y: '14%' },
    groundH: 0.25, standH: 0.232,
    layers: [
      { h: 0.30, bottom: 0.56, speed: 0.05, tile: clouds },
      {
        h: 0.42, bottom: 0.24, speed: 0.12, tile: svgTile(820, 340,
          `<g fill="#9fb0c6">
             <rect x="20" y="140" width="90" height="200" rx="4"/>
             <rect x="130" y="86" width="70" height="254" rx="4"/>
             <rect x="220" y="180" width="110" height="160" rx="4"/>
             <rect x="356" y="112" width="82" height="228" rx="4"/>
             <rect x="460" y="196" width="120" height="144" rx="4"/>
             <rect x="600" y="132" width="76" height="208" rx="4"/>
             <rect x="694" y="176" width="104" height="164" rx="4"/>
           </g>
           <g fill="#c6d6e6">
             ${(() => { let o = ''; const B = [[20, 140, 90], [130, 86, 70], [220, 180, 110], [356, 112, 82], [460, 196, 120], [600, 132, 76], [694, 176, 104]];
              B.forEach(([bx, by, bw]) => { for (let r = 0; r < 6; r++) for (let c = 0; c < Math.floor(bw / 24); c++) { const yy = by + 14 + r * 26; if (yy > 320) continue; o += `<rect x="${bx + 8 + c * 24}" y="${yy}" width="12" height="14" rx="2" opacity="${0.35 + ((r + c) % 3) * 0.2}"/>`; } });
              return o; })()}
           </g>`)
      },
      {
        h: 0.60, bottom: 0.24, speed: 0.30, tile: svgTile(900, 470,
          /* jeřáb */
          `<rect x="150" y="120" width="22" height="350" fill="#e8a41f"/>
           ${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M 150 ${140 + i * 46} L 172 ${186 + i * 46} M 172 ${140 + i * 46} L 150 ${186 + i * 46}" stroke="#c4870f" stroke-width="5"/>`).join('')}
           <rect x="40" y="104" width="420" height="18" rx="5" fill="#e8a41f"/>
           <rect x="56" y="86" width="70" height="20" rx="5" fill="#5a6373"/>
           <path d="M 161 104 L 161 62 L 300 104 M 161 62 L 60 104" stroke="#c4870f" stroke-width="6" fill="none"/>
           <line x1="360" y1="122" x2="360" y2="216" stroke="#4a5464" stroke-width="4"/>
           <path d="M 348 216 h 24 v 16 h -24 z" fill="#5a6373"/>
           <rect x="150" y="96" width="26" height="30" rx="4" fill="#39414f"/>
           <!-- rozestavěný dům -->
           <rect x="560" y="230" width="300" height="240" fill="#cfd6e2"/>
           <rect x="560" y="230" width="300" height="16" fill="#aeb6c6"/>
           ${(() => { let o = ''; for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) o += `<rect x="${584 + c * 56}" y="${262 + r * 54}" width="38" height="38" rx="3" fill="#8b95a6" opacity="${r === 0 ? 0.55 : 0.8}"/>`; return o; })()}
           <g stroke="#e8a41f" stroke-width="7" fill="none">
             <rect x="548" y="240" width="20" height="230"/>
             <path d="M 548 300 h 320 M 548 372 h 320 M 548 440 h 320"/>
           </g>`)
      },
      {
        h: 0.20, bottom: 0.22, speed: 0.68, tile: svgTile(520, 170,
          /* zábrany, kužely, roury, hromada písku */
          `<path d="M 0 170 Q 60 96 130 170 Z" fill="#e8c98a"/>
           <path d="M 10 170 Q 62 118 118 170 Z" fill="#d9b46a"/>
           <g>
             <rect x="170" y="104" width="96" height="14" rx="4" fill="#e8452f"/>
             <rect x="170" y="128" width="96" height="14" rx="4" fill="#f4f7fb"/>
             <rect x="176" y="104" width="10" height="66" fill="#5a6373"/>
             <rect x="250" y="104" width="10" height="66" fill="#5a6373"/>
           </g>
           <g transform="translate(320 170)">
             <path d="M -18 0 L -6 -46 L 6 -46 L 18 0 Z" fill="#f4622c"/>
             <rect x="-24" y="-8" width="48" height="10" rx="4" fill="#e2521c"/>
             <rect x="-13" y="-32" width="26" height="9" fill="#ffffff"/>
           </g>
           <g transform="translate(400 148)">
             <ellipse cx="0" cy="0" rx="22" ry="20" fill="#7d8698"/><ellipse cx="0" cy="0" rx="11" ry="10" fill="#4a5464"/>
             <ellipse cx="46" cy="4" rx="20" ry="18" fill="#8b95a6"/><ellipse cx="46" cy="4" rx="10" ry="9" fill="#4a5464"/>
             <ellipse cx="24" cy="-26" rx="21" ry="19" fill="#98a1b0"/><ellipse cx="24" cy="-26" rx="10" ry="9" fill="#4a5464"/>
           </g>`)
      },
      {
        h: 0.25, bottom: 0, speed: 1, ground: true, tile: svgTile(220, 200,
          `<rect width="220" height="200" fill="#a98a63"/>
           <rect width="220" height="10" fill="#c0a077"/>
           <rect y="10" width="220" height="6" fill="#957a55" opacity="0.5"/>
           ${/* stopy po pásech */[26, 78, 132, 176].map(y =>
            `<rect y="${y}" width="220" height="15" rx="7" fill="#96795a" opacity="0.75"/>` +
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i =>
              `<rect x="${i * 20 + 3}" y="${y + 2}" width="9" height="11" rx="3" fill="#836a4d" opacity="0.8"/>`).join('')).join('')}
           ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i =>
            `<ellipse cx="${14 + i * 25}" cy="${52 + ((i * 43) % 96)}" rx="${5 + (i % 3) * 3}" ry="${4 + (i % 2) * 2}" fill="#8f7350"/>`).join('')}
           ${[0, 1, 2, 3, 4, 5].map(i =>
            `<circle cx="${24 + i * 36}" cy="${64 + (i % 3) * 40}" r="3.5" fill="#6f573a"/>`).join('')}`)
      }
    ]
  };

  /* ======================================================================
   *  SILNICE  (americký truck)
   * ==================================================================== */
  const sceneSilnice = {
    id: 'silnice',
    sky: 'linear-gradient(180deg,#2f7fd0 0%,#7fb9ea 42%,#ffd39a 82%,#ffb877 100%)',
    sun: { color: '#fff0b0', x: '86%', y: '17%' },
    groundH: 0.24, standH: 0.213,
    layers: [
      { h: 0.26, bottom: 0.60, speed: 0.04, tile: clouds },
      {
        h: 0.36, bottom: 0.23, speed: 0.12, tile: svgTile(900, 280,
          `<path d="M 0 280 L 0 200 L 60 200 L 90 120 L 200 116 L 230 196 L 330 200 L 360 150 L 450 146 L 480 200 L 620 200 L 660 100 L 780 96 L 810 200 L 900 200 L 900 280 Z" fill="#c98c64"/>
           <path d="M 90 120 L 200 116 L 200 140 L 90 144 Z" fill="#b0714c"/>
           <path d="M 660 100 L 780 96 L 780 122 L 660 126 Z" fill="#b0714c"/>
           <path d="M 0 280 L 0 232 Q 180 208 380 234 Q 600 262 900 228 L 900 280 Z" fill="#b8794f"/>`)
      },
      {
        h: 0.30, bottom: 0.235, speed: 0.42, tile: svgTile(640, 260,
          /* kaktusy a billboard */
          `<g fill="#3f9a5c">
             <rect x="70" y="120" width="26" height="140" rx="13"/>
             <path d="M 96 168 q 34 0 34 -34 l 0 -20 q 0 -10 -12 -10 q -12 0 -12 10 l 0 20 q 0 12 -10 12 z"/>
             <path d="M 70 190 q -34 0 -34 -36 l 0 -14 q 0 -10 12 -10 q 12 0 12 10 l 0 14 q 0 12 10 12 z"/>
           </g>
           <g fill="#469f63">
             <rect x="470" y="164" width="20" height="96" rx="10"/>
             <path d="M 490 200 q 26 0 26 -26 l 0 -14 q 0 -8 -9 -8 q -9 0 -9 8 l 0 14 q 0 9 -8 9 z"/>
           </g>
           <g>
             <rect x="250" y="150" width="14" height="110" fill="#7a6249"/>
             <rect x="310" y="150" width="14" height="110" fill="#7a6249"/>
             <rect x="228" y="70" width="118" height="86" rx="6" fill="#f4f7fb" stroke="#c0a077" stroke-width="5"/>
             <circle cx="262" cy="104" r="16" fill="#f4622c"/>
             <rect x="286" y="94" width="46" height="10" rx="5" fill="#2f6fd0"/>
             <rect x="286" y="112" width="34" height="8" rx="4" fill="#8b95a6"/>
             <rect x="244" y="130" width="86" height="10" rx="5" fill="#3f9a5c"/>
           </g>
           <ellipse cx="560" cy="256" rx="46" ry="10" fill="#c4a179"/>
           <ellipse cx="150" cy="256" rx="40" ry="9" fill="#c4a179"/>`)
      },
      {
        h: 0.11, bottom: 0.225, speed: 0.72, tile: svgTile(300, 90,
          `<rect x="0" y="22" width="300" height="16" rx="8" fill="#cfd6e2"/>
           <rect x="0" y="26" width="300" height="5" rx="2" fill="#ffffff" opacity="0.8"/>
           <rect x="40" y="34" width="12" height="56" rx="4" fill="#8b95a6"/>
           <rect x="190" y="34" width="12" height="56" rx="4" fill="#8b95a6"/>`)
      },
      {
        h: 0.24, bottom: 0, speed: 1, ground: true, tile: svgTile(240, 200,
          `<rect width="240" height="200" fill="#4d5560"/>
           <rect width="240" height="6" fill="#f4f7fb" opacity="0.9"/>
           ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i =>
            `<circle cx="${10 + i * 21}" cy="${22 + (i * 53) % 158}" r="${2 + (i % 3)}" fill="#5c6572"/>`).join('')}
           <rect x="0" y="66" width="132" height="11" rx="5" fill="#ffd21e"/>
           <rect x="0" y="82" width="132" height="11" rx="5" fill="#ffd21e"/>
           <rect x="150" y="146" width="70" height="9" rx="4" fill="#f4f7fb" opacity="0.85"/>
           <rect x="-30" y="146" width="70" height="9" rx="4" fill="#f4f7fb" opacity="0.85"/>
           <rect y="192" width="240" height="8" fill="#f4f7fb" opacity="0.7"/>`)
      }
    ]
  };

  /* ======================================================================
   *  ZIMNÍ STADION  (rolba)
   * ==================================================================== */
  const sceneLed = {
    id: 'led',
    sky: 'linear-gradient(180deg,#0c1a30 0%,#173456 40%,#26507f 72%,#4d80b4 100%)',
    sun: null,
    groundH: 0.34, standH: 0.205,
    layers: [
      {
        h: 0.20, bottom: 0.74, speed: 0.02, tile: svgTile(560, 130,
          /* osvětlovací rampy pod stropem */
          `<rect x="70" y="8" width="180" height="10" rx="5" fill="#2a3c58"/>
           <rect x="330" y="8" width="180" height="10" rx="5" fill="#2a3c58"/>
           ${[70, 330].map((bx) => [0, 1, 2, 3, 4].map(i =>
            `<rect x="${bx + 14 + i * 36}" y="18" width="26" height="12" rx="4" fill="#3b4c66"/>
             <ellipse cx="${bx + 27 + i * 36}" cy="32" rx="13" ry="7" fill="#fff6c2"/>
             <ellipse cx="${bx + 27 + i * 36}" cy="44" rx="30" ry="26" fill="#ffe680" opacity="0.13"/>`).join('')).join('')}`)
      },
      {
        h: 0.30, bottom: 0.435, speed: 0.10, tile: svgTile(700, 230,
          `<path d="M 0 230 L 0 74 L 700 46 L 700 230 Z" fill="#1e3252"/>
           ${(() => { let o = ''; for (let r = 0; r < 5; r++) { const y = 82 + r * 30; o += `<rect x="0" y="${y}" width="700" height="21" fill="${r % 2 ? '#263d63' : '#2c4771'}"/>`; for (let c = 0; c < 28; c++) { const cols = ['#c9522a', '#c8a52c', '#3d80b4', '#c3cad6', '#b03c2c', '#4c8a54']; o += `<circle cx="${14 + c * 25}" cy="${y + 9}" r="6.5" fill="${cols[(r * 7 + c) % 6]}" opacity="0.7"/>`; } } return o; })()}
           <rect y="212" width="700" height="18" fill="#16273f"/>`)
      },
      {
        h: 0.105, bottom: 0.338, speed: 0.34, tile: svgTile(480, 96,
          `<rect x="0" y="14" width="480" height="82" fill="#f4f7fb"/>
           <rect x="0" y="6" width="480" height="12" rx="6" fill="#e0e6ef"/>
           <rect x="0" y="16" width="480" height="5" fill="#c8cfda"/>
           <rect x="14" y="30" width="132" height="52" rx="6" fill="#2f6fd0"/>
           <rect x="32" y="44" width="96" height="11" rx="5" fill="#ffffff" opacity="0.9"/>
           <rect x="32" y="60" width="64" height="9" rx="4" fill="#ffffff" opacity="0.6"/>
           <rect x="170" y="30" width="132" height="52" rx="6" fill="#e8452f"/>
           <circle cx="202" cy="56" r="15" fill="#ffffff" opacity="0.9"/>
           <rect x="228" y="44" width="56" height="11" rx="5" fill="#ffffff" opacity="0.9"/>
           <rect x="228" y="60" width="40" height="9" rx="4" fill="#ffffff" opacity="0.6"/>
           <rect x="326" y="30" width="132" height="52" rx="6" fill="#ffd21e"/>
           <rect x="344" y="43" width="96" height="13" rx="6" fill="#10305f" opacity="0.85"/>
           <rect x="344" y="62" width="58" height="9" rx="4" fill="#10305f" opacity="0.55"/>
           <rect y="86" width="480" height="10" fill="#e6f2fa"/>`)
      },
      {
        h: 0.34, bottom: 0, speed: 1, ground: true, ice: true, tile: svgTile(300, 200,
          `<rect width="300" height="200" fill="#eaf6fd"/>
           <rect y="0" width="300" height="8" fill="#c3ddef"/>
           <rect y="8" width="300" height="30" fill="#dcf0fb"/>
           <rect x="142" y="0" width="9" height="200" fill="#3f7fd0" opacity="0.5"/>
           ${[0, 1, 2, 3, 4, 5, 6, 7].map(i =>
            `<rect x="${(i * 41) % 300}" y="${22 + (i * 47) % 160}" width="${44 + (i % 3) * 26}" height="4" rx="2" fill="#ffffff" opacity="0.85"/>`).join('')}
           ${[0, 1, 2, 3, 4, 5].map(i =>
            `<ellipse cx="${26 + i * 52}" cy="${58 + (i % 3) * 48}" rx="26" ry="6" fill="#ffffff" opacity="0.5"/>`).join('')}
           <rect y="170" width="300" height="30" fill="#d5eaf8" opacity="0.6"/>`)
      }
    ]
  };

  /* ======================================================================
   *  TERÉN  (čtyřkolka, Dacia Bigster)
   * ==================================================================== */
  const sceneTeren = {
    id: 'teren',
    sky: 'linear-gradient(180deg,#3d9fdb 0%,#83cdec 55%,#cdeccf 100%)',
    sun: { color: '#fff3ac', x: '80%', y: '16%' },
    groundH: 0.27, standH: 0.25,
    layers: [
      { h: 0.30, bottom: 0.56, speed: 0.05, tile: clouds },
      {
        h: 0.34, bottom: 0.24, speed: 0.14, tile: svgTile(760, 260,
          pine(70, 258, 0.95, '#2f7a45', '#3d9155') + pine(220, 258, 0.7, '#2a6d3e', '#38854c') +
          pine(400, 258, 1.1, '#2f7a45', '#3d9155') + pine(560, 258, 0.8, '#2a6d3e', '#38854c') +
          pine(680, 258, 0.6, '#2f7a45', '#3d9155') +
          `<path d="M 0 260 L 0 200 Q 200 172 400 202 Q 580 226 760 190 L 760 260 Z" fill="#5c9a5e"/>`)
      },
      {
        h: 0.22, bottom: 0.235, speed: 0.44, tile: svgTile(520, 170,
          rock(90, 168, 1.0, '#8a8478', '#a49d8d') + rock(360, 168, 0.8, '#847e70', '#9a9384') +
          bush(200, 166, 0.9, '#3f8a4a') + bush(440, 168, 0.7, '#478f52'))
      },
      {
        h: 0.13, bottom: 0.225, speed: 0.74, tile: svgTile(280, 110,
          `<path d="M 6 110 L 20 40 Q 30 30 40 40 L 54 110 Z" fill="#6b4a2e" opacity="0.85"/>
           <path d="M 6 110 L 20 40 L 12 110 Z" fill="#543a22" opacity="0.6"/>
           <path d="M 150 110 q 30 -14 60 0" fill="none" stroke="#5c9a5e" stroke-width="10" stroke-linecap="round"/>
           <path d="M 210 108 q 10 -20 4 -36 M 226 108 q 14 -14 12 -32" fill="none" stroke="#f2c94c" stroke-width="4" stroke-linecap="round" opacity="0.9"/>`)
      },
      {
        h: 0.27, bottom: 0, speed: 1, ground: true, tile: svgTile(220, 200,
          `<rect width="220" height="200" fill="#7a5c3c"/>
           <rect width="220" height="10" fill="#5c9a5e"/>
           <path d="M 0 10 q 14 -8 28 0 q 14 -8 28 0 q 14 -8 28 0 q 14 -8 28 0 q 14 -8 28 0 q 14 -8 28 0 q 14 -8 28 0 q 14 -8 28 0" fill="none" stroke="#4a8a4e" stroke-width="5"/>
           ${/* dvě koleje od kol */['46', '110'].map(cy =>
            `<rect x="0" y="${cy}" width="220" height="22" rx="10" fill="#5c4128" opacity="0.7"/>
             <rect x="0" y="${+cy + 4}" width="220" height="6" rx="3" fill="#3f2c1a" opacity="0.6"/>`).join('')}
           ${[0, 1, 2, 3, 4, 5, 6].map(i =>
            `<ellipse cx="${18 + i * 30}" cy="${150 + (i % 3) * 16}" rx="${8 + (i % 2) * 4}" ry="${5 + (i % 2) * 2}" fill="#5c4128" opacity="0.65"/>`).join('')}
           ${[0, 1, 2].map(i => `<ellipse cx="${40 + i * 76}" cy="${168 + (i % 2) * 14}" rx="14" ry="6" fill="#3f6fa0" opacity="0.55"/>`).join('')}`)
      }
    ]
  };

  /* ======================================================================
   *  MĚSTO  (Multivan, Škoda Superb, Nissan Leaf)
   * ==================================================================== */
  const sceneMesto = {
    id: 'mesto',
    sky: 'linear-gradient(180deg,#5fa8e0 0%,#a9d6f0 58%,#eaf5fa 100%)',
    sun: { color: '#fff6c8', x: '82%', y: '14%' },
    groundH: 0.25, standH: 0.235,
    layers: [
      { h: 0.26, bottom: 0.60, speed: 0.04, tile: clouds },
      {
        h: 0.40, bottom: 0.235, speed: 0.12, tile: svgTile(820, 320,
          building(10, 320, 90, 190, '#9db4cc', '#dbe8f2') + building(110, 320, 66, 140, '#b3c4d6', '#e4edf4') +
          building(186, 320, 100, 230, '#8fa6bd', '#d7e5f0') + building(298, 320, 74, 160, '#a7bcd0', '#e0ebf3') +
          building(384, 320, 92, 200, '#96acc4', '#d9e7f1') + building(490, 320, 70, 150, '#b0c2d4', '#e3edf4') +
          building(572, 320, 104, 240, '#8fa6bd', '#d7e5f0') + building(690, 320, 80, 170, '#a7bcd0', '#e0ebf3'))
      },
      {
        h: 0.20, bottom: 0.232, speed: 0.42, tile: svgTile(620, 160,
          `<rect x="0" y="80" width="620" height="80" fill="#f4ede0"/>
           <rect x="0" y="76" width="620" height="8" fill="#e2452f"/>
           ${[[20, '#e2452f'], [170, '#2f6fd0'], [320, '#ffb52e'], [470, '#4a9a52']].map(([x, c]) =>
            `<rect x="${x}" y="20" width="120" height="60" rx="4" fill="#ffffff" stroke="#d8dee8" stroke-width="2"/>
             <path d="M ${x - 4} 20 q 4 -18 14 -18 l 92 0 q 10 0 14 18 z" fill="${c}"/>
             <path d="M ${x - 4} 20 l 130 0 l -6 12 l -118 0 z" fill="${c}" opacity="0.7"/>
             <rect x="${x + 14}" y="34" width="92" height="36" fill="#bcdff0" opacity="0.8"/>`).join('')}
           ${tree(70, 160, 0.55, '#3f9a4a', '#4faa58')}${tree(430, 160, 0.6, '#398f45', '#48a352')}`)
      },
      {
        h: 0.115, bottom: 0.228, speed: 0.7, tile: svgTile(320, 92,
          lamppost(50, 92, 0.62, '#3b4c66') + lamppost(230, 92, 0.62, '#3b4c66') +
          `<rect x="130" y="60" width="10" height="32" rx="3" fill="#8b95a6"/>
           <rect x="118" y="34" width="34" height="28" rx="5" fill="#f4f7fb" stroke="#c8cfda" stroke-width="2"/>
           <circle cx="135" cy="46" r="9" fill="#2f6fd0" opacity="0.85"/>
           <path d="M 129 46 l 4 4 l 8 -9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`)
      },
      {
        h: 0.25, bottom: 0, speed: 1, ground: true, tile: svgTile(240, 200,
          `<rect width="240" height="200" fill="#565f6c"/>
           <rect width="240" height="7" fill="#e2e7ee"/>
           <rect y="7" width="240" height="5" fill="#454d5a"/>
           ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i =>
            `<circle cx="${8 + i * 22}" cy="${26 + (i * 41) % 160}" r="${2 + (i % 3)}" fill="#4a5260"/>`).join('')}
           <rect x="10" y="80" width="220" height="14" rx="4" fill="#e2e7ee"/>
           ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${16 + i * 28}" y="82" width="14" height="10" fill="#565f6c"/>`).join('')}
           <rect x="70" y="140" width="100" height="10" rx="5" fill="#f4f7fb" opacity="0.85"/>
           <rect y="192" width="240" height="8" fill="#454d5a"/>`)
      }
    ]
  };

  /* ======================================================================
   *  PARK  (kolo)
   * ==================================================================== */
  const scenePark = {
    id: 'park',
    sky: 'linear-gradient(180deg,#48b0e6 0%,#93d9f2 55%,#e4f8e0 100%)',
    sun: { color: '#fff6b0', x: '18%', y: '14%' },
    groundH: 0.25, standH: 0.238,
    layers: [
      { h: 0.28, bottom: 0.58, speed: 0.05, tile: clouds },
      {
        h: 0.28, bottom: 0.236, speed: 0.15, tile: svgTile(700, 220,
          tree(60, 216, 0.85, '#3f9a4a', '#55b25e') + tree(230, 218, 0.62, '#398f45', '#48a352') +
          tree(400, 216, 1.0, '#3f9a4a', '#55b25e') + tree(560, 218, 0.7, '#398f45', '#57a95f') +
          tree(660, 216, 0.55, '#3f9a4a', '#4faa58') +
          `<path d="M 0 220 L 0 172 Q 180 148 360 176 Q 540 202 700 168 L 700 220 Z" fill="#6cc06e"/>`)
      },
      {
        h: 0.16, bottom: 0.232, speed: 0.4, tile: svgTile(420, 128,
          bench(80, 126, 0.92, '#c9863f') + bench(300, 126, 0.92, '#c9863f') +
          flowerbed(150, 128, 90, ['#e2452f', '#ffd21e', '#f487c4', '#ffffff']))
      },
      {
        h: 0.10, bottom: 0.228, speed: 0.68, tile: svgTile(260, 78,
          lamppost(40, 78, 0.55, '#3f8a4a') + lamppost(190, 78, 0.55, '#3f8a4a') +
          `<ellipse cx="120" cy="72" rx="26" ry="9" fill="#4a9a52"/><ellipse cx="120" cy="70" rx="18" ry="5" fill="#5cb063"/>`)
      },
      {
        h: 0.25, bottom: 0, speed: 1, ground: true, tile: svgTile(220, 200,
          `<rect width="220" height="200" fill="#6cc06e"/>
           <rect x="30" y="0" width="160" height="200" fill="#d9c9a3"/>
           <rect x="30" y="0" width="7" height="200" fill="#c2af80"/>
           <rect x="183" y="0" width="7" height="200" fill="#c2af80"/>
           ${[0, 1, 2, 3, 4, 5, 6].map(i =>
            `<rect x="34" y="${i * 30}" width="152" height="4" fill="#c2af80" opacity="0.55"/>`).join('')}
           ${[0, 1, 2, 3, 4].map(i =>
            `<circle cx="${8 + i * 42}" cy="${40 + (i % 3) * 55}" r="5" fill="#5cb063"/>`).join('')}
           ${[0, 1, 2, 3, 4].map(i =>
            `<circle cx="${200 + (i % 2) * 12}" cy="${30 + i * 38}" r="5" fill="#5cb063"/>`).join('')}`)
      }
    ]
  };

  const SCENES = {
    pole: scenePole,
    obili: sceneObili,
    stavba: sceneStavba,
    silnice: sceneSilnice,
    led: sceneLed,
    teren: sceneTeren,
    mesto: sceneMesto,
    park: scenePark
  };

  /* Předpočítáme data-URI, ať se to nedělá při každém překreslení. */
  Object.keys(SCENES).forEach((k) => {
    SCENES[k].layers.forEach((L) => { L.css = uri(L.tile); });
  });

  global.SCENES = SCENES;
})(typeof window !== 'undefined' ? window : globalThis);

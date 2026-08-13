/* =============================================================================
 *  art.js  –  Sdílená SVG "dílna"
 *  -----------------------------------------------------------------------
 *  Malé stavební prvky, ze kterých se skládají všechna vozidla:
 *  kola, pásy, světla, sklo, řidič, majáček, mřížky chladičů, žebříky…
 *
 *  Vše vrací řetězec se SVG markupem, takže se to dá poskládat jako stavebnice.
 *  Souřadnicový systém všech vozidel: viewBox "0 0 560 300", země na y = 262.
 *  Všechna vozidla jsou otočena čelem doprava.
 * ===========================================================================*/
(function (global) {
  'use strict';

  /** zaokrouhlení – kratší SVG, méně bajtů, žádné 0.30000000000004 */
  const R = (n) => Math.round(n * 1000) / 1000;
  const A = { R };

  /* ---------------------------------------------------------------------
   *  Globální <defs> – přechody sdílené všemi vozidly.
   *  Jsou vloženy jednou do dokumentu, odkazuje se na ně přes url(#…).
   * ------------------------------------------------------------------- */
  A.defs = function defs() {
    return `
    <defs>
      <!-- disk kola -->
      <radialGradient id="gRim" cx="38%" cy="32%" r="72%">
        <stop offset="0%"   stop-color="#ffffff"/>
        <stop offset="55%"  stop-color="#e6eaf2"/>
        <stop offset="100%" stop-color="#aeb6c6"/>
      </radialGradient>

      <!-- chrom (svislý) -->
      <linearGradient id="gChrome" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#ffffff"/>
        <stop offset="18%"  stop-color="#dfe5ee"/>
        <stop offset="42%"  stop-color="#8f98a8"/>
        <stop offset="56%"  stop-color="#f4f7fb"/>
        <stop offset="78%"  stop-color="#aab2c0"/>
        <stop offset="100%" stop-color="#6e7686"/>
      </linearGradient>

      <!-- chrom (vodorovný) -->
      <linearGradient id="gChromeH" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="#8f98a8"/>
        <stop offset="30%"  stop-color="#ffffff"/>
        <stop offset="55%"  stop-color="#b9c1cd"/>
        <stop offset="100%" stop-color="#78808f"/>
      </linearGradient>

      <!-- ocel -->
      <linearGradient id="gSteel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#9aa3b2"/>
        <stop offset="50%"  stop-color="#6f7889"/>
        <stop offset="100%" stop-color="#454d5c"/>
      </linearGradient>

      <!-- lesk na skle -->
      <linearGradient id="gGlass" x1="0" y1="0" x2="0.9" y2="1">
        <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.55"/>
        <stop offset="34%"  stop-color="#ffffff" stop-opacity="0.06"/>
        <stop offset="52%"  stop-color="#ffffff" stop-opacity="0.42"/>
        <stop offset="70%"  stop-color="#ffffff" stop-opacity="0.02"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.20"/>
      </linearGradient>

      <!-- žárovka -->
      <radialGradient id="gLamp" cx="42%" cy="38%" r="65%">
        <stop offset="0%"   stop-color="#ffffff"/>
        <stop offset="45%"  stop-color="#fff3b0"/>
        <stop offset="100%" stop-color="#e8b422"/>
      </radialGradient>

      <!-- záře kolem rozsvíceného světla -->
      <radialGradient id="gGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="#fff6c2" stop-opacity="0.95"/>
        <stop offset="40%"  stop-color="#ffe066" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#ffd21e" stop-opacity="0"/>
      </radialGradient>

      <!-- kužel světla -->
      <linearGradient id="gBeam" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="#fff6c2" stop-opacity="0.70"/>
        <stop offset="45%"  stop-color="#ffe680" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#ffe680" stop-opacity="0"/>
      </linearGradient>

      <!-- červené zadní světlo -->
      <radialGradient id="gRedLamp" cx="42%" cy="38%" r="65%">
        <stop offset="0%"   stop-color="#ffd9d9"/>
        <stop offset="40%"  stop-color="#ff5a5a"/>
        <stop offset="100%" stop-color="#a41414"/>
      </radialGradient>
      <radialGradient id="gRedGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="#ff9d9d" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="#ff2d2d" stop-opacity="0"/>
      </radialGradient>

      <!-- couvací (bílé) světlo -->
      <radialGradient id="gWhiteGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#eaf6ff" stop-opacity="0"/>
      </radialGradient>

      <!-- oranžový maják -->
      <radialGradient id="gBeacon" cx="42%" cy="35%" r="70%">
        <stop offset="0%"   stop-color="#ffe6a8"/>
        <stop offset="45%"  stop-color="#ff9f1a"/>
        <stop offset="100%" stop-color="#c25a00"/>
      </radialGradient>
      <linearGradient id="gBeaconCone" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%"   stop-color="#ffb340" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#ffb340" stop-opacity="0"/>
      </linearGradient>

      <!-- stín pod strojem -->
      <radialGradient id="gShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="#1b2430" stop-opacity="0.42"/>
        <stop offset="60%"  stop-color="#1b2430" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#1b2430" stop-opacity="0"/>
      </radialGradient>

      <!-- obilí v zásobníku -->
      <linearGradient id="gGrain" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#ffe07a"/>
        <stop offset="100%" stop-color="#d69a1e"/>
      </linearGradient>
    </defs>`;
  };

  /* ---------------------------------------------------------------------
   *  KOLO
   *  style: 'road' (silniční blok), 'agri' (zemědělský šípový vzorek),
   *         'smooth' (hladké – rolba)
   * ------------------------------------------------------------------- */
  A.wheel = function wheel(o) {
    const {
      cx, cy, r,
      tire = '#252a33',
      tread = '#12151b',
      rimColor = '#eef1f6',
      hub = '#98a1b0',
      rimR = 0.52,
      lugs = 16,
      style = 'road',
      spokes = 6,
      bolts = 8
    } = o;

    const rr = r * rimR;
    let s = `<g class="wheel" data-wheel="1" data-r="${R(r)}" data-cx="${R(cx)}" data-cy="${R(cy)}">`;

    /* dezén */
    if (style !== 'smooth') {
      const agri = style === 'agri';
      const lugOut = r * 1.05;
      const lugIn = r * (agri ? 0.62 : 0.79);
      const w = r * (agri ? 0.155 : 0.115);
      const tilt = agri ? 26 : 0;
      const midR = (lugOut + lugIn) / 2;
      for (let i = 0; i < lugs; i++) {
        const a = (360 / lugs) * i;
        const t2 = tilt
          ? ` rotate(${tilt} ${R(cx)} ${R(cy - midR)})`
          : '';
        s += `<rect x="${R(cx - w / 2)}" y="${R(cy - lugOut)}" width="${R(w)}" height="${R(lugOut - lugIn)}" rx="${R(w * 0.34)}" fill="${tread}" transform="rotate(${R(a)} ${R(cx)} ${R(cy)})${t2}"/>`;
      }
    }

    /* plášť */
    s += `<circle cx="${R(cx)}" cy="${R(cy)}" r="${R(r * (style === 'smooth' ? 1 : 0.87))}" fill="${tire}"/>`;
    s += `<circle cx="${R(cx)}" cy="${R(cy)}" r="${R(r * 0.79)}" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="${R(r * 0.07)}"/>`;
    s += `<circle cx="${R(cx)}" cy="${R(cy)}" r="${R(r * 0.70)}" fill="none" stroke="#fff" stroke-opacity="0.06" stroke-width="${R(r * 0.05)}"/>`;

    /* disk */
    s += `<circle cx="${R(cx)}" cy="${R(cy)}" r="${R(rr)}" fill="url(#gRim)"/>`;
    s += `<circle cx="${R(cx)}" cy="${R(cy)}" r="${R(rr)}" fill="none" stroke="${rimColor}" stroke-width="${R(rr * 0.10)}" stroke-opacity="0.9"/>`;

    /* výseče v disku */
    for (let i = 0; i < spokes; i++) {
      const a = (360 / spokes) * i;
      s += `<ellipse cx="${R(cx)}" cy="${R(cy - rr * 0.58)}" rx="${R(rr * 0.16)}" ry="${R(rr * 0.26)}" fill="#7d8698" fill-opacity="0.55" transform="rotate(${R(a)} ${R(cx)} ${R(cy)})"/>`;
    }

    /* náboj + šrouby */
    s += `<circle cx="${R(cx)}" cy="${R(cy)}" r="${R(rr * 0.42)}" fill="${hub}"/>`;
    for (let i = 0; i < bolts; i++) {
      const a = ((360 / bolts) * i) * Math.PI / 180;
      s += `<circle cx="${R(cx + Math.cos(a) * rr * 0.28)}" cy="${R(cy + Math.sin(a) * rr * 0.28)}" r="${R(rr * 0.075)}" fill="#5b6474"/>`;
    }
    s += `<circle cx="${R(cx)}" cy="${R(cy)}" r="${R(rr * 0.17)}" fill="#cfd6e2"/>`;
    /* odlesk – aby bylo poznat, že se kolo točí */
    s += `<path d="M ${R(cx - rr * 0.62)} ${R(cy - rr * 0.28)} a ${R(rr * 0.68)} ${R(rr * 0.68)} 0 0 1 ${R(rr * 0.5)} ${R(-rr * 0.45)}" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="${R(rr * 0.11)}" stroke-linecap="round"/>`;

    s += `</g>`;
    return s;
  };

  /* ---------------------------------------------------------------------
   *  PÁS (housenkový podvozek)
   * ------------------------------------------------------------------- */
  A.track = function track(o) {
    const {
      x1, x2, cy, r = 30, band = 16,
      belt = '#191d24', link = '#39414f', frame = '#414a59',
      rollers = 5, rimColor = '#d7dde7'
    } = o;

    const d = `M ${R(x1)} ${R(cy - r)} L ${R(x2)} ${R(cy - r)} ` +
              `A ${R(r)} ${R(r)} 0 0 1 ${R(x2)} ${R(cy + r)} ` +
              `L ${R(x1)} ${R(cy + r)} ` +
              `A ${R(r)} ${R(r)} 0 0 1 ${R(x1)} ${R(cy - r)} Z`;

    let s = `<g class="track">`;

    /* rám podvozku pod pásem */
    s += `<rect x="${R(x1 - 4)}" y="${R(cy - r + band * 0.5)}" width="${R(x2 - x1 + 8)}" height="${R(r * 1.15)}" rx="${R(r * 0.35)}" fill="${frame}"/>`;

    /* pojezdové kladky */
    const n = Math.max(2, rollers);
    for (let i = 0; i < n; i++) {
      const rx = x1 + ((x2 - x1) / (n - 1)) * i;
      s += `<circle cx="${R(rx)}" cy="${R(cy + r * 0.55)}" r="${R(r * 0.26)}" fill="#5a6373" stroke="#2b323d" stroke-width="2"/>`;
      s += `<circle cx="${R(rx)}" cy="${R(cy + r * 0.55)}" r="${R(r * 0.10)}" fill="#2b323d"/>`;
    }

    /* samotný pás */
    s += `<path d="${d}" fill="none" stroke="${belt}" stroke-width="${R(band)}" stroke-linejoin="round"/>`;
    s += `<path d="${d}" fill="none" stroke="${link}" stroke-width="${R(band - 6)}" stroke-dasharray="7 10" stroke-linecap="butt" data-track="1"/>`;
    s += `<path d="${d}" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="2"/>`;

    /* hnací a napínací kolo */
    s += A.wheel({ cx: x1, cy, r: r - 8, style: 'road', lugs: 12, spokes: 5, bolts: 6, rimColor, rimR: 0.55 });
    s += A.wheel({ cx: x2, cy, r: r - 10, style: 'road', lugs: 10, spokes: 5, bolts: 6, rimColor, rimR: 0.5 });

    s += `</g>`;
    return s;
  };

  /* ---------------------------------------------------------------------
   *  SVĚTLA
   * ------------------------------------------------------------------- */

  /** přední světlomet + kužel (kužel jen když svítí) */
  A.lamp = function lamp(o) {
    const { x, y, r = 9, beam = true, len = 230, spread = 52, ring = '#cfd6e2' } = o;
    let s = `<g class="lamp">`;
    if (beam) {
      s += `<g class="fx-light"><path d="M ${R(x)} ${R(y)} L ${R(x + len)} ${R(y - spread)} L ${R(x + len)} ${R(y + spread)} Z" fill="url(#gBeam)"/></g>`;
    }
    s += `<g class="fx-light"><circle cx="${R(x)}" cy="${R(y)}" r="${R(r * 3.1)}" fill="url(#gGlow)"/></g>`;
    s += `<circle cx="${R(x)}" cy="${R(y)}" r="${R(r + 2)}" fill="${ring}"/>`;
    s += `<circle cx="${R(x)}" cy="${R(y)}" r="${R(r)}" fill="url(#gLamp)" class="lamp-lens"/>`;
    s += `<circle cx="${R(x - r * 0.3)}" cy="${R(y - r * 0.34)}" r="${R(r * 0.26)}" fill="#fff" fill-opacity="0.85"/>`;
    s += `</g>`;
    return s;
  };

  /** zadní červené světlo */
  A.tailLamp = function tailLamp(o) {
    const { x, y, r = 7 } = o;
    return `<g class="lamp">` +
      `<g class="fx-light"><circle cx="${R(x)}" cy="${R(y)}" r="${R(r * 2.8)}" fill="url(#gRedGlow)"/></g>` +
      `<circle cx="${R(x)}" cy="${R(y)}" r="${R(r + 1.6)}" fill="#cfd6e2"/>` +
      `<circle cx="${R(x)}" cy="${R(y)}" r="${R(r)}" fill="url(#gRedLamp)"/>` +
      `</g>`;
  };

  /** couvací světlo – svítí jen při couvání */
  A.reverseLamp = function reverseLamp(o) {
    const { x, y, r = 6 } = o;
    return `<g class="lamp">` +
      `<g class="fx-reverse"><circle cx="${R(x)}" cy="${R(y)}" r="${R(r * 3.4)}" fill="url(#gWhiteGlow)"/></g>` +
      `<circle cx="${R(x)}" cy="${R(y)}" r="${R(r + 1.4)}" fill="#aeb6c6"/>` +
      `<circle cx="${R(x)}" cy="${R(y)}" r="${R(r)}" fill="#eef4ff"/>` +
      `</g>`;
  };

  /** malé obrysové světélko (americký truck jich má spoustu) */
  A.marker = function marker(o) {
    const { x, y, r = 4, color = '#ffb52e', i = 0 } = o;
    return `<g class="marker" data-marker="${i}">` +
      `<circle cx="${R(x)}" cy="${R(y)}" r="${R(r * 3)}" fill="url(#gGlow)" class="marker-glow"/>` +
      `<circle cx="${R(x)}" cy="${R(y)}" r="${R(r)}" fill="${color}" stroke="#8a6a1a" stroke-width="0.8"/>` +
      `<circle cx="${R(x - r * 0.25)}" cy="${R(y - r * 0.3)}" r="${R(r * 0.3)}" fill="#fff" fill-opacity="0.8"/>` +
      `</g>`;
  };

  /** oranžový majáček s rotujícím kuželem */
  A.beacon = function beacon(o) {
    const { x, y, w = 20, h = 15 } = o;
    return `<g class="beacon">` +
      `<g class="fx-beacon">` +
        `<g class="beacon-cone">` +
          `<path d="M ${R(x)} ${R(y)} L ${R(x - w * 2.6)} ${R(y - h * 3.4)} L ${R(x + w * 0.2)} ${R(y - h * 3.9)} Z" fill="url(#gBeaconCone)"/>` +
          `<path d="M ${R(x)} ${R(y)} L ${R(x + w * 2.6)} ${R(y - h * 3.4)} L ${R(x - w * 0.2)} ${R(y - h * 3.9)} Z" fill="url(#gBeaconCone)"/>` +
        `</g>` +
        `<ellipse cx="${R(x)}" cy="${R(y - h * 0.4)}" rx="${R(w * 1.7)}" ry="${R(h * 1.7)}" fill="url(#gGlow)"/>` +
      `</g>` +
      `<rect x="${R(x - w / 2 - 3)}" y="${R(y - 3)}" width="${R(w + 6)}" height="6" rx="3" fill="#39414f"/>` +
      `<path d="M ${R(x - w / 2)} ${R(y - 1)} q 0 ${R(-h)} ${R(w / 2)} ${R(-h)} q ${R(w / 2)} 0 ${R(w / 2)} ${R(h)} Z" fill="url(#gBeacon)"/>` +
      `<path d="M ${R(x - w * 0.3)} ${R(y - 3)} q ${R(w * 0.08)} ${R(-h * 0.75)} ${R(w * 0.32)} ${R(-h * 0.8)}" fill="none" stroke="#fff" stroke-opacity="0.65" stroke-width="2.4" stroke-linecap="round"/>` +
      `</g>`;
  };

  /* ---------------------------------------------------------------------
   *  SKLO
   * ------------------------------------------------------------------- */
  A.glass = function glass(d, o) {
    o = o || {};
    const tint = o.tint || '#9fd8f7';
    const op = o.op === undefined ? 0.40 : o.op;
    const stroke = o.stroke || '#e8eef6';
    return `<path d="${d}" fill="${tint}" fill-opacity="${op}"/>` +
           `<path d="${d}" fill="url(#gGlass)"/>` +
           `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${o.sw || 2.5}" stroke-linejoin="round"/>`;
  };

  /* ---------------------------------------------------------------------
   *  ŘIDIČ – malý usmívající se panáček (dítě ho hned najde)
   * ------------------------------------------------------------------- */
  A.driver = function driver(o) {
    const { x, y, s = 1, cap = '#e63946', shirt = '#2f6fd0', skin = '#f3c49a', hair = '#5b3a21' } = o;
    return `<g class="driver" transform="translate(${R(x)} ${R(y)}) scale(${R(s)})">` +
      `<path d="M -17 36 q 1 -25 17 -25 q 16 0 17 25 z" fill="${shirt}"/>` +
      `<path d="M -17 36 q 1 -25 17 -25 q 16 0 17 25 z" fill="#000" fill-opacity="0.12" clip-path="none" transform="translate(0 0)" opacity="0"/>` +
      `<rect x="-6" y="6" width="12" height="9" rx="4" fill="${skin}"/>` +
      `<circle cx="0" cy="-4" r="13" fill="${skin}"/>` +
      `<path d="M -13 -6 a 13 13 0 0 1 26 0 z" fill="${hair}"/>` +
      `<path d="M -14 -7 a 14 14 0 0 1 28 0 z" fill="${cap}"/>` +
      `<path d="M 4 -8 h 17 a 3 3 0 0 1 0 6 h -17 z" fill="${cap}" fill-opacity="0.9"/>` +
      `<circle cx="0" cy="-19" r="2.6" fill="#fff" fill-opacity="0.85"/>` +
      `<circle cx="6" cy="-2" r="2.1" fill="#39281c"/>` +
      `<circle cx="6.7" cy="-2.7" r="0.7" fill="#fff"/>` +
      `<path d="M 2 4 q 5.5 4.5 10 -0.5" fill="none" stroke="#8d5a3b" stroke-width="1.8" stroke-linecap="round"/>` +
      `<circle cx="10" cy="1" r="2.6" fill="#f0968a" fill-opacity="0.55"/>` +
      `</g>`;
  };

  /* ---------------------------------------------------------------------
   *  DROBNOSTI
   * ------------------------------------------------------------------- */

  /** mřížka chladiče / žebrování */
  A.grille = function grille(o) {
    const { x, y, w, h, bars = 6, color = '#20252e', frame = 'url(#gChrome)', rx = 4, dir = 'h' } = o;
    let s = `<rect x="${R(x)}" y="${R(y)}" width="${R(w)}" height="${R(h)}" rx="${rx}" fill="${frame}"/>`;
    s += `<rect x="${R(x + 2)}" y="${R(y + 2)}" width="${R(w - 4)}" height="${R(h - 4)}" rx="${Math.max(0, rx - 2)}" fill="${color}"/>`;
    if (dir === 'h') {
      const step = (h - 6) / bars;
      for (let i = 0; i < bars; i++) {
        s += `<rect x="${R(x + 3)}" y="${R(y + 4 + step * i)}" width="${R(w - 6)}" height="${R(step * 0.5)}" rx="1" fill="#cfd6e2" fill-opacity="0.75"/>`;
      }
    } else {
      const step = (w - 6) / bars;
      for (let i = 0; i < bars; i++) {
        s += `<rect x="${R(x + 4 + step * i)}" y="${R(y + 3)}" width="${R(step * 0.45)}" height="${R(h - 6)}" rx="1" fill="#cfd6e2" fill-opacity="0.75"/>`;
      }
    }
    return s;
  };

  /** žebřík / stupačky */
  A.ladder = function ladder(o) {
    const { x1, y1, x2, y2, steps = 3, w = 16, color = '#4a5464' } = o;
    let s = `<line x1="${R(x1)}" y1="${R(y1)}" x2="${R(x2)}" y2="${R(y2)}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`;
    s += `<line x1="${R(x1 + w)}" y1="${R(y1)}" x2="${R(x2 + w)}" y2="${R(y2)}" stroke="${color}" stroke-width="4" stroke-linecap="round"/>`;
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const px = x1 + (x2 - x1) * t, py = y1 + (y2 - y1) * t;
      s += `<line x1="${R(px)}" y1="${R(py)}" x2="${R(px + w)}" y2="${R(py)}" stroke="#8b95a6" stroke-width="4" stroke-linecap="round"/>`;
    }
    return s;
  };

  /** hydraulický píst mezi dvěma body (jen jako ozdoba, nemění délku) */
  A.piston = function piston(o) {
    const { x1, y1, x2, y2, w = 11, body = '#5d6676', rod = 'url(#gChromeH)' } = o;
    const mx = x1 + (x2 - x1) * 0.55, my = y1 + (y2 - y1) * 0.55;
    return `<line x1="${R(x1)}" y1="${R(y1)}" x2="${R(mx)}" y2="${R(my)}" stroke="${body}" stroke-width="${R(w)}" stroke-linecap="round"/>` +
      `<line x1="${R(x1)}" y1="${R(y1)}" x2="${R(mx)}" y2="${R(my)}" stroke="#fff" stroke-opacity="0.18" stroke-width="${R(w * 0.35)}" stroke-linecap="round"/>` +
      `<line x1="${R(mx)}" y1="${R(my)}" x2="${R(x2)}" y2="${R(y2)}" stroke="${rod}" stroke-width="${R(w * 0.5)}" stroke-linecap="round"/>` +
      `<circle cx="${R(x1)}" cy="${R(y1)}" r="${R(w * 0.42)}" fill="#39414f"/>` +
      `<circle cx="${R(x2)}" cy="${R(y2)}" r="${R(w * 0.36)}" fill="#39414f"/>`;
  };

  /** výfuková roura s čepičkou */
  A.stack = function stack(o) {
    const { x, yTop, yBottom, w = 13, color = 'url(#gChrome)', cap = true } = o;
    let s = `<rect x="${R(x - w / 2)}" y="${R(yTop)}" width="${R(w)}" height="${R(yBottom - yTop)}" rx="${R(w * 0.25)}" fill="${color}"/>`;
    if (cap) {
      s += `<rect x="${R(x - w * 0.85)}" y="${R(yTop - 7)}" width="${R(w * 1.7)}" height="9" rx="4" fill="url(#gChromeH)"/>`;
      s += `<ellipse cx="${R(x)}" cy="${R(yTop - 6)}" rx="${R(w * 0.55)}" ry="2.6" fill="#1a1f27"/>`;
    }
    return s;
  };

  /** neviditelný bod, ze kterého se sypou/kouří částice */
  A.emitter = function emitter(name, x, y) {
    return `<circle class="emit" data-emit="${name}" cx="${R(x)}" cy="${R(y)}" r="1" fill="none" pointer-events="none"/>`;
  };

  /** měkký stín pod strojem */
  A.shadow = function shadow(o) {
    const { x, y = 262, rx, ry = 13 } = o;
    return `<ellipse cx="${R(x)}" cy="${R(y + 4)}" rx="${R(rx)}" ry="${R(ry)}" fill="url(#gShadow)"/>`;
  };

  /** blatník jako oblouk */
  A.fender = function fender(o) {
    const { cx, cy, r, color, w = 15, from = 200, to = 340 } = o;
    const a1 = from * Math.PI / 180, a2 = to * Math.PI / 180;
    const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    const x2 = cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r;
    const large = (to - from) > 180 ? 1 : 0;
    return `<path d="M ${R(x1)} ${R(y1)} A ${R(r)} ${R(r)} 0 ${large} 1 ${R(x2)} ${R(y2)}" fill="none" stroke="${color}" stroke-width="${R(w)}" stroke-linecap="round"/>` +
      `<path d="M ${R(x1)} ${R(y1)} A ${R(r)} ${R(r)} 0 ${large} 1 ${R(x2)} ${R(y2)}" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="${R(w * 0.3)}" stroke-linecap="round" transform="translate(0 ${R(-w * 0.28)})"/>`;
  };

  /** nýtovaný pruh (dekorace na plechu) */
  A.rivets = function rivets(o) {
    const { x1, y1, x2, y2, n = 6, r = 1.8, color = '#00000033' } = o;
    let s = '';
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      s += `<circle cx="${R(x1 + (x2 - x1) * t)}" cy="${R(y1 + (y2 - y1) * t)}" r="${r}" fill="${color}"/>`;
    }
    return s;
  };

  global.ART = A;
})(typeof window !== 'undefined' ? window : globalThis);

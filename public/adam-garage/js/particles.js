/* =============================================================================
 *  particles.js  –  Kouř, prach, hlína, zrní, sníh, voda, beton, konfety
 *  -----------------------------------------------------------------------
 *  Jednoduchý částicový systém nad <canvas>, který leží přes celé jeviště.
 * ===========================================================================*/
(function (global) {
  'use strict';

  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  /* ---- druhy částic ----------------------------------------------------
   *  soft   … měkký obláček (kreslí se jako rozmazaná skvrna)
   *  chunk  … pevný kousek (kolečko)
   *  flake  … otáčející se destička
   * -------------------------------------------------------------------- */
  const TYPES = {
    smoke: {
      shape: 'soft', colors: ['#6d7480', '#828a97', '#9aa2ae'],
      r: [7, 14], grow: [10, 22], life: [1.5, 2.6],
      vx: [-16, 10], vy: [-52, -30], g: -6, drag: 0.42, alpha: 0.5, backDrift: 0.55
    },
    dust: {
      shape: 'soft', colors: ['#b9976c', '#cbab7f', '#a8895f'],
      r: [6, 13], grow: [14, 26], life: [0.7, 1.3],
      vx: [-40, 4], vy: [-26, -6], g: 6, drag: 1.1, alpha: 0.45, backDrift: 1.1
    },
    soil: {
      shape: 'chunk', colors: ['#6b4a2f', '#8a6440', '#5a3d26', '#7d5836'],
      r: [2.5, 6.5], grow: [-1, 0], life: [0.8, 1.5], land: true,
      vx: [-90, -10], vy: [-130, -50], g: 300, drag: 0.15, alpha: 1, backDrift: 0.5
    },
    concrete: {
      shape: 'chunk', colors: ['#9aa0a8', '#b3b9c1', '#868d96'],
      r: [3, 8], grow: [0, 2], life: [0.7, 1.2], land: true,
      vx: [-24, 10], vy: [10, 40], g: 420, drag: 0.1, alpha: 1, backDrift: 0.2
    },
    grain: {
      shape: 'chunk', colors: ['#f2c94c', '#ffdd77', '#d9a52a'],
      r: [1.8, 3.6], grow: [0, 0], life: [0.8, 1.4], land: true,
      vx: [-30, 14], vy: [10, 46], g: 380, drag: 0.08, alpha: 1, backDrift: 0.2
    },
    wheat: {
      shape: 'flake', colors: ['#e9c157', '#f6da8a', '#cfa53c'],
      r: [3, 7], grow: [0, 0], life: [0.9, 1.6], land: true,
      vx: [10, 90], vy: [-120, -40], g: 260, drag: 0.2, alpha: 1, backDrift: 0
    },
    straw: {
      shape: 'flake', colors: ['#d9be76', '#c2a45c', '#eddaa4'],
      r: [4, 9], grow: [0, 0], life: [1, 1.8], land: true,
      vx: [-130, -50], vy: [-70, -10], g: 210, drag: 0.25, alpha: 1, backDrift: 0.4
    },
    snow: {
      shape: 'soft', colors: ['#ffffff', '#eaf6ff', '#d8ecfa'],
      r: [4, 10], grow: [4, 12], life: [0.9, 1.8], land: true,
      vx: [-70, -12], vy: [-90, -30], g: 150, drag: 0.5, alpha: 0.85, backDrift: 0.6
    },
    water: {
      shape: 'chunk', colors: ['#9fd8f7', '#cdeaff', '#7cc4ec'],
      r: [1.6, 3.6], grow: [0, 0], life: [0.5, 1.0], land: true,
      vx: [-80, -10], vy: [-46, -6], g: 340, drag: 0.2, alpha: 0.9, backDrift: 0.5
    },
    confetti: {
      shape: 'flake', colors: ['#ff5a5a', '#ffd21e', '#4aa3e8', '#5cb063', '#f4622c', '#c77dff'],
      r: [4, 9], grow: [0, 0], life: [1.2, 2.2], land: true,
      vx: [-150, 150], vy: [-330, -170], g: 420, drag: 0.25, alpha: 1, backDrift: 0
    },
    spark: {
      shape: 'chunk', colors: ['#fff3b0', '#ffd21e', '#ffffff'],
      r: [1.6, 3.4], grow: [0, 0], life: [0.4, 0.8], land: true,
      vx: [-120, 120], vy: [-160, -20], g: 380, drag: 0.3, alpha: 1, backDrift: 0
    },
    mud: {
      shape: 'chunk', colors: ['#4a3420', '#5e4227', '#38281a', '#6b4d2e'],
      r: [3, 7.5], grow: [-0.5, 0.5], life: [0.6, 1.2], land: true,
      vx: [-110, -20], vy: [-150, -60], g: 340, drag: 0.14, alpha: 1, backDrift: 0.6
    },
    electric: {
      shape: 'chunk', colors: ['#aef3ff', '#6ee7ff', '#ffffff', '#8ff5c9'],
      r: [1.4, 2.8], grow: [0, 0], life: [0.35, 0.7], land: false,
      vx: [-60, 60], vy: [-70, 10], g: 40, drag: 0.5, alpha: 1, backDrift: 0
    },
    star: {
      shape: 'flake', colors: ['#ffd21e', '#fff3b0', '#ffffff'],
      r: [3, 6], grow: [0, 0], life: [0.6, 1.1], land: false,
      vx: [-100, 100], vy: [-200, -80], g: 260, drag: 0.2, alpha: 1, backDrift: 0
    }
  };

  function Particles(canvas) {
    this.cv = canvas;
    this.cx = canvas.getContext('2d');
    this.list = [];
    this.max = 460;
    this.scale = 1;
    this.groundY = 1e6;   /* výška terénu v pixelech – nastaví aplikace */
    this.w = 0; this.h = 0; this.dpr = 1;
    this._sprites = {};
  }

  Particles.prototype.resize = function (w, h, dpr) {
    this.dpr = dpr || (global.devicePixelRatio || 1);
    this.w = w; this.h = h;
    this.cv.width = Math.max(1, Math.round(w * this.dpr));
    this.cv.height = Math.max(1, Math.round(h * this.dpr));
    this.cv.style.width = w + 'px';
    this.cv.style.height = h + 'px';
    this.cx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };

  /** měkká skvrna se předkreslí jednou pro každou barvu */
  Particles.prototype.sprite = function (color) {
    let s = this._sprites[color];
    if (s) return s;
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, color);
    grd.addColorStop(0.45, color);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = 1;
    g.fillStyle = grd;
    g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.fill();
    /* barva v gradientu musí být průhledná na okraji – přebarvíme přes kompozici */
    const out = document.createElement('canvas');
    out.width = out.height = size;
    const og = out.getContext('2d');
    og.drawImage(c, 0, 0);
    og.globalCompositeOperation = 'destination-in';
    const grd2 = og.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd2.addColorStop(0, 'rgba(0,0,0,1)');
    grd2.addColorStop(0.35, 'rgba(0,0,0,0.85)');
    grd2.addColorStop(1, 'rgba(0,0,0,0)');
    og.fillStyle = grd2;
    og.fillRect(0, 0, size, size);
    this._sprites[color] = out;
    return out;
  };

  /**
   * @param {string} type  druh částice
   * @param {number} x,y   souřadnice v pixelech plátna
   * @param {number} dir   směr jízdy (-1 / 0 / 1) – částice odletují dozadu
   * @param {number} sp    rychlost 0..1 (přidá se do počáteční rychlosti)
   */
  Particles.prototype.spawn = function (type, x, y, dir, sp) {
    const T = TYPES[type];
    if (!T || this.list.length >= this.max) return;
    const k = this.scale;
    const back = -(dir || 0) * (T.backDrift || 0) * 190 * (0.35 + (sp || 0));
    this.list.push({
      x: x, y: y,
      vx: (rnd(T.vx[0], T.vx[1]) + back) * k,
      vy: rnd(T.vy[0], T.vy[1]) * k,
      g: T.g * k,
      drag: T.drag,
      r: rnd(T.r[0], T.r[1]) * k,
      grow: rnd(T.grow[0], T.grow[1]) * k,
      life: 0,
      max: rnd(T.life[0], T.life[1]),
      color: pick(T.colors),
      shape: T.shape,
      alpha: T.alpha,
      land: !!T.land,
      rot: rnd(0, Math.PI * 2),
      vr: rnd(-7, 7)
    });
  };

  /** dávka částic naráz (konfety při ťuknutí na stroj) */
  Particles.prototype.burst = function (type, x, y, n) {
    for (let i = 0; i < n; i++) this.spawn(type, x + rnd(-14, 14) * this.scale, y + rnd(-14, 14) * this.scale, 0, 0);
  };

  Particles.prototype.update = function (dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life += dt;
      if (p.life >= p.max) { L.splice(i, 1); continue; }
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d;
      p.vy = p.vy * d + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.grow * dt;
      p.rot += p.vr * dt;

      /* dopad na zem – kousek se odrazí a rychle zmizí */
      if (p.land && p.vy > 0 && p.y > this.groundY) {
        p.y = this.groundY;
        p.vy = -p.vy * 0.22;
        p.vx *= 0.45;
        p.vr *= 0.3;
        p.life = Math.max(p.life, p.max - 0.3);
      }
      if (p.r < 0.3) { L.splice(i, 1); }
    }
  };

  Particles.prototype.draw = function () {
    const c = this.cx;
    c.clearRect(0, 0, this.w, this.h);
    const L = this.list;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      const t = p.life / p.max;
      const a = p.alpha * (t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88);
      if (a <= 0.01) continue;
      c.globalAlpha = Math.min(1, a);
      if (p.shape === 'soft') {
        const s = this.sprite(p.color);
        c.drawImage(s, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      } else if (p.shape === 'flake') {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot);
        c.fillStyle = p.color;
        c.fillRect(-p.r, -p.r * 0.42, p.r * 2, p.r * 0.84);
        c.restore();
      } else {
        c.fillStyle = p.color;
        c.beginPath();
        c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalAlpha = 1;
  };

  Particles.prototype.clear = function () {
    this.list.length = 0;
    this.cx.clearRect(0, 0, this.w, this.h);
  };

  global.Particles = Particles;
})(typeof window !== 'undefined' ? window : globalThis);

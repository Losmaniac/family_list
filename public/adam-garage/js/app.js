/* =============================================================================
 *  app.js  –  Mozek celé hry
 *  -----------------------------------------------------------------------
 *  Garáž -> výběr stroje -> jeviště s ovládáním.
 *  Jedna smyčka requestAnimationFrame se stará o kola, pozadí, částice,
 *  hydrauliku i hlasitost motoru.
 * ===========================================================================*/
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  let uidN = 0;
  const uid = () => 'g' + (++uidN) + '-';

  /* ---------------------------------------------------------------- prvky */
  const el = {
    body: document.body,
    garageScreen: $('#screen-garage'),
    playScreen: $('#screen-play'),
    garage: $('#garage'),
    stage: $('#stage'),
    sky: $('#sky'),
    sun: $('#sun'),
    layers: $('#layers'),
    wrap: $('#vehicleWrap'),
    fx: $('#fx'),
    banner: $('#banner'),
    controls: $('#controls'),
    playName: $('#play-name'),
    playEmoji: $('#play-emoji'),
    actionIcon: $('#action-icon'),
    actionLabel: $('#action-label'),
    btnAction: $('#btn-action'),
    btnBack: $('#btn-back'),
    btnPrev: $('#btn-prev'),
    btnNext: $('#btn-next'),
    btnSound: $('#btn-sound'),
    btnSound2: $('#btn-sound2'),
    btnFull: $('#btn-full')
  };

  /* ------------------------------------------------------------- ikonky */
  const ICONS = {
    plow: '<svg viewBox="0 0 24 24"><path d="M3 6h9a2 2 0 0 1 2 2v2h-4z" /><path d="M14 10h6l1 5-6 1z"/><path d="M4 17h16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M8 10v4M11 11v3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    bucket: '<svg viewBox="0 0 24 24"><path d="M3 4l7 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M8 8h11a1 1 0 0 1 1 1v4a5 5 0 0 1-5 5h-3a4 4 0 0 1-4-4z"/><path d="M9 18v3M13 18v3M17 18v3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    blade: '<svg viewBox="0 0 24 24"><path d="M3 8h7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M14 3c-3 5-3 12 0 18h5c-3-6-3-13 0-18z"/><path d="M4 20h7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M10 8l5 3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24"><path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M19 14l.9 2.6L22.5 18l-2.6.9L19 21.5l-.9-2.6L15.5 18l2.6-1z"/><path d="M5 2l.7 2L8 4.7l-2.3.8L5 8l-.7-2.5L2 4.7 4.3 4z"/></svg>',
    wheat: '<svg viewBox="0 0 24 24"><path d="M12 22V9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M12 9c0-3 2-5 4-6 .5 3-1 5.5-4 6zM12 9C12 6 10 4 8 3c-.5 3 1 5.5 4 6z"/><path d="M12 14c0-2.6 2-4.4 4-5.2.4 2.6-1 4.7-4 5.2zM12 14c0-2.6-2-4.4-4-5.2-.4 2.6 1 4.7 4 5.2z"/></svg>',
    pour: '<svg viewBox="0 0 24 24"><ellipse cx="13" cy="8" rx="8" ry="5.5" transform="rotate(-14 13 8)"/><path d="M6 11l-3 4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M2 16c0 2 1 3 1 3M5 17c0 2 1 3 1 3M8 18c0 1.5.8 2.5.8 2.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    snow: '<svg viewBox="0 0 24 24"><path d="M12 2v20M3.4 7l17.2 10M20.6 7L3.4 17" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/><path d="M9 4.5L12 7l3-2.5M9 19.5L12 17l3 2.5" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mud: '<svg viewBox="0 0 24 24"><circle cx="9" cy="15" r="5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="9" cy="15" r="2"/><path d="M15 9l2-3M18 12l3-1M16 16l3 2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    wheelie: '<svg viewBox="0 0 24 24"><circle cx="7" cy="17" r="5" fill="none" stroke="currentColor" stroke-width="2.3"/><circle cx="7" cy="17" r="1.6"/><path d="M12 14L19 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M14 4h6v6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    door: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="10" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M13 7l7-2v14l-7-2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="9" cy="12" r="1"/></svg>',
    mountain: '<svg viewBox="0 0 24 24"><path d="M2 19l6-10 4 6 3-4 7 8z"/><circle cx="18" cy="6" r="2"/></svg>',
    trunk: '<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M4 11l2-6h12l2 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M9 15h6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
    roof: '<svg viewBox="0 0 24 24"><path d="M3 15h18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M6 15c0-5 3-9 6-9s6 4 6 9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M13 4l3 2-3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  const PLAY_ICON = '<svg viewBox="0 0 24 24"><path d="M8 5l11 7-11 7z"/></svg>';

  const CARD_BG = {
    pole: 'linear-gradient(180deg,#cdeeff,#a9e2b0)',
    obili: 'linear-gradient(180deg,#d5f0ff,#f2dfa0)',
    stavba: 'linear-gradient(180deg,#d7eefb,#e3cfa8)',
    silnice: 'linear-gradient(180deg,#cfe6ff,#ffd9a8)',
    led: 'linear-gradient(180deg,#c9dcf2,#eef8ff)',
    teren: 'linear-gradient(180deg,#cdeaff,#c7ceac)',
    mesto: 'linear-gradient(180deg,#cfe6fb,#dfe6ec)',
    park: 'linear-gradient(180deg,#cdeeff,#bfe8b8)'
  };

  /* ----------------------------------------------------------------- stav */
  const S = {
    vehicle: null,
    index: 0,
    running: false,
    dir: 0,            /* -1 couvá, 0 stojí, 1 jede */
    speed: 0,          /* jednotky SVG / s */
    maxSpeed: 250,
    dist: 0,
    lights: false,
    sound: true,
    bobT: 0,
    bounceA: 0,
    bounceT: 0,
    action: { on: false, t: 0, finishing: false },
    acc: {},           /* načítání zlomků částic */
    store: {},         /* volné úložiště pro onFrame stroje */
    spin: {},
    scale: 1,
    ground: 120,
    layerEls: [],
    scene: null,
    els: null
  };

  let particles = null;
  let fxRect = { left: 0, top: 0 };
  let lastT = 0;
  let rafId = 0;

  /* =======================================================================
   *  START
   * =====================================================================*/
  function init() {
    $('#global-defs').innerHTML = ART.defs();
    particles = new Particles(el.fx);
    buildGarage();
    bindControls();
    bindKeyboard();

    /* načteme uložené nastavení zvuku */
    try {
      const st = localStorage.getItem('garaz-zvuk');
      if (st === '0') setSound(false); else setSound(true);
    } catch (_) { setSound(true); }

    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { SOUND.stopEngine(); SOUND.stopAction(); SOUND.stopReverseBeep(); }
      else if (S.running && S.vehicle && !S.vehicle.sound.silent) { SOUND.startEngine(S.vehicle.sound); }
    });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('contextmenu', (e) => {
      if (e.target.closest && e.target.closest('.stage, .card, .ctrl')) e.preventDefault();
    });
  }

  /* =======================================================================
   *  GARÁŽ
   * =====================================================================*/
  function buildGarage() {
    const frag = document.createDocumentFragment();
    VEHICLES.forEach((v, i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'card';
      card.setAttribute('role', 'listitem');
      card.style.setProperty('--card-edge', v.theme.dark);
      card.style.setProperty('--card-bg', CARD_BG[v.scene] || CARD_BG.pole);
      card.style.animationDelay = (i * 55) + 'ms';
      card.setAttribute('aria-label', v.name + ' – ' + v.subtitle);
      card.innerHTML =
        '<span class="card__art"><svg viewBox="0 26 560 244" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
        v.art(uid()) + '</svg></span>' +
        '<span class="card__label">' +
        '<span class="card__emoji" aria-hidden="true">' + v.emoji + '</span>' +
        '<span class="card__text"><span class="card__name">' + v.name + '</span>' +
        '<span class="card__sub">' + v.subtitle + '</span></span>' +
        '<span class="card__play" aria-hidden="true">' + PLAY_ICON + '</span>' +
        '</span>';
      card.addEventListener('click', () => openVehicle(i));
      frag.appendChild(card);
    });
    el.garage.appendChild(frag);
  }

  /* =======================================================================
   *  PŘEPÍNÁNÍ OBRAZOVEK
   * =====================================================================*/
  function openVehicle(index) {
    S.index = ((index % VEHICLES.length) + VEHICLES.length) % VEHICLES.length;
    const v = VEHICLES[S.index];
    S.vehicle = v;

    el.garageScreen.classList.remove('is-visible');
    el.playScreen.classList.add('is-visible');

    /* reset stavu */
    S.dir = 0; S.speed = 0; S.dist = 0;
    S.action = { on: false, t: 0, finishing: false };
    S.acc = {}; S.store = {}; S.spin = {};
    S.bounceA = 0;

    el.playName.textContent = v.name;
    el.playEmoji.textContent = v.emoji;
    el.actionLabel.textContent = v.action.label;
    el.actionIcon.innerHTML = ICONS[v.action.icon] || ICONS.sparkle;
    el.btnAction.setAttribute('aria-label', v.action.label);

    buildScene(v);
    buildVehicle(v);
    syncButtons();
    onResize();

    el.stage.classList.toggle('is-lights', S.lights);
    el.stage.classList.remove('is-reverse', 'is-polish');

    if (particles) particles.clear();

    if (!v.sound.silent) SOUND.startEngine(v.sound);
    SOUND.chime();
    setTimeout(() => SOUND.speak(v.name), 380);

    showBanner(v.name);

    S.running = true;
    lastT = 0;
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  function closeVehicle() {
    S.running = false;
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    SOUND.stopEngine();
    SOUND.stopAction();
    SOUND.stopReverseBeep();
    if (global_speechCancel) global_speechCancel();
    el.playScreen.classList.remove('is-visible');
    el.garageScreen.classList.add('is-visible');
    el.wrap.innerHTML = '';
    if (particles) particles.clear();
  }

  function global_speechCancel() {
    if (window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch (_) {} }
  }

  function showBanner(text) {
    el.banner.textContent = text;
    el.banner.classList.remove('is-on');
    void el.banner.offsetWidth;   /* restart animace */
    el.banner.classList.add('is-on');
  }

  /* =======================================================================
   *  KULISY
   * =====================================================================*/
  function buildScene(v) {
    const sc = SCENES[v.scene] || SCENES.pole;
    S.scene = sc;
    el.stage.style.setProperty('--sky', sc.sky);
    el.layers.innerHTML = '';
    S.layerEls = sc.layers.map((L) => {
      const d = document.createElement('div');
      d.className = 'layer';
      d.style.backgroundImage = L.css;
      el.layers.appendChild(d);
      return d;
    });
    if (sc.sun) {
      el.stage.classList.add('has-sun');
      el.stage.style.setProperty('--sun-c', sc.sun.color);
      el.stage.style.setProperty('--sun-x', sc.sun.x);
      el.stage.style.setProperty('--sun-y', sc.sun.y);
    } else {
      el.stage.classList.remove('has-sun');
    }
  }

  /* =======================================================================
   *  STROJ
   * =====================================================================*/
  function buildVehicle(v) {
    el.wrap.innerHTML =
      '<svg viewBox="0 0 560 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' + v.art(uid()) + '</svg>';

    const root = el.wrap.firstChild;
    const els = {
      root: root,
      wheels: $$('[data-wheel]', root),
      tracks: $$('[data-track]', root),
      parts: {},
      spins: [],
      emitters: {},
      markers: $$('[data-marker]', root),
      markerGlows: $$('[data-marker] .marker-glow', root),
      drum: $('[data-drum]', root)
    };
    $$('[data-part]', root).forEach((p) => { els.parts[p.getAttribute('data-part')] = p; });
    $$('[data-spin]', root).forEach((p) => { els.spins.push(p); S.spin[p.getAttribute('data-spin')] = 0; });
    $$('[data-emit]', root).forEach((p) => { els.emitters[p.getAttribute('data-emit')] = p; });
    S.els = els;

    /* výchozí poloha pohyblivých dílů */
    Object.keys(els.parts).forEach((k) => setRotation(els.parts[k], 0));
  }

  function setRotation(elem, deg) {
    const pv = (elem.getAttribute('data-pivot') || '0 0').split(/\s+/);
    elem.setAttribute('transform', 'rotate(' + deg.toFixed(2) + ' ' + pv[0] + ' ' + pv[1] + ')');
  }

  /* =======================================================================
   *  OVLÁDÁNÍ
   * =====================================================================*/
  function bindControls() {
    el.controls.addEventListener('click', (e) => {
      const b = e.target.closest('.ctrl');
      if (!b) return;
      doAction(b.getAttribute('data-act'));
    });

    el.wrap.addEventListener('click', () => { honk(); bounce(); });
    el.wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); honk(); bounce(); }
    });

    el.btnBack.addEventListener('click', closeVehicle);
    el.btnPrev.addEventListener('click', () => openVehicle(S.index - 1));
    el.btnNext.addEventListener('click', () => openVehicle(S.index + 1));
    el.btnSound.addEventListener('click', () => setSound(!S.sound));
    el.btnSound2.addEventListener('click', () => setSound(!S.sound));
    el.btnFull.addEventListener('click', toggleFullscreen);
  }

  function doAction(act) {
    if (act !== 'horn') SOUND.click();
    switch (act) {
      case 'go':     S.dir = S.dir === 1 ? 0 : 1; break;
      case 'rev':    S.dir = S.dir === -1 ? 0 : -1; break;
      case 'stop':   S.dir = 0; break;
      case 'horn':   honk(); break;
      case 'lights': setLights(!S.lights); break;
      case 'action': toggleVehicleAction(); break;
    }
    syncButtons();
  }

  function honk() {
    if (!S.vehicle) return;
    SOUND.horn(S.vehicle.sound.horn);
    /* malá oslava */
    const p = S.els && S.els.root;
    if (p && particles) {
      const r = el.wrap.getBoundingClientRect();
      particles.burst('confetti', r.left + r.width * 0.5 - fxRect.left, r.top + r.height * 0.35 - fxRect.top, 16);
    }
  }

  function bounce() { S.bounceA = 1; S.bounceT = 0; }

  function setLights(on) {
    S.lights = !!on;
    el.stage.classList.toggle('is-lights', S.lights);
    if (!S.lights && S.els) S.els.markerGlows.forEach((g) => { g.style.opacity = ''; });
  }

  function toggleVehicleAction() {
    const v = S.vehicle;
    if (!v) return;
    if (S.action.on && !S.action.finishing) {
      S.action.finishing = true;                 /* dojede do konce cyklu */
      SOUND.stopAction();
      el.stage.classList.remove('is-polish');
    } else if (!S.action.on) {
      S.action.on = true;
      S.action.t = 0;
      S.action.finishing = false;
      SOUND.startAction(v.action.sound, v.sound.horn);
      if (v.action.polish) el.stage.classList.add('is-polish');
    } else {
      S.action.finishing = false;                /* rozmyslel si to – jedeme dál */
      SOUND.startAction(v.action.sound, v.sound.horn);
      if (v.action.polish) el.stage.classList.add('is-polish');
    }
  }

  function stopVehicleAction() {
    S.action.on = false;
    S.action.finishing = false;
    S.action.t = 0;
    SOUND.stopAction();
    el.stage.classList.remove('is-polish');
    if (S.els) {
      const v = S.vehicle;
      Object.keys(v.action.parts || {}).forEach((k) => {
        if (S.els.parts[k]) setRotation(S.els.parts[k], 0);
      });
      S.els.markerGlows.forEach((g) => { g.style.opacity = ''; });
    }
    syncButtons();
  }

  function syncButtons() {
    $$('.ctrl', el.controls).forEach((b) => {
      const a = b.getAttribute('data-act');
      let on = false;
      if (a === 'go') on = S.dir === 1;
      else if (a === 'rev') on = S.dir === -1;
      else if (a === 'lights') on = S.lights;
      else if (a === 'action') on = S.action.on;
      b.classList.toggle('is-active', on);
      if (a === 'lights' || a === 'action') b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function setSound(on) {
    S.sound = !!on;
    SOUND.setEnabled(S.sound);
    [el.btnSound, el.btnSound2].forEach((b) => {
      b.classList.toggle('is-muted', !S.sound);
      b.setAttribute('aria-pressed', S.sound ? 'true' : 'false');
    });
    if (!S.sound) { SOUND.stopReverseBeep(); global_speechCancel(); }
    try { localStorage.setItem('garaz-zvuk', S.sound ? '1' : '0'); } catch (_) {}
  }

  function toggleFullscreen() {
    const d = document;
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      const e2 = d.documentElement;
      (e2.requestFullscreen || e2.webkitRequestFullscreen || function () {}).call(e2);
    } else {
      (d.exitFullscreen || d.webkitExitFullscreen || function () {}).call(d);
    }
  }

  function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (!S.running) {
        if (e.key === 'Enter' && document.activeElement && document.activeElement.classList.contains('card')) return;
        return;
      }
      const k = e.key.toLowerCase();
      const map = {
        arrowright: 'go', d: 'go',
        arrowleft: 'rev', a: 'rev',
        arrowdown: 'stop', s: 'stop',
        ' ': 'horn', h: 'horn',
        l: 'lights',
        enter: 'action', arrowup: 'action', w: 'action'
      };
      if (k === 'escape') { e.preventDefault(); closeVehicle(); return; }
      if (k === 'n') { e.preventDefault(); openVehicle(S.index + 1); return; }
      if (k === 'p') { e.preventDefault(); openVehicle(S.index - 1); return; }
      const act = map[k];
      if (act) {
        e.preventDefault();
        doAction(act);
        const b = $('.ctrl[data-act="' + act + '"]', el.controls);
        if (b) { b.classList.add('is-press'); setTimeout(() => b.classList.remove('is-press'), 130); }
      }
    });
  }

  /* =======================================================================
   *  ROZMĚRY
   * =====================================================================*/
  function onResize() {
    if (!S.scene) return;
    const r = el.stage.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;

    const ground = Math.round(r.height * S.scene.groundH);
    /* stroj může stát kousek "uvnitř" terénu – vzniká tím hloubka */
    const stand = Math.round(r.height * (S.scene.standH || S.scene.groundH));
    S.ground = stand;

    /* šířka stroje: vejde se na šířku i na výšku */
    const vw = Math.max(240, Math.min(r.width * 0.92, 820, (r.height - stand) * 1.9));
    const vh = vw * 300 / 560;
    S.scale = vw / 560;

    el.stage.style.setProperty('--vw', vw.toFixed(1) + 'px');
    el.stage.style.setProperty('--vh', vh.toFixed(1) + 'px');
    el.stage.style.setProperty('--ground', stand + 'px');
    el.stage.style.setProperty('--groundband', ground + 'px');

    S.layerEls.forEach((d, i) => {
      const L = S.scene.layers[i];
      d.style.height = Math.round(L.h * r.height) + 'px';
      d.style.bottom = Math.round(L.bottom * r.height) + 'px';
    });

    particles.resize(r.width, r.height, Math.min(2, window.devicePixelRatio || 1));
    particles.scale = Math.max(0.45, S.scale);
    particles.groundY = r.height - stand + 2;
    fxRect = el.fx.getBoundingClientRect();
  }

  /* =======================================================================
   *  SMYČKA
   * =====================================================================*/
  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (!S.running || !S.vehicle) return;

    const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016;
    lastT = now;

    const v = S.vehicle;

    /* --- rychlost ------------------------------------------------------ */
    const target = S.dir * S.maxSpeed;
    const a = (Math.abs(target) > Math.abs(S.speed) ? 340 : 620) * dt;
    if (S.speed < target) S.speed = Math.min(target, S.speed + a);
    else if (S.speed > target) S.speed = Math.max(target, S.speed - a);
    if (Math.abs(S.speed) < 0.6) S.speed = 0;

    S.dist += S.speed * dt;
    const throttle = clamp(Math.abs(S.speed) / S.maxSpeed, 0, 1);
    const moving = Math.abs(S.speed) > 2;
    const travelDir = S.speed > 0 ? 1 : S.speed < 0 ? -1 : 0;

    if (v.sound.silent) {
      /* kolo nemá motor – místo hukotu cvaká volnoběžka podle rychlosti */
      if (moving && S.sound) {
        S.acc.pedal = (S.acc.pedal || 0) + Math.abs(S.speed) * dt;
        const step = 13;
        while (S.acc.pedal > step) { S.acc.pedal -= step; SOUND.freewheelTick(0.07 + throttle * 0.05); }
      } else {
        S.acc.pedal = 0;
      }
    } else {
      SOUND.setThrottle(throttle * 0.92);
    }

    /* couvací pípák (kolo nemá couvací alarm) */
    if (S.dir === -1 && S.sound && !v.sound.silent) SOUND.startReverseBeep(); else SOUND.stopReverseBeep();
    el.stage.classList.toggle('is-reverse', S.dir === -1);

    /* --- kola a pásy --------------------------------------------------- */
    const els = S.els;
    for (let i = 0; i < els.wheels.length; i++) {
      const w = els.wheels[i];
      const rr = parseFloat(w.getAttribute('data-r')) || 30;
      const ang = (S.dist / rr) * (180 / Math.PI);
      w.setAttribute('transform',
        'rotate(' + ang.toFixed(2) + ' ' + w.getAttribute('data-cx') + ' ' + w.getAttribute('data-cy') + ')');
    }
    for (let i = 0; i < els.tracks.length; i++) {
      els.tracks[i].style.strokeDashoffset = (-S.dist).toFixed(1);
    }

    /* --- pořád se točící díly (motovidlo, kartáč) ---------------------- */
    if (v.spin) {
      const boost = S.action.on && v.action.spinBoost ? v.action.spinBoost : 1;
      els.spins.forEach((sp) => {
        const name = sp.getAttribute('data-spin');
        const rate = v.spin[name] || 120;
        S.spin[name] = (S.spin[name] || 0) + rate * dt * (0.18 + throttle * 0.9) * boost;
        const pv = (sp.getAttribute('data-pivot') || '0 0').split(/\s+/);
        sp.setAttribute('transform', 'rotate(' + (S.spin[name] % 360).toFixed(2) + ' ' + pv[0] + ' ' + pv[1] + ')');
      });
    }

    /* --- zvláštní činnost stroje --------------------------------------- */
    updateAction(v, dt);

    /* --- vlastní pohyb karoserie (houpání) ----------------------------- */
    S.bobT += dt * (7 + throttle * 13);
    let bob = Math.sin(S.bobT) * (0.5 + throttle * 3.4) + Math.sin(S.bobT * 3.7) * 0.45;
    let tilt = -travelDir * throttle * 0.65;
    if (S.bounceA > 0.001) {
      S.bounceT += dt * 15;
      bob += -Math.abs(Math.sin(S.bounceT)) * 20 * S.bounceA;
      tilt += Math.sin(S.bounceT * 0.8) * 2.2 * S.bounceA;
      S.bounceA = Math.max(0, S.bounceA - dt * 1.7);
    }
    el.wrap.style.transform =
      'translateX(-50%) translateY(' + bob.toFixed(2) + 'px) rotate(' + tilt.toFixed(2) + 'deg)';

    /* --- parallax ------------------------------------------------------ */
    const px = S.dist * S.scale;
    for (let i = 0; i < S.layerEls.length; i++) {
      S.layerEls[i].style.backgroundPositionX = (-px * S.scene.layers[i].speed).toFixed(1) + 'px';
    }

    /* --- částice -------------------------------------------------------- */
    emitAll(v, dt, throttle, moving, travelDir);
    particles.update(dt);
    particles.draw();

    /* --- doplňkový hák stroje ------------------------------------------ */
    if (v.onFrame) {
      v.onFrame({ els: els, dt: dt, throttle: throttle, actionActive: S.action.on, store: S.store, dist: S.dist });
    }
  }

  /* --------------------------------------------------------- činnost stroje */
  function updateAction(v, dt) {
    const A = v.action;
    if (!S.action.on) return;

    S.action.t += dt * 1000 / A.duration;
    if (S.action.t >= 1) {
      if (S.action.finishing || !A.loop) { stopVehicleAction(); return; }
      S.action.t -= 1;
      if (A.sound === 'airhorn') SOUND.startAction('airhorn', v.sound.horn);
    }

    const t = S.action.t;
    const parts = A.parts || {};
    Object.keys(parts).forEach((name) => {
      const target = S.els.parts[name];
      if (!target) return;
      setRotation(target, sampleKeys(parts[name], t));
    });

    /* běhající světýlka u trucku */
    if (A.chase && S.els.markerGlows.length) {
      const n = S.els.markerGlows.length;
      for (let i = 0; i < n; i++) {
        const k = (t * 5 + i / n) % 1;
        S.els.markerGlows[i].style.opacity = k < 0.34 ? '0.95' : '0.05';
      }
    }
  }

  /** interpolace klíčových snímků [[t,hodnota],…] s měkkým náběhem */
  function sampleKeys(keys, t) {
    if (!keys || !keys.length) return 0;
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const k0 = keys[i], k1 = keys[i + 1];
      if (t <= k1[0]) {
        const span = k1[0] - k0[0] || 1;
        const u = (t - k0[0]) / span;
        const e = u * u * (3 - 2 * u);
        return k0[1] + (k1[1] - k0[1]) * e;
      }
    }
    return keys[keys.length - 1][1];
  }

  /* -------------------------------------------------------------- částice */
  function pointOf(elem) {
    const m = elem.getScreenCTM();
    if (!m) return null;
    const x = parseFloat(elem.getAttribute('cx')) || 0;
    const y = parseFloat(elem.getAttribute('cy')) || 0;
    return {
      x: m.a * x + m.c * y + m.e - fxRect.left,
      y: m.b * x + m.d * y + m.f - fxRect.top
    };
  }

  function inRanges(ranges, t) {
    if (!ranges) return true;
    const list = Array.isArray(ranges[0]) ? ranges : [ranges];
    for (let i = 0; i < list.length; i++) {
      if (t >= list[i][0] && t <= list[i][1]) return true;
    }
    return false;
  }

  function emitAll(v, dt, throttle, moving, travelDir) {
    const defs = v.emitters || {};
    const names = Object.keys(defs);
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const d = defs[name];
      const src = S.els.emitters[name];
      if (!src) continue;

      let factor = 0;
      if (d.when === 'engine') factor = 0.35 + throttle * 1.5;
      else if (d.when === 'driving') factor = moving ? 0.25 + throttle * 1.4 : 0;
      else if (d.when === 'action') {
        factor = (S.action.on && inRanges(v.action.emitAt && v.action.emitAt[name], S.action.t)) ? 1 : 0;
      }
      if (factor <= 0) { S.acc[name] = 0; continue; }

      S.acc[name] = (S.acc[name] || 0) + d.rate * factor * dt;
      if (S.acc[name] < 1) continue;

      const p = pointOf(src);
      if (!p) { S.acc[name] = 0; continue; }
      let n = Math.min(6, Math.floor(S.acc[name]));
      S.acc[name] -= n;
      while (n-- > 0) particles.spawn(d.type, p.x, p.y, travelDir, throttle);
    }
  }

  /* ---------------------------------------------------------------- start */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

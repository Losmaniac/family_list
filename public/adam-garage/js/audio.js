/* =============================================================================
 *  audio.js  –  Zvuk
 *  -----------------------------------------------------------------------
 *  Všechno se syntetizuje přímo v prohlížeči (Web Audio API):
 *  motor, houkačka, couvací pípák, hydraulika, sypání betonu, sprška vody…
 *  Žádné externí zvukové soubory -> funguje i bez internetu.
 * ===========================================================================*/
(function (global) {
  'use strict';

  function Sound() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.engine = null;
    this.actionNode = null;
    this.revTimer = null;
    this._noise = null;
    this._voice = undefined;
  }

  /* ---------------------------------------------------------------- základ */

  Sound.prototype.init = function () {
    if (this.ctx) return this.ctx;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) return null;
    const ctx = this.ctx = new AC();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 26;
    comp.ratio.value = 9;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;

    const master = this.master = ctx.createGain();
    master.gain.value = this.enabled ? 0.85 : 0;
    master.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  };

  Sound.prototype.resume = function () {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  };

  Sound.prototype.setEnabled = function (on) {
    this.enabled = !!on;
    if (this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(on ? 0.85 : 0, t, 0.05);
    }
  };

  /** společný šumový buffer (růžovější než bílý – zní teplejším dojmem) */
  Sound.prototype.noiseBuffer = function () {
    if (this._noise) return this._noise;
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.0990460;
      b1 = 0.96300 * b1 + w * 0.2965164;
      b2 = 0.57000 * b2 + w * 1.0526913;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.22;
    }
    this._noise = buf;
    return buf;
  };

  Sound.prototype._noiseSource = function () {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;
    return src;
  };

  /* ---------------------------------------------------------------- MOTOR */

  Sound.prototype.startEngine = function (profile) {
    const ctx = this.init();
    if (!ctx) return;
    this.stopEngine();
    this.resume();

    const P = Object.assign(
      { base: 42, saw: 0.32, square: 0.15, noise: 0.06, whine: 0.01, cutoff: [220, 1500] },
      profile || {}
    );

    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(this.master);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = P.cutoff[0];
    filter.Q.value = 1.1;
    filter.connect(out);

    /* hlavní tón */
    const oscA = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.value = P.base;
    const gA = ctx.createGain(); gA.gain.value = P.saw;
    oscA.connect(gA); gA.connect(filter);

    /* podtón */
    const oscB = ctx.createOscillator();
    oscB.type = 'square';
    oscB.frequency.value = P.base * 2.01;
    const gB = ctx.createGain(); gB.gain.value = P.square;
    oscB.connect(gB); gB.connect(filter);

    /* turbo / ventilátor */
    const oscW = ctx.createOscillator();
    oscW.type = 'sine';
    oscW.frequency.value = P.base * 13;
    const gW = ctx.createGain(); gW.gain.value = 0.0001;
    oscW.connect(gW); gW.connect(out);

    /* šum výfuku */
    const nSrc = this._noiseSource();
    const nBp = ctx.createBiquadFilter();
    nBp.type = 'bandpass'; nBp.frequency.value = 420; nBp.Q.value = 0.8;
    const gN = ctx.createGain(); gN.gain.value = P.noise;
    nSrc.connect(nBp); nBp.connect(gN); gN.connect(filter);

    /* naftové "tuk-tuk-tuk" – pomalá modulace hlasitosti */
    const lfoDiv = P.lfoDiv || 3.4;
    const lfoDepth = P.lfoDepth === undefined ? 0.30 : P.lfoDepth;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = P.base / lfoDiv;
    const lfoG = ctx.createGain(); lfoG.gain.value = lfoDepth;
    lfo.connect(lfoG); lfoG.connect(out.gain);

    [oscA, oscB, oscW, lfo, nSrc].forEach((n) => n.start());
    out.gain.setTargetAtTime(0.34, ctx.currentTime, 0.35);

    this.engine = { out, filter, oscA, oscB, oscW, gW, gN, nBp, lfo, P, nodes: [oscA, oscB, oscW, lfo, nSrc] };
    this.setThrottle(0);
  };

  Sound.prototype.setThrottle = function (v) {
    const e = this.engine;
    if (!e || !this.ctx) return;
    const t = this.ctx.currentTime;
    const k = Math.max(0, Math.min(1, v));
    const P = e.P;
    const f = P.base * (1 + k * 1.15);
    e.oscA.frequency.setTargetAtTime(f, t, 0.14);
    e.oscB.frequency.setTargetAtTime(f * 2.01, t, 0.14);
    e.oscW.frequency.setTargetAtTime(P.base * (11 + k * 12), t, 0.2);
    e.gW.gain.setTargetAtTime(P.whine * (0.2 + k * 2.6), t, 0.2);
    e.gN.gain.setTargetAtTime(P.noise * (0.7 + k * 1.5), t, 0.2);
    e.nBp.frequency.setTargetAtTime(360 + k * 900, t, 0.2);
    e.filter.frequency.setTargetAtTime(P.cutoff[0] + (P.cutoff[1] - P.cutoff[0]) * k, t, 0.16);
    e.lfo.frequency.setTargetAtTime((P.base / (P.lfoDiv || 3.4)) * (1 + k * 1.1), t, 0.16);
    e.out.gain.setTargetAtTime(0.30 + k * 0.30, t, 0.18);
  };

  Sound.prototype.stopEngine = function () {
    const e = this.engine;
    if (!e) return;
    const t = this.ctx.currentTime;
    e.out.gain.cancelScheduledValues(t);
    e.out.gain.setTargetAtTime(0.0001, t, 0.12);
    e.nodes.forEach((n) => { try { n.stop(t + 0.6); } catch (_) {} });
    setTimeout(() => { try { e.out.disconnect(); } catch (_) {} }, 900);
    this.engine = null;
  };

  /* ------------------------------------------------------------- HOUKAČKA */

  Sound.prototype.horn = function (profile) {
    const ctx = this.init();
    if (!ctx || !this.enabled) return;
    this.resume();
    const P = Object.assign({ type: 'square', gain: 0.4, notes: [[440, 0, 0.4]] }, profile || {});
    const now = ctx.currentTime;

    const bus = ctx.createGain();
    bus.gain.value = 1;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.6;
    bus.connect(lp); lp.connect(this.master);

    P.notes.forEach(([freq, delay, dur]) => {
      const t0 = now + delay;
      [0, 1].forEach((k) => {                       /* dvě rozladěná kola pro plnost */
        const o = ctx.createOscillator();
        o.type = P.type;
        o.frequency.value = freq;
        o.detune.value = k ? 7 : -7;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(P.gain * (k ? 0.55 : 1), t0 + 0.035);
        g.gain.setValueAtTime(P.gain * (k ? 0.55 : 1), t0 + dur * 0.75);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(bus);
        o.start(t0); o.stop(t0 + dur + 0.05);
      });
    });

    /* krátký "fsss" na začátku – vzduchová houkačka */
    const n = this._noiseSource();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 1800;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.09, now);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    n.connect(hp); hp.connect(ng); ng.connect(this.master);
    n.start(now); n.stop(now + 0.2);

    setTimeout(() => { try { bus.disconnect(); lp.disconnect(); } catch (_) {} }, 3000);
  };

  /* ---------------------------------------------------- VOLNOBĚŽKA (KOLO) */

  /** krátké mechanické "cvak" – řetěz/volnoběžka jízdního kola */
  Sound.prototype.freewheelTick = function (vol) {
    const ctx = this.init();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;
    const src = this._noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400 + Math.random() * 700;
    bp.Q.value = 3.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol || 0.09, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(now); src.stop(now + 0.05);
  };

  /* --------------------------------------------------------- COUVACÍ PÍPÁK */

  Sound.prototype.beep = function (freq, dur, gain) {
    const ctx = this.init();
    if (!ctx || !this.enabled) return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = freq || 1150;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain || 0.16, now + 0.012);
    g.gain.setValueAtTime(gain || 0.16, now + (dur || 0.17) - 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + (dur || 0.17));
    o.connect(g); g.connect(this.master);
    o.start(now); o.stop(now + (dur || 0.17) + 0.03);
  };

  Sound.prototype.startReverseBeep = function () {
    if (this.revTimer) return;
    const self = this;
    const tick = function () { self.beep(1150, 0.18, 0.14); };
    tick();
    this.revTimer = setInterval(tick, 620);
  };

  Sound.prototype.stopReverseBeep = function () {
    if (this.revTimer) { clearInterval(this.revTimer); this.revTimer = null; }
  };

  /* ------------------------------------------------------- ZVUK ČINNOSTI */

  Sound.prototype.startAction = function (kind, hornProfile) {
    const ctx = this.init();
    if (!ctx) return;
    this.stopAction();
    this.resume();

    if (kind === 'airhorn') {           /* světelná show = trojí zatroubení */
      this.horn(hornProfile);
      const self = this;
      this._showTimer = setTimeout(function () { self.horn(hornProfile); }, 1500);
      return;
    }

    if (kind === 'charge') {            /* elektrické nabíjení – pulzující tón */
      const cOut = ctx.createGain();
      cOut.gain.value = 0.0001;
      cOut.connect(this.master);
      const o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 740;
      const g1 = ctx.createGain(); g1.gain.value = 0.5;
      o1.connect(g1); g1.connect(cOut);
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 1108;
      const g2 = ctx.createGain(); g2.gain.value = 0.22;
      o2.connect(g2); g2.connect(cOut);
      const cLfo = ctx.createOscillator(); cLfo.type = 'sine'; cLfo.frequency.value = 2.6;
      const cLfoG = ctx.createGain(); cLfoG.gain.value = 0.09;
      cLfo.connect(cLfoG); cLfoG.connect(cOut.gain);
      [o1, o2, cLfo].forEach((n) => n.start());
      cOut.gain.setTargetAtTime(0.10, ctx.currentTime, 0.3);
      this.actionNode = { out: cOut, nodes: [o1, o2, cLfo] };
      return;
    }

    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(this.master);

    const src = this._noiseSource();
    const f = ctx.createBiquadFilter();
    const nodes = [src];
    let lfo = null;

    if (kind === 'hydraulic') {
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 5.5;
      lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.34;
      const lg = ctx.createGain(); lg.gain.value = 520;
      lfo.connect(lg); lg.connect(f.frequency);
      out.gain.setTargetAtTime(0.14, ctx.currentTime, 0.3);
    } else if (kind === 'pour') {
      f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.9;
      lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 3.1;
      const lg = ctx.createGain(); lg.gain.value = 260;
      lfo.connect(lg); lg.connect(f.frequency);
      out.gain.setTargetAtTime(0.20, ctx.currentTime, 0.3);
    } else if (kind === 'thresh') {
      f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1.6;
      lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 7.5;
      const lg = ctx.createGain(); lg.gain.value = 0.06;
      lfo.connect(lg); lg.connect(out.gain);
      out.gain.setTargetAtTime(0.13, ctx.currentTime, 0.3);
    } else {                             /* spray */
      f.type = 'highpass'; f.frequency.value = 2400; f.Q.value = 0.7;
      lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.9;
      const lg = ctx.createGain(); lg.gain.value = 900;
      lfo.connect(lg); lg.connect(f.frequency);
      out.gain.setTargetAtTime(0.12, ctx.currentTime, 0.3);
    }

    src.connect(f); f.connect(out);
    src.start();
    if (lfo) { lfo.start(); nodes.push(lfo); }

    this.actionNode = { out, nodes };
  };

  Sound.prototype.stopAction = function () {
    if (this._showTimer) { clearTimeout(this._showTimer); this._showTimer = null; }
    const a = this.actionNode;
    if (!a) return;
    const t = this.ctx.currentTime;
    a.out.gain.cancelScheduledValues(t);
    a.out.gain.setTargetAtTime(0.0001, t, 0.12);
    a.nodes.forEach((n) => { try { n.stop(t + 0.5); } catch (_) {} });
    setTimeout(() => { try { a.out.disconnect(); } catch (_) {} }, 800);
    this.actionNode = null;
  };

  /* ------------------------------------------------------------- DROBNOSTI */

  /** cinknutí při výběru stroje */
  Sound.prototype.chime = function () {
    const ctx = this.init();
    if (!ctx || !this.enabled) return;
    this.resume();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((fr, i) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = fr;
      const g = ctx.createGain();
      const t0 = now + i * 0.07;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.20, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + 0.55);
    });
  };

  /** ťuknutí na tlačítko */
  Sound.prototype.click = function () {
    const ctx = this.init();
    if (!ctx || !this.enabled) return;
    this.resume();
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(660, now);
    o.frequency.exponentialRampToValueAtTime(1180, now + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.13, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    o.connect(g); g.connect(this.master);
    o.start(now); o.stop(now + 0.16);
  };

  /* ------------------------------------------------------------------ ŘEČ */

  Sound.prototype.pickVoice = function () {
    if (!global.speechSynthesis) return null;
    const vs = global.speechSynthesis.getVoices();
    if (!vs || !vs.length) return null;
    return vs.find((v) => /^cs/i.test(v.lang)) ||
           vs.find((v) => /^sk/i.test(v.lang)) || null;
  };

  Sound.prototype.speak = function (text) {
    if (!this.enabled || !global.speechSynthesis || !global.SpeechSynthesisUtterance) return;
    try {
      global.speechSynthesis.cancel();
      const u = new global.SpeechSynthesisUtterance(text);
      const v = this.pickVoice();
      if (v) u.voice = v;
      u.lang = v ? v.lang : 'cs-CZ';
      u.rate = 0.88;
      u.pitch = 1.12;
      u.volume = 0.95;
      global.speechSynthesis.speak(u);
    } catch (_) { /* nevadí */ }
  };

  global.SOUND = new Sound();

  /* hlasy se v prohlížečích načítají později */
  if (global.speechSynthesis && 'onvoiceschanged' in global.speechSynthesis) {
    global.speechSynthesis.onvoiceschanged = function () { /* jen probudit seznam */ };
  }
})(typeof window !== 'undefined' ? window : globalThis);

/**
 * "Čeština" practice content for the Vzdělání module — vyjmenovaná slova
 * (the historical-y word families every Czech elementary schooler drills)
 * plus a small bank of broader 5th-grade curriculum exercises (slovní
 * druhy, antonyma, shoda přísudku s podmětem). Hand-written, same reasoning
 * as lib/practice.ts's LOGIC_WORD_PROBLEMS — this can't be procedurally
 * generated without embedding real language knowledge anyway.
 */

export interface CzechExercise {
  id: string;
  question: string;
  answer: string;
}

// Fill-in-the-blank "y or i" drills, five per vyjmenovaná-slova group
// (po B, L, M, P, S, V, Z — the seven groups taught in Czech schools). The
// gloss in parentheses disambiguates from the sound-alike i-word (e.g.
// "být" vs "bít") the way a teacher would say it out loud.
export const VYJMENOVANA_SLOVA_EXERCISES: CzechExercise[] = [
  // po B
  { id: "vs-b1", question: "Dopln y/i: b_t (= existovat, žít)", answer: "y" },
  { id: "vs-b2", question: "Dopln y/i: b_dlet (= mít někde domov)", answer: "y" },
  { id: "vs-b3", question: "Dopln y/i: kob_la (= samice koně)", answer: "y" },
  { id: "vs-b4", question: "Dopln y/i: dob_tek (= hospodářská zvířata, např. krávy)", answer: "y" },
  { id: "vs-b5", question: "Dopln y/i: b_strý (= chytrý, rychle chápavý)", answer: "y" },
  // po L
  { id: "vs-l1", question: "Dopln y/i: ml_n (= stavba, kde se mele obilí na mouku)", answer: "y" },
  { id: "vs-l2", question: "Dopln y/i: l_že (= sportovní vybavení na sníh)", answer: "y" },
  { id: "vs-l3", question: "Dopln y/i: pol_kat (= polykat, posílat jídlo do žaludku)", answer: "y" },
  { id: "vs-l4", question: "Dopln y/i: bl_skat se (= svítit jako blesk)", answer: "y" },
  { id: "vs-l5", question: "Dopln y/i: pl_tvat (= zbytečně utrácet, mrhat)", answer: "y" },
  // po M
  { id: "vs-m1", question: "Dopln y/i: m_lit se (= dělat chybu)", answer: "y" },
  { id: "vs-m2", question: "Dopln y/i: hm_z (= drobná zvířátka jako mouchy a brouci)", answer: "y" },
  { id: "vs-m3", question: "Dopln y/i: m_š (= malý hlodavec)", answer: "y" },
  { id: "vs-m4", question: "Dopln y/i: hlem_žď (= plž s ulitou)", answer: "y" },
  { id: "vs-m5", question: "Dopln y/i: zam_kat (= zavírat na klíč)", answer: "y" },
  // po P
  { id: "vs-p1", question: "Dopln y/i: p_tel (= velký látkový nebo plastový vak)", answer: "y" },
  { id: "vs-p2", question: "Dopln y/i: kop_to (= noha koně nebo krávy)", answer: "y" },
  { id: "vs-p3", question: "Dopln y/i: netop_r (= létající noční savec)", answer: "y" },
  { id: "vs-p4", question: "Dopln y/i: slep_š (= plaz bez nohou, podobá se hadovi)", answer: "y" },
  { id: "vs-p5", question: "Dopln y/i: klop_tat (= zakopávat, škobrtat při chůzi)", answer: "y" },
  // po S
  { id: "vs-s1", question: "Dopln y/i: s_n (= mužský potomek)", answer: "y" },
  { id: "vs-s2", question: "Dopln y/i: s_r (= mléčný výrobek)", answer: "y" },
  { id: "vs-s3", question: "Dopln y/i: s_kora (= malý zpěvný pták)", answer: "y" },
  { id: "vs-s4", question: "Dopln y/i: s_rový (= nevařený, nezpracovaný)", answer: "y" },
  { id: "vs-s5", question: "Dopln y/i: s_pat (= nasypávat, např. písek)", answer: "y" },
  // po V
  { id: "vs-v1", question: "Dopln y/i: v_soký (= opak slova nízký)", answer: "y" },
  { id: "vs-v2", question: "Dopln y/i: v_dra (= vodní šelma)", answer: "y" },
  { id: "vs-v3", question: "Dopln y/i: v_r (= druh velké sovy)", answer: "y" },
  { id: "vs-v4", question: "Dopln y/i: zv_k (= návyk, obvyklé chování)", answer: "y" },
  { id: "vs-v5", question: "Dopln y/i: v_t (= vydávat protažený zvuk jako vlk)", answer: "y" },
  // po Z
  { id: "vs-z1", question: "Dopln y/i: brz_ (= za krátkou chvíli)", answer: "y" },
  { id: "vs-z2", question: "Dopln y/i: jaz_k (= orgán v ústech, kterým mluvíme)", answer: "y" },
  { id: "vs-z3", question: "Dopln y/i: naz_vat (= dávat jméno)", answer: "y" },
  { id: "vs-z4", question: "Dopln y/i: oz_vat se (= ohlásit se zvukem)", answer: "y" },
  { id: "vs-z5", question: "Dopln y/i: vyz_vat (= vybízet někoho k něčemu)", answer: "y" },
];

// Broader 5th-grade curriculum: slovní druhy, antonyma, shoda přísudku s
// podmětem (i/y podle rodu podmětu — related to, but distinct from,
// vyjmenovaná slova above).
export const CURRICULUM_EXERCISES: CzechExercise[] = [
  { id: "cur-druh1", question: "Jaký slovní druh je slovo „pes“?", answer: "podstatné jméno" },
  { id: "cur-druh2", question: "Jaký slovní druh je slovo „krásný“?", answer: "přídavné jméno" },
  { id: "cur-druh3", question: "Jaký slovní druh je slovo „běžet“?", answer: "sloveso" },
  { id: "cur-druh4", question: "Jaký slovní druh je slovo „rychle“?", answer: "příslovce" },
  { id: "cur-druh5", question: "Jaký slovní druh je slovo „pět“?", answer: "číslovka" },
  { id: "cur-druh6", question: "Jaký slovní druh je slovo „a“ (ve větě „táta a máma“)?", answer: "spojka" },
  { id: "cur-druh7", question: "Jaký slovní druh je slovo „on“?", answer: "zájmeno" },
  { id: "cur-druh8", question: "Jaký slovní druh je slovo „v“ (ve větě „v lese“)?", answer: "předložka" },
  { id: "cur-druh9", question: "Jaký slovní druh je slovo „haló“?", answer: "citoslovce" },
  { id: "cur-druh10", question: "Jaký slovní druh je slovo „ten“ (ve větě „ten dům“)?", answer: "zájmeno" },
  { id: "cur-ant1", question: "Napiš opak slova „velký“.", answer: "malý" },
  { id: "cur-ant2", question: "Napiš opak slova „den“.", answer: "noc" },
  { id: "cur-ant3", question: "Napiš opak slova „nahoru“.", answer: "dolů" },
  { id: "cur-ant4", question: "Napiš opak slova „rychlý“.", answer: "pomalý" },
  { id: "cur-ant5", question: "Napiš opak slova „světlo“.", answer: "tma" },
  { id: "cur-shoda1", question: "Dopln i/y: Chlapci běžel_ na hřiště.", answer: "i" },
  { id: "cur-shoda2", question: "Dopln i/y: Stromy rostl_ v lese.", answer: "y" },
  { id: "cur-shoda3", question: "Dopln i/y: Dívky zpíval_ píseň.", answer: "y" },
  { id: "cur-shoda4", question: "Dopln i/y: Psi štěkal_ na kočku.", answer: "i" },
];

export const CZECH_EXERCISES: CzechExercise[] = [...VYJMENOVANA_SLOVA_EXERCISES, ...CURRICULUM_EXERCISES];

/**
 * `excludeIds` lets the caller keep already-correctly-answered exercises
 * out of the draw (see functions/src/practice.ts) — undefined means "every
 * exercise in the bank has already been answered", the finite curriculum
 * is complete.
 */
export function pickRandomCzechExercise(
  random: () => number = Math.random,
  excludeIds?: ReadonlySet<string>
): CzechExercise | undefined {
  const pool = excludeIds ? CZECH_EXERCISES.filter((e) => !excludeIds.has(e.id)) : CZECH_EXERCISES;
  if (pool.length === 0) return undefined;
  return pool[Math.floor(random() * pool.length)];
}

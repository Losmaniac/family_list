/**
 * "Finanční gramotnost" (financial literacy) practice content for the
 * Vzdělání module — money basics, saving, budgeting, needs vs. wants,
 * banking. Hand-written for the same reason as lib/czech-language.ts —
 * real subject-matter knowledge, not something a generator could produce
 * correctly, and every answer needs to be short enough to auto-grade.
 */

export interface FinancialLiteracyExercise {
  id: string;
  question: string;
  /** One exact answer, or a list of equally correct phrasings — see isAnswerCorrect in lib/practice.ts. */
  answer: string | string[];
  /**
   * When set, the question is multiple-choice: exactly three options,
   * submitted by their full text (one of them must equal `answer`). Paired
   * with `explanation` — after a correct answer (or the reveal after
   * exhausted attempts), practice.tsx keeps the explanation on screen and
   * waits for the member to advance manually instead of auto-advancing,
   * since the whole point is to actually read it.
   */
  options?: [string, string, string];
  explanation?: string;
}

export const FINANCIAL_LITERACY_EXERCISES: FinancialLiteracyExercise[] = [
  // Základní pojmy
  { id: "fg1", question: "Jak se jmenuje česká měna?", answer: ["koruna", "česká koruna"] },
  { id: "fg2", question: "Kolik haléřů/setin je v jedné koruně (dnes už se nepoužívají, ale početně)?", answer: "100" },
  { id: "fg3", question: "Jak se nazývá peníz, který si šetříš a nevydáváš hned?", answer: "úspora" },
  { id: "fg4", question: "Jak se říká plánu, kolik peněz vyděláš a kolik utratíš za měsíc?", answer: "rozpočet" },
  { id: "fg5", question: "Jak se nazývá pravidelná odměna, kterou dostává dospělý za práci?", answer: ["mzda", "plat"] },
  { id: "fg6", question: "Jak se jmenuje instituce, kde si lidé ukládají peníze a mohou si i půjčit?", answer: "banka" },
  { id: "fg7", question: "Jak se nazývá místo na spoření peněz v bance, kam si ukládáš úspory?", answer: ["spořicí účet", "účet"] },
  // Potřeby vs. přání
  {
    id: "fg8",
    question: "Jídlo, bydlení a oblečení jsou příklady čeho — věcí, bez kterých se neobejdeš?",
    answer: "potřeby",
  },
  {
    id: "fg9",
    question: "Nová hračka, kterou nutně nepotřebuješ, ale chceš ji — je to potřeba, nebo…?",
    answer: "přání",
  },
  // Počítání s penězi
  { id: "fg10", question: "Máš 100 Kč a utratíš 35 Kč. Kolik ti zbyde?", answer: "65" },
  { id: "fg11", question: "Chceš si koupit hračku za 250 Kč. Máš našetřeno 90 Kč. Kolik ti ještě chybí?", answer: "160" },
  { id: "fg12", question: "Každý týden si ušetříš 50 Kč. Kolik naspoříš za 4 týdny?", answer: "200" },
  { id: "fg13", question: "Rohlík stojí 6 Kč. Kolik zaplatíš za 5 rohlíků?", answer: "30" },
  { id: "fg14", question: "Máš 500 Kč. Utratíš polovinu. Kolik ti zůstane?", answer: "250" },
  // Práce s penězi, dluhy, úroky
  {
    id: "fg15",
    question: "Jak se nazývá peníz navíc, který musíš zaplatit, když si peníze půjčíš (např. v bance)?",
    answer: "úrok",
  },
  { id: "fg16", question: "Jak se nazývá to, když dlužíš někomu peníze?", answer: "dluh" },
  {
    id: "fg17",
    question: "Jak se jmenuje karta, kterou lze platit v obchodě místo hotovosti?",
    answer: ["platební karta", "karta"],
  },
  {
    id: "fg18",
    question: "Jak se nazývá situace, kdy vydáváš víc peněz, než vyděláš?",
    answer: ["zadlužení", "dluh"],
  },
  // Chytré nakupování
  {
    id: "fg19",
    question: "Jak se nazývá dočasné snížení ceny zboží v obchodě?",
    answer: ["sleva", "akce"],
  },
  {
    id: "fg20",
    question: "Než si něco koupíš, je chytré porovnat ceny na víc místech. Jak se tomu říká?",
    answer: ["porovnání cen", "srovnání cen"],
  },
  {
    id: "fg21",
    question: "Jak se nazývá papír/doklad, který dostaneš v obchodě jako potvrzení nákupu?",
    answer: ["účtenka", "paragon"],
  },
  // Dárky, kapesné
  {
    id: "fg22",
    question: "Jak se nazývají peníze, které dítě pravidelně dostává od rodičů na vlastní útratu?",
    answer: "kapesné",
  },
  {
    id: "fg23",
    question: "Máš dostávat 100 Kč kapesného měsíčně. Kolik dostaneš za půl roku?",
    answer: "600",
  },
  // Otázky s výběrem odpovědi a vysvětlením (edukační modul pro 5. třídu)
  {
    id: "fg24",
    question: "Odkud se berou peníze, které si lidé vybírají z bankomatu nebo s nimi platí kartou?",
    options: [
      "Bankomat peníze sám tiskne pro každého, kdo do něj vloží jakoukoli kartičku.",
      "Jsou to peníze, které si lidé dříve poctivě vydělali prací a uložili do banky.",
      "Dává je tam stát zdarma pro kohokoli, komu došly hotové peníze v peněžence.",
    ],
    answer: "Jsou to peníze, které si lidé dříve poctivě vydělali prací a uložili do banky.",
    explanation:
      "Bankomat není kouzelná truhla na peníze zdarma! Karta je jen elektronický klíč k tvému účtu v bance. Peníze na účtu jsou odměnou za práci (mzda), kterou rodiče vykonali. Když z bankomatu vybereš částku, z účtu ti přesně tyto peníze zmizí.",
  },
  {
    id: "fg25",
    question: "Jaký je hlavní rozdíl mezi „potřebou“ a „přáním“?",
    options: [
      "Potřeba je něco, bez čeho nemůžeme bezpečně žít (jídlo, teplo, léky), zatímco přání je něco navíc pro radost (nová hračka).",
      "Přání je vždycky dražší než potřeba.",
      "Potřeby kupují jen dospělí lidé, přání mají výhradně děti.",
    ],
    answer: "Potřeba je něco, bez čeho nemůžeme bezpečně žít (jídlo, teplo, léky), zatímco přání je něco navíc pro radost (nová hračka).",
    explanation:
      "Životní potřeby jsou věci nezbytné k přežití a zdraví – jídlo, voda, teplo, oblečení a střecha nad hlavou. Přání jsou věci, které se nám líbí (smartphone, sladkosti, hry), ale bez kterých dokážeme normálně žít. Moudrý hospodář nejdříve zaplatí potřeby a až z toho, co zbyde, si plní přání.",
  },
  {
    id: "fg26",
    question: "Co je to rodinný rozpočet?",
    options: [
      "Seznam všech hraček, které si rodina plánuje koupit na Vánoce.",
      "Přehled všech příjmů (peněz, které do rodiny přijdou) a výdajů (peněz, které se musí zaplatit) za určitou dobu.",
      "Speciální peněženka, do které se dávají pouze kovové mince.",
    ],
    answer: "Přehled všech příjmů (peněz, které do rodiny přijdou) a výdajů (peněz, které se musí zaplatit) za určitou dobu.",
    explanation:
      "Rodinný rozpočet je jako plán hry s penězi. Ukazuje, kolik peněz rodiče za měsíc vydělají a kolik musí zaplatit za nájem, elektřinu, jídlo či kroužky. Aby byl rozpočet zdravý, nesmí být výdaje větší než příjmy!",
  },
  {
    id: "fg27",
    question: "Proč si nemůžeme v obchodě koupit úplně všechno, co se nám líbí?",
    options: [
      "Protože by se nám věci nevešly do nákupního košíku.",
      "Protože naše peníze jsou omezené a musíme si vybrat, za co je utratíme nejchytřeji.",
      "Obchody mají přísné pravidlo, že jeden člověk smí koupit maximálně tři věci.",
    ],
    answer: "Protože naše peníze jsou omezené a musíme si vybrat, za co je utratíme nejchytřeji.",
    explanation:
      "Peněz má většina lidí omezené množství. Když všechny peníze utratíš první den za sladkosti a hračky, nezbude ti na důležitější věci, jako je oběd ve školní jídelně nebo lístek na autobus. Proto si musíme vybírat to nejdůležitější.",
  },
  {
    id: "fg28",
    question: "Co se děje s penězi, které si uložíme na spořicí účet v bance?",
    options: [
      "Banka je zamkne do trezoru a nikdo se jich nedotkne, dokud si je nevyzvedneš.",
      "Banka s nimi bezpečně hospodaří a navíc ti k nim přisype malé procento navíc (úrok) jako odměnu.",
      "Peníze na účtu pomalu mizí, protože je požírá bankovní poplatek.",
    ],
    answer: "Banka s nimi bezpečně hospodaří a navíc ti k nim přisype malé procento navíc (úrok) jako odměnu.",
    explanation:
      "Když dáš peníze do prasátka doma, zůstane tam stále stejná částka. Když je dáš na spořicí účet do banky, banka ti čas od času přimíchá drobné peníze navíc – tzv. úrok. Peníze tak samy o sobě pomaličku rostou a jsou v bezpečí před ztrátou.",
  },
  {
    id: "fg29",
    question: "Co se stane, když při nákupu v obchodě zaplatíš mobilním telefonem nebo chytrými hodinkami?",
    options: [
      "Obchodník ti dá zboží zdarma, protože mobilní platby jsou dárek pro zákazníky.",
      "Z tvého bankovního účtu se okamžitě odečte přesná částka za nákup, stejně jako při platbě hotovostí.",
      "Mobilní telefon pošle do obchodu papírovou bankovku v digitální obálce.",
    ],
    answer: "Z tvého bankovního účtu se okamžitě odečte přesná částka za nákup, stejně jako při platbě hotovostí.",
    explanation:
      "Platba mobilem nebo hodinkami je jen moderní způsob placení. Uvnitř mobilu je bezpečně schovaná tvoje bankovní karta. I když nevidíš fyzické bankovky, z účtu ti zmizí úplně stejné reálné peníze, které musel někdo vydělat prací.",
  },
  {
    id: "fg30",
    question: "V obchodě vidíš ceduli „SLEVA 50 %“. Co to přesně znamená?",
    options: ["Zboží je dvakrát dražší než obvykle.", "Zboží stojí přesně polovinu své původní ceny.", "Musíš si koupit dva kusy, aby ti prodali jeden."],
    answer: "Zboží stojí přesně polovinu své původní ceny.",
    explanation:
      "Procento (%) vyjadřuje část z celku. 100 % je celá původní cena a 50 % je přesně polovina. Pokud hračka stála původně 400 Kč a je ve slevě 50 %, zaplatíš za ni pouze 200 Kč. Kupuj ale věci ve slevě jen tehdy, pokud je opravdu potřebuješ!",
  },
  {
    id: "fg31",
    question: "Co je to bankovní půjčka (úvěr) a jaká pravidla pro ni platí?",
    options: [
      "Půjčka jsou peníze, které ti banka daruje a nikdy je nechce vrátit zpátky.",
      "Půjčka znamená, že ti banka peníze vrátí v budoucnu za dobré chování.",
      "Půjčka znamená, že ti banka půjčí peníze, ale ty je musíš postupně vrátit a ještě zaplatit něco navíc (úrok).",
    ],
    answer: "Půjčka znamená, že ti banka půjčí peníze, ale ty je musíš postupně vrátit a ještě zaplatit něco navíc (úrok).",
    explanation:
      "Půjčit si peníze vypadá snadno, ale je to velká zodpovědnost! Když si půjčíš od banky peníze, vrátit musíš vždycky o něco více, než sis půjčil/a (tomu navíc se říká úrok). Půjčovat bychom si měli jen na velmi důležité věci (například na bydlení), nikdy ne na zbytečnosti či dárky.",
  },
  {
    id: "fg32",
    question: "Jak je nejvhodnější naložit s pravidlem „odložit si 10 % z každého kapesného“?",
    options: [
      "Hned první den utratit celou částku za nejlevnější sladkost.",
      "Odložit si 10 % stranou do úspor pro případ neočekávaných výdajů nebo na větší přání.",
      "Rozdat 10 % kamarádům ve škole.",
    ],
    answer: "Odložit si 10 % stranou do úspor pro případ neočekávaných výdajů nebo na větší přání.",
    explanation:
      "Toto je pravidlo úspěšného hospodaření! Kdykoli dostaneš kapesné nebo peníze k narozeninám, odlož si malou část (například 10 ze sta korun) do prasátka nebo na účet. Za pár měsíců zjistíš, že sis bez velké námahy naspořil/a krásnou sumu na větší věc.",
  },
  {
    id: "fg33",
    question: "Koupil/a sis hračku, ale doma zjistíš, že je nefunkční. Co můžeš udělat?",
    options: [
      "Hračku vyhodit do popelnice a ztratit peníze.",
      "Jít do obchodu s hračkou i účtenkou a požádat o reklamaci (výměnu nebo vrácení peněz).",
      "Pokusit se nefunkční hračku tajně prodat spolužákovi.",
    ],
    answer: "Jít do obchodu s hračkou i účtenkou a požádat o reklamaci (výměnu nebo vrácení peněz).",
    explanation:
      "Jako zákazník máš svá práva! Když si koupíš věc, která je pokažená z výroby, zákon ti umožňuje věc reklamovat. V obchodě ukážeš doklad o zaplacení (účtenku) a obchodník ti musí věc opravit, vyměnit za novou, nebo vrátit peníze. Účtenky se proto vyplatí schovávat!",
  },
];

/** `excludeIds` keeps already-correctly-answered exercises out of the draw; undefined means the finite bank is fully answered. */
export function pickRandomFinancialLiteracyExercise(
  random: () => number = Math.random,
  excludeIds?: ReadonlySet<string>
): FinancialLiteracyExercise | undefined {
  const pool = excludeIds ? FINANCIAL_LITERACY_EXERCISES.filter((e) => !excludeIds.has(e.id)) : FINANCIAL_LITERACY_EXERCISES;
  if (pool.length === 0) return undefined;
  return pool[Math.floor(random() * pool.length)];
}

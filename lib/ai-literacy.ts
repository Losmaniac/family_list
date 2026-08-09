/**
 * "AI" (artificial intelligence literacy) practice content for the
 * Vzdělání module — what AI is and isn't, everyday examples, how it
 * learns, and basic safety/ethics for kids using it. A curated
 * multiple-choice set (edukační modul pro 5. třídu), each paired with a
 * kid-facing explanation — see AiLiteracyExercise's `options`/`explanation`
 * doc below for how practice.tsx handles those.
 */

export interface AiLiteracyExercise {
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

export const AI_LITERACY_EXERCISES: AiLiteracyExercise[] = [
  {
    id: "ai1",
    question: "Co je to vlastně umělá inteligence (AI)?",
    options: [
      "Počítačový program, který dokáže přemýšlet, cítit a snít stejně jako živý člověk.",
      "Pokročilý počítačový program, který zpracovává obrovské množství dat a učí se v nich hledat vzory k řešení úkolů.",
      "Robot vyrobený z kovu, který má uvnitř hlavy umístěný malý lidský mozek.",
    ],
    answer: "Pokročilý počítačový program, který zpracovává obrovské množství dat a učí se v nich hledat vzory k řešení úkolů.",
    explanation:
      "Umělá inteligence nemá žádné pocity ani mozek jako my! Je to superrychlý počítačový program. Lidé do něj vloží miliony příkladů (například fotky koček) a AI se naučí poznat, co mají společného. Když jí pak ukážeš úplně novou fotku, pozná kočku podle toho, co se naučila z předchozích dat.",
  },
  {
    id: "ai2",
    question: "Jak se počítačový program AI naučí poznat, jak vypadá pes?",
    options: [
      "Podívá se z okna a chvíli pozoruje psy běžající na ulici.",
      "Lidé jí ukážou tisíce různých fotek psů a označí jí: „Tohle všechno jsou psi.“",
      "Přečte si pohádku o pejskovi a kočičce.",
    ],
    answer: "Lidé jí ukážou tisíce různých fotek psů a označí jí: „Tohle všechno jsou psi.“",
    explanation:
      "Tomuto procesu se říká strojové učení. AI potřebuje obrovské množství ukázek – fotky velkých, malých, chlupatých i krátkosrstých psů. Z těchto obrázků si zapamatuje typické znaky (čumák, uši, tvar těla) a díky tomu pak sama pozná psa i na fotce, kterou nikdy dříve neviděla.",
  },
  {
    id: "ai3",
    question: "Dokáže AI cítit radost, smutek nebo se naštvat, když prohraje ve hře?",
    options: [
      "Ano, AI má vlastní pocity a dokáže být smutná i veselá podle toho, jak se k ní chováš.",
      "Ne, AI pocity nemá. Může napsat „Mám radost“, ale je to jen text vytvořený podle matematických pravidel.",
      "Pocity má pouze v případě, že je počítač zapojený do elektrické zásuvky.",
    ],
    answer: "Ne, AI pocity nemá. Může napsat „Mám radost“, ale je to jen text vytvořený podle matematických pravidel.",
    explanation:
      "AI nemá srdce, vědomí ani pocity. Když ti v chatu napíše usměvavého smajlíka nebo větu „Mám radost, že si povídáme“, pouze kombinuje slova, která se k sobě statisticky nejlépe hodí. Všechno je to jen výpočet, ne opravdový pocit!",
  },
  {
    id: "ai4",
    question: "Co je to tzv. „prompt“ (čti prompt), o kterém se při práci s AI často mluví?",
    options: [
      "Tlačítko určené k okamžitému vypnutí celého počítače.",
      "Zadání, dotaz nebo příkaz, který napíšeš AI, aby věděla, co přesně má vytvořit.",
      "Počítačový virus, který maže obrázky v mobilu.",
    ],
    answer: "Zadání, dotaz nebo příkaz, který napíšeš AI, aby věděla, co přesně má vytvořit.",
    explanation:
      "Prompt je tvoje instrukce pro AI! Když napíšeš jen „Napiš pohádku“, AI vytvoří něco moc obecného. Když ale napíšeš detailní prompt: „Napiš krátkou vtipnou pohádku o létajícím křečkovi, který hledá sýr na Marsu“, AI dostane přesné vodítko a vytvoří příběh přímo na míru.",
  },
  {
    id: "ai5",
    question: "Může se stát, že ti AI napíše úplnou hloupost nebo věc, která není pravda?",
    options: [
      "Nikdy, AI ví naprosto všechno a ve všem má vždy pravdu.",
      "Ano, AI si může informace vymyslet nebo splést, proto je musíme vždy ověřovat.",
      "Stává se to jen v úterý, kdy se aktualizují počítačové servery.",
    ],
    answer: "Ano, AI si může informace vymyslet nebo splést, proto je musíme vždy ověřovat.",
    explanation:
      "AI neví, co je skutečná pravda a co je lež – pouze skládá slova tak, aby zněla přesvědčivě. Někdy si takové informace vymyslí, čemuž se říká halucinace AI. Proto si u úkolů do školy všechno raději ověř v učebnici, knize nebo na ověřeném webu.",
  },
  {
    id: "ai6",
    question: "Jak generátor obrázků AI vytvoří obrázek podle tvého přání?",
    options: [
      "Najde hotový obrázek na internetu a pošle ti ho.",
      "Sestaví úplně nový obrázek bod po bodu z toho, co se naučil z milionů jiných obrázků.",
      "Nakreslí ho neviditelné robotické rameno schované uvnitř displeje.",
    ],
    answer: "Sestaví úplně nový obrázek bod po bodu z toho, co se naučil z milionů jiných obrázků.",
    explanation:
      "AI nezkopíruje cizí fotku. Místo toho prozkoumá tvary, barvy a styly z milionů děl, které zná ze svého tréninku, a vytvoří zcela nový obraz pixel po pixelu přesně podle tvého popisu.",
  },
  {
    id: "ai7",
    question: "Kdo nese odpovědnost za domácí úkol, který za tebe kompletně napsala AI?",
    options: [
      "Počítač nebo mobilní telefon, na kterém AI běží.",
      "Ty sám/sama, protože úkol odevzdáváš učiteli pod svým jménem.",
      "Vývojáři, kteří tento AI program naprogramovali.",
    ],
    answer: "Ty sám/sama, protože úkol odevzdáváš učiteli pod svým jménem.",
    explanation:
      "AI je skvělý pomocník pro hledání nápadů, ale myslet musíme sami! Když odevzdáš text z AI bez přemýšlení, neučíš se ty, ale počítač. Pod úkolem je tvoje jméno, a proto za něj neseš plnou odpovědnost.",
  },
  {
    id: "ai8",
    question: "Dokáže AI zcela nahradit tvého skvělého učitele nebo nejlepšího kamaráda?",
    options: [
      "Ano, za pár let už lidské kamarády nebudeme k ničemu potřebovat.",
      "Ne, protože AI nemá lidskou empatii, nerozumí tvým pocitům a neumí doopravdy obejmout.",
      "Ano, ale pouze v případě, že má zapnutý hlasový výstup.",
    ],
    answer: "Ne, protože AI nemá lidskou empatii, nerozumí tvým pocitům a neumí doopravdy obejmout.",
    explanation:
      "AI dokáže rychle vyhledat fakta nebo vysvětlit příklad. Neumí ale sdílet radost z vyhraného zápasu, nedokáže tě doopravdy potěšit, když je ti smutno, a nemá vlastní životní zkušenosti. Lidské přátelství a porozumění žádný kód nenahradí.",
  },
  {
    id: "ai9",
    question: "Jak fungují hlasoví asistenti v mobilu (např. Siri nebo Google Assistant)?",
    options: [
      "Uvnitř telefonu leží malinký človíček se sluchátky.",
      "Převedou tvůj hlas na text, AI pochopí význam a vyhledá nejlepší odpověď.",
      "Zaznamenávají tvůj hlas a posílají ho do vesmíru.",
    ],
    answer: "Převedou tvůj hlas na text, AI pochopí význam a vyhledá nejlepší odpověď.",
    explanation:
      "Hlasový asistent využívá AI na rozpoznávání zvuku. Tvůj hlas rozloží na jednotlivé hlásky, přetvoří je na psaná slova, analyzuje dotaz (například „Jaké bude zítra počasí?“), najde předpověď a odpověď ti přečte.",
  },
  {
    id: "ai10",
    question: "Na co si dát pozor při zadávání dotazů do volně dostupných AI chatů?",
    options: [
      "Nesmíš v textu používat velká písmena.",
      "Nikdy do AI nepíšeme osobní údaje, celé jméno, adresu, hesla ani rodinné fotky.",
      "Do chatu se musí psát výhradně v anglickém jazyce.",
    ],
    answer: "Nikdy do AI nepíšeme osobní údaje, celé jméno, adresu, hesla ani rodinné fotky.",
    explanation:
      "Všechno, co vložíš do veřejné AI, se může použít k jejímu dalšímu trénování. Pokud tam napíšeš své heslo, adresu nebo rodinné tajemství, tyto informace by se mohly dostat k někomu cizímu. Chraň si své soukromí!",
  },
];

/** `excludeIds` keeps already-correctly-answered exercises out of the draw; undefined means the finite bank is fully answered. */
export function pickRandomAiLiteracyExercise(
  random: () => number = Math.random,
  excludeIds?: ReadonlySet<string>
): AiLiteracyExercise | undefined {
  const pool = excludeIds ? AI_LITERACY_EXERCISES.filter((e) => !excludeIds.has(e.id)) : AI_LITERACY_EXERCISES;
  if (pool.length === 0) return undefined;
  return pool[Math.floor(random() * pool.length)];
}

/**
 * "Digitální bezpečnost" (digital safety) practice content for the
 * Vzdělání module — passwords, digital footprint, phishing, cyberbullying,
 * privacy, screen time. Hand-written for the same reason as
 * lib/czech-language.ts. Every question here is multiple-choice with an
 * explanation shown after answering — see AiLiteracyExercise's doc comment
 * in lib/ai-literacy.ts for why (same shape, same reasoning).
 */

export interface DigitalSafetyExercise {
  id: string;
  question: string;
  /** One exact answer, or a list of equally correct phrasings — see isAnswerCorrect in lib/practice.ts. */
  answer: string | string[];
  options?: [string, string, string];
  explanation?: string;
}

export const DIGITAL_SAFETY_EXERCISES: DigitalSafetyExercise[] = [
  {
    id: "ds1",
    question: "Které z následujících hesel je nejbezpečnější pro ochranu tvého herního účtu?",
    options: ["123456", "mojejmeno2014", "Modry!Slon.Skace42"],
    answer: "Modry!Slon.Skace42",
    explanation:
      "Silné heslo je jako neprolomitelný zámek! Hesla jako „123456“ nebo tvoje jméno dokáže podvodný počítačový program odhalit za jedinou sekundu. Nejlepší heslo je dlouhé, složené z více slov, obsahuje velká i malá písmena, čísla a speciální znaky.",
  },
  {
    id: "ds2",
    question: "Co je to tzv. „digitální stopa“?",
    options: [
      "Otisk tvého prstu, když se dotkneš obrazovky tabletu.",
      "Informace, fotky, komentáře a stopy, které po sobě zanecháváš na internetu při každém kliknutí.",
      "Špína, která zůstane na klávesnici po celém dni hraní.",
    ],
    answer: "Informace, fotky, komentáře a stopy, které po sobě zanecháváš na internetu při každém kliknutí.",
    explanation:
      "Všechno, co na internet napíšeš, jakou fotku tam nahraješ nebo co vyhledáš, vytváří tvoji digitální stopu. Je to jako chodit v mokrém blátě – stopy zůstávají dlouho. Co jednou dáš na internet, je velmi těžké (někdy nemožné) úplně smazat.",
  },
  {
    id: "ds3",
    question: "Ve tvé hře ti napíše neznámý hráč a nabízí vzácné předměty zdarma, pokud mu pošleš své heslo. Co uděláš?",
    options: [
      "Heslo mu pošlu, protože chci získat vzácné věci zdarma.",
      "Heslo mu nepošlu, zprávu ignoruji nebo hráče nahlásím a řeknu to dospělému.",
      "Pošlu mu heslo svého spolužáka, abych vyzkoušel/a, zda to funguje.",
    ],
    answer: "Heslo mu nepošlu, zprávu ignoruji nebo hráče nahlásím a řeknu to dospělému.",
    explanation:
      "Nikdy a nikomu (ani kamarádovi ve hře) neprozrazuj své heslo! Skuteční správci her od tebe heslo nikdy žádat nebudou. Lidé, kteří ti slibují odměny za heslo, jsou podvodníci, kteří ti chtějí účet ukrást.",
  },
  {
    id: "ds4",
    question: "Co znamená pojem „kyberšikana“?",
    options: [
      "Když se ti rozbije počítač přímo během hraní hry.",
      "Opakované ubližování, posmívání, vyhrožování nebo ponižování někoho prostřednictvím internetu a mobilu.",
      "Druh rychlého počítačového závodu.",
    ],
    answer: "Opakované ubližování, posmívání, vyhrožování nebo ponižování někoho prostřednictvím internetu a mobilu.",
    explanation:
      "Kyberšikana je šikana v digitálním světě – ve zprávách, na sociálních sítích nebo v herních chatech. Pokud se s ní potkáš, nebuď v tom sám/sama! Zprávy si vyfoť jako důkaz a okamžitě se svěř rodičům, učiteli nebo někomu dospělému.",
  },
  {
    id: "ds5",
    question: "Proč bys na sociální sítě neměl/a veřejně dávat fotky s názvem tvojí školy nebo adresou domova?",
    options: [
      "Protože fotky budov jsou nudné a nikomu se nelíbí.",
      "Aby jakýkoli cizí člověk na internetu nezjistil, kde se přesně každý den pohybuješ.",
      "Protože tyto fotky zabírají v mobilu moc paměti.",
    ],
    answer: "Aby jakýkoli cizí člověk na internetu nezjistil, kde se přesně každý den pohybuješ.",
    explanation:
      "Ochrana soukromí je klíčová! Když zveřejníš fotku s názvem školy nebo ulicí, kde býváš, cizí člověk by mohl zjistit, kde tě najít. Své soukromí a polohu si chraň a sdílej je jen s rodinou.",
  },
  {
    id: "ds6",
    question: "Co je to „phishing“ (čti fišink)?",
    options: [
      "Počítačová hra, ve které chytáš ryby na udici.",
      "Podvodná zpráva nebo stránka, která se tváří jako opravdová a snaží se z tebe vylákat tajné údaje.",
      "Způsob, jak zrychlit připojení k internetu.",
    ],
    answer: "Podvodná zpráva nebo stránka, která se tváří jako opravdová a snaží se z tebe vylákat tajné údaje.",
    explanation:
      "Phishing je odvozen od anglického slova pro rybaření. Podvodníci rozhodí návnadu – například zprávu: „Vyhrál jsi nový mobil! Klikni sem a zadej heslo!“. Když na odkaz klikneš, dostaneš se na falešnou stránku. Na podezřelé odkazy nikdy neklikej!",
  },
  {
    id: "ds7",
    question: "Chceš si do mobilu stáhnout novou hru. Odkud je to nejbezpečnější?",
    options: [
      "Z jakékoli náhodné stránky, na kterou mě nasměrovala reklama.",
      "Pouze z oficiálního obchodu s aplikacemi (Google Play / App Store) po dohodě s rodiči.",
      "Z odkazu, který mi poslal neznámý uživatel v chatu.",
    ],
    answer: "Pouze z oficiálního obchodu s aplikacemi (Google Play / App Store) po dohodě s rodiči.",
    explanation:
      "Stahování aplikací z neznámých stránek je nejčastější způsob, jak si do mobilu zanést počítačový virus nebo škodlivý program. Oficiální obchody aplikací věci prověřují a chrání tvé zařízení.",
  },
  {
    id: "ds8",
    question: "Proč je dobré dělat si během dne přestávky od mobilu a počítače?",
    options: [
      "Aby se mobil nepřehřál a nevybuchl.",
      "Aby si odpočinuly tvé oči, mozek a tělo a měl/a jsi čas na pohyb, kamarády naživo a spánek.",
      "Dělají to jen lidé, kterým došla baterie.",
    ],
    answer: "Aby si odpočinuly tvé oči, mozek a tělo a měl/a jsi čas na pohyb, kamarády naživo a spánek.",
    explanation:
      "Svět uvnitř obrazovky je plný zábavy, ale tvé tělo i mozek potřebují rovnováhu. Dlouhé sezení u mobilu způsobuje bolest hlavy, únavu očí a zhoršuje spánek. Skutečný svět venku nabízí zážitky, které ti žádný displej nenahradí.",
  },
  {
    id: "ds9",
    question: "Na webové stránce na tě vyskočí okno: „Tento web používá soubory cookies“. Co jsou to tyto „cookies“?",
    options: [
      "Sladké sušenky, které ti e-shop pošle poštou zdarma.",
      "Malé datové soubory, které si web ukládá do prohlížeče, aby si pamatoval, co sis prohlížel/a.",
      "Počítačové viry, které ničí pevný disk.",
    ],
    answer: "Malé datové soubory, které si web ukládá do prohlížeče, aby si pamatoval, co sis prohlížel/a.",
    explanation:
      "Digitální cookies nemají nic společného s jídlem! Jsou to paměťové kartičky webových stránek. Díky nim si web pamatuje tvůj jazyk nebo věci v nákupním košíku. Podle cookies se ale webové stránky také učí, co se ti líbí, a podle toho ti ukazují reklamu.",
  },
  {
    id: "ds10",
    question: "Co uděláš jako první, když na internetu narazíš na obrázek nebo video, které tě vyděsí nebo je ti z něj nepříjemně?",
    options: [
      "Schovám se a s nikým o tom nikdy nebudu mluvit.",
      "Zazmatkuji a vyhodím mobil z okna.",
      "Zavřu obrazovku a hned to ukážu a popíši rodičům nebo jiné dospělé osobě, které důvěřuji.",
    ],
    answer: "Zavřu obrazovku a hned to ukážu a popíši rodičům nebo jiné dospělé osobě, které důvěřuji.",
    explanation:
      "Na internetu se může stát, že nechtěně narazíš na věci, které jsou strašidelné nebo nejsou určeny pro děti. Není to tvoje vina! Důležité je stránku zavřít a jít to hned říct dospělému, který ti pomůže věc pochopit nebo závadný obsah zablokovat.",
  },
];

/** `excludeIds` keeps already-correctly-answered exercises out of the draw; undefined means the finite bank is fully answered. */
export function pickRandomDigitalSafetyExercise(
  random: () => number = Math.random,
  excludeIds?: ReadonlySet<string>
): DigitalSafetyExercise | undefined {
  const pool = excludeIds ? DIGITAL_SAFETY_EXERCISES.filter((e) => !excludeIds.has(e.id)) : DIGITAL_SAFETY_EXERCISES;
  if (pool.length === 0) return undefined;
  return pool[Math.floor(random() * pool.length)];
}

/**
 * Hand-written "jak na šachy" content for the education panel on the
 * "Šachy" Vzdělání subject (components/ChessTips.tsx) — same reasoning as
 * lib/czech-language.ts and lib/financial-literacy.ts: real chess strategy
 * knowledge can't be procedurally generated, so it's authored once here.
 * Purely informational, no XP tied to reading it.
 */

export interface ChessTipSection {
  id: string;
  title: string;
  tips: string[];
}

/** Základy — how to think through a move, opening principles, piece values, the most common tactics/endgame ideas. */
export const CHESS_TIPS_BASICS: ChessTipSection[] = [
  {
    id: "thinking",
    title: "🧠 Jak přemýšlet nad tahem",
    tips: [
      "Nejdřív zkontroluj, jestli tvému králi něco nehrozí (šach) a jestli nemáš nějakou figuru v ohrožení.",
      "Podívej se, jestli můžeš vyhrát soupeřovu figuru zadarmo, nebo mu aspoň zhoršit postavení.",
      "Než zahraješ tah, zkus si v hlavě představit, co na něj udělá soupeř — nehraj hned první nápad, co tě napadne.",
      "Když nevíš, co hrát, zlepši postavení své nejhorší (nejméně zapojené) figury.",
    ],
  },
  {
    id: "opening",
    title: "♟️ Zásady zahájení",
    tips: [
      "Ovládni střed šachovnice (pole d4, d5, e4, e5) pěšci a figurami — odtamtud vidí figury nejvíc polí.",
      "Rozvíjej jezdce a střelce co nejdřív, věž a dámu nech až na později.",
      "Netahej stejnou figurou dvakrát, pokud nemusíš — ztrácíš tím tempo, které mohl soupeř využít jinde.",
      "Zajisti krále rošádou co nejdřív, ať není uprostřed šachovnice vystavený útoku.",
      "Nevyváděj dámu příliš brzy — soupeř na ni může zaútočit levnou figurou a ty ji budeš muset pořád zachraňovat.",
    ],
  },
  {
    id: "values",
    title: "💎 Hodnota figur",
    tips: [
      "Pěšec = 1 bod, jezdec = 3 body, střelec = 3 body, věž = 5 bodů, dáma = 9 bodů.",
      "Král nemá bodovou hodnotu — nedá se vyměnit, přijít o něj znamená konec hry.",
      "Než vyměníš figury, spočítej si body na obou stranách — vyplatí se ti to?",
    ],
  },
  {
    id: "tactics",
    title: "⚡ Základní taktiky",
    tips: [
      "Vidlička — jedna tvoje figura zaútočí na dvě soupeřovy najednou, on může zachránit jen jednu.",
      "Špendlík (pin) — soupeřova figura se nemůže hnout, protože by za ní odkryla krále nebo cennější figuru.",
      "Objevný šach — pohneš jednou figurou a odkryješ šach od úplně jiné.",
    ],
  },
  {
    id: "endgame",
    title: "🏁 Koncovka",
    tips: [
      "Když zůstane málo figur, je král silná bojová figura — zapoj ho do hry, už mu nic tolik nehrozí.",
      "Postrkuj své pěšce směrem k poslední řadě — když se tam dostanou, promění se v libovolnou figuru (nejčastěji dámu).",
      "Snaž se, aby tvůj král byl v koncovce blíž vlastním pěšcům než soupeřův král.",
    ],
  },
];

/**
 * Pokročilé — pro hráče, co už zvládají základy a chtějí jít dál: méně
 * časté ale silné taktické motivy a strategické koncepty, které se hodí
 * hlavně od střední/koncové fáze partie.
 */
export const CHESS_TIPS_ADVANCED: ChessTipSection[] = [
  {
    id: "advanced-tactics",
    title: "🗡️ Pokročilé taktiky",
    tips: [
      "Střelová řada (skewer) — opak vidličky: napadneš cennější figuru, ta musí uhnout a odkryje méně cennou figuru přesně za sebou.",
      "Odvedení pozornosti (deflection) — donutíš soupeřovu figuru opustit důležité pole (třeba obranu jiné figury nebo pole u krále) tím, že na ni zaútočíš.",
      "Vnadidlo (decoy) — vlákáš soupeřovu figuru (často krále) na konkrétní pole obětí, aby na ni pak zafungovala jiná taktika.",
      "X-ray útok — tvoje figura \"vidí\" přes soupeřovu figuru na cíl za ní, i když tam sama přímo nedosáhne — funguje to i na obranu.",
      "Mat na poslední řadě (back-rank mate) — když má král před sebou jen vlastní pěšce a žádné únikové pole, stačí dostat věž nebo dámu na jeho řadu.",
      "Zugzwang — situace (hlavně v koncovkách), kdy je pro soupeře nevýhodné zahrát cokoliv, ale pravidla ho nutí táhnout.",
    ],
  },
  {
    id: "advanced-strategy",
    title: "🏰 Pokročilá strategie",
    tips: [
      "Pěšcová struktura — izolovaný, zdvojený nebo zaostalý pěšec je dlouhodobá slabina, na kterou soupeř může tlačit celou partii.",
      "Silný bod (outpost) — pole (často u soupeřovy poloviny), které soupeř nemůže napadnout pěšcem — ideální místo pro jezdce.",
      "Otevřený sloupec pro věž — postav věž na sloupec bez pěšců (tvých ani soupeřových), odtud má nejvíc dosahu a síly.",
      "Pár střelců — dva střelci dohromady pokrývají obě barvy polí a v otevřenější pozici bývají silnější než střelec s jezdcem.",
      "Profylaxe — než zaútočíš, zeptej se sám sebe, co chce zahrát soupeř, a tomu tahem předejdi.",
      "Bezpečí krále vs. aktivita — v zahájení a středehře krále schovej a chraň, ale v koncovce ho naopak aktivně zapoj do boje.",
    ],
  },
];

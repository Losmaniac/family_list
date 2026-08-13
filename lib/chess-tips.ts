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

export const CHESS_TIPS: ChessTipSection[] = [
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

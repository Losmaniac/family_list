/**
 * Word bank for the "Španělština" flashcards — same shape and same
 * flashcard mechanic as lib/english-words.ts (study picture+word, then
 * quiz emoji-only), just a smaller curated set. Example sentences use a
 * handful of gender-agnostic templates rather than English's
 * category-specific ones ("I have a/an ___") — Spanish nouns need gender-
 * matched articles (el/la, un/una) to read correctly, and getting that
 * wrong per-word would be worse than a simpler, always-correct sentence.
 */

export interface SpanishWord {
  id: string;
  es: string;
  cs: string;
  emoji: string;
  category: string;
}

export const SPANISH_WORDS: SpanishWord[] = [
  // Zvířata
  { id: "es-cat", es: "gato", cs: "kočka", emoji: "🐱", category: "Zvířata" },
  { id: "es-dog", es: "perro", cs: "pes", emoji: "🐶", category: "Zvířata" },
  { id: "es-fish", es: "pez", cs: "ryba", emoji: "🐟", category: "Zvířata" },
  { id: "es-bird", es: "pájaro", cs: "pták", emoji: "🐦", category: "Zvířata" },
  { id: "es-horse", es: "caballo", cs: "kůň", emoji: "🐴", category: "Zvířata" },
  { id: "es-cow", es: "vaca", cs: "kráva", emoji: "🐄", category: "Zvířata" },
  { id: "es-pig", es: "cerdo", cs: "prase", emoji: "🐷", category: "Zvířata" },
  { id: "es-sheep", es: "oveja", cs: "ovce", emoji: "🐑", category: "Zvířata" },
  { id: "es-goat", es: "cabra", cs: "koza", emoji: "🐐", category: "Zvířata" },
  { id: "es-chicken", es: "pollo", cs: "kuře", emoji: "🐔", category: "Zvířata" },
  { id: "es-duck", es: "pato", cs: "kachna", emoji: "🦆", category: "Zvířata" },
  { id: "es-rabbit", es: "conejo", cs: "králík", emoji: "🐰", category: "Zvířata" },
  { id: "es-mouse", es: "ratón", cs: "myš", emoji: "🐭", category: "Zvířata" },
  { id: "es-turtle", es: "tortuga", cs: "želva", emoji: "🐢", category: "Zvířata" },
  { id: "es-snake", es: "serpiente", cs: "had", emoji: "🐍", category: "Zvířata" },
  { id: "es-frog", es: "rana", cs: "žába", emoji: "🐸", category: "Zvířata" },
  { id: "es-spider", es: "araña", cs: "pavouk", emoji: "🕷️", category: "Zvířata" },
  { id: "es-bee", es: "abeja", cs: "včela", emoji: "🐝", category: "Zvířata" },
  { id: "es-butterfly", es: "mariposa", cs: "motýl", emoji: "🦋", category: "Zvířata" },
  { id: "es-lion", es: "león", cs: "lev", emoji: "🦁", category: "Zvířata" },
  { id: "es-tiger", es: "tigre", cs: "tygr", emoji: "🐯", category: "Zvířata" },
  { id: "es-elephant", es: "elefante", cs: "slon", emoji: "🐘", category: "Zvířata" },
  { id: "es-giraffe", es: "jirafa", cs: "žirafa", emoji: "🦒", category: "Zvířata" },
  { id: "es-monkey", es: "mono", cs: "opice", emoji: "🐵", category: "Zvířata" },
  { id: "es-bear", es: "oso", cs: "medvěd", emoji: "🐻", category: "Zvířata" },
  { id: "es-panda", es: "panda", cs: "panda", emoji: "🐼", category: "Zvířata" },
  { id: "es-wolf", es: "lobo", cs: "vlk", emoji: "🐺", category: "Zvířata" },
  { id: "es-fox", es: "zorro", cs: "liška", emoji: "🦊", category: "Zvířata" },
  { id: "es-deer", es: "ciervo", cs: "jelen", emoji: "🦌", category: "Zvířata" },
  { id: "es-owl", es: "búho", cs: "sova", emoji: "🦉", category: "Zvířata" },
  { id: "es-eagle", es: "águila", cs: "orel", emoji: "🦅", category: "Zvířata" },
  { id: "es-penguin", es: "pingüino", cs: "tučňák", emoji: "🐧", category: "Zvířata" },
  { id: "es-dolphin", es: "delfín", cs: "delfín", emoji: "🐬", category: "Zvířata" },
  { id: "es-shark", es: "tiburón", cs: "žralok", emoji: "🦈", category: "Zvířata" },
  { id: "es-octopus", es: "pulpo", cs: "chobotnice", emoji: "🐙", category: "Zvířata" },
  { id: "es-crab", es: "cangrejo", cs: "krab", emoji: "🦀", category: "Zvířata" },

  // Barvy
  { id: "es-red", es: "rojo", cs: "červená", emoji: "🔴", category: "Barvy" },
  { id: "es-blue", es: "azul", cs: "modrá", emoji: "🔵", category: "Barvy" },
  { id: "es-green", es: "verde", cs: "zelená", emoji: "🟢", category: "Barvy" },
  { id: "es-yellow", es: "amarillo", cs: "žlutá", emoji: "🟡", category: "Barvy" },
  { id: "es-orange-color", es: "naranja", cs: "oranžová", emoji: "🟠", category: "Barvy" },
  { id: "es-purple", es: "morado", cs: "fialová", emoji: "🟣", category: "Barvy" },
  { id: "es-pink", es: "rosa", cs: "růžová", emoji: "🩷", category: "Barvy" },
  { id: "es-black", es: "negro", cs: "černá", emoji: "⚫", category: "Barvy" },
  { id: "es-white", es: "blanco", cs: "bílá", emoji: "⚪", category: "Barvy" },
  { id: "es-brown", es: "marrón", cs: "hnědá", emoji: "🟤", category: "Barvy" },
  { id: "es-gray", es: "gris", cs: "šedá", emoji: "🩶", category: "Barvy" },

  // Čísla
  { id: "es-one", es: "uno", cs: "jedna", emoji: "1️⃣", category: "Čísla" },
  { id: "es-two", es: "dos", cs: "dva", emoji: "2️⃣", category: "Čísla" },
  { id: "es-three", es: "tres", cs: "tři", emoji: "3️⃣", category: "Čísla" },
  { id: "es-four", es: "cuatro", cs: "čtyři", emoji: "4️⃣", category: "Čísla" },
  { id: "es-five", es: "cinco", cs: "pět", emoji: "5️⃣", category: "Čísla" },
  { id: "es-six", es: "seis", cs: "šest", emoji: "6️⃣", category: "Čísla" },
  { id: "es-seven", es: "siete", cs: "sedm", emoji: "7️⃣", category: "Čísla" },
  { id: "es-eight", es: "ocho", cs: "osm", emoji: "8️⃣", category: "Čísla" },
  { id: "es-nine", es: "nueve", cs: "devět", emoji: "9️⃣", category: "Čísla" },
  { id: "es-ten", es: "diez", cs: "deset", emoji: "🔟", category: "Čísla" },

  // Rodina
  { id: "es-mother", es: "madre", cs: "matka", emoji: "👩", category: "Rodina" },
  { id: "es-father", es: "padre", cs: "otec", emoji: "👨", category: "Rodina" },
  { id: "es-brother", es: "hermano", cs: "bratr", emoji: "👦", category: "Rodina" },
  { id: "es-sister", es: "hermana", cs: "sestra", emoji: "👧", category: "Rodina" },
  { id: "es-grandmother", es: "abuela", cs: "babička", emoji: "👵", category: "Rodina" },
  { id: "es-grandfather", es: "abuelo", cs: "dědeček", emoji: "👴", category: "Rodina" },
  { id: "es-son", es: "hijo", cs: "syn", emoji: "👦", category: "Rodina" },
  { id: "es-daughter", es: "hija", cs: "dcera", emoji: "👧", category: "Rodina" },
  { id: "es-baby", es: "bebé", cs: "miminko", emoji: "👶", category: "Rodina" },
  { id: "es-family", es: "familia", cs: "rodina", emoji: "👪", category: "Rodina" },

  // Jídlo
  { id: "es-apple", es: "manzana", cs: "jablko", emoji: "🍎", category: "Jídlo" },
  { id: "es-banana", es: "plátano", cs: "banán", emoji: "🍌", category: "Jídlo" },
  { id: "es-bread", es: "pan", cs: "chléb", emoji: "🍞", category: "Jídlo" },
  { id: "es-cheese", es: "queso", cs: "sýr", emoji: "🧀", category: "Jídlo" },
  { id: "es-milk", es: "leche", cs: "mléko", emoji: "🥛", category: "Jídlo" },
  { id: "es-water", es: "agua", cs: "voda", emoji: "💧", category: "Jídlo" },
  { id: "es-egg", es: "huevo", cs: "vejce", emoji: "🥚", category: "Jídlo" },
  { id: "es-rice", es: "arroz", cs: "rýže", emoji: "🍚", category: "Jídlo" },
  { id: "es-cake", es: "pastel", cs: "dort", emoji: "🎂", category: "Jídlo" },
  { id: "es-icecream", es: "helado", cs: "zmrzlina", emoji: "🍦", category: "Jídlo" },
  { id: "es-chocolate", es: "chocolate", cs: "čokoláda", emoji: "🍫", category: "Jídlo" },
  { id: "es-strawberry", es: "fresa", cs: "jahoda", emoji: "🍓", category: "Jídlo" },
  { id: "es-grape", es: "uva", cs: "hroznové víno", emoji: "🍇", category: "Jídlo" },
  { id: "es-pear", es: "pera", cs: "hruška", emoji: "🍐", category: "Jídlo" },
  { id: "es-lemon", es: "limón", cs: "citron", emoji: "🍋", category: "Jídlo" },
  { id: "es-watermelon", es: "sandía", cs: "meloun", emoji: "🍉", category: "Jídlo" },
  { id: "es-pizza", es: "pizza", cs: "pizza", emoji: "🍕", category: "Jídlo" },

  // Tělo
  { id: "es-eye", es: "ojo", cs: "oko", emoji: "👁️", category: "Tělo" },
  { id: "es-ear", es: "oreja", cs: "ucho", emoji: "👂", category: "Tělo" },
  { id: "es-nose", es: "nariz", cs: "nos", emoji: "👃", category: "Tělo" },
  { id: "es-mouth", es: "boca", cs: "ústa", emoji: "👄", category: "Tělo" },
  { id: "es-hand", es: "mano", cs: "ruka", emoji: "✋", category: "Tělo" },
  { id: "es-foot", es: "pie", cs: "noha (chodidlo)", emoji: "🦶", category: "Tělo" },
  { id: "es-leg", es: "pierna", cs: "noha", emoji: "🦵", category: "Tělo" },
  { id: "es-tooth", es: "diente", cs: "zub", emoji: "🦷", category: "Tělo" },
  { id: "es-heart", es: "corazón", cs: "srdce", emoji: "❤️", category: "Tělo" },

  // Doma
  { id: "es-house", es: "casa", cs: "dům", emoji: "🏠", category: "Doma" },
  { id: "es-door", es: "puerta", cs: "dveře", emoji: "🚪", category: "Doma" },
  { id: "es-window", es: "ventana", cs: "okno", emoji: "🪟", category: "Doma" },
  { id: "es-bed", es: "cama", cs: "postel", emoji: "🛏️", category: "Doma" },
  { id: "es-chair", es: "silla", cs: "židle", emoji: "🪑", category: "Doma" },
  { id: "es-key", es: "llave", cs: "klíč", emoji: "🔑", category: "Doma" },
  { id: "es-mirror", es: "espejo", cs: "zrcadlo", emoji: "🪞", category: "Doma" },
  { id: "es-clock", es: "reloj", cs: "hodiny", emoji: "🕐", category: "Doma" },

  // Oblečení
  { id: "es-shirt", es: "camisa", cs: "košile", emoji: "👕", category: "Oblečení" },
  { id: "es-pants", es: "pantalones", cs: "kalhoty", emoji: "👖", category: "Oblečení" },
  { id: "es-shoes", es: "zapatos", cs: "boty", emoji: "👟", category: "Oblečení" },
  { id: "es-hat", es: "sombrero", cs: "klobouk", emoji: "🎩", category: "Oblečení" },
  { id: "es-dress", es: "vestido", cs: "šaty", emoji: "👗", category: "Oblečení" },
  { id: "es-socks", es: "calcetines", cs: "ponožky", emoji: "🧦", category: "Oblečení" },
  { id: "es-jacket", es: "chaqueta", cs: "bunda", emoji: "🧥", category: "Oblečení" },
  { id: "es-gloves", es: "guantes", cs: "rukavice", emoji: "🧤", category: "Oblečení" },
  { id: "es-scarf", es: "bufanda", cs: "šála", emoji: "🧣", category: "Oblečení" },

  // Doprava
  { id: "es-car", es: "coche", cs: "auto", emoji: "🚗", category: "Doprava" },
  { id: "es-bus", es: "autobús", cs: "autobus", emoji: "🚌", category: "Doprava" },
  { id: "es-train", es: "tren", cs: "vlak", emoji: "🚂", category: "Doprava" },
  { id: "es-airplane", es: "avión", cs: "letadlo", emoji: "✈️", category: "Doprava" },
  { id: "es-boat", es: "barco", cs: "loď", emoji: "🚢", category: "Doprava" },
  { id: "es-bicycle", es: "bicicleta", cs: "kolo", emoji: "🚲", category: "Doprava" },
  { id: "es-motorcycle", es: "motocicleta", cs: "motorka", emoji: "🏍️", category: "Doprava" },
  { id: "es-taxi", es: "taxi", cs: "taxi", emoji: "🚕", category: "Doprava" },
  { id: "es-truck", es: "camión", cs: "náklaďák", emoji: "🚚", category: "Doprava" },

  // Počasí a příroda
  { id: "es-sun", es: "sol", cs: "slunce", emoji: "☀️", category: "Počasí a příroda" },
  { id: "es-rain", es: "lluvia", cs: "déšť", emoji: "🌧️", category: "Počasí a příroda" },
  { id: "es-snow", es: "nieve", cs: "sníh", emoji: "❄️", category: "Počasí a příroda" },
  { id: "es-wind", es: "viento", cs: "vítr", emoji: "💨", category: "Počasí a příroda" },
  { id: "es-cloud", es: "nube", cs: "mrak", emoji: "☁️", category: "Počasí a příroda" },
  { id: "es-storm", es: "tormenta", cs: "bouřka", emoji: "⛈️", category: "Počasí a příroda" },
  { id: "es-rainbow", es: "arcoíris", cs: "duha", emoji: "🌈", category: "Počasí a příroda" },
  { id: "es-star", es: "estrella", cs: "hvězda", emoji: "⭐", category: "Počasí a příroda" },
  { id: "es-moon", es: "luna", cs: "měsíc", emoji: "🌙", category: "Počasí a příroda" },

  // Škola
  { id: "es-book", es: "libro", cs: "kniha", emoji: "📚", category: "Škola" },
  { id: "es-pencil", es: "lápiz", cs: "tužka", emoji: "✏️", category: "Škola" },
  { id: "es-pen", es: "bolígrafo", cs: "pero", emoji: "🖊️", category: "Škola" },
  { id: "es-backpack", es: "mochila", cs: "batoh", emoji: "🎒", category: "Škola" },
  { id: "es-school", es: "escuela", cs: "škola", emoji: "🏫", category: "Škola" },
  { id: "es-notebook", es: "cuaderno", cs: "sešit", emoji: "📓", category: "Škola" },
  { id: "es-ruler", es: "regla", cs: "pravítko", emoji: "📏", category: "Škola" },
  { id: "es-scissors", es: "tijeras", cs: "nůžky", emoji: "✂️", category: "Škola" },

  // Slovesa
  { id: "es-eat", es: "comer", cs: "jíst", emoji: "🍽️", category: "Slovesa" },
  { id: "es-drink", es: "beber", cs: "pít", emoji: "🥤", category: "Slovesa" },
  { id: "es-run", es: "correr", cs: "běhat", emoji: "🏃", category: "Slovesa" },
  { id: "es-jump", es: "saltar", cs: "skákat", emoji: "🤸", category: "Slovesa" },
  { id: "es-sleep", es: "dormir", cs: "spát", emoji: "😴", category: "Slovesa" },
  { id: "es-swim", es: "nadar", cs: "plavat", emoji: "🏊", category: "Slovesa" },
  { id: "es-read", es: "leer", cs: "číst", emoji: "📖", category: "Slovesa" },
  { id: "es-write", es: "escribir", cs: "psát", emoji: "✍️", category: "Slovesa" },
  { id: "es-play", es: "jugar", cs: "hrát si", emoji: "🎮", category: "Slovesa" },
  { id: "es-sing", es: "cantar", cs: "zpívat", emoji: "🎤", category: "Slovesa" },
  { id: "es-dance", es: "bailar", cs: "tančit", emoji: "💃", category: "Slovesa" },
  { id: "es-laugh", es: "reír", cs: "smát se", emoji: "😄", category: "Slovesa" },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SENTENCE_TEMPLATES: ((w: string) => string)[] = [
  (w) => `Me gusta "${w}".`,
  (w) => `¿Qué es "${w}"?`,
  (w) => `Estoy aprendiendo la palabra "${w}".`,
  (w) => `Mira, "${w}".`,
];

/** A short, gender-agnostic Spanish example sentence — see the file header for why this doesn't attempt English-style "a/an ___" templates per category. */
export function buildSpanishExampleSentence(word: Pick<SpanishWord, "es">): string {
  const template = SENTENCE_TEMPLATES[hashString(word.es) % SENTENCE_TEMPLATES.length];
  return template(word.es);
}

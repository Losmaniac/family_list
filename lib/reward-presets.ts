export interface RewardPreset {
  title: string;
  icon: string;
  xpCost: number;
  approvalRequired: boolean;
}

export interface RewardPresetTier {
  label: string;
  hint: string;
  presets: RewardPreset[];
}

export const REWARD_PRESET_TIERS: RewardPresetTier[] = [
  {
    label: "Malé",
    hint: "20–50 XP, okamžité",
    presets: [
      { title: "30 min navíc u obrazovky", icon: "📱", xpCost: 25, approvalRequired: false },
      { title: "Vybrat si přílohu k večeři", icon: "🍟", xpCost: 20, approvalRequired: false },
      { title: "Zmrzlina", icon: "🍦", xpCost: 25, approvalRequired: false },
      { title: "Oblíbená svačina", icon: "🍫", xpCost: 20, approvalRequired: false },
      { title: "Zůstat vzhůru o 30 min déle", icon: "🌙", xpCost: 30, approvalRequired: false },
      { title: "Vybrat písničku v autě", icon: "🎵", xpCost: 15, approvalRequired: false },
      { title: "Hrát oblíbenou hru 30 min", icon: "🎮", xpCost: 30, approvalRequired: false },
      { title: "Sledovat video 20 min", icon: "📺", xpCost: 25, approvalRequired: false },
      { title: "Vynechat mytí nádobí jednou", icon: "🍽️", xpCost: 30, approvalRequired: false },
      { title: "Vybrat si dnešní hru večer", icon: "🎲", xpCost: 25, approvalRequired: false },
      { title: "Horká čokoláda navíc", icon: "☕", xpCost: 20, approvalRequired: false },
      { title: "Nálepka/samolepka do sbírky", icon: "⭐", xpCost: 15, approvalRequired: false },
    ],
  },
  {
    label: "Střední",
    hint: "100–300 XP, naplánované",
    presets: [
      { title: "Výběr filmu na páteční večer", icon: "🎬", xpCost: 120, approvalRequired: true },
      { title: "Pizza večer", icon: "🍕", xpCost: 150, approvalRequired: true },
      { title: "Návštěva kamaráda", icon: "👫", xpCost: 100, approvalRequired: true },
      { title: "Přespání u kamaráda", icon: "🛏️", xpCost: 200, approvalRequired: true },
      { title: "Výlet na zmrzlinu", icon: "🍨", xpCost: 100, approvalRequired: true },
      { title: "Nová kniha", icon: "📖", xpCost: 180, approvalRequired: true },
      { title: "Deskovka", icon: "🎲", xpCost: 220, approvalRequired: true },
      { title: "Výlet do kina", icon: "🎥", xpCost: 250, approvalRequired: true },
      { title: "Bowling", icon: "🎳", xpCost: 250, approvalRequired: true },
      { title: "Odpoledne v aquaparku", icon: "🏊", xpCost: 300, approvalRequired: true },
      { title: "Návštěva zoo/muzea", icon: "🦁", xpCost: 220, approvalRequired: true },
      { title: "Nové oblečení (menší kousek)", icon: "👕", xpCost: 200, approvalRequired: true },
    ],
  },
  {
    label: "Velké / spořicí cíle",
    hint: "800–1 500 XP, šetří se déle",
    presets: [
      { title: "Nová hračka", icon: "🧸", xpCost: 900, approvalRequired: true },
      { title: "Videohra", icon: "🕹️", xpCost: 1300, approvalRequired: true },
      { title: "Sportovní vybavení", icon: "⚽", xpCost: 1000, approvalRequired: true },
      { title: "Nové kolo", icon: "🚲", xpCost: 1500, approvalRequired: true },
      { title: "Lístek na koncert/akci", icon: "🎫", xpCost: 1200, approvalRequired: true },
      { title: "Celodenní výlet dle výběru", icon: "🗺️", xpCost: 1400, approvalRequired: true },
      { title: "Nové sluchátka", icon: "🎧", xpCost: 1100, approvalRequired: true },
      { title: "Herní konzole příslušenství", icon: "🎮", xpCost: 1500, approvalRequired: true },
    ],
  },
];

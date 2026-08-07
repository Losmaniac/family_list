export const ANIMAL_AVATAR_OPTIONS = [
  "🦊", "🐻", "🐼", "🐨", "🦁", "🐯", "🐸", "🐵",
  "🐶", "🐱", "🦄", "🐙", "🦋", "🐢", "🦉", "🐝",
] as const;

/** @deprecated kept for backwards compatibility — use ANIMAL_AVATAR_OPTIONS. */
export const AVATAR_OPTIONS = ANIMAL_AVATAR_OPTIONS;

export function isAnimalAvatar(value: string | undefined): value is (typeof ANIMAL_AVATAR_OPTIONS)[number] {
  return !!value && (ANIMAL_AVATAR_OPTIONS as readonly string[]).includes(value);
}

/** @deprecated use isAnimalAvatar — kept so any stray callers don't break. */
export const isKnownAvatar = isAnimalAvatar;

export const SKIN_TONES = ["#FFDBB4", "#EDB98A", "#D08B5B", "#AE5D29", "#6B4226"] as const;

export const HAIR_COLORS = ["#2C2220", "#6B4226", "#D6A24C", "#B5472B", "#8A8A8A", "#7B5FE0"] as const;

export const HAIR_STYLES = [
  { id: "none", label: "Holá hlava" },
  { id: "short", label: "Krátké" },
  { id: "curly", label: "Kudrnaté" },
  { id: "long", label: "Dlouhé" },
  { id: "mohawk", label: "Mohawk" },
  { id: "bun", label: "Drdol" },
] as const;

export const EYE_STYLES = [
  { id: "dot", label: "Tečky" },
  { id: "happy", label: "Šťastné" },
  { id: "wink", label: "Mrknutí" },
  { id: "glasses", label: "Brýle" },
] as const;

export const MOUTH_STYLES = [
  { id: "smile", label: "Úsměv" },
  { id: "laugh", label: "Smích" },
  { id: "neutral", label: "Neutrální" },
  { id: "surprised", label: "Překvapení" },
] as const;

export const FACIAL_HAIR_STYLES = [
  { id: "none", label: "Bez vousů" },
  { id: "mustache", label: "Knír" },
  { id: "beard", label: "Plnovous" },
  { id: "goatee", label: "Bradka" },
] as const;

export type HairStyle = (typeof HAIR_STYLES)[number]["id"];
export type EyeStyle = (typeof EYE_STYLES)[number]["id"];
export type MouthStyle = (typeof MOUTH_STYLES)[number]["id"];
export type FacialHairStyle = (typeof FACIAL_HAIR_STYLES)[number]["id"];

export interface FaceAvatarConfig {
  skin: number;
  hair: HairStyle;
  hairColor: number;
  eyes: EyeStyle;
  mouth: MouthStyle;
  facialHair: FacialHairStyle;
}

export const DEFAULT_FACE_AVATAR: FaceAvatarConfig = {
  skin: 1,
  hair: "short",
  hairColor: 0,
  eyes: "dot",
  mouth: "smile",
  facialHair: "none",
};

const FACE_PREFIX = "face:";

export function encodeFaceAvatar(config: FaceAvatarConfig): string {
  return FACE_PREFIX + JSON.stringify(config);
}

export function parseFaceAvatar(value: string | undefined): FaceAvatarConfig | null {
  if (!value || !value.startsWith(FACE_PREFIX)) return null;
  try {
    const parsed = JSON.parse(value.slice(FACE_PREFIX.length));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.skin !== "number" ||
      typeof parsed.hair !== "string" ||
      typeof parsed.hairColor !== "number" ||
      typeof parsed.eyes !== "string" ||
      typeof parsed.mouth !== "string" ||
      typeof parsed.facialHair !== "string"
    ) {
      return null;
    }
    return parsed as FaceAvatarConfig;
  } catch {
    return null;
  }
}

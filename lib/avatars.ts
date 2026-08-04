export const AVATAR_OPTIONS = [
  "🦊", "🐻", "🐼", "🐨", "🦁", "🐯", "🐸", "🐵",
  "🐶", "🐱", "🦄", "🐙", "🦋", "🐢", "🦉", "🐝",
] as const;

export function isKnownAvatar(value: string | undefined): value is (typeof AVATAR_OPTIONS)[number] {
  return !!value && (AVATAR_OPTIONS as readonly string[]).includes(value);
}

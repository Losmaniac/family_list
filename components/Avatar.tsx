import { buildDicebearUrl, isAnimalAvatar, LETTER_COLORS, parseDicebearAvatar, parseFaceAvatar, parseLetterAvatar } from "@/lib/avatars";
import FaceAvatar from "@/components/FaceAvatar";

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "h-8 w-8 text-base",
  md: "h-11 w-11 text-xl",
  lg: "h-16 w-16 text-3xl",
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Avatar({ name, avatarUrl, size = "md" }: AvatarProps) {
  const faceConfig = parseFaceAvatar(avatarUrl);
  const letterConfig = parseLetterAvatar(avatarUrl);
  const dicebearConfig = parseDicebearAvatar(avatarUrl);
  const isAnimal = isAnimalAvatar(avatarUrl);

  if (letterConfig) {
    const color = LETTER_COLORS[letterConfig.color] ?? LETTER_COLORS[0];
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${SIZE_CLASSES[size]}`}
        style={{ backgroundColor: color }}
      >
        {letterConfig.text}
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 font-semibold text-accent ${SIZE_CLASSES[size]}`}
    >
      {faceConfig ? (
        <FaceAvatar config={faceConfig} className="h-full w-full" />
      ) : dicebearConfig ? (
        // eslint-disable-next-line @next/next/no-img-element -- external DiceBear SVG, not a static asset
        <img src={buildDicebearUrl(dicebearConfig)} alt="" className="h-full w-full" />
      ) : isAnimal ? (
        avatarUrl
      ) : (
        initials(name) || "?"
      )}
    </div>
  );
}

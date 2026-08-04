import { isKnownAvatar } from "@/lib/avatars";

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
  const showEmoji = isKnownAvatar(avatarUrl);

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent ${SIZE_CLASSES[size]}`}
    >
      {showEmoji ? avatarUrl : initials(name) || "?"}
    </div>
  );
}

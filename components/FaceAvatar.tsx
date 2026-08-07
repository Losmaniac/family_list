import { HAIR_COLORS, SKIN_TONES, type FaceAvatarConfig } from "@/lib/avatars";

export default function FaceAvatar({ config, className }: { config: FaceAvatarConfig; className?: string }) {
  const skin = SKIN_TONES[config.skin] ?? SKIN_TONES[0];
  const hairColor = HAIR_COLORS[config.hairColor] ?? HAIR_COLORS[0];

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Avatar">
      <circle cx="50" cy="55" r="38" fill={skin} />

      {config.hair !== "none" && (
        <>
          <circle cx="50" cy="42" r="39" fill={hairColor} />
          <circle cx="50" cy="58" r="37" fill={skin} />
          {config.hair === "curly" &&
            [-28, -16, 0, 16, 28].map((dx) => (
              <circle key={dx} cx={50 + dx} cy={22 - Math.abs(dx) * 0.15} r="9" fill={hairColor} />
            ))}
          {config.hair === "long" && (
            <>
              <path d="M12,45 Q8,75 16,92 L26,92 Q20,70 22,45 Z" fill={hairColor} />
              <path d="M88,45 Q92,75 84,92 L74,92 Q80,70 78,45 Z" fill={hairColor} />
            </>
          )}
          {config.hair === "mohawk" && <rect x="42" y="4" width="16" height="34" rx="6" fill={hairColor} />}
          {config.hair === "bun" && <circle cx="50" cy="12" r="9" fill={hairColor} />}
        </>
      )}

      {config.eyes === "dot" && (
        <>
          <circle cx="38" cy="53" r="3.5" fill="#2C2220" />
          <circle cx="62" cy="53" r="3.5" fill="#2C2220" />
        </>
      )}
      {config.eyes === "happy" && (
        <>
          <path d="M33,53 Q38,47 43,53" stroke="#2C2220" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M57,53 Q62,47 67,53" stroke="#2C2220" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      {config.eyes === "wink" && (
        <>
          <circle cx="38" cy="53" r="3.5" fill="#2C2220" />
          <path d="M57,53 Q62,49 67,53" stroke="#2C2220" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      {config.eyes === "glasses" && (
        <>
          <circle cx="38" cy="53" r="9" fill="none" stroke="#2C2220" strokeWidth="2.5" />
          <circle cx="62" cy="53" r="9" fill="none" stroke="#2C2220" strokeWidth="2.5" />
          <line x1="47" y1="53" x2="53" y2="53" stroke="#2C2220" strokeWidth="2.5" />
          <circle cx="38" cy="53" r="2.5" fill="#2C2220" />
          <circle cx="62" cy="53" r="2.5" fill="#2C2220" />
        </>
      )}

      {config.mouth === "smile" && (
        <path d="M38,70 Q50,80 62,70" stroke="#2C2220" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}
      {config.mouth === "laugh" && <ellipse cx="50" cy="73" rx="11" ry="7" fill="#2C2220" />}
      {config.mouth === "neutral" && <line x1="40" y1="73" x2="60" y2="73" stroke="#2C2220" strokeWidth="3" strokeLinecap="round" />}
      {config.mouth === "surprised" && <circle cx="50" cy="73" r="5" fill="#2C2220" />}

      {config.facialHair === "mustache" && (
        <path d="M36,65 Q43,61 50,65 Q57,61 64,65 Q57,68 50,65 Q43,68 36,65 Z" fill={hairColor} />
      )}
      {config.facialHair === "beard" && (
        <path d="M20,55 Q20,88 50,92 Q80,88 80,55 Q80,80 50,84 Q20,80 20,55 Z" fill={hairColor} opacity="0.9" />
      )}
      {config.facialHair === "goatee" && <path d="M42,76 Q50,90 58,76 Q50,80 42,76 Z" fill={hairColor} />}
    </svg>
  );
}

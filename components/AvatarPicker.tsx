"use client";

import { useState } from "react";
import {
  ANIMAL_AVATAR_OPTIONS,
  DEFAULT_FACE_AVATAR,
  EYE_STYLES,
  FACIAL_HAIR_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  MOUTH_STYLES,
  SKIN_TONES,
  encodeFaceAvatar,
  isAnimalAvatar,
  parseFaceAvatar,
  type FaceAvatarConfig,
} from "@/lib/avatars";
import FaceAvatar from "@/components/FaceAvatar";

export default function AvatarPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (avatarUrl: string) => void;
}) {
  const initialConfig = parseFaceAvatar(value) ?? DEFAULT_FACE_AVATAR;
  const [tab, setTab] = useState<"face" | "animal">(isAnimalAvatar(value) ? "animal" : "face");
  const [config, setConfig] = useState<FaceAvatarConfig>(initialConfig);

  function updateConfig(patch: Partial<FaceAvatarConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    onChange(encodeFaceAvatar(next));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex self-start rounded-full border border-border p-1 text-sm">
        <button
          type="button"
          onClick={() => {
            setTab("face");
            onChange(encodeFaceAvatar(config));
          }}
          className={`rounded-full px-3 py-1 ${tab === "face" ? "bg-accent text-accent-foreground" : "text-zinc-500"}`}
        >
          Obličej
        </button>
        <button
          type="button"
          onClick={() => setTab("animal")}
          className={`rounded-full px-3 py-1 ${tab === "animal" ? "bg-accent text-accent-foreground" : "text-zinc-500"}`}
        >
          Zvířata
        </button>
      </div>

      {tab === "face" ? (
        <div className="flex flex-col gap-3">
          <FaceAvatar config={config} className="h-20 w-20 self-start rounded-full bg-accent/10" />

          <div className="flex flex-col gap-2 text-sm">
            <p className="text-zinc-500">Barva pleti</p>
            <div className="flex gap-2">
              {SKIN_TONES.map((color, i) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateConfig({ skin: i })}
                  style={{ backgroundColor: color }}
                  className={`h-7 w-7 rounded-full ${config.skin === i ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
                  aria-label={`Barva pleti ${i + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="text-zinc-500">Vlasy</p>
            <div className="flex flex-wrap gap-1.5">
              {HAIR_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => updateConfig({ hair: style.id })}
                  className={`rounded-full border px-3 py-1.5 ${
                    config.hair === style.id ? "border-accent bg-accent/10 text-accent" : "border-border"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
            {config.hair !== "none" && (
              <div className="flex gap-2">
                {HAIR_COLORS.map((color, i) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => updateConfig({ hairColor: i })}
                    style={{ backgroundColor: color }}
                    className={`h-6 w-6 rounded-full ${config.hairColor === i ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
                    aria-label={`Barva vlasů ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="text-zinc-500">Oči</p>
            <div className="flex flex-wrap gap-1.5">
              {EYE_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => updateConfig({ eyes: style.id })}
                  className={`rounded-full border px-3 py-1.5 ${
                    config.eyes === style.id ? "border-accent bg-accent/10 text-accent" : "border-border"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="text-zinc-500">Ústa</p>
            <div className="flex flex-wrap gap-1.5">
              {MOUTH_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => updateConfig({ mouth: style.id })}
                  className={`rounded-full border px-3 py-1.5 ${
                    config.mouth === style.id ? "border-accent bg-accent/10 text-accent" : "border-border"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="text-zinc-500">Vousy</p>
            <div className="flex flex-wrap gap-1.5">
              {FACIAL_HAIR_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => updateConfig({ facialHair: style.id })}
                  className={`rounded-full border px-3 py-1.5 ${
                    config.facialHair === style.id ? "border-accent bg-accent/10 text-accent" : "border-border"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {ANIMAL_AVATAR_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onChange(emoji)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${
                value === emoji ? "bg-accent/20 ring-2 ring-accent" : "bg-surface-muted"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

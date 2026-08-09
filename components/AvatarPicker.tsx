"use client";

import { useState } from "react";
import {
  ANIMAL_AVATAR_OPTIONS,
  DEFAULT_FACE_AVATAR,
  DICEBEAR_STYLES,
  EYE_STYLES,
  FACIAL_HAIR_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  LETTER_COLORS,
  MOUTH_STYLES,
  SKIN_TONES,
  buildDicebearUrl,
  encodeDicebearAvatar,
  encodeFaceAvatar,
  encodeLetterAvatar,
  isAnimalAvatar,
  parseDicebearAvatar,
  parseFaceAvatar,
  parseLetterAvatar,
  randomDicebearSeed,
  type DicebearAvatarConfig,
  type FaceAvatarConfig,
  type LetterAvatarConfig,
} from "@/lib/avatars";
import FaceAvatar from "@/components/FaceAvatar";

const DEFAULT_LETTER_AVATAR: LetterAvatarConfig = { text: "AB", color: 0 };

function defaultDicebearAvatar(): DicebearAvatarConfig {
  return { style: DICEBEAR_STYLES[0].id, seed: randomDicebearSeed() };
}

export default function AvatarPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (avatarUrl: string) => void;
}) {
  const initialConfig = parseFaceAvatar(value) ?? DEFAULT_FACE_AVATAR;
  const initialLetterConfig = parseLetterAvatar(value) ?? DEFAULT_LETTER_AVATAR;
  const initialDicebearConfig = parseDicebearAvatar(value) ?? defaultDicebearAvatar();
  const [tab, setTab] = useState<"face" | "letters" | "animal" | "dicebear">(
    parseDicebearAvatar(value) ? "dicebear" : isAnimalAvatar(value) ? "animal" : parseLetterAvatar(value) ? "letters" : "face"
  );
  const [config, setConfig] = useState<FaceAvatarConfig>(initialConfig);
  const [letterConfig, setLetterConfig] = useState<LetterAvatarConfig>(initialLetterConfig);
  const [dicebearConfig, setDicebearConfig] = useState<DicebearAvatarConfig>(initialDicebearConfig);

  function updateDicebearConfig(patch: Partial<DicebearAvatarConfig>) {
    const next = { ...dicebearConfig, ...patch };
    setDicebearConfig(next);
    onChange(encodeDicebearAvatar(next));
  }

  function updateConfig(patch: Partial<FaceAvatarConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    onChange(encodeFaceAvatar(next));
  }

  function updateLetterConfig(patch: Partial<LetterAvatarConfig>) {
    const next = { ...letterConfig, ...patch };
    setLetterConfig(next);
    if (next.text.length > 0) onChange(encodeLetterAvatar(next));
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
          onClick={() => {
            setTab("letters");
            if (letterConfig.text.length > 0) onChange(encodeLetterAvatar(letterConfig));
          }}
          className={`rounded-full px-3 py-1 ${tab === "letters" ? "bg-accent text-accent-foreground" : "text-zinc-500"}`}
        >
          Písmena
        </button>
        <button
          type="button"
          onClick={() => setTab("animal")}
          className={`rounded-full px-3 py-1 ${tab === "animal" ? "bg-accent text-accent-foreground" : "text-zinc-500"}`}
        >
          Zvířata
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("dicebear");
            onChange(encodeDicebearAvatar(dicebearConfig));
          }}
          className={`rounded-full px-3 py-1 ${tab === "dicebear" ? "bg-accent text-accent-foreground" : "text-zinc-500"}`}
        >
          Generovaný
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
      ) : tab === "letters" ? (
        <div className="flex flex-col gap-3">
          <div
            className="flex h-20 w-20 items-center justify-center self-start rounded-full text-2xl font-semibold text-white"
            style={{ backgroundColor: LETTER_COLORS[letterConfig.color] ?? LETTER_COLORS[0] }}
          >
            {letterConfig.text || "?"}
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="text-zinc-500">Písmena (max 2 znaky)</p>
            <input
              type="text"
              value={letterConfig.text}
              onChange={(e) => updateLetterConfig({ text: e.target.value.toUpperCase().slice(0, 2) })}
              maxLength={2}
              className="w-20 rounded-lg border border-border bg-surface px-3 py-2 text-center text-lg uppercase"
            />
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="text-zinc-500">Barva</p>
            <div className="flex flex-wrap gap-2">
              {LETTER_COLORS.map((color, i) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => updateLetterConfig({ color: i })}
                  style={{ backgroundColor: color }}
                  className={`h-7 w-7 rounded-full ${letterConfig.color === i ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
                  aria-label={`Barva ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      ) : tab === "animal" ? (
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
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- external DiceBear SVG, not a static asset */}
            <img
              src={buildDicebearUrl(dicebearConfig)}
              alt=""
              className="h-20 w-20 shrink-0 rounded-full bg-accent/10"
            />
            <button
              type="button"
              onClick={() => updateDicebearConfig({ seed: randomDicebearSeed() })}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
            >
              🎲 Náhodné
            </button>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <p className="text-zinc-500">Styl</p>
            <div className="flex flex-wrap gap-1.5">
              {DICEBEAR_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => updateDicebearConfig({ style: style.id })}
                  className={`rounded-full border px-3 py-1.5 ${
                    dicebearConfig.style === style.id ? "border-accent bg-accent/10 text-accent" : "border-border"
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

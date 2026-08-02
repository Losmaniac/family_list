# Family Quest — CLAUDE.md

Kontextový soubor pro Claude Code. Cíl projektu: rodinná to-do & XP aplikace jako PWA pro iOS (instalace přes "Add to Home Screen"), zdarma provoz.

## Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend/DB:** Firebase Firestore + Firebase Auth + Cloud Functions (Spark free tier)
- **PWA:** next-pwa nebo ruční service worker, Web Push (FCM) pro notifikace
- **Hosting:** Vercel (frontend), Firebase (functions + hosting rules)

## Struktura repa

```
family-quest/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/
│   │   ├── today/            # denní přehled úkolů
│   │   ├── assign/           # zadávání úkolů (rodič)
│   │   ├── shop/             # XP reward shop
│   │   └── profile/[userId]/
│   ├── api/
│   └── layout.tsx
├── components/
│   ├── TaskCard.tsx
│   ├── XPBar.tsx
│   ├── RewardShop.tsx
│   └── StreakBadge.tsx
├── lib/
│   ├── firebase.ts           # client init
│   ├── firebase-admin.ts     # server init
│   ├── xp-engine.ts          # veškerá XP logika centrálně, nikdy v komponentách
│   └── task-scheduler.ts     # generování denních úkolů z šablon
├── functions/src/
│   ├── dailyTaskGenerator.ts # cron 00:05, generuje dailyTasks z taskTemplates
│   └── sendReminders.ts      # Web Push večerní připomínky
├── public/
│   ├── manifest.json
│   └── icons/
├── firestore.rules
└── firestore.indexes.json
```

## Datový model (Firestore)

```
families/{familyId}
  name, inviteCode

families/{familyId}/members/{userId}
  name, role ('parent'|'child'), avatarUrl, xpBalance, currentStreak

families/{familyId}/taskTemplates/{templateId}
  title, description, xpValue, recurrence ('daily'|'weekly'|'custom'),
  assignedTo: [userId], daysOfWeek: [], active

families/{familyId}/dailyTasks/{date}_{taskId}
  templateId, assignedTo, date, status ('pending'|'done'|'missed'),
  completedAt, xpAwarded

families/{familyId}/xpLedger/{entryId}
  userId, delta, reason, timestamp, relatedTaskId?

families/{familyId}/rewards/{rewardId}
  title, xpCost, approvalRequired, active

families/{familyId}/rewardRedemptions/{id}
  userId, rewardId, status ('requested'|'approved'|'rejected'), timestamp
```

## Klíčové principy (nepromíjet)

1. **XP se nikdy nepřičítá přímo na `xpBalance` z klienta.** Vždy zápis do `xpLedger`, `xpBalance` je odvozená hodnota (Cloud Function trigger nebo agregace při čtení). Bez toho jde XP cheatnout přes DevTools.
2. **`dailyTasks` se negenerují dopředu do nekonečna.** Generuje je denně cron Cloud Function z aktivních `taskTemplates`.
3. **Firestore security rules podle role:**
   - `child` role: může editovat jen vlastní `dailyTasks` (status), nic jiného
   - `parent` role: může editovat `taskTemplates`, schvalovat `rewardRedemptions`
4. **Žádná XP logika v React komponentách** — vše přes `lib/xp-engine.ts` nebo Cloud Functions, aby existoval jeden zdroj pravdy.

## Doporučené pořadí implementace

1. `create-next-app` + Tailwind + Firebase SDK setup
2. Firestore rules + datový model (první commit)
3. Auth flow — rodinný invite code → join family
4. Today view + task checkoff (zatím bez XP)
5. XP ledger + Cloud Function trigger na dokončení úkolu
6. Reward shop + schvalovací flow
7. PWA manifest + service worker + push notifikace (poslední krok, nejvíc iOS specifik)

## Konvence

- Formát čísel v UI: mezera jako oddělovač tisíců (1 000), čárka jako desetinný oddělovač (1,5)
- Commit messages: konvenční commity (`feat:`, `fix:`, `chore:`)
- Žádné secrets v repu — Firebase config klíče přes `.env.local` (client-safe) a Firebase Functions config/secrets pro server-side

# CalTrack

A gamified calorie-tracking PWA for two. Built with Vite + React + Tailwind, Supabase for auth/data, Open Food Facts for food search, and the Claude API for AI photo food recognition.

## Stack

- **Vite + React 18** — app framework
- **Tailwind CSS v4** — styling (configured via `@tailwindcss/vite`, no separate config file; theme tokens live in `src/index.css`)
- **React Router v6** — routing
- **Supabase** — auth + database (`src/lib/supabase.js`)
- **vite-plugin-pwa** — manifest + service worker (installable to iPhone home screen)

## Getting started

```bash
npm install
npm run dev      # start dev server
npm run build    # production build
npm run preview  # preview the production build
```

## Environment

Copy `.env.example` to `.env` and fill in your Supabase credentials (already set locally):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The Supabase anon key is safe for the client. The Claude API key must **never** live in client env — call it from a server-side Vercel function.

## Structure

```
src/
├── main.jsx              # entry + router provider
├── App.jsx               # routes + layout shell
├── index.css            # Tailwind import + theme tokens
├── lib/
│   └── supabase.js      # Supabase client
├── components/
│   ├── BottomNav.jsx    # iPhone-style fixed bottom tab bar
│   └── PageHeader.jsx
└── features/            # one folder per feature
    ├── dashboard/       # /dashboard  — daily snapshot
    ├── log-food/        # /log        — search / barcode / AI photo
    ├── progress/        # /progress   — trends & streaks
    ├── battle/          # /battle     — you vs. partner
    └── profile/         # /profile    — settings & account
```

## Routes

`/` redirects to `/dashboard`. Tabs: Dashboard, Log Food, Progress, Battle, Profile.

## PWA / iPhone

`vite-plugin-pwa` generates the manifest and service worker. Icons live in `public/icons/`
(regenerate with `node scripts/gen-icons.mjs`). The viewport uses `viewport-fit=cover` and
the nav respects `safe-area-inset` so it sits above the iPhone home indicator. Add to home
screen from Safari to run standalone.

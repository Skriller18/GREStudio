# GRE Studio

A single, responsive GRE practice app for essays, vocabulary memory palaces, and a timed mock test. The frontend and API route run together in Next.js on Vercel. Supabase provides email/password accounts and per-user study records.

## Included

- **Essay practice:** 159 issue prompts and study responses from the [GRE-Essay](https://github.com/Skriller18/GRE-Essay) project, with a timed editor and cloud-saved drafts.
- **Memory palaces:** 102 original routes covering 1,020 vocabulary entries from [GREVocab-MemoryPalace](https://github.com/Skriller18/GREVocab-MemoryPalace). Every palace has a ten-stop interactive map, scene, save action, mastery status, and a practice quiz. No third-party vocabulary branding appears in the app.
- **Mock test:** one full 54-question, four-section original practice test with timed sections, resume, server grading, explanations, and saved results. The [GRE-MockTests](https://github.com/Skriller18/GRE-MockTests) repository does not contain its question-bank `data/` directory or source PDFs, so its book questions cannot be deployed from GitHub. The original test here keeps the practice flow usable without publishing that unavailable material.

GRE Studio is independent of ETS and does not provide official GRE scores.

## Run locally

Requires Node.js 20.9 or later.

1. Run `npm install`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. See `.env.example`.
3. Run the SQL in `supabase/migrations/20261028000000_study_records.sql` in the Supabase SQL Editor if using a new Supabase project. It has already been applied to the project supplied for this build.
4. Run `npm run dev` and open `http://localhost:3000`.

## Deploy to Vercel

Import this folder as a Next.js project. Add the same two environment variables to **Production**, **Preview**, and **Development**. The publishable key is safe for browser use; do not add a service role key to the frontend. In Supabase Authentication → URL Configuration, set the production Site URL and add the Vercel preview callback pattern if preview sign-ups are needed. Deploy using Vercel's standard Next.js build command.

The SQL table uses Row Level Security. Signed-in users can only read and write their own study records.

## Content and code layout

- `components/Studio.tsx`: unified student experience.
- `app/globals.css`: shared design tokens, buttons, cards, and responsive layouts.
- `app/api/mock/route.ts`: serves questions without keys, checks a Supabase session, grades, and stores results.
- `lib/mock-bank.ts`: original test questions.
- `data/`: essay and memory palace source content.
- `supabase/migrations/`: database schema and access policies.

## Current verification

`npm run typecheck` and `npm run build` pass with the installed dependencies. The local sign-in page was checked at desktop and phone widths, and an invalid login returned the expected Supabase authentication error.

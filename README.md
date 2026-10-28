# GRE Studio

A responsive GRE practice app for essays, vocabulary memory palaces, and timed mock tests. Next.js runs the frontend and API together on Vercel. Supabase provides accounts, progress, the mock question bank, attempt history, and private solution images.

## Included

- **Essays:** 159 issue prompts and model responses with a timed editor and cloud-saved drafts.
- **Vocabulary:** 102 original, mapped memory palaces covering 1,020 words. Every palace has ten stops, mnemonic scenes, saved words, mastery tracking, and a quiz. No GRE GMAT branding is used.
- **Mock tests:** 50 numbered tests assembled from the rights-cleared local GRE-MockTests bank: 6,228 questions across Verbal and Quantitative formats. Each attempt has four timed sections, 54 questions, adaptive second sections, saved answers and marks, exact raw grading, practice score estimates, and worked solutions after completion. Active timers use server deadlines and continue if the tab closes.

GRE Studio is independent of ETS. Practice score estimates are not official GRE scores.

## Local development

Requires Node.js 20.9 or later.

1. Run `npm install`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and server-only `SUPABASE_SECRET_KEY` in `.env.local`. See `.env.example`.
3. Apply both migrations in `supabase/migrations/` to a new Supabase project.
4. Run `npm run dev` and open `http://localhost:3000`.

The mock bank has no browser access. API routes check the Supabase session, use the server key for private reads and writes, and return keys, explanations, and solution images only for completed attempts. The mock tables have RLS enabled and no grants for public or authenticated browser roles.

## Deploy

The project is linked to [GREStudio](https://github.com/Skriller18/GREStudio) and deployed on [Vercel](https://gre-studio.vercel.app). Set all three Supabase variables in Vercel; the secret key must stay server-only.

The one-time production seed script runs during a Vercel production build when the `seed/` package is present. It loads all questions and plans into Supabase and uploads the referenced diagrams and worked solution images to a private Storage bucket. The seed package and temporary public assets should be removed from the public repository after successful import. Later builds skip the seed automatically.

## Verify

`npm run typecheck` and `npm run build` check the local app. The complete production flow should be checked with a signed-in account after the seed finishes.

# Progress

Live: https://zaireen-e-karbala.tmoosabhoy6.workers.dev (admin at `/daftar`)

## How it is put together
- `worker/` Cloudflare Worker (API). `worker/seed.ts` first content. `migrations/` D1 schema.
- `src/` the phone app and admin (React). `shared/` rules used by both (`ziyarat.ts` is zt's logic).
- `content-source/` your reference slides (the Wi-Fi slide is kept out: the repo is public and it shows the password).
- `DECISIONS.md`, `CONTENT-TODO.md`, `LISAN-REVIEW.md`.

## Milestones
The brief's own milestone list (section 18) did not arrive, so this order is mine until it does.

1. **Public core + admin** - built. Aaj (day list, menu, majlis, announcements, community button, quick tiles), Maloomat pages with every confirmed fact, Madad contacts, both languages, admin (menu, majlis, announcements, pages, offices, facts, Still missing, Lisan review, log).
2. **Sign-in, schedule, room** - next. Tour ID + ITS, schedule from the Karbala Ziyarat Sheet (the same public feed zt reads), room from NKERP, arrival and departure card, Wi-Fi with own details, the "next up" arch.
3. **Madad requests** - request forms, My requests with live status, admin inbox, web push to admin.
4. **Izan card scan, feedback, offline polish** - needs the read-only lookup endpoint on Mawaid-Scanner (on a branch; tell the owner before merging).

## Waiting on the owner
- Sections 10 (rest) to 19 of the brief.
- `ADMIN_PIN` value (admin cannot be opened until it is set).
- NKERP account for the Worker (`NKERP_LOGIN_ID`, `NKERP_PASSWORD`).

## How to resume
- `npm i`, then `npx wrangler d1 migrations apply zaireen-e-karbala --local`, `npm run build`, `npx wrangler dev` (needs `.dev.vars` with `ADMIN_PIN` and `SESSION_KEY`).
- `npm run check` runs typecheck and tests.
- Deploy: push to `main`; Cloudflare builds and deploys it. New migrations must be applied to the live D1 first: `npx wrangler d1 migrations apply zaireen-e-karbala --remote`.
- After changing Lisan text in `worker/seed.ts` or `src/i18n.ts`: `node --experimental-strip-types scripts/lisan-review.mjs`.

# Progress

Live: https://zaireen-e-karbala.tmoosabhoy6.workers.dev (admin at `/daftar`)

## How it is put together
- `worker/` Cloudflare Worker (API). `worker/seed.ts` first content. `migrations/` D1 schema.
- `src/` the phone app and admin (React). `shared/` rules used by both (`ziyarat.ts` is zt's logic).
- `content-source/` your reference slides (the Wi-Fi slide is kept out: the repo is public and it shows the password).
- `DECISIONS.md`, `CONTENT-TODO.md`, `LISAN-REVIEW.md`.

## Milestones
The brief's own milestone list (section 18) did not arrive, so this order is mine until it does.

1. **Public core + admin** - done and live. Aaj (day list, menu, majlis, announcements, community button, quick tiles), Maloomat pages with every confirmed fact, Madad contacts, both languages, admin (menu, majlis, announcements, pages, offices, facts, Still missing, Lisan review, log).
2. **Sign-in, schedule, room** - built and live. Tour ID + ITS; schedule from the Karbala Ziyarat Sheet (the same read-only feed zt reads); room, floor and building from NKERP; stay dates; Wi-Fi steps with the zair's own ITS and tour ID, copy buttons and a Wi-Fi QR; the "next up" arch (room on arrival, next ziyarat, departure).
   - `ADMIN_PIN`, `NKERP_LOGIN_ID` and `NKERP_PASSWORD` are set on the Worker. Admin opens on the live site; a verified sign-in there returns the room and Wi-Fi details.
   - Redesigned as a liquid-glass dashboard (see DECISIONS.md).
3. **Madad requests** - next. Request forms, My requests with live status, admin inbox, web push to admin, the Change requests tab in the Sheet.
4. **Izan card scan, feedback, offline polish** - needs the read-only lookup endpoint on Mawaid-Scanner (on a branch; tell the owner before merging).

## What is stubbed or not verified
- Madad shows contacts only; there are no request forms yet.
- "Request a wheelchair for this ziyarat" goes to Madad, which has no form yet.
- Izan card scanning, feedback cards, admin web push: not built.
- A zair whose ITS NKERP does not list for the tour (for example staying outside Faiz) signs in at tour level: schedule and dates, a "not staying in Faiz accommodation" line, no Wi-Fi. NKERP has no validated roster read to confirm such an ITS.
- Arrival and departure show dates only. NKERP also gives times and entry/exit ports; they are not shown until their meaning is confirmed.

## Waiting on the owner
- Sections 10 (rest) to 19 of the brief.
- Whether rooms should be read from the Krb Accommodation Sheet (owner is checking the Sheet), and how the app may read it.
- Answers in `CONTENT-TODO.md`.

## How to resume
- `npm i`, then `npx wrangler d1 migrations apply zaireen-e-karbala --local`, `npm run build`, `npx wrangler dev` (needs `.dev.vars` with `ADMIN_PIN` and `SESSION_KEY`).
- `npm run check` runs typecheck and tests.
- Deploy: push to `main`; Cloudflare builds and deploys it. New migrations must be applied to the live D1 first: `npx wrangler d1 migrations apply zaireen-e-karbala --remote`.
- After changing Lisan text in `worker/seed.ts` or `src/i18n.ts`: `node --experimental-strip-types scripts/lisan-review.mjs`.

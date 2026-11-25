# Decisions

Small decisions made while building, newest last. Anything hard to undo was asked first.

## Platform
- **Cloudflare Worker + D1 + static assets**, the same family as Mawaid-Scanner. Worker name `zaireen-e-karbala`, D1 database `zaireen-e-karbala`. Deployed with `wrangler`.
- **Uploads (pictures, the majlis booklet PDF) are stored in D1 in chunks.** R2 is not enabled on the account and enabling it is a billing decision. Limit 40 MB per file. Photos are shrunk in the browser before upload.
- **React + Vite + TypeScript, plain CSS.** Same stack as zt, so its logic could be carried over as-is.
- **Admin lives at `/daftar`**, not linked from anywhere.

## Content model
- Everything a zair reads is a row in one `content` table (`page`, `block`, `office`, `fact`, `faq`, `request_type`). A page is a list of blocks, so a new page or section needs no code change.
- `worker/seed.ts` holds the first content. It is inserted once and **never overwrites** a row, so admin edits always win.
- A missing fact is a row with `missing = 1`. Zaereen see "Details coming soon"; its value is never sent to the phone.
- Lisan ud-Dawat text is sent to phones only when approved. Until then a Lisan reader sees the English line (set left-to-right).
- **The Wi-Fi slide is not in the repo and the Wi-Fi password is not in code**, because this repo is public. The password lives only in the database (admin, Timings and facts, Wi-Fi).

## Presentation
- **Default language is English**, because all Lisan content starts unapproved. The toggle is always in the header and the choice is remembered.
- **Clock times stay in Latin digits in both languages**, as the Mannat Niyaz slide does.
- **English words stay in Latin letters inside Lisan lines** (Room, Reception, Wi-Fi), as the Izan cards slide does.
- Namaz, Mawaid and tonight's majlis are one list in the order the day runs, with the current or next one marked.
- "Open now / Closed now" on an office is worked out from its hours text. It is shown only when every line is two clock times.
- Assembly point names and map links are editable facts (`fact.place.*`); the rule for which place and time applies is code carried over from zt (`shared/ziyarat.ts`).
- Pehli Ziyarat on days other than Thursday and Friday shows "Imam Husain AS Haram Mubarak, gate number 6" (zt gives gate 6; the brief gives only the Haram).

## Privacy and safety
- Session cookies hold a random token; the database holds only its hash. Attempt counters are keyed hashes, never an IP or ITS.
- Worker logs carry no request bodies and no URLs with personal data; sign-in data travels in POST bodies only.
- Admin PIN: 5 wrong tries locks that IP for 15 minutes; the session lasts 30 days; every change is logged with its time.

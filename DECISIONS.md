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

## Sign-in, schedule and rooms
- **The schedule comes from the Sheet through zt's public Apps Script feed** (`?snapshot=1`), read-only. The Worker keeps the latest snapshot in D1 (without group or leader names) and refreshes it when older than five minutes.
- **Four digits only (5253)**: the tour of that number whose Karbala days cover today wins, otherwise the nearest one.
- **NKERP is read through a strict allowlist** (`worker/nkerp.ts`): login, role select, the "who is where" room search, the unallocated list and the four Karbala visit lists. Anything else throws before a request is made. A test checks that every known write path is refused.
- **An ITS is "verified" when NKERP lists it on that tour** in the room search or the unallocated list (Karbala). Only then is the room shown.
- **Wi-Fi details open to anyone signed in with a valid tour ID** (owner's decision), so zaereen not staying in Faiz get them too. The steps show the ITS they typed.
- **Not listed or NKERP unreachable: tour-level sign-in** (schedule, stay dates and Wi-Fi). A tour ID can be guessed, so nothing personal is shown.
- **Room states**: assigned (building, room, floor, how to get in), not assigned yet, or cannot be shown right now. "How to get in" is chosen by building name (`fact.stay.enter.*`, admin-editable).
- **Remembered until the day after departure** (cookie + the phone's storage). "Not you? Sign out" clears the session and everything saved on the phone.
- **Rate limit**: 10 sign-in tries per 15 minutes per IP and per device.
- **Wi-Fi second field** is the tour number followed by 000 (26/5253 gives 5253000). Confirmed by the owner.
- **The arch**: room up to and on arrival day; departure on the day before and the day of departure; otherwise the next ziyarat, which stays "next" until two hours after it gathers.
- The `/api/content` feed is never cached by the browser, so signed-in content appears straight after sign-in.

## Deploying
- Direct `wrangler deploy` from a Claude cloud session cannot upload the site files (the session's proxy replaces the upload token). So the repo is connected to **Cloudflare Workers Builds**: every push to `main` builds and deploys, as Mawaid-Scanner does. It reuses the existing "mawaid-scanner build token".

## Redesign: liquid glass dashboard (owner's request)
- Colours are unchanged. The page is warm paper with slow rose and gold light behind it; everything sits on panes of frosted glass.
- **Aaj is a dashboard meant to fit one phone screen**: the arch, then tiles for now/next, the room (or sign-in), tonight's majlis, the menu, the four most-asked pages, the latest announcement and the WhatsApp community. Each tile opens a sheet with the full detail (the whole day, the full menu and its card, all announcements, the stay).
- **Maloomat is a searchable grid of tiles** grouped by what a zair wants to do, instead of a long list.
- **Finished ziyarat days shrink to one line**, so the next ziyarat leads the schedule.
- The bottom bar is a floating glass dock; its lens glides to the chosen tab. Screens cross-fade with the browser's view transitions.
- **Real backdrop blur is used only where content scrolls underneath** (top bar, dock, sheets, lightbox close). Tiles are lit glass without live blur, so mid-range phones stay smooth.
- Every animation is switched off for people who ask their phone to reduce motion.
- The language choice is a two-part switch in the top bar; "Not you? Sign out" stays one tap away under it.
- Admin keeps its plain style (`src/admin.css`).

## Visual techniques taken from open design repositories (owner's request)
Ideas only: every effect is written for this app in plain CSS and a few lines of TypeScript. No code was copied and no animation library was added, so the app stays light on weak connections.
- **Rim light and reactive highlight** (after the liquid-glass projects, e.g. rdev/liquid-glass-react and the LogRocket write-up on refraction and rim specular): every pane has a bright edge that turns as the phone tilts, and the sheen on a tile sits where the finger is. True refraction (SVG displacement) is left out: those projects say it does not show in Safari or Firefox.
- **Border beam** (after Magic UI and Jakub Antalik's border-beam): a thread of gold light travels the arch's inner line; a beam circles the next ziyarat and the sign-in tile.
- **Spotlight card** (after React Bits): the highlight follows the touch.
- **Native-feeling sheets** (after Vaul and Emil Kowalski's notes): drag down by the grip or header to dismiss, resistance when pulled up, the iOS sheet curve, and the screen behind steps back while a sheet is open.
- **Bento stagger and spring motion** (after the glass dashboard templates built with Framer Motion): tiles rise in one after another; spring curves are done with CSS `linear()`.
- Also: a live countdown to the next namaz or meal, the tapped tile's icon morphing into the page title, a moving sheen on the dock's lens, fine grain over the background, and scroll-linked depth on the top bar and arch.
- Tilt uses the phone's orientation only where the browser gives it without a permission prompt (Android). iPhones would need to ask the zair, so it is skipped there.

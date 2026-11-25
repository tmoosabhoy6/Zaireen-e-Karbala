# Writes UX-CHANGELOG.md. Each line's code ([I12], [F3]) is marked in the source where it is implemented;
# scripts/ux-ledger-check.mjs fails if any code is missing from the source.
I = """Today's line fills with colour as the day goes on
The marker of the current or next event is ringed in gold
Every event of the day has its own icon (sunrise, sun, moon, cup, cutlery, book)
The event happening now is lifted onto its own glass card
A bar shows how far through the current namaz or meal window it is
A countdown shows how long the current window still runs
A countdown shows how long until the next event
Finished events get a check mark that draws itself
The day's events rise in one after another on first view (animated list, as in Magic UI)
Times are set in aligned (tabular) numerals
The date line carries a calendar icon and the Hijri date from the menu
Tonight's majlis is a gold row with its booklet button
The room number counts up when it appears (number ticker, as in Magic UI)
How to get in shows a key for Qasr and an open door for walk-in buildings
The stay is drawn as a bar from arrival to departure with today marked
A labelled button leads to "If your room is not ready"
Room not assigned, not available and not-in-Faiz each have their own icon and tint
The meal being served now is highlighted and marked "Now"
Menu items appear one after another
Lunch and dinner headings carry sun and moon icons
The menu card button shows a thumbnail of the card
Each meal shows its serving time under its name
Announcements not seen before carry a "New" badge
A red dot on the Aaj button shows there is a new announcement
The newest announcement is set larger than the older ones
Older announcements open in place with a labelled button whose chevron turns
Announcement pictures have a labelled "Open full screen" button
Announcement times say Today or Yesterday
The arch title comes into focus from a blur (blur-in text, as in Magic UI)
Small gold diamonds flank the arch's top line
The day of the next ziyarat (Today, Tomorrow) sits in its own chip
The arch's map button carries a pin and an "opens outside" mark
The arch's contents cross-fade when the next thing changes
A soft gold glow breathes under the arch's point
Most-asked icons bounce in one after another
Most-asked tiles carry a chevron and sit under a heading
A ripple spreads from the finger on buttons and tiles (ripple, as in Material and Magic UI)
A- / A+ buttons in the top bar make all text and controls smaller or larger, remembered
Short messages (toasts) appear above the dock and are read out by screen readers (as in Sonner)
A toast confirms what was copied
A toast confirms signing out
A toast says when the connection is back
A toast says when the connection drops
"Updated 10:42" with a labelled Refresh button
A labelled "Top" button appears on long pages
An "Add this app to your home screen" card where the phone allows it
A "Skip to content" link for keyboard and screen-reader users
The calligraphy in the top bar eases smaller as the page scrolls (scroll-linked)
A gold reading-progress line on info pages (scroll progress, as in Magic UI)
The chosen dock icon draws its own outline
Content dissolves softly under the dock instead of being cut by it
The language switch's thumb has a glass sheen
The light behind the glass follows Karbala's time of day (dawn, day, dusk, night)
A short haptic tick on switches, chips and buttons (Android)
A higher-contrast look when the phone asks for more contrast
Focus rings follow each control's shape with a gold and white double ring
Selected text is tinted in the app's gold
Thin themed scrollbars
Smooth scrolling to places on the page
Long pages skip drawing cards that are off screen, so scrolling stays smooth
Sign-in shows its two steps and ticks each as it is completed (stepper, as in Material)
A check appears as soon as the tour ID looks right
A check appears at eight ITS digits, with a "5/8" counter before that
Enter on the tour ID moves to the ITS field
The sign-in button turns into a check before moving on
Pasted or Arabic-keyboard digits are cleaned as they are typed
Example tour IDs are shown as chips beside the help line
Sign-in fields carry icons (ticket, ID card)
A sign-in error carries a warning mark and moves focus to the field at fault
A small arch above the sign-in card ties it to the home arch
A strip of date chips jumps to each day of the schedule
The next ziyarat shows a countdown ("1d 4h")
A rail runs behind the day cards, joining them as a timeline
"Done" carries a check mark that draws itself
Bus departures show a bus icon, assembly points a pin
Each upcoming day has its own map button with an "opens outside" mark
"What to bring" opens with a smooth height change and a turning chevron (accordion, as in Radix)
The arch shows a bus for a bus departure
The wheelchair shortcut carries its icon
A ziyarat that is today but not next is marked "Today"
An empty schedule shows a calendar icon and a sentence
Signed out, Ziyarat shows a lock, the reason, and one Sign in button
The lost-person card carries an alert icon in a disc
Contacts have round icons for phone and WhatsApp
Call and WhatsApp buttons are colour-coded
Contacts with no number yet are dimmed so working ones stand out
Phone numbers stay on one line in aligned digits
Madad's contact list sits under a heading with an icon
Search has a clear (x) button
Search says how many results it found
The letters that matched are highlighted in results
"Opened recently" chips on Maloomat
Section headings stay pinned under the top bar while scrolling
Each Maloomat section has its own icon tint
"Nothing matches" shows an icon and a sentence
The search icon pops and the field glows when focused
The keyboard shows a Search key and closes on submit
Info pages show which section they belong to above the title
A Share button on every info page
Previous and Next links at the foot of each info page
Numbered steps are joined by a line
The warning box has an alert badge
Lines that must not be missed carry a warning mark as well as red
Pictures fade in from a soft blur when loaded
The full-screen picture view has a labelled Close button
Offices open now have a green edge
Offices show "Opens in 1h 20m" or "Closes in 35m"
An "All / Open now" switch on the offices page, with counts
The hours range that is running now is marked in green
Facts carry an icon for phone, WhatsApp or link
Phone numbers have a Copy button
FAQ answers open with a turning chevron
"Details coming soon" is a dashed chip with a clock, clearly not content
Wi-Fi steps are joined by a line between their numbers
A Wi-Fi value's tile flashes gold when copied
The Wi-Fi QR sits in a frame with corner brackets
The Copy button draws a check when it has copied
The Wi-Fi page says it is saved on the phone and works offline
Every info page ends with "Need help with this? Ask in Madad"
Going back slides the other way from going forward
Cards below the fold settle in as they are reached (blur fade, as in Magic UI)
A reusable number-ticker component
A reusable self-drawing check mark
The app name in the arch has a slow travelling shine (shiny text, as in Magic UI)
Most-asked tiles lean toward the finger (tilt card, as in React Bits)
The glass rim's light shifts as the page scrolls
The light behind the page drifts with scrolling (parallax)
The star lattice behind the page drifts very slowly
Buttons sink with an inner shadow when pressed
The main button has a slow sheen (shimmer button, as in Magic UI)
The WhatsApp icon gives one small wiggle when it appears
Pills pop in with a spring
Chevrons nudge forward when their row is pressed
A thin loading line at the top while new content is fetched (as in NProgress)
The Refresh icon spins while content loads
Toasts carry a shrinking time bar
The install card arrives with a spring
Empty and error states share one calm layout: icon in a soft disc, a sentence, one action
The screen cross-fades when the language is switched
The offline notice slides in with an icon
Icon-only controls all carry spoken labels
Every screen has one heading for screen readers
Numbers in times, counts and codes use lining, aligned figures
Headings wrap in balanced lines, paragraphs avoid lonely last words
Long paragraphs keep to a readable line length
Long words and links wrap instead of overflowing
Solid panes when the phone asks for reduced transparency
Borders that survive Windows high-contrast mode
Two columns on tablets and wide screens
Side safe-areas respected in landscape on notched phones
No double-tap zoom or tap delay on controls
Jumping to a day leaves it clear of the top bar
Home-screen shortcuts to Ziyarat, Wi-Fi and Madad""".split("\n")
F = """The whole day was hidden behind an unmarked tap; it is now shown in full on Aaj
Dinner was hidden behind a Lunch/Dinner switch; both meals are now listed
The menu was cut to two items with "+1 more"; every item is listed
Announcements were clipped to three lines behind a tap; they are shown in full
Room details were hidden behind a tap; they are shown in full
Cards that looked plain but opened things are gone; everything tappable has a chevron or is a button
Text cut off with an ellipsis ("Then: Nashta (break...") now wraps
Two sign-in prompts sat side by side when signed out; there is one
The last row sat under the dock; pages now end with clear space
Drag-only sheets (a hidden gesture) are removed
Finished ziyarat days hid their time and place; both are always shown
"What to bring" opened from an unmarked tap on the card; it has a labelled button
Pictures could only be enlarged by tapping them; there is a labelled button
The search text was lost on returning from a page; it is kept
Returning from a page jumped to the top; it returns to where you were
Every screen had the same browser title; each names itself
The status bar was maroon over a light top bar; it matches
"Not you? Sign out" was 32px tall; it is 44px
Language buttons were 34px tall; they are 44px
Small buttons were 40px tall; they are 44px
The Back button was 40px tall; it is 44px
The Wi-Fi Copy button dropped under a long password; value and button share one row
The entrance animation replayed on every return to Aaj, delaying content; it plays once
Entrance animations ran too long; they are shorter
Section headings were small and quiet; they are larger
"Closed now" was low-contrast; it is darker
Past events in the day list were too faint; they are readable
Hours sat on the opposite side from other text in Lisan mode; they align
Dock labels were 12.5px; they are 13.5px
Most-asked labels were 12.5px; they are 15.5px
Countdown chips were 12.5px; they are 13.5px
Date and caption lines were 13.5-14.5px; they are 15px
Announcement times were 13.5px; they are 14.5px
Status pills were 12.5px; they are 13.5px
The arch's top line was 14.5px; it is 15.5px
Signing in showed only the word "Checking"; it now shows a spinner
The ITS was typed blind; a Show/Hide button lets it be checked
Sign-in errors were English only; they follow the chosen language
Copying only changed the button's label; a message now says what was copied
The offline notice gave no time; it says when the page was last updated
There was no way to refresh by hand; there is a Refresh button
Empty states were bare grey text; they have an icon and a clear sentence
The loading placeholder did not match the page; it does
Tonight's majlis was shown twice (day list and its own block); it appears once
Meal names differed between the day list and the menu; they are the same
Most-asked tiles had no heading; they have one
The sign-in tile's cryptic "Tour ID + ITS number" line is gone with the tile
Map buttons left the app without warning; they carry an "opens outside" mark
The lost-person card looked like a static banner; it reads as a button
Maloomat tiles had no chevron; they have one
Fact rows were tight; they have more room
Most-asked labels were clipped after two lines; the full label always shows
English shown to Lisan readers was not marked as English for screen readers; it is""".split("\n")
assert len(I) == 153 and len(F) == 53, (len(I), len(F))
# Effects taken out again in the next pass, when the owner found the app laggy and some effects gimmicky.
REMOVED = {9, 19, 29, 34, 35, 48, 50, 51, 52, 53, 60, 93, 96, 120, 121, 124, 125, 126, 127, 128, 130, 131, 132}
NEW = """The arch is a dial of the day: its gold line runs from 4 am at the left foot, over the point at midday, to 10 pm at the right foot; it is lit up to the present
The sun sits on the arch at the current time, and becomes a crescent at night
Every namaz, meal and majlis of the day is a mark on the arch, filled once it has passed
The arch shows the time in Karbala, for zaereen whose phones are on another time zone
The dock carries a live line on every screen: what is happening now or what comes next, with a countdown; it leads to today's list
The room is a key card: a number plate, a gold eyelet, a tear line and a stub with the stay dates
"For you today": three pages chosen by where the zair is in their stay (arriving, staying, leaving)
Maloomat puts the section for today's stage of the stay first and marks it
The ziyarat schedule reads as a route: a dashed line with date stations, filled once passed, the next one ringed in gold
Nothing loops any more: motion only answers a touch or marks a screen arriving
Live blur is used on the dock alone; the top bar, cards and toasts are still glass by colour only
No whole-page snapshots when opening a page; no scroll-linked effects; no tilt or finger-tracking light
Cards no longer fade in on scroll, so nothing looks washed out between sections
The stylesheet was rebuilt from scratch at about half its size""".split("\n")
kept = len(I) - len(REMOVED)
out = ["# UX changelog", "",
  "Each line has a code; the same code is written in the source at the place that implements it, and",
  "`node scripts/ux-ledger-check.mjs` fails if a code that should be there is missing. So the counts are checkable.", "",
  "Patterns named \"as in ...\" are ones found in public component libraries (Magic UI, React Bits, Vaul, Sonner,",
  "Radix, Material, NProgress). Each is written fresh for this app; no code was copied and no library was added.",
  "Lines without a name are ordinary good practice, not a library pattern.", "",
  "Two rules from the owner govern everything here: **nothing is hidden**, and **nothing loops or lags**.", "",
  f"## Final pass: faster, calmer, and reinvented ({len(NEW)})", ""]
out += [f"{n}. {t}." for n, t in enumerate(NEW, 1)]
out += ["", f"## Counted pass: improvements ({len(I)} made, {len(REMOVED)} later removed, {kept} in the app)", "",
  "Struck-through lines were removed in the final pass because they looped, shimmered or cost speed.", ""]
out += [(f"{n}. ~~{t}~~ (removed)" if n in REMOVED else f"{n}. `[I{n}]` {t}.") for n, t in enumerate(I, 1)]
out += ["", f"## Counted pass: faults removed ({len(F)})", ""]
out += [f"{n}. `[F{n}]` {t}." for n, t in enumerate(F, 1)]
open("UX-CHANGELOG.md", "w").write("\n".join(out) + "\n")
print("UX-CHANGELOG.md:", kept, "improvements in the app,", len(REMOVED), "removed,", len(F), "faults,", len(NEW), "new")

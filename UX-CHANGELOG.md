# UX changelog

Each line has a code; the same code is written in the source at the place that implements it, and
`node scripts/ux-ledger-check.mjs` fails if a code that should be there is missing. So the counts are checkable.

Patterns named "as in ..." are ones found in public component libraries (Magic UI, React Bits, Vaul, Sonner,
Radix, Material, NProgress). Each is written fresh for this app; no code was copied and no library was added.
Lines without a name are ordinary good practice, not a library pattern.

Two rules from the owner govern everything here: **nothing is hidden**, and **nothing loops or lags**.

## Final pass: faster, calmer, and reinvented (10)

1. The dock carries a live line on every screen: what is happening now or what comes next, with a countdown; it leads to today's list.
2. The room is a key card: a number plate, a gold eyelet, a tear line and a stub with the stay dates.
3. "For you today": three pages chosen by where the zair is in their stay (arriving, staying, leaving).
4. Maloomat puts the section for today's stage of the stay first and marks it.
5. The ziyarat schedule reads as a route: a dashed line with date stations, filled once passed, the next one ringed in gold.
6. Nothing loops any more: motion only answers a touch or marks a screen arriving.
7. Live blur is used on the dock alone; the top bar, cards and toasts are still glass by colour only.
8. No whole-page snapshots when opening a page; no scroll-linked effects; no tilt or finger-tracking light.
9. Cards no longer fade in on scroll, so nothing looks washed out between sections.
10. The stylesheet was rebuilt from scratch at about half its size.

## Counted pass: improvements (153 made, 24 later removed, 129 in the app)

Struck-through lines were removed later: most because they looped, shimmered or cost speed; the A- / A+
text-size buttons at the owner's request.

1. `[I1]` Today's line fills with colour as the day goes on.
2. `[I2]` The marker of the current or next event is ringed in gold.
3. `[I3]` Every event of the day has its own icon (sunrise, sun, moon, cup, cutlery, book).
4. `[I4]` The event happening now is lifted onto its own glass card.
5. `[I5]` A bar shows how far through the current namaz or meal window it is.
6. `[I6]` A countdown shows how long the current window still runs.
7. `[I7]` A countdown shows how long until the next event.
8. `[I8]` Finished events get a check mark that draws itself.
9. ~~The day's events rise in one after another on first view (animated list, as in Magic UI)~~ (removed)
10. `[I10]` Times are set in aligned (tabular) numerals.
11. `[I11]` The date line carries a calendar icon and the Hijri date from the menu.
12. `[I12]` Tonight's majlis is a gold row with its booklet button.
13. `[I13]` The room number counts up when it appears (number ticker, as in Magic UI).
14. `[I14]` How to get in shows a key for Qasr and an open door for walk-in buildings.
15. `[I15]` The stay is drawn as a bar from arrival to departure with today marked.
16. `[I16]` A labelled button leads to "If your room is not ready".
17. `[I17]` Room not assigned, not available and not-in-Faiz each have their own icon and tint.
18. `[I18]` The meal being served now is highlighted and marked "Now".
19. ~~Menu items appear one after another~~ (removed)
20. `[I20]` Lunch and dinner headings carry sun and moon icons.
21. `[I21]` The menu card button shows a thumbnail of the card.
22. `[I22]` Each meal shows its serving time under its name.
23. `[I23]` Announcements not seen before carry a "New" badge.
24. `[I24]` A red dot on the Aaj button shows there is a new announcement.
25. `[I25]` The newest announcement is set larger than the older ones.
26. `[I26]` Older announcements open in place with a labelled button whose chevron turns.
27. `[I27]` Announcement pictures have a labelled "Open full screen" button.
28. `[I28]` Announcement times say Today or Yesterday.
29. ~~The arch title comes into focus from a blur (blur-in text, as in Magic UI)~~ (removed)
30. `[I30]` Small gold diamonds flank the arch's top line.
31. `[I31]` The day of the next ziyarat (Today, Tomorrow) sits in its own chip.
32. `[I32]` The arch's map button carries a pin and an "opens outside" mark.
33. `[I33]` The arch's contents cross-fade when the next thing changes.
34. ~~A soft gold glow breathes under the arch's point~~ (removed)
35. ~~Most-asked icons bounce in one after another~~ (removed)
36. `[I36]` Most-asked tiles carry a chevron and sit under a heading.
37. `[I37]` A ripple spreads from the finger on buttons and tiles (ripple, as in Material and Magic UI).
38. ~~A- / A+ buttons in the top bar make all text and controls smaller or larger, remembered~~ (removed)
39. `[I39]` Short messages (toasts) appear above the dock and are read out by screen readers (as in Sonner).
40. `[I40]` A toast confirms what was copied.
41. `[I41]` A toast confirms signing out.
42. `[I42]` A toast says when the connection is back.
43. `[I43]` A toast says when the connection drops.
44. `[I44]` "Updated 10:42" with a labelled Refresh button.
45. `[I45]` A labelled "Top" button appears on long pages.
46. `[I46]` An "Add this app to your home screen" card where the phone allows it.
47. `[I47]` A "Skip to content" link for keyboard and screen-reader users.
48. ~~The calligraphy in the top bar eases smaller as the page scrolls (scroll-linked)~~ (removed)
49. `[I49]` A gold reading-progress line on info pages (scroll progress, as in Magic UI).
50. ~~The chosen dock icon draws its own outline~~ (removed)
51. ~~Content dissolves softly under the dock instead of being cut by it~~ (removed)
52. ~~The language switch's thumb has a glass sheen~~ (removed)
53. ~~The light behind the glass follows Karbala's time of day (dawn, day, dusk, night)~~ (removed)
54. `[I54]` A short haptic tick on switches, chips and buttons (Android).
55. `[I55]` A higher-contrast look when the phone asks for more contrast.
56. `[I56]` Focus rings follow each control's shape with a gold and white double ring.
57. `[I57]` Selected text is tinted in the app's gold.
58. `[I58]` Thin themed scrollbars.
59. `[I59]` Smooth scrolling to places on the page.
60. ~~Long pages skip drawing cards that are off screen, so scrolling stays smooth~~ (removed)
61. `[I61]` Sign-in shows its two steps and ticks each as it is completed (stepper, as in Material).
62. `[I62]` A check appears as soon as the tour ID looks right.
63. `[I63]` A check appears at eight ITS digits, with a "5/8" counter before that.
64. `[I64]` Enter on the tour ID moves to the ITS field.
65. `[I65]` The sign-in button turns into a check before moving on.
66. `[I66]` Pasted or Arabic-keyboard digits are cleaned as they are typed.
67. `[I67]` Example tour IDs are shown as chips beside the help line.
68. `[I68]` Sign-in fields carry icons (ticket, ID card).
69. `[I69]` A sign-in error carries a warning mark and moves focus to the field at fault.
70. `[I70]` A small arch above the sign-in card ties it to the home arch.
71. `[I71]` A strip of date chips jumps to each day of the schedule.
72. `[I72]` The next ziyarat shows a countdown ("1d 4h").
73. `[I73]` A rail runs behind the day cards, joining them as a timeline.
74. `[I74]` "Done" carries a check mark that draws itself.
75. `[I75]` Bus departures show a bus icon, assembly points a pin.
76. `[I76]` Each upcoming day has its own map button with an "opens outside" mark.
77. `[I77]` "What to bring" opens with a smooth height change and a turning chevron (accordion, as in Radix).
78. `[I78]` The arch shows a bus for a bus departure.
79. `[I79]` The wheelchair shortcut carries its icon.
80. `[I80]` A ziyarat that is today but not next is marked "Today".
81. `[I81]` An empty schedule shows a calendar icon and a sentence.
82. `[I82]` Signed out, Ziyarat shows a lock, the reason, and one Sign in button.
83. `[I83]` The lost-person card carries an alert icon in a disc.
84. `[I84]` Contacts have round icons for phone and WhatsApp.
85. `[I85]` Call and WhatsApp buttons are colour-coded.
86. `[I86]` Contacts with no number yet are dimmed so working ones stand out.
87. `[I87]` Phone numbers stay on one line in aligned digits.
88. `[I88]` Madad's contact list sits under a heading with an icon.
89. `[I89]` Search has a clear (x) button.
90. `[I90]` Search says how many results it found.
91. `[I91]` The letters that matched are highlighted in results.
92. `[I92]` "Opened recently" chips on Maloomat.
93. ~~Section headings stay pinned under the top bar while scrolling~~ (removed)
94. `[I94]` Each Maloomat section has its own icon tint.
95. `[I95]` "Nothing matches" shows an icon and a sentence.
96. ~~The search icon pops and the field glows when focused~~ (removed)
97. `[I97]` The keyboard shows a Search key and closes on submit.
98. `[I98]` Info pages show which section they belong to above the title.
99. `[I99]` A Share button on every info page.
100. `[I100]` Previous and Next links at the foot of each info page.
101. `[I101]` Numbered steps are joined by a line.
102. `[I102]` The warning box has an alert badge.
103. `[I103]` Lines that must not be missed carry a warning mark as well as red.
104. `[I104]` Pictures fade in from a soft blur when loaded.
105. `[I105]` The full-screen picture view has a labelled Close button.
106. `[I106]` Offices open now have a green edge.
107. `[I107]` Offices show "Opens in 1h 20m" or "Closes in 35m".
108. `[I108]` An "All / Open now" switch on the offices page, with counts.
109. `[I109]` The hours range that is running now is marked in green.
110. `[I110]` Facts carry an icon for phone, WhatsApp or link.
111. `[I111]` Phone numbers have a Copy button.
112. `[I112]` FAQ answers open with a turning chevron.
113. `[I113]` "Details coming soon" is a dashed chip with a clock, clearly not content.
114. `[I114]` Wi-Fi steps are joined by a line between their numbers.
115. `[I115]` A Wi-Fi value's tile flashes gold when copied.
116. `[I116]` The Wi-Fi QR sits in a frame with corner brackets.
117. `[I117]` The Copy button draws a check when it has copied.
118. `[I118]` The Wi-Fi page says it is saved on the phone and works offline.
119. `[I119]` Every info page ends with "Need help with this? Ask in Madad".
120. ~~Going back slides the other way from going forward~~ (removed)
121. ~~Cards below the fold settle in as they are reached (blur fade, as in Magic UI)~~ (removed)
122. `[I122]` A reusable number-ticker component.
123. `[I123]` A reusable self-drawing check mark.
124. ~~The app name in the arch has a slow travelling shine (shiny text, as in Magic UI)~~ (removed)
125. ~~Most-asked tiles lean toward the finger (tilt card, as in React Bits)~~ (removed)
126. ~~The glass rim's light shifts as the page scrolls~~ (removed)
127. ~~The light behind the page drifts with scrolling (parallax)~~ (removed)
128. ~~The star lattice behind the page drifts very slowly~~ (removed)
129. `[I129]` Buttons sink with an inner shadow when pressed.
130. ~~The main button has a slow sheen (shimmer button, as in Magic UI)~~ (removed)
131. ~~The WhatsApp icon gives one small wiggle when it appears~~ (removed)
132. ~~Pills pop in with a spring~~ (removed)
133. `[I133]` Chevrons nudge forward when their row is pressed.
134. `[I134]` A thin loading line at the top while new content is fetched (as in NProgress).
135. `[I135]` The Refresh icon spins while content loads.
136. `[I136]` Toasts carry a shrinking time bar.
137. `[I137]` The install card arrives with a spring.
138. `[I138]` Empty and error states share one calm layout: icon in a soft disc, a sentence, one action.
139. `[I139]` The screen cross-fades when the language is switched.
140. `[I140]` The offline notice slides in with an icon.
141. `[I141]` Icon-only controls all carry spoken labels.
142. `[I142]` Every screen has one heading for screen readers.
143. `[I143]` Numbers in times, counts and codes use lining, aligned figures.
144. `[I144]` Headings wrap in balanced lines, paragraphs avoid lonely last words.
145. `[I145]` Long paragraphs keep to a readable line length.
146. `[I146]` Long words and links wrap instead of overflowing.
147. `[I147]` Solid panes when the phone asks for reduced transparency.
148. `[I148]` Borders that survive Windows high-contrast mode.
149. `[I149]` Two columns on tablets and wide screens.
150. `[I150]` Side safe-areas respected in landscape on notched phones.
151. `[I151]` No double-tap zoom or tap delay on controls.
152. `[I152]` Jumping to a day leaves it clear of the top bar.
153. `[I153]` Home-screen shortcuts to Ziyarat, Wi-Fi and Madad.

## Counted pass: faults removed (53)

1. `[F1]` The whole day was hidden behind an unmarked tap; it is now shown in full on Aaj.
2. `[F2]` Dinner was hidden behind a Lunch/Dinner switch; both meals are now listed.
3. `[F3]` The menu was cut to two items with "+1 more"; every item is listed.
4. `[F4]` Announcements were clipped to three lines behind a tap; they are shown in full.
5. `[F5]` Room details were hidden behind a tap; they are shown in full.
6. `[F6]` Cards that looked plain but opened things are gone; everything tappable has a chevron or is a button.
7. `[F7]` Text cut off with an ellipsis ("Then: Nashta (break...") now wraps.
8. `[F8]` Two sign-in prompts sat side by side when signed out; there is one.
9. `[F9]` The last row sat under the dock; pages now end with clear space.
10. `[F10]` Drag-only sheets (a hidden gesture) are removed.
11. `[F11]` Finished ziyarat days hid their time and place; both are always shown.
12. `[F12]` "What to bring" opened from an unmarked tap on the card; it has a labelled button.
13. `[F13]` Pictures could only be enlarged by tapping them; there is a labelled button.
14. `[F14]` The search text was lost on returning from a page; it is kept.
15. `[F15]` Returning from a page jumped to the top; it returns to where you were.
16. `[F16]` Every screen had the same browser title; each names itself.
17. `[F17]` The status bar was maroon over a light top bar; it matches.
18. `[F18]` "Not you? Sign out" was 32px tall; it is 44px.
19. `[F19]` Language buttons were 34px tall; they are 44px.
20. `[F20]` Small buttons were 40px tall; they are 44px.
21. `[F21]` The Back button was 40px tall; it is 44px.
22. `[F22]` The Wi-Fi Copy button dropped under a long password; value and button share one row.
23. `[F23]` The entrance animation replayed on every return to Aaj, delaying content; it plays once.
24. `[F24]` Entrance animations ran too long; they are shorter.
25. `[F25]` Section headings were small and quiet; they are larger.
26. `[F26]` "Closed now" was low-contrast; it is darker.
27. `[F27]` Past events in the day list were too faint; they are readable.
28. `[F28]` Hours sat on the opposite side from other text in Lisan mode; they align.
29. `[F29]` Dock labels were 12.5px; they are 13.5px.
30. `[F30]` Most-asked labels were 12.5px; they are 15.5px.
31. `[F31]` Countdown chips were 12.5px; they are 13.5px.
32. `[F32]` Date and caption lines were 13.5-14.5px; they are 15px.
33. `[F33]` Announcement times were 13.5px; they are 14.5px.
34. `[F34]` Status pills were 12.5px; they are 13.5px.
35. `[F35]` The arch's top line was 14.5px; it is 15.5px.
36. `[F36]` Signing in showed only the word "Checking"; it now shows a spinner.
37. `[F37]` The ITS was typed blind; a Show/Hide button lets it be checked.
38. `[F38]` Sign-in errors were English only; they follow the chosen language.
39. `[F39]` Copying only changed the button's label; a message now says what was copied.
40. `[F40]` The offline notice gave no time; it says when the page was last updated.
41. `[F41]` There was no way to refresh by hand; there is a Refresh button.
42. `[F42]` Empty states were bare grey text; they have an icon and a clear sentence.
43. `[F43]` The loading placeholder did not match the page; it does.
44. `[F44]` Tonight's majlis was shown twice (day list and its own block); it appears once.
45. `[F45]` Meal names differed between the day list and the menu; they are the same.
46. `[F46]` Most-asked tiles had no heading; they have one.
47. `[F47]` The sign-in tile's cryptic "Tour ID + ITS number" line is gone with the tile.
48. `[F48]` Map buttons left the app without warning; they carry an "opens outside" mark.
49. `[F49]` The lost-person card looked like a static banner; it reads as a button.
50. `[F50]` Maloomat tiles had no chevron; they have one.
51. `[F51]` Fact rows were tight; they have more room.
52. `[F52]` Most-asked labels were clipped after two lines; the full label always shows.
53. `[F53]` English shown to Lisan readers was not marked as English for screen readers; it is.

# HelpLoop — navy Study Day homepage QA

final result: passed

## Visual truth and capture

- Selected visual: the user's navy/lavender/mint session-first screenshot. The matching full generated source is `/workspace/generated_images/exec-fe0c09fb-ba22-476c-aa30-464404d31ed5.png` (852 × 1846 pixels).
- Committed normalized source: [reference-375.png](.github/screenshots/study-day/reference-375.png), downsampled to 375 × 812 CSS pixels. The user's crop omits the masthead and bottom dock; the full source supplies those regions.
- Implementation: actual Chromium/Playwright capture at `http://127.0.0.1:3334/`, 375 × 812 CSS pixels, deviceScaleFactor 1, reduced motion, loaded fonts. Only the Next.js development badge was hidden for captures.
- State: signed out, example session, My sessions selected, Korean interface. [Final capture](.github/screenshots/study-day/viewport-ko-375.png).
- [Full side-by-side comparison](.github/screenshots/study-day/comparison-final.png) and [focused session comparison](.github/screenshots/study-day/comparison-session.png) contain the source and rendered implementation together at the same scale.
- Additional captures: English/Korean at 320 × 812, 375 × 812 and 1280 × 960. All six captures have document width equal to viewport width and no page errors. [Capture results](.github/screenshots/study-day/capture-results.json).

## Findings and comparison history

1. **P1, corrected before the first comparison:** the previously merged green/lime homepage used the wrong selected design. Replaced the palette, artwork, logo and hierarchy with the navy session-first layout from the supplied image.
2. **P2, iteration 1:** the mobile dark region ended around 525 px instead of the reference's 489 px; the English headline also forced an extra line. This pushed the lower request list down. [Initial comparison](.github/screenshots/study-day/comparison-iteration-1.png).
   - Fixed hero height, tab spacing, session spacing and headline wrapping. The revised dark region ends around 494 px. Both help rows are accessible below it; the fixed dock remains visible.
3. **P2, iteration 1:** the primary button label sat left of centre because an auto margin on its arrow consumed space.
   - Centred the text and positioned the library arrow at the trailing edge. The final focused session comparison confirms the correction.
4. **P2, independent code/browser review:** the cream mobile dock inherited the mint keyboard-focus outline intended for navy backgrounds.
   - Added a purple mobile focus outline, retaining mint for the desktop navy header. Chromium confirms `:focus-visible` and `rgb(150, 99, 203)`. [Focused dock capture](.github/screenshots/study-day/focus-mobile-375.png).
5. **Final comparison:** no actionable P0/P1/P2 findings remain. The supplied colour hierarchy, next-session emphasis, notebook illustration, paired initials, mint metadata, lavender button, cream request list and purple selected navigation are present.

## Required fidelity surfaces

- **Fonts / typography:** local Manrope for English and available Korean sans-serif fallbacks; bold hero/course headings, medium session details, smaller muted metadata. Checked wrapping at 320, 375 and 1280 px in both modes. The English headline fits one line at 375 px and can wrap naturally at 320 px.
- **Spacing / layout:** mobile horizontal insets, underline tabs, session hierarchy, avatar pair, divided time/place groups, wide CTA, divided request rows and fixed bottom dock follow the source. Desktop adapts to two columns and moves navigation into the header.
- **Colours / tokens:** navy `#242b43`, mint `#c8efdc`, lavender `#c5a6f3`, cream `#fbfaf7`; dark text on mint/lavender, light text on navy, purple active/focus states. The reference's subtly varied raster surfaces become solid UI tokens.
- **Images / icons:** newly generated notebook and infinity-mark raster assets match the selected palette and subjects; Next Image serves them at appropriate sizes. Standard Tabler library icons, rather than drawn illustrations, provide calendar, location, infinity connection, arrows and navigation. Initials remain actual UI text, as in the reference.
- **Copy / content:** English/Korean are separate, persistent interface modes as requested; stacked translations from the mock are intentionally removed. Dialogs, metadata, campus exploration, errors and onboarding follow the selected language. The example session uses tomorrow at 14:00 KST, passed as a UTC timestamp by the server. The original reference's old calendar date is not reused.

## Interaction and accessibility checks

[Browser interaction results](.github/screenshots/study-day/interaction-results.json): all 13 flows passed; no console or page errors.

- Default session-first state; keyboard arrows, Home and End across tabs.
- Session and request dialogs; live translation while open; Escape closes, restores trigger focus and page scrolling.
- Language preference persists after reload; switching also works when browser storage is blocked.
- Wallet/profile/ask controls, lower request details and localized sign-in errors.
- Teaching-language choices (Kazakh, Uzbek, Hindi, Bengali, English, Korean, custom) are independent of interface language. Language and spot selections survive switching interface language while open.
- Library, E11, Student Center, online and custom public spot choices. Custom text inputs work.
- English speaking practice has English selected and supports campus/online spots.
- Book resale and helper-evidence review explicitly say they are planned. No verified badges, fake scores, listings, request writes or payments are created.
- Localized onboarding includes the academic-integrity rule.
- Supabase SDK creates a PKCE verifier cookie and Google authorization URL with the correct origin-specific callback. Navigation was intercepted before Google; this does not claim a completed user login.

## Scope and validation

- This remains a frontend preview with clearly labelled example content. Preferences are not saved; signed-in onboarding and live help/session flows remain separate work.
- Lint, TypeScript, all 22 existing tests and optimized production build passed.
- Independent review found only the mobile focus issue documented above, now fixed. Database schema, auth plumbing, reward models, dependencies and repository instructions were not changed.

## Implementation checklist

- [x] Correct selected design and custom artwork
- [x] Persistent English/Korean interface and translated dialogs
- [x] Session-first view and responsive navigation
- [x] Campus language/place and speaking-practice previews
- [x] Honest planned book exchange and helper-evidence explanations
- [x] Same-scale source/rendered comparison and fixes verified
- [x] Browser interactions and required build checks

## Follow-up polish

P3: the generated paper texture and infinity mark differ slightly from the mock; the solid lavender CTA omits its mild raster shading. These do not change hierarchy or usability. There is no desktop source mock; desktop captures validate the responsive adaptation rather than pixel matching.

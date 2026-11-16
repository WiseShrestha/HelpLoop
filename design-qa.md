# HelpLoop homepage design QA

Source: `/workspace/generated_images/exec-da161038-0168-4c52-910c-941d330f1e3c.png`, the selected third design revised for the requested language modes.

Comparison viewport: 375 × 812 CSS pixels, English mode, initial Help tab, signed-out public preview with labelled example data. The source is 852 × 1846 pixels and is normalized to 375 × 812 for comparison with a 1× browser capture. The source and current captures are preserved in `.github/screenshots/homepage/`.

## Comparison history

Iteration 1: `/workspace/work/home-qa/comparison-iteration-1.png` combines the source and the first browser-rendered capture.

- P2: Excessive header, hero, credit-strip and tab spacing moved the main help action from approximately y=510 to y=592 and pushed Google sign-in below the first viewport. Fix: reduce those regions to the source's rhythm while preserving readable type and touch controls.
- P2: The notebook artwork was smaller than the source and its opaque canvas edge was visible. Fix: increase the actual artwork size and blend its ivory canvas into the page.
- The development-server badge is tool-owned chrome and is removed from subsequent comparison captures. Production does not include it.

Iteration 2: `/workspace/work/home-qa/comparison-iteration-2.png` confirmed the density fix but revealed subtitle/artwork overlap and a secondary request row that still placed the Google entry behind the dock. Both were P2. The artwork was reduced and raised; the secondary row spacing was corrected.

Final comparison: `.github/screenshots/homepage/comparison.png`, with a focused header and request-detail comparison in `comparison-focused.png`. The current browser capture is `english-375.png`. Header, credit strip, tabs, first request and primary action follow the selected hierarchy; the illustration no longer overlaps copy; the Google entry is visible above the persistent dock. No actionable P0/P1/P2 differences remain.

## Required fidelity surfaces

- Fonts/typography: self-hosted Manrope with Korean system fallbacks; strong forest headings, distinct body and supporting sizes. Fonts finished loading in all captures. Minor differences from the raster mock's unspecified font are acceptable P3 polish.
- Spacing/layout: mobile follows the selected vertical hierarchy; desktop adapts to a two-column feed and credit/sign-in sidebar. Earlier density and overlap findings are resolved in the final combined evidence. Both languages fit at 320 and 375 px without horizontal overflow.
- Colors/tokens: ivory, forest, lime, pale-blue course tags and peach/green reason chips follow the selected palette. Flat button color intentionally replaces the generated mock's incidental gradient.
- Image fidelity: generated loop logo and notebook artwork, real Google mark and licensed Tabler icons; no handcrafted SVG or CSS substitutes.
- Copy/content: the user requested full English/Korean modes instead of stacked bilingual copy. Examples are clearly labelled; dialogs explain that sign-in starts the real exchange.
- Contrast: measured text/background ratios include body 11.10:1, example captions 4.83:1, safety copy 5.06:1, demo label 5.16:1 and due-time chip 6.08:1.

## Interaction checks

Chromium browser automation passed: English initial mode; immediate Korean switching; Korean retained after reload; arrow-key tab navigation and empty states; request details; language changes inside an open dialog; Escape closes the dialog and restores focus; wallet/profile/ask navigation; translated auth errors; shared language on onboarding; switching with blocked browser storage; and the real Supabase SDK's PKCE cookie and callback handoff. The final external OAuth navigation was intercepted; no Google-account login is claimed by this frontend test.

Viewport sweeps passed in both languages at 320 × 812, 375 × 812 and 1280 × 960, with fonts loaded, zero page/console errors and no horizontal overflow. The pre-existing missing favicon error was fixed using the generated brand mark and page metadata. Lint, typecheck, all 22 existing Vitest tests and production build also pass.

## Implementation checklist

1. Complete: re-captured both languages at 320, 375 and desktop widths.
2. Complete: full-view and focused comparisons at the same viewport, language and state.
3. Complete: P0/P1/P2 findings resolved; interaction, console and contrast checks passed.

## Follow-up polish and limits

- P3: the generated illustration and closest free typeface are faithful approximations rather than the original raster pixels.
- Real requests, account balances and session mutations belong to the database-wiring/screen tickets. This homepage intentionally labels its examples and retains the existing Google sign-in flow.

final result: passed

# Design QA — miniature lobby

final result: passed

## Visual truth and scope

- Source: `C:/Users/Ania/AppData/Local/Temp/codex-clipboard-27651500-3e16-491c-b22b-f292e06579b4.png` (1920×1032). This is the user's Persian miniature art-direction montage, not an application wireframe. Browser chrome/search layout are excluded from the target.
- Product scope: existing local web/Android game, original miniature illustration and game-lobby UX; keep the working two modes and temporary gameplay avatars/hands pending the later character-production stage.
- Generated painting: `assets/art/miniature-garden-v1.png`, 1536×1024; deployed optimized version `assets/art/miniature-garden-v1.webp`, 1280×853. Full prompt: `assets/art/miniature-garden-prompt.txt`. Built-in ImageGen, style reference only; no source painting copied.
- Desktop browser capture: `out/qa/home-desktop.png`, 1366×900 CSS viewport, deviceScaleFactor 1, full-page capture. Standalone capture: `out/qa/mikhak-desktop.png`, 1280×720 CSS viewport, full-page capture.
- Mobile capture: `out/qa/home-mobile.png`, 390×844 CSS viewport, deviceScaleFactor 1, full-page capture. Settings: `out/qa/setup-mobile.png`; game: `out/qa/game-mobile.png`; eight-player game: `out/qa/party-eight-mobile.png`; result: `out/qa/result-desktop.png`.
- Combined comparison: `out/qa/reference-vs-lobby.png`, 1960×840. Left is the source artwork region (crop 20,220,1860,780) scaled into 960×800; right is the rendered desktop scaled into 960×800. This comparison judges art direction, not identical UI geometry. Original full-resolution screenshots were opened separately for legibility and spacing checks.

## Required surfaces

- Typography: user-supplied Mikhak actually loads in the browser and in the standalone file. Persian hierarchy, controls, fields and numbers remain readable; player-count option values retain ASCII machine values while visible labels are Persian.
- Layout: desktop has an illustrated lobby and compact mode/play panel. Mobile stacks the illustration, two mode cards, player summary and primary action. Player editing is a real modal, not a long home form. At most four people are previewed; the full roster remains in settings. No horizontal viewport overflow at 390 pixels, including eight-player gameplay.
- Palette: parchment/ochre ground, mineral green selection, madder secondary actions, brass main CTA and lapis/gold painted border match the supplied miniature direction. Text has a calm solid ground; the busy art is kept out of control labels.
- Image fidelity: original painted garden with flattened perspective, delicate linework, pavilion, cypresses, blossoms and illuminated border. Image successfully decodes in normal and standalone builds. Mobile uses an intentional decorative crop, no text is baked into that crop. Standard interface icons are Phosphor assets. Prior temporary gameplay avatars and emoji hands remain explicitly outside this theme/UX deliverable, as requested for the later production stage.
- Copy/content: Persian mode rules and local-record labeling remain truthful. No fake currencies, daily rewards, social presence or online rankings were introduced. Single-human quick play removes the extra handover confirmation; multiple humans retain secrecy.

## Findings and iteration history

1. P2: a sticky mobile navigation bar overlapped the Play button in the three-player lobby (`out/qa/home-mobile.png` before correction). Fixed by placing navigation in normal document flow and limiting lobby player preview to four. Recaptured same 390×844 viewport and same party-lobby state; Play is now completely unobscured and navigation follows the main content.
2. P2 localization inconsistency: party-size option labels were Latin numerals. Fixed Persian display text with explicit preserved numeric option values; the 3- and 8-player setup and full game path passed again.
3. Current review: no actionable P0/P1/P2 findings remain for the agreed art-direction/lobby scope.

## Interaction verification

Chrome rendered both the built web page and server-free HTML. Tested mode selection, settings open/close, names/avatars, mixed humans/bots, 3/8-player setup, direct quick play, RPS match, pause during reveal, local persistence after reload, secret human choices, party singleton elimination, final duel, result history and play-again. Browser page-error list was empty. Fifteen Node tests passed. Android assets were synchronized; this update does not claim a fresh APK device test or production store release.

## Follow-up polish

- P3 / agreed future phase: replace temporary avatar faces and emoji hands with approved character art and shared hand animations.
- Actual touch-device testing and store release remain future delivery checks.

## Checklist

- [x] Reference and rendered evidence opened; combined comparison inspected.
- [x] Five fidelity surfaces checked.
- [x] Mobile navigation overlap corrected and recaptured.
- [x] Full primary flows and console checked.
- [x] Standalone output embeds painting, icons and Mikhak without external downloads.
- [x] No public hosting, payment, signing credentials or release publishing activated.

## LAN multiplayer follow-up

The subsequent functional update adds real Colyseus guest rooms. Default names are now آرش، ترانه، سامان، رها، نیما، مهتاب، باران، پویا. The miniature visual system is retained. Online evidence is in out/qa/online-lobby-mobile.png, online-result-mobile.png, online-party-mobile.png and online-eight-mobile.png. These were opened and reviewed at a 390×844 CSS viewport: no horizontal overflow or blocked primary controls. Independent browser sessions tested create/join, host start after all ready, secret choices, shared winner, rematch, reload/reconnection and mixed human/bot party. Local play and server-free HTML still pass their browser checks. Only LAN hosting is in scope; public internet access and an APK device test remain unverified.

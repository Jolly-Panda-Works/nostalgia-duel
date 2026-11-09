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

## No-scroll web follow-up

User explicitly requested no scrolling on any web screen. Added a compact responsive browser stage and proportional fitting when available height is short. Native Android is excluded from forced stage scaling. Long content remains reachable through pagination (four editable player slots and five record rows per page), not through clipping or scroll containers. Leaderboard tabs select the two modes.

`scripts/test-viewport.mjs` passed at 1920×1080, 1366×768, 1280×600, 1024×600, 800×600, 390×844 and 360×640, covering home, eight-player lobby, both setup pages with preserved edits, local eight-player gameplay, pause/exit/help dialogs, online connection dialog, both scoreboard tabs/pages, reveal and result. Assertions check visible control bounding boxes, complete stage/dialog bounds, absence of scrollable content containers and wheel scrolling remaining at zero. Real online tests additionally verify two-player lobby/results at 1280×600, mobile states at 390×844 and eight-human online lobby/game at 360×640. Full local browser and standalone checks passed again.

Evidence opened: `out/qa/no-scroll-game-1366.png`, `out/qa/no-scroll-game-390.png`, `out/qa/no-scroll-online-waiting-360.png` and `out/qa/online-eight-mobile.png`. No actionable clipping or navigation overlap was found. Very short windows intentionally scale the complete canvas, as expected for a fit-to-window game.

## Animated tabletop and quick matching

Six transparent illustrated forearm sprites replace symbolic hands. The local player sits below the table; opponents sit around it with equal styling and plain names. CSS animates idle, throw, palm/back turn and withdrawal. The atlas and generation prompt are retained in assets/hands. Browser checks cover loaded sprites, secret choices, local party, real online play and quick search/cancellation. Server tests exercise matching filters, five-second fallback and five-second automatic choice. Seven viewport sizes still pass no-scroll checks. Standalone embeds all six sprite URLs.

## Advanced five-gesture duel

Added a third mode and separate records tab, while keeping party final duels classic. Two original transparent forearm sprites depict lizard and Spock. The five choices fit one row; all seven viewport sizes were checked with all controls on-screen. Browser tests cover local Spock key5, separate records, two independent quick-match clients, lizard beating Spock, and loaded hand images. Reviewed advanced-mobile.png and advanced-online-desktop.png.

## Visual tutorial

Replaced the prose-only help modal with four tabs: classic, advanced, party and getting started. The selected game mode opens by default. Interactive gesture nodes show outgoing win arrows and a short illustrated winning summary. Party examples show singleton elimination, no singleton and the final duel. Existing generated hand assets and code-native SVG arrows are reused; no external diagram graphics were copied. All outgoing edges, examples, mode default, Escape, pause-modal reset, keyboard tab navigation support and seven no-scroll viewport sizes were checked. Opened tutorial-advanced-390.png for visual review.

## Online-only friends and invitations (current behavior)

Removed the offline game controller, local match/result screens and shared-device/bot roster settings. Both launch scripts now require the game server. The menu edits one profile and routes all matches through Colyseus. Friends use server-issued guest identities, mutual approval, online presence, removal, and 60-second room invitations. Notifications are polled every three seconds; friends/requests/invitations have four-row pagination. Invitation acceptance validates friendship, inviter membership, room stage and capacity. Friends and hashed guest credentials persist in ignored .local/social.json; cross-device account recovery is outside this guest version. Reviewed friends-mobile.png and game-invite-mobile.png. Browser tests exercised two separate sessions from consent through invite, join, ready, server-calculated winner, records and persistence. Seven viewport sizes include long paginated lists. Earlier local-play evidence above is historical and superseded.

## Persistent bottom tabs

The four bottom actions are now real tab/tabpanel navigation. Profile/settings and the illustrated guide render inline in the main content area instead of dialogs. The tab bar is fixed near the bottom edge, above the compact studio footer; content fitting reserves its footprint and safe-area offset. The home artwork expands into the available central space. Reviewed tabs-home-1920.png and tabs-guide-390.png. Seven-size tests check selected state, keyboard navigation, retained profile input, no dialogs for tabs, no overlap with the dock and no scrolling. Online matches still hide the lobby tab bar.

## Hand collision fix

Arm size now derives from the table container width/height instead of viewport width, with smaller sizes for 3–4 and 5–8 seats. Space remains between opposing fingertips during idle, throw and flip animations. scripts/test-hand-spacing.mjs composites the actual alpha masks at animation samples and checks 2–8 seats, all seven playable poses and six viewport sizes. No visible alpha overlap was found. Reviewed hand-spacing-2-1366.png and hand-spacing-8-390.png.

## Match HUD, urgency and round award

Match chrome is reduced to mode and settings; header, friends, room code and direct leave actions are hidden during play. The settings dialog exposes sound, volume, supported vibration and confirmed exit. Scores/wins are explicit in a compact player grid. A smooth server-clock countdown bar and text show five seconds; only an uncommitted active player receives the slow edge pulse in the final two seconds. Reduced-motion uses a steady edge. Authoritative roundResult exposes the per-round scorer/points, champion bonus, tie or eliminated player only after reveal, enabling the central award. Synthesized sound and vibration honor persisted controls. Browser tests cover urgent timing, score and award, tie, seven sizes, settings persistence and exit. Vibration behavior was mocked in automated tests; a physical Android device was not tested. Reviewed match-round-award.png and match-hud-mobile.png.

## Dedicated match result screen

Finished matches now replace the arena with a dedicated result section: champion, final per-player score/wins, total hands, and a paged view of the last three rounds. Summary is exposed only after finish. Private hosts can rematch with the group; guests see the host-wait hint. Every quick-match player can leave into fresh matchmaking. Returning home releases the finished room without an in-progress exit confirmation. Tests cover scores, history paging, seven sizes, private rematch, 8-player result fixture, quick replay and home. Reviewed match-result-390.png.

## Mode entry confirmation and coins / XP

Each mode card now opens a confirmation with format, coin entry, champion coins+XP, completion XP and current server balance. The unused home profile/settings card was removed; the profile tab and match sound/haptics remain. A 300-coin guest wallet is persisted by the server. Entry is charged at real match start, not search; cancelled unfinished matches refund it, including recovery after restart. Settled matches award once. Wallet/settlement tests cover both quick human entrants, balances, winner and participation XP, duplicate settlement, cancellation, restart recovery and insufficient funds. Entry UI tests cover all three offers at seven sizes, cancellation/search, paid start, reward result and insufficient coins. Reviewed entry-rps-mobile.png and entry-reward-result-mobile.png. This is virtual prototype currency without a purchase/cash-out flow.

## Profile-only page and avatar shop

Removed back/ready controls and game configuration from profile; round/capacity controls live in the entry confirmation. A large clickable avatar sits on the right, with name/edit pencil and level/XP on its left. Totals and per-mode played/wins/losses/round-wins use server settlement stats. Names are validated at 3–16 Unicode characters and globally unique under Persian/Arabic and case normalization. Generated ten original Persian folklore portraits (final built-in ImageGen atlas and prompt retained); three are free, seven are bought with server-side coin checks and explicit purchase confirmation. Ownership, name and stats survive server reload. UI tests check every viewport, all ten loaded portraits, uniqueness errors, purchase, reload and stats/level. Reviewed profile-mobile.png and avatar-shop-mobile.png. Historical stats before this version are not inferred from local records.

## Friends moved into animated bottom tabs

Moved the header friends action and notification badge into a fifth bottom tab. Friends/requests/invitations render as an inline panel; the same live component can mount in a room dialog for inviting without leaving an active room. Five tabs use a sliding selection surface and a short directional fade/slide on content entry. Rapid changes cancel the incoming panel’s previous animation; reduced-motion skips movement. Seven viewport sizes, keyboard navigation, profile preservation, requests/invite/join and return from the room dialog passed browser checks.

## Brief corner feedback after hand reveal

Round feedback moved out of the arena into a compact upper-corner lane, so it never covers forearms or gestures. It waits 550 ms for the throw/flip, then fades in and out over one second and is removed after 1550 ms. Re-rendering the same round retains its original timing. The final hand remains visible for 1.6 seconds before the match-result screen. Seven-size browser tests check delay, disappearance, no arena intersection and final-hand visibility. Reviewed corner-round-effect-390.png.

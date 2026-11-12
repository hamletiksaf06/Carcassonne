# Carcassonne-style game: project context

Last updated: 13 November 2026. Working name "Carcassonne" (must be renamed before any sale, see Future ideas).

## What it is

A 2-player online tile-laying game in pixel art, based on Carcassonne rules with farmers and the cathedral. Built for Hamlet, his girlfriend Eva and about 10 friends. Installable web app (PWA), landscape only, no emoji anywhere.

- Live app: https://hamletiksaf06.github.io/Carcassonne/ (capital C matters)
- Code: GitHub repository `hamletiksaf06/carcassonne` (public), branch `main`, served by GitHub Pages from the root
- Backend: Firebase project `carcassonne-9b4fd`, free Spark plan: Firestore + anonymous sign-in
- Full design spec: Game Design Document (Claude doc) https://claude.ai/artifact/F4UK2g8VhJCfp1ikcEsv6G. Where it and this file disagree on the current state, this file is newer.
- Devices: Hamlet uses a Samsung (Android, Chrome), Eva an iPhone (Safari, Add to Home Screen). Both tested and working.

## Status

Playable and tested end to end: full games played on Samsung and iPhone.

Done:
- Profile on first launch (boy/girl icon + name), badge top-left, unique friend code (e.g. HAM-4821)
- Friends added by code; challenges with accept/decline, "Waiting for..." + cancel, 20-minute expiry, one game at a time
- Colour choice for the accepter, VS screen with the pop-up number roll (no dice, never a tie)
- Full game: placement hints, rotate/undo/confirm, follower markers, farmers lying down, live scores, score banners, score preview, turn timer (30 s / 1 min / 5 min / none) with automatic random move
- End: final scoring line by line, winner screen, rematch (starts when both tap it), End game = loss
- Chat (arrow tab on the right edge, red dot when unread)
- Rulebook (10 pages), stats (head-to-head per opponent), settings (effects/chat/music sliders, animations, score preview, placement hints)
- 8-bit sound effects in code + Hamlet's music loop
- Move history (tap a turn to jump to it), tap any feature to see its size, value and owners, followers hop home when scored
- App icon: the monastery tile on grass (zoom option 4)

Decided against or skipped for now:
- Notifications: skipped. They need a server to send them (Firebase pay-as-you-go plan with a card, or a free Cloudflare Worker). Option to add later.
- Blocking, reporting, anti-cheat: not needed while it is only friends.

Known limitations:
- Sound effects and music have not been checked by ear on every phone.
- The automatic move on timer expiry only happens when one of the two players has the app open.
- Castle turrets and buildings face sideways or upside down on rotated tiles (accepted).
- Firestore rules allow any signed-in user to read and write everything (fine for friends, not for the public).

## Rules (as built)

- 84 tiles: the 72 base tiles in official counts plus tiles 25, 27, 28, 30, 31, 32, 33, 34, 38, 39 once each and the cathedral (29) twice. Dropped: 26, 35, 36, 37, 40 and all water tiles. Start tile: 24.
- Terms: castle (city), path (road), field, monastery, cathedral, shield, follower, farmer, crossing.
- Scoring: path 1 per tile; castle 2 per tile + 2 per shield when finished, 1 + 1 when unfinished at the end; cathedral castle 3 + 3 finished, 0 unfinished; monastery 9 when surrounded, else 1 per tile at the end; field 3 per finished castle touching it. Majority wins, ties score for both. Ties at the end = shared victory.

## Code map

| File | Role |
| --- | --- |
| index.html | All screens and modals |
| css/style.css | Pixel styles |
| js/app.js | UI, sync, game screen, chat, rematch, rulebook, stats, settings, history |
| js/engine.js | Pure rules engine: placement, tracing features, scoring, final scoring |
| js/test.mjs | Engine tests + 400 random full games (`node js/test.mjs`) |
| js/firebase.js | Firebase config + small store wrapper (get, set, watch, query, tx, add) |
| js/localstore.js | Local stand-in for Firebase; open the app with `?local` to test with two browser tabs |
| js/audio.js | Settings, 8-bit sound effects, music |
| js/rulebook.js | Rulebook pages |
| data/tiledata.json | Hidden tile data: castles, paths, fields (half-edge ports), follower spots |
| t/, f/, img/, img/rb/ | Tiles, followers, icons and title board, rulebook pictures |
| audio/ | music.ogg (Android) and music.m4a (iPhone) |
| manifest.webmanifest, sw.js | Install settings and offline cache. Bump `CACHE` in sw.js on every release. |

## Data model (Firestore)

- `profiles/{uid}`: name, icon, code, friends[], currentGame, stats {wins, losses, ties, games, best, castle, path, vs{opponentUid: {w, l, t, games, mins}}}
- `codes/{CODE}`: {uid}
- `challenges/{id}`: from, to, names, gameName, timer, color, created, status (pending, accepting, accepted, declined, cancelled), gameId
- `games/{id}`: name, timer, players[2], names, icons, colors, status (color, playing, over), bag, order, roll, moves[{t, x, y, k, fk, fi, auto}], deadline, startedAt, result, ended, rematch, nextGame. The board is rebuilt by replaying `moves` on each phone.
- `chats/{gameId}`: msgs[{u, t, ts}], last 200 kept

## Future ideas

1. **Quick match:** a waiting list of players who tap "Quick match"; the first two are paired into a normal game. Add a time-out ("No one found") and probably a fixed timer for quick matches.
2. **Notifications:** your turn, new challenge, new chat message, with one switch in settings. Needs Firebase pay-as-you-go or a free Cloudflare Worker.
3. **Selling on itch.io.** Before selling (not legal advice; check each):
    - Rename the game. "Carcassonne" is the board game publisher's trademark. Rules generally can't be owned; name and official art can. Check nothing copies the original art too closely.
    - Music: "Medieval Background" by DELOSOUND, almost certainly from Pixabay (file delosound-medieval-background-351307.mp3, 1:50, cut into the 82-second loop). The Pixabay Content License allows use inside a game, including commercially, with no credit required; it forbids selling the track on its own. To do: confirm the track page on Pixabay, save a screenshot of it and the licence, and credit the artist in the game anyway.
    - Fonts (Press Start 2P, VT323) are open-licence and fine.
    - Strangers: block or mute in chat (or no chat in quick matches), tighter Firestore rules, some server-side move checking.
    - Costs: the free Firebase plan covers a few hundred daily players; beyond that, the paid plan with a spending limit.
    - Pricing: online play needs both players to own it, so free or pay-what-you-want may work better. itch.io can host the HTML5 build in the browser.

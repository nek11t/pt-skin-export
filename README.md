# Pony Town Skin Exporter — offline fork of Copy Town Coin

A stripped-down, fully offline fork of Copy Town Coin (https://chromewebstore.google.com/detail/copy-town-coin/akgefebonjhccbeddlllmkpabjacaepk).

***Note: This extension is for Chrome based browsers only. If you are using a non-chromium-based browser, please install the appropriate one to use the extension (the original extension requires the same).***

***! ! ! The repository itself still contains the initial, outdated version. I have not applied these fixes to the main branch. For the latest working release and its complete source code, please check the Releases tab.***

## What it does

Adds a button next to the in-game player menu in Pony.Town. Click it to
read the selected player's skin (outfit bytes + toy data) directly from the
Angular game internals in the page, then encode and download it as a `.ptc` file.

## What was removed

* The tapper / coin clicker (`content.js` game logic, core.js, pond-zone.js, pond-ui.js, pond-pointer.js).
* The whole remote API layer (`remote-worker.js`, `background.js`, `api-config.js`).
* Shop, frames, backgrounds, avatars, nickname, name-effects, leaderboard, social, guide, sounds, popup UI.
* Fonts, guide images, sound files, avatar/frame/background PNGs.
* The popup and the options/privacy pages.
* The Chrome Web Store `_metadata/verified_contents.json` (invalid after modification).

## What was kept

* `scripts/bridge/skin-bridge.js` — reads skin data from the page (MAIN world).
* `scripts/shared/skin-codec.js` — encodes/decodes `.ptc` (bytes, name, base64, validFile, encode).
* `scripts/shared/game-map.js` — small helper used by the bridge to walk the Angular tree.
* A trimmed `skin-ui.js` that injects only the wand button next to the player menu.

No `fetch`, no `chrome.runtime.sendMessage`, no storage, no background worker.

## Install (unpacked)
1. Open the releases of repository and download the archive from the latest version.
2. Unzip the archive to a convenient location
3. Open `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** and select the folder with the unpacked archive *(there should be "assets" and "scripts" folders and manifest.json inside)*
4. Open (or reload) `https://pony.town/`
5. Click a player, then click the button next to their options menu *(it looks like a pixelated red target with a yellow center)*
   The .ptc file will download. (It may take some time (from a couple of seconds to several minutes, depending on the number of players on the server) for the skin to be cached to bridge, so the skin may not download immediately.)
6. Import the .ptc file to https://copytown.lol/character and manually copy all the values ​​to Pony Town

## Notes

* The file format is the same `.ptc` container the original produced.
* This fork never contacts `copytown.lol` or any other host.
* Reading works for any player whose skin the page has loaded
  (i.e. they must be visible on the map).
* Permissions: only `https://pony.town/*`.

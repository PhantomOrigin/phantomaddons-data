# PhantomAddons Repo

Item, pet, sack and greenhouse data for the PhantomAddons profile viewer, served from GitHub Pages:

    https://phantomorigin.github.io/phantomaddons-data/

Items, pets and sacks are a processed, minified copy of the
[NotEnoughUpdates-REPO](https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO), rebuilt
every Monday (and on every push / manual run) by `.github/workflows/build.yml`. The greenhouse
crop list is maintained by hand in `data/mutations.json`.

## Files

| File | Contents |
|---|---|
| `shas.json` | SHA-1 of each data file + build time + source NEU commit. The mod downloads this first and only re-downloads files whose hash changed. |
| `items.min.json` | `SKYBLOCK_ID → { n: name, i: item id, d?: damage, t?: skull texture, c?: leather colour, g?: glint, m?: item model }` |
| `pets.min.json` | `PET_TYPE → { n: name, s: skill, t: { rarityIndex: texture } }` (rarity 0 = Common … 5 = Mythic) |
| `sacks.min.json` | `SACK_ITEM_ID → [ITEM_ID, …]`, with item ids in Hypixel's sack-count format (`INK_SACK:3`). From NEU's `constants/sacks.json`. |
| `mutations.min.json` | `[ { id, name, rarity, analyzable? } ]`, the greenhouse crops. From `data/mutations.json`. `analyzable` is only written as `false` (Dead Plant). `id` is the NEU item id; lower-cased it matches the player's `discovered_greenhouse_crops`. |
| `LICENSE-NEU-REPO` | NEU's MIT licence, which must accompany the processed data. |

When the game adds a greenhouse crop, add it to `data/mutations.json` (the NEU item id must exist for its icon to show) and push.

## Building locally

    git clone --depth 1 --filter=blob:none --sparse https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO.git neu
    git -C neu sparse-checkout set items constants
    node build.mjs neu dist

## One-time setup on GitHub

1. Push this folder to a **public** repo named `phantomaddons-data`.
2. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Actions → Build icon repo → Run workflow** (or just push) to publish the first build.

## Licence

The items, pets and sacks data is © the NotEnoughUpdates contributors, MIT licensed — see `LICENSE-NEU-REPO`.

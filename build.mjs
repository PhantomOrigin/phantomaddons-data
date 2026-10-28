// Builds the PhantomAddons icon repo from a local checkout of the NotEnoughUpdates repo.
//
//   node build.mjs <path-to-NEU-repo> <output-dir>
//
// Output (all minified JSON):
//   items.min.json  { "<SKYBLOCK_ID>": { n, i, d?, t?, c?, g?, m? } }
//                   n = display name, i = item id, d = damage, t = skull texture,
//                   c = leather colour, g = 1 if enchanted glint, m = vanilla item model override
//   pets.min.json   { "<PET_TYPE>": { n, s, t: { "<rarityIndex>": texture } } }
//                   n = name, s = skill ("Combat", "Fishing", ...), rarity 0 = Common … 5 = Mythic
//   sacks.min.json  { "<SACK_ITEM_ID>": ["<ITEM_ID>", ...] }
//                   item ids use Hypixel's format for sack counts (INK_SACK:3, not NEU's INK_SACK-3)
//   mutations.min.json  [ { id, name, rarity, analyzable? } ]   (analyzable: false for crops the Crop Analyzer skips)
//                   Greenhouse crops, hand-maintained in data/mutations.json
//   shas.json       { files: { items, pets, sacks, mutations: sha1 }, built: ISO date, source: commit }
//
// Bad or unusual entries are skipped rather than failing the build.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [neuDir, outDir] = process.argv.slice(2);
if (!neuDir || !outDir) {
    console.error("usage: node build.mjs <NEU repo dir> <output dir>");
    process.exit(1);
}

const itemsDir = path.join(neuDir, "items");
const TEXTURE = /Value:\\?"([A-Za-z0-9+/=]+)\\?"/;
const COLOR = /\bcolor:(\d+)/;
const MODEL = /ItemModel:"([a-z0-9_.\-:/]+)"/;
const strip = s => (s || "").replace(/§./g, "");

const items = {};
const pets = {};
let skipped = 0;

for (const file of fs.readdirSync(itemsDir)) {
    if (!file.endsWith(".json")) continue;
    const id = file.slice(0, -5);
    let json;
    try {
        json = JSON.parse(fs.readFileSync(path.join(itemsDir, file), "utf8"));
    } catch {
        skipped++;
        continue;
    }
    const nbt = typeof json.nbttag === "string" ? json.nbttag : "";
    const entry = { n: json.displayname || id, i: json.itemid || "minecraft:barrier" };
    if (json.damage) entry.d = json.damage;
    const tex = nbt.match(TEXTURE);
    if (tex) entry.t = tex[1];
    const color = nbt.match(COLOR);
    if (color) entry.c = Number(color[1]);
    if (/\bench:/.test(nbt)) entry.g = 1;
    const model = nbt.match(MODEL);
    if (model && model[1] !== entry.i) entry.m = model[1];
    items[id] = entry;

    // Pets are stored as TYPE;RARITY_INDEX — collect their textures and skill in one place.
    // Only real pets have a "<Skill> Pet" lore line; runes and attribute shards share the ;N naming.
    const pet = id.match(/^([A-Z0-9_]+);(\d)$/);
    const lore = (json.lore || []).map(s => strip(s).trim()).filter(Boolean);
    const isPet = pet && !id.startsWith("ATTRIBUTE_SHARD_") && lore.some(l => / Pet$/.test(l));
    if (isPet && tex) {
        const [, type, rarity] = pet;
        // The skill is always the first lore line, e.g. "Combat Pet".
        const skill = (lore[0] || "").match(/^([A-Za-z]+) Pet$/);
        const p = pets[type] ??= {
            n: strip(json.displayname).replace(/^\[Lvl \{LVL\}\]\s*/, ""),
            s: skill ? skill[1] : "",
            t: {},
        };
        p.t[rarity] = tex[1];
    }
}

const sacks = {};
const sackFile = path.join(neuDir, "constants", "sacks.json");
for (const sack of Object.values(JSON.parse(fs.readFileSync(sackFile, "utf8")).sacks || {})) {
    if (!sack.item || !Array.isArray(sack.contents) || sack.contents.length === 0) continue;
    sacks[sack.item] = sack.contents.map(id => id.replace(/-(\d+)$/, ":$1"));
}
if (Object.keys(sacks).length === 0) throw new Error("no sacks found in " + sackFile);

const mutations = JSON.parse(fs.readFileSync(new URL("data/mutations.json", import.meta.url), "utf8"));
for (const m of mutations) {
    if (!m.id || !m.name || !m.rarity) throw new Error("bad entry in data/mutations.json: " + JSON.stringify(m));
}

fs.mkdirSync(outDir, { recursive: true });
const write = (name, data) => {
    const text = JSON.stringify(data);
    fs.writeFileSync(path.join(outDir, name), text);
    return crypto.createHash("sha1").update(text).digest("hex");
};

let source = "unknown";
try {
    const head = fs.readFileSync(path.join(neuDir, ".git", "HEAD"), "utf8").trim();
    source = head.startsWith("ref:")
        ? fs.readFileSync(path.join(neuDir, ".git", head.slice(5)), "utf8").trim()
        : head;
} catch {}

const shas = {
    files: {
        items: write("items.min.json", items),
        pets: write("pets.min.json", pets),
        sacks: write("sacks.min.json", sacks),
        mutations: write("mutations.min.json", mutations),
    },
    built: new Date().toISOString(),
    source,
};
fs.writeFileSync(path.join(outDir, "shas.json"), JSON.stringify(shas, null, 2));

// NEU's data is MIT licensed — its notice must travel with the processed copy.
const neuLicense = path.join(neuDir, "LICENSE");
if (fs.existsSync(neuLicense)) fs.copyFileSync(neuLicense, path.join(outDir, "LICENSE-NEU-REPO"));
fs.writeFileSync(path.join(outDir, "index.html"),
    "<!doctype html><meta charset=utf-8><title>PhantomAddons Repo</title>" +
    "<h1>PhantomAddons Repo</h1><p>Item and pet icon data for the PhantomAddons profile viewer, " +
    "processed from the <a href=\"https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO\">NotEnoughUpdates-REPO</a> " +
    "(MIT, see <a href=\"LICENSE-NEU-REPO\">LICENSE-NEU-REPO</a>).</p>" +
    "<ul><li><a href=\"shas.json\">shas.json</a></li><li><a href=\"items.min.json\">items.min.json</a></li>" +
    "<li><a href=\"pets.min.json\">pets.min.json</a></li><li><a href=\"sacks.min.json\">sacks.min.json</a></li>" +
    "<li><a href=\"mutations.min.json\">mutations.min.json</a></li></ul>");

console.log(`items: ${Object.keys(items).length}, pets: ${Object.keys(pets).length}, sacks: ${Object.keys(sacks).length}, mutations: ${mutations.length}, skipped: ${skipped}`);
console.log(`source commit: ${source}`);

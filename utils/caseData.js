// Server-authoritative case data + RNG engine. Mirrors the odds/roll logic
// in CaseBattleClient/src/utils/index.js so battle results match what
// players already see in solo mode, but rolls happen here (not per-client)
// so every player in a battle gets a fair, shared result.

const CRATES_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json";
const SKINS_URL =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";

const BATTLE_CASE_TYPES = ["Case", "Sticker Capsule", "Souvenir"];

// Odds per case `type`, keyed by rarity color (or "rare" for knives/gloves).
// Same table as the client's utils/index.js `odds` constant.
const ODDS_BY_TYPE = {
  Case: {
    "#4b69ff": 79.92,
    "#8847ff": 15.98,
    "#d32ce6": 3.2,
    "#eb4b4b": 0.64,
    rare: 0.26,
  },
  Souvenir: {
    "#b0c3d9": 80,
    "#5e98d9": 16,
    "#4b69ff": 3.2,
    "#8847ff": 0.64,
    "#d32ce6": 0.128,
    "#eb4b4b": 0.0256,
  },
  "Sticker Capsule": {
    "#4b69ff": 80,
    "#8847ff": 16,
    "#d32ce6": 3.2,
    "#eb4b4b": 0.641,
  },
};

// Notional value table (rarity tier x wear tier) used only to score battles.
// There's no real pricing data in the CSGO-API dataset, and since every
// player opens the same case each round, a per-case "cost" would net out
// identically for everyone anyway — so this is just a value, not a price.
const RARITY_BASE_VALUE = {
  "#b0c3d9": 1, // Consumer Grade
  "#5e98d9": 3, // Industrial Grade
  "#4b69ff": 8, // Mil-Spec
  "#8847ff": 25, // Restricted
  "#d32ce6": 80, // Classified
  "#eb4b4b": 250, // Covert
  "#e4ae39": 600, // Contraband
  rare: 1500, // Knives / gloves
};

const WEAR_MULTIPLIER = {
  "Factory New": 1.5,
  "Minimal Wear": 1.2,
  "Field Tested": 1.0,
  "Well Worn": 0.85,
  "Battle Scarred": 0.7,
};

let casesById = null;
let skinsById = null;
let initPromise = null;

const unique = (x, index, arr) => arr.indexOf(x) === index;

const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const getCrateRarities = (crate) => {
  if (!crate) return [];
  const rarities = crate.contains.map((x) => x.rarity.color).filter(unique);
  if (crate.contains_rare && crate.contains_rare.length > 0) {
    rarities.push("rare");
  }
  return rarities.reverse();
};

const selectRarity = (caseData) => {
  const rarities = getCrateRarities(caseData);
  const odds = ODDS_BY_TYPE[caseData.type];
  rarities.sort((a, b) => odds[b] - odds[a]);

  const random = Math.random();
  let cumulative = 0;

  for (let i = 0; i < rarities.length; i++) {
    const rarity = rarities[i];
    const rarityOdds = odds[rarity];
    if (rarityOdds === undefined) continue;
    cumulative += rarityOdds / 100;
    if (random < cumulative) return rarity;
  }
  return rarities[rarities.length - 1];
};

const rollStatTrack = () => Math.random() <= 0.1;

const selectFloat = (minFloat, maxFloat) => {
  const luck = Math.random() * (maxFloat - minFloat) + minFloat;
  let wear = "";
  let float;
  if (luck < 0.03) {
    float = Math.random() * 0.07;
    wear = "Factory New";
  } else if (luck < 0.27) {
    float = Math.random() * 0.08 + 0.07;
    wear = "Minimal Wear";
  } else if (luck < 0.6) {
    float = Math.random() * 0.23 + 0.15;
    wear = "Field Tested";
  } else if (luck < 0.84) {
    float = Math.random() * 0.07 + 0.38;
    wear = "Well Worn";
  } else {
    float = Math.random() * 0.55 + 0.45;
    wear = "Battle Scarred";
  }
  return { float, wear };
};

const selectPaintIndex = () => Math.floor(Math.random() * 1000);

const selectRare = (caseData) => randomChoice(caseData.contains_rare);

const rollLuck = (caseData) => ({
  rarity: selectRarity(caseData),
  statTrack: rollStatTrack(),
  pattern: selectPaintIndex(),
});

/**
 * Roll one item from a case. Same algorithm/odds as the client's solo-mode
 * `openCase`, just running server-side so the result can be broadcast.
 * @param {object} caseData - A crate object as returned by getCaseById.
 * @returns {{skin: object, luck: object, rare: boolean}}
 */
const openCaseServer = (caseData) => {
  const luck = rollLuck(caseData);
  const filteredItems = caseData.contains.filter((x) => x.rarity.color === luck.rarity);
  const skinRef = luck.rarity === "rare" ? selectRare(caseData) : randomChoice(filteredItems);

  let skin = skinRef;
  if (caseData.type !== "Sticker Capsule") {
    skin = getSkinById(skinRef.id) || skinRef;
  }

  if (caseData.type === "Case") {
    const { float, wear } = selectFloat(skin.min_float, skin.max_float);
    luck.float = float.toFixed(14);
    luck.wear = wear;
  }

  return {
    skin,
    luck,
    rare: luck.rarity === "rare",
  };
};

/**
 * Notional battle-scoring value for a rolled item. Not a real price.
 * @param {{skin: object, luck: object}} rolledItem - result of openCaseServer.
 * @returns {number}
 */
const getItemValue = ({ luck }) => {
  const base = RARITY_BASE_VALUE[luck.rarity] ?? 1;
  const wearMultiplier = luck.wear ? WEAR_MULTIPLIER[luck.wear] ?? 1 : 1;
  return Math.round(base * wearMultiplier * 100) / 100;
};

const getAllCases = () => Array.from(casesById.values());
const getCaseById = (id) => casesById?.get(id);
const getSkinById = (id) => skinsById?.get(id);

/**
 * Fetch + cache the crates/skins datasets once. Must be awaited before any
 * of the roll/lookup functions above are used. Safe to call repeatedly —
 * only fetches once.
 */
const initCaseData = () => {
  if (!initPromise) {
    initPromise = Promise.all([
      fetch(CRATES_URL).then((res) => res.json()),
      fetch(SKINS_URL).then((res) => res.json()),
    ]).then(([crates, skins]) => {
      const battleCrates = crates.filter((c) => BATTLE_CASE_TYPES.includes(c.type));
      casesById = new Map(battleCrates.map((c) => [c.id, c]));
      skinsById = new Map(skins.map((s) => [s.id, s]));
      console.log(
        `[caseData] loaded ${casesById.size} cases and ${skinsById.size} skins`
      );
    });
  }
  return initPromise;
};

module.exports = {
  initCaseData,
  getAllCases,
  getCaseById,
  openCaseServer,
  getItemValue,
};

import { aefx } from "./aefx.js";
import { aura } from "./aura.js";
import { melee } from "./melee.js";
import { ontoken } from "./ontoken.js";
import { preset } from "./preset.js";
import { range } from "./range.js";
import { templatefx } from "./templatefx.js";
import { readEntry } from "../../data/entries.js";

const DEFAULTS = { melee, range, ontoken, templatefx, aura, preset, aefx };

export function loadDefault(menu) {
   return foundry.utils.deepClone(DEFAULTS[menu]).map((entry) => {
      entry.label = game.i18n.localize(entry.label);
      entry.id = foundry.utils.randomID(16);
      return readEntry(entry)?.toObject() ?? entry;
   });
}

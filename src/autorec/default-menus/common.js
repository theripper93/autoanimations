import { newEntry } from "../../data/entries.js";

let melee;
const fresh = (key) => foundry.utils.deepClone((melee ??= newEntry("melee"))[key]);

export function main({ label }) {
   return {
      id: foundry.utils.randomID(16),
      label: `autoanimations.animations.${label}`,
      soundOnly: fresh("soundOnly"),
   };
}

export const macro = () => fresh("macro");
export const source = () => fresh("source");
export const secondary = () => fresh("secondary");
export const target = () => fresh("target");
export const meleeSwitch = () => fresh("meleeSwitch");

export function sound(values = {}) {
   return { ...fresh("primary").sound, ...values };
}

export function primary({ video = {}, sound: soundValues = {}, options = {} } = {}) {
   return { video: { enableCustom: false, customPath: "", ...video }, sound: sound(soundValues), options };
}

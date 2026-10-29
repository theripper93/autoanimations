import { MODULE_ID, debug } from "../constants.js";
import { SCHEMA_VERSION } from "../data/entries.js";

let systemFlagSource;

export function setSystemFlagSource(fn) {
   systemFlagSource = fn;
}

export function getFlagSource(doc) {
   const source = { document: doc, path: "flags", key: doc.uuid ?? doc.id, ...systemFlagSource?.(doc) };
   Hooks.callAll("aa.flagSource", doc, source);
   return source;
}

export function getFlags(doc) {
   if (!doc) { return; }
   const { document, path } = getFlagSource(doc);
   const flags = foundry.utils.getProperty(document, path)?.[MODULE_ID] ?? doc.flags?.[MODULE_ID];
   if (!flags) { return; }
   if (!(Number(flags.version) >= SCHEMA_VERSION)) {
      debug("Ignoring outdated animation flags on", doc.name ?? doc.label, flags);
      return;
   }
   return flags;
}

export async function setFlags(doc, flags) {
   const { document, path } = getFlagSource(doc);
   await document.update({ [`${path}.-=${MODULE_ID}`]: null });
   await document.update({ [`${path}.${MODULE_ID}`]: flags });
}

import { MODULE_ID, debug } from "../constants.js";
import { SCHEMA_VERSION } from "../data/entries.js";

export function getFlags(doc) {
   const flags = doc?.flags?.[MODULE_ID];
   if (!flags) { return; }
   if (!(Number(flags.version) >= SCHEMA_VERSION)) {
      debug("Ignoring outdated animation flags on", doc.name ?? doc.label, flags);
      return;
   }
   return flags;
}

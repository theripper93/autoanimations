import { initializeJB2APatreonDB, JB2APATREONDB } from "./jb2a-patreon-database.js";
import { initializeJB2AFreeDB, JB2AFREEDB } from "./jb2a-free-database.js";
import { dbMerge } from "./database-merge/dbMerge.js";
import { custom_error } from "../constants.js";

export let aaDatabase;

const FREE_PATH = "modules/JB2A_DnD5e";
const PATREON_PATH = "modules/jb2a_patreon";

export async function initializeAADB() {
   const s3Location = game.settings.get("autoanimations", "jb2aLocation");
   const free = game.modules.get("JB2A_DnD5e");
   const patreon = game.modules.get("jb2a_patreon");
   const freeVersion = free?.version ?? "";
   const patreonVersion = patreon?.version ?? "";

   if (s3Location) {
      if (s3Location.includes("JB2A_DnD5e")) {
         await initializeJB2AFreeDB(s3Location);
         aaDatabase = JB2AFREEDB;
         await dbMerge.handle(freeVersion, "", s3Location);
      } else {
         await initializeJB2APatreonDB(s3Location);
         aaDatabase = JB2APATREONDB;
         if (s3Location.includes("patreon")) {
            await dbMerge.handle("", patreonVersion, s3Location);
         } else {
            custom_error(game.i18n.localize("autoanimations.ui.notify.badExternalPath"), true);
         }
      }
   } else if (patreon) {
      await initializeJB2APatreonDB(PATREON_PATH);
      aaDatabase = JB2APATREONDB;
      await dbMerge.handle(freeVersion, patreonVersion);
   } else {
      await initializeJB2AFreeDB(FREE_PATH);
      aaDatabase = JB2AFREEDB;
      if (free) {
         await dbMerge.handle(freeVersion, patreonVersion);
      } else if (game.user.isGM) {
         custom_error(game.i18n.localize("autoanimations.settings.error"), true);
      }
   }

   Sequencer.Database.registerEntries("autoanimations", aaDatabase, true);
   buildMenuOptions(aaDatabase);
   console.log("%cAutomated Animations Database has been compiled and registered", "color: green", { aaDatabase });
   Hooks.callAll("aa.ready", aaDatabase);
}

export function sortDatabase(database, isPatreon = false) {
   const walk = (node, depth) => {
      if (!node || typeof node !== "object" || Array.isArray(node) || depth > 4) { return; }
      const free = node._free;
      delete node._free;
      for (const key of Object.keys(node)) {
         if (key.startsWith("_")) { continue; }
         if (!isPatreon && free && !free.includes(key)) {
            delete node[key];
            continue;
         }
         walk(node[key], depth + 1);
      }
   };
   for (const [section, node] of Object.entries(database)) {
      if (section !== "_templates") { walk(node, 1); }
   }
   return database;
}

// Select menu options

const MENU_SECTIONS = ["range", "return", "melee", "static", "templatefx"];

export const menuOptions = { types: {}, animations: {}, variants: {}, colors: {}, returnWeapons: [], rangeWeapons: [] };

function buildMenuOptions(database) {
   const keys = (node) => Object.keys(node ?? {}).filter((k) => !k.startsWith("_"));
   const sorted = (node, i18n) => keys(node).sort((a, b) => a.localeCompare(b)).map((k) => [k, game.i18n.localize(`autoanimations.${i18n}.${k}`)]);

   for (const section of MENU_SECTIONS) {
      const db = database[section] ?? {};
      menuOptions.types[section] = sorted(db, "menuTypes");
      menuOptions.animations[section] = {};
      menuOptions.variants[section] = {};
      menuOptions.colors[section] = {};
      for (const type of keys(db)) {
         menuOptions.animations[section][type] = sorted(db[type], "animations");
         menuOptions.variants[section][type] = {};
         menuOptions.colors[section][type] = {};
         for (const animation of keys(db[type])) {
            menuOptions.variants[section][type][animation] = sorted(db[type][animation], "variants");
            menuOptions.colors[section][type][animation] = {};
            for (const variant of keys(db[type][animation])) {
               const colors = sorted(db[type][animation][variant], "colors");
               colors.push(["random", game.i18n.localize("autoanimations.colors.random")]);
               menuOptions.colors[section][type][animation][variant] = colors;
            }
         }
      }
   }
   menuOptions.returnWeapons = keys(database.return?.weapon);
   menuOptions.rangeWeapons = keys(database.range?.weapon);
}

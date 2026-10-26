import { MODULE_ID, custom_error, custom_notify, custom_warning } from "../constants.js";
import { SCHEMA_VERSION, readEntry } from "../data/entries.js";
import { loadDefault } from "./default-menus/index.js";

export const AUTOREC_MENUS = ["melee", "range", "ontoken", "templatefx", "aura", "preset", "aefx"];

const settingKey = (menu) => `aaAutorec-${menu}`;
const menuLabel = (menu) => game.i18n.localize(`autoanimations.animTypes.${menu}`);
const t = (key, data) => (data ? game.i18n.format(`autoanimations.ui.menuManager.${key}`, data) : game.i18n.localize(`autoanimations.ui.menuManager.${key}`));

export class AAAutorecManager {
   static registerSettings() {
      for (const menu of AUTOREC_MENUS) {
         game.settings.register(MODULE_ID, settingKey(menu), {
            scope: "world",
            config: false,
            type: Array,
            default: loadDefault(menu),
            onChange: () => Hooks.callAll("aa.autorecChanged", menu),
         });
      }
      game.settings.register(MODULE_ID, "aaAutorec", {
         scope: "world",
         config: false,
         type: Object,
         default: { version: SCHEMA_VERSION },
      });
   }

   static getMenu(menu) {
      return game.settings.get(MODULE_ID, settingKey(menu)) ?? [];
   }

   static async setMenu(menu, entries) {
      return game.settings.set(MODULE_ID, settingKey(menu), entries);
   }

   static getAutorecEntries() {
      const entries = Object.fromEntries(AUTOREC_MENUS.map((menu) => [menu, this.getMenu(menu)]));
      entries.version = game.settings.get(MODULE_ID, "aaAutorec")?.version ?? SCHEMA_VERSION;
      return entries;
   }

   static async checkVersion() {
      if (!game.user.isGM) { return; }
      const version = game.settings.get(MODULE_ID, "aaAutorec")?.version ?? SCHEMA_VERSION;
      if (version < SCHEMA_VERSION) {
         custom_warning(t("tooOld"), true);
         await game.settings.set(MODULE_ID, "aaAutorec", { version: SCHEMA_VERSION });
      }
      await this.checkForDuplicates();
   }

   static async checkForDuplicates() {
      for (const menu of AUTOREC_MENUS) {
         const entries = this.getMenu(menu);
         const ids = new Set(entries.map((e) => e.id));
         if (ids.size === entries.length) { continue; }
         custom_error(t("duplicateIds", { menu: menuLabel(menu) }));
         await this.setMenu(menu, this.newSectionIds(entries));
      }
   }

   static newSectionIds(entries) {
      entries.forEach((entry) => entry.id = foundry.utils.randomID(16));
      return entries;
   }

   static async restoreDefault() {
      await game.settings.set(MODULE_ID, "aaAutorec", { version: SCHEMA_VERSION });
      for (const menu of AUTOREC_MENUS) { await this.setMenu(menu, loadDefault(menu)); }
   }

   static exportMenu(suffix = "") {
      const data = JSON.stringify(this.getAutorecEntries(), null, 2);
      foundry.utils.saveDataToFile(data, "text/json", `fvtt-AutomatedAnimations-GlobalMenu${suffix}.json`);
   }

   static parseImport(json) {
      let data = json;
      if (typeof json === "string") {
         try { data = JSON.parse(json); }
         catch (err) {
            custom_error(t("invalidJson"));
            return;
         }
      }
      if ((data.version ?? 0) > SCHEMA_VERSION) {
         custom_error(t("newerVersion"));
         return;
      }
      if ((data.version ?? 0) < SCHEMA_VERSION) {
         custom_error(t("olderVersion"));
         return;
      }
      return data;
   }

   static async mergeMenus(json, options = {}) {
      const data = this.parseImport(json);
      if (!data) { return; }
      for (const menu of AUTOREC_MENUS) {
         if (!(options[menu] || options.submitAll) || !Array.isArray(data[menu])) { continue; }
         const current = this.getMenu(menu);
         const labels = new Set(current.map((e) => rinse(e.label)));
         for (const entry of completeEntries(menu, data[menu])) {
            if (labels.has(rinse(entry.label))) { continue; }
            entry.id = foundry.utils.randomID(16);
            current.push(entry);
         }
         await this.setMenu(menu, current);
         custom_notify(t("merged", { menu: menuLabel(menu) }));
      }
   }

   static async overwriteMenus(json, options = {}) {
      const data = this.parseImport(json);
      if (!data) { return; }
      for (const menu of AUTOREC_MENUS) {
         if (!(options[menu] || options.submitAll) || !Array.isArray(data[menu])) { continue; }
         await this.setMenu(menu, this.newSectionIds(completeEntries(menu, data[menu])));
         custom_notify(t("overwritten", { menu: menuLabel(menu) }));
      }
   }

   static async addMetaData(metaData, options) {
      if (!metaData) { return; }
      for (const menu of AUTOREC_MENUS) {
         if (options && !options[menu]) { continue; }
         const entries = this.getMenu(menu);
         if (!entries.length) { continue; }
         entries.forEach((entry) => entry.metaData = metaData);
         await this.setMenu(menu, entries);
      }
   }
}

const rinse = (label) => label?.replace(/\s+/g, "").toLowerCase();

function completeEntries(menu, entries) {
   return entries.map((entry) => readEntry({ menu, ...entry })?.toObject()).filter(Boolean);
}

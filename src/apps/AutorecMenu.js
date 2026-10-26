import { AAAutorecManager, AUTOREC_MENUS } from "../autorec/manager.js";
import { newEntry } from "../data/entries.js";
import { MODULE_ID } from "../constants.js";
import { EditWindow } from "./EditWindow.js";
import { Diagnostics } from "./Diagnostics.js";
import { MenuManager } from "./MenuManager.js";
import { headerButton, templatePath } from "./templates.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

export class AutorecMenu extends HandlebarsApplicationMixin(ApplicationV2) {
   static _instance;

   static show() {
      if (!game.user.isGM) { return; }
      this._instance ??= new AutorecMenu();
      return this._instance.render({ force: true });
   }

   static DEFAULT_OPTIONS = {
      id: "AA-autorec-settings",
      classes: ["autoanimations", "aa-autorec"],
      window: { title: "autoanimations.ui.autorec.title", resizable: true, contentClasses: ["standard-form"] },
      position: { width: 520, height: 700 },
      actions: {
         addEntry: AutorecMenu._onAddEntry,
         editEntry: AutorecMenu._onEditEntry,
         duplicateEntry: AutorecMenu._onDuplicateEntry,
         deleteEntry: AutorecMenu._onDeleteEntry,
         menuManager: () => MenuManager.show(),
         openSettings: AutorecMenu._onOpenSettings,
         diagnostics: () => new Diagnostics().render({ force: true }),
      },
   };

   static PARTS = {
      toolbar: { template: templatePath("autorec/toolbar") },
      list: { template: templatePath("autorec/list"), scrollable: [""] },
      footer: { template: templatePath("autorec/footer") },
   };

   filter = "";

   search = "";

   constructor(options) {
      super(options);
      Hooks.on("aa.autorecChanged", () => {
         if (this.rendered) { this.render({ parts: ["list"] }); }
      });
   }

   async _update(menu, change) {
      const entries = foundry.utils.deepClone(AAAutorecManager.getMenu(menu));
      change(entries);
      await AAAutorecManager.setMenu(menu, entries);
   }

   _row(target) {
      const { menu, id } = target.closest("[data-id]").dataset;
      return { menu, entry: AAAutorecManager.getMenu(menu).find((e) => e.id === id) };
   }

   async _renderFrame(options) {
      const frame = await super._renderFrame(options);
      frame.querySelector("[data-action=close]").before(
         headerButton("openSettings", "fa-solid fa-gear", "autoanimations.ui.autorec.settings"),
         headerButton("diagnostics", "fa-solid fa-stethoscope", "autoanimations.ui.autorec.diagnostics"),
      );
      return frame;
   }

   async _prepareContext() {
      const types = Object.fromEntries(AUTOREC_MENUS.map((id) => [id, menuType(id)]));
      const entries = AUTOREC_MENUS.flatMap((menu) => AAAutorecManager.getMenu(menu).map((entry) => ({
         menu,
         id: entry.id,
         label: entry.label || game.i18n.localize("autoanimations.menus.itemName"),
         type: types[menu],
         quickIcon: entry.advanced?.exactMatch ? "fas fa-equals" : entry.advanced?.excludedTerms?.length ? "fas fa-not-equal" : "",
         quickTitle: entry.advanced?.exactMatch ? "autoanimations.ui.autorec.exactMatch" : entry.advanced?.excludedTerms?.length ? "autoanimations.ui.autorec.excludedTerms" : "",
      })));
      entries.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
      return {
         filter: this.filter,
         filterIcon: types[this.filter]?.icon ?? "fas fa-filter",
         filterOptions: { "": game.i18n.localize("autoanimations.menus.allTypes"), ...Object.fromEntries(Object.entries(types).map(([id, t]) => [id, t.label])) },
         search: this.search,
         entries,
      };
   }

   async _onRender(context, options) {
      await super._onRender(context, options);
      const root = this.element;
      if (!root.dataset.aaAutorec) {
         root.dataset.aaAutorec = "true";
         root.addEventListener("input", (event) => {
            if (event.target.name === "search") { this.search = event.target.value; this._applySearch(); }
         });
         root.addEventListener("change", (event) => {
            if (event.target.name !== "filter") { return; }
            this.filter = event.target.value;
            root.querySelector(".aa-filter-icon").className = `aa-filter-icon ${menuType(this.filter)?.icon ?? "fas fa-filter"}`;
            this._applySearch();
         });
      }
      if (options.parts.includes("list")) { this._applySearch(); }
   }

   _applySearch() {
      let regex;
      try { regex = new RegExp(this.search, "i"); }
      catch (err) { regex = new RegExp(RegExp.escape(this.search), "i"); }
      for (const row of this.element.querySelectorAll(".aa-entry")) {
         row.hidden = (!!this.filter && row.dataset.menu !== this.filter)
            || (!!this.search && !regex.test(row.querySelector(".aa-label").textContent));
      }
   }

   static _onAddEntry() {
      const menu = this.filter || "melee";
      EditWindow.open(menu, newEntry(menu), { isNew: true });
   }

   static _onEditEntry(event, target) {
      const { menu, entry } = this._row(target);
      EditWindow.open(menu, entry);
   }

   static async _onDuplicateEntry(event, target) {
      const { menu, entry: source } = this._row(target);
      const copy = foundry.utils.deepClone(source);
      copy.id = foundry.utils.randomID(16);
      delete copy.metaData;
      await this._update(menu, (entries) => {
         let i = 1;
         do { copy.label = `${source.label ?? ""}-${i++}`; } while (entries.some((e) => e.label === copy.label));
         entries.splice(entries.findIndex((e) => e.id === source.id) + 1, 0, copy);
      });
      EditWindow.open(menu, copy);
   }

   static async _onDeleteEntry(event, target) {
      const { menu, entry } = this._row(target);
      const label = `'${foundry.utils.escapeHTML(entry.label || game.i18n.localize("autoanimations.menus.itemName"))}'`;
      const ok = await DialogV2.confirm({
         window: { title: "autoanimations.ui.autorec.deleteTitle" },
         content: `<p>${game.i18n.format("autoanimations.ui.autorec.deleteContent", { label })}</p>`,
      });
      if (!ok) { return; }
      await this._update(menu, (entries) => entries.splice(entries.findIndex((e) => e.id === entry.id), 1));
   }

   static _onOpenSettings() {
      const config = new foundry.applications.settings.SettingsConfig();
      config.render({ force: true }).then(() => config.changeTab?.(MODULE_ID, "categories"));
   }
}

function menuType(menu) {
   if (!menu) { return; }
   return {
      icon: game.i18n.localize(`autoanimations.app.aaAutorec-${menu}.icon`),
      label: game.i18n.localize(`autoanimations.app.aaAutorec-${menu}.label`),
   };
}

import { AAAutorecManager } from "../autorec/manager.js";
import { readEntry, validateEntry, validationMessage } from "../data/entries.js";
import { MODULE_ID } from "../constants.js";
import { AnimationEditor } from "./editor/editor.js";
import { confirmDiscard, templatePath } from "./templates.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class EditWindow extends HandlebarsApplicationMixin(ApplicationV2) {
   static open(menu, entry, { isNew = false } = {}) {
      const id = `AA-edit-${menu}-${entry.id}`;
      const existing = foundry.applications.instances.get(id);
      if (existing) {
         existing.bringToFront();
         return existing;
      }
      return new EditWindow(menu, entry, { id, isNew }).render({ force: true });
   }

   constructor(menu, entry, { isNew = false, ...options } = {}) {
      super(options);
      this.menu = menu;
      this.entry = readEntry(entry)?.toObject() ?? foundry.utils.deepClone(entry);
      this.isNew = isNew;
      this._saved = JSON.stringify(this.entry);
   }

   static DEFAULT_OPTIONS = {
      classes: ["autoanimations", "aa-edit"],
      window: { resizable: true, contentClasses: ["standard-form"] },
      position: { width: 880, height: 760 },
      actions: { save: EditWindow._onSave },
   };

   static PARTS = {
      main: { template: templatePath("edit/main") },
      footer: { template: templatePath("edit/footer") },
   };

   _saved;

   editor = new AnimationEditor({
      app: this,
      storageKey: `${MODULE_ID}.edit.open`,
      getEntry: () => this.entry,
      commit: () => { if (this.window.title) { this.window.title.textContent = this.title; } },
   });

   get title() {
      const menu = game.i18n.localize(`autoanimations.app.aaAutorec-${this.entry.menu}.label`);
      return `${menu}: ${this.entry.label || game.i18n.localize("autoanimations.menus.itemName")}`;
   }

   get dirty() {
      return JSON.stringify(this.entry) !== this._saved;
   }

   async _prepareContext() {
      return { id: this.entry.id };
   }

   async _onRender(context, options) {
      await super._onRender(context, options);
      this.editor.activate(this.element);
      await this.editor.render(this.element.querySelector(".aa-editor"), this.entry);
   }

   async close(options = {}) {
      if (!options.force && this.dirty && !await confirmDiscard()) { return this; }
      return super.close(options);
   }

   static async _onSave() {
      let copy;
      try { copy = validateEntry(this.entry); }
      catch (err) { return ui.notifications.error(`Automated Animations | ${game.i18n.format("autoanimations.ui.common.notSaved", { error: validationMessage(err) })}`); }
      const from = this.menu;
      const to = copy.menu;
      const entries = foundry.utils.deepClone(AAAutorecManager.getMenu(to));
      const index = entries.findIndex((e) => e.id === copy.id);
      if (from !== to) {
         if (index >= 0) { copy.id = foundry.utils.randomID(16); }
         entries.unshift(copy);
         await AAAutorecManager.setMenu(to, entries);
         const old = AAAutorecManager.getMenu(from);
         if (old.some((e) => e.id === this.entry.id)) {
            await AAAutorecManager.setMenu(from, old.filter((e) => e.id !== this.entry.id));
         }
         this.menu = to;
      } else if (index >= 0) {
         entries[index] = copy;
         await AAAutorecManager.setMenu(to, entries);
      } else {
         if (!this.isNew) { ui.notifications.warn(`Automated Animations | ${game.i18n.localize("autoanimations.ui.autorec.entryReadded")}`); }
         entries.unshift(copy);
         await AAAutorecManager.setMenu(to, entries);
      }
      this.isNew = false;
      this.entry = foundry.utils.deepClone(copy);
      this._saved = JSON.stringify(this.entry);
      await this.editor.render(this.element.querySelector(".aa-editor"), this.entry);
   }
}

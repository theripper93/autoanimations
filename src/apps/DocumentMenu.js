import { AAAutorecFunctions } from "../autorec/search.js";
import { AAAutorecManager } from "../autorec/manager.js";
import { getFlags, getFlagSource, setFlags } from "../autorec/flags.js";
import { newEntry, readEntry, SCHEMA_VERSION, validateEntry, validationMessage } from "../data/entries.js";
import { MODULE_ID, custom_warning } from "../constants.js";
import { AnimationEditor } from "./editor/editor.js";
import { AutorecMenu } from "./AutorecMenu.js";
import { confirmDiscard, headerButton, templatePath } from "./templates.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const ITEM_MENUS = ["melee", "range", "ontoken", "templatefx", "aura", "preset"];

const t = (key, data) => (data ? game.i18n.format(`autoanimations.ui.document.${key}`, data) : game.i18n.localize(`autoanimations.ui.document.${key}`));

export class DocumentMenu extends HandlebarsApplicationMixin(ApplicationV2) {
   constructor(document, { isActiveEffect = false, ...options } = {}) {
      super({ ...options, id: `AA-item-settings-${getFlagSource(document).key}`.replace(/\./g, "-") });
      this.document = document;
      this.isActiveEffect = isActiveEffect;

      const flags = foundry.utils.deepClone(getFlags(document) ?? {});
      const valid = isActiveEffect ? flags.activeEffectType : flags.menu;
      this.entry = valid ? readEntry(flags)?.toObject() ?? flags : { ...newEntry(isActiveEffect ? "aefx" : "melee", { activeEffectType: "ontoken" }), isEnabled: flags.isEnabled ?? true, isCustomized: false };
      this.entry.isEnabled ??= true;
      this.entry.isCustomized ??= false;
      if (!isActiveEffect) { this.entry.fromAmmo ??= false; }
      this.entry.version = SCHEMA_VERSION;
      this.entry.id ??= foundry.utils.randomID(16);
      this.entry.label = this.label;
      this._saved = JSON.stringify(this.entry);
   }

   _saved;

   static DEFAULT_OPTIONS = {
      classes: ["autoanimations", "aa-document-menu"],
      window: { resizable: true, contentClasses: ["standard-form"] },
      position: { width: 860, height: 750 },
      actions: {
         save: DocumentMenu._onSave,
         openAutorec: () => AutorecMenu.show(),
         info: DocumentMenu._onInfo,
      },
   };

   static PARTS = {
      main: { template: templatePath("edit/main") },
      footer: { template: templatePath("edit/footer") },
   };

   editor = new AnimationEditor({
      app: this,
      storageKey: `${MODULE_ID}.document.open`,
      getEntry: () => this.entry,
      commit: () => {},
      tabOptions: () => ({ autorec: false, locked: !(this.entry.isEnabled && this.entry.isCustomized) }),
      leadingTabs: async () => [{
         id: "status",
         label: game.i18n.localize("autoanimations.menus.status"),
         html: await foundry.applications.handlebars.renderTemplate(templatePath("document/status"), this._statusContext()),
      }],
   });

   get title() {
      return game.i18n.localize(`autoanimations.ui.document.${this.isActiveEffect ? "effectTitle" : "itemTitle"}`);
   }

   get label() {
      return this.document.name ?? this.document.label ?? "";
   }

   async _renderFrame(options) {
      const frame = await super._renderFrame(options);
      const buttons = [headerButton("info", "fa-solid fa-circle-info", "autoanimations.ui.document.info")];
      if (game.user.isGM) { buttons.unshift(headerButton("openAutorec", "fa-solid fa-globe", "autoanimations.ui.document.openAutorec")); }
      frame.querySelector("[data-action=close]").before(...buttons);
      return frame;
   }

   _matches() {
      const name = this.label;
      const rinsed = AAAutorecFunctions.rinseName(name);
      const menus = AAAutorecManager.getAutorecEntries();
      delete menus.version;
      const aefx = AAAutorecFunctions.singleMenuSearch(menus.aefx, rinsed, name);
      if (this.isActiveEffect) { return { autorec: aefx, aefx: false }; }
      delete menus.aefx;
      return { autorec: AAAutorecFunctions.allMenuSearch(AAAutorecFunctions.sortAndFilterMenus(menus), rinsed, name), aefx };
   }

   get dirty() {
      return JSON.stringify(this.entry) !== this._saved;
   }

   async _prepareContext() {
      return { id: this.entry.id };
   }

   _statusContext() {
      const e = this.entry;
      const { autorec, aefx } = this._matches();
      const anim = (key) => game.i18n.localize(`autoanimations.animTypes.${key}`);
      const typeOptions = this.isActiveEffect
         ? [["ontoken", anim("ontoken")], ["aura", anim("aura")]]
         : ITEM_MENUS.map((m) => [m, anim(m)]);
      const current = this.isActiveEffect ? e.activeEffectType : e.menu;
      let status;
      if (autorec && aefx) { status = `${game.i18n.localize("autoanimations.menus.globalFound")} + ${game.i18n.localize("autoanimations.menus.activeEffect")}`; }
      else if (autorec) { status = game.i18n.localize("autoanimations.menus.globalFound"); }
      else if (aefx) { status = `${game.i18n.localize("autoanimations.menus.activeEffect")} ${game.i18n.localize("autoanimations.menus.matchFound")}`; }
      else { status = game.i18n.localize("autoanimations.menus.globalNotFound"); }

      return {
         entry: e,
         enabledLabel: `${game.i18n.localize("autoanimations.menus.animation")} ${game.i18n.localize("autoanimations.menus.enabled")}`,
         customizeLabel: `${game.i18n.localize("autoanimations.menus.customize")} ${this.document.documentName === "Activity" ? "Activity" : "Item"}`,
         matched: !!(autorec || aefx),
         status,
         typeOptions: typeOptions.map(([value, label]) => ({ value, label, selected: value === current })),
         customizable: e.isEnabled,
         typeEnabled: e.isEnabled && e.isCustomized,
         info: {
            enabled: e.isEnabled,
            customized: e.isCustomized,
            autorec: autorec ? { menu: anim(autorec.menu), label: autorec.label } : null,
            aefx: aefx ? { menu: anim("aefx"), label: aefx.label } : null,
         },
      };
   }

   async _onRender(context, options) {
      await super._onRender(context, options);
      const root = this.element;
      this.editor.activate(root);
      if (!root.dataset.aaDocument) {
         root.dataset.aaDocument = "true";
         root.addEventListener("change", (event) => {
            const { name, checked, value } = event.target;
            if (name === "animationType") { this._changeType(value); }
            else if (name === "isEnabled" || name === "isCustomized") {
               this.entry[name] = checked;
               this._renderEditor();
            }
         });
         new foundry.applications.ux.ContextMenu(root, ".aa-copy-menu", this._copyMenuItems(), { eventName: "click", jQuery: false, fixed: true });
      }
      await this._renderEditor();
   }

   _renderEditor() {
      return this.editor.render(this.element.querySelector(".aa-editor"), this.entry);
   }

   async close(options = {}) {
      if (!options.force && this.dirty && !await confirmDiscard()) { return this; }
      return super.close(options);
   }

   _changeType(type) {
      const keep = (({ id, label, isEnabled, isCustomized, fromAmmo, version }) => ({ id, label, isEnabled, isCustomized, fromAmmo, version }))(this.entry);
      if (this.isActiveEffect) {
         this.entry = { ...newEntry("aefx", this.entry, type), ...keep };
      } else {
         this.entry = { ...newEntry(type, this.entry), ...keep };
      }
      if (this.isActiveEffect) { delete this.entry.fromAmmo; }
      this._renderEditor();
   }

   _copyMenuItems() {
      const items = [{
         label: "autoanimations.ui.document.copyFrom",
         icon: "far fa-clone",
         onClick: () => this._copyFromAutorec(),
      }];
      if (game.user.isGM) {
         items.push({ label: "autoanimations.ui.document.copyTo", icon: "far fa-clone", onClick: () => this._copyToAutorec() });
      }
      return items;
   }

   async _copyFromAutorec() {
      if (!this.entry.isEnabled) { return; }
      const { autorec } = this._matches();
      if (!autorec) { return ui.notifications.info(`Automated Animations | ${t("noMatchToCopy")}`); }
      const menu = game.i18n.localize(`autoanimations.animTypes.${autorec.menu}`);
      const ok = await DialogV2.confirm({
         window: { title: "autoanimations.ui.document.copyFromTitle" },
         content: `<p>${t("copyFromContent", { label: foundry.utils.escapeHTML(autorec.label), menu })}</p>`,
      });
      if (!ok) { return; }
      const data = foundry.utils.deepClone(autorec);
      const { id, label, isEnabled, isCustomized, fromAmmo, version } = this.entry;
      delete data.metaData;
      delete data.advanced;
      this.entry = { ...data, id, label, isEnabled, isCustomized, fromAmmo, version };
      if (this.isActiveEffect) { delete this.entry.fromAmmo; }
      this._renderEditor();
   }

   async _copyToAutorec() {
      const e = this.entry;
      if (!e.isEnabled || !e.isCustomized) {
         return custom_warning(t("notConfigured"), true);
      }
      const menu = e.menu;
      const menuLabel = game.i18n.localize(`autoanimations.animTypes.${menu}`);
      const entries = AAAutorecManager.getMenu(menu);
      const exists = (name) => AAAutorecFunctions.singleMenuStrictSearch(entries, AAAutorecFunctions.rinseName(name));
      const label = await DialogV2.prompt({
         window: { title: "autoanimations.ui.document.copyToTitle" },
         content: `
            <p><strong>${t("copyToHeading", { menu: menuLabel })}</strong></p>
            <div class="form-group"><label>${t("copyToLabel", { menu: menuLabel })}</label><input type="text" name="label" value="${foundry.utils.escapeHTML(this.label)}"></div>
            <p class="aa-copy-warning"></p>`,
         render: (event, dialog) => {
            const input = dialog.element.querySelector("[name=label]");
            const warning = dialog.element.querySelector(".aa-copy-warning");
            const submit = dialog.element.querySelector("[data-action=ok]");
            const check = () => {
               const taken = exists(input.value);
               warning.textContent = taken ? t("copyToExists", { label: input.value, menu: menuLabel }) : "";
               submit.disabled = !!taken;
            };
            input.addEventListener("input", check);
            check();
         },
         ok: { label: "autoanimations.menus.submit", callback: (event, button) => button.form.elements.label.value },
      });
      if (!label) { return; }
      const data = foundry.utils.deepClone(e);
      for (const key of ["fromAmmo", "isCustomized", "isEnabled", "version"]) { delete data[key]; }
      const fresh = newEntry(menu);
      for (const key of Object.keys(data)) { if (!(key in fresh) && key !== "label") { delete data[key]; } }
      data.id = foundry.utils.randomID(16);
      data.label = label;
      let copy;
      try { copy = validateEntry(data); }
      catch (err) { return ui.notifications.error(`Automated Animations | ${game.i18n.format("autoanimations.ui.common.notCopied", { error: validationMessage(err) })}`); }
      await AAAutorecManager.setMenu(menu, [...entries, copy]);
      ui.notifications.info(`Automated Animations | ${t("copyToAdded", { label, menu: menuLabel })}`);
   }

   static async _onSave() {
      this.entry.label = this.label;
      let flags;
      try { flags = validateEntry(this.entry); }
      catch (err) { return ui.notifications.error(`Automated Animations | ${game.i18n.format("autoanimations.ui.common.notSaved", { error: validationMessage(err) })}`); }
      await setFlags(this.document, flags);
      this.entry = foundry.utils.deepClone(flags);
      this._saved = JSON.stringify(this.entry);
      ui.notifications.info(`Automated Animations | ${game.i18n.localize("autoanimations.ui.common.saved")}`);
      await this._renderEditor();
   }

   static _onInfo() {
      DialogV2.prompt({
         window: { title: "autoanimations.ui.document.info" },
         content: `
            <table>
               <tr><th colspan="2">${t("infoSettings")}</th></tr>
               <tr><td><strong>${game.i18n.localize("autoanimations.menus.animation")} ${game.i18n.localize("autoanimations.menus.enabled")}</strong></td><td>${t("infoEnabled")}</td></tr>
               <tr><td><strong>${game.i18n.localize("autoanimations.menus.customize")} ${game.i18n.localize("autoanimations.menus.item")}</strong></td><td>${t("infoCustomize")}</td></tr>
            </table>`,
      });
   }
}

export function openAnimationMenu(document) {
   const system = game.system.id;
   const isActiveEffect = document.documentName === "ActiveEffect"
      || (system === "pf1" && document.type === "buff")
      || (["pf2e", "sf2e"].includes(system) && ["condition", "effect"].includes(document.type));
   return new DocumentMenu(document, { isActiveEffect }).render({ force: true });
}

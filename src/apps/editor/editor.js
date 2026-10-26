import { buildTabs, choices } from "./context.js";
import { menuOptions } from "../../database/databaseSort.js";
import { entryClass, newEntry } from "../../data/entries.js";
import { MODULE_ID } from "../../constants.js";
import { TintPreviews } from "./tint-preview.js";

const { getProperty, setProperty } = foundry.utils;
const TEMPLATE = `modules/${MODULE_ID}/templates/editor/tabs.hbs`;

const SPRITES = {
   explosion: "modules/levels-3d-preview/assets/particles/dust.png",
   sprite: "modules/canvas3dcompendium/assets/Tiles/RPG%20Items/Arrow_Golden.glb",
   default: "modules/levels-3d-preview/assets/particles/emberssmall.png",
};

export class AnimationEditor {
   tintPreviews = new TintPreviews();

   constructor(host) {
      this.host = host;
      try { this.open = JSON.parse(sessionStorage.getItem(host.storageKey)) ?? {}; }
      catch (err) { this.open = {}; }
      if (Array.isArray(this.open)) { this.open = {}; }
   }

   setOpen(key, open) {
      this.open[key] = open;
      try { sessionStorage.setItem(this.host.storageKey, JSON.stringify(this.open)); }
      catch (err) { /* storage unavailable */ }
   }

   async render(container, entry) {
      const leading = (await this.host.leadingTabs?.()) ?? [];
      const tabs = [...leading, ...buildTabs(entry, this.host.tabOptions?.())];
      const groups = this.host.app.tabGroups;
      const active = tabs.find((t) => t.id === groups.aa && !t.disabled) ?? tabs.find((t) => !t.disabled) ?? tabs[0];
      groups.aa = active.id;
      for (const t of tabs) { t.active = t === active; }

      const prefix = `${entry.id}:`;
      const open = Object.fromEntries(Object.entries(this.open)
         .filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key.slice(prefix.length), value]));

      const focused = container.contains(document.activeElement) ? document.activeElement.getAttribute("name") : null;
      const scroll = container.querySelector(`.aa-tab[data-tab="${active.id}"] .aa-tab-main`)?.scrollTop ?? 0;
      const html = await foundry.applications.handlebars.renderTemplate(TEMPLATE, { tabs, open, choices: choices() });
      this.tintPreviews.saveTimes(container);
      container.innerHTML = html;
      addHints(container, entry);
      this.tintPreviews.activate(container);
      container.querySelector(".aa-tab.active .aa-tab-main")?.scrollTo(0, scroll);
      if (focused) { container.querySelector(`[name="${CSS.escape(focused)}"]:not([type=range])`)?.focus(); }
   }

   activate(root) {
      if (root.dataset.aaEditor) { return; }
      root.dataset.aaEditor = "true";
      root.addEventListener("change", (event) => this._onChange(event));
      root.addEventListener("input", (event) => this.tintPreviews.onInput(event));
      root.addEventListener("click", (event) => this._onClick(event));
      root.addEventListener("toggle", (event) => this._onToggle(event), true);
      root.addEventListener("focusin", (event) => {
         if (event.target.name === "macro.name") {
            event.target.setAttribute("list", "aa-macro-list");
            fillMacroList();
         }
      });
   }

   _context(element) {
      const container = element.closest("[data-entry-id]");
      if (!container) { return {}; }
      return { container, entry: this.host.getEntry(container.dataset.entryId) };
   }

   async _commit(container, entry) {
      delete entry.metaData;
      await this.host.commit(entry);
      await this.render(container, entry);
   }

   async _onChange(event) {
      const el = event.target;
      const path = el.getAttribute?.("name");
      if (!path || el.closest(".aa-status")) { return; }
      const { container, entry } = this._context(el);
      if (!entry) { return; }
      event.stopPropagation();

      // The schema field decides the type of the value.
      const field = schemaField(entry, path);
      let value;
      if (el.type === "checkbox") { value = el.checked; }
      else if (field instanceof foundry.data.fields.BooleanField) { value = el.value === "true"; }
      else if (field instanceof foundry.data.fields.NumberField) { value = el.value === "" ? null : Number(el.value); }
      else { value = el.value; }
      setProperty(entry, path, value);
      if (path.endsWith(".options.saturate")) { delete getProperty(entry, path.slice(0, -".saturate".length))?.saturation; }

      switch (el.dataset.cascade) {
         case "menuType":
         case "animation":
         case "variant":
            cascadeVideo(entry, el.dataset.video, el.dataset.db, el.dataset.cascade);
            break;
         case "levels3dType":
            setProperty(entry, "levels3d.data.spritePath", SPRITES[value] ?? SPRITES.default);
            break;
      }
      if (path === "menu") {
         const fresh = newEntry(value, entry);
         for (const key of Object.keys(entry)) { delete entry[key]; }
         Object.assign(entry, fresh);
      } else if (path === "presetType") {
         const fresh = newEntry("preset", entry, value);
         entry.data = fresh.data;
         for (const key of ["secondary", "target"]) {
            if (fresh[key]) { entry[key] ??= fresh[key]; }
            else { delete entry[key]; }
         }
      } else if (path === "activeEffectType") {
         entry.primary = newEntry("aefx", entry, value).primary;
      }
      await this._commit(container, entry);
   }

   async _onClick(event) {
      const el = event.target.closest("[data-action]");
      if (!el) { return; }
      const { container, entry } = this._context(el);
      if (!entry) { return; }
      const path = el.dataset.path;

      switch (el.dataset.action) {
         case "addTerm":
            entry.advanced ??= {};
            (entry.advanced.excludedTerms ??= []).push("");
            return this._commit(container, entry);
         case "removeTerm":
            entry.advanced?.excludedTerms?.splice(Number(el.dataset.index), 1);
            return this._commit(container, entry);
         case "logMetadata":
            if (!entry.metaData) { return ui.notifications.info(`Automated Animations | ${game.i18n.localize("autoanimations.ui.editor.noMetaData")}`); }
            console.log(entry.metaData);
            ui.notifications.info(`Automated Animations | ${game.i18n.localize("autoanimations.ui.editor.metaDataLogged")}`);
            return Hooks.callAll("AutomatedAnimations.metaData", entry);
         case "filePicker": {
            event.preventDefault();
            const FilePicker = foundry.applications.apps.FilePicker.implementation;
            return new FilePicker({
               type: el.dataset.type,
               current: getProperty(entry, path) ?? "",
               callback: (file) => {
                  setProperty(entry, path, file);
                  this._commit(container, entry);
               },
            }).render(true);
         }
         case "dbViewer":
            return Sequencer.DatabaseViewer.show();
         case "playSound": {
            const sound = getProperty(entry, path) ?? {};
            if (!sound.file) { return; }
            return new Sequence().sound().file(sound.file).volume(sound.volume ?? 0.75).startTime(sound.startTime ?? 0).play();
         }
         case "openMacro":
            return openMacro(entry.macro?.name);
      }
   }

   _onToggle(event) {
      const details = event.target;
      if (!(details instanceof HTMLDetailsElement) || !details.dataset.key) { return; }
      const { entry } = this._context(details);
      if (!entry) { return; }
      this.setOpen(`${entry.id}:${details.dataset.key}`, details.open);
   }
}

function cascadeVideo(entry, path, dbSection, changed) {
   const v = getProperty(entry, path);
   if (!v) { return; }
   const section = v.dbSection || dbSection;
   const first = (list) => list?.[0]?.[0];
   if (changed === "menuType") { v.animation = first(menuOptions.animations[section]?.[v.menuType]); }
   if (changed !== "variant") { v.variant = first(menuOptions.variants[section]?.[v.menuType]?.[v.animation]); }
   v.color = first(menuOptions.colors[section]?.[v.menuType]?.[v.animation]?.[v.variant]);
}

export async function openMacro(name) {
   if (!name) { return ui.notifications.info(`Automated Animations | ${game.i18n.localize("autoanimations.ui.editor.noMacro")}`); }
   if (name.startsWith("Compendium")) {
      const [, scope, packName, ...rest] = name.split(".");
      const pack = game.packs.get(`${scope}.${packName}`);
      if (!pack) { return ui.notifications.info(`Automated Animations | ${game.i18n.format("autoanimations.ui.editor.compendiumNotFound", { pack: `${scope}.${packName}` })}`); }
      const index = await pack.getIndex();
      const found = index.find((m) => m.name === rest.join("."));
      if (!found) { return ui.notifications.info(`Automated Animations | ${game.i18n.format("autoanimations.ui.editor.compendiumMacroNotFound", { name: rest.join("."), pack: `${scope}.${packName}` })}`); }
      return (await pack.getDocument(found._id)).sheet.render(true);
   }
   const macro = game.macros.getName(name);
   if (!macro) { return ui.notifications.info(`Automated Animations | ${game.i18n.format("autoanimations.ui.editor.macroNotFound", { name })}`); }
   macro.sheet.render(true);
}

async function fillMacroList() {
   let list = document.getElementById("aa-macro-list");
   if (!list) {
      list = document.createElement("datalist");
      list.id = "aa-macro-list";
      document.body.append(list);
   }
   const names = game.macros.map((m) => m.name);
   for (const pack of game.packs.filter((p) => p.documentName === "Macro")) {
      const index = await pack.getIndex();
      for (const m of index) { names.push(`Compendium.${pack.collection}.${m.name}`); }
   }
   list.replaceChildren(...names.map((name) => Object.assign(document.createElement("option"), { value: name })));
}

function schemaField(entry, path) {
   try { return entryClass(entry)?.schema.getField(path); }
   catch (err) { return undefined; }
}

function addHints(container, entry) {
   for (const input of container.querySelectorAll("[name], [data-hint]")) {
      const field = input.hasAttribute("name") ? schemaField(entry, input.getAttribute("name")) : undefined;
      if (field && input.tagName === "INPUT" && !input.getAttribute("placeholder") && ["number", "string"].includes(typeof field.initial)) {
         input.setAttribute("placeholder", String(field.initial));
      }
      const key = `autoanimations.hints.${field?.name}`;
      const hint = input.dataset.hint || (field && game.i18n.has(key) ? game.i18n.localize(key) : "");
      const label = input.closest(".form-group")?.querySelector(":scope > label");
      if (hint && label && !label.querySelector(".aa-hint")) {
         label.insertAdjacentHTML("afterbegin", `<i class="aa-hint fa-solid fa-circle-question" data-tooltip="${foundry.utils.escapeHTML(hint)}"></i> `);
      }
   }
}

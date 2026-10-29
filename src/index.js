import "../styles/autoanimations.scss";

import { MODULE_ID, AnimationState, aaDeletedItems } from "./constants.js";
import { registerSettings } from "./settings.js";
import { setupSocket } from "./socket.js";
import { initializeAADB } from "./database/databaseSort.js";
import { AAAutorecManager } from "./autorec/manager.js";
import { setSystemFlagSource } from "./autorec/flags.js";
import { playAnimation } from "./system-support/external.js";
import { registerActiveEffectHooks } from "./active-effects/handleActiveEffectHooks.js";
import * as systemSupport from "./system-support/index.js";
import { preloadTemplates } from "./apps/templates.js";
import { AutorecMenu } from "./apps/AutorecMenu.js";
import { openAnimationMenu } from "./apps/DocumentMenu.js";
import { ENTRY_CLASSES, entryClass, labelFields, readEntry, validateEntry } from "./data/entries.js";

Hooks.once("init", () => {
   preloadTemplates();
});

Hooks.once("i18nInit", () => {
   labelFields();
   registerSettings();
   game.settings.registerMenu(MODULE_ID, "custom-autorec", {
      name: "autoanimations.settings.menuName",
      hint: "autoanimations.settings.menuHint",
      label: "autoanimations.settings.launchMenu",
      icon: "fas fa-dice-d20",
      type: AutorecMenuLauncher,
      restricted: true,
   });
});

Hooks.once("socketlib.ready", setupSocket);

Hooks.once("ready", async () => {
   AnimationState.enabled = game.settings.get(MODULE_ID, "killAllAnim") !== "off";
   registerHeaderButtons();
   await AAAutorecManager.checkVersion();

   Hooks.on("deleteItem", (item) => aaDeletedItems.set(item.id, item));

   const systemId = game.system.id.replace(/-/g, "").toLowerCase();
   const adapter = Object.entries(systemSupport).find(([name]) => name.toLowerCase() === systemId)?.[1];
   if (adapter?.flagSource) { setSystemFlagSource(adapter.flagSource); }
   (adapter ?? systemSupport.standard).systemHooks();
   registerActiveEffectHooks();

   await initializeAADB();
   Hooks.callAll("aa.initialize");
});

Hooks.on("AutomaticAnimations.Open.Menu.New", () => AutorecMenu.show());
Hooks.on("AA.Open.AutorecSetting", () => AutorecMenu.show());
Hooks.on("AutomaticAnimations.Clear.Data", () => AAAutorecManager.restoreDefault());

Hooks.on("aa.workflow", (token, item, options) => playAnimation(token, item, options));

globalThis.AutomatedAnimations = {
   AutorecManager: AAAutorecManager,
   playAnimation: (sourceToken, item, options = {}) => playAnimation(sourceToken, item, options),
   openAnimationMenu,
   showAutorecMenu: () => AutorecMenu.show(),
   DataModels: { ENTRY_CLASSES, entryClass, readEntry, validateEntry },
};

function canConfigure() {
   return game.user.isGM || !game.settings.get(MODULE_ID, "hideFromPlayers");
}

function registerHeaderButtons() {
   Hooks.on("getHeaderControlsApplicationV2", (app, controls) => {
      const doc = app.document;
      if (!["Item", "ActiveEffect", "Activity"].includes(doc?.documentName) || !canConfigure()) { return; }
      controls.push({
         class: "aaItemSettings",
         icon: "fas fa-biohazard",
         label: "Automated Animations",
         onClick: () => openAnimationMenu(doc),
      });
   });

   // Systems still using AppV1 item sheets.
   Hooks.on("getItemSheetHeaderButtons", (sheet, buttons) => {
      if (!canConfigure()) { return; }
      buttons.unshift({ class: "aaItemSettings", icon: "fas fa-biohazard", label: "A-A", onclick: () => openAnimationMenu(sheet.item) });
   });

   Hooks.once("tidy5e-sheet.ready", (api) => {
      api.registerItemHeaderControls?.({
         controls: [{
            icon: "fas fa-biohazard",
            label: "A-A",
            onClickAction() { openAnimationMenu(this.document); },
         }],
      });
   });
}

class AutorecMenuLauncher extends foundry.applications.api.ApplicationV2 {
   render() {
      AutorecMenu.show();
      return this;
   }
}

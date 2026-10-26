import { MODULE_ID } from "../constants.js";

const partials = (prefix, folder, names) => names.map((name) => [`${prefix}${name}`, `modules/${MODULE_ID}/templates/${folder}/${name}.hbs`]);

const PARTIALS = Object.fromEntries([
   ...partials("aa-", "editor/parts", ["group", "video", "sound", "tint", "preview", "size", "delay", "elevation", "sprite", "particles", "particle-colors"]),
   ...partials("aa-tab-", "editor/tabs", ["general", "primary", "section", "preset-part", "thunderwave", "after-image", "movement", "motion", "canvas3d"]),
   ...partials("aa-options-", "editor/options", [
      "melee", "range", "ontoken", "templatefx", "aura", "source", "secondary", "target",
      "preset-dualattach", "preset-proToTemp", "preset-teleport-end", "preset-teleport-between",
   ]),
]);

export function preloadTemplates() {
   return foundry.applications.handlebars.loadTemplates(PARTIALS);
}

export const templatePath = (name) => `modules/${MODULE_ID}/templates/${name}.hbs`;

export function headerButton(action, icon, tooltip) {
   const button = document.createElement("button");
   button.type = "button";
   button.className = `header-control icon ${icon}`;
   button.dataset.action = action;
   button.dataset.tooltip = tooltip;
   return button;
}

export async function confirmDiscard() {
   return !!await foundry.applications.api.DialogV2.confirm({
      window: { title: "autoanimations.ui.common.unsavedTitle" },
      content: `<p>${game.i18n.localize("autoanimations.ui.common.unsavedContent")}</p>`,
   });
}

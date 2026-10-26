import { AAAutorecManager, AUTOREC_MENUS } from "../autorec/manager.js";
import { templatePath } from "./templates.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const MENU_MANAGER = "autoanimations.ui.menuManager";
const t = (key) => game.i18n.localize(`${MENU_MANAGER}.${key}`);

export class MenuManager extends HandlebarsApplicationMixin(ApplicationV2) {
   static _instance;

   static show() {
      this._instance ??= new MenuManager();
      return this._instance.render({ force: true });
   }

   static DEFAULT_OPTIONS = {
      id: "Autorec-Menu-Manager",
      classes: ["autoanimations", "aa-dialog", "aa-menu-manager"],
      window: { title: "autoanimations.ui.menuManager.title", contentClasses: ["standard-form"] },
      position: { width: 560, height: "auto" },
      actions: {
         restore: MenuManager._onRestore,
         merge: (event) => MenuManager._import("merge"),
         overwrite: (event) => MenuManager._import("overwrite"),
         export: MenuManager._onExport,
         deleteMenus: MenuManager._onDelete,
      },
   };

   static PARTS = { main: { template: templatePath("menu-manager") } };

   static async _onRestore() {
      const ok = await DialogV2.confirm({
         window: { title: "autoanimations.ui.common.warning" },
         content: `<p>${t("restoreContent")}</p><p>${game.i18n.localize("autoanimations.ui.common.backupExported")}</p>`,
      });
      if (!ok) { return; }
      AAAutorecManager.exportMenu("-backup");
      await AAAutorecManager.restoreDefault();
      this.close();
   }

   static _onExport() {
      AAAutorecManager.exportMenu(`-${game.system.id}`);
      this.close();
   }

   static async _onDelete() {
      const result = await chooseMenus({ title: `${MENU_MANAGER}.deleteTitle`, legend: t("deleteLegend"), okLabel: "autoanimations.menus.delete" });
      if (!result) { return; }
      const menus = AUTOREC_MENUS.filter((menu) => result.menus[menu]);
      if (!menus.length) { return; }
      const names = menus.map((menu) => game.i18n.localize(`autoanimations.animTypes.${menu}`)).join(", ");
      const ok = await DialogV2.confirm({
         window: { title: "autoanimations.ui.common.warning" },
         content: `<p>${game.i18n.format(`${MENU_MANAGER}.deleteContent`, { menus: names })}</p><p>${game.i18n.localize("autoanimations.ui.common.backupExported")}</p>`,
      });
      if (!ok) { return; }
      AAAutorecManager.exportMenu("-backup");
      for (const menu of menus) { await AAAutorecManager.setMenu(menu, []); }
   }

   static async _import(mode) {
      const warning = `<p>${t(mode === "merge" ? "mergeContent" : "overwriteContent")}</p>`;
      if (!await DialogV2.confirm({ window: { title: "autoanimations.ui.common.warning" }, content: warning })) { return; }

      const result = await chooseMenus({
         title: `${MENU_MANAGER}.${mode === "merge" ? "mergeTitle" : "overwriteTitle"}`,
         legend: t("importLegend"),
         okLabel: `${MENU_MANAGER}.import`,
         file: true,
      });
      if (!result) { return; }
      if (!result.file) { return ui.notifications.error(t("noFile")); }
      const json = await foundry.utils.readTextFromFile(result.file);
      if (mode === "merge") { await AAAutorecManager.mergeMenus(json, result.menus); }
      else { await AAAutorecManager.overwriteMenus(json, result.menus); }
      MenuManager._instance?.close();
   }
}

function chooseMenus({ title, legend, okLabel, file = false }) {
   const checkboxes = AUTOREC_MENUS.map((menu) => `<label class="checkbox"><input type="checkbox" name="${menu}"> ${game.i18n.localize(`autoanimations.animTypes.${menu}`)}</label>`).join("");
   return DialogV2.prompt({
      window: { title },
      content: `
         ${file ? `<div class="form-group"><label>${t("sourceData")}</label><input type="file" name="data" accept=".json"></div>` : ""}
         <fieldset class="aa-import-menus">
            <legend>${legend}</legend>
            <label class="checkbox"><input type="checkbox" name="all"> ${t("checkAll")}</label>
            ${checkboxes}
         </fieldset>`,
      render: (event, dialog) => {
         const all = dialog.element.querySelector("[name=all]");
         all.addEventListener("change", () => {
            for (const menu of AUTOREC_MENUS) { dialog.element.querySelector(`[name=${menu}]`).checked = all.checked; }
         });
      },
      ok: {
         label: okLabel,
         callback: (event, button) => {
            const form = button.form;
            return { file: form.elements.data?.files[0], menus: Object.fromEntries(AUTOREC_MENUS.map((menu) => [menu, form.elements[menu].checked])) };
         },
      },
   });
}

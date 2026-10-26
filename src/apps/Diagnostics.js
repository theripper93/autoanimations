import { socketlibSocket, checkSettings } from "../socket.js";
import { templatePath } from "./templates.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class Diagnostics extends HandlebarsApplicationMixin(ApplicationV2) {
   static DEFAULT_OPTIONS = {
      id: "AutomatedAnimations-Diagnostics",
      classes: ["autoanimations", "aa-dialog", "aa-diagnostics"],
      window: { title: "autoanimations.ui.diagnostics.title", resizable: true, contentClasses: ["standard-form"] },
      position: { width: 600, height: "auto" },
      actions: { rerun: function () { this.render(); } },
   };

   static PARTS = { main: { template: templatePath("diagnostics") } };

   userId = game.user.id;

   async _prepareContext() {
      const users = Object.fromEntries(game.users.filter((u) => u.active).map((u) => [u.id, u.name]));
      const settings = this.userId === game.user.id || !socketlibSocket
         ? await checkSettings()
         : await socketlibSocket.executeAsUser("checkSettings", this.userId);
      const permissions = ["Player", "Trusted", "Assistant", "GM"].map((p) => game.i18n.localize(`SEQUENCER.Permission.${p}`));
      const midiActive = !!game.modules.get("midi-qol")?.active;
      const sections = [
         { title: d("core"), rows: [check(!settings.coreSettings.photoSensitive, "photosensitiveOff", "photosensitiveOn")] },
         { title: d("sequencer"), rows: [
            check(settings.sequencerSettings.effects, "effectsOn", "effectsOff"),
            check(settings.sequencerSettings.sounds, "soundsOn", "soundsOff"),
            status("info", game.i18n.format(`${DIAGNOSTICS}.permission`, { permission: permissions[settings.sequencerSettings.permission] ?? settings.sequencerSettings.permission })),
         ] },
         { title: d("aa"), rows: [
            check(settings.aaSettings.effects, "effectsOn", "effectsOff"),
            check(!settings.aaSettings.autorec, "autorecOn", "autorecOff"),
         ] },
      ];
      if (midiActive) {
         sections.push({ title: d("midi"), rows: [check(game.settings.get("midi-qol", "EnableWorkflow"), "midiOn", "midiOff")] });
      }
      return { users, userId: this.userId, sections };
   }

   async _onFirstRender(context, options) {
      await super._onFirstRender(context, options);
      this.element.addEventListener("change", (event) => {
         if (event.target.name !== "user") { return; }
         this.userId = event.target.value;
         this.render();
      });
   }
}

const DIAGNOSTICS = "autoanimations.ui.diagnostics";
const d = (key) => game.i18n.localize(`${DIAGNOSTICS}.${key}`);

const STATUS = {
   good: { icon: "fa-check", tooltip: `${DIAGNOSTICS}.good` },
   bad: { icon: "fa-triangle-exclamation", tooltip: `${DIAGNOSTICS}.bad` },
   info: { icon: "fa-circle-info", tooltip: `${DIAGNOSTICS}.info` },
};
const status = (key, label) => ({ status: key, label, ...STATUS[key] });
const check = (good, goodKey, badKey) => (good ? status("good", d(goodKey)) : status("bad", d(badKey)));

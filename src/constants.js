export const MODULE_ID = "autoanimations";

export const AnimationState = { enabled: true };

export const aaDeletedItems = new Map();

export function debug(...args) {
   if (game.settings.get(MODULE_ID, "debug")) {
      console.log(`DEBUG | Automated Animations |`, ...args);
   }
}

export function custom_notify(message, consoleLog = false) {
   message = `Automated Animations | ${message}`;
   if (consoleLog) {
      console.log(`%c${message.replace("<br>", "\n")}`, "color: orange");
   } else {
      ui.notifications.info(message);
   }
}

export function custom_warning(warning, notify = false, ...args) {
   warning = `Automated Animations | ${warning}`;
   if (notify) {
      ui.notifications.warn(warning);
   }
   console.warn(warning.replace("<br>", "\n"), ...args);
}

export function custom_error(error, notify = true) {
   error = `Automated Animations | ${error}`;
   if (notify) {
      ui.notifications.error(error);
   }
   return new Error(error.replace("<br>", "\n"));
}

export function howToDelete(type) {
   if (game.settings.get(MODULE_ID, "noTips")) { return; }
   const n = (key) => game.i18n.localize(`autoanimations.ui.notify.${key}`);
   const disableTips = n("disableTips");
   switch (type) {
      case "overheadtile":
         custom_notify(`${n("overheadTile")} ${disableTips}`);
         break;
      case "groundtile":
         custom_notify(`${n("groundTile")} ${disableTips}`);
         break;
      case "sequencerground":
         custom_notify(`${n("sequencerEffect")} ${disableTips}`);
         break;
   }
}

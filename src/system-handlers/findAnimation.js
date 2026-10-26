import { AAAutorecFunctions } from "../autorec/search.js";
import { AAAutorecManager } from "../autorec/manager.js";
import { getFlags } from "../autorec/flags.js";
import { debug } from "../constants.js";

export async function handleItem(data) {

    // GTFO if no Item was sent
    if (!data.item) { return; };

    const item = data.item;
    const activity = data.activity;
    const itemName = item.name ?? item.label;
    const rinsedItemName = itemName ? AAAutorecFunctions.rinseName(itemName) : "noitem";

    const ammoItem = data.ammoItem;
    const rinsedAmmoName = ammoItem?.name ? AAAutorecFunctions.rinseName(ammoItem.name) : "";

    const itemFlags = getFlags(item) || {};
    const activityFlags = activity ? getFlags(activity) || {} : null;
    const ammoFlags = ammoItem ? getFlags(ammoItem) || {isEnabled: true} : null;

    let autorecDisabled = game.settings.get("autoanimations", "disableAutoRec");
    if (autorecDisabled) {
        debug("Global Automatic Recognition menu is Disabled from the Module Settings");
    }

    const autorecSettings = AAAutorecManager.getAutorecEntries();
    delete autorecSettings.version;
    if (!data.activeEffect) autorecSettings.aefx = [];

    let menus = AAAutorecFunctions.sortAndFilterMenus(autorecSettings);

    let autorecObject;

    // If Item has Ammo, search for matching animations. If found, return it, otherwise keep going
    if (ammoItem && ammoFlags.isEnabled) {
        if (ammoFlags.isCustomized) {
            return ammoFlags;
        } else if (!autorecDisabled) {
            autorecObject = AAAutorecFunctions.allMenuSearch(menus, rinsedAmmoName, ammoItem?.name || "");
        }
        if (autorecObject) { return autorecObject }
    }

    const activityIsEnabled = activityFlags ? (!!activityFlags.killAnim ? false : activityFlags.isEnabled ?? true) : true;
    if (!activityIsEnabled) { return false }

    const itemIsEnabled = !!itemFlags.killAnim ? false : itemFlags.isEnabled ?? true;
    if (!itemIsEnabled) { return false }
    
    if (data.activeEffect) {
        if (itemFlags.isCustomized) {
            return itemFlags
        } else if (!autorecDisabled) {
            autorecObject = AAAutorecFunctions.singleMenuSearch(autorecSettings.aefx, rinsedItemName, itemName);
            return autorecObject;
        }
    } else {
        if (activityFlags?.isCustomized) {
            return activityFlags;
        } else if (itemFlags.isCustomized) {
            return itemFlags;
        } else if (!autorecDisabled) {
            const prioritizedNames = [...(data.overrideNames || []), itemName, ...(data.extraNames || [])];
            prioritizedNames.find((name) => {
                const rinsedName = AAAutorecFunctions.rinseName(name);
                const found = AAAutorecFunctions.allMenuSearch(menus, rinsedName, name);
                if (found) {
                    autorecObject = found;
                    data.rinsedName = rinsedName;
                }
                return !!found;
            });

            if (!autorecObject && data.isVariant && !data.isTemplate) {
                let originalItemName = data.originalItem?.name
                let originalRinsedName = originalItemName ? AAAutorecFunctions.rinseName(originalItemName) : "noitem"
                autorecObject = AAAutorecFunctions.allMenuSearch(menus, originalRinsedName, originalItemName);
            }
        }
    }

    if (autorecObject && data.isTemplate && !autorecDisabled) {
        let data = autorecObject;
        if (data.menu === "range" || data.menu === "melee" || data.menu === "ontoken") {
            autorecObject = AAAutorecFunctions.singleMenuSearch(autorecSettings.templatefx, rinsedItemName, itemName);
        }
    } else if ( data.isVariant && !autorecObject && data.isTemplate && !autorecDisabled) {
        // For use with Variant spell casting, based off PF2e. If the variant name is not found in the Global menu, it looks for one matching the original name
        let newItemName = data.originalItem?.name;
        let newRinsedName = newItemName ? AAAutorecFunctions.rinseName(newItemName) : "noitem";
        autorecObject = AAAutorecFunctions.allMenuSearch(menus, newRinsedName, newItemName);
    }
    return autorecObject;
}

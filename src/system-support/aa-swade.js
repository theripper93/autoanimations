import { debug } from "../constants/constants.js";
import { trafficCop } from "../router/traffic-cop.js";
import AAHandler from "../system-handlers/workflow-data.js";
import { getRequiredData } from "./getRequiredData.js";

export function systemHooks() {
    /**
     * Default system hooks
     */
    Hooks.on("swadeAction", async (SwadeTokenOrActor, SwadeItem, SwadeAction, SwadeRoll, userId) => {
        if (!SwadeRoll) { return; }
        const playtrigger = game.settings.get("autoanimations", "playtrigger");
        if (!SwadeItem.system.damage || //If the item doesn't have damage, we run anims on trait rolls regardless of the playtrigger setting
            (SwadeAction === "damage" && playtrigger === "onDamage") || //This is a damage roll and we want to run on damage rolls
            (SwadeAction === "formula" && playtrigger === "onAttack")) { //This is a trait roll and we want to run on trait rolls
            const controlledTokens = canvas.tokens.controlled;
            let token;
            if (controlledTokens.length > 0) {
                token = controlledTokens.find(token => token.document.actorId === SwadeTokenOrActor.id);
            }
            if (token) { SwadeTokenOrActor = token; }
            runSwade(SwadeTokenOrActor, SwadeTokenOrActor, SwadeItem);
        }
    });

    Hooks.on("swadeConsumeItem", async (SwadeItem, charges, usage) => {
        const controlledTokens = canvas.tokens.controlled;
        let token;
        let SwadeTokenOrActor = SwadeItem.parent
        if (controlledTokens.length > 0) {
            token = controlledTokens.find(token => token.document.actorId === SwadeTokenOrActor.id);
        }
        if (token) {
            SwadeTokenOrActor = token;
        }
        runSwade(SwadeTokenOrActor, SwadeTokenOrActor, SwadeItem);
    });

    Hooks.on("createRegion", async (template, data, userId) => {
        if (userId !== game.user.id || !template.flags?.swade?.origin) return;
        templateAnimation(await getRequiredData({ itemUuid: template.flags?.swade?.origin, templateData: template, workflow: template, isTemplate: true }))
    });

    /**
     * Better Rolls hooks
     */
    function getBRSWData(data) {
        return { token: data.token, actor: data.actor, item: data.item }
    }

    Hooks.on("BRSW-RollItem", async (data, html) => {
        const playtrigger = game.settings.get("autoanimations", "playtrigger");
        if (data.damage && playtrigger != "onAttack") { return; } //This is a damage roll and we're set to run anims on damage rolls

        const { token, actor, item } = getBRSWData(data);
        if (item.flags?.autoanimations?.menu === "templatefx" || (item.flags?.autoanimations?.menu === "preset" && item.flags?.autoanimations?.presetType === "proToTemp")) {
            return //Return to prevent duplicate effects on placing a template.
        } else { runSwade(token, actor, item) }
    });

    Hooks.on("BRSW-RollDamage", async (data, html) => {
        const playtrigger = game.settings.get("autoanimations", "playtrigger");
        if (!data.damage || playtrigger != "onDamage") { return; } //This is not a damage roll or we are not set to run on damage rolls

        const { token, actor, item } = getBRSWData(data);
        if (item.flags?.autoanimations?.menu === "templatefx" || (item.flags?.autoanimations?.menu === "preset" && item.flags?.autoanimations?.presetType === "proToTemp")) {
            return //Return to prevent duplicate effects on placing a template.
        } else { runSwade(token, actor, item) }
    });

    Hooks.on("BRSW-CreateItemCardNoRoll", async (data) => {
        const { token, actor, item } = getBRSWData(data);
        if (item.flags?.autoanimations?.menu === "templatefx" || (item.flags?.autoanimations?.menu === "preset" && item.flags?.autoanimations?.presetType === "proToTemp")) {
            return //Return to prevent duplicate effects on placing a template.
        } else { runSwade(token, actor, item) }
    });
}

async function templateAnimation(input) {
    debug("Template placed, checking for animations")
    if (!input.item) {
        debug("No Item could be found")
        return;
    }
    const handler = await AAHandler.make(input);
    trafficCop(handler);
}
// TO-DO, CHECK SWADE
async function runSwade(token, actor, item) {
    let data = await getRequiredData({ token, actor, item });
    if (!data.item) { return; }
    const handler = await AAHandler.make(data);
    trafficCop(handler);
}
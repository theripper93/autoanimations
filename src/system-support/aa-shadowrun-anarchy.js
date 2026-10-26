import { AnimationState }   from "../constants.js";
import { trafficCop }       from "../router/traffic-cop.js";
import AAHandler            from "../system-handlers/workflow-data.js";
import { getRequiredData }  from "./getRequiredData.js";
import { getFlags }         from "../autorec/flags.js";

export function systemHooks() {
    Hooks.on("createChatMessage", async (msg) => { checkChatMessageAnarchy(msg) });
}

async function checkChatMessageAnarchy(msg) {
    if (msg.author?.id !== game.user.id || !AnimationState.enabled) {
        return;
    }

    let roll = msg.getFlag("anarchy", "message-data");
    if (typeof roll === "string") {
        roll = JSON.parse(roll);
    }
    if (!roll || !["weapon", "skill"].includes(roll.mode)) {
        return;
    }

    const token = canvas.scene?.tokens.get(roll.tokenId)?.object
        ?? canvas.scene?.tokens.get(roll.targeting?.attackerTokenId)?.object;
    const actor = token?.actor ?? game.actors.get(roll.actor?.id);
    const weapon = actor?.items.get(roll.weapon?.id);
    const skill = actor?.items.get(roll.skill?.id);

    const compiledData = await getRequiredData({
        item: weapon ?? skill,
        token,
        actor,
        targetIds: roll.targeting?.targetedTokenIds,
        workflow: msg,
    });

    if (compiledData.item && await tryAnimationWith(compiledData)) {
        return;
    }

    const flags = getFlags(compiledData.item);
    if (flags?.killAnim || flags?.isEnabled === false) {
        return;
    }

    if (weapon && skill) {
        await tryAnimationWith(compiledData, skill.name);
    }
}

async function tryAnimationWith(compiledData, itemNameOverride) {
    if (itemNameOverride) {
        compiledData.item = {
            name: itemNameOverride
        }
    }

    const handler = await AAHandler.make(compiledData);
    if (handler?.item && handler.sourceToken) {
        trafficCop(handler);
        return true;
    }

    return false;
}

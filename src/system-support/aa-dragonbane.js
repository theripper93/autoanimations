import { trafficCop }       from "../router/traffic-cop.js"
import AAHandler            from "../system-handlers/workflow-data.js";
import { getRequiredData }  from "./getRequiredData.js";

export function systemHooks() {
    Hooks.on("createChatMessage", async (msg) => {
        if (msg.author.id !== game.user.id) { return };

        const itemUuid = getItemUuid(msg);
        const itemId = itemUuid ? undefined : extractAbilityId(msg.content);
        if (!itemUuid && !itemId) { return; }

        let compiledData = await getRequiredData({
            itemUuid,
            itemId,
            actorId: msg.speaker?.actor,
            tokenId: msg.speaker?.token,
            workflow: msg,
        })
        if (!compiledData.item) { return; }
        runDragonbane(compiledData);
    });
}

function getItemUuid(msg) {
    const system = msg.system ?? {};
    switch (msg.type) {
        case "weaponTest":
            return system.success ? system.weaponUuid : undefined;
        case "spellTest":
            return system.success ? system.spellUuid : undefined;
        case "skillTest":
            return system.skillUuid;
    }
}

function extractAbilityId(content) {
    if (!content?.includes("ability-use")) { return; }
    const div = document.createElement("div");
    div.innerHTML = content;
    return div.querySelector(".ability-use")?.dataset.abilityId;
}

async function runDragonbane(input) {
    const handler = await AAHandler.make(input);
    trafficCop(handler);
}

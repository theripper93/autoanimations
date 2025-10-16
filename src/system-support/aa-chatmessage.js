import { debug }            from "../constants/constants.js";
import { trafficCop }       from "../router/traffic-cop.js";
import AAHandler            from "../system-handlers/workflow-data.js";
import { getRequiredData }  from "./getRequiredData.js";

export function systemHooks() {
    Hooks.on("createChatMessage", async (msg) => {checkChatMessage(msg) });
}

async function checkChatMessage(msg) {
    if (msg.author !== game.user) { return };

    let findData = funkyTest(msg);
    if (!findData.itemId) { 
        debug("Unable to locate Item ID from Chat Message HTML")
        return;
    }
    let item = findData.item ?? msg.item ?? msg.itemSource;
    let compiledData = await getRequiredData({
        itemId: findData.itemId,
        item: item,
        actorId: msg.speaker?.actor || findData.actorId,
        tokenId: msg.speaker?.token || findData.tokenId,
        workflow: msg,
    })
    const handler = await AAHandler.make(compiledData)
    if (!handler?.item || !handler?.sourceToken) { debug("No Item or Source Token", handler); return;}
    trafficCop(handler);
}

function funkyTest(msg) {

    const element = document.createElement('div');
    element.innerHTML = msg.content;

    const elItemUUID = element.querySelector("[data-item-uuid]")?.getAttribute("data-item-uuid");
    const elActorID = element.querySelector("[data-actor-id]")?.getAttribute("data-actor-id");
    const elTokenUUID = element.querySelector("[data-token-uuid]")?.getAttribute("data-token-uuid");
    const elItemID = element.querySelector("[data-item-id]")?.getAttribute("data-item-id");

    const systemFlags = msg.flags[game.system.id] || {};
    const flagItemID = systemFlags.itemId;
    const flagActorID = systemFlags.actorId;
    const flagTokenUUID = systemFlags.tokenUuid;
    const flagItemUUID = systemFlags.itemUuid;


    const token = fromUuidSync(flagTokenUUID || elTokenUUID) || canvas.tokens.get(msg.speaker?.token);
    let item = fromUuidSync(flagItemUUID || elItemUUID) || msg.item || msg.itemSource
    const actor = item?.actor || token?.actor || game.actors.get(flagActorID || elActorID);

    if(!item) item = actor?.items.get(flagItemID || elItemID || msg.rolls?.[0]?.options?.itemId);

    return {token, item, actor , itemId: item?.id, actorId: actor?.id, tokenId: token?.id};
}
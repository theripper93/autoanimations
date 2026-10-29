import { debug }            from "../constants.js";
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
    const elItemName = element.querySelector(".item-name")?.textContent;

    const systemFlags = msg.flags[game.system.id] || {};
    const flagItemID = systemFlags.itemId;
    const flagActorID = systemFlags.actorId;
    const flagTokenUUID = systemFlags.tokenUuid;
    const flagItemUUID = systemFlags.itemUuid;

    const token = fromUuidSync(flagTokenUUID || elTokenUUID) || canvas.tokens.get(msg.speaker?.token);
    const itemFromName = token?.actor?.items?.getName(elItemName);
    let item = fromUuidSync(flagItemUUID || elItemUUID) || msg.item || msg.itemSource || itemFromName;
    const actor = item?.actor || token?.actor || game.actors.get(flagActorID || elActorID || msg.speaker?.actor);

    if(!item) item = actor?.items.get(flagItemID || elItemID || msg.rolls?.[0]?.options?.itemId);

    if(!item){
        item = getItemFromChatMessageData(msg, actor, element);
    }

    return {token, item, actor , itemId: item?.id, actorId: actor?.id, tokenId: token?.id};
}

function getItemFromChatMessageData(msg, actor, element){
    const msgData = msg.toObject();
    const mainTargetObject = msgData.flags[game.system.id] ?? {};
    const secondaryTargetObject = msgData;
    let bestMatch, goodMatch;
    const mainTargetItemUUIDs = extractItemUUIDFromObject(mainTargetObject);
    bestMatch = mainTargetItemUUIDs.find(uuid => uuid.includes(actor?.id));
    goodMatch = mainTargetItemUUIDs[0];
    if(bestMatch) return fromUuidSync(bestMatch);
    const allUUIDs = Array.from(element.querySelectorAll("[data-uuid]")).map(el => el.getAttribute("data-uuid")).filter(uuid => uuid.includes("Item."));
    bestMatch = allUUIDs.find(uuid => uuid.includes(actor?.id));
    goodMatch ??= allUUIDs[0];
    if(bestMatch) return fromUuidSync(bestMatch);
    const secondaryTargetItemUUIDs = extractItemUUIDFromObject(secondaryTargetObject);
    bestMatch = secondaryTargetItemUUIDs.find(uuid => uuid.includes(actor?.id));
    goodMatch ??= secondaryTargetItemUUIDs[0];
    if(bestMatch) return fromUuidSync(bestMatch);
    if(goodMatch) return fromUuidSync(goodMatch);
    return null;
}

function extractItemUUIDFromObject(obj){
    const flattened = foundry.utils.flattenObject(obj);
    const values = Object.values(flattened);
    const itemUUIDs = values.filter(value => typeof value === 'string' && value.includes('Item.'));
    return itemUUIDs;
}
import { debug } from "../constants/constants.js";
import { trafficCop } from "../router/traffic-cop.js";
import AAHandler from "../system-handlers/workflow-data.js";
import { getRequiredData } from "./getRequiredData.js";

export function systemHooks() {
    Hooks.on("createChatMessage", async (msg) => {
        checkChatMessage(msg);
    });
}

async function checkChatMessage(msg) {
    if (msg.user.id !== game.user.id) {
        return;
    }

    let findData = extactData(msg);

    if (!findData.itemId) {
        debug("Could not extract Item ID from Chat Message HTML");
        return;
    }

    let compiledData = await getRequiredData({
        itemId: findData.itemId,
        actorId: msg.speaker?.actor || findData.actorId,
        tokenId: msg.speaker?.token || findData.tokenId,
        workflow: msg,
    });
    compiledData.attackRoll = findData.attackRoll;

    await setFireModeOptions(compiledData);

    let isAmmo = checkAmmo(compiledData);
    if (isAmmo) {
        compiledData.ammoItem = isAmmo;
    }
    const handler = await AAHandler.make(compiledData);
    if (!handler?.item || !handler?.sourceToken) {
        debug("No Item or Source Token", handler);
        return;
    }
    trafficCop(handler);
}

function getFireMode(data) {
    let item = data.item || {};
    let id = item.id;
    let parent = item.parent;

    /**
     * Fire Mode types
     * aimed
     * autofire
     * suppressive
     */

    let fireMode =
        parent?.flags?.["cyberpunk-red-core"]?.[`firetype-${id}`] ?? "single";
    data.fireMode = fireMode;

    return fireMode;
}

async function setFireModeOptions(data) {
    const fireMode = getFireMode(data);

    let canMissTarget = game.settings.get("autoanimations", "canMissTarget");
    let isSuppressive = fireMode === "suppressive";
    if (!isSuppressive && canMissTarget && data?.targets?.length) {
        data.forceMiss = !(await isHit(data));
    }

    let autofireEnabled = game.settings.get("autoanimations", "autofire");
    if (autofireEnabled && ["suppressive", "autofire"].includes(fireMode)) {
        if (isSuppressive) data.forceMiss = true;
        data.overrideRepeat = 10;
    }
}

function checkAmmo(data) {
    const weapon = data?.item ?? {};
    const token  = data?.token;
    const actor  = token?.actor ?? weapon?.actor ?? null;
    if (!actor || !weapon?.system) return null;

    // Preferred path in v12: weapon.system.installedItems.list
    const installedIds = weapon.system?.installedItems?.list ?? [];
    const varieties = weapon.system?.ammoVariety ?? []; // e.g. ["rifle"]

  // Find the first installed ammo item that matches variety and has >0 rounds if present
  let ammoItem = null;
    for (const id of installedIds) {
        const it = actor.items?.get(id);
        if (it?.type === "ammo") {
            const matchesVariety = !varieties?.length || varieties.includes(it.system?.variety);
            const hasAmmo = (typeof it.system?.amount !== "number") ? true : it.system.amount > 0;
            if (matchesVariety && hasAmmo) { ammoItem = it; break; }
        }
    }

  // --- Backward compatibility fallbacks (pre-v12) ---
    if (!ammoItem) {
        // Older fields sometimes carried a UUID like "Actor.X.Item.Y"
        const ammoIdRaw = weapon.system?.magazine?.ammoId || weapon.system?.magazine?.ammoData?.uuid;
        if (typeof ammoIdRaw === "string" && ammoIdRaw.length) {
            const parts = ammoIdRaw.split(".");
            const last = parts[parts.length - 1];
            const legacy = actor.items?.get(last);
            if (legacy?.type === "ammo") ammoItem = legacy;
        }
    }

    // As a last resort, try to infer by name/variety from actor inventory (avoid duplicates!)
    if (!ammoItem && varieties?.length) {
        ammoItem = actor.items.find(i => i.type === "ammo" && varieties.includes(i.system?.variety));
    }

    return ammoItem ?? null;
}

function extactData(msg) {
    let findItemId = $(msg.content).find(`[data-item-id]`);
    let itemId = findItemId?.[0]?.attributes?.["data-item-id"]?.value;

    let findTokenId = $(msg.content).find(`[data-token-id]`);
    let tokenId = findTokenId?.[0]?.attributes?.["data-token-id"]?.value;

    let findActorId = $(msg.content).find(`[data-actor-id]`);
    let actorId = findActorId?.[0]?.attributes?.["data-actor-id"]?.value;

    let findAttackRoll = $(msg.content).find(
        `span.clickable[data-action='toggleVisibility']`
    );
    let attackRoll = parseInt(findAttackRoll?.[0]?.innerHTML ?? 999);

    return { itemId, tokenId, actorId, attackRoll };
}

function getDistance(token, target) {
    if (token.document) token = token.document;
    const a = canvas.grid.measureDistance(token, target, {
        gridSpaces: true,
    });

    if (!game.settings.get("autoanimations", "useElevation")) return a;
    const b = token.elevation - target.document.elevation;
    return Math.round(Math.sqrt(a * a + b * b));
}

async function getDV(dvTable, dist) {
    // try to use imported table first
    let table = await game.tables.getName(dvTable);
    if (!table) {
        const compendium = game.settings.get(
            game.system.id,
            "dvRollTableCompendium"
        );
        const pack =
            game.packs.get(compendium) || // what is configured in the system
            game.packs.get("cyberpunk-red-core.internal_dv-tables") || // 0.88.X and up
            game.packs.get("cyberpunk-red-core.dv-tables") || // 0.87.X
            game.packs.get("cyberpunk-red-core.dvTables"); // 0.86.X and below

        const tableId = pack.index.getName(dvTable)?._id;
        if (!tableId) {
            debug(`Could not get table with name "${dvTable}" from compendium`);
            return -100;
        }
        table = await pack.getDocument(tableId);
    }
    if (!table) {
        debug(
            `Could not get table with id "${tableId}" and name "${dvTable}" from compendium`
        );
        return -100;
    }

    const draw = await table.getResultsForRoll(dist);
    if (!draw || draw.length === 0) {
        debug(`Could not roll DV from table "${dvTable}"`);
        return -100;
    }

    return parseInt(draw[0].text);
}

async function isHit(data) {
    let distance = getDistance(data.token, data.targets[0]);
    let dvTable = data.item?.system?.dvTable ?? "";
    let dv;
    if (data.fireMode === "autofire") {
        dv = await getDV(dvTable + " (Autofire)", distance);
        if (!dv || dv < 0) {
            // fallback to none autofire DV table in case it does not exist
            // e.g. useful for pistols with auto fire
            dv = await getDV(dvTable, distance);
        }
    } else {
        dv = await getDV(dvTable, distance);
    }
    if (!dv || dv < 0) return true;
    debug(`Was this roll a hit: ${data.attackRoll > dv}`);
    return data.attackRoll > dv;
}

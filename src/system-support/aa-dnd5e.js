import { debug }            from "../constants/constants.js";
import { trafficCop }       from "../router/traffic-cop.js";
import AAHandler            from "../system-handlers/workflow-data.js";
import { getRequiredData }  from "./getRequiredData.js";

const activityCache = {};

// DnD5e System hooks provided to run animations
export function systemHooks() {
    if(!foundry.utils.isNewerVersion(game.system.version, 3.9)) return ui.notifications.error(`Automated Animations: This version of Automated Animations requires DnD5e 4.3 or higher, please downgrade to Automated Animations 5.0.10 or update your game system.`, {permanent: true});
    Hooks.on("dnd5e.rollAttackV2", async (rolls, data) => {
            const roll = rolls[0];
            const hit = roll.total >= (roll.options.target ?? 0);
            const activity = data.subject;
            activity.actor.hits ??= {};
            activity.actor.hits[activity.relativeID] = hit;
            if(activity?.description?.chatFlavor?.includes("[noaa]")) return;
            const playOnDamage = game.settings.get('autoanimations', 'playonDamageCore');
            if (Object.keys(CONFIG.DND5E.areaTargetTypes).includes(activity?.target?.template?.type) || (activity?.damage?.parts?.length && activity?.type != "heal" && playOnDamage)) { return; }
            const item = activity?.item;
            criticalCheck(roll, item);
            const ammoItem = item?.parent?.items?.get(data?.ammoUpdate?.id) ?? null;
            const overrideNames = activity?.name && !["heal", "summon"].includes(activity?.name?.trim()) ? [activity.name] : [];
            attackV2(await getRequiredData({item: item, actor: item.parent, roll: item, rollAttackHook: {item, roll}, spellLevel: roll?.data?.item?.level ?? void 0, ammoItem, overrideNames, hit}));
        });
    Hooks.on("dnd5e.rollDamageV2", async (rolls, data) => {
            const roll = rolls[0];
            const activity = data.subject;
            const hit = !!(activity.actor.hits?.[activity.relativeID] ?? true);
            if(activity.actor.hits) delete activity.actor.hits[activity.relativeID];
            if(activity?.description?.chatFlavor?.includes("[noaa]")) return;
            const playOnDamage = game.settings.get('autoanimations', 'playonDamageCore');
            if (Object.keys(CONFIG.DND5E.areaTargetTypes).includes(activity?.target?.template?.type) || (activity?.type == "attack" && !playOnDamage)) { return; }
            const item = activity?.item;
            criticalCheck(roll, item);
            const overrideNames = activity?.name && !["heal", "summon"].includes(activity?.name?.trim()) ? [activity.name] : [];
            damageV2(await getRequiredData({hit: hit, item, actor: item.parent, roll: item, rollDamageHook: {item, roll}, spellLevel: roll?.data?.item?.level ?? void 0, overrideNames, }));
        });
    Hooks.on('dnd5e.postUseActivity', async (activity, usageConfig, results) => {
        if (activity?.description?.chatFlavor?.includes("[noaa]")) return;
            if (Object.keys(CONFIG.DND5E.areaTargetTypes).includes(activity?.target?.template?.type) || ((activity?.damage?.parts?.length || activity?.type == "heal"))) { return; }
            const config = usageConfig;
            const options = results;
            const item = activity?.item;
            const overrideNames = activity?.name && !["heal", "summon"].includes(activity?.name?.trim()) ? [activity.name] : [];
            useItem(await getRequiredData({item, actor: item.parent, roll: item, useItemHook: {item, config, options}, spellLevel: options?.flags?.dnd5e?.use?.spellLevel || void 0, overrideNames}));
        });
        Hooks.on("dnd5e.preUseActivity", (activity, config) => {
        if (activity?.description?.chatFlavor?.includes("[noaa]")) return;
            if(activity.item?.system?.uses?.autoDestroy) activityCache[activity.uuid] = activity;
            setTimeout(() => {
                if (activityCache[activity.uuid]) delete activityCache[activity.uuid];
            }, 60000);
        });
        Hooks.on("createMeasuredTemplate", async (template, data, userId) => {
            if (userId !== game.user.id) { return };
            const activity = fromUuidSync(template.flags?.dnd5e?.origin) ?? activityCache[template.flags?.dnd5e?.origin];
            if (!activity) return;
            if (activity?.description?.chatFlavor?.includes("[noaa]")) return;
            const item = activity?.item;
            const overrideNames = activity?.name && !["heal", "summon"].includes(activity?.name?.trim()) ? [activity.name] : [];
            templateAnimation(await getRequiredData({item, templateData: template, roll: template, isTemplate: true, overrideNames}));
        });
}

async function useItem(input) {
    debug("Item used, checking for animations")
    const handler = await AAHandler.make(input)
    if (!handler?.item || !handler?.sourceToken) { console.log("Automated Animations: No Item or Source Token", handler); return;}
    trafficCop(handler)
}

async function attackV2(input) {
    checkReach(input)
    debug("Attack rolled, checking for animations");
    const handler = await AAHandler.make(input)
    if (!handler?.item || !handler?.sourceToken) { console.log("Automated Animations: No Item or Source Token", handler); return;}
    trafficCop(handler)
}

async function damageV2(input) {
    checkReach(input)
    debug("Damage rolled, checking for animations")
    const handler = await AAHandler.make(input)
    if (!handler?.item || !handler?.sourceToken) { console.log("Automated Animations: No Item or Source Token", handler); return;}
    trafficCop(handler)
}

async function templateAnimation(input) {
    debug("Template placed, checking for animations")
    if (!input.item) {
        debug("No Item could be found")
        return;
    }
    const handler = await AAHandler.make(input)
    trafficCop(handler)
}

function checkReach(data) {
    data.reach = data.item.system?.properties?.rch ? 1 : 0;
}

function criticalCheck(roll, item = {}) {
    if (!roll.isCritical && !roll.isFumble) { return; }
    debug("Checking for Crit or Fumble")
    const critical = roll.isCritical;
    const fumble = roll.isFumble;
    const token = canvas.tokens.get(roll.tokenId) || getTokenFromItem(item);

    const critAnim = game.settings.get("autoanimations", "CriticalAnimation");
    const critMissAnim = game.settings.get("autoanimations", "CriticalMissAnimation");

    switch (true) {
        case (game.settings.get("autoanimations", "EnableCritical") && critical):
            new Sequence({moduleName: "Automated Animations", softFail: !game.settings.get("autoanimations", "debug")})
                .effect()
                .file(critAnim)
                .atLocation(token)
                .play()
            break;
        case (game.settings.get("autoanimations", "EnableCriticalMiss") && fumble):
            new Sequence({moduleName: "Automated Animations", softFail: !game.settings.get("autoanimations", "debug")})
                .effect()
                .file(critMissAnim)
                .atLocation(token)
                .play()
            break;
    }

    function getTokenFromItem(item) {
        const token = item?.parent?.token;
        if (token) return token;
        const tokens = canvas.tokens.placeables.filter(token => token.actor?.items?.get(item.id));
        const fallBack = tokens[0];
        const mostLikely = tokens.find(x => x.id === _token.id);
        return mostLikely ?? fallBack;
    }

}

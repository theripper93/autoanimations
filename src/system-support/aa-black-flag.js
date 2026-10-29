import { trafficCop }       from "../router/traffic-cop.js"
import AAHandler            from "../system-handlers/workflow-data.js"
import { getRequiredData }  from "./getRequiredData.js"
import { debug }            from "../constants.js"

/**
 * Support for the [Black Flag system](https://github.com/koboldpress/black-flag) from Kobold Press. It supports the following features:
 * - Attack Animations with range checks
 * - Animation on template/region placement
 * - (Optional) Audio and Animation for Critical Hits and Critical Failures on Attacks
 * - (Optional) PlayOnMiss flag that animates missed attacks separately, requires a target to be selected
 */

export function systemHooks() {
    /**
     * A hook event that fires after an attack has been rolled.
     * @function blackFlag.postRollAttack
     * @memberof hookEvents
     * @param {ChallengeRoll[]} rolls - The resulting rolls.
     * @param {object} [data]
     * @param {Activity} [data.subject] - Activity for which the roll was performed.
     */
    Hooks.on("blackFlag.postRollAttack", async (rolls, data) => {
        if (!rolls?.length) return
        const activity = data.subject
        if (activity?.description?.chatFlavor?.includes("[noaa]")) return
        
        const item = activity?.item
        if (!item) return
        
        const overrideNames = activity?.name && !["heal", "summon"].includes(activity?.name?.trim()) ? [activity.name] : []
        
        debug("Attack rolled, checking for animations");
        
        const playOnMiss = game.settings.get("autoanimations", "playonmiss");
        
        const hitTargets = [];
        const missTargets = [];
        
        // Check each target for a hit or miss and add them to the appropriate array
        // Note that each attack roll contains targets within the flags.black-flag.targets field
        // These contain the following data: ac, img, name, uuid
        for (const roll of rolls) {
            const rollTargets = roll.parent?.flags?.["black-flag"]?.targets;
            if (!rollTargets?.length) {
                continue;
            }
            
            for (const targetData of rollTargets) {
                const uuidParts = targetData.uuid.split(".");
                const tokenId = uuidParts[uuidParts.length - 3];
                const target = canvas.tokens.get(tokenId);
                if (!target) {
                    warn("Target not found on canvas:", tokenId);
                    continue;
                }
                
                if (roll.total >= targetData.ac) {
                    hitTargets.push(target);
                } else {
                    missTargets.push(target);
                }
            }
        }
        
        const targets = [...hitTargets, ...missTargets];
        
        if (!playOnMiss && missTargets.length > 0) {
            hitTargets.push(...missTargets);
        }
        
        const handler = await AAHandler.make(await getRequiredData({
            item,
            actor: item.parent,
            activity,
            roll: activity,
            overrideNames,
            hitTargets: hitTargets,
            targets: targets,
            playOnMiss: playOnMiss
        }))
        
        if (!handler?.item || !handler?.sourceToken) {
            debug("No Item or Source Token", handler)
            return
        }

        criticalCheckBlackFlag(rolls[0], item);
        
        trafficCop(handler)
    })
    
    /**
     * A hook event that fires after an activity activation card is created.
     * @function blackFlag.postCreateActivationMessage
     * @memberof hookEvents
     * @param {Activity} activity - Activity for which the card was created.
     * @param {BlackFlagChatMessage} message - Created chat message.
     */
    Hooks.on("blackFlag.postCreateActivationMessage", async (activity, message) => {
        if (activity?.description?.chatFlavor?.includes("[noaa]")) return
        
        // We don't need to animate attacks until they are rolled
        if (activity?.type === "attack") return;

        const item = activity?.item
        if (!item) return
        
        const overrideNames = activity?.name && !["heal", "summon"].includes(activity?.name?.trim()) ? [activity.name] : []
        
        const handler = await AAHandler.make(await getRequiredData({
            item,
            actor: item.parent,
            activity,
            roll: activity,
            workflow: message,
            overrideNames
        }))
        
        if (!handler?.item || !handler?.sourceToken) {
            debug("No Item or Source Token", handler)
            return
        }
        
        trafficCop(handler)
    })
    
    /**
     * A hook event that fires after a template are created for an Activity.
     * @function blackFlag.postCreateMeasuredTemplate
     * @memberof hookEvents
     * @param {Activity} activity - Activity for which the template is being placed.
     * @param {RegionDocument[]} templates - The regions that were created.
     */
    Hooks.on("blackFlag.postCreateMeasuredTemplate", async (activity, created) => {
        if (!activity) return
        if (activity?.description?.chatFlavor?.includes("[noaa]")) return
        
        const item = activity?.item
        if (!item) return
        
        debug("Template placed, checking for animations")
        const overrideNames = activity?.name && !["heal", "summon"].includes(activity?.name?.trim()) ? [activity.name] : []
        
        const handler = await AAHandler.make(await getRequiredData({
            item,
            actor: item.parent,
            activity,
            templateData: created[0],
            roll: activity,
            isTemplate: true,
            overrideNames
        }))
        
        if (!handler?.item || !handler?.sourceToken) {
            debug("No Item or Source Token", handler)
            return
        }
        
        trafficCop(handler)
    })
}

function criticalCheckBlackFlag(roll, item = {}) {

    const critical = roll?.isCriticalSuccess;
    const fumble = roll?.isCriticalFailure;

    if (!critical && !fumble) { return; }

    const token = canvas.tokens.get(roll.tokenId) || getTokenFromItem(item);

    const enableCritical = game.settings.get("autoanimations", "EnableCritical");
    const enableCriticalMiss = game.settings.get("autoanimations", "EnableCriticalMiss");

    if (enableCritical && critical) {
        const critAnim = game.settings.get("autoanimations", "CriticalAnimation");
        const critAudio = game.settings.get("autoanimations", "CriticalAudio");

        const critSeq = new Sequence({moduleName: "Automated Animations", softFail: !game.settings.get("autoanimations", "debug")});
        if (critAnim) {
            critSeq.effect()
                .file(critAnim)
                .atLocation(token);
        }
        if (critAudio) {
            critSeq.sound()
                .file(critAudio);
        }
        critSeq.play();

        return;
    }

    if (enableCriticalMiss && fumble) {
        const critMissAnim = game.settings.get("autoanimations", "CriticalMissAnimation");
        const critMissAudio = game.settings.get("autoanimations", "CriticalMissAudio");

        const critMissSeq = new Sequence({moduleName: "Automated Animations", softFail: !game.settings.get("autoanimations", "debug")});
        if (critMissAnim) {
            critMissSeq.effect()
                .file(critMissAnim)
                .atLocation(token);
        }
        if (critMissAudio) {
            critMissSeq.sound()
                .file(critMissAudio);
        }
        critMissSeq.play();
        return;
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

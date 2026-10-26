import AAHandler            from "../system-handlers/workflow-data.js";
import { trafficCop }       from "../router/traffic-cop.js";
/**
 * 
 *  @param {Object} item // The item being used, or a false item with at least {name: "ItemName"} for Autorec
 *  @param {Object} sourceToken // The Token using the item
 * 
 *  @param {Object} options 
 * 
 *  Options can be:
 *  @param {Array or Set or Object} targets // Array or Set of targeted tokens or a single Object
 *  @param {Optional} hitTargets // Array or Set of tokens that are "hit"
 *  @param {Number} reachCheck // Reach for Source Token
 *  @param {Boolean} playOnMiss // Animation should play on Misses
 *  @param {Object} templateData // Pass a template to the system handler, undefined by default until a Template animation is played
 * 
 * @returns 
 */
export async function playAnimation(sourceToken, item, options = {}) {
    if (!item) { return; }

    let targets;
    if (options.targets) {
        if (options.targets instanceof Set) {
            targets = Array.from(options.targets)
        } else if (options.targets instanceof Array) {
            targets = options.targets;
        } else {
            targets = [options.targets]
        }
        //targets = !Array.isArray(options.targets) ? Array.from(options.targets) : options.targets;
    } else {
        targets = Array.from(game.user.targets);
    }

    const data = {
        token: sourceToken,
        targets: targets,
        item: item,
        ...options
    }

    const handler = await AAHandler.make(data)
    trafficCop(handler);
    return handler;
}

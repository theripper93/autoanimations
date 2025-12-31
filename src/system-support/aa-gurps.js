import { trafficCop } from "../router/traffic-cop.js";
import AAHandler from "../system-handlers/workflow-data.js";

const SHAPE_MAP = {
    'circle': 'circle',
    'vines': 'circle',
    'cone': 'cone',
    'square': 'rect',
    'rect': 'rect',
    'ray': 'ray',
    'line': 'ray'
};

let pendingGurpsInput = null;

/**
 * Cleans and converts GURPS Reach string to a numeric value.
 * @param {string} reachString 
 * @returns {number} Numeric reach value (minimum 1)
*/
function getGurpsReach(reachString) {
    if (!reachString) return 1;
    const clean = reachString.toString().toUpperCase().replace(/[^0-9C,-]/g, "");
    const parts = clean.split(/[,-]/);
    let maxReach = 0;

    for (let part of parts) {
        if (part === "C") continue; // C (Close combat) = 0, effectively 1 for visuals
        const num = parseInt(part);
        if (!isNaN(num) && num > maxReach) maxReach = num;
    }
    return maxReach === 0 ? 1 : maxReach;
}

export function systemHooks() {
    Hooks.on("createChatMessage", async (msg) => {
        if (msg.author.id !== game.user.id) return;
        if (game.system.id !== "gurps") return;

        const parsedData = parseGurpsMessage(msg);

        if (!parsedData) return;

        await gurpsWorkflow(parsedData);
    });

    Hooks.on("createMeasuredTemplate", async (templateDocument, context, userId) => {
        if (userId !== game.user.id) return;

        if (pendingGurpsInput) {
            const pending = pendingGurpsInput;

            if (pending.expectedShape && templateDocument.t !== pending.expectedShape) return;

            setTimeout(async () => {
                const input = pending.input;
                input.templateData = templateDocument;

                const newHandler = await AAHandler.make(input);
                if (pending.forcedReachCheck !== undefined) {
                    newHandler.reachCheck = pending.forcedReachCheck;
                }

                trafficCop(newHandler);
                pendingGurpsInput = null;
            }, 100);
        }
    });

    Hooks.on("renderSceneControls", (controls) => {
        if (pendingGurpsInput) {
            if (Date.now() - pendingGurpsInput.timestamp < 1000) return;
            if (ui.controls.control.name !== "measure") {
                pendingGurpsInput = null;
            }
        }
    });
}

/**
 * Main Workflow
*/
async function gurpsWorkflow(data) {
    // --- Reach Calculation Logic ---
    // rawReach: The explicit value from the item (e.g. 1, 2, 3...)
    // In GURPS, this value implies Yards or Meters directly.
    const rawReach = (data.reach !== undefined) ? data.reach : 1;
    const units = (canvas.scene.grid.units || "").toLowerCase().trim();
    const gridDist = canvas.scene.grid.distance;
    let finalReachDistance;

    // Rule 1: Feet (D&D style maps)
    // 1 GURPS Reach (Yard) = 3 Feet.
    if (units === "ft" || units === "feet") {
        finalReachDistance = (rawReach * 3) / gridDist;
    }
    // Rule 2: Meters or Yards (Standard GURPS)
    // Reach 1 = 1 Meter/Yard.
    else if (["m", "mt", "mts", "meter", "meters", "yd", "yard", "yards"].includes(units)) {
        finalReachDistance = rawReach / gridDist;
    }
    // Rule 3: Fallback / Unknown Units / Grid Units
    // If we don't know the unit, assume Reach 1 = 1 Grid Cell.
    else {
        finalReachDistance = rawReach;
    }

    // PADDING: Add epsilon for float errors (1.0 vs 1.000001)
    const finalReachCheck = finalReachDistance + 0.01;

    const input = {
        item: data.item,
        token: data.token,
        actor: data.actor,
        targets: data.targets,
        hitTargets: data.hitTargets,
        overrideNames: [data.attackName]
    };

    const probeHandler = await AAHandler.make(input);
    if (!probeHandler?.item) return;

    // Apply the corrected distance limit
    probeHandler.reachCheck = finalReachCheck;

    if (pendingGurpsInput) {
        pendingGurpsInput = null;
    }

    const animMenu = probeHandler.animationData?.menu;
    const isTemplateFx = animMenu === "templatefx";
    const isPresetTemplate = animMenu === "preset" &&
        ["thunderwave", "proToTemp"].includes(probeHandler.animationData.presetType);
    const isTeleportPreset = animMenu === "preset" &&
        ["teleportation"].includes(probeHandler.animationData.presetType);

    if (isTemplateFx || isPresetTemplate) {
        let expectedFoundryShape = undefined;
        if (isTemplateFx) {
            const aaShape = probeHandler.animationData?.primary?.video?.menuType || 'circle';
            expectedFoundryShape = SHAPE_MAP[aaShape] || 'circle';
        }

        const lastTemplate = canvas.templates.placeables[canvas.templates.placeables.length - 1];
        const isValidTemplate = lastTemplate &&
            lastTemplate.document.author.id === game.user.id &&
            (!expectedFoundryShape || lastTemplate.document.t === expectedFoundryShape);

        if (isValidTemplate) {
            input.templateData = lastTemplate.document;
            const finalHandler = await AAHandler.make(input);
            finalHandler.reachCheck = finalReachCheck;
            trafficCop(finalHandler);
            return;
        }

        const shapeName = expectedFoundryShape ? expectedFoundryShape.toLowerCase() : "any";
        ui.notifications.info(`"${data.attackName}": Add ${shapeName} template...`);

        pendingGurpsInput = {
            input: input,
            expectedShape: expectedFoundryShape,
            timestamp: Date.now(),
            forcedReachCheck: finalReachCheck
        };

        if (canvas.templates.activate) canvas.templates.activate();
        const toolToSelect = expectedFoundryShape || "circle";
        if (ui.controls) {
            ui.controls.render(true, { control: "measure", tool: toolToSelect }); 
        }

        const myTimestamp = pendingGurpsInput.timestamp;
        setTimeout(() => {
            if (pendingGurpsInput && pendingGurpsInput.timestamp === myTimestamp) {
                pendingGurpsInput = null;
            }
        }, 60000);

        return;
    } else if (isTeleportPreset) {
        ui.notifications.info(`"${data.attackName}": Click on a destination...`);
    }

    trafficCop(probeHandler);
}

/**
 * Helper: Parse GURPS Chat Message
*/
function parseGurpsMessage(msg) {
    const content = document.createElement("div");
    content.innerHTML = msg.content;

    if (content.classList.contains("damage-chat-message") ||
        content.querySelector(".damage-chat-message") ||
        !content.querySelector(".success")) {
        return null;
    }

    const links = content.querySelectorAll(".gurpslink");
    let foundData = null;
    
    for (const link of links) {
        const otf = link.getAttribute("data-otf");
        if (!otf) continue;

        const colonIndex = otf.indexOf(":");

        if (colonIndex > -1) {
            const prefix = otf.substring(0, colonIndex);
            const rawName = otf.substring(colonIndex + 1);
            
            foundData = { 
                prefix: prefix, 
                fullName: rawName.replace(/^"+|"+$/g, "").trim() 
            };
            break;
        } else {
            foundData = { 
                prefix: "", 
                fullName: otf.replace(/^"+|"+$/g, "").trim() 
            };
            break;
        }
    }

    if (!foundData) return null;

    let token = canvas.tokens.get(msg.speaker.token);
    let actor = token?.actor;

    if (!actor) {
        actor = game.actors.get(msg.speaker.actor);
        if (actor) {
            token = actor.getActiveTokens()[0];
        }
    }

    if (!token || !actor) return null;

    const prefix = foundData.prefix.toLowerCase();
    
    let realItem = null;
    let entryReachString = null;
    let searchList = [];

    if (['m', 'p', 'b'].includes(prefix)) {
        searchList = Object.values(actor.system.melee || {});
    } else if (prefix === 'r') {
        searchList = Object.values(actor.system.ranged || {});
    } else if (prefix === 'sp') {
        searchList = Object.values(actor.system.spells || {});
    } else if (prefix === 'sk') {
        searchList = Object.values(actor.system.skills || {});
    }

    const entry = searchList.find(e => {
        let constructedName = e.name;
        if (e.mode && e.mode.trim() !== "") {
            constructedName += ` (${e.mode})`;
        }
        return constructedName === foundData.fullName;
    });

    if (entry) {
        if (entry.fromItem) {
            realItem = actor.items.get(entry.fromItem);
        }
        if (['m', 'p', 'b'].includes(prefix) && entry.reach) {
            entryReachString = entry.reach;
        }
    }

    if (!realItem) {
        const cleanNameSimple = foundData.fullName.split("(")[0].trim();
        const typeMap = {
            'm': ['equipment', 'trait', 'feature'],
            'r': ['equipment', 'trait', 'feature'],
            'p': ['equipment', 'trait', 'feature'],
            'b': ['equipment', 'trait', 'feature'],
            'sp': ['spell'],
            'sk': ['skill']
        };
        const allowedTypes = typeMap[prefix] || ['weapon', 'equipment', 'trait', 'feature'];

        const candidates = actor.items.filter(i => {
            const nameMatch = (i.name === cleanNameSimple || i.name === foundData.fullName);
            const typeMatch = allowedTypes.includes(i.type);
            return nameMatch && typeMatch;
        });

        if (candidates.length > 0) {
            candidates.sort((a, b) => {
                if (a.type === 'equipment' && b.type !== 'equipment') return -1;
                if (b.type === 'equipment' && a.type !== 'equipment') return 1;
                return 0;
            });
            realItem = candidates[0];
        }
    }

    let finalDisplayName = foundData.fullName;
    if (prefix === 'p') finalDisplayName = `Parry: ${foundData.fullName}`;
    if (prefix === 'b') finalDisplayName = `Block: ${foundData.fullName}`;

    const calculatedReach = getGurpsReach(entryReachString);

    let finalItem;
    if (realItem) {
        finalItem = realItem.toObject();
        delete finalItem._id;
        delete finalItem.id;
        finalItem.name = finalDisplayName;
        finalItem.flags ??= {};
        finalItem.flags.autoanimations ??= {};
        finalItem.parent = actor;
    } else {
        let fallbackImg = "icons/svg/item-bag.svg";
        let fallbackType = "weapon";

        switch (prefix) {
            case 'm': fallbackImg = "icons/svg/sword.svg"; fallbackType = "equipment"; break;
            case 'p': fallbackImg = "icons/svg/sword.svg"; fallbackType = "equipment"; break;
            case 'b': fallbackImg = "icons/svg/shield.svg"; fallbackType = "equipment"; break;
            case 'r': fallbackImg = "icons/svg/target.svg"; fallbackType = "equipment"; break;
            case 'sp': fallbackImg = "icons/svg/daze.svg"; fallbackType = "spell"; break;
            case 'sk': fallbackImg = "icons/svg/dice-target.svg"; fallbackType = "skill"; break;
        }

        finalItem = {
            name: finalDisplayName,
            img: fallbackImg,
            type: fallbackType,
            flags: { autoanimations: {} },
            system: {},
            parent: actor
        };
    }

    finalItem.getFlag = function (scope, key) { return this.flags?.[scope]?.[key]; };
    finalItem.update = async function (updates) { foundry.utils.mergeObject(this, updates); return this; };
    finalItem.prepareData = function () { return; };

    return {
        item: finalItem,
        token: token,
        actor: actor,
        targets: Array.from(game.user.targets),
        hitTargets: Array.from(game.user.targets),
        attackName: finalDisplayName,
        reach: calculatedReach
    };
}

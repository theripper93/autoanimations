import { debug }            from "../constants/constants.js";
import { trafficCop }       from "../router/traffic-cop.js";
import AAHandler            from "../system-handlers/workflow-data.js";
import { getRequiredData }  from "./getRequiredData.js";

// ARS System hooks provided to run animations
export function systemHooks() {
	Hooks.on("createChatMessage", async (msg) => {
		// Get context from the new flags structure
		const context = msg.flags?.world?.context;
		if (!context) return;

		// Handle critical hits
		if (context.criticaled) {
			let critAnim = game.settings.get("autoanimations", "CriticalAnimation");
			let targetToken = null;
			
			// Try to get target token from context
			if (context.targetTokenUuid) {
				const targetDoc = await fromUuid(context.targetTokenUuid);
				targetToken = targetDoc?.object || canvas.tokens.get(targetDoc?.id);
			}
			
			// Fallback to first target if available
			if (!targetToken && game.user.targets.size > 0) {
				targetToken = Array.from(game.user.targets)[0];
			}
			
			if (targetToken) {
				new Sequence({moduleName: "Automated Animations", softFail: !game.settings.get("autoanimations", "debug")})
					.effect()
					.file(critAnim)
					.atLocation(targetToken)
					.scaleToObject(2)
					.play();
			}
		}

		// Handle fumbles
		if (context.fumbled) {
			let critMissAnim = game.settings.get("autoanimations", "CriticalMissAnimation");
			let sourceToken = null;
			
			// Get source token from actor UUID
			if (context.actorUuid) {
				const actor = await fromUuid(context.actorUuid);
				if (actor) {
					const tokens = actor.getActiveTokens();
					sourceToken = Array.isArray(tokens) ? tokens[0]?.object : tokens?.object;
				}
			}
			
			// Fallback to speaker token
			if (!sourceToken && msg.speaker?.token) {
				sourceToken = canvas.tokens.get(msg.speaker.token);
			}
			
			if (sourceToken) {
				new Sequence({ moduleName: "Automated Animations", softFail: !game.settings.get("autoanimations", "debug") })
					.effect()
					.file(critMissAnim)
					.atLocation(sourceToken)
					.scaleToObject(2)
					.play();
			}
		}
	   
		// Handle item usage (weapon attacks, spells, etc.)
		if (context.itemUuid) {
			const item = await fromUuid(context.itemUuid);
			const actor = context.actorUuid ? await fromUuid(context.actorUuid) : null;
			
			if (item) {
				// Get target token UUID if available
				let targetTokenUuid = context.targetTokenUuid;
				let targetIds = null;
				if (targetTokenUuid) {
					const targetDoc = await fromUuid(targetTokenUuid);
					if (targetDoc?.id) {
						targetIds = [targetDoc.id];
					}
				}
	   
				// Check if this is an attack roll (has criticaled or fumbled flag, or has targetTokenUuid)
				if (context.criticaled !== undefined || context.fumbled !== undefined || context.targetTokenUuid) {
					// This is an attack roll
					attack(await getRequiredData({
						item: item,
						itemUuid: context.itemUuid,
						actor: actor,
						targetIds: targetIds,
						workflow: msg
					}));
				} else {
					// This is item usage (spell cast, item use, etc.)
					useItem(await getRequiredData({
						item: item,
						itemUuid: context.itemUuid,
						actor: actor,
						workflow: msg
					}));
				}
			}
		}
		// Handle action usage (actions from action groups)
		else if (context.action) {
			// Actions are serialized, so we need to deserialize them
			const action = context.action;
			const actor = context.actorUuid ? await fromUuid(context.actorUuid) : null;
			
			// Try to get the item that contains this action
			let item = null;
			if (context.itemUuid) {
				item = await fromUuid(context.itemUuid);
			} else if (action.parentuuid) {
				item = await fromUuid(action.parentuuid);
			}
			
			if (actor || item) {
				useItem(await getRequiredData({
					item: item,
					actor: actor,
					workflow: msg
				}));
			}
		}
	});
}

async function useItem(input) {
	debug("Item used, checking for animations")
	const handler = await AAHandler.make(input)
	if (!handler?.item || !handler?.sourceToken) { console.log("Automated Animations: No Item or Source Token", handler); return;}
	trafficCop(handler)
}

async function attack(input) {
	checkAmmo(input)
	debug("Attack rolled, checking for animations");
	const handler = await AAHandler.make(input)
	if (!handler?.item || !handler?.sourceToken) { console.log("Automated Animations: No Item or Source Token", handler); return;}
	trafficCop(handler)
}

function checkAmmo(data) {
	//const ammo = data.item?.flags?.autoanimations?.fromAmmo;
	const ammoType = data.item?.system?.consume?.type;
	data.ammoItem = ammoType === "ammo" ? data.token?.actor?.items?.get(data.item?.system?.consume?.target) : null;
}

function getWorkflowData(data) {
    return {
        item: data.item,
        token: data.token,
        targets: Array.from(data.targets),
        hitTargets: Array.from(data.hitTargets),
        spellLevel: data.castData?.castLevel ?? void 0,
        workflow: data,
    }
}

// Helper function to get token from item
function getTokenFromItem(item) {
    let token = item?.parent?.token;
    if (token) { return token }
    let tokens = canvas.tokens.placeables.filter(token => token.actor?.items?.get(item.id));
    let trueToken = tokens.length > 1 ? tokens.find(x => x.id === _token.id) || tokens[0] : tokens[0];
    return trueToken;
}

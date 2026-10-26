import { trafficCop }       from "../router/traffic-cop.js"
import AAHandler            from "../system-handlers/workflow-data.js";
import { getRequiredData }  from "./getRequiredData.js";

export function systemHooks() {
    Hooks.on("createChatMessage", async (msg) => {
        const userId = (msg.author ?? msg.user)?.id;
        if (userId !== game.user.id) { return; }
        
        if (msg.type !== "test") { return; }

        let compiledData = await getRequiredData({
            actorId: msg.speaker.actor ?? msg.system.context.speaker.actor,
            tokenId: msg.speaker.token ?? msg.system.context.speaker.token,
            targets: compileTargets(msg.system.context.targets),
            itemUuid: msg.system.testData.itemId,
            workflow: msg,
        })
        if (!compiledData.item) { return; }
        runWrathandGlory(compiledData)
    });
}

function compileTargets(targets) {
  if (!targets) { return []; }
  return Array.from(targets).map(token => canvas.tokens.get(token.token)).filter(t => !!t);
}

async function runWrathandGlory(input) {
    const handler = await AAHandler.make(input);
    trafficCop(handler);
}

import { trafficCop }       from "../router/traffic-cop.js"
import AAHandler            from "../system-handlers/workflow-data.js";
import { getRequiredData }  from "./getRequiredData.js";

export function systemHooks() {
    Hooks.on("createChatMessage", async (msg) => {
        if (msg.author.id !== game.user.id) { return };
        
        let success = msg.system.result.isSuccess;
        if (success == true && msg.system.result.damage.ed.value !== 0) { return };

        let compiledData = await getRequiredData({
            actorId: msg.speaker.actor ?? msg.system.context.speaker.actor,
            targets: compileTargets(msg.system.context.targets),
            itemUuid: msg.system.context.itemId,
            workflow: msg,
        })
        if (!compiledData.item) { return; }
        runWrathandGlory(compiledData)
    });
}

function compileTargets(targets) {
  if (!targets) { return []; }
  return Array.from(targets).map(token => canvas.tokens.get(token.token));
}

async function runWrathandGlory(input) {
    console.log(input);
    const handler = await AAHandler.make(input);
    trafficCop(handler);
}

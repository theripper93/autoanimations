import { trafficCop }       from "../router/traffic-cop.js"
import AAHandler            from "../system-handlers/workflow-data.js";
import { getRequiredData }  from "./getRequiredData.js";

export function systemHooks() {
    Hooks.on("createChatMessage", async (msg) => {
 		if (msg.author.id !== game.user.id) { return };
        const systemName = 'impmal';

        if (msg.system.class =="WeaponTest") {
            let compiledData = await getRequiredData({
                actorId: msg.speaker.actor ?? msg.system.context.speaker.actor,
                targets: compileTargets(msg.system.context.targetSpeakers),
                itemId: msg.system.context.weaponId,
                workflow: msg,
            })	
            if (msg.system.data.burst == true) compiledData.overrideRepeat=3
            if (msg.system.data.rapidFire == true) compiledData.overrideRepeat=6
        
            if (!compiledData.item) { return; }
            runImpMal(compiledData)
            checkCrit(msg)

        } else {
            let itemUuid = msg.system.context?.itemUsedUuid
            let itemId = msg.system.context?.powerId ?? msg.system.context?.itemId ?? msg.system.context?.weaponId ?? msg.system.context?.skillItemId
            
            let compiledData = await getRequiredData({
                actorId: msg.speaker.actor ?? msg.system.context?.speaker.actor,
                targets: compileTargets(msg.system.context?.targetSpeakers),
                itemUuid: itemUuid,
                itemId: itemId,
                item: itemId || itemUuid ? null: {name: msg.system.context?.skill},
                workflow: msg,
            })
            if (!compiledData.item) { return; }
            runImpMal(compiledData)	
        }
	});
}	

function compileTargets(targets) {
  if (!targets) { return []; }
   return Array.from(targets).map(target => {
      let token = game.scenes.get(target.scene)?.tokens.get(target.token)
      return token?.constructor.name === "TokenDocument" ? token?.object : token;
   });
}

async function runImpMal(input) {
    const handler = await AAHandler.make(input);
    trafficCop(handler);
}

async function checkCrit(msg) {
    if(!msg.system.result.critical) return;
    
    let critAnim = game.settings.get("autoanimations", "criticalAnimation");
    if(!critAnim) return;

    let critSequence = new Sequence({moduleName: "Automated Animations", softFail: !game.settings.get("autoanimations", "debug")});

    for(let target of compileTargets(msg.system.context?.targetSpeakers)){
        critSequence
        .effect()
        .file(critAnim)
        .atLocation(target)
        .missed()
        .delay(100)
    }

    critSequence.play();
}

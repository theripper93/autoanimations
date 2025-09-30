import { trafficCop }       from "../router/traffic-cop.js"
import AAHandler            from "../system-handlers/workflow-data.js";
import { getRequiredData }  from "./getRequiredData.js";


export function systemHooks() {
  Hooks.on("createChatMessage", async (msg) => {
  if(msg.type != "dualityRoll" && msg.type != "adversaryRoll"){
    return;
  }
  let data2 = msg.system ?? msg.flags?.daggerheart;
    checkDHMessage(data2);
  });
}

async function checkDHMessage(msg) {
  if(!msg.source.item){
    return;
  }
  let compiledData = await getRequiredData({
      name: msg.title,
      item: getItemDH(msg.source.item, msg.source.actor, msg.title),
      actorId: getTokenFromScene(msg.source.actor),
      targets: getTargetsDH(),///msg.targets,
      workflow: msg
  });
  const handler = await AAHandler.make(compiledData);
  trafficCop$1(handler);
  
}
    function getTargetsDH(){
      const targetarray = Array.from(game.user.targets);

      return targetarray;
    }

    function getItemDH(selection, source) {
        const actor = fromUuidSync(source);
        let item = actor.items.find(i => i._id == selection);
        if(!item)
        {
          let DHItem = ({name: Name.substring(Name.indexOf(":") + 2)});
          item = DHItem;
        }
       
        return item;
    }

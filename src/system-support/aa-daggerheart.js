import { trafficCop }       from "../router/traffic-cop.js"
import AAHandler            from "../system-handlers/workflow-data.js";
import { getRequiredData }  from "./getRequiredData.js";


export function systemHooks() {
  Hooks.on("createChatMessage", async (msg) => {
  if(msg.type != "dualityRoll" && msg.type != "adversaryRoll"){
    return;
  }
  if (msg.user.id !== game.user.id) {
    return
  }
  let data2 = msg.system ?? msg.flags?.daggerheart;
    checkDHMessage(data2);
  });
}

async function checkDHMessage(msg) {
  if(!msg?.source?.item){ return; }
  let itemData = getItemDH(msg.source.item, msg.source.actor, msg.title);
  
  let extraNames = [];
  // If the title contains a colon, extract the part after it as a potential subname for matching
  if (msg.title && msg.title.indexOf(":") > -1) {
    const subname = msg.title.substring(msg.title.indexOf(":") + 2).trim();
    if (subname) { extraNames.push(subname); }
  }

  let compiledData = await getRequiredData({
      name: msg.title,
      item: itemData,
      actorId: canvas.scene.tokens.get(msg.source.actor),
      targets: getTargetsDH(),//msg.targets,
      workflow: msg,
      extraNames: extraNames, // Pass extracted subnames for prioritized matching
  });
  const handler = await AAHandler.make(compiledData);
  trafficCop(handler);
  
}
    function getTargetsDH(){
      const targetarray = Array.from(game.user.targets);
      return targetarray;
    }

    function getItemDH(selection, source, itemTitle) {
        const actor = fromUuidSync(source);
        let item = actor.items.find(i => i._id == selection);

        // If an item was found by ID, use its actual name.
        if (item) { return item; }

        // If no item was found by ID, create a dummy item object using the full itemTitle.
        // This ensures a name is always available for handleItem to attempt a match.
        let DHItem = { name: itemTitle };
        return DHItem;
    }

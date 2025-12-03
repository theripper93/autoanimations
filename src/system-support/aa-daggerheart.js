import { trafficCop }       from "../router/traffic-cop.js"
import AAHandler            from "../system-handlers/workflow-data.js";
import { getRequiredData }  from "./getRequiredData.js";

export function systemHooks() {
  Hooks.on("createChatMessage", _onCreateChatMessage);
}

/**
 * Hook callback that fires  after conclusion of a creation workflow of a ChatMessage.
 * @param {foundry.documents.ChatMessage} msg - The new ChatMessage instance which has been created
 * @param {foundry.abstract.types.DatabaseCreateOperation} _options - Additional options which modified the creation request
 * @param {String} userId - The ID of the User who triggered the creation workflow
 * @returns
 */
async function _onCreateChatMessage(msg, _options, userId) {
  const validTypes = ["adversaryRoll", "dualityRoll"];
  if (!validTypes.includes(msg.type) || !msg.isAuthor) return;

  const data = msg.system ?? msg.flags?.daggerheart;

  const itemId = data.source.item;
  if (!itemId) return;

  const actor = fromUuidSync(data.source.actor);
  const item = DHGetItem(actor, itemId, msg.type);

  const compiledData = await getRequiredData({
    item: item,
    actor: actor,
    targets: Array.from(game.user.targets),
    workflow: data,
  });

  const handler = await AAHandler.make(compiledData);
  trafficCop(handler);

  function DHGetItem(actor, item, type)
  {
    if(type == "adversaryRoll" && !actor.items.get(item))
    {
      return actor.system.attack;
    }
    else
    {
      return actor.items.get(item)
    }
  }
}

/**
 * @file aa-daggerheart.js
 * @version 1.0.0
 * 
 * Compatibility: Designed and tested for Daggerheart system version 1.3.2.
 * 
 * @Note
 * I implemented this code, overwriting the previous one.
 * If you have any questions about how it works, you can send a message to my Discord: `joaquinp98` or mail to: `joaquinperyera98@gmail.com`
 * But feel free to overwrite this code at any time if you wish.
 */

import { trafficCop } from "../router/traffic-cop.js";
import AAHandler from "../system-handlers/workflow-data.js";

/**
 * CONSTANTS
 */
const VALID_MESSAGE_TYPES = ["adversaryRoll", "dualityRoll"];

/**
 * Registers system hooks.
 */
export function systemHooks() {
   Hooks.on("createChatMessage", handleChatMessageCreation);
}

/**
 * Hook callback that fires after conclusion of a creation workflow of a ChatMessage.
 * @param {foundry.documents.ChatMessage} msg - The new ChatMessage instance.
 * @param {Partial<foundry.abstract.types.DatabaseCreateOperation>} _options - Additional options which modified the creation request
 * @param {String} userId - The ID of the User who triggered the creation workflow
 * @returns {Promise<void>}
 */
async function handleChatMessageCreation(msg, _options, _userId) {
   if (!msg.isAuthor || !VALID_MESSAGE_TYPES.includes(msg.type)) return;

   const workflowData = msg.system ?? msg.flags?.daggerheart;

   if (!workflowData?.source?.item) return;

   const { item: itemId, actor: actorUuid } = workflowData.source;

   const actor = await fromUuid(actorUuid);
   const item = actor?.items.get(itemId);
   if (!actor || !item)
      return console.warn(
         `Daggerheart Workflow: Could not find Item (${itemId}) or Actor (${actorUuid}) for ChatMessage.`,
         {
            msg,
            actor,
            item,
         }
      );

   const handler = await AAHandler.make({
      item,
      actor,
      targets: Array.from(game.user.targets),
   });

   trafficCop(handler);
}

import { trafficCop } from "../router/traffic-cop.js";
import AAHandler from "../system-handlers/workflow-data.js";
import { debug } from "../constants.js";
import { getRequiredData } from "./getRequiredData.js";

export function systemHooks() {
  Hooks.on("createChatMessage", async (msg) => {
    if (msg.author?.id !== game.user.id) return;

    const flags = msg.flags?.pokerole;
    if (!flags?.itemUse) return;

    const { itemUuid, actorUuid, tokenUuid } = flags;

    const item = await fromUuid(itemUuid);
    if (!item) {
      debug("Pokerole | Item not found");
      return;
    }

    let token = null;
    if (tokenUuid) {
      token = await fromUuid(tokenUuid);
    }
    if (!token && actorUuid) {
      const actor = await fromUuid(actorUuid);
      if (actor) {
        const tokens = actor.getActiveTokens();
        if (tokens.length) token = tokens[0];
      }
    }
    if (!token) {
      debug("Pokerole | Token not found");
      return;
    }

    const targets = Array.from(game.user.targets);

    const data = {
      item,
      token,
      targets,
      actor: token.actor,
    };

    const compiledData = await getRequiredData(data);
    const handler = await AAHandler.make(compiledData);

    if (handler?.item && handler?.sourceToken) {
      trafficCop(handler);
    } else {
      debug("Pokerole | Handler missing required data");
    }
  });
}
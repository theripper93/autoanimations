import { trafficCop } from "../router/traffic-cop.js"
import AAHandler from "../system-handlers/workflow-data.js";
import { getRequiredData } from "./getRequiredData.js";

export function systemHooks() {
   Hooks.on("fadeAttackRoll", async (data) => {
      const targetTokens = await Promise.all(data.targets.map(uuid => fromUuid(uuid)));
      data.targets = targetTokens.map(token=>token.object);
      const requiredData = await getRequiredData(data);
      runFade(requiredData)
   });

   //Hooks.on("fadeDamageRoll", async (data) => {
      //const requiredData = await getRequiredData(data);
      //runFade(requiredData)
   //});

   Hooks.on("fadeCastSpell", async (data) => {
      const targetTokens = await Promise.all(data.targets.map(uuid => fromUuid(uuid)));
      data.targets = targetTokens.map(token=>token.object);
      const requiredData = await getRequiredData(data);
      runFade(requiredData)
   });
}

async function runFade(data) {
   const handler = await AAHandler.make(data)
   trafficCop(handler);
}

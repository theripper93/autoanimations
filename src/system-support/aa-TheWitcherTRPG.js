import { trafficCop } from "../router/traffic-cop.js"
import AAHandler from "../system-handlers/workflow-data.js";
import { getRequiredData } from "./getRequiredData.js";

export function systemHooks() {
    Hooks.on("createChatMessage", async (msg) => { checkMessage(msg) });
}

async function checkMessage(msg) {
    if (msg.author.id !== game.user.id) {
       return;
    };

    let data = msg.system
    let compiledData = await getRequiredData({
        itemUuid: data?.attack?.itemUuid,
        attackSkill: data?.attack?.attackSkill ?? data?.attack?.skill,
        damage: data?.damage,
        actorId: msg.speaker?.actor,
        tokenId: msg.speaker?.token,
        sceneId: msg.speaker?.scene,
        alias: msg.speaker?.alias,
        extraNames: [],
        workflow: msg,
    })

    let attackSkillEnabled = game.settings.get('autoanimations', 'attackSkill');
    let damageEnabled = game.settings.get('autoanimations', 'damage');

    if (!attackSkillEnabled && !damageEnabled) {
        return null;
    }

    if (compiledData.attackSkill && attackSkillEnabled) {
        compiledData.extraNames.push(compiledData.attackSkill);
    }  else if (damageEnabled) {
        compiledData.item = { name: compiledData.damage ? "damage" : "no-damage" };
        compiledData.extraNames.push(compiledData.damage ? "damage" : "no-damage");
    } else {
        return null;
    }

    const handler = await AAHandler.make(compiledData)
    trafficCop(handler);
}
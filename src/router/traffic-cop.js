import { DataSanitizer } from "../aa-classes/DataSanitizer.js";
import { debug } from "../constants/constants.js";
import { AAAutorecFunctions } from "../aa-classes/aaAutorecFunctions.js";

import * as animate from "../animation-functions"

const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

export async function trafficCop(handler) {
    if (!handler) { return; }
    const data = foundry.utils.deepClone(handler.animationData);
    if (data.advanced?.excludedType?.enabled && data.advanced?.excludedType?.path && data.advanced?.excludedType?.property) {
        if (AAAutorecFunctions.checkExcludedProperty(handler.item, data.advanced?.excludedType?.property, data.advanced?.excludedType?.path)) {
            return;
        }
    }
    Hooks.callAll("aa.preDataSanitize", handler, data);

    const sanitizedData = await DataSanitizer._getAnimationData(handler, data);
    Hooks.callAll("aa.preAnimationStart", sanitizedData);

    let globalDelay = game.settings.get("autoanimations", "globaldelay");
    await wait(globalDelay);

    let aaTemplateHook;

    if (sanitizedData.macro && sanitizedData.macro.enable && sanitizedData.macro.playWhen === "2") {

        if (handler.isTemplateAnimation) {
            switch (game.system.id) {
                case "a5e":
                case "sw5e":
                case "tormenta20":
                    aaTemplateHook = Hooks.once("createRegion", async (template) => {
                        await wait(500)
                        handler.templateData = template;
                        playMacro()
                    });
                    setTimeout(killHook, 30000)
                    break;
                default:
                    await wait(500)
                    handler.templateData = canvas.scene.regions.contents.at(-1);
                    playMacro()
                }
        } else {
            playMacro()
        }
        function playMacro() {
            handler.runMacro(sanitizedData.macro)
        }
        return;
    }

    if (data.soundOnly?.sound?.enable && data.soundOnly?.sound?.file) {
        const sound = {
            file: data.soundOnly?.sound?.file ?? "",
            volume: data.soundOnly?.sound?.volume ?? 0.75,
            delay: data.soundOnly?.sound?.delay ?? 0,
            startTime: data.soundOnly?.sound?.startTime ?? 0,
            repeat: data.soundOnly?.sound?.repeat ?? 1,
            repeatDelay: data.soundOnly?.sound?.repeatDelay ?? 250,
        }
        new Sequence(handler.sequenceData)
            .sound()
                .file(sound.file)
                .volume(sound.volume)
                .delay(sound.delay)
                .startTime(sound.startTime)
                .repeats(sound.repeat, sound.repeatDelay)
            .play()
        return;
    }

    if (data.levels3d?.type && game.Levels3DPreview?._active) {
        animate.particleEffects(handler, data)
        return;
    }

    const animationType = data.menu === "preset" ? data.presetType : data.menu === "aefx" ? data.activeEffectType : data.menu;
    const targets = handler.allTargets?.length;

    if (animationType === "templatefx" || animationType === "proToTemp") {
        if (animationType === "proToTemp" && !handler.sourceToken) {
            debug("Failed to initialize a Source Token")
            return;
        }
        debug(`${animationType} Animation Start"`, handler, sanitizedData)
        if (handler.templateData) {
            await wait(500)
            animate[animationType](handler, sanitizedData);
            return;
        }
        //sections for Template Hooks.once or straight to function. Systems running the createMeasuredTemplate hook, or those whose workflow runs after template placement, will skip Hooks.once
        switch (game.system.id) {
            case "a5e":
            case "sf2e":
            case "pf2e":
            case "sw5e":
            case "tormenta20":
                aaTemplateHook = Hooks.once("createRegion", async (template) => {
                    await wait(500)
                    animate[animationType](handler, sanitizedData, template);
                });
                setTimeout(killHook, 30000)
                break;
            default:
                await wait(500)
                let template = canvas.scene.regions.contents.at(-1);
                if (!template) {
                    debug("No template found for the Template animaiton, existing early")
                    return;
                }
                animate[animationType](handler, sanitizedData, template);
        }
        return;
    } else {
        if (!handler.sourceToken || targets < 1 && (animationType === "melee" || animationType === "range")) {
            Hooks.callAll("aa.animationEnd", handler.sourceToken, "no-target");
            debug(`${animationType} Animation End", "NO TARGETS`)
            return;
        }
        debug(`${animationType} Animation Start"`, sanitizedData)
        animate[animationType](handler, sanitizedData);
        return;
    }
    function killHook() {
        Hooks.off("createRegion", aaTemplateHook)
    }
}

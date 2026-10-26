import { howToDelete } from "../../constants.js";
import { addScreenShake, sourceMotion, targetMotion } from "../../system-handlers/commonSequences.js";

// Credit goes to Wasp-Sequencer Guy for the structure of the Fireball Sequence
export async function proToTemp(handler, animationData, templateDocument) {

    const data = animationData.primary;
    const sourceFX = animationData.sourceFX;
    const secondary = animationData.secondary;
    const targetFX = animationData.targetFX;
    const macro = animationData.macro;
    const motion = animationData.motion;
    const screenShake = animationData.screenShake;

    const template = handler.templateData ? handler.templateData : templateDocument;
    const sourceToken = handler.sourceToken;

    let aaSeq = await new Sequence(handler.sequenceData)
    if (data.projectile.options.removeTemplate) {
        aaSeq.thenDo(function () {
            const docName = template?.documentName || "MeasuredTemplate";
            canvas.scene.deleteEmbeddedDocuments(docName, [template.id]);
        })
    }

    // Play Macro if Awaiting
    if (macro && macro.playWhen === "1" && !macro?.args?.warpgateTemplate) {
        handler.complileMacroSection(aaSeq, macro)
    }

    // Extra Effects => Source Token if active
    if (sourceFX) {
        handler.compileSourceEffect(sourceFX, aaSeq)
    }
    if (motion) { sourceMotion(motion, aaSeq, handler) }

    //Projectile Sound and Animation
    if (data.projectile.sound) {
        aaSeq.addSequence(data.projectile.sound)
    }
    const effect1 = aaSeq.effect()
        .file(data.projectile.path.file)
        .atLocation(sourceToken)
        .stretchTo(template, { cacheLocation: true, randomOffset: data.projectile.options.randomOffset })
        .repeats(data.projectile.options.repeat, data.projectile.options.repeatDelay)
        .playbackRate(data.projectile.options.playbackRate)
        .opacity(data.projectile.options.opacity)
        .waitUntilFinished(data.projectile.options.wait)

    const sourceLevel = (sourceToken?.document ?? sourceToken)?.level ?? canvas.level;
    // Effects at the template's cached location have no elevation of their own
    const templateElevation = handler.targetElevation(template, sourceToken);
    const templateLevel = handler.targetLevel(template, sourceToken);
    effect1.onLevels([sourceLevel, templateLevel]);

    if (data.projectile.options.elevation < 1) {
        effect1.belowTokens(true)
    }
    if (data.preExplosion.sound) {
        aaSeq.addSequence(data.preExplosion.sound)
    }
    if (data.preExplosion.enable) {
        const effectExplode = aaSeq.effect()
            .file(data.preExplosion.path.file)
            .atLocation(template, { cacheLocation: true })
            .scaleToObject(data.preExplosion.options.scale)
            .repeats(data.preExplosion.options.repeat, data.preExplosion.options.repeatDelay)
            .playbackRate(data.preExplosion.options.playbackRate)
            .opacity(data.preExplosion.options.opacity)
            .waitUntilFinished(data.preExplosion.options.wait)
            .aboveLighting(data.preExplosion.options.aboveTemplate)

        effectExplode.elevation(templateElevation, { absolute: true })
        if (data.preExplosion.options.elevation < 1) {
            effectExplode.belowTokens(true)
        } else {
            effectExplode.onLevels(templateLevel);
        }
    }
    if (data.explosion.sound) {
        aaSeq.addSequence(data.explosion.sound)
    }
    const effect2 = aaSeq.effect()
        .file(data.explosion.path.file)
        .atLocation(template, { cacheLocation: true })
        .scaleToObject(data.explosion.options.scale)
        .repeats(data.explosion.options.repeat, data.explosion.options.repeatDelay)
        .zIndex(5)
        .playbackRate(data.explosion.options.playbackRate)
        .opacity(data.explosion.options.opacity)
        .waitUntilFinished(-750 + data.explosion.options.wait)
        .aboveLighting(data.explosion.options.aboveTemplate)

    effect2.onLevels(templateLevel);

    effect2.elevation(templateElevation, { absolute: true })
    if (data.explosion.options.elevation < 1) {
        effect2.belowTokens(true)
    }

    // Reactions and shake with the explosion.
    if (motion) { targetMotion(motion, aaSeq, handler) }
    if (screenShake) { addScreenShake(screenShake, aaSeq) }
    if (data.afterImage.customPath) {
        const effectAfterImage = aaSeq.effect()
            .file(data.afterImage.customPath)
            .atLocation(template, { cacheLocation: true })
            .scaleToObject(data.afterImage.options.scale)
            .persist(data.afterImage.options.persistent)
            .origin(handler.itemUuid)
            .fadeIn(250)
            .fadeOut(500)

        effectAfterImage.elevation(templateElevation, { absolute: true })
        if (data.afterImage.options.elevation < 1) {
            effectAfterImage.belowTokens(true)
        } else {
            effectAfterImage.onLevels(templateLevel);
        }
    }

    if (secondary) {
        handler.compileSecondaryEffect(secondary, aaSeq, handler.allTargets, targetFX.enable, false)
    }
    if (targetFX) {
        handler.compileTargetEffect(targetFX, aaSeq, handler.allTargets, false)
    }

    if (macro && macro.playWhen === "0" && !macro?.args?.warpgateTemplate) {
        handler.runMacro(macro)
    }

    if (data.afterImage.enable && data.afterImage.options.persistent) { howToDelete("sequencerground") }

    // Macro if Awaiting Animation. This will respect the Delay/Wait options in the Animation chains
    if (macro && macro.playWhen === "3") {
        handler.complileMacroSection(aaSeq, macro)
    }

    aaSeq.play()

}
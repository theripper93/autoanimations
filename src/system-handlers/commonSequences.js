import { applyColorTint } from "../animation-functions/color-tint.js";

export function sourceEffect(sourceFX, seq, handler) {
    const options = sourceFX.options;
    if (sourceFX.sound) {
        seq.addSequence(sourceFX.sound)
    }
    let thisSeq = seq.effect()
        .file(sourceFX.path.file)
        .anchor({ x: options.anchor.x, y: options.anchor.y })
        .fadeIn(options.fadeIn)
        .opacity(options.opacity)
        .origin(handler.itemUuid)
        .playbackRate(options.playbackRate)
        .repeats(options.repeat, options.repeatDelay)
        .size(handler.getSize(options.isRadius, options.size, handler.sourceToken, options.addTokenWidth), { gridUnits: true })
        .zIndex(options.zIndex)

    if (options.elevation < 1) {
        thisSeq.belowTokens(true)
    } else {
        const sourceLevel = (handler.sourceToken?.document ?? handler.sourceToken)?.level ?? canvas.level;
        thisSeq.onLevels(sourceLevel);
    }
    if (options.tint) {
        applyColorTint(thisSeq, options.tintColor, { hue: options.hue, contrast: options.contrast, saturate: options.saturation })
    }
    if (options.animationSource) {
        thisSeq.atLocation({ x: options.fakeLocation.x, y: options.fakeLocation.y })
    } else {
        if (options.persistent) {
            thisSeq.attachTo(handler.sourceToken)
            thisSeq.persist(true, { persistTokenPrototype: true })
        } else {
            thisSeq.attachTo(handler.sourceToken)
        }
    }
    if (options.isMasked) {
        thisSeq.mask(handler.sourceToken)
    }
    if (handler.systemData.tieToDocuments) {
        thisSeq.tieToDocuments(handler.item)
    }
    if (sourceFX.video.variant === "complete" || sourceFX.video.animation === "complete") { }
    else { thisSeq.fadeOut(options.fadeOut) }
    if (options.isWait) { thisSeq.waitUntilFinished(options.delay) }
    else { thisSeq.delay(options.delay) }
}

export function secondaryEffect(secondary, seq, targetArray, targetEnabled = false, missable = false, handler) {
    const options = secondary.options;
    if (secondary.sound) {
        seq.addSequence(secondary.sound)
    }
    for (let i = 0; i < targetArray.length; i++) {
        let currentTarget = targetArray[i];

        let thisSeq = seq.effect()
            .file(secondary.path?.file)
            .anchor({ x: options.anchor.x, y: options.anchor.y })
            .atLocation(missable ? `spot ${currentTarget.id}` : currentTarget)
            .fadeIn(options.fadeIn)
            .fadeOut(options.fadeOut)
            .opacity(options.opacity)
            .origin(handler.itemUuid)
            .playbackRate(options.playbackRate)
            .repeats(options.repeat, options.repeatDelay)
            .size(handler.getSize(options.isRadius, options.size, currentTarget, options.addTokenWidth), { gridUnits: true })
            .zIndex(options.zIndex)

        if (options.elevation < 1) {
            thisSeq.belowTokens(true)
        } else {
            const targetLevel = (currentTarget?.document ?? currentTarget)?.level ?? canvas.level;
            thisSeq.onLevels(targetLevel);
        }
        if (options.tint) {
            applyColorTint(thisSeq, options.tintColor, { hue: options.hue, contrast: options.contrast, saturate: options.saturation })
        }
        if (i === handler.allTargets.length - 1 && options.isWait && targetEnabled) {
            thisSeq.waitUntilFinished(options.delay)
        } else if (!options.isWait) {
            thisSeq.delay(options.delay)
        }
        if (options.rotateSource) {
            thisSeq.rotateTowards(handler.sourceToken)
            thisSeq.rotate(180)
        }
        if (options.isMasked) {
            thisSeq.mask(currentTarget)
        }
    }
}

export function targetEffect(targetFX, seq, targetArray, missable = false, handler) {
    const options = targetFX.options;
    if (targetFX.sound) {
        seq.addSequence(targetFX.sound)
    }
    for (let i = 0; i < targetArray.length; i++) {
        let currentTarget = targetArray[i];
        let checkAnim = Sequencer.EffectManager.getEffects({ object: currentTarget, origin: handler.itemUuid }).length > 0;
        if (checkAnim) { continue; }

        let thisSeq = seq.effect()
            .file(targetFX.path?.file)
            .anchor({ x: options.anchor.x, y: options.anchor.y })
            .delay(options.delay)
            .fadeIn(options.fadeIn)
            .opacity(options.opacity)
            .origin(handler.itemUuid)
            .playbackRate(options.playbackRate)
            .repeats(options.repeat, options.repeatDelay)
            .size(handler.getSize(options.isRadius, options.size, currentTarget, options.addTokenWidth), { gridUnits: true })
            .zIndex(options.zIndex)

        if (options.elevation < 1) {
            thisSeq.belowTokens(true)
        } else {
            const targetLevel = (currentTarget?.document ?? currentTarget)?.level ?? canvas.level;
            thisSeq.onLevels(targetLevel);
        }
        if (options.tint) {
            applyColorTint(thisSeq, options.tintColor, { hue: options.hue, contrast: options.contrast, saturate: options.saturation })
        }
        if (options.persistent) {
            thisSeq.persist(true, { persistTokenPrototype: true })
            thisSeq.attachTo(currentTarget, { bindVisibility: targetFX.options.unbindVisibility, bindAlpha: targetFX.options.unbindAlpha })
        } else {
            thisSeq.atLocation(missable ? `spot ${currentTarget.id}` : currentTarget)
        }
        if (options.rotateSource) {
            thisSeq.rotateTowards(handler.sourceToken)
            thisSeq.rotate(180)
        }
        if (options.isMasked) {
            thisSeq.mask(currentTarget)
        }
        if (targetFX.video?.variant === "complete" || targetFX.video?.animation === "complete") { } else {
            thisSeq.fadeOut(options.fadeOut)
        }
    }
}

export function macroSection(seq, macro, handler) {
    let userData = macro.args
    if (foundry.utils.isNewerVersion(game.version, 11)) {
        seq.macro(macro.name, { args: [handler.workflow, handler, userData] })
    } else {
        if (game.modules.get("advanced-macros")?.active) {
            seq.macro(macro.name, handler.workflow, handler, userData)
        } else {
            seq.macro(macro.name)
        }
    }
}

export function sourceMotion(motion, seq, handler) {
    if (!motion.source || !Sequencer.MotionManager) { return; }
    addMotion(seq, motion.source, handler.sourceToken, handler.allTargets[0]);
}

export function targetMotion(motion, seq, handler) {
    if (!motion.target || !Sequencer.MotionManager) { return; }
    for (const target of handler.allTargets) {
        const hit = !handler.playOnMiss || handler.hitTargetsId.includes(target.id);
        if (motion.target.onlyOnHit && !hit) { continue; }
        addMotion(seq, motion.target, target, handler.sourceToken);
    }
}

export function addScreenShake(shake, seq) {
    seq.canvasPan()
        .shake({ duration: shake.duration, strength: shake.strength })
        .delay(shake.delay)
}

function addMotion(seq, m, token, other) {
    if (["lunge", "recoil", "knockback"].includes(m.type) && !other) { return; }
    const motion = seq.motion(token).delay(m.delay);
    const duration = m.duration;
    switch (m.type) {
        case "shake":
            motion.noise({ frequency: 30, strengthScaledToObject: m.strength / 100, duration, fadeOutDuration: Math.min(150, duration) });
            break;
        case "knockback":
        case "recoil":
            motion.moveBy(m.distance, { awayFrom: other, gridUnits: true, ease: "easeOutCubic", duration });
            break;
        case "lunge":
            motion.moveBy(m.distance, { towards: other, gridUnits: true, ease: "easeOutQuad", duration });
            break;
        case "flash":
            motion.tintTo(m.color, { duration });
            break;
        case "spin":
            motion.rotateBy(360, { duration, return: false });
            break;
        case "pulse":
            motion.scaleTo(m.scale, { duration });
            break;
        case "float":
            motion.oscillate({ period: Math.min(800, duration), waveform: "sine", y: { strengthScaledToObject: m.height / 100 }, duration });
            break;
        case "fade":
            motion.fadeTo(m.opacity, { duration });
            break;
    }
}

import { socketlibSocket } from "../../socketset.js";
import { howToDelete } from "../../constants/constants.js";
const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

export async function templatefx(handler, animationData, templateDocument) {

    const sourceToken = handler.sourceToken;

    const template = handler.templateData ? handler.templateData : templateDocument;
    const templateType = template?.shapes?.[0]?.type;
    const templateDistance = template?.shapes?.[0]?.measuredSegments?.[0]?.distance;

    const data = animationData.primary;
    const secondary = animationData.secondary;
    const sourceFX = animationData.sourceFX;
    const targetFX = animationData.targetFX;
    const macro = animationData.macro;

    const templateTypes = ['sphere', 'cylinder', 'radius']

    let aaSeq = await new Sequence(handler.sequenceData)

    if ((data.options.persistent && data.options.persistType !== "attachtemplate") || !data.options.persistent) {
        aaSeq.thenDo(function () {
            if (data.options.removeTemplate) {
                canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", [template.id])
            }
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
    // Primary Sound
    if (data.sound) {
        aaSeq.addSequence(data.sound)
    }

    aaSeq.thenDo(function () {
        Hooks.callAll("aa.animationStart", sourceToken, "no-target")
    })

    if (data.options.persistent && (data.options.persistType === 'overheadtile' || data.options.persistType === 'groundtile')) {
        
        const { x, y, width, height } = template.shapes[0].bounds;
        const isOverhead = data.options.persistType === 'overheadtile' ? true : false;
        const templateObject = buildTile(x + width / 2, y + height / 2, isOverhead, width, height);

        if(data.options.tint && data.options.tintColor) templateObject.texture.tint = data.options.tintColor;

        templateObject.alpha = data.options.opacity;

        aaSeq.thenDo(function () {
            socketlibSocket.executeAsGM("placeTile", templateObject);
        })

    } else {

        const templateSeq = aaSeq.effect();
        if (templateType === 'cone' || templateType === 'line') {
            const trueHeight = templateType === 'cone' ? templateDistance : template.shapes[0].width * 2 / canvas.dimensions.distancePixels;
            setPrimary(templateSeq)
            templateSeq.size({
                width: templateDistance * canvas.dimensions.distancePixels * data.options.scale.x,
                height: trueHeight * canvas.dimensions.distancePixels * data.options.scale.y,
            })
            if (data.options.isMasked) {
                templateSeq.mask(template)
            }
            if (data.options.persistent) {
                templateSeq.persist(true)
                if (data.options.persistType === 'attachtemplate') {
                    templateSeq.attachTo(template)
                    templateSeq.rotateTowards(template, { attachTo: true })
                } else {
                    templateSeq.atLocation(template, { cacheLocation: true })
                    templateSeq.rotateTowards(template, { cacheLocation: true })
                }
            } else {
                templateSeq.atLocation(template, { cacheLocation: true })
                templateSeq.repeats(data.options.repeat, data.options.repeatDelay)
                templateSeq.rotateTowards(template, { cacheLocation: true })
            }
            if (!data.options.isWait) {
                templateSeq.delay(data.options.delay)
            }
        }

        if (templateType === 'circle' || templateType === 'rectangle') {
            let trueSize;
            if (templateType === 'rectangle') {
                trueSize = templateDistance;
            } else {
                trueSize = templateDistance * 2;
            }
            setPrimary(templateSeq)
            templateSeq.size({
                width: canvas.grid.size * (trueSize / canvas.dimensions.distance) * data.options.scale.x,
                height: canvas.grid.size * (trueSize / canvas.dimensions.distance) * data.options.scale.y,
            })
            if (data.options.persistent) {
                templateSeq.persist(true)
                if (data.options.persistType === 'attachtemplate') {
                    templateSeq.attachTo(template, { bindRotation: true })
                } else {
                    templateSeq.atLocation(template, { cacheLocation: true })
                    templateSeq.persist()
                }
            } else {
                templateSeq.atLocation(template, { cacheLocation: true })
                templateSeq.repeats(data.options.repeat, data.options.repeatDelay)
            }
            if (!data.options.isWait) {
                templateSeq.delay(data.options.delay)
            }
        }
    }

    if (handler.allTargets.length > 0 && data.options.isWait) {
        aaSeq.wait(data.options.delay || 250)
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

    // Macro if Awaiting Animation. This will respect the Delay/Wait options in the Animation chains
    if (macro && macro.playWhen === "3") {
        handler.complileMacroSection(aaSeq, macro)
    }

    aaSeq.play()

    if (data.options.persistent) {
        switch (data.options.persistType) {
            case "overheadtile":
                howToDelete("overheadtile")
                break;
            case "groundtile":
                howToDelete("groundtile")
                break;
            case "sequencerground":
                howToDelete("sequencerground")
                break;
        }
    }

    await wait(500)
    Hooks.callAll("aa.animationEnd", sourceToken, "no-target")


    function setPrimary(seq) {
        seq.anchor(convertToXY(data.options.anchor))
        seq.file(data.path.file)
        seq.opacity(data.options.opacity)
        seq.origin(handler.itemUuid)
        if (data.options.elevation === 0) {
            seq.belowTokens(true)
        } else {
            seq.elevation(handler.elevation(sourceToken, data.options.isAbsolute, data.options.elevation), { absolute: data.options.isAbsolute })
        }
        seq.zIndex(data.options.zIndex)
        seq.rotate(data.options.rotate)
        if (data.options.isMasked) {
            seq.mask(template)
        }
        seq.playbackRate(data.options.playbackRate)
        seq.name(handler.rinsedName)
        seq.aboveLighting(data.options.aboveTemplate)
        seq.xray(data.options.xray)
        if (data.options.tint) {
            seq.tint(data.options.tintColor)
            seq.filter("ColorMatrix", { contrast: data.options.contrast, saturate: data.options.saturation })
        }
        function convertToXY(input) {
            let menuType = data.video.menuType;
            let templateType = template.shapes?.[0]?.type;
            let defaultAnchor = templateType === "circle" || templateType === "rectangle" ? { x: 0.5, y: 0.5 } : { x: 0, y: 0.5 };
            if (!input) { return defaultAnchor }
            let dNum = menuType === "cone" || menuType === "ray"
                ? input || "0, 0.5"
                : input || "0.5, 0.5"
            //if (!input) { return {x: dNum, y: dNum}}
            let parsedInput = dNum.split(',').map(s => s.trim());
            let posX = Number(parsedInput[0]);
            let posY = Number(parsedInput[1]);
            if (parsedInput.length === 2) {
                return { x: posX, y: posY }
            } else if (parsedInput.length === 1) {
                return { x: posX, y: posX }
            }
        }
    }

    function buildTile(tileX, tileY, isOverhead, tileWidth, tileHeight) {
        const occlusionMapping = {
            "3": CONST.TILE_OCCLUSION_MODES.RADIAL,
            "1": CONST.TILE_OCCLUSION_MODES.FADE,
            "2": CONST.TILE_OCCLUSION_MODES.FADE,
            "0": CONST.TILE_OCCLUSION_MODES.NONE,
        }
        const isRoofOcclusion = data.options.occlusionMode === "2";
        const bottom = Number.isFinite(canvas.level.elevation.bottom) ? canvas.level.elevation.bottom : 0;
        const top = Number.isFinite(canvas.level.elevation.top) ? canvas.level.elevation.top : bottom + canvas.dimensions.distance * 4;
        const elevation = isOverhead ? top : bottom;
        return {
            alpha: data.options.opacity,
            width: tileWidth,
            height: tileHeight,
            texture: { src: data.path.filePath },
            elevation: elevation,
            occlusion: {
                alpha: `${data.options.occlusionAlpha}`,
                modes: [occlusionMapping[data.options.occlusionMode ?? "0"]],
                restrictions: {
                    light: isRoofOcclusion,
                    weather: isRoofOcclusion
                }
            },
            video: {
                autoplay: true,
                loop: true,
                volume: 0,
            },
            flags: {
                autoanimations: {
                    origin: handler.itemUuid,
                }
            },
            x: tileX,
            y: tileY,
            z: 100,
        }
    }
}

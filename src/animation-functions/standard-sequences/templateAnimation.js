import { socketlibSocket } from "../../socket.js";
import { howToDelete } from "../../constants.js";
import { addScreenShake, sourceMotion, targetMotion } from "../../system-handlers/commonSequences.js";
import { applyColorTint } from "../color-tint.js";
import { constrainToRegionWalls, isWallRestricted } from "../wall-restriction.js";
const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

const CENTERED_SHAPES = ['circle', 'rectangle', 'ellipse', 'ring', 'polygon'];
const AREA_SHAPES = [...CENTERED_SHAPES, 'emanation'];
const MASKED_SHAPES = ['polygon', 'ring'];

export async function templatefx(handler, animationData, templateDocument) {

    const sourceToken = handler.sourceToken;

    const template = handler.templateData ? handler.templateData : templateDocument;

    const shapes = template?.shapes;

    // Template regions are usually unbounded, which Sequencer resolves to elevation 0 for cached locations
    // and to the topmost Level for attached effects: use the region's bottom, else its Level, else the caster's
    const groundElevation = handler.targetElevation(template, sourceToken);
    for (const shape of shapes) {

        const shapeType = shape.type;
        const shapeDistance = shape.measuredSegments?.[0]?.distance;

        const templatesGridHidden = game.settings.get('autoanimations', 'forceRegionLayerOnly');
        if (templatesGridHidden) {
            template.update?.({ visibility: 0 });
        }

        const data = animationData.primary;
        const secondary = animationData.secondary;
        const sourceFX = animationData.sourceFX;
        const targetFX = animationData.targetFX;
        const macro = animationData.macro;
        const motion = animationData.motion;
        const screenShake = animationData.screenShake;

        let aaSeq = await new Sequence(handler.sequenceData)

        if ((data.options.persistent && data.options.persistType !== "attachtemplate") || !data.options.persistent) {
            aaSeq.thenDo(function () {
                if (data.options.removeTemplate) {
                    const docName = template?.documentName || "MeasuredTemplate";
                    canvas.scene.deleteEmbeddedDocuments(docName, [template.id]);
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
        if (motion && shape === shapes[0]) { sourceMotion(motion, aaSeq, handler) }
        // Primary Sound
        if (data.sound) {
            aaSeq.addSequence(data.sound)
        }

        aaSeq.thenDo(function () {
            Hooks.callAll("aa.animationStart", sourceToken, "no-target")
        })

        if (data.options.persistent && (data.options.persistType === 'overheadtile' || data.options.persistType === 'groundtile')) {
            
            const { x, y, width, height } = shape.bounds;
            const isOverhead = data.options.persistType === 'overheadtile' ? true : false;
            const templateObject = buildTile(x + width / 2, y + height / 2, isOverhead, width, height);

            if(data.options.tint && data.options.tintColor) templateObject.texture.tint = data.options.tintColor;

            templateObject.alpha = data.options.opacity;

            aaSeq.thenDo(function () {
                socketlibSocket.executeAsGM("placeTile", templateObject);
            })

        } else {

            const templateSeq = aaSeq.effect();
            if (shapeType === 'cone' || shapeType === 'line') {
                const trueHeight = shapeType === 'cone' ? shapeDistance : shape.width * 2 / canvas.dimensions.distancePixels;
                setPrimary(templateSeq, sourceToken);
                templateSeq.size({
                    width: shapeDistance * canvas.dimensions.distancePixels * data.options.scale.x,
                    height: trueHeight * canvas.dimensions.distancePixels * data.options.scale.y,
                })
                if (data.options.persistent) {
                    templateSeq.persist(true)
                    if (data.options.persistType === 'attachtemplate') {
                        templateSeq.attachTo(template, { bindElevation: false })
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

            if (AREA_SHAPES.includes(shapeType)) {
                const shapeLocation = { x: shape.bounds.center.x, y: shape.bounds.center.y };

                const effectSize = {
                    width: shape.bounds.width * data.options.scale.x,
                    height: shape.bounds.height * data.options.scale.y,
                };
                const offset = shapeType === 'emanation'
                    ? { x: -effectSize.width / 2, y: 0 }
                    : { x: 0, y: 0 };

                setPrimary(templateSeq, sourceToken);
                templateSeq.size(effectSize)
                const attached = data.options.persistent
                    && data.options.persistType === 'attachtemplate';
                if (attached) {
                    const belowToken = data.options.elevation < 1;
                    const attachPoint = shapes.length > 1 ? template.bounds.center : shape.center;
                    const regionOffset = {
                        x: shapeLocation.x - attachPoint.x,
                        y: shapeLocation.y - attachPoint.y,
                    };
                    templateSeq.attachTo(template, {
                        bindRotation: true,
                        bindElevation: false,
                        offset: {
                            x: offset.x + regionOffset.x,
                            y: offset.y + regionOffset.y,
                        },
                    })
                    if (belowToken) {
                        templateSeq.belowTokens(true)
                    }
                    templateSeq.persist()
                } else {
                    templateSeq.atLocation(shapeLocation, {
                        cacheLocation: true,
                        offset: offset,
                    })
                    if (data.options.persistent) {
                        templateSeq.tieToDocuments(template)
                        templateSeq.persist()
                    } else {
                        templateSeq.repeats(data.options.repeat, data.options.repeatDelay)
                    }
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

        // Token reactions and screen shake
        if (motion && shape === shapes[0]) { targetMotion(motion, aaSeq, handler) }
        if (screenShake && shape === shapes[0]) { addScreenShake(screenShake, aaSeq) }

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

        function setPrimary(seq, token) {
            seq.anchor(convertToXY(data.options.anchor))
            seq.file(data.path.file)
            seq.opacity(data.options.opacity)
            seq.origin(handler.itemUuid)
            if (data.options.elevation < 1) {
                seq.belowTokens(true)
            } else {
                seq.onLevels(handler.targetLevel(template, token));
            }
            seq.elevation(groundElevation, { absolute: true })
            seq.zIndex(data.options.zIndex)
            seq.rotate(data.options.rotate)
            const removesTemplate = data.options.removeTemplate
                && !(data.options.persistent && data.options.persistType === "attachtemplate");
            const wallRestricted = isWallRestricted(template);
            if (data.options.isMasked || MASKED_SHAPES.includes(shape.type) || (wallRestricted && !removesTemplate)) {
                seq.mask(template)
            }
            if (wallRestricted && removesTemplate) {
                constrainToRegionWalls(seq, template, shape)
            }
            seq.playbackRate(data.options.playbackRate)
            seq.name(handler.rinsedName)
            seq.aboveLighting(data.options.aboveTemplate)
            seq.xray(data.options.xray)
            if (data.options.tint) {
                applyColorTint(seq, data.options.tintColor, { hue: data.options.hue, contrast: data.options.contrast, saturate: data.options.saturation })
            }
            function convertToXY(input) {
                let menuType = data.video.menuType;
                let shapeType = shape.type;
                let defaultAnchor = CENTERED_SHAPES.includes(shapeType) ? { x: 0.5, y: 0.5 } : { x: 0, y: 0.5 };
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
            const occlusionMode = occlusionMapping[data.options.occlusionMode ?? "0"];
            const level = canvas.scene.levels?.get(handler.targetLevel(template, sourceToken)) ?? canvas.level;
            const bottom = Number.isFinite(level.elevation.bottom) ? level.elevation.bottom : 0;
            const top = Number.isFinite(level.elevation.top) ? level.elevation.top : bottom + canvas.dimensions.distance * 4;
            const elevation = isOverhead ? top : bottom;
            return {
                alpha: data.options.opacity,
                width: tileWidth,
                height: tileHeight,
                texture: { src: data.path.filePath },
                elevation: elevation,
                levels: [level.id],
                occlusion: {
                    alpha: `${data.options.occlusionAlpha}`,
                    modes: occlusionMode ? [occlusionMode] : [],
                },
                restrictions: {
                    light: isRoofOcclusion,
                    weather: isRoofOcclusion
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
}

import { socketlibSocket } from "../../socketset.js";
import { howToDelete } from "../../constants/constants.js";
const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

export async function templatefx(handler, animationData, templateDocument) {

    const sourceToken = handler.sourceToken;

    const template = handler.templateData ? handler.templateData : templateDocument;

    const shapes = template?.shapes;
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
                if (data.options.isMasked) {
                    templateSeq.mask(shape)
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

            if (shapeType === 'circle' || shapeType === 'rectangle' || shapeType === 'emanation') {
                const shapeLocation = { x: shape.bounds.center.x, y: shape.bounds.center.y };

                let trueSize;
                let offset = { x: 0, y: 0 };
                if (shapeType === 'rectangle') {
                    trueSize = shapeDistance;
                } else if (shapeType === 'emanation') {
                    trueSize = shapeDistance + (2 * shape?.radius) / canvas.dimensions.distancePixels;
                    offset.x = -trueSize * canvas.dimensions.distancePixels / 2;
                } else {
                    trueSize = shapeDistance * 2;
                }
                setPrimary(templateSeq, sourceToken);
                templateSeq.size({
                    width: canvas.grid.size * (trueSize / canvas.dimensions.distance) * data.options.scale.x,
                    height: canvas.grid.size * (trueSize / canvas.dimensions.distance) * data.options.scale.y,
                })
                if (data.options.persistent) {
                    // templateSeq.persist(true)
                    if (data.options.persistType === 'attachtemplate') {
                        const belowToken = data.options.elevation === 0;
                        templateSeq.attachTo(template, { bindRotation: true, bindElevation: !belowToken, offset: offset })
                        if (belowToken) {
                            templateSeq.belowTokens(true)
                            templateSeq.elevation(sourceToken.document.elevation, { absolute: true })
                        }
                    }
                    templateSeq.persist()
                }
                templateSeq.atLocation(shapeLocation, { cacheLocation: true, offset: offset })
                templateSeq.repeats(data.options.repeat, data.options.repeatDelay)
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

        function setPrimary(seq, token) {
            seq.anchor(convertToXY(data.options.anchor))
            seq.file(data.path.file)
            seq.opacity(data.options.opacity)
            seq.origin(handler.itemUuid)
            if (data.options.elevation === 0) {
                seq.belowTokens(true)
            } else {
                const sourceLevel = (token?.document ?? token)?.level ?? canvas.level;
                seq.onLevels(sourceLevel);
            }
            seq.zIndex(data.options.zIndex)
            seq.rotate(data.options.rotate)
            if (data.options.isMasked) {
                seq.mask(shape)
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
                let shapeType = shape.type;
                let defaultAnchor = shapeType === "circle" || shapeType === "rectangle" ? { x: 0.5, y: 0.5 } : { x: 0, y: 0.5 };
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
}

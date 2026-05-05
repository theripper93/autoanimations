const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

export async function thunderwave(handler, animationData, config) {

    const sourceToken = handler.sourceToken;
    
    const template = handler.templateData ? handler.templateData : config;
    // const templateData = config ? config || {} : template.document || {};
    const templateDistance = template?.shapes?.[0]?.measuredSegments?.[0]?.distance;
    const trueSize = Math.sqrt(Math.pow(templateDistance, 2) / 2);

    const data = animationData.primary;
    const sourceFX = animationData.sourceFX;
    const macro = animationData.macro;

    let color = data.color;

    const getPosition = getRelativePosition(sourceToken, template)
    const angle = getPosition.angle;
    const databasePath = color === "random"
        ? `autoanimations.templatefx.square.thunderwave.${getPosition.type}`
        : `autoanimations.templatefx.square.thunderwave.${getPosition.type}.${color}`;

    const gridSize = canvas.scene.dimensions.size;

    let aaSeq = await new Sequence(handler.sequenceData)

    // Play Macro if Awaiting
    if (macro && macro.playWhen === "1") {
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
    const effect = aaSeq.effect()
        .file(databasePath)
        //.atLocation({ x: templateData.x + (gridSize * 1.5), y: templateData.y + (gridSize * 1.5) })
        .atLocation(template, { cacheLocation: true })
        .anchor({ x: 0.5, y: 0.5 })
        .rotate(angle)
        .opacity(data.options.opacity)
        .size(3, { gridUnits: true })
        .repeats(data.options.repeat, data.options.repeatDelay)

    if (data.options.elevation === 0) {
        effect.belowTokens(true)
    } else {
        effect.elevation(handler.elevation(sourceToken, data.options.isAbsolute, data.options.elevation), { absolute: data.options.isAbsolute })
    }

    if (macro && macro.playWhen === "0") {
        handler.runMacro(macro)
    }

    if (data.options.removeTemplate) {
        canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", [template.id])
    }

    // Macro if Awaiting Animation. This will respect the Delay/Wait options in the Animation chains
    if (macro && macro.playWhen === "3") {
        handler.complileMacroSection(aaSeq, macro)
    }

    aaSeq.play()

    await wait(500)
    Hooks.callAll("aa.animationEnd", sourceToken, "no-target")

    function getRelativePosition(token, template) {
        const tokenX = token.x;
        const tokenY = token.y;
        const tokenW = token.w;
        const tokenH = token.h;
        const spellX = template.bounds.x;
        const spellY = template.bounds.y;
        const spellW = template.bounds.width;
        const spellH = template.bounds.height;
        const gridSize = canvas.scene.dimensions.size;
        let type;
        let angle;

        const leftOfToken = () => tokenX + tokenW / 2 >= spellX + spellW;
        const rightOfToken = () => tokenX + tokenW / 2 <= spellX;
        const aboveToken = () => tokenY + tokenH / 2 >= spellY + spellH;
        const belowToken = () => tokenY + tokenH / 2 <= spellY;

        const tokenInSpellX = () => tokenX + tokenW / 2 >= spellX && tokenX + tokenW / 2 <= spellX + spellW;
        const tokenInSpellY = () => tokenY + tokenH / 2 >= spellY && tokenY + tokenH / 2 <= spellY + spellH;

        // Centered on Token
        if (tokenInSpellX() && tokenInSpellY()) return { type: "center", angle: 0 };

        // Left of Token
        if (tokenInSpellY() && leftOfToken()) return { type: "mid", angle: 90 };
        // Right of Token
        if (tokenInSpellY() && rightOfToken()) return { type: "mid", angle: 270 };
        // Top of Token
        if (tokenInSpellX() && aboveToken()) return { type: "mid", angle: 0 };
        // Bottom of Token
        if (tokenInSpellX() && belowToken()) return { type: "mid", angle: 180 };

        // Top Left of Token
        if (leftOfToken() && aboveToken()) return { type: "left", angle: 90 };
        // Top Right of Token
        if (rightOfToken() && aboveToken()) return { type: "left", angle: 0 };
        // Bottom Left of Token
        if (leftOfToken() && belowToken()) return { type: "left", angle: 180 };
        // Bottom Right of Token
        if (rightOfToken() && belowToken()) return { type: "left", angle: 270 };

        return { type: "center", angle: 0 };
    }
}

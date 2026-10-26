import { buildFile }                from "../animation-functions/file-builder/build-filepath.js";
import { particleDefaultValues }    from "../animation-functions/levels-particles/particleDefaults.js";
import { readEntry }                from "../data/entries.js";

export class DataSanitizer {

    static async _getAnimationData(handler, flagData) {
        if (!flagData) { return; }
        const entry = readEntry(flagData)?.toObject() ?? flagData;
        const menu = entry.menu === "aefx" ? entry.activeEffectType : entry.menu;
        const data = {};
        data.primary = menu === "preset" ? await this.compilePreset(entry) : await this.compilePrimary(entry, menu, handler);
        data.secondary = entry.secondary ? await this.compileSecondary(entry, handler) : false;
        data.sourceFX = await this.compileSource(entry, data.primary);
        data.targetFX = entry.target ? await this.compileTarget(entry) : false;
        data.macro = await this.compileMacro(handler, entry);
        data.motion = this.compileMotion(entry);
        data.screenShake = this.compileScreenShake(entry);
        return data;
    }

    static async compileMacro(handler, flagData) {
        const macro = flagData.macro;
        if (!macro || !macro.enable || !macro.name) { return false}
        const isItemMacro = macro.name.startsWith("ItemMacro");
        let itemMacro;
        if (isItemMacro) {
            itemMacro = handler.item.getMacro()
        }
        if (isItemMacro && !itemMacro.command) { return false}
        const data = {
            enable: macro.enable ?? false,
            name: isItemMacro ? itemMacro : macro.name,
            args: this.strToObj(macro.args),
            playWhen: macro.playWhen ?? "0",
        }
        return data;
    }

    static compileMotion(entry) {
        const { source, target } = entry.motion ?? {};
        if (!source?.enable && !target?.enable) { return false; }
        return { source: source?.enable ? source : false, target: target?.enable ? target : false };
    }

    static compileScreenShake(entry) {
        return entry.screenShake?.enable ? entry.screenShake : false;
    }

    static strToObj(data) {

        if (!data) { return []; }
        let obj = {};
        try {
            if (data && typeof data === 'string') {
                let objStr = data.replaceAll("\n", "").match(/\{(.)+\}/g);
                eval("obj =" + objStr);
            }
            return obj || data.split(',').map(s => s.trim())
        }
        catch (err) {
            return data.split(',').map(s => s.trim())
        }


    }

    static setSound(sound, addDelay = 0, overrideRepeat = false) {
        if (!sound?.enable || !sound.file) { return false; }
        const soundSeq = new Sequence({ moduleName: "Automated Animations", softFail: !game.settings.get("autoanimations", "debug") });
        soundSeq.sound()
            .file(sound.file)
            .delay(sound.delay + addDelay)
            .startTime(sound.startTime)
            .volume(sound.volume)
            .repeats(overrideRepeat || sound.repeat, sound.repeatDelay);
        return soundSeq;
    }

    static videoOf(video, dbSection = video.dbSection) {
        return {
            dbSection,
            menuType: video.menuType,
            animation: video.animation,
            variant: video.variant,
            color: video.color,
            customPath: video.enableCustom && video.customPath ? video.customPath : false,
        };
    }

    static async compilePrimary(entry, menu, handler) {
        const { video, sound, options } = entry.primary;
        const data = {
            video: this.videoOf(video),
            options: this.primaryOptions(options, menu, handler),
        };
        data.sound = this.setSound(sound, data.options.isWait ? 0 : data.options.delay, handler.systemData.overrideRepeat);
        if (menu === "melee") { data.meleeSwitch = this.compileMeleeSwitch(entry.meleeSwitch); }
        if (data.video.menuType === "shieldfx" && !video.enableCustom) { data.options.isShieldFX = true; }

        const getTruePath = ["static", "templatefx"].includes(data.video.dbSection);
        const isReturnable = ["melee", "range"].includes(data.video.dbSection);
        data.path = await buildFile(data.video.dbSection, data.video, data.video.customPath, { getTruePath, isReturnable });
        return data;
    }

    static primaryOptions(options, menu, handler) {
        const data = { ...options, saturation: options.saturation ?? options.saturate };
        switch (menu) {
            case "range":
                data.fakeLocation = handler.fakeSource();
                data.repeat = handler.systemData.overrideRepeat || options.repeat;
                break;
            case "ontoken":
                data.anchor = this.convertToXY(options.anchor, true);
                break;
            case "templatefx":
                data.scale = this.convertToXY(options.scale);
                break;
        }
        return data;
    }

    static compileMeleeSwitch(meleeSwitch) {
        return {
            video: this.videoOf(meleeSwitch.video, "range"),
            options: meleeSwitch.options,
            sound: this.setSound(meleeSwitch.sound),
        };
    }

    static convertToXY(input, isAnchor) {
        let dNum = isAnchor ? 0.5 : 1;
        if (!input) { return {x: dNum, y: dNum}}
        let parsedInput = input.split(',').map(s => s.trim());
        let posX = Number(parsedInput[0]);
        let posY = Number(parsedInput[1]);
        if (parsedInput.length === 2) {
            return {x: isNaN(posX) ? dNum : posX, y: isNaN(posY) ? dNum : posY}
        } else if( parsedInput.length === 1) {
            return {x: isNaN(posX) ? dNum : posX, y: isNaN(posX) ? dNum : posX}
        } else {
            return {x: dNum, y: dNum}
        }
    }

    static async compileSecondary(entry, handler) {
        const { enable, video, sound, options } = entry.secondary;
        if (!enable) { return false; }
        const data = {
            enable,
            video: this.videoOf(video, "static"),
            options: {
                ...options,
                anchor: this.convertToXY(options.anchor, true),
                saturation: options.saturation ?? options.saturate,
                repeat: handler.systemData.overrideRepeat || options.repeat,
            },
        };
        data.sound = this.setSound(sound, data.options.isWait ? 0 : data.options.delay, handler.systemData.overrideRepeat);
        data.path = await buildFile("static", data.video, data.video.customPath);
        return data;
    }

    static async compileSource(entry, primary) {
        if (!entry.source?.enable) { return false; }
        const { video, sound, options } = entry.source;
        const data = {
            enable: true,
            video: this.videoOf(video, "static"),
            options: {
                ...options,
                animationSource: primary?.options?.animationSource ?? false,
                fakeLocation: primary?.options?.fakeLocation,
                anchor: this.convertToXY(options.anchor, true),
                saturation: options.saturation ?? options.saturate,
            },
        };
        data.sound = this.setSound(sound, data.options.isWait ? 0 : data.options.delay);
        data.path = await buildFile(data.video.dbSection, data.video, data.video.customPath);
        return data;
    }

    static async compileTarget(entry) {
        const { enable, video, sound, options } = entry.target;
        if (!enable) { return false; }
        const data = {
            enable,
            video: this.videoOf(video, "static"),
            options: { ...options, anchor: this.convertToXY(options.anchor, true), saturation: options.saturation ?? options.saturate },
            sound: this.setSound(sound, options.delay),
        };
        data.path = await buildFile("static", data.video, data.video.customPath);
        return data;
    }

    static async compileParticleData(animationData) {
        const options3d = (readEntry(animationData)?.toObject() ?? animationData).levels3d;
        if (!options3d.enable) { return false; }
        const type = options3d.type;
        const options = options3d.data || {};
        const tokens = options3d.tokens || {};

        const secondary = options3d.secondary || {};
        const defaults = particleDefaultValues[type] ?? particleDefaultValues["projectile"];
        const data = {
            type: type,
            alpha: options.alpha ?? defaults.alpha,
            animationType: options.animationType ?? "twirl",
            arc: options.arc ?? defaults.arc,
            color01: options.color01 ?? defaults.color01,
            color02: options.color02 ?? defaults.color02,
            delay: options.delay ?? defaults.delay,
            emittersize: options.emittersize ?? defaults.emittersize,
            gravity: options.gravity ?? defaults.gravity,
            life: options.life ?? defaults.life,
            duration: options.duration ?? defaults.duration,
            mass: options.mass ?? defaults.mass,
            playOn: options.playOn ?? "source",
            rate: options.rate ?? defaults.rate,
            repeat: options.repeat ?? defaults.repeat,
            resetTime: options.resetTime ?? 100,
            rotateTowards: options.rotateTowards ?? false,
            rotationX: options.rotationX ?? 0,
            rotationY: options.rotationY ?? 0,
            rotationZ: options.rotationZ ?? 0,
            scale: options.scale ?? defaults.scale,
            speed: options.speed ?? defaults.speed,
            sprite: options.spritePath ?? defaults.sprite,
            autoSize: options.autoSize ?? defaults.autoSize,
            onCenter: options.onCenter ?? defaults.onCenter,
            sound: this.setSound(options3d.sound),
            tokenAnimation: {
                enable: tokens.enable ?? false,
                source: tokens.source ?? false,
                sourceType: tokens.sourceType ?? "twirl",
                sourceStart: tokens.sourcePlay !== "end"  ? true : false,
                sourceEnd: tokens.sourcePlay !== "start" ? true : false,
                target: tokens.target ?? false,
                targetType: tokens.targetType ?? "shake",
                targetStart: tokens.targetPlay !== "end"  ? true : false,
                targetEnd: tokens.targetPlay !== "start" ? true : false,
            },
            secondary: {
                enable: secondary.enable || false,
                alpha: secondary.data?.alpha ?? 0.5,
                color01: secondary.data?.color01 ?? "#FFFFFF",
                color02: secondary.data?.color02 ?? "#FFFFFF",
                emittersize: secondary.data?.emittersize ?? 1,
                gravity: secondary.data?.gravity ?? 2,
                life: secondary.data?.life ?? 500,
                mass: secondary.data?.mass ?? 100,
                rate: secondary.data?.rate ?? 10,
                scale: secondary.data?.scale ?? 1,
                speed: secondary.data?.speed ?? 1,
                autoSize: secondary.data?.autoSize ?? false,
                onCenter: secondary.data?.onCenter ?? false,
                duration: secondary.data?.duration ?? 3000,
                type: secondary.data?.type ?? "explosion",
                sprite: secondary.data?.spritePath ?? particleDefaultValues.explosion.sprite,
            }
        };
        return data;
    }

    static async compilePreset(entry) {
        const d = entry.data;
        switch (entry.presetType) {
            case "proToTemp": {
                const part = async (p, dbSection) => {
                    const out = { ...this.videoOf(p, dbSection), enable: p.enable, options: p.options, sound: this.setSound(p.sound) };
                    out.path = await buildFile(dbSection, out, out.customPath);
                    return out;
                };
                return {
                    projectile: await part(d.projectile, "range"),
                    preExplosion: await part(d.preExplosion, "static"),
                    explosion: await part(d.explosion, "static"),
                    afterImage: {
                        enable: d.afterImage.enable,
                        customPath: d.afterImage.enable && d.afterImage.customPath ? d.afterImage.customPath : false,
                        options: d.afterImage.options,
                    },
                    soundOnly: { enable: false },
                };
            }
            case "teleportation": {
                const part = (p) => p.enable ? { ...this.videoOf(p), options: p.options } : false;
                return { start: part(d.start), between: part(d.between), end: part(d.end), options: d.options, sound: this.setSound(d.sound) };
            }
            case "dualattach":
                return { video: this.videoOf(d.video), options: d.options, sound: this.setSound(d.sound) };
            case "thunderwave":
                return { color: d.video.color || "blue", options: d.options, sound: this.setSound(d.sound) };
        }
    }
}

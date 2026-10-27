import { menuOptions } from "../../database/databaseSort.js";
import { entryClass } from "../../data/entries.js";
import { AUTOREC_MENUS } from "../../autorec/manager.js";
import { previewFile } from "./tint-preview.js";

const get = foundry.utils.getProperty;
const t = (key) => game.i18n.localize(key.includes(".") ? `autoanimations.${key}` : `autoanimations.menus.${key}`);
const tt = (...keys) => keys.map(t).join(" ");

function at(entry, path) {
   return { f: entryClass(entry)?.schema.getField(path)?.fields ?? {}, o: get(entry, path) ?? {} };
}

function list(pairs = [], current) {
   const choices = Object.fromEntries(pairs);
   if (current && !(current in choices)) { choices[current] = current; }
   return choices;
}

function video(entry, path, { dbSection = "static", locked = false } = {}) {
   const { f, o: v } = at(entry, path);
   const section = v.dbSection || dbSection;
   return {
      path,
      f,
      v,
      section,
      locked,
      dimmed: v.enableCustom ? "aa-dimmed" : "",
      choices: {
         menuType: list(menuOptions.types[section], v.menuType),
         animation: list(menuOptions.animations[section]?.[v.menuType], v.animation),
         variant: list(menuOptions.variants[section]?.[v.menuType]?.[v.animation], v.variant),
         color: list(menuOptions.colors[section]?.[v.menuType]?.[v.animation]?.[v.variant], v.color),
      },
   };
}

function sound(entry, path) {
   const { f, o } = at(entry, path);
   return { path, f, o };
}

function tab(entry, id, label, template, context, { enablePath, disabled = false, videos = [] } = {}) {
   const enabled = enablePath ? !!get(entry, enablePath) : true;
   return { id, label, template, enablePath, enabled, disabled, videos, ...context };
}

// Standard tabs

function part(entry, key, { dbSection } = {}) {
   return { ...at(entry, `${key}.options`), video: video(entry, `${key}.video`, { dbSection }), sound: sound(entry, `${key}.sound`) };
}

function primaryTab(entry) {
   const menu = entry.menu;
   const v = entry.primary?.video ?? {};
   const options = menu === "aefx" ? (entry.activeEffectType === "aura" ? "aura" : "ontoken") : menu;
   const context = {
      ...part(entry, "primary", { dbSection: v.dbSection }),
      options,
      aefx: menu === "aefx",
      canReturn: v.menuType === "weapon" && menuOptions.returnWeapons.includes(v.animation),
      animationSource: ["dnd5e", "pf2e", "sf2e"].includes(game.system.id),
   };
   const videos = [{ path: "primary.video", label: t("primary"), dbSection: context.video.section }];

   if (menu === "templatefx") {
      const persistTypes = { sequencerground: t("sequencereffect"), attachtemplate: t("attachtotemplate") };
      if (["circle", "square"].includes(v.menuType)) {
         persistTypes.overheadtile = t("overheadtile");
         persistTypes.groundtile = t("groundtile");
      }
      context.persistTypes = persistTypes;
      context.anchorPlaceholder = ["cone", "ray"].includes(v.menuType) ? "0, 0.5" : "0.5, 0.5";
   }

   if (menu === "melee") {
      const s = at(entry, "meleeSwitch.options");
      const custom = s.o.switchType === "custom";
      const anim = custom ? entry.meleeSwitch?.video?.animation : v.animation;
      context.meleeSwitch = {
         ...s,
         off: s.o.switchType === "off",
         canReturn: s.o.switchType !== "off" && menuOptions.returnWeapons.includes(anim),
         video: video(entry, "meleeSwitch.video", { dbSection: "range", locked: !custom }),
         sound: sound(entry, "meleeSwitch.sound"),
      };
      if (custom) { videos.push({ path: "meleeSwitch.video", label: t("rangeSwitch"), dbSection: context.meleeSwitch.video.section }); }
   }
   return tab(entry, "primary", t("primary"), "primary", context, { videos });
}

function sectionTab(entry, key, label, { disabled = false } = {}) {
   if (!entry[key]) { return null; }
   const context = { ...part(entry, key), options: key };
   return tab(entry, key, label, "section", context, {
      enablePath: `${key}.enable`,
      disabled,
      videos: [{ path: `${key}.video`, label, dbSection: context.video.section }],
   });
}

// Presets

function presetPart(entry, id, label, { video: videoPath, options, sound: soundPath, template, dbSection, optional = false, ...flags }) {
   const context = {
      ...at(entry, options),
      ...flags,
      options: template,
      video: video(entry, videoPath, { dbSection }),
      sound: soundPath ? sound(entry, soundPath) : null,
   };
   return tab(entry, id, label, "preset-part", context, {
      enablePath: optional ? `${videoPath}.enable` : undefined,
      videos: [{ path: videoPath, label, dbSection: context.video.section }],
   });
}

const PRESETS = {
   dualattach: (entry) => [
      presetPart(entry, "video", t("primary"), {
         video: "data.video", options: "data.options", sound: "data.sound", template: "preset-dualattach", dbSection: "range",
         onlyX: !!entry.data?.video?.enableCustom,
      }),
   ],
   thunderwave: (entry) => [
      tab(entry, "primary", t("primary"), "thunderwave", {
         ...at(entry, "data.options"),
         color: at(entry, "data.video"),
         colors: Object.fromEntries(menuOptions.colors.templatefx?.square?.thunderwave?.mid ?? []),
         sound: sound(entry, "data.sound"),
      }),
   ],
   proToTemp: (entry) => [
      presetPart(entry, "projectile", t("projectile"), {
         video: "data.projectile", options: "data.projectile.options", sound: "data.projectile.sound", template: "preset-proToTemp", dbSection: "range",
         removeTemplate: true, randomOffset: true,
      }),
      presetPart(entry, "preExplosion", t("ui.editor.preExplosion"), {
         video: "data.preExplosion", options: "data.preExplosion.options", sound: "data.preExplosion.sound", template: "preset-proToTemp", dbSection: "static",
         optional: true, scale: true, aboveTemplate: true,
      }),
      presetPart(entry, "explosion", t("explosion"), {
         video: "data.explosion", options: "data.explosion.options", sound: "data.explosion.sound", template: "preset-proToTemp", dbSection: "static",
         scale: true, aboveTemplate: true,
      }),
      tab(entry, "afterImage", t("ui.editor.afterImage"), "after-image", { image: at(entry, "data.afterImage"), ...at(entry, "data.afterImage.options") }, {
         enablePath: "data.afterImage.enable",
      }),
      sectionTab(entry, "secondary", t("variants.secondary")),
      sectionTab(entry, "target", t("target")),
   ],
   teleportation: (entry) => [
      tab(entry, "movement", t("movement"), "movement", { ...at(entry, "data.options"), isGM: game.user.isGM, sound: sound(entry, "data.sound") }),
      presetPart(entry, "start", t("start"), { video: "data.start", options: "data.start.options", template: "preset-teleport-end", dbSection: "static", optional: true }),
      presetPart(entry, "between", t("between"), { video: "data.between", options: "data.between.options", template: "preset-teleport-between", dbSection: "range", optional: true }),
      presetPart(entry, "end", t("end"), { video: "data.end", options: "data.end.options", template: "preset-teleport-end", dbSection: "static", optional: true }),
   ],
};

// Motion, 3D Canvas, General

const MOTION_TYPES = {
   source: ["lunge", "recoil", "shake", "flash", "spin", "pulse", "float", "fade"],
   target: ["shake", "knockback", "flash", "spin", "pulse", "float", "fade"],
};

function motionTab(entry) {
   const side = (key) => ({
      key,
      label: t(key),
      ...at(entry, `motion.${key}`),
      types: Object.fromEntries(MOTION_TYPES[key].map((type) => [type, t(`menus.motionTypes.${type}`)])),
   });
   return tab(entry, "motion", t("motion"), "motion", {
      sides: globalThis.Sequencer?.MotionManager && entry.presetType !== "teleportation" ? [side("source"), side("target")] : [],
      shake: at(entry, "screenShake"),
   });
}

const TOKEN_ANIMATIONS = ["bow", "breath", "buff", "charge", "debuff", "knockback", "shake", "slash", "swipe", "twirl"];

function particleSystems(key) {
   const all = game.Levels3DPreview?.CONFIG?.PARTICLE_SYSTEMS?.[key] ?? {};
   return Object.fromEntries(Object.keys(all).filter((k) => !k.includes("optgroup"))
      .map((k) => [k, game.i18n.localize(`levels3dpreview.particleSystems.${k}`)]));
}

function canvas3dTab(entry) {
   const configured = Object.keys(game.Levels3DPreview?.CONFIG?.tokenAnimations ?? {});
   const tokenAnimations = Object.fromEntries((configured.length ? configured : TOKEN_ANIMATIONS).map((k) => [k, t(`tokenAnimations.${k}`)]));
   const type = entry.levels3d?.type;
   return tab(entry, "canvas3d", t("3dcanvas"), "canvas3d", {
      top: at(entry, "levels3d"),
      data: at(entry, "levels3d.data"),
      secondary: { ...at(entry, "levels3d.secondary"), data: at(entry, "levels3d.secondary.data") },
      tokens: at(entry, "levels3d.tokens"),
      sound: sound(entry, "levels3d.sound"),
      isToken: type === "token",
      isSprite: type === "sprite",
      types: { token: tt("token", "animation"), ...particleSystems("ALL_PARTICLE_SYSTEMS_WITHOPTS") },
      secondaryTypes: particleSystems("TARGET_ONLY_PARTICLE_SYSTEMS"),
      tokenAnimations,
   }, { enablePath: "levels3d.enable" });
}

function generalTab(entry, autorec) {
   return tab(entry, "general", t("general"), "general", {
      autorec,
      top: { f: entryClass(entry)?.schema.fields ?? {}, o: entry },
      isPreset: entry.menu === "preset",
      isEffect: entry.menu === "aefx" && autorec,
      soundOnly: sound(entry, "soundOnly.sound"),
      macro: at(entry, "macro"),
      advanced: at(entry, "advanced"),
      excluded: at(entry, "advanced.excludedType"),
   });
}

// Entry point

export const CANVAS3D_MENUS = ["melee", "range", "ontoken"];
const MOTION_MENUS = ["melee", "range", "ontoken", "templatefx", "preset"];

export function buildTabs(entry, { autorec = true, locked = false } = {}) {
   const menu = entry.menu;
   let tabs;
   if (menu === "preset") {
      tabs = PRESETS[entry.presetType]?.(entry) ?? [];
   } else {
      tabs = [
         primaryTab(entry),
         sectionTab(entry, "secondary", t("variants.secondary")),
         sectionTab(entry, "source", t("source")),
         menu === "aefx" ? null : sectionTab(entry, "target", t("target"), { disabled: menu === "ontoken" && entry.primary?.options?.playOn === "source" }),
      ];
   }
   if (MOTION_MENUS.includes(menu)) { tabs.push(motionTab(entry)); }
   if (CANVAS3D_MENUS.includes(menu) && game.modules.get("levels-3d-preview")?.active) { tabs.push(canvas3dTab(entry)); }

   // Sound Only and "macro only" play nothing else.
   const soundOnly = !!entry.soundOnly?.sound?.enable;
   const macroOnly = !!entry.macro?.enable && entry.macro?.playWhen === "2";
   tabs = tabs.filter(Boolean);
   for (const other of tabs) { if (locked || soundOnly || macroOnly) { other.disabled = true; } }
   const general = generalTab(entry, autorec);
   general.disabled = locked;
   for (const other of tabs) { other.previews = previews(entry, other.id, other.videos); }
   general.previews = previews(entry, general.id, tabs.filter((other) => !other.disabled && other.enabled).flatMap((other) => other.videos));
   return [general, ...tabs];
}

function previews(entry, tabId, videos) {
   return videos.map(({ path, label, dbSection }) => {
      const prefix = path === "meleeSwitch.video" ? "primary.options" : path.replace(/\.video$/, ".options");
      const fields = entryClass(entry)?.schema.getField(prefix)?.fields ?? {};
      return {
         key: `${tabId}:${path}`,
         label,
         file: previewFile(get(entry, path) ?? {}, dbSection),
         prefix: "tint" in fields ? prefix : "",
         mode: "tintSaturate" in fields ? "aura" : "standard",
         saturation: get(entry, `${prefix}.saturation`) ?? "",
      };
   });
}

export function choices() {
   return {
      elevation: { 0: t("belowTokens"), 1000: t("aboveTokens") },
      sizeMode: { false: t("scale"), true: t("radius") },
      delayMode: { false: t("delay"), true: t("wait") },
      playOn: { source: t("source"), target: t("target"), default: t("targetDefault"), both: t("both") },
      occlusion: { 3: t("occlusion03"), 1: t("occlusion01"), 2: t("occlusion02"), 0: t("occlusion00") },
      switchType: { on: t("settings.ON"), off: t("settings.OFF"), custom: t("custom") },
      detect: { automatic: t("automatic"), manual: t("manual") },
      measureType: { alternating: t("menuTypes.circle"), equidistant: t("menuTypes.square") },
      moveAction: { blink: game.i18n.localize("TOKEN.MOVEMENT.ACTIONS.blink.label"), displace: game.i18n.localize("TOKEN.MOVEMENT.ACTIONS.displace.label") },
      macroPlayWhen: { 0: t("macroconcurrent"), 1: t("awaitmacro"), 2: t("macroonly"), 3: tt("await", "animation") },
      presetTypes: {
         dualattach: t("presetTypes.dualattach"),
         proToTemp: t("presetTypes.proToTemp"),
         teleportation: t("presetTypes.animTeleportation"),
         thunderwave: `${t("presetTypes.thunderwave")} D&D 5e`,
      },
      menus: Object.fromEntries(AUTOREC_MENUS.map((m) => [m, t(`animTypes.${m}`)])),
      effectTypes: { ontoken: t("animTypes.ontoken"), aura: t("animTypes.aura") },
      playWhen3d: { start: t("start"), end: t("end"), both: t("both") },
   };
}

import {
   advanced, bool, choice, elevation, levels3d, macro, motion, num, optBool, optNum, repeat, schema, screenShake, sound,
   str, tintKeys, video, videoKeys,
} from "./fields.js";

const { DataModel } = foundry.abstract;
const fields = foundry.data.fields;

export const SCHEMA_VERSION = 5;

const PLAY_ON = ["source", "target", "default", "both"];

// Option sets

const extraOptions = () => ({
   ...tintKeys(),
   addTokenWidth: bool(false),
   anchor: str("0.5"),
   delay: num(0),
   elevation: elevation(),
   fadeIn: num(250),
   isMasked: bool(false),
   isRadius: bool(false),
   opacity: num(1, { min: 0, max: 1 }),
   playbackRate: num(1, { positive: true }),
   repeat: repeat(),
   size: num(1, { positive: true }),
   zIndex: num(1),
});

const SECTION_OPTIONS = {
   source: () => ({ ...extraOptions(), fadeOut: num(500), isWait: bool(false), persistent: bool(false), repeatDelay: num(1) }),
   secondary: () => ({ ...extraOptions(), fadeOut: num(250), isWait: bool(false), repeatDelay: num(250), rotateSource: bool(false) }),
   target: () => ({
      ...extraOptions(),
      fadeOut: num(250),
      isWait: bool(false),
      persistent: bool(false),
      repeatDelay: num(250),
      rotateSource: bool(false),
      unbindAlpha: bool(false),
      unbindVisibility: bool(false),
   }),
};

const section = (key) => schema({
   enable: bool(false),
   video: video(),
   sound: sound(),
   options: schema(SECTION_OPTIONS[key]()),
});

const common = () => ({
   ...tintKeys(),
   delay: num(0),
   elevation: elevation(),
   isWait: bool(false),
   opacity: num(1, { min: 0, max: 1 }),
   playbackRate: num(1, { positive: true }),
   repeat: repeat(),
   repeatDelay: num(1),
   zIndex: num(1),
});

const onTokenOptions = (playOn) => ({
   ...common(),
   addTokenWidth: bool(false),
   anchor: str("0.5"),
   delay: num(1),
   fadeIn: num(250),
   fadeOut: num(500),
   isMasked: bool(false),
   isRadius: bool(false),
   persistent: bool(false),
   playOn: choice(PLAY_ON, playOn),
   size: num(1, { positive: true }),
   unbindAlpha: bool(false),
   unbindVisibility: bool(false),
});

const auraOptions = (isRadius) => ({
   ...common(),
   addTokenWidth: bool(false),
   alpha: bool(false),
   alphaDuration: num(1000, { positive: true }),
   alphaMax: num(0.5),
   alphaMin: num(-0.5),
   breath: bool(false),
   breathDuration: num(1000, { positive: true }),
   breathMax: num(1.05),
   breathMin: num(0.95),
   delay: num(1),
   fadeIn: num(250),
   fadeOut: num(500),
   isRadius: bool(isRadius),
   playOn: choice(PLAY_ON, "source"),
   size: num(3, { positive: true }),
   tintSaturate: num(0),
   unbindAlpha: bool(false),
   unbindVisibility: bool(false),
});

const PRIMARY_OPTIONS = {
   melee: () => ({ ...common(), size: num(1, { positive: true }) }),
   range: () => ({
      ...common(),
      animationSource: bool(false),
      isReturning: bool(false),
      onlyX: bool(false),
      randomOffset: bool(false),
      reverse: bool(false),
   }),
   ontoken: () => onTokenOptions("default"),
   templatefx: () => ({
      ...common(),
      aboveTemplate: bool(false),
      anchor: str(""),
      delay: num(1),
      isMasked: bool(false),
      occlusionAlpha: num(1, { min: 0, max: 1 }),
      occlusionMode: choice(["0", "1", "2", "3"], "3"),
      persistent: bool(false),
      persistType: choice(["sequencerground", "attachtemplate", "overheadtile", "groundtile"], "sequencerground"),
      removeTemplate: bool(false),
      rotate: num(0),
      scale: str("1"),
      xray: bool(false),
   }),
   aura: () => auraOptions(true),
};

const PRIMARY_VIDEO = {
   melee: { dbSection: "melee", menuType: "weapon", animation: "club", variant: "01", color: "white" },
   range: { dbSection: "range", menuType: "weapon", animation: "arrow", variant: "regular", color: "regular" },
   ontoken: { dbSection: "static", menuType: "spell", animation: "curewounds", variant: "01", color: "blue" },
   templatefx: { dbSection: "templatefx", menuType: "circle", animation: "calllightning", variant: "01", color: "blue" },
   aura: { dbSection: "static", menuType: "spell", animation: "spiritguardians", variant: "01", color: "yellowblue" },
};

// Entries

export class AnimationEntry extends DataModel {
   static MENU = "";

   static defineSchema() {
      return {
         id: str("", { initial: () => foundry.utils.randomID(16) }),
         label: str(""),
         menu: str(this.MENU),
         macro: macro(),
         soundOnly: schema({ sound: sound() }),
         advanced: advanced(),
         motion: motion(),
         screenShake: screenShake(),
         metaData: new fields.ObjectField({ required: false, nullable: true, initial: undefined }),
         // Item / effect flags only
         isEnabled: optBool(),
         isCustomized: optBool(),
         fromAmmo: optBool(),
         version: optNum(),
      };
   }
}

class StandardEntry extends AnimationEntry {
   static defineSchema() {
      const menu = this.MENU;
      return {
         ...super.defineSchema(),
         primary: schema({ video: video(PRIMARY_VIDEO[menu]), sound: sound(), options: schema(PRIMARY_OPTIONS[menu]()) }),
         source: section("source"),
         secondary: section("secondary"),
         target: section("target"),
      };
   }
}

export class MeleeEntry extends StandardEntry {
   static MENU = "melee";

   static defineSchema() {
      return {
         ...super.defineSchema(),
         meleeSwitch: schema({
            video: video(PRIMARY_VIDEO.range),
            sound: sound(),
            options: schema({
               detect: choice(["automatic", "manual"], "automatic"),
               range: num(2),
               isReturning: bool(false),
               switchType: choice(["on", "off", "custom"], "on"),
            }),
         }),
         levels3d: levels3d(),
      };
   }
}

export class RangeEntry extends StandardEntry {
   static MENU = "range";

   static defineSchema() {
      return { ...super.defineSchema(), levels3d: levels3d() };
   }
}

export class OnTokenEntry extends StandardEntry {
   static MENU = "ontoken";

   static defineSchema() {
      return { ...super.defineSchema(), levels3d: levels3d() };
   }
}

export class TemplateEntry extends StandardEntry {
   static MENU = "templatefx";

   static NEW_ENTRY = { primary: { options: { occlusionAlpha: 0.5 } } };
}

export class AuraEntry extends StandardEntry {
   static MENU = "aura";

   static NEW_ENTRY = { primary: { options: { addTokenWidth: true } } };
}

// Active effects

class ActiveEffectEntry extends AnimationEntry {
   static MENU = "aefx";

   static TYPE = "";

   static defineSchema() {
      const isAura = this.TYPE === "aura";
      return {
         ...super.defineSchema(),
         activeEffectType: str(this.TYPE),
         primary: schema({
            video: video(isAura ? PRIMARY_VIDEO.aura : PRIMARY_VIDEO.ontoken),
            sound: sound(),
            options: schema(isAura ? auraOptions(false) : onTokenOptions("default")),
         }),
         source: section("source"),
         secondary: section("secondary"),
      };
   }
}

export class ActiveEffectOnTokenEntry extends ActiveEffectEntry {
   static TYPE = "ontoken";

   static NEW_ENTRY = { primary: { options: { playOn: "source" } } };
}

export class ActiveEffectAuraEntry extends ActiveEffectEntry {
   static TYPE = "aura";

   static NEW_ENTRY = { primary: { options: { addTokenWidth: true } } };
}

// Presets

class PresetEntry extends AnimationEntry {
   static MENU = "preset";

   static TYPE = "";

   static defineSchema() {
      return { ...super.defineSchema(), presetType: str(this.TYPE), data: schema(this.defineData()) };
   }

   static defineData() {
      return {};
   }
}

const partOptions = (extra = {}) => ({
   elevation: elevation(),
   opacity: num(1, { min: 0, max: 1 }),
   playbackRate: num(1, { positive: true }),
   repeat: repeat(),
   repeatDelay: num(250),
   ...extra,
});

export class DualAttachEntry extends PresetEntry {
   static TYPE = "dualattach";

   static defineData() {
      return {
         video: video(PRIMARY_VIDEO.range),
         options: schema({
            elevation: elevation(),
            onlyX: bool(false),
            opacity: num(1, { min: 0, max: 1 }),
            playbackRate: num(1, { positive: true }),
         }),
         sound: sound(),
      };
   }
}

export class ThunderwaveEntry extends PresetEntry {
   static TYPE = "thunderwave";

   static defineData() {
      return {
         video: video({ dbSection: "static", menuType: "spell", animation: "thunderwave", variant: "mid", color: "blue" }),
         options: schema({
            elevation: elevation(),
            opacity: num(1, { min: 0, max: 1 }),
            removeTemplate: bool(false),
            repeat: repeat(),
            repeatDelay: num(250),
         }),
         sound: sound(),
      };
   }
}

export class ProToTempEntry extends PresetEntry {
   static TYPE = "proToTemp";

   static NEW_ENTRY = {
      data: {
         projectile: { options: { wait: -1800 } },
         preExplosion: { options: { wait: 0 } },
         explosion: { options: { scale: 1.25, wait: -1000 } },
         afterImage: { options: { elevation: 0 } },
      },
   };

   static defineSchema() {
      return { ...super.defineSchema(), secondary: section("secondary"), target: section("target") };
   }

   static defineData() {
      const explosionOptions = () => schema(partOptions({ aboveTemplate: bool(false), scale: num(1, { positive: true }), wait: num(-500) }));
      return {
         projectile: schema({
            ...videoKeys({ dbSection: "range", menuType: "spell", animation: "fireballbeam", variant: "01", color: "orange" }),
            options: schema(partOptions({ randomOffset: bool(false), removeTemplate: bool(false), wait: num(-500) })),
            sound: sound(),
         }),
         preExplosion: schema({
            enable: bool(false),
            ...videoKeys(),
            options: explosionOptions(),
            sound: sound(),
         }),
         explosion: schema({
            ...videoKeys({ dbSection: "static", menuType: "spell", animation: "fireball", variant: "explode", color: "orange" }),
            options: explosionOptions(),
            sound: sound(),
         }),
         afterImage: schema({
            enable: bool(false),
            customPath: str(""),
            options: schema({ elevation: elevation(), persistent: bool(false), scale: num(1, { positive: true }) }),
         }),
      };
   }
}

export class TeleportationEntry extends PresetEntry {
   static TYPE = "teleportation";

   static NEW_ENTRY = {
      data: {
         start: { enable: true, options: { fadeOut: 250, size: 1.5 } },
         end: { enable: true, options: { delay: 500, fadeOut: 250, size: 1.5 } },
         options: { teleport: true, speed: 120, delayMove: 1000, alpha: 0, delayFade: 750, delayReturn: 250, checkCollision: true },
      },
   };

   static defineData() {
      const endOptions = () => schema({
         delay: num(0),
         elevation: elevation(),
         fadeIn: num(250),
         fadeOut: num(500),
         isMasked: bool(false),
         isRadius: bool(false),
         opacity: num(1, { min: 0, max: 1 }),
         playbackRate: num(1, { positive: true }),
         size: num(1, { positive: true }),
      });
      return {
         start: schema({ enable: bool(false), ...videoKeys({ animation: "mistystep" }), options: endOptions() }),
         between: schema({
            enable: bool(false),
            ...videoKeys({ dbSection: "range", menuType: "weapon", animation: "arrow", variant: "regular", color: "regular" }),
            options: schema({ delay: num(0), elevation: elevation(), opacity: num(1, { min: 0, max: 1 }), playbackRate: num(1, { positive: true }) }),
         }),
         end: schema({ enable: bool(false), ...videoKeys({ animation: "mistystep", variant: "02" }), options: endOptions() }),
         options: schema({
            measureType: choice(["alternating", "equidistant"], "alternating"),
            hideFromPlayers: bool(false),
            range: num(30),
            teleport: bool(false),
            delayMove: num(0),
            speed: num(6, { positive: true }),
            alpha: num(1, { min: 0, max: 1 }),
            delayFade: num(0),
            delayReturn: num(0),
            checkCollision: bool(false),
         }),
         sound: sound(),
      };
   }
}

// Lookup

export const ENTRY_CLASSES = {
   melee: MeleeEntry,
   range: RangeEntry,
   ontoken: OnTokenEntry,
   templatefx: TemplateEntry,
   aura: AuraEntry,
   aefx: { ontoken: ActiveEffectOnTokenEntry, aura: ActiveEffectAuraEntry },
   preset: { dualattach: DualAttachEntry, proToTemp: ProToTempEntry, teleportation: TeleportationEntry, thunderwave: ThunderwaveEntry },
};

export function entryClass(data = {}) {
   const byMenu = ENTRY_CLASSES[data.menu];
   if (data.menu === "aefx") { return byMenu[data.activeEffectType] ?? byMenu.ontoken; }
   if (data.menu === "preset") { return byMenu[data.presetType]; }
   return byMenu;
}

export function labelFields() {
   const label = (field) => {
      const key = `autoanimations.fields.${field.name}`;
      if (game.i18n.has(key)) { field.label = game.i18n.localize(key); }
      for (const inner of Object.values(field.fields ?? {})) { label(inner); }
   };
   for (const cls of Object.values(ENTRY_CLASSES).flatMap((c) => (typeof c === "function" ? [c] : Object.values(c)))) {
      label(cls.schema);
   }
}

export function readEntry(data) {
   return entryClass(data)?.fromSource(foundry.utils.deepClone(data ?? {}));
}

export function validateEntry(data) {
   const cls = entryClass(data);
   if (!cls) { throw new Error(`Unknown animation menu "${data?.menu}"`); }
   return new cls(foundry.utils.deepClone(data), { strict: true }).toObject();
}

export function validationMessage(err) {
   const keys = [];
   const problems = [];
   for (const line of String(err.message).split("\n").slice(1)) {
      const match = line.match(/^( *)([^:]+): (.*)$/);
      if (!match) { continue; }
      const depth = match[1].length / 2 - 1;
      keys.length = depth;
      keys.push(match[2]);
      if (!match[3].includes("#_validate")) { problems.push(`${keys.join(".")}: ${match[3]}`); }
   }
   return problems.length ? problems.join("; ") : err.message;
}

// New entries

const SOUND = { volume: 0.75 };
const NEW_ENTRY = {
   soundOnly: { sound: SOUND },
   primary: { sound: SOUND },
   source: { sound: SOUND, options: { isWait: true } },
   secondary: { sound: SOUND, options: { isRadius: true, size: 1.5 } },
   target: { sound: SOUND },
   meleeSwitch: { sound: SOUND },
   data: { sound: SOUND, projectile: { sound: SOUND }, preExplosion: { sound: SOUND }, explosion: { sound: SOUND } },
};

const KEPT_ON_TYPE_CHANGE = ["id", "label", "macro", "soundOnly", "advanced", "motion", "screenShake", "source", "secondary", "target", "levels3d"];

export function newEntry(menu, current = {}, subType) {
   const data = { menu };
   if (menu === "preset") { data.presetType = subType ?? current.presetType ?? "proToTemp"; }
   if (menu === "aefx") { data.activeEffectType = subType ?? current.activeEffectType ?? "ontoken"; }
   const cls = entryClass(data);
   const entry = new cls(data).toObject();
   foundry.utils.mergeObject(entry, NEW_ENTRY, { insertKeys: false });
   foundry.utils.mergeObject(entry, cls.NEW_ENTRY ?? {}, { insertKeys: false });
   for (const key of KEPT_ON_TYPE_CHANGE) {
      if ((key in entry) && (current[key] !== undefined)) { entry[key] = foundry.utils.deepClone(current[key]); }
   }
   return JSON.parse(JSON.stringify(entry));
}

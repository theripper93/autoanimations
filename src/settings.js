import { MODULE_ID, AnimationState } from "./constants.js";
import { AAAutorecManager } from "./autorec/manager.js";

const S = "autoanimations.settings";

const bool = (name, hint, def = false) => ({ name: `${S}.${name}`, hint: hint && `${S}.${hint}`, scope: "world", config: true, type: Boolean, default: def });
const file = (name) => ({ name: `${S}.${name}`, scope: "world", config: true, type: String, default: "", filePicker: "imagevideo" });
const choice = (name, hint, choices, def) => ({ name: `${S}.${name}`, hint: hint && `${S}.${hint}`, scope: "world", config: true, type: String, choices, default: def });

const critical = () => ({
   EnableCritical: bool("crithit_name", "crithit_hint"),
   CriticalAnimation: file("crithitAnim_name"),
   EnableCriticalMiss: bool("critmiss_name", "critmiss_hint"),
   CriticalMissAnimation: file("critmissAnim_name"),
});

function systemSettings() {
   switch (game.system.id) {
      case "cyphersystem":
         return {
            EnableCritical: bool("cypherCrit_name", "cypherCrit_hint"),
            CriticalAnimation: file("cypherCritAnim_name"),
            EnableFumble: bool("cypherFumble_name", "cypherFumble_hint"),
            FumbleAnimation: file("cypherFumbleAnim_name"),
            EnableOnRecoveryRoll: bool("recovery_name", "recovery_hint"),
            RecoveryRollAnimation: file("recoveryAnim_name"),
            EnableOnMightRoll: bool("mightroll_name", "mightroll_hint"),
            MightRollAnimation: file("mightRollAnim_name"),
            EnableOnSpeedRoll: bool("speedroll_name", "speedroll_hint"),
            SpeedRollAnimation: file("speedRollAnim_name"),
            EnableOnIntellecRoll: bool("intellectroll_name", "intellectroll_hint"),
            IntellectRollAnimation: file("intellectRollAnim_name"),
         };
      case "demonlord":
         return {
            playtrigger: choice("demonlordtrigger_name", "demonlordtrigger_hint", {
               rollattack: `${S}.demonlordtrigger_rollattack`,
               hits: `${S}.demonlordtrigger_hits`,
               misses: `${S}.demonlordtrigger_misses`,
               rolldamage: `${S}.demonlordtrigger_rolldamage`,
               applydamage: `${S}.demonlordtrigger_applydamage`,
            }, "rollattack"),
         };
      case "sfrpg":
         return { playonDamage: bool("midiondmg_name", "midiondmg_hint") };
      case "marvel-multiverse":
         return { playonAttackCore: bool("coreonatk_name", "coreonatk_hint"), playonDamageCore: bool("coreondmg_name", "coreondmg_hint") };
      case "dnd5e":
         return { playonDamageCore: bool("coreondmg_name", "coreondmg_hint"), playonmiss: bool("midionmiss_name", "midionmiss_hint"), ...critical() };
      case "sw5e":
         if (game.modules.get("midi-qol")?.active) {
            return { playonmiss: bool("midionmiss_name", "midionmiss_hint"), playonDamage: bool("midiondmg_name", "midiondmg_hint"), ...critical() };
         }
         return { playonDamageCore: bool("coreondmg_name", "coreondmg_hint"), ...critical() };
      case "ars":
         return critical();
      case "pf2e":
      case "sf2e":
         return {
            playonDamageCore: bool("coreondmg_name", "coreondmg_hint"),
            playonmiss: bool("midionmiss_name", "pf2eonmiss_hint"),
            disableNestedEffects: bool("disableNested", "disableNestedHint"),
            disableGrantedAuraEffects: bool("disableGrantedAura", "disableGrantedAuraHint"),
         };
      case "wfrp4e":
         return { castOnlyOnSuccess: bool("wfrp4eCastOnlyOnSuccess", "wfrp4eCastOnlyOnSuccessHint") };
      case "impmal":
      case "dark-heresy":
         return { criticalAnimation: file("criticalAnimation") };
      case "cyberpunk-red-core":
         return {
            autofire: bool("cyberPunkAutoFire", "cyberPunkAutoFire_hint", true),
            canMissTarget: bool("cyberPunkCanMiss", "cyberPunkCanMiss_hint", true),
            useElevation: bool("cyberPunkElevation", "cyberPunkElevation_hint", true),
         };
      case "TheWitcherTRPG":
         return { attackSkill: bool("coreonatk_name", "coreonatk_hint", true), damage: bool("coreondmg_name", "coreondmg_hint", true) };
      case "twodsix":
         return { playtrigger: choice("playAnimations", null, { onAttack: `${S}.attack`, onDamage: `${S}.damage` }, "onAttack") };
      case "swade":
         return { playtrigger: choice("playAnimations", null, { onAttack: `${S}.swadeTraitRolls`, onDamage: `${S}.damage` }, "onDamage") };
      case "black-flag":
         return {
            playonmiss: bool("onmiss_name", "onmiss_hint"),
            EnableCritical: bool("crithit_name", "crithit_hint"),
            CriticalAnimation: file("crithitAnim_name"),
            CriticalAudio: file("crithitAudio_name"),
            EnableCriticalMiss: bool("critmiss_name", "critmiss_hint"),
            CriticalMissAnimation: file("critmissAnim_name"),
            CriticalMissAudio: file("critmissAudio_name")
         }
      default:
         return {};
   }
}

export function registerSettings() {
   const settings = {
      killAllAnim: {
         name: `${S}.toggleAnimations`,
         hint: `${S}.toggleAnimations_hint`,
         scope: "client",
         config: true,
         type: String,
         choices: { on: `${S}.ON`, off: `${S}.OFF` },
         default: "on",
         onChange: (value) => AnimationState.enabled = value !== "off",
      },
      disableAutoRec: bool("settingDisableAutoRec", "settingDisableAutoRecHint"),
      globaldelay: { name: `${S}.globaldelay_name`, hint: `${S}.globaldelay_hint`, scope: "world", config: true, type: Number, default: 100 },
      jb2aLocation: { name: `${S}.s3Name`, hint: `${S}.s3Hint`, scope: "world", config: true, type: String, default: "", requiresReload: true },
      hideFromPlayers: bool("animtab_name", "animtab_hint"),
      rangeSwitch: bool("settingRangeSwitch", "settingRangeSwitchhint"),
      disableAEAnimations: bool("disableAEAnimations", "disableAEAnimationsHint"),
      noTips: bool("noTips", "noTipsHint"),
      forceRegionLayerOnly: bool("forceRegionLayerOnly_name", "forceRegionLayerOnly_hint"),
      ...systemSettings(),
      debug: { name: `${S}.debugging`, scope: "world", config: true, type: Boolean, default: false },
   };

   for (const [key, data] of Object.entries(settings)) {
      game.settings.register(MODULE_ID, key, data);
   }

   AAAutorecManager.registerSettings();
}

const fields = foundry.data.fields;

export const num = (initial, options = {}) => new fields.NumberField({ required: true, nullable: false, initial, ...options });

export const optNum = (options = {}) => new fields.NumberField({ required: false, nullable: true, initial: undefined, ...options });

export const bool = (initial = false) => new fields.BooleanField({ initial });

export const optBool = () => new fields.BooleanField({ required: false, nullable: true, initial: undefined });

export const str = (initial = "", options = {}) => new fields.StringField({ required: true, blank: true, initial, ...options });

export const optStr = () => new fields.StringField({ required: false, nullable: true, blank: true, initial: undefined });

export const choice = (values, initial) => new fields.StringField({ required: true, blank: false, choices: values, initial });

export const color = (initial = "#FFFFFF") => new fields.ColorField({ required: true, nullable: false, initial });

export const schema = (fieldMap, options = {}) => new fields.SchemaField(fieldMap, options);

// Shared blocks

export const repeat = () => num(1, { integer: true, min: 1 });

export const elevation = (initial = 1000) => num(initial);

export function videoKeys({ dbSection = "static", menuType = "spell", animation = "curewounds", variant = "01", color: c = "blue" } = {}) {
   return {
      dbSection: str(dbSection),
      menuType: str(menuType),
      animation: str(animation),
      variant: str(variant),
      color: str(c),
      enableCustom: bool(false),
      customPath: str(""),
   };
}

export const video = (defaults) => schema(videoKeys(defaults));

export function sound() {
   return schema({
      enable: bool(false),
      file: str(""),
      delay: num(0),
      startTime: num(0),
      volume: num(1, { min: 0, max: 1 }),
      repeat: repeat(),
      repeatDelay: num(250),
   });
}

export function tintKeys() {
   return {
      contrast: num(0),
      hue: num(0, { min: -180, max: 180 }),
      saturate: num(0),
      saturation: optNum(),
      tint: bool(false),
      tintColor: color(),
   };
}

export function macro() {
   return schema({
      enable: bool(false),
      name: str(""),
      args: str(""),
      playWhen: choice(["0", "1", "2", "3"], "0"),
   });
}

export function advanced() {
   return schema({
      exactMatch: bool(false),
      excludedTerms: new fields.ArrayField(str("")),
      excludedType: schema({ enabled: bool(false), path: str(""), property: str("") }),
   });
}

export function motionSide(type, types, { target = false } = {}) {
   return schema({
      enable: bool(false),
      type: choice(types, type),
      strength: num(5),
      distance: num(0.5),
      color: color("#ff0000"),
      scale: num(1.2, { positive: true }),
      height: num(10),
      opacity: num(0.2, { min: 0, max: 1 }),
      duration: num(500, { positive: true }),
      delay: num(0),
      ...(target ? { onlyOnHit: bool(true) } : {}),
   });
}

export const MOTION_TYPES = {
   source: ["lunge", "recoil", "shake", "flash", "spin", "pulse", "float", "fade"],
   target: ["shake", "knockback", "flash", "spin", "pulse", "float", "fade"],
};

export function motion() {
   return schema({
      source: motionSide("lunge", MOTION_TYPES.source),
      target: motionSide("shake", MOTION_TYPES.target, { target: true }),
   });
}

export function screenShake() {
   return schema({
      enable: bool(false),
      strength: num(20),
      duration: num(250, { positive: true }),
      delay: num(0),
   });
}

export function levels3d() {
   const particle = () => ({
      alpha: optNum(),
      color01: optStr(),
      color02: optStr(),
      emittersize: optNum(),
      gravity: optNum(),
      life: optNum(),
      duration: optNum(),
      mass: optNum(),
      rate: optNum(),
      scale: optNum(),
      speed: optNum(),
      spritePath: optStr(),
      autoSize: optBool(),
      onCenter: optBool(),
   });
   return schema({
      enable: bool(false),
      type: str("explosion"),
      data: schema({
         ...particle(),
         animationType: optStr(),
         arc: optNum(),
         delay: optNum(),
         playOn: optStr(),
         repeat: optNum(),
         resetTime: optNum(),
         rotateTowards: optBool(),
         rotationX: optNum(),
         rotationY: optNum(),
         rotationZ: optNum(),
      }),
      tokens: schema({
         enable: bool(false),
         source: bool(false),
         sourceType: str("twirl"),
         sourcePlay: str("both"),
         target: bool(false),
         targetType: str("shake"),
         targetPlay: str("both"),
      }),
      secondary: schema({
         enable: bool(false),
         data: schema({ ...particle(), type: optStr() }),
      }),
      sound: sound(),
   });
}

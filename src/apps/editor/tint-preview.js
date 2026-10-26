import { colorMatrix, compose } from "../../animation-functions/color-tint.js";

export function previewFile(video, dbSection) {
   const custom = video.enableCustom && video.customPath;
   if (custom && video.customPath.split(".").length < 3) { return video.customPath; }
   const section = video.dbSection || dbSection;
   const dbPath = custom
      ? video.customPath
      : ["autoanimations", section, video.menuType, video.animation, video.variant, video.color === "random" ? null : video.color].filter(Boolean).join(".");
   if (dbPath.includes("undefined")) { return; }
   return firstFile(Sequencer.Database.getEntry(dbPath, { softFail: true }));
}

function firstFile(entry) {
   if (!entry) { return; }
   if (typeof entry === "string") { return entry; }
   if (Array.isArray(entry)) { return firstFile(entry[0]); }
   if (entry.file !== undefined) { return firstFile(entry.file); }
   // Ranged animations are keyed by distance.
   return firstFile(entry["15ft"] ?? Object.values(entry)[0]);
}

export function tintMatrix({ filter, color }) {
   const [r, g, b] = foundry.utils.Color.from(color || "#ffffff").rgb;
   const tint = [r, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0];
   const adjusted = colorMatrix(filter);
   return (adjusted ? compose(adjusted, tint) : tint).map((v) => +v.toFixed(5)).join(" ");
}

export class TintPreviews {
   _times = new Map();

   _observer = new IntersectionObserver((records) => {
      for (const { target: video, isIntersecting } of records) {
         if (!isIntersecting) {
            video.pause();
            continue;
         }
         if (!video.getAttribute("src")) {
            video.src = video.dataset.src;
            const time = this._times.get(video.closest(".aa-tint-preview").dataset.key);
            if (time) { video.addEventListener("loadedmetadata", () => { video.currentTime = time; }, { once: true }); }
         }
         video.play().catch(() => {});
      }
   });

   saveTimes(container) {
      for (const video of container.querySelectorAll(".aa-tint-preview video")) {
         if (video.getAttribute("src")) { this._times.set(video.closest(".aa-tint-preview").dataset.key, video.currentTime); }
      }
   }

   activate(container) {
      this._observer.disconnect();
      for (const preview of container.querySelectorAll(".aa-tint-preview")) {
         this.update(preview);
         this._observer.observe(preview.querySelector("video"));
      }
   }

   update(preview) {
      const container = preview.closest("[data-entry-id]");
      const { prefix, mode, saturation } = preview.dataset;
      const input = (name) => (prefix ? container.querySelector(`[name="${prefix}.${name}"]`) : null);
      const num = (name) => {
         const value = input(name)?.value;
         return value === "" || value === undefined ? 0 : Number(value);
      };

      let values = "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0";
      if (input("tint")?.checked) {
         const filter = mode === "aura"
            ? { hue: num("hue"), saturate: num("tintSaturate") }
            : { hue: num("hue"), contrast: num("contrast"), saturate: saturation !== undefined ? Number(saturation) : num("saturate") };
         values = tintMatrix({ filter, color: input("tintColor")?.value });
      }

      let svg = preview.querySelector("svg");
      if (!svg) {
         const id = `aa-tint-${foundry.utils.randomID()}`;
         preview.insertAdjacentHTML("afterbegin", `<svg width="0" height="0" aria-hidden="true"><filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix"/></filter></svg>`);
         svg = preview.querySelector("svg");
         preview.querySelector("video").style.filter = `url(#${id})`;
      }
      svg.querySelector("feColorMatrix").setAttribute("values", values);
   }

   onInput(event) {
      const name = event.target.closest?.("[name]")?.getAttribute("name");
      const container = event.target.closest?.("[data-entry-id]");
      if (!name || !container) { return; }
      for (const preview of container.querySelectorAll(".aa-tint-preview")) {
         const { prefix } = preview.dataset;
         if (!prefix || !name.startsWith(`${prefix}.`)) { continue; }
         if (name === `${prefix}.saturate`) { delete preview.dataset.saturation; }
         this.update(preview);
      }
   }
}

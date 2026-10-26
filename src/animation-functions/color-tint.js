const ADJUSTMENTS = ["hue", "contrast", "saturate"];

export function colorMatrix(values) {
   let matrix = null;
   for (const key of ADJUSTMENTS) {
      const value = values[key];
      if (!Number.isFinite(value) || value === 0) { continue; }
      const filter = new PIXI.ColorMatrixFilter();
      filter[key](value, true);
      matrix = matrix ? compose(filter.matrix, matrix) : [...filter.matrix];
   }
   return matrix;
}

export function compose(a, b) {
   const out = new Array(20);
   for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 5; col++) {
         let sum = col === 4 ? a[row * 5 + 4] : 0;
         for (let k = 0; k < 4; k++) { sum += a[row * 5 + k] * b[k * 5 + col]; }
         out[row * 5 + col] = sum;
      }
   }
   return out;
}

export function applyColorTint(seq, color, values) {
   seq.tint(color);
   const adjusted = ADJUSTMENTS.filter((key) => Number.isFinite(values[key]) && values[key] !== 0);
   if (adjusted.length === 1) {
      seq.filter("ColorMatrix", { [adjusted[0]]: values[adjusted[0]] });
   } else if (adjusted.length > 1) {
      seq.filter("ColorMatrix", { _loadMatrix: colorMatrix(values).map((v, i) => (i % 5 === 4 ? v * 255 : v)) });
   }
}

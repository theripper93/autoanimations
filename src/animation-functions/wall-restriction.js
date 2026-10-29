const WALL_TYPES = ["move", "sight", "sound", "light"];

export function isWallRestricted(region) {
   return !!region?.restriction?.enabled && WALL_TYPES.includes(region.restriction.type);
}

export function constrainToRegionWalls(seq, region, shape) {
   if (!isWallRestricted(region)) { return; }
   const origin = (shape ?? region.shapes.find((s) => !s.hole))?.origin;
   if (!origin) { return; }
   const [level] = region.levels ?? [];
   seq.constrainedByWalls({
      type: region.restriction.type,
      origin: { x: origin.x, y: origin.y },
      level: level ?? null,
   });
}

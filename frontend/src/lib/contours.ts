/**
 * Marching squares over a regular grid - presentation math for the Indonesia
 * map's contour lines, no astronomy. Cells with a missing corner (NaN) are
 * skipped rather than guessed. Returns SVG path data in grid-index space
 * (x = column, y = row); the caller scales it onto the map.
 */
export function contourPath(grid: number[][], level: number): { d: string; labelAt: [number, number] | null } {
  const rows = grid.length;
  const cols = rows ? grid[0].length : 0;
  let d = "";
  const mids: Array<[number, number]> = [];
  const at = (v1: number, v2: number) => (level - v1) / (v2 - v1);
  for (let i = 0; i + 1 < rows; i += 1) {
    for (let j = 0; j + 1 < cols; j += 1) {
      const a = grid[i][j];
      const b = grid[i][j + 1];
      const c = grid[i + 1][j + 1];
      const e = grid[i + 1][j];
      if ([a, b, c, e].some((v) => Number.isNaN(v))) continue;
      const pts: Array<[number, number]> = [];
      if (a < level !== b < level) pts.push([j + at(a, b), i]);
      if (b < level !== c < level) pts.push([j + 1, i + at(b, c)]);
      if (e < level !== c < level) pts.push([j + at(e, c), i + 1]);
      if (a < level !== e < level) pts.push([j, i + at(a, e)]);
      for (let k = 0; k + 1 < pts.length; k += 2) {
        d += `M${pts[k][0].toFixed(3)} ${pts[k][1].toFixed(3)}L${pts[k + 1][0].toFixed(3)} ${pts[k + 1][1].toFixed(3)}`;
        mids.push([(pts[k][0] + pts[k + 1][0]) / 2, (pts[k][1] + pts[k + 1][1]) / 2]);
      }
    }
  }
  // Label near the middle of the line's run, where it is least likely to sit on a map edge.
  return { d, labelAt: mids.length ? mids[Math.floor(mids.length / 2)] : null };
}

export function isVisible(verdict: boolean | string): boolean {
  return verdict === true || verdict === "visible" || verdict === "visible_optical_aid";
}

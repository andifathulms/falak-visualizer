import { describe, expect, it } from "vitest";

import { NO_VERDICT, verdictLabel } from "../verdictLabels";
import { isVisible } from "../verdict";

describe("verdictLabel", () => {
  it("covers every spelling the engine can emit", () => {
    expect(verdictLabel(true)).toBe("Terpenuhi");
    expect(verdictLabel(false)).toBe("Belum terpenuhi");
    // grid.ts stringifies booleans Python-style for the map payload.
    expect(verdictLabel("True")).toBe("Terpenuhi");
    expect(verdictLabel("False")).toBe("Belum terpenuhi");
    expect(verdictLabel("visible")).toBe("Terlihat");
    expect(verdictLabel("visible_optical_aid")).toBe("Terlihat dengan alat bantu");
    expect(verdictLabel("marginal")).toBe("Marginal");
    expect(verdictLabel("not_visible")).toBe("Tidak terlihat");
  });

  it("passes an unrecognised verdict through rather than hiding it", () => {
    // A verdict this map has not been taught about should be visible on screen
    // as itself, not smoothed into "Unknown" where nobody would notice it.
    expect(verdictLabel("some_new_classification")).toBe("some_new_classification");
  });

  it("renders absence as a dash, not as the string 'undefined'", () => {
    // What String(verdict) did at the old call sites when a month had no
    // resolved verdict. Absence is not a verdict and is not a "not met".
    expect(verdictLabel(undefined)).toBe(NO_VERDICT);
    expect(verdictLabel(null)).toBe(NO_VERDICT);
    expect(NO_VERDICT).not.toBe("undefined");
  });

  it("does not change what counts as visible", () => {
    // The contract this module must not break: labelling is one-directional.
    // isVisible reads raw engine values and must keep doing so, or a rename in
    // the label map would silently move a verdict across the visible boundary.
    expect(isVisible("visible_optical_aid")).toBe(true);
    expect(isVisible("marginal")).toBe(false);
    expect(isVisible(true)).toBe(true);
    expect(isVisible("Terlihat dengan alat bantu")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { registerVariant, validateVariant, parseDeck } from "carousel-core/parse";
import { falakMalam } from "../variant";

describe("editorial/falak-malam", () => {
  it("passes carousel-core's contrast and structure checks", () => {
    expect(validateVariant(falakMalam)).toEqual([]);
  });

  it("registers, and decks naming it parse without unknown-template", () => {
    registerVariant(falakMalam, { replace: true });
    const { deck, warnings } = parseDeck("template: editorial/falak-malam\n---\n[cover]\nHalo\n---\n[end]\nSelesai");
    expect(deck.header.template).toBe("editorial/falak-malam");
    expect(warnings.map((w) => w.code)).not.toContain("unknown-template");
  });
});

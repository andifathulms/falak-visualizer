import { describe, expect, it } from "vitest";
import { zoneAbbreviation } from "../localDate";
import { INDONESIAN_CITIES } from "../locations";
import { resolveTimeZone } from "../timezone";

/** The legal zone of every listed city (Keppres 41/1987: WIB, WITA, WIT). */
const EXPECTED: Record<string, "WIB" | "WITA" | "WIT"> = {
  "Banda Aceh": "WIB", Medan: "WIB", Padang: "WIB", Pekanbaru: "WIB", "Tanjung Pinang": "WIB", Batam: "WIB",
  Jambi: "WIB", Palembang: "WIB", "Pangkal Pinang": "WIB", Bengkulu: "WIB", "Bandar Lampung": "WIB",
  Jakarta: "WIB", Bogor: "WIB", Bekasi: "WIB", Bandung: "WIB", Cirebon: "WIB", Serang: "WIB", Semarang: "WIB",
  Yogyakarta: "WIB", Surabaya: "WIB", Malang: "WIB",
  Pontianak: "WIB", Palangkaraya: "WIB", Banjarmasin: "WITA", Samarinda: "WITA", Balikpapan: "WITA", "Tanjung Selor": "WITA",
  Manado: "WITA", Gorontalo: "WITA", Palu: "WITA", Mamuju: "WITA", Makassar: "WITA", Kendari: "WITA",
  Denpasar: "WITA", Mataram: "WITA", Kupang: "WITA",
  Ambon: "WIT", Ternate: "WIT", Manokwari: "WIT", Sorong: "WIT", Nabire: "WIT", Jayapura: "WIT", Wamena: "WIT", Merauke: "WIT",
};

describe("resolveTimeZone", () => {
  it("covers every listed city in this table", () => {
    expect(INDONESIAN_CITIES.map((c) => c.name).sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(INDONESIAN_CITIES.map((c) => [c.name, c] as const))("%s resolves to its legal Indonesian zone", (name, c) => {
    expect(zoneAbbreviation(resolveTimeZone(c.lat, c.lon))).toBe(EXPECTED[name]);
  });

  it("puts Jayapura in WIT, not Port Moresby's UTC+10", () => {
    const jayapura = INDONESIAN_CITIES.find((c) => c.name === "Jayapura")!;
    expect(resolveTimeZone(jayapura.lat, jayapura.lon)).toBe("Asia/Jayapura");
    // 2027-02-07 09:00 UTC is 18:00 in Jayapura (UTC+9).
    const clock = new Date(Date.UTC(2027, 1, 7, 9, 0)).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: resolveTimeZone(jayapura.lat, jayapura.lon)!,
    });
    expect(clock).toBe("18.00");
  });

  it("leaves Papua New Guinea itself alone", () => {
    expect(resolveTimeZone(-9.4438, 147.1803)).toBe("Pacific/Port_Moresby"); // Port Moresby
  });
});

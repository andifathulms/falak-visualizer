/**
 * Where each threshold in this engine comes from.
 *
 * An app that tells people not to trust unsourced calendar tools cannot then
 * ask them to trust three magic numbers. "Deterministic and citable" is only
 * half satisfied by determinism: 3.0, 6.4 and Odeh's boundary constants are
 * decisions with dates and authors, and until they are named the user has to
 * take them on faith.
 *
 * Naming them also does something the criteria panels cannot do on their own -
 * it shows that MABIMS 2021 REPLACED an earlier 2 deg / 3 deg / 8 hour rule.
 * The thresholds are not fixed law; they are a revisable human judgement about
 * what is observable, which is the whole subject of this app in one fact.
 *
 * Standard applied here, same as ISBAT_RECORDS in isbat.ts: a citation names a
 * primary or peer-reviewed source, or it is marked `unsourced` and says so in
 * the UI. Nothing is filled in from memory or from a secondary aggregator.
 */

export interface Citation {
  /** Short label shown inline, e.g. "Odeh 2004". */
  label: string;
  /** Full reference. */
  reference: string;
  url?: string;
  /** Set when no primary source has been cross-checked yet. */
  unsourced?: true;
  note?: string;
}

export const CITATIONS = {
  mabims_2021: {
    label: "MABIMS 2021",
    reference:
      "Kriteria baru MABIMS: tinggi hilal 3° dan elongasi 6,4°, disepakati para Menteri Agama Brunei Darussalam, Indonesia, Malaysia dan Singapura (2021), berlaku di Indonesia sejak 2022.",
    url: "https://kemenag.go.id/read/kemenag-mulai-gunakan-kriteria-baru-hilal-awal-bulan-hijriah",
    note:
      "Replaced the earlier 2° altitude / 3° elongation / 8-hour moon-age criterion. The change traces back to the MABIMS Muzakarah Rukyah dan Takwim Islam (Malaysia, 2016) and the Rekomendasi Jakarta of 2017 before being agreed at ministerial level in 2021.",
  },
  mabims_history: {
    label: "Bimas Islam Kemenag",
    reference:
      "Sejarah dan Perkembangan Kriteria Hilal MABIMS dalam Penentuan Awal Bulan Hijriah, Direktorat Jenderal Bimbingan Masyarakat Islam, Kementerian Agama RI.",
    url: "https://bimasislam.kemenag.go.id/post/berita/-sejarah-dan-perkembangan-kriteria-hilal-mabims-dalam-penentuan-awal-bulan-hijriah",
  },
  odeh_2004: {
    label: "Odeh 2004",
    reference:
      "M. Sh. Odeh, “New Criterion for Lunar Crescent Visibility”, Experimental Astronomy 18, 39–64 (2004).",
    url: "https://doi.org/10.1007/s10686-005-9002-5",
    note:
      "Built from 737 observations, roughly half collected by the Islamic Crescent Observation Project (ICOP), and expressed in topocentric arc of vision against topocentric crescent width. The same dataset is where the 6.4° Danjon limit that MABIMS 2021 adopts as its elongation floor comes from.",
  },
  wujudul_hilal: {
    label: "Wujudul hilal",
    reference:
      "The criterion used by Muhammadiyah: conjunction before sunset and moonset after sunset, irrespective of whether the crescent would be observable.",
    unsourced: true,
    note:
      "No primary Majelis Tarjih document has been cross-checked for this entry yet. The rule as implemented is standard and uncontested, but the citation is owed.",
  },
  meeus: {
    label: "Meeus",
    reference:
      "Jean Meeus, Astronomical Algorithms, 2nd ed. — Ch. 25 (solar position), Ch. 47 (lunar position, truncated ELP2000-82B), Ch. 15 (rise/set standard altitudes), Ch. 40 (parallax).",
  },
  de440: {
    label: "JPL DE440",
    reference:
      "Conjunction times cross-checked against JPL DE440 via Skyfield over 50 historical months, asserting agreement within 5 minutes. Test-only dependency; never called at runtime.",
  },
} as const satisfies Record<string, Citation>;

export type CitationKey = keyof typeof CITATIONS;

/** The sources behind each visibility criterion, in display order. */
export const CRITERION_CITATIONS: Record<string, readonly CitationKey[]> = {
  wujudul_hilal: ["wujudul_hilal"],
  mabims_2021: ["mabims_2021", "mabims_history", "odeh_2004"],
  odeh: ["odeh_2004"],
};

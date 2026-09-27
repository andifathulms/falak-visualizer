/**
 * What the UI says about each month-start criterion - one definition shared by
 * Hari ini, Awal Bulan, Kalender and Belajar.
 *
 * "Who uses it" follows DESIGN.md v2 §7.3 and the sourcing standard in
 * lib/falak/citations.ts: MABIMS 2021's use by Kemenag is sourced; the
 * Muhammadiyah attribution carries its citation-owed flag in the UI; the move
 * to KHGT is stated as an announcement the reader should confirm, not as a
 * fact Falak computes.
 */
import type { HilalMethod } from "./falak/visibility";

export interface CriterionInfo {
  key: HilalMethod;
  name: string;
  /** Short attribution shown beside every verdict. */
  who: string;
  /** True when the attribution has no primary source cross-checked yet. */
  whoUnsourced?: boolean;
  /** One-line rule, Indonesian. */
  rule: string;
  /** Why the rule asks what it asks - Belajar and the "Kenapa?" disclosure. */
  why: string;
  note?: string;
}

export const CRITERIA: Record<HilalMethod, CriterionInfo> = {
  mabims_2021: {
    key: "mabims_2021",
    name: "MABIMS 2021",
    who: "Dipakai Kemenag RI dalam sidang isbat",
    rule: "Tinggi hilal ≥ 3° dan elongasi ≥ 6,4° saat matahari terbenam",
    why:
      "Dua syarat karena menanyakan dua hal berbeda. Tinggi bertanya apakah bulan masih cukup tinggi di langit yang sudah cukup gelap. Elongasi bertanya apakah bulan sudah cukup jauh dari matahari untuk tampak bercahaya: di bawah sekitar 6,4° (batas Danjon) sabit terlalu tipis untuk terlihat, setinggi apa pun letaknya. Keduanya harus terpenuhi; tinggi yang nyaman tidak bisa menolong sabit yang secara fisik belum ada.",
  },
  wujudul_hilal: {
    key: "wujudul_hilal",
    name: "Wujudul Hilal",
    who: "Dikenal sebagai kriteria Muhammadiyah",
    whoUnsourced: true,
    rule: "Ijtimak sebelum matahari terbenam, dan bulan terbenam setelah matahari",
    why:
      "Bertanya apakah hilal sudah ADA di atas ufuk, bukan apakah seseorang bisa melihatnya. Bila bulan terbenam lebih dulu daripada matahari, bulan sudah hilang pada satu-satunya jendela pengamatan, sehingga selisih waktu terbenam adalah seluruh ujiannya.",
    note:
      "Muhammadiyah telah mengumumkan peralihan ke Kalender Hijriah Global Tunggal (KHGT), yang tidak dihitung oleh Falak. Periksa maklumat resmi Muhammadiyah untuk tanggal yang mereka tetapkan.",
  },
  odeh: {
    key: "odeh",
    name: "Odeh 2004",
    who: "Kriteria visibilitas astronomi, rujukan internasional",
    rule: "Nilai-v dari busur pandang dan lebar sabit, empat tingkat",
    why:
      "Bukan ambang tunggal, melainkan jarak. Odeh mencocokkan kurva pada 737 pengamatan sabit tertipis yang benar-benar terlihat pada tiap lebar; nilai-v adalah seberapa jauh petang ini berada di atas kurva itu. Positif dan besar berarti mudah terlihat, mendekati nol berarti di tepi batas yang pernah dilaporkan - karena itu hasilnya empat tingkat, bukan ya atau tidak.",
  },
};

export const CRITERIA_ORDER: readonly HilalMethod[] = ["mabims_2021", "wujudul_hilal", "odeh"];

/** Odeh's four grades and the two booleans, in reader-facing Indonesian. */
export function verdictText(method: HilalMethod, verdict: boolean | string): string {
  if (method === "odeh") {
    switch (verdict) {
      case "visible":
        return "Terlihat mata telanjang";
      case "visible_optical_aid":
        return "Terlihat dengan alat optik";
      case "marginal":
        return "Marginal";
      case "not_visible":
        return "Tidak terlihat";
      default:
        return String(verdict);
    }
  }
  if (method === "wujudul_hilal") return verdict ? "Hilal sudah wujud" : "Hilal belum wujud";
  return verdict ? "Kriteria terpenuhi" : "Belum terpenuhi";
}

/** Three-way tone for the icon and colour (never colour alone - DESIGN.md §2.5). */
export function verdictTone(method: HilalMethod, verdict: boolean | string): "lit" | "margin" | "dark" {
  if (method === "odeh") {
    if (verdict === "visible" || verdict === "visible_optical_aid") return "lit";
    if (verdict === "marginal") return "margin";
    return "dark";
  }
  return verdict ? "lit" : "dark";
}

/** MODEL_CAVEATS (lib/falak/tolerance.ts), in the interface language. Same four items, same order. */
export const MODEL_CAVEATS_ID: ReadonlyArray<{ title: string; detail: string }> = [
  {
    title: "Hanya refraksi standar",
    detail:
      "Terbenam matahari dan bulan memakai refraksi standar 34 menit busur di ufuk. Suhu dan tekanan udara sebenarnya dapat menggeser terbenam hingga sekitar satu menit, dan tinggi bulan berubah kira-kira seperempat derajat per menit di lintang Indonesia.",
  },
  {
    title: "Elongasi geosentris",
    detail:
      "Apakah elongasi 6,4° MABIMS 2021 dimaksudkan toposentris masih diperdebatkan; PBNU berpendapat demikian. Falak melaporkan nilai geosentris yang lazim, yang berbeda sekitar 0,1–0,2°.",
  },
  {
    title: "Busur pandang Odeh didekati",
    detail:
      "Odeh menilai pada 'waktu terbaik', ketika matahari sekitar 4,5° di bawah ufuk. Falak menilai saat terbenam dan mengambil busur pandang dari tinggi bulan di sana - penyederhanaan yang terdokumentasi dan dapat menggeser klasifikasi di dekat batasnya.",
  },
  {
    title: "Permukaan laut, bumi bulat",
    detail:
      "Koreksi toposentris mengabaikan ketinggian pengamat dan kepepatan bumi. Keduanya jauh di bawah satu menit busur pada ketinggian ini, dan aplikasi tidak menanyakan ketinggian tempat.",
  },
];

interface MarginLike {
  verdict: "met" | "not_met" | "indeterminate";
  margin: number | null;
  tolerance: number;
  unit: "deg" | "min";
  binding: string;
}

/** An engine CriterionMargin as one Indonesian sentence fragment. */
export function marginText(method: HilalMethod, m: MarginLike): string {
  const n = (v: number, d: number) => Math.abs(v).toFixed(d).replace(".", ",");
  let text: string;
  if (m.margin === null) {
    text = m.binding.includes("conjunction") ? "ijtimak terjadi setelah matahari terbenam" : "bulan tidak terbenam petang itu";
  } else if (method === "mabims_2021") {
    const which = m.binding.startsWith("altitude") ? "batas tinggi 3°" : "batas elongasi 6,4°";
    text = `${m.margin >= 0 ? "lebih" : "kurang"} ${n(m.margin, 2)}° dari ${which}`;
  } else if (method === "wujudul_hilal") {
    text = m.margin >= 0 ? `bulan terbenam ${n(m.margin, 1)} mnt setelah matahari` : `bulan terbenam ${n(m.margin, 1)} mnt sebelum matahari`;
  } else {
    const v = /v = (-?[\d.]+)/.exec(m.binding)?.[1];
    text = v ? `nilai-v ${Number(v).toFixed(2).replace(".", ",")}` : `selisih ${n(m.margin, 2)}`;
  }
  if (m.verdict === "indeterminate") {
    text += ` — di dalam toleransi mesin ±${String(m.tolerance).replace(".", ",")}${m.unit === "deg" ? "°" : " mnt"}, jadi belum bisa dipastikan`;
  }
  return text;
}

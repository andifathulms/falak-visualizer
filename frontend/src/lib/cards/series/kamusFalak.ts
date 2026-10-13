/**
 * Kamus Falak: glossary word slides. The only numbers are the engine's own
 * MABIMS thresholds, imported rather than typed.
 */
import { MABIMS_MIN_ALTITUDE_DEG, MABIMS_MIN_ELONGATION_DEG } from "../../falak/visibility";
import { assembleDeck, type CardDeck, type SlideSpec } from "../deck";
import { fmtDeg } from "../format";
import { FALAK_URL } from "./common";

type Entry = Extract<SlideSpec, { type: "word" }>["fields"];

export const KAMUS_ENTRIES: readonly Entry[] = [
  {
    word: "ijtimak",
    pos: "istilah falak",
    meaning: "Saat bulan dan matahari sejajar bujur ekliptika. Akhir satu siklus bulan, awal yang berikutnya.",
    note: "Disebut juga konjungsi.",
  },
  {
    word: "hilal",
    pos: "istilah falak",
    meaning: "Sabit bulan pertama sesudah ijtimak, dicari di ufuk barat saat matahari terbenam.",
  },
  {
    word: "elongasi",
    pos: "istilah falak",
    meaning: "Jarak sudut antara bulan dan matahari di langit.",
    note: `MABIMS 2021 mensyaratkan minimal ${fmtDeg(MABIMS_MIN_ELONGATION_DEG, 1)} saat matahari terbenam.`,
  },
  {
    word: "hisab",
    pos: "metode",
    meaning: "Menentukan posisi bulan dan matahari dengan perhitungan astronomi.",
  },
  {
    word: "rukyat",
    pos: "metode",
    meaning: "Mengamati hilal secara langsung, dengan mata atau alat optik.",
  },
  {
    word: "imkanur rukyat",
    pos: "kriteria",
    meaning: "Kemungkinan hilal terlihat. Dasar kriteria MABIMS 2021.",
    note: `Tinggi minimal ${fmtDeg(MABIMS_MIN_ALTITUDE_DEG, 0)}, elongasi minimal ${fmtDeg(MABIMS_MIN_ELONGATION_DEG, 1)}.`,
  },
  {
    word: "wujudul hilal",
    pos: "kriteria",
    meaning: "Hilal dianggap sudah ada bila ijtimak terjadi sebelum matahari terbenam dan bulan terbenam sesudah matahari.",
    note: "Rujukan primer belum diverifikasi.",
  },
  {
    word: "sidang isbat",
    pos: "istilah",
    meaning: "Sidang Kementerian Agama RI yang menetapkan awal Ramadan, Syawal dan Zulhijah dari hisab dan laporan rukyat.",
  },
];

/** Six words keep the default deck within carousel-core's 10-slide hint (cover + words + disclaimer + end). */
export const DEFAULT_KAMUS_WORDS = ["ijtimak", "hilal", "elongasi", "hisab", "rukyat", "sidang isbat"] as const;

export interface KamusFalakInput {
  /** Words to include, by headword, in KAMUS_ENTRIES order; default DEFAULT_KAMUS_WORDS. */
  words?: readonly string[];
  handle?: string;
}

export function buildKamusFalak(input: KamusFalakInput = {}): CardDeck {
  const words: readonly string[] = input.words?.length ? input.words : DEFAULT_KAMUS_WORDS;
  const pick = KAMUS_ENTRIES.filter((e) => words.includes(e.word));
  const slides: SlideSpec[] = [
    { type: "cover", kicker: "KAMUS FALAK", headline: "Istilah di balik | awal bulan hijriah", subtitle: "Geser untuk arti tiap kata." },
    ...pick.map((fields) => ({ type: "word" as const, fields })),
    { type: "end", headline: "Belajar lebih lanjut di Falak", body: [FALAK_URL, "Istilah apa lagi? Tulis di komentar."] },
  ];
  return assembleDeck({
    series: "kamus-falak",
    title: "kamus-falak",
    caption: "Ijtimak, hilal, elongasi, hisab, rukyat: istilah yang sering muncul menjelang awal bulan hijriah. #falak #hilal #istilah",
    slides,
    handle: input.handle,
  });
}

import type { Metadata } from "next";
import Link from "next/link";
import { CitationList } from "@/components/CitationList";
import { HisabDisclaimer } from "@/components/HisabDisclaimer";
import { HorizonInstrument } from "@/components/HorizonInstrument";
import { CRITERIA, CRITERIA_ORDER, MODEL_CAVEATS_ID } from "@/lib/criteria";
import { CITATIONS, CRITERION_CITATIONS, type CitationKey } from "@/lib/falak/citations";
import { computeHilalObservation } from "@/lib/falak/visibility";
import { allThresholdBands } from "@/lib/instrumentGeometry";
import { routeMetadata } from "@/lib/routeMetadata";

export const metadata: Metadata = routeMetadata("belajar");

/**
 * /belajar (DESIGN.md v2 §6, layer 3 of §4.3): the explanations that used to
 * be written into the tool pages as small italic blocks, now given room -
 * glossary, each criterion (anchored for the "Kenapa?" links), how a month
 * start is decided, how Falak computes and is validated, model limits and
 * sources. A server page: the worked example below is computed from the
 * engine at build time, for a fixed and citable evening.
 */

const GLOSSARY: Array<[string, string]> = [
  ["Hisab", "Perhitungan astronomis posisi matahari dan bulan untuk menentukan waktu - termasuk awal bulan Hijriah."],
  ["Rukyat", "Pengamatan langsung hilal dengan mata atau alat optik saat matahari terbenam. Falak tidak melakukan rukyat."],
  ["Hilal", "Sabit bulan yang sangat tipis, terlihat sesaat setelah matahari terbenam, sehari atau dua setelah ijtimak."],
  ["Ijtimak (konjungsi)", "Saat bulan dan matahari berada pada bujur ekliptika yang sama. Sebelum ijtimak, tidak ada hilal bulan baru."],
  ["Petang penentu", "Matahari terbenam pertama setelah ijtimak - petang yang dinilai oleh semua kriteria, dan yang dibahas sidang isbat."],
  ["Tinggi hilal", "Sudut bulan di atas ufuk saat matahari terbenam (toposentris: dilihat dari permukaan bumi, bukan pusatnya)."],
  ["Elongasi", "Jarak sudut antara bulan dan matahari. Makin besar, makin lebar sabit yang tersinari."],
  ["Selisih terbenam (lag)", "Berapa menit bulan terbenam setelah matahari. Bila negatif, bulan terbenam lebih dulu."],
  ["Istikmal", "Menggenapkan bulan menjadi 30 hari ketika hilal belum memenuhi kriteria pada petang penentu."],
  ["Sidang isbat", "Sidang Kementerian Agama RI yang menetapkan awal Ramadan, Syawal, dan Zulhijah dengan mempertimbangkan hisab dan laporan rukyat."],
];

const STEPS: Array<[string, string]> = [
  ["Cari ijtimak", "Falak mencari saat bujur bulan dan matahari sama (model ELP2000/Meeus untuk bulan, VSOP87 terpangkas untuk matahari)."],
  ["Tentukan petang penentu", "Matahari terbenam pertama di lokasi Anda setelah ijtimak."],
  ["Ukur langitnya", "Pada saat matahari terbenam: tinggi bulan (toposentris), elongasi, umur bulan, selisih terbenam, iluminasi, lebar sabit."],
  ["Terapkan kriteria", "Tiap kriteria menilai angka-angka itu. Bila terpenuhi, tanggal 1 adalah esok harinya; bila tidak, bulan berjalan digenapkan dan tanggal 1 mundur sehari."],
];

export default function BelajarPage() {
  const example = computeHilalObservation({ year: 2026, month: 10, day: 11 }, -6.2088, 106.8456);
  const reading = {
    moonAltitudeDeg: example.moonAltitudeDeg,
    sunAltitudeDeg: example.sunAltitudeDeg,
    elongationDeg: example.elongationDeg,
    illuminationFraction: example.illuminationFraction,
    moonAgeHours: example.moonAgeHours,
    lagTimeMinutes: example.lagTimeMinutes,
    crescentWidthArcmin: example.crescentWidthArcmin,
  };
  const allCitations = Object.keys(CITATIONS) as CitationKey[];

  return (
    <article className="mx-auto max-w-3xl space-y-14">
      <header className="space-y-3">
        <p className="text-2xs font-bold uppercase tracking-[0.14em] text-accent">Belajar ilmu falak</p>
        <h1 className="text-[2.1rem] font-extrabold leading-tight tracking-tight sm:text-5xl">Bagaimana awal bulan ditentukan, dan kenapa bisa berbeda</h1>
        <p className="font-display text-lg leading-relaxed text-ink-muted sm:text-xl">
          Setiap jawaban di Falak dihitung dari rumus astronomi yang bisa diperiksa. Halaman ini menjelaskan istilahnya, aturannya, dan
          seberapa jauh angkanya bisa dipercaya.
        </p>
        <nav aria-label="Isi halaman" className="flex flex-wrap gap-2 pt-2 text-sm font-semibold">
          {[
            ["#istilah", "Istilah"],
            ["#langkah", "Langkah"],
            ["#kriteria", "Tiga kriteria"],
            ["#perhitungan", "Cara menghitung"],
            ["#validasi", "Validasi"],
            ["#batasan", "Batasan"],
            ["#sumber", "Sumber"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="rounded-full border border-border bg-surface-card px-3 py-1.5 hover:border-border-strong">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <section id="istilah" className="scroll-mt-24 space-y-4">
        <h2 className="text-2xl font-extrabold tracking-tight">Istilah</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          {GLOSSARY.map(([term, def]) => (
            <div key={term} className="card p-4">
              <dt className="font-bold">{term}</dt>
              <dd className="mt-1 text-sm text-ink-muted">{def}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="langkah" className="scroll-mt-24 space-y-5">
        <h2 className="text-2xl font-extrabold tracking-tight">Dari ijtimak ke tanggal 1</h2>
        <ol className="space-y-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-solid text-sm font-extrabold text-accent-on-solid">{i + 1}</span>
              <div>
                <p className="font-bold">{title}</p>
                <p className="text-ink-muted">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <figure className="space-y-3">
          <div className="-mx-4 sm:mx-0">
            <HorizonInstrument reading={reading} bands={allThresholdBands(example.crescentWidthArcmin)} viewport={{ width: 720, height: 340 }} />
          </div>
          <figcaption className="text-sm text-ink-muted">
            Contoh nyata: Jakarta, Minggu 11 Oktober 2026, saat matahari terbenam - petang penentu 1 Jumadilawal 1448. Semua angka dihitung
            oleh mesin yang sama dengan halaman lain.{" "}
            <Link href="/awal-bulan?bulan=1448-5" className="font-semibold text-accent hover:underline">
              Buka di Awal Bulan
            </Link>
          </figcaption>
        </figure>
      </section>

      <section id="kriteria" className="scroll-mt-24 space-y-5">
        <h2 className="text-2xl font-extrabold tracking-tight">Tiga kriteria</h2>
        <p className="text-ink-muted">
          Ketiganya menilai langit yang sama pada petang yang sama. Mereka berbeda karena menanyakan hal yang berbeda: apakah hilal ada, apakah
          ia mungkin terlihat, atau seberapa dekat ia dengan batas pengamatan yang pernah tercatat.
        </p>
        {CRITERIA_ORDER.map((key) => {
          const c = CRITERIA[key];
          return (
            <section key={key} id={`kriteria-${key}`} className="card scroll-mt-24 space-y-3 p-5 sm:p-6">
              <div>
                <h3 className="text-xl font-extrabold">{c.name}</h3>
                <p className="text-sm text-ink-muted">
                  {c.who}
                  {c.whoUnsourced && <span className="ml-1.5 rounded bg-surface-raised px-1.5 py-0.5 text-2xs">rujukan belum diverifikasi</span>}
                </p>
              </div>
              <p className="rounded-control bg-surface-raised px-4 py-3 font-semibold">{c.rule}</p>
              <p className="font-display text-lg leading-relaxed">{c.why}</p>
              {c.note && <p className="text-sm text-ink-muted">{c.note}</p>}
              <CitationList keys={CRITERION_CITATIONS[key] ?? []} />
            </section>
          );
        })}
      </section>

      <section id="perhitungan" className="scroll-mt-24 space-y-3">
        <h2 className="text-2xl font-extrabold tracking-tight">Cara Falak menghitung</h2>
        <p className="text-ink-muted">
          Seluruh perhitungan berjalan di peramban Anda, tanpa server dan tanpa API astronomi pihak ketiga. Posisi matahari memakai VSOP87 yang
          dipangkas, posisi bulan memakai ELP2000 menurut <em>Astronomical Algorithms</em> karya Jean Meeus, dengan koreksi paralaks untuk tinggi
          bulan dan refraksi standar di ufuk. Tidak ada kecerdasan buatan di jalur perhitungan - hanya rumus yang deterministik.
        </p>
        <p className="text-ink-muted">
          Waktu salat memakai sudut matahari: Subuh dan Isya pada sudut depresi yang ditetapkan konvensi (Kemenag RI: 20° dan 18°), Terbit dan
          Magrib saat piringan matahari menyentuh ufuk, Zuhur sesaat setelah transit, dan Asar dari panjang bayangan. Arah kiblat adalah arah
          awal lingkaran besar menuju Ka&apos;bah (21,4225° LU, 39,8262° BT).
        </p>
      </section>

      <section id="validasi" className="scroll-mt-24 space-y-3">
        <h2 className="text-2xl font-extrabold tracking-tight">Seberapa bisa dipercaya</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            ["50", "waktu ijtimak historis dicocokkan dengan efemeris JPL DE440, selisih di bawah 5 menit"],
            ["0,06°", "selisih azimut bulan terbesar terhadap JPL DE440 (matahari 0,014°)"],
            ["±2.000", "vektor uji yang mengikat mesin peramban ke mesin acuan Python, dicek setiap rilis"],
          ].map(([n, text]) => (
            <li key={n} className="card p-4">
              <p className="text-3xl font-extrabold tabular-nums text-accent">{n}</p>
              <p className="mt-1 text-sm text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>
        <p className="text-ink-muted">
          JPL DE440 (lewat pustaka Skyfield) hanya dipakai dalam pengujian, tidak pernah saat aplikasi berjalan. Hasil yang terlalu dekat dengan
          batas kriteria - di dalam toleransi mesin - ditandai &ldquo;belum pasti&rdquo;, bukan dibulatkan diam-diam.
        </p>
      </section>

      <section id="batasan" className="scroll-mt-24 space-y-3">
        <h2 className="text-2xl font-extrabold tracking-tight">Batasan model</h2>
        <dl className="space-y-3">
          {MODEL_CAVEATS_ID.map((c) => (
            <div key={c.title} className="card p-4">
              <dt className="font-bold">{c.title}</dt>
              <dd className="mt-1 text-sm text-ink-muted">{c.detail}</dd>
            </div>
          ))}
        </dl>
        <HisabDisclaimer />
      </section>

      <section id="sumber" className="scroll-mt-24 space-y-3">
        <h2 className="text-2xl font-extrabold tracking-tight">Sumber</h2>
        <CitationList keys={allCitations} showNotes />
      </section>
    </article>
  );
}

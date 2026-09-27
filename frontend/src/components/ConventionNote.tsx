import { CONVENTIONS, KEMENAG_RI } from "@/lib/falak/prayerTimes";

export const DEFAULT_CONVENTION = KEMENAG_RI.name;

export const CONVENTION_OPTIONS = Object.values(CONVENTIONS).map((c) => ({
  value: c.name,
  label: c.name,
}));

/**
 * The angles behind the times on screen, and which of them the choice actually
 * moved.
 *
 * The selector this accompanies exists because fajr and isha are not
 * observations - they are definitions, and organisations define them
 * differently. That is the same structure as the hilal criteria: a number that
 * looks astronomical but encodes a human decision. Exposing it for month starts
 * while hiding it for prayer times would have been incoherent.
 *
 * But a selector alone is a downgrade for the primary user, who arrives wanting
 * the time to pray and is now being asked to make a choice they are not placed
 * to make. So the default stays Kemenag RI, and this note answers "why would I
 * change this?" in place, including the part that matters most: dhuhr, asr and
 * maghrib barely move between conventions because the sun fixes them. Only the
 * twilight prayers are in dispute. That asymmetry is the whole lesson.
 */
export function ConventionNote({ convention }: { convention: string }) {
  const c = CONVENTIONS[convention];
  if (!c) return null;

  const isDefault = c.name === DEFAULT_CONVENTION;
  const deg = (v: number) => `${String(v).replace(".", ",")}°`;

  return (
    <div className="space-y-2 rounded-control bg-surface-raised px-4 py-3.5 text-sm">
      <p>
        <span className="font-bold">{c.name}</span>{" "}
        <span className="text-ink-muted">
          — Subuh saat matahari <span className="font-semibold tabular-nums text-ink">{deg(c.fajrAngleDeg)}</span> di bawah
          ufuk, Isya pada <span className="font-semibold tabular-nums text-ink">{deg(c.ishaAngleDeg)}</span>, Asar saat
          bayangan {c.asrShadowFactor}× tinggi benda{c.asrShadowFactor === 1 ? " (Syafi'i)" : " (Hanafi)"}.
        </span>
      </p>
      <p className="text-ink-muted">
        Asar ditentukan dari panjang bayangan, bukan jam, karena itulah yang bisa diamati tanpa jam: saat matahari turun,
        bayangan memanjang, dan Asar tiba ketika bayangan bertambah sepanjang{" "}
        {c.asrShadowFactor === 1 ? "tinggi benda itu sendiri" : "dua kali tinggi benda"} dari panjangnya saat tengah hari.
        Yang diperselisihkan mazhab adalah faktornya, bukan caranya.
      </p>
      <p className="text-ink-muted">
        Hanya <span className="font-semibold text-ink">Subuh</span> dan <span className="font-semibold text-ink">Isya</span>{" "}
        yang bergantung pada konvensi, karena keduanya didefinisikan oleh seberapa jauh matahari di bawah ufuk - sebuah
        kesepakatan, bukan pengamatan. Terbit, Zuhur, dan Magrib ditentukan posisi matahari dan tidak berubah.
        {isDefault
          ? " Kemenag RI adalah standar Indonesia dan bawaan di sini; ganti hanya bila Anda menyamakan dengan jadwal lembaga lain."
          : " Ini bukan standar Indonesia (standarnya Kemenag RI). Pakai bila Anda menyamakan dengan jadwal lembaga tersebut."}
      </p>
    </div>
  );
}

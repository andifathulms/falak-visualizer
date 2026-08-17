export type Region = "Sumatera" | "Jawa" | "Kalimantan" | "Sulawesi" | "Bali & Nusa Tenggara" | "Maluku & Papua";

export interface CityLocation {
  name: string;
  lat: number;
  lon: number;
  region: Region;
}

/** Displayed in this order in the city picker - roughly west to east, the
 * order most Indonesian readers already think in. */
export const REGIONS: Region[] = [
  "Sumatera",
  "Jawa",
  "Kalimantan",
  "Sulawesi",
  "Bali & Nusa Tenggara",
  "Maluku & Papua",
];

// Every current provincial capital, plus a handful of other major cities
// (Malang, Bekasi, Bogor, Cirebon, Batam, Balikpapan) picked because they're
// large enough that a visitor is more likely to search for them by name than
// for their province's capital.
export const INDONESIAN_CITIES: CityLocation[] = [
  // --- Sumatera ---------------------------------------------------------
  { name: "Banda Aceh", lat: 5.5483, lon: 95.3238, region: "Sumatera" },
  { name: "Medan", lat: 3.5952, lon: 98.6722, region: "Sumatera" },
  { name: "Padang", lat: -0.9471, lon: 100.4172, region: "Sumatera" },
  { name: "Pekanbaru", lat: 0.5071, lon: 101.4478, region: "Sumatera" },
  { name: "Tanjung Pinang", lat: 0.9186, lon: 104.4553, region: "Sumatera" },
  { name: "Batam", lat: 1.0456, lon: 104.0305, region: "Sumatera" },
  { name: "Jambi", lat: -1.6101, lon: 103.6131, region: "Sumatera" },
  { name: "Palembang", lat: -2.9761, lon: 104.7754, region: "Sumatera" },
  { name: "Pangkal Pinang", lat: -2.1316, lon: 106.1169, region: "Sumatera" },
  { name: "Bengkulu", lat: -3.7928, lon: 102.2608, region: "Sumatera" },
  { name: "Bandar Lampung", lat: -5.4292, lon: 105.2611, region: "Sumatera" },

  // --- Jawa ---------------------------------------------------------------
  { name: "Jakarta", lat: -6.2, lon: 106.8167, region: "Jawa" },
  { name: "Bogor", lat: -6.5971, lon: 106.806, region: "Jawa" },
  { name: "Bekasi", lat: -6.2383, lon: 106.9756, region: "Jawa" },
  { name: "Bandung", lat: -6.9175, lon: 107.6191, region: "Jawa" },
  { name: "Cirebon", lat: -6.7063, lon: 108.557, region: "Jawa" },
  { name: "Serang", lat: -6.1149, lon: 106.1503, region: "Jawa" },
  { name: "Semarang", lat: -6.9667, lon: 110.4167, region: "Jawa" },
  { name: "Yogyakarta", lat: -7.7956, lon: 110.3695, region: "Jawa" },
  { name: "Surabaya", lat: -7.2575, lon: 112.7521, region: "Jawa" },
  { name: "Malang", lat: -7.9666, lon: 112.6326, region: "Jawa" },

  // --- Kalimantan -----------------------------------------------------
  { name: "Pontianak", lat: -0.0263, lon: 109.3425, region: "Kalimantan" },
  { name: "Palangkaraya", lat: -2.2096, lon: 113.9213, region: "Kalimantan" },
  { name: "Banjarmasin", lat: -3.3186, lon: 114.5944, region: "Kalimantan" },
  { name: "Samarinda", lat: -0.5022, lon: 117.1536, region: "Kalimantan" },
  { name: "Balikpapan", lat: -1.2379, lon: 116.8529, region: "Kalimantan" },
  { name: "Tanjung Selor", lat: 2.8386, lon: 117.3617, region: "Kalimantan" },

  // --- Sulawesi -------------------------------------------------------
  { name: "Manado", lat: 1.4748, lon: 124.8421, region: "Sulawesi" },
  { name: "Gorontalo", lat: 0.5412, lon: 123.0595, region: "Sulawesi" },
  { name: "Palu", lat: -0.8917, lon: 119.8707, region: "Sulawesi" },
  { name: "Mamuju", lat: -2.6785, lon: 118.8886, region: "Sulawesi" },
  { name: "Makassar", lat: -5.1477, lon: 119.4327, region: "Sulawesi" },
  { name: "Kendari", lat: -3.9985, lon: 122.5127, region: "Sulawesi" },

  // --- Bali & Nusa Tenggara --------------------------------------------
  { name: "Denpasar", lat: -8.6705, lon: 115.2126, region: "Bali & Nusa Tenggara" },
  { name: "Mataram", lat: -8.5833, lon: 116.1167, region: "Bali & Nusa Tenggara" },
  { name: "Kupang", lat: -10.1772, lon: 123.607, region: "Bali & Nusa Tenggara" },

  // --- Maluku & Papua -------------------------------------------------
  { name: "Ambon", lat: -3.6954, lon: 128.1814, region: "Maluku & Papua" },
  { name: "Ternate", lat: 0.7909, lon: 127.3844, region: "Maluku & Papua" },
  { name: "Manokwari", lat: -0.8615, lon: 134.0621, region: "Maluku & Papua" },
  { name: "Sorong", lat: -0.8763, lon: 131.2558, region: "Maluku & Papua" },
  { name: "Nabire", lat: -3.3667, lon: 135.4833, region: "Maluku & Papua" },
  { name: "Jayapura", lat: -2.5337, lon: 140.7181, region: "Maluku & Papua" },
  { name: "Wamena", lat: -4.0847, lon: 138.9455, region: "Maluku & Papua" },
  { name: "Merauke", lat: -8.4672, lon: 140.4023, region: "Maluku & Papua" },
];

export const DEFAULT_CITY = INDONESIAN_CITIES.find((c) => c.name === "Jakarta")!;

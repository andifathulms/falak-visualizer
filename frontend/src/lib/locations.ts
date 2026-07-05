export interface CityLocation {
  name: string;
  lat: number;
  lon: number;
}

// Provincial capitals / major cities, covering the Indonesian archipelago
// so users can pick their city instead of typing coordinates by hand.
export const INDONESIAN_CITIES: CityLocation[] = [
  { name: "Jakarta", lat: -6.2, lon: 106.8167 },
  { name: "Bandung", lat: -6.9175, lon: 107.6191 },
  { name: "Semarang", lat: -6.9667, lon: 110.4167 },
  { name: "Yogyakarta", lat: -7.7956, lon: 110.3695 },
  { name: "Surabaya", lat: -7.2575, lon: 112.7521 },
  { name: "Malang", lat: -7.9666, lon: 112.6326 },
  { name: "Denpasar", lat: -8.6705, lon: 115.2126 },
  { name: "Mataram", lat: -8.5833, lon: 116.1167 },
  { name: "Kupang", lat: -10.1772, lon: 123.607 },
  { name: "Pontianak", lat: -0.0263, lon: 109.3425 },
  { name: "Banjarmasin", lat: -3.3186, lon: 114.5944 },
  { name: "Samarinda", lat: -0.5022, lon: 117.1536 },
  { name: "Balikpapan", lat: -1.2379, lon: 116.8529 },
  { name: "Makassar", lat: -5.1477, lon: 119.4327 },
  { name: "Manado", lat: 1.4748, lon: 124.8421 },
  { name: "Palu", lat: -0.8917, lon: 119.8707 },
  { name: "Kendari", lat: -3.9985, lon: 122.5127 },
  { name: "Ambon", lat: -3.6954, lon: 128.1814 },
  { name: "Ternate", lat: 0.7909, lon: 127.3844 },
  { name: "Jayapura", lat: -2.5337, lon: 140.7181 },
  { name: "Medan", lat: 3.5952, lon: 98.6722 },
  { name: "Banda Aceh", lat: 5.5483, lon: 95.3238 },
  { name: "Padang", lat: -0.9471, lon: 100.4172 },
  { name: "Pekanbaru", lat: 0.5071, lon: 101.4478 },
  { name: "Jambi", lat: -1.6101, lon: 103.6131 },
  { name: "Palembang", lat: -2.9761, lon: 104.7754 },
  { name: "Bengkulu", lat: -3.7928, lon: 102.2608 },
  { name: "Bandar Lampung", lat: -5.4292, lon: 105.2611 },
  { name: "Batam", lat: 1.0456, lon: 104.0305 },
];

export const DEFAULT_CITY = INDONESIAN_CITIES[0];

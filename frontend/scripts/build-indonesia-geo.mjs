/**
 * Extract the Indonesian archipelago (and its visible neighbours) from Natural
 * Earth, as a small GeoJSON file committed to the repo.
 *
 * Run once, commit the output:
 *
 *     node scripts/build-indonesia-geo.mjs
 *
 * Why bake it in rather than fetch it
 * -----------------------------------
 * The whole point of moving off the backend was that the app depends on nothing
 * at runtime. Pulling a TopoJSON from a CDN when the map page loads would put an
 * external dependency straight back into the request path, and the map would
 * break the day that host does. `world-atlas` is a build-time dependency only.
 *
 * Size is the reason for the two reductions below. The full 50m country set is
 * 739KB, which is absurd to ship for one map:
 *
 *   1. Rings whose bounding box misses the viewport are dropped. The map draws a
 *      fixed lat/lon window, so a ring that cannot appear in it contributes
 *      nothing - this is a rendering no-op, not a simplification. (A ring that
 *      *encloses* the viewport still intersects it, so it survives.)
 *   2. Coordinates are rounded to 3 decimal places, about 100m at the equator.
 *      The map is 640px wide across 46 degrees of longitude, so one pixel is
 *      ~8km; 100m is two orders of magnitude finer than anything visible.
 *
 * Data: Natural Earth via the world-atlas package. Natural Earth is public
 * domain (https://www.naturalearthdata.com/about/terms-of-use/).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { feature } from "topojson-client";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT = resolve(HERE, "../src/lib/geo/indonesia.geo.json");

// Must match LAT_RANGE / LON_RANGE in the visibility-map page. A small margin
// keeps coastlines that run just off-screen from being clipped mid-stroke.
const VIEW = { lonMin: 95, lonMax: 141, latMin: -11, latMax: 6 };
const MARGIN = 2;

const BOX = {
  lonMin: VIEW.lonMin - MARGIN,
  lonMax: VIEW.lonMax + MARGIN,
  latMin: VIEW.latMin - MARGIN,
  latMax: VIEW.latMax + MARGIN,
};

const INDONESIA_ID = "360"; // ISO 3166-1 numeric

const world = JSON.parse(
  readFileSync(resolve(HERE, "../node_modules/world-atlas/countries-50m.json"), "utf8"),
);
const countries = feature(world, world.objects.countries);

function ringIntersectsBox(ring) {
  let lonMin = Infinity;
  let lonMax = -Infinity;
  let latMin = Infinity;
  let latMax = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < lonMin) lonMin = lon;
    if (lon > lonMax) lonMax = lon;
    if (lat < latMin) latMin = lat;
    if (lat > latMax) latMax = lat;
  }
  return (
    lonMax >= BOX.lonMin && lonMin <= BOX.lonMax && latMax >= BOX.latMin && latMin <= BOX.latMax
  );
}

const round = (value) => Math.round(value * 1000) / 1000;

/** Keep only the rings that can appear in the viewport, at reduced precision. */
function reducePolygons(geometry) {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  const kept = [];
  for (const polygon of polygons) {
    // A polygon's outer ring decides whether the shape is visible at all; if it
    // is dropped, its holes go with it.
    const [outer, ...holes] = polygon;
    if (!ringIntersectsBox(outer)) continue;
    kept.push(
      [outer, ...holes].map((ring) => ring.map(([lon, lat]) => [round(lon), round(lat)])),
    );
  }
  return kept;
}

const indonesia = [];
const neighbours = [];

for (const country of countries.features) {
  if (country.geometry === null) continue;
  const polygons = reducePolygons(country.geometry);
  if (polygons.length === 0) continue;
  (String(country.id) === INDONESIA_ID ? indonesia : neighbours).push(...polygons);
}

if (indonesia.length === 0) {
  throw new Error(`no polygons found for country id ${INDONESIA_ID} - did the dataset change?`);
}

const output = {
  type: "FeatureCollection",
  // Recorded so the map page can assert it is drawing geometry built for the
  // window it actually renders, rather than silently misaligning.
  view: VIEW,
  source: "Natural Earth 1:50m via world-atlas (public domain)",
  features: [
    {
      type: "Feature",
      properties: { name: "Indonesia", role: "focus" },
      geometry: { type: "MultiPolygon", coordinates: indonesia },
    },
    {
      type: "Feature",
      properties: { name: "Neighbouring land", role: "context" },
      geometry: { type: "MultiPolygon", coordinates: neighbours },
    },
  ],
};

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(output)}\n`);

const bytes = readFileSync(OUTPUT).length;
console.log(
  `wrote ${OUTPUT.replace(resolve(HERE, ".."), "frontend")} ` +
    `(${(bytes / 1024).toFixed(0)}KB, ${indonesia.length} Indonesian polygons, ` +
    `${neighbours.length} neighbouring)`,
);

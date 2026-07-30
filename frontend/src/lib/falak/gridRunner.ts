/**
 * Fans the visibility grid out across Web Workers and reassembles the result.
 *
 * One grid is ~3,255 hilal observations, each of which brackets and bisects both
 * a sunset and a moonset. That is a few seconds of arithmetic on a laptop and
 * appreciably more on a phone - far too much for the main thread, which is why
 * the Django version pushed it to Celery. Here the equivalent move is sharding
 * across cores, with a chunked main-thread fallback for the case where Workers
 * are unavailable (older browsers, or a bundling failure).
 */
import { GRID_POINT_COUNT, computeGridSlice, type GridPoint } from "./grid";
import type { GridWorkerMessage } from "./grid.worker";
import { parsePlainDate } from "./time";
import type { HilalMethod } from "./visibility";

export interface GridProgress {
  completed: number;
  total: number;
}

export interface VisibilityGrid {
  points: GridPoint[];
  failed: number;
  /** How the work actually ran, so the UI can be honest about a slow fallback. */
  mode: "workers" | "main-thread";
}

/**
 * Leave a core for the UI, and cap the fan-out: past a handful of shards the
 * startup cost of each worker outweighs what it saves.
 */
function shardCount(): number {
  const cores = typeof navigator === "undefined" ? 4 : (navigator.hardwareConcurrency ?? 4);
  return Math.max(1, Math.min(8, cores - 1));
}

function sliceBounds(shards: number): Array<[number, number]> {
  const perShard = Math.ceil(GRID_POINT_COUNT / shards);
  const bounds: Array<[number, number]> = [];
  for (let from = 0; from < GRID_POINT_COUNT; from += perShard) {
    bounds.push([from, Math.min(from + perShard, GRID_POINT_COUNT)]);
  }
  return bounds;
}

function workersAvailable(): boolean {
  return typeof window !== "undefined" && typeof Worker !== "undefined";
}

async function runOnMainThread(
  dateIso: string,
  method: HilalMethod,
  onProgress?: (progress: GridProgress) => void,
): Promise<VisibilityGrid> {
  const date = parsePlainDate(dateIso);
  const points: GridPoint[] = [];
  let failed = 0;

  // Yield between chunks so the browser can still paint and handle input; the
  // total work is unchanged, it just stops freezing the tab.
  const chunk = 32;
  for (let from = 0; from < GRID_POINT_COUNT; from += chunk) {
    const result = computeGridSlice(date, method, from, from + chunk);
    points.push(...result.points);
    failed += result.failed;
    onProgress?.({ completed: Math.min(from + chunk, GRID_POINT_COUNT), total: GRID_POINT_COUNT });
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return { points, failed, mode: "main-thread" };
}

function runShard(
  bounds: [number, number],
  dateIso: string,
  method: HilalMethod,
  onShardProgress: (completed: number) => void,
): Promise<{ points: GridPoint[]; failed: number }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./grid.worker.ts", import.meta.url), { type: "module" });

    const finish = (settle: () => void) => {
      worker.terminate();
      settle();
    };

    worker.onmessage = (event: MessageEvent<GridWorkerMessage>) => {
      const message = event.data;
      if (message.type === "progress") {
        onShardProgress(message.completed);
        return;
      }
      if (message.type === "error") {
        finish(() => reject(new Error(message.message)));
        return;
      }
      finish(() => resolve(message.result));
    };

    worker.onerror = (event) => {
      finish(() => reject(new Error(event.message || "visibility grid worker failed")));
    };

    worker.postMessage({ dateIso, method, from: bounds[0], to: bounds[1] });
  });
}

/**
 * Compute the whole Indonesia visibility grid for a date and method.
 *
 * Resolves only when every point is done - there is no "computing" state to poll
 * the way the Celery-backed endpoint had, because the work happens here.
 */
export async function computeVisibilityGrid(
  dateIso: string,
  method: HilalMethod,
  onProgress?: (progress: GridProgress) => void,
): Promise<VisibilityGrid> {
  if (!workersAvailable()) {
    return runOnMainThread(dateIso, method, onProgress);
  }

  const bounds = sliceBounds(shardCount());
  const completedPerShard = new Array<number>(bounds.length).fill(0);

  const report = () => {
    if (onProgress === undefined) return;
    const completed = completedPerShard.reduce((sum, value) => sum + value, 0);
    onProgress({ completed: Math.min(completed, GRID_POINT_COUNT), total: GRID_POINT_COUNT });
  };

  try {
    const results = await Promise.all(
      bounds.map((bound, shard) =>
        runShard(bound, dateIso, method, (completed) => {
          completedPerShard[shard] = completed;
          report();
        }),
      ),
    );

    return {
      // Shards cover contiguous index ranges in order, so concatenating them
      // restores the grid's original ordering.
      points: results.flatMap((result) => result.points),
      failed: results.reduce((sum, result) => sum + result.failed, 0),
      mode: "workers",
    };
  } catch {
    // A worker that fails to spawn or throws mid-run is a bundling/environment
    // problem, not a calculation one - retry the same maths inline rather than
    // showing the user an empty map.
    return runOnMainThread(dateIso, method, onProgress);
  }
}

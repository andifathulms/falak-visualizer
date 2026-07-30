/**
 * Web Worker entry point for one shard of the visibility grid.
 *
 * Each worker owns a contiguous index range of gridCoordinates() and knows
 * nothing about the others; gridRunner.ts fans the ranges out and reassembles
 * the results.
 */
import { runGridSliceRequest, type GridSliceRequest, type GridSliceResult } from "./grid";

export type GridWorkerMessage =
  | { type: "progress"; completed: number }
  | { type: "done"; result: GridSliceResult }
  | { type: "error"; message: string };

self.onmessage = (event: MessageEvent<GridSliceRequest>) => {
  try {
    const result = runGridSliceRequest(event.data, (completed) => {
      self.postMessage({ type: "progress", completed } satisfies GridWorkerMessage);
    });
    self.postMessage({ type: "done", result } satisfies GridWorkerMessage);
  } catch (error) {
    // Surface the failure rather than posting an empty grid, which the map would
    // render as "not visible anywhere" - a wrong answer dressed as a real one.
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    } satisfies GridWorkerMessage);
  }
};

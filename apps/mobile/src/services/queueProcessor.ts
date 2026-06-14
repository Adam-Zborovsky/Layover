import { getQueue, removeFromQueue } from "./offlineQueue";
import { uploadReceipt } from "../api/client";

let processing = false;

export async function processQueue(): Promise<number> {
  if (processing) return 0;
  processing = true;

  try {
    const queue = await getQueue();
    let processed = 0;

    for (const item of queue) {
      try {
        await uploadReceipt(item.imageBase64, item.mimeType, item.tripId);
        await removeFromQueue(item.id);
        processed++;
      } catch (err) {
        console.warn("Failed to upload queued item:", item.id, err);
      }
    }

    return processed;
  } finally {
    processing = false;
  }
}

import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "offline_queue";
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

interface QueuedItem {
  id: string;
  imageBase64: string;
  mimeType: string;
  tripId?: string;
  createdAt: string;
}

export interface AddToQueueResult {
  queued: boolean;
  warning?: string;
}

export async function getQueue(): Promise<QueuedItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addToQueue(item: Omit<QueuedItem, "createdAt">): Promise<AddToQueueResult> {
  const imageSizeBytes = item.imageBase64.length;
  if (imageSizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return {
      queued: false,
      warning: `Image is too large (${(imageSizeBytes / (1024 * 1024)).toFixed(1)}MB). Maximum is 10MB.`,
    };
  }

  const queue = await getQueue();
  queue.push({ ...item, createdAt: new Date().toISOString() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

  if (imageSizeBytes > MAX_IMAGE_SIZE_BYTES * 0.8) {
    return {
      queued: true,
      warning: `Image is large (${(imageSizeBytes / (1024 * 1024)).toFixed(1)}MB). May fail on slow connections.`,
    };
  }

  return { queued: true };
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((i) => i.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function getQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "offline_queue";

interface QueuedItem {
  id: string;
  imageBase64: string;
  mimeType: string;
  tripId?: string;
  createdAt: string;
}

export async function getQueue(): Promise<QueuedItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addToQueue(item: Omit<QueuedItem, "createdAt">): Promise<void> {
  const queue = await getQueue();
  queue.push({ ...item, createdAt: new Date().toISOString() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
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

import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "layover:collapsedTrips";

export function useCollapsedTrips() {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const ids: string[] = JSON.parse(raw);
          setCollapsedIds(new Set(ids));
        }
      } catch {
        // Corrupt or missing storage — fall back to all-expanded.
      } finally {
        setIsLoaded(true);
      }
    }
    load();
  }, []);

  const toggle = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next))).catch(() => {});
      return next;
    });
  }, []);

  return { collapsedIds, isLoaded, toggle };
}

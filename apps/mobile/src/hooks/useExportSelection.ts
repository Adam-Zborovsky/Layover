import { useMemo, useRef, useState } from "react";
import type { ReceiptListItem } from "@recipts/shared";

export function useExportSelection(receipts: ReceiptListItem[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const tripSnapshot = useRef<Set<string> | null>(null);

  const filteredReceipts = useMemo(() => {
    if (!activeTripId) return receipts;
    return (receipts || []).filter((r) => r.tripId === activeTripId);
  }, [receipts, activeTripId]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === filteredReceipts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredReceipts.map((r) => r.id)));
    }
  }

  function selectTrip(tripId: string) {
    if (activeTripId === tripId) {
      setSelected(tripSnapshot.current ?? new Set());
      tripSnapshot.current = null;
      setActiveTripId(null);
      return;
    }

    const tripReceiptIds = receipts.filter((r) => r.tripId === tripId).map((r) => r.id);
    tripSnapshot.current = new Set(
      [...selected].filter((id) => tripReceiptIds.includes(id))
    );
    setSelected(new Set(tripReceiptIds));
    setActiveTripId(tripId);
  }

  function clearTripFilter() {
    tripSnapshot.current = null;
    setActiveTripId(null);
  }

  return {
    selected,
    activeTripId,
    filteredReceipts,
    toggleSelect,
    selectAll,
    selectTrip,
    clearTripFilter,
  };
}

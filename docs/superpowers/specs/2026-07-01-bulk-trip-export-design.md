# Bulk trip export selection

## Problem

`ExportScreen` (`apps/mobile/src/screens/ExportScreen.tsx`) lets users select receipts to export via per-item checkboxes, a horizontal trip filter chip row, and a "Select All" button that only acts on the currently-filtered list. Selecting an entire trip today takes two taps (filter by trip, then Select All). Users want one tap.

## Behavior

Tapping a trip chip both filters the list to that trip (existing behavior, unchanged) and selects all of that trip's receipts:

- **First tap on trip X** (X not already active): snapshot = current `selected` intersected with trip X's receipts (selections outside trip X are discarded, not remembered). Then `selected` is set to *all* of trip X's receipts, and X becomes the active chip.
- **Second tap on trip X** (X already active, i.e. toggle-off): `selected` is restored to the snapshot taken on the first tap; X is deactivated.
- **Tapping "All"** (the no-filter chip) or a *different* trip chip while X is active: clears the filter/selects the new trip per the same rule above; does not restore X's snapshot. Only re-tapping the *same* chip restores its snapshot.
- The header "Select All / Deselect All" button and individual receipt checkboxes are unchanged — they operate on `selected` and `filteredReceipts` exactly as today.

No network calls or persistence are involved; this is local UI state only.

## Implementation

Extract a new hook, `apps/mobile/src/hooks/useExportSelection.ts`, taking `receipts: ReceiptListItem[]` and owning:

- `selected: Set<string>`
- `activeTripId: string | null`
- `filteredReceipts: ReceiptListItem[]` (derived, moved out of `ExportScreen`'s `useMemo`)
- `toggleSelect(id: string)` — unchanged from today
- `selectAll()` — unchanged from today (toggles select/deselect of `filteredReceipts`)
- `selectTrip(tripId: string)` — new, implements the snapshot/restore rule above
- `clearTripFilter()` — for the "All" chip: clears `activeTripId` without touching `selected`, and drops any pending snapshot

`ExportScreen.tsx` calls the hook instead of holding this state itself; the trip chip's `onPress` calls `selectTrip(t.id)` and the "All" chip's `onPress` calls `clearTripFilter()`.

## Testing

No test harness exists anywhere in `apps/mobile` (no jest config, no `*.test.ts` files). This feature will be verified manually, consistent with the rest of the app. The hook is a pure function of `receipts` with no external dependencies, so it can be unit-tested later if a harness is introduced.

## Out of scope

- The settings-not-applied bugs (`aiModel`, `namingTemplate`, `defaultCurrency` never read by the export/capture code paths) are tracked separately and not part of this change.

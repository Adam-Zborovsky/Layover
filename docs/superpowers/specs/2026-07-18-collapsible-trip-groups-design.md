# Collapsible trip groups on Home screen

## Problem

The Home screen (`apps/mobile/src/screens/HomeScreen.tsx`) shows every receipt in one flat list, regardless of which trip it belongs to. Once a trip ends, its receipts stay mixed in with the next trip's, making the list noisy and hard to scan. The user wants receipts grouped by trip, with the ability to collapse a trip's group so its receipts stop cluttering the view — and that collapsed/expanded choice must persist across app restarts.

## Data already available

- `ReceiptListItem.tripId: string | null` (`packages/shared/src/types.ts`) — every receipt already carries its trip association (or `null` for untagged).
- `fetchTrips()` (`apps/mobile/src/api/client.ts`) hits `GET /trips` and returns per-trip `{ id, name, startDate, endDate, receiptCount, totalAmount, currency }` (see `TripsScreen.tsx` usage).
- `@react-native-async-storage/async-storage` is already a dependency, used elsewhere for local device storage.

No server or shared-package changes are needed — this is a client-side presentation and persistence change on Home only.

## Design

### Grouping

Replace `HomeScreen`'s flat `FlatList` with a `SectionList`. Sections are built client-side by joining the loaded receipts against the loaded trips:

- One section per trip that has at least one loaded receipt, keyed by trip id.
- One additional section for receipts with `tripId === null`, keyed by a fixed sentinel id (`"__untagged__"`), labeled "No trip".
- Section order: **"No trip" first**, then trips **newest first by `startDate`**.
- Trips fetched via `fetchTrips()` in parallel with `fetchReceipts()` inside the existing `load()` callback.

Existing header UI (title, search bar, filter chips) is unchanged and sits above the `SectionList` — search and status filters keep working against the full receipt set; grouping is applied to whatever set is currently loaded.

### Section header (collapsible)

A new `TripSectionHeader` component, tappable, rendered as the `SectionList`'s `renderSectionHeader`:

- Left: trip name and date range (e.g. `JFK→LHR June · Jun 3 — Jun 9`), or "No trip" for the untagged section (no date range shown).
- Right: receipt count and summed total for that section, computed from the currently loaded receipts in that group (consistent with how the existing subtitle already sums the loaded page).
- A chevron icon: pointing down when expanded, pointing right (rotated) when collapsed.
- Tapping toggles collapse state for that section id via the persistence hook below.

When a section is collapsed, `renderItem` for that section's rows is suppressed (return `null` / filter the section's `data` to `[]` for `SectionList` rendering) — the header remains visible and tappable so the group can be reopened.

### Persistence

New hook `useCollapsedTrips` (`apps/mobile/src/hooks/useCollapsedTrips.ts`):

- Backed by a single AsyncStorage key: `layover:collapsedTrips`, storing a JSON array of collapsed section ids (trip ids and/or `"__untagged__"`).
- Loads once on mount; exposes `{ collapsedIds: Set<string>, isLoaded: boolean, toggle(id: string): void }`.
- `toggle` flips membership in the set, updates state, and writes the full set back to AsyncStorage immediately (fire-and-forget write, no debounce needed given the small payload size).
- Sections not present in `collapsedIds` default to **expanded** — a new trip (never seen before) always opens expanded; a section the user explicitly collapsed stays collapsed until they tap it again, including after an app restart.
- Local to the device only — not synced to the server (per user's choice).

### Files touched

- `apps/mobile/src/screens/HomeScreen.tsx` — fetch trips, build sections, swap `FlatList` → `SectionList`, wire up collapse toggling.
- `apps/mobile/src/hooks/useCollapsedTrips.ts` (new) — AsyncStorage-backed collapse state.
- `apps/mobile/src/components/TripSectionHeader.tsx` (new) — the header row UI described above.

### Out of scope

- `ReceiptCard`, the Trips tab, and all server/API code are untouched.
- No cross-device sync of collapse state.
- No change to what receipts are fetched (still governed by existing search/filter/pagination); grouping only reorganizes what's already loaded.

## Edge cases

- Zero receipts in a trip's group after filtering (e.g. status filter excludes all of them): section is omitted entirely rather than shown empty, matching existing "no results" empty-state handling for the overall list.
- Trip fetch fails while receipt fetch succeeds: fall back to a single "No trip" section-less flat behavior is avoided — instead, treat all receipts as members of an "Unknown trip" bucket per their `tripId` without a friendly name, so nothing silently disappears. (Low likelihood: trips and receipts are fetched from the same authenticated server in one `load()` call.)
- All receipts untagged (no trips created yet): a single "No trip" section, functionally identical to today's flat list.

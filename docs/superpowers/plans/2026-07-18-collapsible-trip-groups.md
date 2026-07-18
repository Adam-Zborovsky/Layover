# Collapsible Trip Groups on Home Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group the Home screen's receipt list by trip, newest trip first, with a "No trip" group for untagged receipts, and let the user collapse/expand each group with the choice persisted on-device across restarts.

**Architecture:** `HomeScreen` fetches trips (via existing `fetchTrips()`) alongside receipts, joins them client-side into `SectionList` sections, and renders a new tappable `TripSectionHeader` per section. Collapse state lives in a new `useCollapsedTrips` hook backed by a single AsyncStorage key; collapsed sections render zero rows but keep a visible, tappable header.

**Tech Stack:** React Native (Expo 56), TypeScript, `@react-native-async-storage/async-storage` (already a dependency), `SectionList` from `react-native` (already a dependency, unused elsewhere in this app so far).

## Global Constraints

- No server, shared-package, or Trips-tab changes — this is Home-screen-only, per the spec's "Out of scope" section.
- Collapse state is local-device only (AsyncStorage), not synced to the server.
- Section order: "No trip" first, then trips newest-first by `startDate`.
- A trip/section never seen before defaults to **expanded**.
- This project has no test framework installed in `apps/mobile` (no Jest, no test files exist anywhere in the app). Verification for each task uses `npx tsc --noEmit` (TypeScript project already configured via `apps/mobile/tsconfig.json`) plus manual verification in the running app — do not add a test framework as a side effect of this feature.
- Follow existing code style in this app: function components, `StyleSheet.create` at the bottom of the file, `colors`/`typography`/`spacing`/`radii` from `../ui/theme`, `Ionicons` for icons.

---

### Task 1: `useCollapsedTrips` hook

**Files:**
- Create: `apps/mobile/src/hooks/useCollapsedTrips.ts`

**Interfaces:**
- Consumes: `AsyncStorage` from `@react-native-async-storage/async-storage` (`getItem`, `setItem`).
- Produces: `useCollapsedTrips(): { collapsedIds: Set<string>; isLoaded: boolean; toggle: (id: string) => void }`. Later tasks (Task 3) call `toggle(sectionId)` and read `collapsedIds.has(sectionId)`.

- [ ] **Step 1: Write the hook**

```typescript
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
```

- [ ] **Step 2: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors referencing `useCollapsedTrips.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/hooks/useCollapsedTrips.ts
git commit -m "feat(mobile): add useCollapsedTrips hook for persisting trip collapse state"
```

---

### Task 2: `TripSectionHeader` component

**Files:**
- Create: `apps/mobile/src/components/TripSectionHeader.tsx`

**Interfaces:**
- Consumes: `colors`, `typography`, `spacing`, `radii` from `../ui/theme`; `Ionicons` from `@expo/vector-icons`; `formatCurrency` from `../utils/format`.
- Produces: `TripSectionHeader` React component with props:
  ```typescript
  interface TripSectionHeaderProps {
    title: string;
    dateRange: string | null;
    receiptCount: number;
    totalAmount: number;
    currency: string;
    collapsed: boolean;
    onToggle: () => void;
  }
  ```
  Task 3 renders `<TripSectionHeader title={...} dateRange={...} receiptCount={...} totalAmount={...} currency={...} collapsed={...} onToggle={...} />` as `SectionList`'s `renderSectionHeader`.

- [ ] **Step 1: Write the component**

```tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, radii } from "../ui/theme";
import { formatCurrency } from "../utils/format";

interface TripSectionHeaderProps {
  title: string;
  dateRange: string | null;
  receiptCount: number;
  totalAmount: number;
  currency: string;
  collapsed: boolean;
  onToggle: () => void;
}

export function TripSectionHeader({
  title,
  dateRange,
  receiptCount,
  totalAmount,
  currency,
  collapsed,
  onToggle,
}: TripSectionHeaderProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityLabel={`${title}, ${receiptCount} receipt${receiptCount !== 1 ? "s" : ""}, ${collapsed ? "collapsed" : "expanded"}`}
      accessibilityRole="button"
    >
      <Ionicons
        name={collapsed ? "chevron-forward" : "chevron-down"}
        size={16}
        color={colors.textSecondary}
        style={styles.chevron}
      />
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {dateRange ? <Text style={styles.dateRange}>{dateRange}</Text> : null}
      </View>
      <View style={styles.metaCol}>
        <Text style={styles.total}>{formatCurrency(totalAmount, currency)}</Text>
        <Text style={styles.count}>
          {receiptCount} receipt{receiptCount !== 1 ? "s" : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chevron: {
    marginRight: spacing.sm,
  },
  textCol: {
    flex: 1,
  },
  title: {
    ...typography.labelMd,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  dateRange: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginTop: 1,
  },
  metaCol: {
    alignItems: "flex-end",
  },
  total: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: "700",
  },
  count: {
    ...typography.bodySm,
    color: colors.textTertiary,
    marginTop: 1,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors referencing `TripSectionHeader.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/src/components/TripSectionHeader.tsx
git commit -m "feat(mobile): add TripSectionHeader collapsible section header component"
```

---

### Task 3: Wire sections + collapsing into `HomeScreen`

**Files:**
- Modify: `apps/mobile/src/screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `useCollapsedTrips()` from Task 1 (`{ collapsedIds, toggle }`); `TripSectionHeader` from Task 2; `fetchTrips` from `../api/client` (already exported, returns `Promise<unknown>` — cast to a local `TripSummary[]` type as `TripsScreen.tsx` already does); existing `fetchReceipts`, `ReceiptCard`, theme tokens.
- Produces: `HomeScreen` continues to export the same `HomeScreen({ navigation })` signature used by `AppNavigator.tsx` — no signature change, so no other file needs updating.

This task replaces the `FlatList` in `HomeScreen.tsx` with a `SectionList`, built from the receipts already fetched by `load()` plus a parallel trips fetch.

- [ ] **Step 1: Add trip state and fetch trips alongside receipts**

In `apps/mobile/src/screens/HomeScreen.tsx`, update imports (replace the `FlatList` import with `SectionList`, add the new hook/component/helper imports):

```typescript
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { ReceiptCard } from "../components/ReceiptCard";
import { TripSectionHeader } from "../components/TripSectionHeader";
import { fetchReceipts, fetchTrips } from "../api/client";
import { getAuthToken } from "../api/auth";
import { processQueue } from "../services/queueProcessor";
import { useCollapsedTrips } from "../hooks/useCollapsedTrips";
import { colors, typography, spacing, radii } from "../ui/theme";
import type { PaginatedResponse, ReceiptListItem } from "@recipts/shared";
```

Add a local trip-summary type near the top of the file, right after the imports (mirrors the shape `TripsScreen.tsx` already casts `fetchTrips()` to):

```typescript
interface TripSummary {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

const UNTAGGED_SECTION_ID = "__untagged__";
```

Inside `HomeScreen`, add trip state next to the existing `receipts` state:

```typescript
const [trips, setTrips] = useState<TripSummary[]>([]);
```

Update `load()` to fetch trips in parallel with receipts. Replace the body of the `try` block:

```typescript
    try {
      setError(null);
      const params: Record<string, string | number | boolean | undefined> = {
        page: 1,
        pageSize: 100,
      };
      if (searchRef.current) params.search = searchRef.current;
      if (activeFilter === "needs_review") params.needsReview = true;
      else if (activeFilter) params.status = activeFilter;

      const [data, tripsData] = await Promise.all([
        fetchReceipts(params) as Promise<PaginatedResponse<ReceiptListItem>>,
        fetchTrips() as Promise<TripSummary[]>,
      ]);
      setReceipts(data.items);
      setTrips(Array.isArray(tripsData) ? tripsData : []);
    } catch (err: any) {
      setError(err.message || "Failed to load receipts");
    } finally {
      setIsLoading(false);
    }
```

(If the trips request fails while the receipts request succeeds, `Promise.all` rejects and the existing catch block surfaces the error via the existing error UI — acceptable per spec: no receipts silently disappear, the user sees the retry screen instead of a mis-grouped list. This matches existing error-handling style in this file.)

- [ ] **Step 2: Type-check after Step 1**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no new errors (the file won't fully compile until later steps replace `FlatList` usage — if `tsc` complains about unused `SectionList` import or missing section-building code, that's expected at this point; skip full verification until Step 5).

- [ ] **Step 3: Build sections from receipts + trips**

Add the collapsed-state hook call and a `sections` builder, placed after the existing `totalAmount`/`totalCurrency` calculation and before the `return (`:

```typescript
  const { collapsedIds, toggle } = useCollapsedTrips();

  const tripsById = new Map(trips.map((t) => [t.id, t]));

  const receiptsByTrip = new Map<string, ReceiptListItem[]>();
  for (const r of receipts || []) {
    const key = r.tripId || UNTAGGED_SECTION_ID;
    const list = receiptsByTrip.get(key) || [];
    list.push(r);
    receiptsByTrip.set(key, list);
  }

  const sortedTripIds = Array.from(receiptsByTrip.keys())
    .filter((id) => id !== UNTAGGED_SECTION_ID)
    .sort((a, b) => {
      const dateA = tripsById.get(a)?.startDate || "";
      const dateB = tripsById.get(b)?.startDate || "";
      return dateB.localeCompare(dateA);
    });

  const orderedSectionIds = receiptsByTrip.has(UNTAGGED_SECTION_ID)
    ? [UNTAGGED_SECTION_ID, ...sortedTripIds]
    : sortedTripIds;

  const sections = orderedSectionIds.map((sectionId) => {
    const sectionReceipts = receiptsByTrip.get(sectionId) || [];
    const isUntagged = sectionId === UNTAGGED_SECTION_ID;
    const trip = isUntagged ? null : tripsById.get(sectionId) || null;
    const isCollapsed = collapsedIds.has(sectionId);
    const sectionTotal = sectionReceipts.reduce((sum, r) => sum + Number(r.total || 0), 0);
    const sectionCurrency = sectionReceipts[0]?.currency || "USD";

    return {
      id: sectionId,
      title: isUntagged ? "No trip" : trip?.name || "Unknown trip",
      dateRange: isUntagged || !trip ? null : `${trip.startDate} — ${trip.endDate}`,
      receiptCount: sectionReceipts.length,
      totalAmount: sectionTotal,
      currency: sectionCurrency,
      collapsed: isCollapsed,
      data: isCollapsed ? [] : sectionReceipts,
    };
  });
```

- [ ] **Step 4: Replace the `FlatList` with `SectionList`**

Replace the existing `<FlatList ... />` block (the one rendering `receipts || []`) with:

```tsx
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <TripSectionHeader
            title={section.title}
            dateRange={section.dateRange}
            receiptCount={section.receiptCount}
            totalAmount={section.totalAmount}
            currency={section.currency}
            collapsed={section.collapsed}
            onToggle={() => toggle(section.id)}
          />
        )}
        renderItem={({ item }) => (
          <ReceiptCard
            id={item.id}
            merchant={item.merchant}
            total={Number(item.total || 0)}
            currency={item.currency}
            category={item.category}
            status={item.status}
            capturedAt={item.capturedAt}
            thumbnailPath=""
            onPress={(id) => navigation.navigate("ReceiptDetail", { id })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={styles.empty}>
              <Ionicons name="warning-outline" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.emptyTitle}>Something went wrong</Text>
              <Text style={styles.emptySubtitle}>{error}</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={retry}
                activeOpacity={0.7}
                accessibilityLabel="Retry loading receipts"
                accessibilityRole="button"
              >
                <Text style={styles.emptyButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : needsSetup ? (
            <View style={styles.empty}>
              <Ionicons name="settings-outline" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.emptyTitle}>Welcome to Layover</Text>
              <Text style={styles.emptySubtitle}>
                Set up your server connection in Settings to start tracking receipts.
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate("Settings")}
                activeOpacity={0.7}
                accessibilityLabel="Open Settings"
                accessibilityRole="button"
              >
                <Text style={styles.emptyButtonText}>Open Settings</Text>
              </TouchableOpacity>
            </View>
          ) : search ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.emptyTitle}>No results found</Text>
              <Text style={styles.emptySubtitle}>
                No receipts match "{search}"
              </Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Ionicons name="camera-outline" size={48} color={colors.textTertiary} style={{ marginBottom: spacing.lg }} />
              <Text style={styles.emptyTitle}>No receipts yet</Text>
              <Text style={styles.emptySubtitle}>
                Capture your first receipt to start tracking expenses
              </Text>
            </View>
          )
        }
      />
```

Note: `SectionList`'s `ListEmptyComponent` only renders when `sections` is empty (i.e., zero receipts loaded at all), same trigger condition as the old `FlatList`'s empty component with `receipts || []`.

- [ ] **Step 5: Type-check the full file**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: no errors. If `tsc` flags the `sections` array's inferred type against `SectionList`'s generic, add an explicit type parameter to the `SectionList` call: `<SectionList<ReceiptListItem, { id: string; title: string; dateRange: string | null; receiptCount: number; totalAmount: number; currency: string; collapsed: boolean }>` — apply this only if `tsc` reports a mismatch; otherwise leave inference as-is.

- [ ] **Step 6: Manual verification**

This app has no automated test runner, and this change touches native list rendering that can't be fully verified by type-checking alone. Tell the user to run the app themselves (per the "no dev servers" constraint) with `! npm run android` or `! npm run ios` from `apps/mobile`, then check:
1. Receipts appear grouped under trip headers, "No trip" section first, other trips newest-first by start date.
2. Tapping a section header collapses it (rows disappear, header stays, chevron flips to point right).
3. Tapping again re-expands it.
4. Force-closing and reopening the app keeps a collapsed section collapsed.
5. Search and status filters still work and still show grouped results.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/src/screens/HomeScreen.tsx
git commit -m "feat(mobile): group Home screen receipts by trip with collapsible sections"
```

---

## Self-Review Notes

- **Spec coverage:** grouping/ordering (Task 3 Steps 1-4), collapsible header UI (Task 2), persistence with expand-by-default for unseen trips (Task 1), untagged section (Task 3 Step 3 `UNTAGGED_SECTION_ID` handling), trip-fetch-failure edge case (Task 3 Step 1 note on `Promise.all` rejection), no server/shared-package/Trips-tab changes (confirmed — only `apps/mobile/src` files touched) — all covered.
- **Placeholder scan:** no TBD/TODO markers; all steps contain complete code.
- **Type consistency:** `TripSummary` (Task 3) matches the fields `TripSectionHeader` (Task 2) actually consumes (`title`, `dateRange`, `receiptCount`, `totalAmount`, `currency`, `collapsed`, `onToggle`); `useCollapsedTrips` (Task 1) return shape (`collapsedIds`, `isLoaded`, `toggle`) matches Task 3's usage (`collapsedIds.has(sectionId)`, `toggle(section.id)`) — `isLoaded` is exposed by the hook but intentionally unused in Task 3, since AsyncStorage read latency is sub-frame and blocking the list render on it isn't warranted; sections always start expanded until the async load resolves, which is a strict subset of "no collapsed sections yet," so it never causes aflash of hidden content.

# Polish & Features Implementation Plan

## Execution Order

1. Item 5 — total bug (correctness, two-line fix)
2. Item 1 — shutter sound (one-liner)
3. Item 2 — non-functional UI removal
4. Item 3 — icon library (mechanical, many files)
5. Item 4 — image storage path (verify + document)
6. Item 6 — trip editing + default trip (most complex)

---

## 1. Remove Capture Sound

**File:** `apps/mobile/src/screens/CaptureScreen.tsx:58`

Pass `shutterSound: false` to `takePictureAsync`:

```ts
const photo = await cameraRef.current.takePictureAsync({
  base64: true,
  quality: 0.8,
  shutterSound: false, // iOS only; Android is OS-controlled
});
```

No install required — native option in expo-camera v56.

---

## 2. Remove Non-Functional UI + Fix Discrepancies

### CaptureScreen — Guide Frame (`apps/mobile/src/screens/CaptureScreen.tsx`)

Remove the entire `guideFrame` View (lines 142–148) and its 4 corner sub-Views (`guideCornerTL/TR/BL/BR`), the `guidanceText`, and all corresponding styles (lines 197–247). The corner-bracket overlay implies the camera crops to that region — it does not. The full frame is always sent to the server.

The flash button shows the same `⚡` icon for both on and off states. This is fixed as part of item 3.

### TripDetailScreen — Dead "Edit" Stub (`apps/mobile/src/screens/TripDetailScreen.tsx:33–39`)

The `headerRight` "Edit" button currently fires `Alert.alert("Edit Trip", "Edit trip coming soon")`. Replace this with real edit functionality as part of item 6.

---

## 3. Replace All Emoji with `@expo/vector-icons` (Ionicons)

`@expo/vector-icons` ships with Expo SDK 56 — no install needed.
Import: `import { Ionicons } from '@expo/vector-icons';`

### Icon Mapping

| Location | Current | Ionicons name (inactive / active) |
|---|---|---|
| Tab: Home | `⌂` | `receipt-outline` / `receipt` |
| Tab: Trips | `✈` | `airplane-outline` / `airplane` |
| Tab: Export | `⇧` | `share-outline` / `share` |
| Tab: Settings | `⚙` | `settings-outline` / `settings` |
| HomeScreen search | `🔍` | `search-outline` |
| HomeScreen FAB | `+` text | `add` (size 28) |
| HomeScreen empty — no receipts | `📷` | `camera-outline` |
| HomeScreen empty — no search results | `🔍` | `search-outline` |
| HomeScreen empty — error | `⚠` | `warning-outline` |
| HomeScreen empty — needs setup | `⚙` | `settings-outline` |
| CaptureScreen permission | `📷` | `camera-outline` |
| CaptureScreen gallery button | `🖼️` | `images-outline` |
| CaptureScreen flash off | `⚡` | `flash-off-outline` |
| CaptureScreen flash on | `⚡` | `flash-outline` |
| ReceiptDetailScreen error | `⚠` | `warning-outline` |
| ReceiptDetailScreen expand | `▼` | `chevron-down` |
| ReceiptDetailScreen collapse | `▲` | `chevron-up` |
| TripsScreen empty | `✈` | `airplane-outline` |
| TripsScreen error | `⚠` | `warning-outline` |
| TripsScreen FAB | `+` text | `add` (size 28) |
| TripDetailScreen FAB | `+` text | `add` (size 28) |
| TripDetailScreen error | `⚠` | `warning-outline` |
| ReceiptCard chevron | `›` | `chevron-forward` |

### Files Touched

- `apps/mobile/src/navigation/AppNavigator.tsx`
- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/src/screens/CaptureScreen.tsx`
- `apps/mobile/src/screens/ReceiptDetailScreen.tsx`
- `apps/mobile/src/screens/TripsScreen.tsx`
- `apps/mobile/src/screens/TripDetailScreen.tsx`
- `apps/mobile/src/components/ReceiptCard.tsx`

---

## 4. Verify Image Storage Path

**Status: No code change needed — runtime verification required.**

Server saves images to `join(process.cwd(), config.uploadDir)` where `uploadDir = process.env.UPLOAD_DIR || "../data/uploads"`. With the default and the server started from `apps/server/`, images land at `apps/data/uploads/` — correct for the monorepo layout.

**Risks:**
1. If the server is containerized, `../data/uploads` must be a mounted Docker volume or images are lost on restart.
2. Thumbnail load failures are silently swallowed in `ReceiptCard.tsx:62`. If thumbnails don't appear, check server logs for storage write errors.

**Recommended action:** Set `UPLOAD_DIR=/absolute/path/to/data/uploads` in the server's `.env` rather than relying on the relative default.

### Gallery-Uploaded Images

**Important:** Images uploaded from the device gallery via `pickFromGallery()` (`CaptureScreen.tsx:65–75`) go through the same `submitReceipt()` path as camera captures and are sent to the server as base64. This works correctly today.

However, verify that the `mimeType` detection on line 83 handles PNG gallery images correctly:

```ts
const mimeType = capturedImage.startsWith("data:image/png") ? "image/png" : "image/jpeg";
```

This is correct for images sourced from `ImagePicker` since `launchImageLibraryAsync` always encodes base64 with a `data:image/...` prefix. If the picked image is a HEIC or WebP from a newer iPhone, the picker converts it to JPEG, so the fallback to `image/jpeg` is safe.

The offline queue (`addToQueue`) also correctly stores gallery-sourced images with their mimeType, so they upload correctly once connectivity is restored.

**One gap to address:** The `quality: 0.8` compression applied by `launchImageLibraryAsync` may reduce accuracy for printed receipts with fine text. Consider bumping to `quality: 1.0` for gallery picks (screenshots of digital receipts are already compressed; camera captures benefit more from compression reduction at the server end).

---

## 5. Fix Total Amount Discrepancy (45.93 vs 44.14)

**Root cause:** `ReceiptDetailScreen.tsx:300`

The detail screen computes total as `subtotal + tax + tip`. For the Uber Eats receipt, Gemini correctly extracted `total = 45.93` which includes delivery and service fees not broken into the three component fields. The computed sum `44.14` is wrong.

### Fix A — Display

Change the Total Amount display from the computed sum to the stored `total` field:

```ts
// Before
${((display.subtotal || 0) + (display.tax || 0) + (display.tip || 0)).toFixed(2)}

// After
${(display.total || 0).toFixed(2)}
```

### Fix B — Edit Form

Add a fourth `Total` input column in the `amountRow` alongside Subtotal/Tax/Tip, pre-filled with `display.total`. This lets users correct the total without touching component fields.

### Fix C — Save Logic (`ReceiptDetailScreen.tsx:88`)

```ts
// Before (wrong — overwrites Gemini total with subtotal+tax+tip sum)
const total = (display.subtotal || 0) + (display.tax || 0) + (display.tip || 0);
await updateReceipt(id, { ...edited, total });

// After
await updateReceipt(id, edited);
// Server keeps existing total if "total" isn't in edited.
// receiptUpdateSchema already has total as optional.
```

---

## 6. Trip Editing + Default Trip

### A. Schema — `packages/shared/src/schemas.ts`

Add `defaultTripId` to `settingsSchema`:

```ts
export const settingsSchema = z.object({
  namingTemplate: z.string().default("YYYY-MM-DD_Merchant_Category_$Total"),
  defaultCurrency: z.string().length(3).default("USD"),
  escalationThreshold: z.coerce.number().min(0).max(1).default(0.6),
  categories: z.array(z.string()).optional(),
  defaultTripId: z.string().uuid().optional(), // NEW
});
```

No Prisma migration needed — `Setting` is already a generic key-value table.

### B. Server — No Changes Needed

The existing PUT `/settings` handler persists any key from the schema. The schema change above is sufficient.

### C. Mobile — TripDetailScreen (`apps/mobile/src/screens/TripDetailScreen.tsx`)

**Edit trip modal:**
- Add state: `editModalVisible`, `editName`, `editStart`, `editEnd`, `editNotes`
- On header "Edit" press: populate from `trip` object, open modal
- Modal UI: same bottom-sheet pattern as TripsScreen's create modal
- On save: call `updateTrip(id, { name, startDate, endDate, notes })`, reload trip, close modal

**Default trip toggle:**
- On mount, fetch settings to get current `defaultTripId`
- Add a bookmark/star button in the header row (Ionicons `bookmark` / `bookmark-outline`)
- Filled = this trip is the current default; outline = not default
- On press: call `updateSettings({ defaultTripId: trip.id })` to set, or `updateSettings({ defaultTripId: null })` to clear if already default

### D. Mobile — TripsScreen (`apps/mobile/src/screens/TripsScreen.tsx`)

Fetch settings alongside trips on mount. Show a small "DEFAULT" chip on the trip card whose `id === defaultTripId`. Use `colors.primary` background, consistent with the existing `receiptBadge` style.

### E. Mobile — CaptureScreen (`apps/mobile/src/screens/CaptureScreen.tsx`)

On mount, load settings to get `defaultTripId`. If no `tripId` came in via `route.params`, use `defaultTripId` as the fallback:

```ts
const effectiveTripId = tripId || defaultTripId;
// Pass effectiveTripId to uploadReceipt and addToQueue instead of tripId
```

Show a subtle pill in the camera overlay (same style as the offline pill) when a default trip is active:
```
"Trip: JFK→LHR June"
```

This makes the auto-assignment visible and avoids silent mis-assignment.

### F. Mobile — SettingsScreen (`apps/mobile/src/screens/SettingsScreen.tsx`)

Add a "Default Trip" row:
- Shows current default trip name (or "None")
- Opens a simple picker modal listing all trips
- On select: calls `updateSettings({ defaultTripId: selectedId })`
- Clear option: sets `defaultTripId` to empty/null

This gives users a central place to manage the default without navigating to each trip.

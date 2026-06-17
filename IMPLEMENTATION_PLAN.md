# Layover Implementation Plan

Consolidated audit findings from 4 sub-agents covering all screens, components, services, navigation, and design fidelity. Prioritized by severity and ordered by dependency.

---

## Phase 1: Ship-Blocking Bugs

These are crashes, dead user flows, and completely non-functional features that make the app unusable for real work.

### 1.1 ReceiptDetailScreen: Trip chips nested inside Text component causes layout crash
- **File:** `apps/mobile/src/screens/ReceiptDetailScreen.tsx:255-267`
- **Severity:** CRITICAL
- **Problem:** When editing trip assignment, a `<View style={styles.chipRow}>` containing `<CategoryChip>` components is nested inside a `<Text>` element. React Native does not support nesting `<View>` inside `<Text>` — this will cause a runtime crash when the user hits Edit.
- **Fix:** Move the chip row out of the `<Text>` wrapper. Restructure so the label and the chip row are siblings in a parent `<View>`.

### 1.2 SettingsScreen: Server URL and Auth Token never initialized from storage
- **File:** `apps/mobile/src/screens/SettingsScreen.tsx:18-19`
- **Severity:** CRITICAL
- **Problem:** `serverUrl` and `authTokenLocal` are initialized to `useState("")` with no loading from AsyncStorage on mount. The `loadSettings()` function only fetches server-side settings (namingTemplate, escalationThreshold, etc.). Users who've configured the app before will see blank fields and may overwrite their stored credentials.
- **Fix:** In `useEffect` (or a dedicated init), call `getBaseUrl()` and `getAuthToken()` from `../api/auth` and populate the state.

### 1.3 SettingsScreen: Save Settings doesn't persist URL/Token locally
- **File:** `apps/mobile/src/screens/SettingsScreen.tsx:35-42`
- **Severity:** CRITICAL
- **Problem:** `handleSave()` only calls `updateSettings()` (server-side settings like namingTemplate/confidenceThreshold). It never calls `setBaseUrl(serverUrl)` or `setAuthToken(authTokenLocal)`, so even if the user types them in, they're never stored in AsyncStorage. Every app restart loses the connection config.
- **Fix:** Add `await setBaseUrl(serverUrl)` and `await setAuthToken(authTokenLocal)` calls in `handleSave()`.

### 1.4 SettingsScreen: Test Connection always tests empty values
- **File:** `apps/mobile/src/screens/SettingsScreen.tsx:44-53`
- **Severity:** CRITICAL
- **Problem:** `handleConnectTest()` temporarily sets baseUrl/token via `setBaseUrl`/`setAuthToken`, but the state values (`serverUrl`, `authTokenLocal`) are empty strings (see 1.2), so `checkHealth()` is always called with blank credentials. The test will always fail unless the user types credentials fresh each session without saving first.
- **Fix:** Depends on 1.2. Once state is initialized from storage, this will work. Also should call `setBaseUrl`/`setAuthToken` with the state values _before_ testing, which it already does.

### 1.5 SettingsScreen: AI model selector completely non-functional
- **File:** `apps/mobile/src/screens/SettingsScreen.tsx:169-179`
- **Severity:** CRITICAL
- **Problem:** The segment control (Gemini 2.5 Flash / Gemini 3.1 Pro) has no `onPress` handlers on either segment. The "Gemini 2.5 Flash" segment is hardcoded with `segmentActive` style. No state tracks the selection. The setting is never read from or written to storage.
- **Fix:** Add `aiModel` state, wire `onPress` to toggle between "gemini-2.5-flash" / "gemini-2.5-pro", style both segments based on active state, load from/persist to server settings.

### 1.6 SettingsScreen: Export Backup button dead
- **File:** `apps/mobile/src/screens/SettingsScreen.tsx:225-227`
- **Severity:** CRITICAL
- **Problem:** The "Export Backup" `TouchableOpacity` has no `onPress` handler — clicking it does nothing.
- **Fix:** Wire it to trigger a full-data export (ZIP of all receipts), or at minimum navigate to ExportScreen.

### 1.7 SettingsScreen: Template variable chips dead
- **File:** `apps/mobile/src/screens/SettingsScreen.tsx:159-163`
- **Severity:** CRITICAL
- **Problem:** Variable chips (`{date}`, `{merchant}`, etc.) are `TouchableOpacity` with no `onPress`. They're purely decorative. Users can't insert variables into the template by tapping.
- **Fix:** Add `onPress` that inserts the variable text at the cursor position in the template TextInput.

### 1.8 ExportScreen: `&amp;` renders as literal text
- **File:** `apps/mobile/src/screens/ExportScreen.tsx:160`
- **Severity:** CRITICAL
- **Problem:** `Export &amp; Share` should be `Export & Share` (or `Export &amp;amp; Share`). In JSX, `&amp;` renders as the literal string `&amp;`, not `&`.
- **Fix:** Change to `Export & Share` (JSX allows bare `&` inside `<Text>`).

### 1.9 HomeScreen: No debounce on search fires API on every keystroke
- **File:** `apps/mobile/src/screens/HomeScreen.tsx:46,96`
- **Severity:** CRITICAL
- **Problem:** `load` is in the `useCallback` dependency array with `[search, activeFilter]`, and `useFocusEffect` calls `load()` whenever it changes. `onChangeText={setSearch}` updates `search` on every keystroke, causing an API call per character.
- **Fix:** Add a 300ms debounce on the search term before it affects the `load` dependency. Use a separate `debouncedSearch` state or a ref + timeout pattern.

### 1.10 HomeScreen: Dead `thumbnailPath` prop always passed as empty string
- **File:** `apps/mobile/src/screens/HomeScreen.tsx:140` and `apps/mobile/src/components/ReceiptCard.tsx:15,38,44`
- **Severity:** CRITICAL
- **Problem:** `ReceiptCard` accepts `thumbnailPath` as a prop but ignores it entirely. It fetches its own thumbnail URL via `getReceiptThumbnailUrl(id)` in a `useEffect`, creating redundant network requests. The caller passes `thumbnailPath=""` as a hardcoded empty string. Meanwhile the server returns `thumbnailPath` in the list response but the client never uses it.
- **Fix (Phase 1 minimal):** Remove the `thumbnailPath` prop from `ReceiptCard` interface since it's unused, or pass the actual `thumbnailPath` from the API response. 
- **Fix (Phase 5):** Use the server-provided thumbnail path to construct the URL instead of a separate fetch.

### 1.11 ReceiptDetailScreen: Payment method row is dead TouchableOpacity
- **File:** `apps/mobile/src/screens/ReceiptDetailScreen.tsx:248-251`
- **Severity:** CRITICAL
- **Problem:** The Payment Method row is a `<TouchableOpacity>` with no `onPress` handler. It should allow editing the payment method when in edit mode.
- **Fix:** Either make it an editable TextInput in edit mode (like the merchant field), or remove `TouchableOpacity` and use a plain `<View>`.

### 1.12 CaptureScreen: "Recent" button is a dead spacer View
- **File:** `apps/mobile/src/screens/CaptureScreen.tsx:145`
- **Severity:** CRITICAL
- **Problem:** `<View style={styles.galleryButton} />` is an empty View placed for visual symmetry with the gallery button. It appears clickable but does nothing.
- **Fix:** Remove it or replace with a functional "Recent Photos" button that opens recent captures from the device gallery.

### 1.13 Cross-cutting: Offline queue processor is never invoked
- **File:** `apps/mobile/src/services/queueProcessor.ts:6` and `apps/mobile/App.tsx:8-19`
- **Severity:** CRITICAL
- **Problem:** `processQueue()` exists but is never called from anywhere. Offline receipts queued via `addToQueue()` will never upload. The queue sits in AsyncStorage forever.
- **Fix:** Call `processQueue()` in `App.tsx` on mount (in a `useEffect`), and also trigger it after successful health checks or when the app comes to foreground (via AppState listener).

### 1.14 CaptureScreen: `tripId` never passed to upload
- **File:** `apps/mobile/src/screens/CaptureScreen.tsx:71`
- **Severity:** CRITICAL
- **Problem:** `uploadReceipt(base64, mimeType)` is called without the optional `tripId` parameter, even though `uploadReceipt` in client.ts:63-67 accepts it and the server supports it (receipts.ts:88-104). If the user opens CaptureScreen from TripDetailScreen intending to capture a receipt for that trip, the trip context is lost.
- **Fix:** Accept an optional `tripId` route param, pass it through to `uploadReceipt()`.

### 1.15 ReceiptDetailScreen: Subtotal and Tax are display-only (not editable)
- **File:** `apps/mobile/src/screens/ReceiptDetailScreen.tsx:200-204`
- **Severity:** CRITICAL
- **Problem:** Subtotal (line 200) and Tax (line 204) are rendered as `<Text style={styles.amountValue}>`, not `<TextInput>`. They're read-only even when `editing` is `true`. Users can't correct AI parsing errors on these fields.
- **Fix:** Conditionally render as `<TextInput>` when `editing` is true (same pattern as the Tip field at lines 208-217).

### 1.16 ReceiptDetailScreen: Total not recomputed when tip changes
- **File:** `apps/mobile/src/screens/ReceiptDetailScreen.tsx:224`
- **Severity:** CRITICAL
- **Problem:** Line 224 shows `display.total` which comes from the original API data. When the user edits Tip (line 211), the Total at line 224 should update to `subtotal + tax + tip` for correct local preview. Currently the old total is shown until save+reload.
- **Fix:** Compute `display.total` as `(display.subtotal || 0) + (display.tax || 0) + (display.tip || 0)` when in editing mode, or always use the computed value.

### 1.17 ReceiptDetailScreen: No trip unassignment option
- **File:** `apps/mobile/src/screens/ReceiptDetailScreen.tsx:258-265`
- **Severity:** CRITICAL
- **Problem:** When editing trip assignment, user can only select from existing trips. There's no way to unassign a receipt from a trip (set `tripId` to null).
- **Fix:** Add a "No trip" chip/option in the trip assignment row during editing.

### 1.18 SettingsScreen: Storage stats hardcoded
- **File:** `apps/mobile/src/screens/SettingsScreen.tsx:223-224`
- **Severity:** MEDIUM
- **Problem:** "12 receipts, 24 MB" is hardcoded. Users see fake stats.
- **Fix:** Compute actual receipt count and estimated storage from AsyncStorage or API.

---

## Phase 2: Missing Critical Features

Features listed in the build plan that don't exist at all.

### 2.1 TripsScreen: Pull-to-refresh missing
- **File:** `apps/mobile/src/screens/TripsScreen.tsx:96-146`
- **Severity:** HIGH
- **Problem:** `FlatList` has no `refreshControl` prop. User can't pull down to refresh the trips list.
- **Fix:** Add `RefreshControl` with `refreshing` state and `onRefresh` callback (same pattern as HomeScreen:144-151).

### 2.2 TripsScreen: Category chips on trip cards missing
- **File:** `apps/mobile/src/screens/TripsScreen.tsx:100-128`
- **Severity:** HIGH
- **Problem:** Trip cards show name, dates, total, and receipt count but no category breakdown (e.g., "3 Food · 2 Car Service").
- **Fix:** The API response needs to include per-category counts. Add `categoryBreakdown` to the trip response and render `<CategoryChip>` for the top 3 categories on each trip card.

### 2.3 TripsScreen: Pending/warning indicator for trips with items needing review
- **File:** `apps/mobile/src/screens/TripsScreen.tsx:100-128`
- **Severity:** HIGH
- **Problem:** No visual indicator if a trip has receipts in `NEEDS_REVIEW` status.
- **Fix:** Add `needsReviewCount` to the API trip list response. Show a warning icon/badge on cards where count > 0.

### 2.4 TripsScreen: Search button and functionality missing
- **File:** `apps/mobile/src/screens/TripsScreen.tsx:88-94`
- **Severity:** HIGH
- **Problem:** No search bar or search icon in the Trips header. Users with many trips can't filter or search.
- **Fix:** Add search TextInput (same pattern as HomeScreen:89-100) and pass search query to API.

### 2.5 TripsScreen: Date inputs are free-text instead of date pickers
- **File:** `apps/mobile/src/screens/TripsScreen.tsx:176-193`
- **Severity:** HIGH
- **Problem:** Start Date and End Date in the Create Trip modal are plain `TextInput` with `placeholder="YYYY-MM-DD"`. No date picker, no validation beyond empty check.
- **Fix:** Use `@react-native-community/datetimepicker` or Expo's date picker for native date selection.

### 2.6 TripDetailScreen: Sort toggle missing
- **File:** `apps/mobile/src/screens/TripDetailScreen.tsx:99-123`
- **Severity:** HIGH
- **Problem:** Receipt list in TripDetail has no sort controls. Receipts render in whatever order the API returns.
- **Fix:** Add a sort picker/toggle (by date, amount, merchant) above the FlatList, pass `sortBy`/`sortOrder` to the fetch query.

### 2.7 TripDetailScreen: Edit trip (name, dates, notes) not possible
- **File:** `apps/mobile/src/screens/TripDetailScreen.tsx:60-67`
- **Severity:** HIGH
- **Problem:** TripDetail shows trip name and dates as read-only `<Text>`. No edit button to modify trip metadata.
- **Fix:** Add an "Edit" button in the header that enables inline editing of name, startDate, endDate, notes. Use `updateTrip()` from client.ts:124-126.

### 2.8 TripDetailScreen: FAB for capturing receipt in trip context missing
- **File:** `apps/mobile/src/screens/TripDetailScreen.tsx:58-123`
- **Severity:** HIGH
- **Problem:** No FAB or capture button on TripDetailScreen. Build plan specifies "open camera directly from trip detail to auto-assign receipt to trip."
- **Fix:** Add a FAB (same pattern as HomeScreen:81-87) that navigates to CaptureModal with `tripId` param. Requires CaptureScreen to accept route params (see 1.14).

### 2.9 TripDetailScreen: Empty state missing CTA button
- **File:** `apps/mobile/src/screens/TripDetailScreen.tsx:118-122`
- **Severity:** HIGH
- **Problem:** The empty state shows "No receipts in this trip" but has no action button. User can't easily add a receipt from here.
- **Fix:** Add a "Capture Receipt" button in the empty state that navigates to CaptureScreen with trip context.

### 2.10 CaptureScreen: Flash/torch toggle missing
- **File:** `apps/mobile/src/screens/CaptureScreen.tsx:122-148`
- **Severity:** HIGH
- **Problem:** No flash control on the camera view. Receipt photos in dim lighting are poor quality.
- **Fix:** Add flash mode toggle button using `CameraView`'s `flash` prop.

### 2.11 CaptureScreen: No guidance text or overlay instructions
- **File:** `apps/mobile/src/screens/CaptureScreen.tsx:122-148`
- **Severity:** HIGH
- **Problem:** The camera view has corner guides but no text instructions. New users don't know what to do.
- **Fix:** Add guidance text ("Position receipt in frame") above or below the guide frame.

### 2.12 ExportScreen: No pagination beyond 500 items
- **File:** `apps/mobile/src/screens/ExportScreen.tsx:31`
- **Severity:** HIGH
- **Problem:** `fetchReceipts({ pageSize: 500 })` hardcodes 500. Users with >500 receipts can't export all of them.
- **Fix:** If total > pageSize, fetch additional pages and concatenate, or add infinite scroll / load more.

### 2.13 ExportScreen: Only single format selection despite API supporting multiple
- **File:** `apps/mobile/src/screens/ExportScreen.tsx:64`
- **Severity:** HIGH
- **Problem:** `[activeFormat]` always passes a single format. The API (export.ts:23-34) loops over all formats in the array and generates each. Users should be able to export ZIP+CSV simultaneously.
- **Fix:** Change `activeFormat` to a `Set<ExportFormat>` (multi-select) and pass `Array.from(activeFormats)`.

### 2.14 ExportScreen: No export history UI
- **File:** `apps/mobile/src/screens/ExportScreen.tsx` (feature not present) and `apps/mobile/src/api/client.ts:145-147`
- **Severity:** HIGH
- **Problem:** The API has `/export/log` endpoint that returns past exports. The ExportScreen never calls it and shows no history.
- **Fix:** Call `fetchExportLog()` on mount. Render a "Recent Exports" section below the receipt list showing past exports with format, date, and re-download option.

### 2.15 ExportScreen: No trip/category filter for receipt selection
- **File:** `apps/mobile/src/screens/ExportScreen.tsx:106-130`
- **Severity:** HIGH
- **Problem:** The receipt list for export shows all receipts with no filter. Users can't filter by trip or category before selecting.
- **Fix:** Add filter chips or a dropdown above the FlatList to filter receipts by trip and/or category.

### 2.16 CaptureScreen: MIME type detection is hardcoded to JPEG
- **File:** `apps/mobile/src/screens/CaptureScreen.tsx:43,56,68`
- **Severity:** HIGH
- **Problem:** Lines 43 and 56 always prepend `data:image/jpeg;base64,`, and line 68 checks for `image/png` prefix which will never match. Gallery images from iOS (HEIC) or screenshots (PNG) would get wrong MIME type.
- **Fix:** Detect MIME type from the image picker result or the photo's actual format. Expo ImagePicker returns `mimeType` in the asset metadata.

### 2.17 Cross-cutting: No global state cache for data shared across tabs
- **File:** All screens
- **Severity:** HIGH
- **Problem:** Each screen fetches its own data independently. HomeScreen fetches receipts, TripsScreen fetches trips, etc. Switching tabs always triggers full refetches. No shared cache or context provider.
- **Fix:** Implement a lightweight React Context (or Zustand store) for trips and receipts that caches fetch results with TTL.

### 2.18 CaptureScreen: Check-health-then-upload is fragile
- **File:** `apps/mobile/src/screens/CaptureScreen.tsx:65-82`
- **Severity:** HIGH
- **Problem:** If `checkHealth()` passes but the actual `uploadReceipt()` fails (e.g., server goes down mid-upload, auth error), the image is lost (not queued). Only totally offline scenarios trigger the queue path.
- **Fix:** Wrap `uploadReceipt` in try/catch. On failure, fall through to `addToQueue` path instead of showing error alert.

---

## Phase 3: UX Polish

Loading states, empty states, error handling, input improvements, and missing user affordances.

### 3.1 ReceiptDetailScreen: No pinch-to-zoom on receipt image
- **File:** `apps/mobile/src/screens/ReceiptDetailScreen.tsx:141`
- **Severity:** HIGH
- **Problem:** `<Image>` has no gesture handling. Users can't zoom in to read small text on receipts.
- **Fix:** Wrap in a pinch-to-zoom library like `react-native-gesture-handler` + `react-native-reanimated` or use a `ScrollView` with `maximumZoomScale`.

### 3.2 ReceiptDetailScreen: Line items not editable
- **File:** `apps/mobile/src/screens/ReceiptDetailScreen.tsx:287-308`
- **Severity:** HIGH
- **Problem:** Line items are display-only with no edit, add, or delete capability. AI-parsed line items can't be corrected.
- **Fix:** When in editing mode, allow inline editing of line item descriptions and amounts, plus an "Add line item" button and delete (swipe or X) per item.

### 3.3 Cross-cutting: No KeyboardAvoidingView on any form screens
- **File:** `apps/mobile/src/screens/ReceiptDetailScreen.tsx:137-138`, `apps/mobile/src/screens/SettingsScreen.tsx:67-68`, `apps/mobile/src/screens/TripsScreen.tsx:156-157`
- **Severity:** HIGH
- **Problem:** Forms with multiple TextInputs (ReceiptDetail edit mode, Settings fields, Trip creation modal) don't use `KeyboardAvoidingView`. Keyboards obscure input fields.
- **Fix:** Wrap ScrollView content in `<KeyboardAvoidingView behavior="padding">`.

### 3.4 CaptureScreen: No shutter animation
- **File:** `apps/mobile/src/screens/CaptureScreen.tsx:39-46`
- **Severity:** MEDIUM
- **Problem:** `takePhoto()` captures instantly with no visual feedback. No animation on the capture button.
- **Fix:** Add an `Animated` scale/opacity animation on the capture button on press (brief scale down + flash overlay).

### 3.5 CaptureScreen: No offline queue indicator
- **File:** `apps/mobile/src/screens/CaptureScreen.tsx`
- **Severity:** MEDIUM
- **Problem:** No visual indicator showing how many items are queued for upload.
- **Fix:** Call `getQueueCount()` from `offlineQueue.ts` and display a badge on the capture screen or in the header.

### 3.6 Cross-cutting: No network error UI or toast system
- **File:** All screens
- **Severity:** HIGH
- **Problem:** API errors are caught and logged but show no user-facing error state. The UI just shows stale/empty data or an Alert (in some cases). For transient network issues, there's no retry affordance.
- **Fix:** Build a lightweight error boundary + inline retry pattern. Show an error banner at the top of lists with a "Retry" button rather than silent failures.

### 3.7 Cross-cutting: Camera permission "Maybe later" flow missing
- **File:** `apps/mobile/src/screens/CaptureScreen.tsx:20-37`
- **Severity:** HIGH
- **Problem:** When camera permission is denied, the screen shows the permission request UI. But if the user dismisses (swipes back), there's no way to re-trigger the permission flow or manually pick from gallery. The permission screen lacks a "Use Gallery Instead" fallback.
- **Fix:** Add a "Choose from Gallery" fallback button on the permission denied screen.

### 3.8 ReceiptDetailScreen: Date picker is free-text instead of native picker
- **File:** `apps/mobile/src/screens/ReceiptDetailScreen.tsx:183-192`
- **Severity:** HIGH
- **Problem:** The purchase date field is a free-text `TextInput` with placeholder "YYYY-MM-DD". Should be a native date picker.
- **Fix:** Use `@react-native-community/datetimepicker` or Expo date picker on press.

### 3.9 SettingsScreen: Naming template preview is static text
- **File:** `apps/mobile/src/screens/SettingsScreen.tsx:154-156`
- **Severity:** MEDIUM
- **Problem:** The template example text is static (`2026-06-14_Hertz_CarService_$84.20`). It doesn't update when the user changes the template or variables.
- **Fix:** Generate a live preview by parsing the template and substituting realistic example values.

### 3.10 TripsScreen: No empty state for when search returns no results
- **File:** `apps/mobile/src/screens/TripsScreen.tsx`
- **Severity:** MEDIUM
- **Problem:** `ListEmptyComponent` only shows the "No trips yet" state. If the user has trips but a filter/search returns nothing, they see "No trips yet" which is misleading.
- **Fix:** Add separate empty states for "no trips at all" vs "no matching trips".

### 3.11 ReceiptDetailScreen: Confidence indicator not shown on Location/Date/Tip fields
- **File:** `apps/mobile/src/screens/ReceiptDetailScreen.tsx:158-218`
- **Severity:** MEDIUM
- **Problem:** The `ConfidenceIndicator` component exists in Badges.tsx (line 62) but is only used for the overall receipt confidence. Per-field confidence (e.g., the AI's confidence in the merchant name vs. the date vs. the tip amount) is not shown. Users can't tell which fields the AI is sure about vs. guessing.
- **Fix:** If the API returns per-field confidence, show `ConfidenceIndicator` next to each field label. Otherwise, show it only on fields likely to be inaccurate (tip, line items).

### 3.12 HomeScreen: No clear search button
- **File:** `apps/mobile/src/screens/HomeScreen.tsx:89-100`
- **Severity:** MEDIUM
- **Problem:** Once a user types a search, there's no way to clear it other than manually deleting text.
- **Fix:** Add a clear "X" button inside the search bar when `search.length > 0`.

---

## Phase 4: Design Fidelity

Visual mismatches between implementation and the Stitch design spec.

### 4.1 FAB icon is "+" instead of camera icon
- **File:** `apps/mobile/src/screens/HomeScreen.tsx:86` and `apps/mobile/src/screens/TripsScreen.tsx:153`
- **Severity:** MEDIUM
- **Problem:** Both FABs use the text character "+" as the icon. Design spec shows a Material Symbols camera icon on HomeScreen FAB.
- **Fix:** Integrate `@expo/vector-icons` (MaterialIcons) and use `camera-alt` icon with 24px size.

### 4.2 Tab bar icons are Unicode emojis not Material Symbols
- **File:** `apps/mobile/src/navigation/AppNavigator.tsx:17-22`
- **Severity:** MEDIUM
- **Problem:** Tab icons use raw Unicode: ⌂ (home), ✈ (trips), ⇧ (export), ⚙ (settings). Design spec shows Material Symbols: `home`, `flight`, `file_export`, `settings`.
- **Fix:** Replace Unicode strings with MaterialIcons components: `home`, `flight`, `ios_share`/`file_download`, `settings`.

### 4.3 Font system uses `System` instead of Space Grotesk / DM Sans
- **File:** `apps/mobile/src/ui/theme.ts:51-126`
- **Severity:** MEDIUM
- **Problem:** All typography variants use `fontFamily: "System"`. Build plan specifies Space Grotesk for headlines/display and DM Sans for body/labels.
- **Fix:** Load custom fonts via `expo-font` (`useFonts`). Update theme to use `SpaceGrotesk_500Medium`, `SpaceGrotesk_600SemiBold`, `SpaceGrotesk_700Bold` for display/headline/amount styles, and `DMSans_400Regular`, `DMSans_500Medium`, `DMSans_700Bold` for body/label styles.

### 4.4 Card chevron indicators missing
- **File:** `apps/mobile/src/components/ReceiptCard.tsx` and `apps/mobile/src/screens/TripsScreen.tsx`
- **Severity:** MEDIUM
- **Problem:** Receipt cards and trip cards have no right-chevron (`chevron_right`) to indicate tappability. Design spec shows a subtle chevron on tappable cards.
- **Fix:** Add a chevron icon at the right edge of card components.

### 4.5 Filter chip styles don't match design spec
- **File:** `apps/mobile/src/screens/HomeScreen.tsx:251-269`
- **Severity:** LOW
- **Problem:** Filter chips use `radii.full` (9999) and `borderWidth: 1`. Design shows slightly tighter radius and no border on inactive chips.
- **Fix:** Adjust to `radii.xl` (20), remove border on inactive chips, use `colors.borderLight` only for active border.

### 4.6 Header avatar/profile indicator missing
- **File:** `apps/mobile/src/screens/HomeScreen.tsx:72-88` and design spec
- **Severity:** LOW
- **Problem:** Design spec shows a small avatar/profile circle in the header. Implementation has no avatar.
- **Fix:** Add a small colored circle with user initial or generic avatar icon next to the app title.

### 4.7 Category chips don't show Material icons
- **File:** `apps/mobile/src/components/Badges.tsx:12-41`
- **Severity:** LOW
- **Problem:** `CategoryChip` renders category name as text only. Design spec shows category-specific icons: 🍔 for Food, 🚗 for CarService, 🏨 for Lodging, ✈️ for Airfare, etc.
- **Fix:** Add icon mapping per category and render an icon next to the category label.

### 4.8 Border widths and radii inconsistencies with design tokens
- **File:** Various screens
- **Severity:** LOW
- **Problem:** Several elements use hardcoded values instead of theme tokens. E.g., `ReceiptDetailScreen.tsx:438` uses `borderLeftWidth: 3` for confidence border, which is an arbitrary value.
- **Fix:** Standardize to theme tokens where possible, or document intentional deviations.

---

## Phase 5: Accessibility + Performance

### 5.1 Zero accessibility labels anywhere
- **File:** All screens and components
- **Severity:** HIGH
- **Problem:** No `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`, or `accessible` props on any interactive element. The app is completely unusable with screen readers.
- **Fix:** Add `accessibilityLabel` to all `TouchableOpacity`, `TextInput`, and interactive elements. Add `accessibilityRole="button"` on tappable elements. Add `accessibilityHint` where action context is needed.

### 5.2 Thumbnail URL fetch on every card mount (no caching)
- **File:** `apps/mobile/src/components/ReceiptCard.tsx:43-45`
- **Severity:** HIGH
- **Problem:** Every `ReceiptCard` instance fires `getReceiptThumbnailUrl(id)` on mount. In a FlatList with 100 items, this means 100 simultaneous network fetches for images. Additionally, scrolling causes remounts and re-fetches (`useEffect` with `[id]` dependency).
- **Fix:** Use `Image` with a cache policy (`cache: "force-cache"` on iOS). Or use the server-provided thumbnail URL directly (the API response includes `thumbnailPath` — use it instead of fetching per-item). Also consider `FastImage` for better caching.

### 5.3 Auth token handling is fragile (stored in URL query params)
- **File:** `apps/mobile/src/api/client.ts:103,109,142`
- **Severity:** HIGH
- **Problem:** Image and export URLs embed the auth token as a `?token=` query parameter. This leaks the token in server logs and URL history.
- **Fix:** Switch to proper `Authorization: Bearer` header for all requests including image downloads. Use `fetch` with headers instead of constructing URLs with tokens.

### 5.4 No image caching for receipt images
- **File:** `apps/mobile/src/screens/ReceiptDetailScreen.tsx:141`
- **Severity:** MEDIUM
- **Problem:** Full-resolution receipt image is fetched fresh every time the detail screen mounts. No disk or memory cache.
- **Fix:** Use `expo-file-system` caching or `FastImage` with `cachePriority` for receipt images.

### 5.5 HomeScreen FlatList lacks windowing optimizations
- **File:** `apps/mobile/src/screens/HomeScreen.tsx:128-143`
- **Severity:** MEDIUM
- **Problem:** `FlatList` with complex `ReceiptCard` items has no `windowSize`, `maxToRenderPerBatch`, or `removeClippedSubviews` configured for large lists.
- **Fix:** Add `windowSize={10}`, `maxToRenderPerBatch={10}`, `removeClippedSubviews={true}`, `getItemLayout` for fixed-height items.

### 5.6 Cross-cutting: No error boundaries
- **File:** App root
- **Severity:** MEDIUM
- **Problem:** A JavaScript error in any screen will crash the entire app. No React error boundaries at screen or app level.
- **Fix:** Add a top-level error boundary in `App.tsx` and per-screen error boundaries that show a fallback UI with a "Go back" or "Retry" option.

---

## Phase 6: Nice-to-Have

Features that improve the experience but aren't blocking.

### 6.1 No dark mode support
- **File:** `apps/mobile/src/ui/theme.ts` and App.tsx
- **Severity:** LOW
- **Problem:** Theme defines only light-mode colors. `StatusBar` is hardcoded to `style="dark"`. No `useColorScheme` integration.
- **Fix:** Add dark mode color variants, use `useColorScheme()` from React Native, switch `StatusBar` style dynamically, persist preference.

### 6.2 Multi-page receipt capture not implemented
- **File:** `apps/mobile/src/screens/CaptureScreen.tsx`
- **Severity:** LOW
- **Problem:** Build plan mentions multi-page receipt capture (long receipts). Only single image capture exists.
- **Fix:** Add "Add page" button in preview mode to capture additional images, submit as batch.

### 6.3 Merchant autocomplete on search
- **File:** `apps/mobile/src/screens/HomeScreen.tsx:89-100`
- **Severity:** LOW
- **Problem:** Search is plain text, no autocomplete suggestions for known merchants.
- **Fix:** Add an autocomplete endpoint or cache known merchants from API responses, show suggestions below search bar.

### 6.4 ExportScreen: Download progress indicator
- **File:** `apps/mobile/src/screens/ExportScreen.tsx:62-87`
- **Severity:** LOW
- **Problem:** `doExport()` shows a spinner but no download progress for large ZIP files.
- **Fix:** Use `File.downloadFileAsync` with progress callback, show a progress bar.

### 6.5 No swipe-to-delete or swipe actions on receipt cards
- **File:** `apps/mobile/src/components/ReceiptCard.tsx`
- **Severity:** LOW
- **Problem:** To delete a receipt you must tap into the detail view, scroll down, tap Delete, and confirm. No quick actions from the list.
- **Fix:** Add swipeable row (left swipe = delete, right swipe = flag) using `react-native-gesture-handler`'s `Swipeable`.

### 6.6 No receipt count badge on Home tab icon
- **File:** `apps/mobile/src/navigation/AppNavigator.tsx:68-72`
- **Severity:** LOW
- **Problem:** The Home tab shows no badge count for items needing review.
- **Fix:** Add `tabBarBadge` option showing count of `NEEDS_REVIEW` receipts.

---

## Summary: Top 10 Most Impactful Items

| # | Item | Phase | Impact |
|---|------|-------|--------|
| 1 | **Settings: URL/Token never loaded from storage** (1.2) + **Save doesn't persist** (1.3) + **Test always tests empty** (1.4) | Phase 1 | App is completely unusable after first session. Users must reconfigure every launch. |
| 2 | **ReceiptDetail: Trip chips inside Text crash** (1.1) | Phase 1 | Runtime crash when editing receipt → trip assignment. |
| 3 | **CaptureScreen: tripId never passed** (1.14) + **No trip context from TripDetail** (2.8) | Phase 1/2 | Core UX flow broken: can't capture receipt for a specific trip. |
| 4 | **Offline queue processor never called** (1.13) + **Check-health fragility** (2.18) | Phase 1/2 | Offline receipts silently lost. Online upload failures also lose data. |
| 5 | **HomeScreen: No search debounce** (1.9) | Phase 1 | API hammered on every keystroke. App feels laggy, wastes bandwidth. |
| 6 | **ReceiptDetail: Subtotal/Tax not editable vs. Tip is** (1.15, 1.16) | Phase 1 | Users can correct tip but not subtotal or tax. Total doesn't update from edits. Core data correction flow is broken. |
| 7 | **Settings: AI model selector dead** (1.5) + **Template chips dead** (1.7) + **Export Backup dead** (1.6) | Phase 1 | Settings screen has 3 non-functional interactive sections. Destroys trust in the app. |
| 8 | **ExportScreen: `&amp;` bug** (1.8) + **Single format only** (2.13) + **Hard 500 limit** (2.12) | Phase 1/2 | Export is a core feature. Literal text bug + feature regression from API capability. |
| 9 | **Zero accessibility labels** (5.1) | Phase 5 | App is legally non-compliant (WCAG/ADA) and unusable for screen reader users. |
| 10 | **ReceiptCard: N parallel thumbnail fetches** (5.2) + **Auth token in URL** (5.3) | Phase 5 | Performance and security issues that degrade the app at scale. |

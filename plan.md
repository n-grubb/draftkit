# Custom Projections Feature Plan

## Overview
Allow users to override any projection stat for a player, persist those overrides alongside the ranking data, and toggle between custom vs. original projections globally.

---

## Storage Design

### Where: `ranking.players[playerId]` (existing per-player object)

Add a new `customProjections` field alongside the existing `rank`, `ignore`, `highlight`, and `note` fields:

```js
ranking.players["12345"] = {
    rank: 42,
    ignore: false,
    highlight: false,
    note: "Breakout candidate",
    customProjections: { HR: 35, RBI: 100, ERA: 3.10 }  // only overridden stats
}
```

**Why this location:**
- Already persisted to localStorage and synced to server (via `updateRemoteRanking`)
- No new storage keys, APIs, or migration needed
- Follows the exact same update pattern as `updatePlayerNote` / `highlightPlayer`
- Custom projections travel with the ranking when shared

### Global toggle: `ranking.useCustomProjections` (boolean, default true)

Stored at the ranking level (not localStorage) so it persists and shares with the ranking. This keeps all ranking-related state together.

---

## Implementation Steps

### Step 1: Data Layer — `useUserRanking.tsx`

Add a new `updatePlayerProjections(playerId, statId, value)` function following the same pattern as `updatePlayerNote`:
- Merges the custom value into `ranking.players[playerId].customProjections`
- If value matches original or is empty, removes that key (keep it clean)
- Persists to localStorage + remote if shared

Add `toggleCustomProjections()` to flip `ranking.useCustomProjections`.

### Step 2: Expose through StoreContext — `store.tsx`

Add `updatePlayerProjections` and `toggleCustomProjections` to the context value, same as existing actions.

### Step 3: Icon Change — `PlayerItem.tsx`

Replace the `CommentIcon` in the action buttons with a `PencilIcon` (simple pencil SVG). The button tooltip changes to "Edit projections & notes" / "Hide editor". The `active` class logic stays the same: active when has note, has custom projections, or is expanded.

### Step 4: Expanded Row — `PlayerItem.tsx` (`PlayerNoteRow`)

Rename to `PlayerEditRow` (or keep name, just expand functionality). When expanded, render:

1. **Editable projection cells** — one inline input per visible stat column, pre-filled with the current value (custom if exists, else original projection). Inputs are compact number fields that save `onBlur`. Cells with custom values get a visual indicator (e.g., highlighted background or colored text).
2. **Notes textarea** — same as today, below the projection inputs.

Layout: a single `<tr>` with a `<td colSpan={totalColumns}>` containing:
```
┌─────────────────────────────────────────────────────────┐
│ [R: 85] [HR: 32*] [RBI: 100*] [SB: 12] [OBP: .355]    │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Notes textarea...                                   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

Custom-overridden fields show with a distinct style (accent color/dot) so the user knows which stats they've modified.

### Step 5: Projection Resolution — `PlayerItem.tsx` (`renderCellValue`)

Update `renderCellValue` to check for custom projections:

```js
const renderCellValue = (player, columnId) => {
    const customProjections = ranking.useCustomProjections !== false
        ? playerRanking?.customProjections
        : null;

    let value = customProjections?.[columnId]
        ?? projections?.[columnId]
        ?? player[columnId]
        ?? null;

    // ... rest of formatting/quality logic unchanged
}
```

Also add a subtle visual indicator (e.g., italic or dot) when a custom value is being displayed, so it's clear at a glance.

### Step 6: Sort Integration — `PlayerList.tsx`

Update the sort `getVal` lambda to also check custom projections when resolving values, so sorting uses the active projection source:

```js
const getVal = (id) => {
    const p = players[id];
    const custom = ranking.useCustomProjections !== false
        ? ranking.players[id]?.customProjections
        : null;
    return custom?.[sortColumn] ?? p?.[sortColumn] ?? p?.projections?.[sortColumn] ?? 0;
};
```

### Step 7: Toggle in FilterBar — `FilterBar.tsx`

Add a "Custom Projections" toggle button in the `controls-actions` section:
- Only rendered when `hasCustomProjections` is true (any player has customProjections)
- Shows active/inactive state based on `ranking.useCustomProjections`
- Clicking calls `toggleCustomProjections()`
- Uses a small toggle/switch icon or the existing button pattern with text like "Custom" / "Custom On"

Pass `hasCustomProjections`, `useCustomProjections`, and `onToggleCustomProjections` as props from `PlayerList`.

### Step 8: Compute `hasCustomProjections` — `PlayerList.tsx`

Derive from ranking data with a memoized check:

```js
const hasCustomProjections = useMemo(() => {
    return Object.values(ranking.players).some(p =>
        p.customProjections && Object.keys(p.customProjections).length > 0
    );
}, [ranking.players]);
```

---

## Performance Considerations

1. **Custom projections stored in ranking, not in component state** — no extra state updates during drag operations.
2. **`renderCellValue` is already called per-cell** — adding one object lookup (`customProjections?.[columnId]`) is negligible.
3. **The expanded edit row is conditionally rendered** — only mounted when the pencil icon is clicked, so no DOM overhead for collapsed rows.
4. **`hasCustomProjections` is memoized** — only recalculated when `ranking.players` changes, not on every render/drag.
5. **Editing saves on blur** — no state changes during typing that would trigger parent re-renders. The edit inputs use local state, only committing to the ranking on blur (same pattern as notes).
6. **DraggableItem is unaffected** — custom projections don't add any props or state to the drag wrapper component. The row content is rendered inside the existing `PlayerItem`, and projection lookups are pure reads from context.

---

## Files to Modify

| File | Change |
|------|--------|
| `client/src/data/useUserRanking.tsx` | Add `updatePlayerProjections()`, `toggleCustomProjections()` |
| `client/src/data/store.tsx` | Expose new functions in context |
| `client/src/components/PlayerList/PlayerItem.tsx` | Pencil icon, custom projection resolution in `renderCellValue`, expand `PlayerNoteRow` to include editable projections |
| `client/src/components/PlayerList/PlayerList.tsx` | Compute `hasCustomProjections`, pass toggle props, update sort logic |
| `client/src/components/FilterBar.tsx` | Add custom projections toggle button |
| `client/src/app.css` | Styles for editable projection inputs, custom value indicators, toggle button |

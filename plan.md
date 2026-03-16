# Design Updates Plan

Based on the annotated screenshot, here are the 7 design changes to implement:

---

## 1. Remove background from controls bar, keep it on table header
**Files:** `client/src/app.css` (~line 642-655)

The `.player-controls` sticky toolbar currently has `background: var(--soft-tan)` which gives it the same tan background as the table. Remove this background so the controls float cleanly above the table, while keeping the `background: var(--soft-tan)` on `.player-table thead th` (line 925).

- Remove `background: var(--soft-tan)` from `.player-controls`
- Keep the sticky positioning and border-bottom intact

---

## 2. Narrow the Player column / distribute column widths more evenly
**Files:** `client/src/app.css` (~line 990-995)

The Player column currently has `min-width: 190px` on `.player-identity-cell`, making it wider than necessary and squeezing stat columns. The search bar width is fine as-is.

- Reduce `.player-identity-cell` `min-width` from `190px` to a smaller value (e.g., ~`150px`)
- This gives stat columns more breathing room and distributes widths more evenly

---

## 3. Fix ADP column: center-align, remove redundant "ADP" label from cells
**Files:** `client/src/components/PlayerList/PlayerItem.tsx` (lines 126-145), `client/src/app.css` (lines 1055-1065, 1215-1231)

Currently each cell shows "ADP 2.4" with an "ADP" label prefix, and the column header already says "ADP". The annotation says this is redundant and the column should be center-aligned.

- Remove the `<span className="adp-label">ADP</span>` from `PlayerItem.tsx` line 130
- Center-align the `.adp-cell` content via `text-align: center`
- The ADP value display should just show the number (e.g., "2.4" not "ADP 2.4")

---

## 4. Comments as expandable accordion rows
**Files:** `client/src/components/PlayerList/PlayerItem.tsx`, `client/src/components/PlayerList/PlayerList.tsx`, `client/src/app.css`

Currently notes/comments are rendered inline inside the player identity cell, which expands the row height. The annotation says comments should be in an accordion: an icon triggers expansion, and the comment spans the full width of the row underneath.

- Keep the note toggle icon button in the actions area
- When toggled, render the note as a separate `<tr>` below the player row that spans all columns (`colSpan`)
- The note row should not affect the main player row height
- Move the note textarea out of `.player-identity-cell` and into a full-width expandable row
- This requires changes to how `PlayerItem` communicates note visibility — likely lift `showNote` state up to `PlayerList` or return the note row as a sibling `<tr>`

---

## 5. Change highlight border from gold to blue
**Files:** `client/src/app.css` (lines 956-963, 1111-1113)

The annotation says highlighted players should use a blue border instead of gold.

- Add a CSS variable like `--highlight-blue: #3b82f6` (or use existing `--navy`)
- Replace `var(--gold)` with the new blue variable in all `.player-row.highlighted` box-shadow rules (lines 957, 960, 963, 1112)
- Update `.icon-btn.highlight-btn.active` color to match (line 1155)

---

## 6. Action buttons: show only on hover, not when active
**Files:** `client/src/app.css` (lines 1097-1105)

Currently the actions wrapper shows on hover AND stays visible when any button has `.active` class (via `:has(.active)`). The annotation says buttons should only show on hover since the row itself already signals highlighted/ignored state visually.

- Remove the `.actions-wrapper:has(.active)` rule (lines 1103-1105) so actions only appear on hover

---

## 7. Extend highlight border over the actions area
**Files:** `client/src/app.css` (lines 1067-1116)

The annotation notes that the highlight border doesn't extend over the actions area when buttons are displayed. Currently `.actions-cell` has `background: none !important` and `box-shadow: none`, which breaks the border continuity.

- When the row is highlighted and hovered, the actions wrapper should also show the highlight border
- Update `.player-row.highlighted .actions-wrapper` to include matching top/bottom border styling
- Ensure the gradient background of `.actions-wrapper` doesn't clip the border

---

## 8. Add "Toggle all comments" button in the header
**Files:** `client/src/components/FilterBar.tsx`, `client/src/components/PlayerList/PlayerList.tsx`

The annotation shows a speech-bubble icon button in the header controls area (next to the gear/Stats button) that toggles all comments open/closed.

- Add a comment/chat icon button to `FilterBar.tsx` in the `.controls-actions` area
- Add `allNotesExpanded` state in `PlayerList` (or pass down as prop)
- The button toggles all player notes open/closed globally
- This pairs with change #4 (accordion comments) — when toggled on, all note rows expand

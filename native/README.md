# DraftKit iOS

SwiftUI client for DraftKit — MLB fantasy baseball draft tool.

## Requirements

- Xcode 15+
- iOS 17+ deployment target

## Setup

### Option A: xcodegen (recommended)

```bash
brew install xcodegen
cd native
xcodegen generate
open DraftKit.xcodeproj
```

### Option B: Manual

1. Open Xcode → File → New → Project → iOS App
2. Name it `DraftKit`, set bundle ID to `com.draftkit.app`
3. Delete the generated files and drag in the `DraftKit/` folder

## Architecture

- **`AppState`** — `@Observable` class holding players, teams, mode, and active ranking. Owns all data fetching and ranking mutations.
- **`DraftState`** — `@Observable` class for draft board state, snake draft logic, and team stat calculations.
- **`StatsPrefs`** — `@Observable` class for stat column preferences, persisted via `@AppStorage`.
- **`API/`** — Thin `actor` types wrapping URLSession calls. Used only by state objects, not views.
- **`Models/`** — Pure `Decodable`/`Codable` value types.

State objects are created as `@State` in `DraftKitApp` and injected via `.environment()`.

## Features

- **View mode** — Browse ranked players with sort, filter by position, and search
- **Edit mode** — Drag to reorder, highlight/ignore players, add personal notes
- **Draft mode** — Live snake draft simulator with board grid, team radar stats, and starters-remaining indicators
- **Rankings** — Create, switch, delete, and share rankings with optional PIN protection
- **Stats prefs** — Customize which batting/pitching stat columns are visible

## Backend

All data comes from `https://baseball-data.deno.dev`. Players and teams are cached locally for 24 hours. Rankings are stored in `UserDefaults` (local) or synced to the backend (shared).

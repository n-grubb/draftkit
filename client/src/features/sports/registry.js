// Sport registry + active-sport module state.
//
// The active sport is tracked at module scope so that the pure helper modules
// (features/stats, features/positions, features/filtering/columns) can delegate
// to the right config without threading the sport through every call site.
// The SportProvider sets the active sport during render and re-mounts the app
// subtree on change, so render-time reads here are always consistent.

import baseball from './baseball'
import football from './football'

export const SPORTS = { baseball, football }

export const SPORT_LIST = [baseball, football]

export const DEFAULT_SPORT = 'baseball'

let activeSportKey = DEFAULT_SPORT

export function setActiveSport(key) {
    if (SPORTS[key]) activeSportKey = key
}

export function getActiveSportKey() {
    return activeSportKey
}

export function getActiveConfig() {
    return SPORTS[activeSportKey] || SPORTS[DEFAULT_SPORT]
}

export function getSportConfig(key) {
    return SPORTS[key] || SPORTS[DEFAULT_SPORT]
}

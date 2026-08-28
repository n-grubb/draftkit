// Sport-agnostic stat helpers. These delegate to the active sport's config.
import { getActiveConfig } from './sports/registry'

export function formatStatValue(column, value) {
    return getActiveConfig().stats.formatStatValue(column, value)
}

export function normalizeStatValue(statId, value) {
    return getActiveConfig().stats.normalizeStatValue(statId, value)
}

export function evaluateStatQuality(statId, value, playerPosition) {
    return getActiveConfig().stats.evaluateStatQuality(statId, value, playerPosition)
}

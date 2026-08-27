// Sport-agnostic position helpers. These delegate to the active sport's config.
import { getActiveConfig } from './sports/registry'

export function getAdjustedThreshold(position, teamCount = 10) {
    return getActiveConfig().positions.getAdjustedThreshold(position, teamCount)
}

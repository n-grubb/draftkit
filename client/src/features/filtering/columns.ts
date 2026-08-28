// Sport-agnostic column helpers. These delegate to the active sport's config.
import { getActiveConfig } from '~/features/sports/registry'

export function statsForFilter(posFilter, selected = {}) {
    return getActiveConfig().columns.statsForFilter(posFilter, selected || {})
}

export function statsToDisplay(positions, selected = {}, expanded = false) {
    return getActiveConfig().columns.statsToDisplay(positions, selected || {}, expanded)
}

export function columnAppliesToPlayer(positions, columnId) {
    return getActiveConfig().columns.columnAppliesToPlayer(positions, columnId)
}

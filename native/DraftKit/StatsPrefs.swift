import Foundation
import SwiftUI

@Observable
final class StatsPrefs {
    @ObservationIgnored
    @AppStorage("selectedBattingStats")
    private var battingRaw: String = StatDefinition.defaultBatting.joined(separator: ",")

    @ObservationIgnored
    @AppStorage("selectedPitchingStats")
    private var pitchingRaw: String = StatDefinition.defaultPitching.joined(separator: ",")

    @ObservationIgnored
    @AppStorage("expandedStatsView")
    var expandedStatsView: Bool = false

    var selectedBattingStats: [String] {
        get { battingRaw.split(separator: ",").map(String.init) }
        set { battingRaw = newValue.joined(separator: ",") }
    }

    var selectedPitchingStats: [String] {
        get { pitchingRaw.split(separator: ",").map(String.init) }
        set { pitchingRaw = newValue.joined(separator: ",") }
    }

    func resetToDefaults() {
        battingRaw = StatDefinition.defaultBatting.joined(separator: ",")
        pitchingRaw = StatDefinition.defaultPitching.joined(separator: ",")
        expandedStatsView = false
    }

    func visibleBattingStats() -> [StatDefinition] {
        let ids = expandedStatsView ? StatDefinition.allBatting.map(\.id) : selectedBattingStats
        return StatDefinition.allBatting.filter { ids.contains($0.id) }
    }

    func visiblePitchingStats() -> [StatDefinition] {
        let ids = expandedStatsView ? StatDefinition.allPitching.map(\.id) : selectedPitchingStats
        return StatDefinition.allPitching.filter { ids.contains($0.id) }
    }
}

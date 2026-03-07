import SwiftUI

struct TeamStatsView: View {
    @Environment(DraftState.self) private var draftState
    @Environment(AppState.self) private var appState

    private var myStats: TeamStats {
        draftState.teamStats(for: draftState.myDraftSlot, players: appState.players)
    }

    private var leagueStats: TeamStats {
        draftState.leagueAverages(players: appState.players)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                StartersRemainingRow(
                    starters: draftState.startersRemaining(for: draftState.myDraftSlot, players: appState.players)
                )

                StatComparisonSection(
                    title: "Batting",
                    statIds: StatDefinition.defaultBatting,
                    myStats: myStats.batting,
                    leagueStats: leagueStats.batting,
                    isBatter: true
                )

                StatComparisonSection(
                    title: "Pitching",
                    statIds: StatDefinition.defaultPitching,
                    myStats: myStats.pitching,
                    leagueStats: leagueStats.pitching,
                    isBatter: false
                )
            }
            .padding()
        }
    }
}

struct StartersRemainingRow: View {
    let starters: [(position: String, drafted: Int, threshold: Int)]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Roster")
                .font(.subheadline.weight(.semibold))
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(starters, id: \.position) { starter in
                        CircularProgress(
                            position: starter.position,
                            drafted: starter.drafted,
                            threshold: starter.threshold
                        )
                    }
                }
                .padding(.horizontal, 4)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }
}

struct StatComparisonSection: View {
    let title: String
    let statIds: [String]
    let myStats: [String: Double]
    let leagueStats: [String: Double]
    let isBatter: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.subheadline.weight(.semibold))

            ForEach(statIds, id: \.self) { statId in
                StatComparisonRow(
                    statId: statId,
                    myValue: myStats[statId],
                    leagueValue: leagueStats[statId],
                    isBatter: isBatter
                )
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }
}

struct StatComparisonRow: View {
    let statId: String
    let myValue: Double?
    let leagueValue: Double?
    let isBatter: Bool

    private var delta: Double? {
        guard let my = myValue, let league = leagueValue, league != 0 else { return nil }
        return my - league
    }

    private var lowerIsBetter: Bool {
        (isBatter ? StatDefinition.allBatting : StatDefinition.allPitching)
            .first(where: { $0.id == statId })?.lowerIsBetter ?? false
    }

    private var deltaColor: Color {
        guard let delta else { return .secondary }
        let isPositive = lowerIsBetter ? delta < 0 : delta > 0
        return isPositive ? .green : .red
    }

    var body: some View {
        HStack {
            Text(statId)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .frame(width: 44, alignment: .leading)

            Spacer()

            if let my = myValue {
                Text(my.formatted(for: statId))
                    .font(.system(.caption, design: .monospaced).weight(.semibold))
                    .foregroundStyle(my.statColor(for: statId, isBatter: isBatter))
            } else {
                Text("—").font(.caption).foregroundStyle(.tertiary)
            }

            if let delta {
                let prefix = delta > 0 ? "+" : ""
                Text("\(prefix)\(delta.formatted(for: statId))")
                    .font(.system(size: 10, design: .monospaced))
                    .foregroundStyle(deltaColor)
                    .frame(width: 50, alignment: .trailing)
            }
        }
    }
}

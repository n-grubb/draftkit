import SwiftUI

struct PlayerListView: View {
    @Binding var activeSheet: ActiveSheet?
    @Environment(AppState.self) private var appState
    @Environment(DraftState.self) private var draftState
    @Environment(StatsPrefs.self) private var statsPrefs

    @State private var searchText = ""
    @State private var selectedPosition: Position = .all
    @State private var sortStatId: String? = nil
    @State private var sortAscending = false

    private var visibleStats: [StatDefinition] {
        statsPrefs.visibleBattingStats() + statsPrefs.visiblePitchingStats()
    }

    private var filteredPlayers: [Player] {
        var list = appState.rankedPlayers

        if selectedPosition != .all {
            list = list.filter { selectedPosition.matches($0) }
        }
        if !searchText.isEmpty {
            list = list.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
        if appState.mode == .draft {
            list = list.filter { !draftState.isDrafted($0.id) }
        }
        if let sortId = sortStatId {
            list.sort { a, b in
                let aVal = a.projections?.value(for: sortId) ?? -1
                let bVal = b.projections?.value(for: sortId) ?? -1
                return sortAscending ? aVal < bVal : aVal > bVal
            }
        }
        return list
    }

    var body: some View {
        VStack(spacing: 0) {
            FilterBar(
                searchText: $searchText,
                selectedPosition: $selectedPosition,
                showStatsPref: appState.mode != .draft,
                onStatsPrefTap: { activeSheet = .statsPrefs }
            )

            statHeaderRow

            List {
                ForEach(filteredPlayers) { player in
                    PlayerRow(
                        player: player,
                        rank: (appState.activeRanking?.players[player.id]?.rank ?? 0) + 1,
                        rankData: appState.activeRanking?.players[player.id],
                        visibleStats: visibleStats,
                        teams: appState.teams,
                        mode: appState.mode,
                        onDraft: { draftState.draftPlayer(player.id) },
                        onTapName: { activeSheet = .playerCard(player) }
                    )
                    .listRowInsets(EdgeInsets())
                    .listRowSeparator(.hidden)
                }
                .onMove { from, to in
                    var ids = filteredPlayers.map(\.id)
                    ids.move(fromOffsets: from, toOffset: to)
                    appState.updateRanking(orderedIds: ids)
                }
            }
            .listStyle(.plain)
            .environment(\.editMode, .constant(appState.mode == .edit ? .active : .inactive))
        }
    }

    // MARK: - Stat header row

    private var statHeaderRow: some View {
        HStack(spacing: 10) {
            Text("#")
                .frame(width: 28, alignment: .trailing)
            Spacer()
                .frame(width: 36)
            Text("Player")
                .frame(maxWidth: .infinity, alignment: .leading)

            ForEach(visibleStats) { stat in
                Button {
                    if sortStatId == stat.id {
                        sortAscending.toggle()
                    } else {
                        sortStatId = stat.id
                        sortAscending = false
                    }
                } label: {
                    HStack(spacing: 2) {
                        Text(stat.label)
                        if sortStatId == stat.id {
                            Image(systemName: sortAscending ? "chevron.up" : "chevron.down")
                                .imageScale(.small)
                        }
                    }
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(sortStatId == stat.id ? .accentColor : .secondary)
                    .frame(minWidth: 44, alignment: .trailing)
                }
                .buttonStyle(.plain)
            }
        }
        .font(.caption2)
        .foregroundStyle(.secondary)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color(.systemGroupedBackground))
    }
}

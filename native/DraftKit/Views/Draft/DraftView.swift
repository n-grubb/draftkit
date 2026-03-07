import SwiftUI

struct DraftView: View {
    @Binding var activeSheet: ActiveSheet?
    @Environment(DraftState.self) private var draftState
    @Environment(AppState.self) private var appState

    @State private var selectedTab: DraftTab = .board

    enum DraftTab: String, CaseIterable {
        case board = "Board"
        case players = "Players"
        case myTeam = "My Team"
    }

    var body: some View {
        Group {
            if UIDevice.current.userInterfaceIdiom == .pad {
                iPadLayout
            } else {
                iPhoneLayout
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 12) {
                    currentPickBadge
                    Button {
                        activeSheet = .draftSettings
                    } label: {
                        Image(systemName: "gearshape")
                    }
                }
            }
        }
    }

    // MARK: - iPad: split view

    private var iPadLayout: some View {
        HStack(spacing: 0) {
            DraftBoard()
                .frame(maxWidth: .infinity)
            Divider()
            VStack(spacing: 0) {
                TeamStatsView()
                    .frame(height: 280)
                Divider()
                PlayerListView(activeSheet: $activeSheet)
            }
            .frame(width: 340)
        }
    }

    // MARK: - iPhone: tabbed layout

    private var iPhoneLayout: some View {
        VStack(spacing: 0) {
            Picker("View", selection: $selectedTab) {
                ForEach(DraftTab.allCases, id: \.self) { tab in
                    Text(tab.rawValue).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 8)

            switch selectedTab {
            case .board:
                DraftBoard()
            case .players:
                PlayerListView(activeSheet: $activeSheet)
            case .myTeam:
                TeamStatsView()
            }
        }
    }

    // MARK: - Current pick badge

    private var currentPickBadge: some View {
        VStack(alignment: .trailing, spacing: 1) {
            if draftState.isDraftComplete {
                Text("Draft Complete")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.green)
            } else {
                Text("Pick \(draftState.currentPick)")
                    .font(.caption2.weight(.bold))
                Text(draftState.isMyTurn ? "YOUR TURN" : "Team \(draftState.currentTeam)")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(draftState.isMyTurn ? .green : .secondary)
            }
        }
    }
}

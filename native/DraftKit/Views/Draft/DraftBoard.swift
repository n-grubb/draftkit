import SwiftUI

struct DraftBoard: View {
    @Environment(DraftState.self) private var draftState
    @Environment(AppState.self) private var appState

    private let cellWidth: CGFloat = 90
    private let cellHeight: CGFloat = 52

    var body: some View {
        ScrollView([.horizontal, .vertical]) {
            VStack(spacing: 0) {
                // Header row
                HStack(spacing: 0) {
                    roundHeaderCell
                    ForEach(1...draftState.totalTeams, id: \.self) { team in
                        Text("T\(team)")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(team == draftState.myDraftSlot ? .accentColor : .secondary)
                            .frame(width: cellWidth, height: 28)
                            .background(team == draftState.myDraftSlot ? Color.accentColor.opacity(0.08) : Color.clear)
                    }
                }

                Divider()

                // Draft rounds
                ForEach(0..<draftState.totalRounds, id: \.self) { round in
                    HStack(spacing: 0) {
                        // Round label
                        Text("R\(round + 1)")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.secondary)
                            .frame(width: 32, height: cellHeight)
                            .background(Color(.secondarySystemBackground))

                        ForEach(1...draftState.totalTeams, id: \.self) { teamIndex in
                            let pick = pickNumber(round: round, teamIndex: teamIndex)
                            DraftCell(
                                pick: pick,
                                isCurrentPick: pick == draftState.currentPick,
                                isMyPick: draftState.getCurrentTeam(for: pick) == draftState.myDraftSlot,
                                playerId: draftState.draftedPlayers[pick],
                                players: appState.players,
                                teams: appState.teams
                            )
                            .frame(width: cellWidth, height: cellHeight)
                        }
                    }

                    if round < draftState.totalRounds - 1 {
                        Divider().padding(.leading, 32)
                    }
                }
            }
        }
        .background(Color(.systemBackground))
    }

    private var roundHeaderCell: some View {
        Color.clear.frame(width: 32, height: 28)
    }

    private func pickNumber(round: Int, teamIndex: Int) -> Int {
        // For display: map team column index to pick number in snake draft
        let isEvenRound = round % 2 == 1
        let teamInPick = isEvenRound ? (draftState.totalTeams - teamIndex + 1) : teamIndex
        return round * draftState.totalTeams + teamInPick
    }
}

struct DraftCell: View {
    let pick: Int
    let isCurrentPick: Bool
    let isMyPick: Bool
    let playerId: String?
    let players: [String: Player]
    let teams: [String: Team]

    private var player: Player? {
        playerId.flatMap { players[$0] }
    }

    private var teamColor: Color {
        player.flatMap { teams[$0.teamId] }.map { Color(hex: $0.color) } ?? .secondary
    }

    var body: some View {
        ZStack {
            background

            if let player {
                VStack(spacing: 2) {
                    Text(player.name.components(separatedBy: " ").last ?? player.name)
                        .font(.system(size: 9, weight: .semibold))
                        .lineLimit(1)
                    Text(player.pos.first ?? "")
                        .font(.system(size: 8))
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 4)
            } else if isCurrentPick {
                Image(systemName: "arrow.down.circle.fill")
                    .font(.title3)
                    .foregroundStyle(.accentColor)
                    .symbolEffect(.pulse)
            } else {
                Text("\(pick)")
                    .font(.system(size: 9))
                    .foregroundStyle(.tertiary)
            }
        }
        .overlay(
            Rectangle()
                .stroke(isCurrentPick ? Color.accentColor : Color.clear, lineWidth: 2)
        )
    }

    @ViewBuilder
    private var background: some View {
        if player != nil {
            teamColor.opacity(isMyPick ? 0.25 : 0.10)
        } else if isMyPick {
            Color.accentColor.opacity(0.05)
        } else {
            Color.clear
        }
    }
}

import SwiftUI

struct PlayerRow: View {
    let player: Player
    let rank: Int
    let rankData: PlayerRankData?
    let visibleStats: [StatDefinition]
    let teams: [String: Team]
    let mode: AppMode
    var onDraft: (() -> Void)?
    var onTapName: (() -> Void)?

    private var teamColor: Color {
        teams[player.teamId].map { Color(hex: $0.color) } ?? .secondary
    }

    var body: some View {
        HStack(spacing: 10) {
            // Rank number
            Text("\(rank)")
                .font(.system(.caption2, design: .monospaced))
                .foregroundStyle(.secondary)
                .frame(width: 28, alignment: .trailing)

            // Headshot
            PlayerHeadshot(url: player.headshot, teamColor: teamColor, size: 36)

            // Name + position + team
            VStack(alignment: .leading, spacing: 2) {
                Button(action: { onTapName?() }) {
                    HStack(spacing: 4) {
                        Text(player.name)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(rankData?.ignore == true ? .secondary : .primary)
                            .lineLimit(1)
                        if rankData?.highlight == true {
                            Image(systemName: "star.fill")
                                .font(.system(size: 9))
                                .foregroundStyle(.yellow)
                        }
                        if let status = player.injuryStatus, status != .active {
                            InjuryBadge(status: status)
                        }
                    }
                }
                .buttonStyle(.plain)

                HStack(spacing: 4) {
                    Text(player.pos.joined(separator: ", "))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Circle()
                        .fill(teamColor)
                        .frame(width: 6, height: 6)
                    Text(teams[player.teamId]?.name ?? player.teamId)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            // Note indicator
            if let note = rankData?.note, !note.isEmpty {
                Image(systemName: "note.text")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            // Stat cells
            if player.isBatter {
                ForEach(visibleStats.filter { StatDefinition.allBatting.map(\.id).contains($0.id) }) { stat in
                    StatCell(value: player.projections?.value(for: stat.id), statId: stat.id, isBatter: true)
                }
            } else {
                ForEach(visibleStats.filter { StatDefinition.allPitching.map(\.id).contains($0.id) }) { stat in
                    StatCell(value: player.projections?.value(for: stat.id), statId: stat.id, isBatter: false)
                }
            }

            // Mode-specific action button
            if mode == .draft {
                Button(action: { onDraft?() }) {
                    Text("Draft")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color.accentColor, in: RoundedRectangle(cornerRadius: 6))
                        .foregroundStyle(.white)
                }
                .buttonStyle(.plain)
            } else if mode == .edit {
                EditActions(player: player)
            }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 12)
        .background(rowBackground)
        .opacity(rankData?.ignore == true ? 0.45 : 1.0)
    }

    @ViewBuilder
    private var rowBackground: some View {
        if rankData?.highlight == true {
            Color.yellow.opacity(0.08)
        } else {
            Color.clear
        }
    }
}

// MARK: - Sub-components

struct PlayerHeadshot: View {
    let url: String?
    let teamColor: Color
    let size: CGFloat

    var body: some View {
        Group {
            if let urlStr = url, let imageURL = URL(string: urlStr) {
                AsyncImage(url: imageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        fallbackAvatar
                    }
                }
            } else {
                fallbackAvatar
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(teamColor.opacity(0.6), lineWidth: 1.5))
    }

    private var fallbackAvatar: some View {
        Circle().fill(teamColor.opacity(0.2))
    }
}

struct InjuryBadge: View {
    let status: Player.InjuryStatus

    var body: some View {
        Text(status == .dayToDay ? "DTD" : "IL")
            .font(.system(size: 8, weight: .bold))
            .padding(.horizontal, 4)
            .padding(.vertical, 1)
            .background(status == .dayToDay ? Color.orange : Color.red, in: RoundedRectangle(cornerRadius: 3))
            .foregroundStyle(.white)
    }
}

struct EditActions: View {
    let player: Player
    @Environment(AppState.self) private var appState

    var body: some View {
        HStack(spacing: 4) {
            Button {
                appState.highlightPlayer(player.id)
            } label: {
                Image(systemName: appState.activeRanking?.players[player.id]?.highlight == true ? "star.fill" : "star")
                    .font(.caption)
                    .foregroundStyle(.yellow)
            }
            .buttonStyle(.plain)

            Button {
                appState.ignorePlayer(player.id)
            } label: {
                Image(systemName: appState.activeRanking?.players[player.id]?.ignore == true ? "eye.slash.fill" : "eye.slash")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
        }
    }
}

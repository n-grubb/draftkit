import SwiftUI

struct PlayerCardView: View {
    let player: Player
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    private var teamColor: Color {
        appState.teams[player.teamId].map { Color(hex: $0.color) } ?? .accentColor
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerSection
                    if let projections = player.projections {
                        statsSection(title: "2026 Projections", stats: projections, highlight: true)
                    }
                    if let stats2025 = player.stats["2025"] {
                        statsSection(title: "2025 Actual", stats: stats2025)
                    }
                    if let stats2024 = player.stats["2024"] {
                        statsSection(title: "2024 Actual", stats: stats2024)
                    }
                    if let projections = player.projections {
                        radarSection(projections: projections)
                    }
                    noteSection
                }
                .padding()
            }
            .navigationTitle(player.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(spacing: 16) {
            PlayerHeadshot(url: player.headshot, teamColor: teamColor, size: 72)

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    ForEach(player.pos, id: \.self) { pos in
                        Text(pos)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(teamColor.opacity(0.15), in: RoundedRectangle(cornerRadius: 5))
                            .foregroundStyle(teamColor)
                    }
                    if let status = player.injuryStatus, status != .active {
                        InjuryBadge(status: status)
                    }
                }
                if let team = appState.teams[player.teamId] {
                    HStack(spacing: 6) {
                        if let logoURL = team.logo.flatMap({ URL(string: $0.href) }) {
                            AsyncImage(url: logoURL) { image in
                                image.resizable().scaledToFit()
                            } placeholder: {
                                Circle().fill(teamColor.opacity(0.3))
                            }
                            .frame(width: 20, height: 20)
                        }
                        Text(team.name)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                if let adp = player.averageDraftPosition {
                    HStack(spacing: 4) {
                        Text("ADP")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.secondary)
                        Text(String(format: "%.1f", adp))
                            .font(.caption2)
                        if let change = player.adpChange, change != 0 {
                            Text(change > 0 ? "+\(String(format: "%.1f", change))%" : "\(String(format: "%.1f", change))%")
                                .font(.caption2)
                                .foregroundStyle(change > 0 ? .green : .red)
                        }
                    }
                }
            }
            Spacer()
        }
        .padding()
        .background(teamColor.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Stats table

    private func statsSection(title: String, stats: PlayerStats, highlight: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            let statIds = player.isBatter
                ? StatDefinition.allBatting.map(\.id)
                : StatDefinition.allPitching.map(\.id)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 4), spacing: 12) {
                ForEach(statIds, id: \.self) { statId in
                    VStack(spacing: 2) {
                        Text(statId)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        if let value = stats.value(for: statId) {
                            Text(value.formatted(for: statId))
                                .font(.system(.subheadline, design: .monospaced).weight(highlight ? .semibold : .regular))
                                .foregroundStyle(value.statColor(for: statId, isBatter: player.isBatter))
                        } else {
                            Text("—")
                                .font(.subheadline)
                                .foregroundStyle(.tertiary)
                        }
                    }
                }
            }
            .padding()
            .background(highlight ? teamColor.opacity(0.05) : Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Radar chart

    private func radarSection(projections: PlayerStats) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Skill Ratings")
                .font(.headline)
            let axes = radarAxes(for: projections)
            RadarChartView(axes: axes, fillColor: teamColor, title: "")
                .frame(height: 200)
                .padding()
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 10))
        }
    }

    private func radarAxes(for stats: PlayerStats) -> [RadarAxis] {
        if player.isBatter {
            return [
                .init(id: "HR", label: "Power", value: normalize(stats.hr, min: 0, max: 45)),
                .init(id: "SB", label: "Speed", value: normalize(stats.sb, min: 0, max: 50)),
                .init(id: "AVG", label: "Avg", value: normalize(stats.avg, min: 0.200, max: 0.330)),
                .init(id: "RBI", label: "RBI", value: normalize(stats.rbi, min: 0, max: 120)),
                .init(id: "OBP", label: "OBP", value: normalize(stats.obp, min: 0.280, max: 0.420)),
                .init(id: "R", label: "Runs", value: normalize(stats.r, min: 0, max: 120)),
            ]
        } else {
            return [
                .init(id: "K", label: "K", value: normalize(stats.k, min: 0, max: 300)),
                .init(id: "ERA", label: "ERA", value: normalize(stats.era, min: 6.0, max: 2.5, invert: true)),
                .init(id: "WHIP", label: "WHIP", value: normalize(stats.whip, min: 1.6, max: 0.9, invert: true)),
                .init(id: "W", label: "Wins", value: normalize(stats.w, min: 0, max: 20)),
                .init(id: "SVHD", label: "SV+H", value: normalize(stats.svhd, min: 0, max: 40)),
                .init(id: "IP", label: "IP", value: normalize(stats.ip, min: 0, max: 220)),
            ]
        }
    }

    private func normalize(_ value: Double?, min: Double, max: Double, invert: Bool = false) -> Double {
        guard let value else { return 0 }
        let clamped = Swift.min(Swift.max(value, Swift.min(min, max)), Swift.max(min, max))
        let normalized = (clamped - min) / (max - min)
        return invert ? 1 - normalized : normalized
    }

    // MARK: - Note section

    private var noteSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Personal Note")
                .font(.headline)
            NoteEditor(player: player)
        }
    }
}

struct NoteEditor: View {
    let player: Player
    @Environment(AppState.self) private var appState
    @State private var text: String = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        TextEditor(text: $text)
            .focused($isFocused)
            .frame(minHeight: 80)
            .padding(8)
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 10))
            .onAppear {
                text = appState.activeRanking?.players[player.id]?.note ?? ""
            }
            .onChange(of: isFocused) { _, focused in
                if !focused { appState.updateNote(player.id, note: text) }
            }
    }
}

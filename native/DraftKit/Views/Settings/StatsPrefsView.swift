import SwiftUI

struct StatsPrefsView: View {
    @Environment(StatsPrefs.self) private var prefs
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("Show all stats", isOn: Binding(
                        get: { prefs.expandedStatsView },
                        set: { prefs.expandedStatsView = $0 }
                    ))
                } footer: {
                    Text("When enabled, all available stats are shown regardless of your selection below.")
                }

                Section("Batting Columns") {
                    ForEach(StatDefinition.allBatting) { stat in
                        StatToggleRow(
                            stat: stat,
                            isSelected: prefs.selectedBattingStats.contains(stat.id),
                            onToggle: {
                                var ids = prefs.selectedBattingStats
                                if ids.contains(stat.id) {
                                    ids.removeAll { $0 == stat.id }
                                } else {
                                    ids.append(stat.id)
                                }
                                prefs.selectedBattingStats = ids
                            }
                        )
                        .disabled(prefs.expandedStatsView)
                    }
                }

                Section("Pitching Columns") {
                    ForEach(StatDefinition.allPitching) { stat in
                        StatToggleRow(
                            stat: stat,
                            isSelected: prefs.selectedPitchingStats.contains(stat.id),
                            onToggle: {
                                var ids = prefs.selectedPitchingStats
                                if ids.contains(stat.id) {
                                    ids.removeAll { $0 == stat.id }
                                } else {
                                    ids.append(stat.id)
                                }
                                prefs.selectedPitchingStats = ids
                            }
                        )
                        .disabled(prefs.expandedStatsView)
                    }
                }
            }
            .navigationTitle("Stats Columns")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Reset") { prefs.resetToDefaults() }
                        .foregroundStyle(.red)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct StatToggleRow: View {
    let stat: StatDefinition
    let isSelected: Bool
    let onToggle: () -> Void

    var body: some View {
        HStack {
            Text(stat.label)
                .font(.subheadline)
            Spacer()
            if isSelected {
                Image(systemName: "checkmark")
                    .foregroundStyle(.accentColor)
                    .font(.subheadline.weight(.semibold))
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { onToggle() }
    }
}

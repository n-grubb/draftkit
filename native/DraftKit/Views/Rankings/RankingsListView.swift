import SwiftUI

struct RankingsListView: View {
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss
    @State private var newName = ""
    @State private var showNewRankingField = false

    var body: some View {
        NavigationStack {
            List {
                if showNewRankingField {
                    Section {
                        HStack {
                            TextField("Rankings name…", text: $newName)
                                .textInputAutocapitalization(.words)
                            Button("Create") {
                                appState.createNewRanking(name: newName.isEmpty ? "My Rankings" : newName)
                                newName = ""
                                showNewRankingField = false
                                dismiss()
                            }
                            .disabled(false)
                        }
                    }
                }

                Section("Saved Rankings") {
                    ForEach(appState.savedRankings) { meta in
                        RankingRow(
                            meta: meta,
                            isActive: appState.activeRanking?.id == meta.id,
                            onSelect: {
                                appState.switchRanking(id: meta.id)
                                dismiss()
                            }
                        )
                    }
                    .onDelete { offsets in
                        for i in offsets {
                            appState.deleteRanking(id: appState.savedRankings[i].id)
                        }
                    }
                }
            }
            .navigationTitle("Rankings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showNewRankingField.toggle()
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
        }
    }
}

struct RankingRow: View {
    let meta: SavedRankingMeta
    let isActive: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(meta.name ?? "Untitled Rankings")
                            .font(.subheadline.weight(isActive ? .semibold : .regular))
                            .foregroundStyle(.primary)
                        if meta.isShared {
                            Image(systemName: "link")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    if let author = meta.author {
                        Text("by \(author)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text(Date(timeIntervalSince1970: meta.updatedAt), style: .relative)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
                Spacer()
                if isActive {
                    Image(systemName: "checkmark")
                        .foregroundStyle(.accentColor)
                }
            }
        }
        .buttonStyle(.plain)
    }
}

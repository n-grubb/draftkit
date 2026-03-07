import SwiftUI

struct LoadSharedRankingView: View {
    var onLoaded: (() -> Void)?
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var rankingId = ""
    @State private var isLoading = false
    @State private var loadError: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Ranking ID", text: $rankingId)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                } header: {
                    Text("Load shared rankings")
                } footer: {
                    Text("Enter the ranking ID from a shared link.")
                }

                if let error = loadError {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Load Rankings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    if isLoading {
                        ProgressView()
                    } else {
                        Button("Load") { load() }
                            .disabled(rankingId.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
            }
        }
    }

    private func load() {
        isLoading = true
        loadError = nil
        let id = rankingId.trimmingCharacters(in: .whitespaces)
        Task {
            do {
                try await appState.loadSharedRanking(id: id)
                await MainActor.run {
                    isLoading = false
                    onLoaded?()
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    loadError = "Could not load rankings: \(error.localizedDescription)"
                    isLoading = false
                }
            }
        }
    }
}

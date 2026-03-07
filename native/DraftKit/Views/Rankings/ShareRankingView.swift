import SwiftUI

struct ShareRankingView: View {
    var onShared: ((URL) -> Void)?
    @Environment(AppState.self) private var appState
    @Environment(\.dismiss) private var dismiss

    @State private var author = ""
    @State private var description = ""
    @State private var pin = ""
    @State private var usePIN = false
    @State private var isSharing = false
    @State private var shareError: String?
    @State private var sharedURL: URL?

    var body: some View {
        NavigationStack {
            Form {
                Section("About your rankings") {
                    TextField("Your name (optional)", text: $author)
                    TextField("Description (optional)", text: $description, axis: .vertical)
                        .lineLimit(3)
                }

                Section {
                    Toggle("Protect with PIN", isOn: $usePIN.animation())
                    if usePIN {
                        SecureField("4–6 digit PIN", text: $pin)
                            .keyboardType(.numberPad)
                    }
                } header: {
                    Text("Security")
                } footer: {
                    if usePIN {
                        Text("Anyone with the link can view. Only you (with the PIN) can edit.")
                    }
                }

                if let url = sharedURL {
                    Section("Share Link") {
                        HStack {
                            Text(url.absoluteString)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                            Spacer()
                            Button {
                                UIPasteboard.general.string = url.absoluteString
                                onShared?(url)
                            } label: {
                                Image(systemName: "doc.on.doc")
                            }
                        }
                        ShareLink(item: url) {
                            Label("Share…", systemImage: "square.and.arrow.up")
                        }
                    }
                }

                if let error = shareError {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Share Rankings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    if isSharing {
                        ProgressView()
                    } else {
                        Button("Share") { share() }
                            .disabled(usePIN && (pin.count < 4 || pin.count > 6 || !pin.allSatisfy(\.isNumber)))
                    }
                }
            }
        }
    }

    private func share() {
        isSharing = true
        shareError = nil
        Task {
            do {
                let url = try await appState.shareRanking(
                    author: author.isEmpty ? "Anonymous" : author,
                    description: description,
                    pin: usePIN ? pin : nil
                )
                await MainActor.run {
                    sharedURL = url
                    isSharing = false
                }
            } catch {
                await MainActor.run {
                    shareError = "Failed to share: \(error.localizedDescription)"
                    isSharing = false
                }
            }
        }
    }
}

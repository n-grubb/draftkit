import SwiftUI

enum ActiveSheet: Identifiable {
    case rankings
    case share
    case statsPrefs
    case playerCard(Player)
    case draftSettings
    case loadShared

    var id: String {
        switch self {
        case .rankings: return "rankings"
        case .share: return "share"
        case .statsPrefs: return "statsPrefs"
        case .playerCard(let p): return "playerCard_\(p.id)"
        case .draftSettings: return "draftSettings"
        case .loadShared: return "loadShared"
        }
    }
}

struct ContentView: View {
    @Environment(AppState.self) private var appState
    @State private var activeSheet: ActiveSheet?
    @State private var showToast = false
    @State private var toastMessage = ""

    var body: some View {
        Group {
            if appState.isLoading {
                loadingView
            } else if let error = appState.loadError {
                errorView(error)
            } else {
                mainContent
            }
        }
        .sheet(item: $activeSheet) { sheet in
            sheetContent(sheet)
        }
        .overlay(alignment: .bottom) {
            if showToast {
                ToastView(message: toastMessage)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .padding(.bottom, 40)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: showToast)
        .onChange(of: appState.hasUnsavedChanges) { _, hasChanges in
            if hasChanges { showToastMessage("Unsaved changes") }
        }
    }

    // MARK: - Main content

    private var mainContent: some View {
        NavigationStack {
            Group {
                if appState.mode == .draft {
                    DraftView(activeSheet: $activeSheet)
                } else {
                    PlayerListView(activeSheet: $activeSheet)
                }
            }
            .navigationTitle(appState.activeRanking?.name ?? "DraftKit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarContent }
        }
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            Button {
                activeSheet = .rankings
            } label: {
                Image(systemName: "list.bullet")
            }
        }

        ToolbarItem(placement: .principal) {
            Picker("Mode", selection: Binding(
                get: { appState.mode },
                set: { appState.mode = $0 }
            )) {
                Text("View").tag(AppMode.view)
                Text("Edit").tag(AppMode.edit)
                Text("Draft").tag(AppMode.draft)
            }
            .pickerStyle(.segmented)
            .frame(width: 220)
        }

        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                Button("Share Rankings") { activeSheet = .share }
                Button("Load Shared Rankings") { activeSheet = .loadShared }
                Divider()
                Button("New Rankings") { appState.createNewRanking() }
                if appState.hasUnsavedChanges {
                    Button("Save Changes") { appState.saveChanges() }
                }
            } label: {
                Image(systemName: "ellipsis.circle")
            }
        }
    }

    // MARK: - Sheet content

    @ViewBuilder
    private func sheetContent(_ sheet: ActiveSheet) -> some View {
        switch sheet {
        case .rankings:
            RankingsListView()
        case .share:
            ShareRankingView(onShared: { url in
                showToastMessage("Link copied!")
                UIPasteboard.general.string = url.absoluteString
            })
        case .statsPrefs:
            StatsPrefsView()
        case .playerCard(let player):
            PlayerCardView(player: player)
        case .draftSettings:
            DraftSettingsView()
        case .loadShared:
            LoadSharedRankingView(onLoaded: { showToastMessage("Rankings loaded!") })
        }
    }

    // MARK: - Loading / Error

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)
            Text("Loading players…")
                .foregroundStyle(.secondary)
        }
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.red)
            Text("Failed to load")
                .font(.headline)
            Text(message)
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Retry") { Task { await appState.loadData() } }
                .buttonStyle(.borderedProminent)
        }
        .padding()
    }

    // MARK: - Toast helper

    private func showToastMessage(_ message: String) {
        toastMessage = message
        withAnimation { showToast = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            withAnimation { showToast = false }
        }
    }
}

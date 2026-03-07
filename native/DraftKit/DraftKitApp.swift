import SwiftUI

@main
struct DraftKitApp: App {
    @State private var appState = AppState()
    @State private var draftState = DraftState()
    @State private var statsPrefs = StatsPrefs()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
                .environment(draftState)
                .environment(statsPrefs)
                .task { await appState.loadData() }
        }
    }
}

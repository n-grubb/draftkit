import SwiftUI

struct DraftSettingsView: View {
    @Environment(DraftState.self) private var draftState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("League Setup") {
                    @Bindable var draft = draftState
                    Stepper("Teams: \(draftState.totalTeams)", value: $draft.totalTeams, in: 8...16)
                    Stepper("Rounds: \(draftState.totalRounds)", value: $draft.totalRounds, in: 20...30)
                }

                Section("Your Draft Slot") {
                    @Bindable var draft = draftState
                    Picker("Pick", selection: $draft.myDraftSlot) {
                        ForEach(1...draftState.totalTeams, id: \.self) { slot in
                            Text("Pick \(slot)").tag(slot)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(height: 120)
                }

                Section {
                    Button(role: .destructive) {
                        draftState.restartDraft()
                        dismiss()
                    } label: {
                        Label("Restart Draft", systemImage: "arrow.counterclockwise")
                    }
                }
            }
            .navigationTitle("Draft Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

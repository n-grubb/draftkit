import Foundation
import SwiftUI

enum AppMode: String {
    case view, edit, draft
}

@Observable
final class AppState {
    var mode: AppMode = .view
    var players: [String: Player] = [:]
    var teams: [String: Team] = [:]
    var activeRanking: Ranking?
    var savedRankings: [SavedRankingMeta] = []
    var isLoading = false
    var loadError: String?
    var pin: String?
    var hasUnsavedChanges = false

    // MARK: - Startup

    func loadData() async {
        await MainActor.run { isLoading = true; loadError = nil }
        do {
            async let fetchedPlayers = BaseballAPI.shared.fetchPlayers()
            async let fetchedTeams = BaseballAPI.shared.fetchTeams()
            let (p, t) = try await (fetchedPlayers, fetchedTeams)
            await MainActor.run {
                self.players = p
                self.teams = t
                self.isLoading = false
            }
            loadSavedRankings()
            if activeRanking == nil { bootstrapRanking() }
        } catch {
            await MainActor.run {
                self.loadError = error.localizedDescription
                self.isLoading = false
            }
        }
    }

    func refreshPlayers() async {
        do {
            let p = try await BaseballAPI.shared.fetchPlayersIgnoringCache()
            await MainActor.run { self.players = p }
        } catch {}
    }

    // MARK: - Rankings persistence

    private func loadSavedRankings() {
        let metas: [SavedRankingMeta] = UserDefaults.standard.decodable([SavedRankingMeta].self, forKey: "storedRankings") ?? []
        savedRankings = metas
        if let first = metas.first {
            activeRanking = loadRankingLocally(id: first.id)
        }
    }

    private func bootstrapRanking() {
        let id = "local_\(Int(Date().timeIntervalSince1970 * 1000))"
        var playerMap: [String: PlayerRankData] = [:]
        for (index, player) in players.values.sorted(by: { $0.averageDraftPosition ?? 999 < $1.averageDraftPosition ?? 999 }).enumerated() {
            playerMap[player.id] = PlayerRankData(rank: index, highlight: false, ignore: false, note: nil)
        }
        let ranking = Ranking(id: id, name: "My Rankings", author: nil, description: nil, players: playerMap, createdAt: Date().timeIntervalSince1970, updatedAt: Date().timeIntervalSince1970)
        saveRankingLocally(ranking)
        activeRanking = ranking
        appendToSavedList(ranking)
    }

    func createNewRanking(name: String = "My Rankings") {
        let id = "local_\(Int(Date().timeIntervalSince1970 * 1000))"
        var playerMap: [String: PlayerRankData] = [:]
        for (index, player) in players.values.sorted(by: { $0.averageDraftPosition ?? 999 < $1.averageDraftPosition ?? 999 }).enumerated() {
            playerMap[player.id] = PlayerRankData(rank: index, highlight: false, ignore: false, note: nil)
        }
        let ranking = Ranking(id: id, name: name, author: nil, description: nil, players: playerMap, createdAt: Date().timeIntervalSince1970, updatedAt: Date().timeIntervalSince1970)
        saveRankingLocally(ranking)
        activeRanking = ranking
        appendToSavedList(ranking)
        hasUnsavedChanges = false
    }

    func switchRanking(id: String) {
        guard let r = loadRankingLocally(id: id) else { return }
        activeRanking = r
        hasUnsavedChanges = false
    }

    func deleteRanking(id: String) {
        guard id != activeRanking?.id else { return }
        UserDefaults.standard.removeObject(forKey: "ranking_\(id)")
        savedRankings.removeAll { $0.id == id }
        UserDefaults.standard.setEncodable(savedRankings, forKey: "storedRankings")
    }

    func loadSharedRanking(id: String) async throws {
        let response = try await RankingAPI.shared.fetchRanking(id: id)
        let ranking = Ranking(id: response.id, name: response.name, author: response.author, description: response.description, players: response.players, createdAt: response.createdAt, updatedAt: response.updatedAt)
        saveRankingLocally(ranking)
        activeRanking = ranking
        appendToSavedList(ranking)
    }

    func shareRanking(author: String, description: String, pin: String?) async throws -> URL {
        guard let ranking = activeRanking else { throw URLError(.badURL) }
        let response = try await RankingAPI.shared.createRanking(players: ranking.players, author: author, description: description.isEmpty ? nil : description, pin: pin?.isEmpty == false ? pin : nil)
        let sharedRanking = Ranking(id: response.id, name: response.name ?? ranking.name, author: response.author, description: response.description, players: response.players, createdAt: response.createdAt, updatedAt: response.updatedAt)
        saveRankingLocally(sharedRanking)
        activeRanking = sharedRanking
        updateSavedList(sharedRanking, isShared: true)
        if let pin { self.pin = pin }
        guard let url = URL(string: "\(Constants.apiBaseURL)?id=\(response.id)") else { throw URLError(.badURL) }
        return url
    }

    // MARK: - Ranking mutations

    func updateRanking(orderedIds: [String]) {
        guard var ranking = activeRanking else { return }
        for (index, id) in orderedIds.enumerated() {
            ranking.players[id]?.rank = index
        }
        ranking = Ranking(id: ranking.id, name: ranking.name, author: ranking.author, description: ranking.description, players: ranking.players, createdAt: ranking.createdAt, updatedAt: Date().timeIntervalSince1970)
        activeRanking = ranking
        saveRankingLocally(ranking)
        hasUnsavedChanges = true
        Task { await syncIfShared(ranking) }
    }

    func highlightPlayer(_ id: String) {
        guard var ranking = activeRanking else { return }
        ranking.players[id]?.highlight.toggle()
        activeRanking = ranking
        saveRankingLocally(ranking)
        hasUnsavedChanges = true
    }

    func ignorePlayer(_ id: String) {
        guard var ranking = activeRanking else { return }
        ranking.players[id]?.ignore.toggle()
        activeRanking = ranking
        saveRankingLocally(ranking)
        hasUnsavedChanges = true
    }

    func updateNote(_ playerId: String, note: String) {
        guard var ranking = activeRanking else { return }
        ranking.players[playerId]?.note = note.isEmpty ? nil : note
        activeRanking = ranking
        saveRankingLocally(ranking)
    }

    func saveChanges() {
        hasUnsavedChanges = false
        guard let ranking = activeRanking else { return }
        Task { await syncIfShared(ranking) }
    }

    // MARK: - Helpers

    private func loadRankingLocally(id: String) -> Ranking? {
        UserDefaults.standard.decodable(Ranking.self, forKey: "ranking_\(id)")
    }

    private func saveRankingLocally(_ ranking: Ranking) {
        UserDefaults.standard.setEncodable(ranking, forKey: "ranking_\(ranking.id)")
    }

    private func appendToSavedList(_ ranking: Ranking) {
        savedRankings.removeAll { $0.id == ranking.id }
        savedRankings.insert(SavedRankingMeta(id: ranking.id, name: ranking.name, author: ranking.author, updatedAt: ranking.updatedAt, isShared: !ranking.isLocal), at: 0)
        if savedRankings.count > Constants.maxLocalRankings { savedRankings = Array(savedRankings.prefix(Constants.maxLocalRankings)) }
        UserDefaults.standard.setEncodable(savedRankings, forKey: "storedRankings")
    }

    private func updateSavedList(_ ranking: Ranking, isShared: Bool) {
        if let i = savedRankings.firstIndex(where: { $0.id == ranking.id }) {
            savedRankings[i] = SavedRankingMeta(id: ranking.id, name: ranking.name, author: ranking.author, updatedAt: ranking.updatedAt, isShared: isShared)
        } else {
            appendToSavedList(ranking)
        }
        UserDefaults.standard.setEncodable(savedRankings, forKey: "storedRankings")
    }

    private func syncIfShared(_ ranking: Ranking) async {
        guard !ranking.isLocal, let pin else { return }
        _ = try? await RankingAPI.shared.updateRanking(id: ranking.id, players: ranking.players, pin: pin)
    }
}

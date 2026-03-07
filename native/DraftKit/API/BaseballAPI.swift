import Foundation

actor BaseballAPI {
    static let shared = BaseballAPI()
    private let base = Constants.apiBaseURL

    // MARK: - Players

    func fetchPlayers() async throws -> [String: Player] {
        let cached = loadCachedPlayers()
        if let cached { return cached }

        let url = URL(string: "\(base)/players")!
        let (data, _) = try await URLSession.shared.data(from: url)
        let array = try JSONDecoder().decode([Player].self, from: data)
        let map = Dictionary(uniqueKeysWithValues: array.map { ($0.id, $0) })
        cachePlayers(map, raw: data)
        return map
    }

    func fetchPlayersIgnoringCache() async throws -> [String: Player] {
        clearPlayersCache()
        return try await fetchPlayers()
    }

    // MARK: - Teams

    func fetchTeams() async throws -> [String: Team] {
        if let cached: [String: Team] = UserDefaults.standard.decodable([String: Team].self, forKey: "cachedTeams") {
            return cached
        }
        let url = URL(string: "\(base)/teams")!
        let (data, _) = try await URLSession.shared.data(from: url)
        let array = try JSONDecoder().decode([Team].self, from: data)
        let map = Dictionary(uniqueKeysWithValues: array.map { ($0.id, $0) })
        UserDefaults.standard.setEncodable(map, forKey: "cachedTeams")
        return map
    }

    // MARK: - Cache helpers

    private func loadCachedPlayers() -> [String: Player]? {
        let ts = UserDefaults.standard.double(forKey: "cachedPlayersTimestamp")
        guard ts > 0, Date().timeIntervalSince1970 - ts < Constants.playersCacheTTL else { return nil }
        return UserDefaults.standard.decodable([String: Player].self, forKey: "cachedPlayers")
    }

    private func cachePlayers(_ map: [String: Player], raw: Data) {
        UserDefaults.standard.setEncodable(map, forKey: "cachedPlayers")
        UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: "cachedPlayersTimestamp")
    }

    private func clearPlayersCache() {
        UserDefaults.standard.removeObject(forKey: "cachedPlayers")
        UserDefaults.standard.removeObject(forKey: "cachedPlayersTimestamp")
    }
}

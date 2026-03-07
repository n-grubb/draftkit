import Foundation

actor RankingAPI {
    static let shared = RankingAPI()
    private let base = Constants.apiBaseURL

    func fetchRanking(id: String) async throws -> RankingResponse {
        let url = URL(string: "\(base)/ranking/\(id)")!
        let (data, response) = try await URLSession.shared.data(from: url)
        try validate(response)
        return try JSONDecoder().decode(RankingResponse.self, from: data)
    }

    func createRanking(players: [String: PlayerRankData], author: String?, description: String?, pin: String?) async throws -> RankingResponse {
        let url = URL(string: "\(base)/ranking")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body = CreateRankingRequest(players: players, author: author, description: description, pin: pin)
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response)
        return try JSONDecoder().decode(RankingResponse.self, from: data)
    }

    func updateRanking(id: String, players: [String: PlayerRankData]?, pin: String?) async throws -> RankingResponse {
        let url = URL(string: "\(base)/ranking/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body = UpdateRankingRequest(players: players, pin: pin)
        request.httpBody = try JSONEncoder().encode(body)
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(response)
        return try JSONDecoder().decode(RankingResponse.self, from: data)
    }

    func validatePin(id: String, pin: String) async throws -> Bool {
        let result = try await updateRanking(id: id, players: nil, pin: pin)
        return result.id == id
    }

    private func validate(_ response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }
}

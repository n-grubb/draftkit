import Foundation

struct Ranking: Codable, Identifiable {
    let id: String
    var name: String?
    var author: String?
    var description: String?
    var players: [String: PlayerRankData]
    var createdAt: TimeInterval
    var updatedAt: TimeInterval

    var isLocal: Bool { id.hasPrefix("local_") }
}

struct PlayerRankData: Codable {
    var rank: Int
    var highlight: Bool
    var ignore: Bool
    var note: String?
}

struct SavedRankingMeta: Codable, Identifiable {
    let id: String
    var name: String?
    var author: String?
    var updatedAt: TimeInterval
    var isShared: Bool
}

// Response shapes from the ranking API
struct RankingResponse: Decodable {
    let id: String
    let name: String?
    let author: String?
    let description: String?
    let players: [String: PlayerRankData]
    let createdAt: TimeInterval
    let updatedAt: TimeInterval
}

struct CreateRankingRequest: Encodable {
    let players: [String: PlayerRankData]
    let author: String?
    let description: String?
    let pin: String?
}

struct UpdateRankingRequest: Encodable {
    let players: [String: PlayerRankData]?
    let pin: String?
}

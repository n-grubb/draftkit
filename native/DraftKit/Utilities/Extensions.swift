import SwiftUI

// MARK: - Color from hex string

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Stat formatting

extension Double {
    func formatted(for statId: String) -> String {
        switch statId {
        case "AVG", "OBP", "SLG", "OPS":
            return String(format: "%.3f", self).replacingOccurrences(of: "^0", with: "", options: .regularExpression)
        case "ERA", "WHIP", "K/9", "K/BB":
            return String(format: "%.2f", self)
        default:
            if self == self.rounded() {
                return String(Int(self))
            }
            return String(format: "%.1f", self)
        }
    }

    func statColor(for statId: String, isBatter: Bool) -> Color {
        let thresholds = isBatter ? StatThresholds.batting : StatThresholds.pitching
        guard let (excellent, average) = thresholds[statId] else { return .primary }

        let lowerIsBetter = StatDefinition.allPitching.first(where: { $0.id == statId })?.lowerIsBetter
            ?? StatDefinition.allBatting.first(where: { $0.id == statId })?.lowerIsBetter
            ?? false

        if lowerIsBetter {
            if self <= excellent { return .green }
            if self >= average { return .red }
        } else {
            if self >= excellent { return .green }
            if self <= average { return .red }
        }
        return .orange
    }
}

// MARK: - UserDefaults JSON helpers

extension UserDefaults {
    func decodable<T: Decodable>(_ type: T.Type, forKey key: String) -> T? {
        guard let data = data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    func setEncodable<T: Encodable>(_ value: T, forKey key: String) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        set(data, forKey: key)
    }
}

// MARK: - Ranked players helper

extension AppState {
    var rankedPlayers: [Player] {
        guard let ranking else { return Array(players.values).sorted { $0.name < $1.name } }
        return players.values
            .sorted { a, b in
                let rankA = ranking.players[a.id]?.rank ?? Int.max
                let rankB = ranking.players[b.id]?.rank ?? Int.max
                return rankA < rankB
            }
    }
}

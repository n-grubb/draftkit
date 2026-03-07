import Foundation

enum Constants {
    static let apiBaseURL = "https://baseball-data.deno.dev"
    static let playersCacheTTL: TimeInterval = 86_400 // 24 hours
    static let maxLocalRankings = 10
}

// MARK: - Positions

enum Position: String, CaseIterable, Identifiable {
    case all = "All"
    case c = "C"
    case firstBase = "1B"
    case secondBase = "2B"
    case ss = "SS"
    case thirdBase = "3B"
    case of_ = "OF"
    case dh = "DH"
    case batters = "Batters"
    case sp = "SP"
    case rp = "RP"
    case pitchers = "Pitchers"

    var id: String { rawValue }

    var label: String { rawValue }

    func matches(_ player: Player) -> Bool {
        switch self {
        case .all: return true
        case .batters: return player.isBatter
        case .pitchers: return player.isPitcher
        default: return player.pos.contains(rawValue)
        }
    }
}

// MARK: - Stat Definitions

struct StatDefinition: Identifiable {
    let id: String
    let label: String
    let isAverage: Bool  // true = average across team, false = sum
    let lowerIsBetter: Bool

    static let allBatting: [StatDefinition] = [
        .init(id: "R",   label: "R",    isAverage: false, lowerIsBetter: false),
        .init(id: "HR",  label: "HR",   isAverage: false, lowerIsBetter: false),
        .init(id: "RBI", label: "RBI",  isAverage: false, lowerIsBetter: false),
        .init(id: "SB",  label: "SB",   isAverage: false, lowerIsBetter: false),
        .init(id: "OBP", label: "OBP",  isAverage: true,  lowerIsBetter: false),
        .init(id: "AB",  label: "AB",   isAverage: false, lowerIsBetter: false),
        .init(id: "PA",  label: "PA",   isAverage: false, lowerIsBetter: false),
        .init(id: "AVG", label: "AVG",  isAverage: true,  lowerIsBetter: false),
        .init(id: "KO",  label: "K",    isAverage: false, lowerIsBetter: true),
        .init(id: "CS",  label: "CS",   isAverage: false, lowerIsBetter: true),
        .init(id: "OPS", label: "OPS",  isAverage: true,  lowerIsBetter: false),
        .init(id: "SLG", label: "SLG",  isAverage: true,  lowerIsBetter: false),
        .init(id: "XBH", label: "XBH",  isAverage: false, lowerIsBetter: false),
        .init(id: "BB",  label: "BB",   isAverage: false, lowerIsBetter: false),
    ]

    static let defaultBatting = ["R", "HR", "RBI", "SB", "OBP"]

    static let allPitching: [StatDefinition] = [
        .init(id: "K",    label: "K",    isAverage: false, lowerIsBetter: false),
        .init(id: "W",    label: "W",    isAverage: false, lowerIsBetter: false),
        .init(id: "ERA",  label: "ERA",  isAverage: true,  lowerIsBetter: true),
        .init(id: "SVHD", label: "SVHD", isAverage: false, lowerIsBetter: false),
        .init(id: "WHIP", label: "WHIP", isAverage: true,  lowerIsBetter: true),
        .init(id: "IP",   label: "IP",   isAverage: false, lowerIsBetter: false),
        .init(id: "HD",   label: "HD",   isAverage: false, lowerIsBetter: false),
        .init(id: "SV",   label: "SV",   isAverage: false, lowerIsBetter: false),
        .init(id: "QS",   label: "QS",   isAverage: false, lowerIsBetter: false),
        .init(id: "K/9",  label: "K/9",  isAverage: true,  lowerIsBetter: false),
        .init(id: "K/BB", label: "K/BB", isAverage: true,  lowerIsBetter: false),
        .init(id: "BS",   label: "BS",   isAverage: false, lowerIsBetter: true),
        .init(id: "HRA",  label: "HRA",  isAverage: false, lowerIsBetter: true),
    ]

    static let defaultPitching = ["K", "W", "ERA", "SVHD", "WHIP"]
}

// MARK: - Draft

struct StarterThreshold {
    let position: String
    let threshold: Int
}

let starterThresholds: [StarterThreshold] = [
    .init(position: "C",  threshold: 1),
    .init(position: "1B", threshold: 1),
    .init(position: "2B", threshold: 1),
    .init(position: "3B", threshold: 1),
    .init(position: "SS", threshold: 1),
    .init(position: "OF", threshold: 3),
    .init(position: "SP", threshold: 5),
    .init(position: "RP", threshold: 2),
]

// MARK: - Stat quality thresholds (for color coding)

struct StatThresholds {
    // [excellent, average] — above excellent = green, below average = red
    static let batting: [String: (Double, Double)] = [
        "R":   (90, 60),
        "HR":  (30, 15),
        "RBI": (90, 60),
        "SB":  (20, 8),
        "AVG": (0.290, 0.255),
        "OBP": (0.360, 0.320),
        "SLG": (0.500, 0.420),
        "OPS": (0.860, 0.740),
        "AB":  (550, 450),
        "PA":  (620, 520),
        "XBH": (60, 35),
        "BB":  (70, 45),
    ]

    static let pitching: [String: (Double, Double)] = [
        "K":    (220, 140),
        "W":    (14, 8),
        "ERA":  (3.20, 4.00),   // reversed: lower is better
        "WHIP": (1.10, 1.30),   // reversed
        "SVHD": (30, 15),
        "IP":   (180, 130),
        "SV":   (25, 12),
        "QS":   (18, 10),
        "K/9":  (10.0, 8.0),
        "K/BB": (3.5, 2.5),
    ]
}

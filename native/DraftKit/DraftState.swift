import Foundation

struct TeamStats {
    var batting: [String: Double] = [:]
    var pitching: [String: Double] = [:]
}

@Observable
final class DraftState {
    var myDraftSlot: Int = 1
    var totalTeams: Int = 10
    var totalRounds: Int = 23
    var currentPick: Int = 1
    var draftedPlayers: [Int: String] = [:]  // pickNumber → playerId

    var totalPicks: Int { totalTeams * totalRounds }
    var isDraftComplete: Bool { currentPick > totalPicks }

    // MARK: - Snake draft logic

    func getCurrentTeam(for pick: Int) -> Int {
        let round = (pick - 1) / totalTeams
        let positionInRound = (pick - 1) % totalTeams
        let isEvenRound = round % 2 == 1
        return isEvenRound ? (totalTeams - positionInRound) : (positionInRound + 1)
    }

    var currentTeam: Int { getCurrentTeam(for: currentPick) }
    var isMyTurn: Bool { currentTeam == myDraftSlot }

    // MARK: - Mutations

    func draftPlayer(_ playerId: String) {
        guard !isDraftComplete else { return }
        draftedPlayers[currentPick] = playerId
        currentPick += 1
    }

    func undoLastPick() {
        guard currentPick > 1 else { return }
        currentPick -= 1
        draftedPlayers.removeValue(forKey: currentPick)
    }

    func restartDraft() {
        currentPick = 1
        draftedPlayers = [:]
    }

    func isDrafted(_ playerId: String) -> Bool {
        draftedPlayers.values.contains(playerId)
    }

    func playerIds(for team: Int) -> [String] {
        var picks: [String] = []
        for pick in 1...max(1, currentPick - 1) {
            if getCurrentTeam(for: pick) == team, let id = draftedPlayers[pick] {
                picks.append(id)
            }
        }
        return picks
    }

    // MARK: - Team stats calculations

    func teamStats(for team: Int, players: [String: Player]) -> TeamStats {
        let ids = playerIds(for: team)
        return calculateStats(playerIds: ids, players: players)
    }

    func leagueAverages(players: [String: Player]) -> TeamStats {
        let myTeam = myDraftSlot
        var allBatting: [String: [Double]] = [:]
        var allPitching: [String: [Double]] = [:]

        for team in 1...totalTeams {
            guard team != myTeam else { continue }
            let stats = teamStats(for: team, players: players)
            for (key, val) in stats.batting {
                allBatting[key, default: []].append(val)
            }
            for (key, val) in stats.pitching {
                allPitching[key, default: []].append(val)
            }
        }

        var result = TeamStats()
        for (key, values) in allBatting where !values.isEmpty {
            result.batting[key] = values.reduce(0, +) / Double(values.count)
        }
        for (key, values) in allPitching where !values.isEmpty {
            result.pitching[key] = values.reduce(0, +) / Double(values.count)
        }
        return result
    }

    private func calculateStats(playerIds: [String], players: [String: Player]) -> TeamStats {
        var result = TeamStats()
        let roster = playerIds.compactMap { players[$0] }
        let batters = roster.filter { $0.isBatter }
        let pitchers = roster.filter { $0.isPitcher }

        // Batting counting stats (sum)
        let battingCountStats = ["R", "HR", "RBI", "SB", "AB", "PA", "KO", "CS", "XBH", "BB"]
        // Batting averages (mean)
        let battingAvgStats = ["AVG", "OBP", "SLG", "OPS"]

        for statId in battingCountStats {
            let sum = batters.compactMap { $0.projections?.value(for: statId) }.reduce(0, +)
            if !batters.isEmpty { result.batting[statId] = sum }
        }
        for statId in battingAvgStats {
            let values = batters.compactMap { $0.projections?.value(for: statId) }
            if !values.isEmpty { result.batting[statId] = values.reduce(0, +) / Double(values.count) }
        }

        // Pitching counting stats (sum)
        let pitchingCountStats = ["K", "W", "SVHD", "IP", "HD", "SV", "QS", "BS", "HRA"]
        // Pitching weighted averages (weighted by IP)
        let pitchingWeightedStats = ["ERA", "WHIP"]
        // Pitching simple averages
        let pitchingAvgStats = ["K/9", "K/BB"]

        for statId in pitchingCountStats {
            let sum = pitchers.compactMap { $0.projections?.value(for: statId) }.reduce(0, +)
            if !pitchers.isEmpty { result.pitching[statId] = sum }
        }
        for statId in pitchingWeightedStats {
            let ips = pitchers.compactMap { $0.projections?.ip }
            let totalIP = ips.reduce(0, +)
            if totalIP > 0 {
                let weighted = pitchers.reduce(0.0) { acc, p in
                    guard let stat = p.projections?.value(for: statId), let ip = p.projections?.ip else { return acc }
                    return acc + stat * ip
                }
                result.pitching[statId] = weighted / totalIP
            }
        }
        for statId in pitchingAvgStats {
            let values = pitchers.compactMap { $0.projections?.value(for: statId) }
            if !values.isEmpty { result.pitching[statId] = values.reduce(0, +) / Double(values.count) }
        }

        return result
    }

    // MARK: - Starters remaining

    func startersRemaining(for team: Int, players: [String: Player]) -> [(position: String, drafted: Int, threshold: Int)] {
        let ids = playerIds(for: team)
        let roster = ids.compactMap { players[$0] }
        return starterThresholds.map { threshold in
            let count = roster.filter { $0.pos.contains(threshold.position) }.count
            return (threshold.position, count, threshold.threshold)
        }
    }
}

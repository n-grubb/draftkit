import Foundation

struct Player: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let pos: [String]
    let teamId: String
    let headshot: String?
    let averageDraftPosition: Double?
    let adpChange: Double?
    let ownership: Double?
    let injuryStatus: InjuryStatus?
    let stats: [String: PlayerStats]
    let projections: PlayerStats?

    enum InjuryStatus: String, Decodable {
        case active = "ACTIVE"
        case dayToDay = "DAY_TO_DAY"
        case injuredList = "INJURED_LIST"
    }

    enum CodingKeys: String, CodingKey {
        case id, name, pos, headshot
        case teamId = "team_id"
        case averageDraftPosition, adpChange, ownership, injuryStatus
        case stats, projections
    }

    var isBatter: Bool {
        pos.contains(where: { ["C","1B","2B","3B","SS","OF","DH"].contains($0) })
    }

    var isPitcher: Bool {
        pos.contains(where: { ["SP","RP"].contains($0) })
    }

    var primaryPosition: String {
        pos.first ?? "?"
    }
}

struct PlayerStats: Decodable, Hashable {
    // Batting
    let r: Double?
    let hr: Double?
    let rbi: Double?
    let sb: Double?
    let avg: Double?
    let obp: Double?
    let slg: Double?
    let ops: Double?
    let ab: Double?
    let pa: Double?
    let ko: Double?
    let cs: Double?
    let xbh: Double?
    let bb: Double?

    // Pitching
    let k: Double?
    let w: Double?
    let era: Double?
    let whip: Double?
    let svhd: Double?
    let ip: Double?
    let hd: Double?
    let sv: Double?
    let qs: Double?
    let kPer9: Double?
    let kbb: Double?
    let bs: Double?
    let hra: Double?
    let bbAllowed: Double?

    enum CodingKeys: String, CodingKey {
        case r = "R"
        case hr = "HR"
        case rbi = "RBI"
        case sb = "SB"
        case avg = "AVG"
        case obp = "OBP"
        case slg = "SLG"
        case ops = "OPS"
        case ab = "AB"
        case pa = "PA"
        case ko = "KO"
        case cs = "CS"
        case xbh = "XBH"
        case bb = "BB"
        case k = "K"
        case w = "W"
        case era = "ERA"
        case whip = "WHIP"
        case svhd = "SVHD"
        case ip = "IP"
        case hd = "HD"
        case sv = "SV"
        case qs = "QS"
        case kPer9 = "K/9"
        case kbb = "K/BB"
        case bs = "BS"
        case hra = "HRA"
        case bbAllowed = "BB"
    }

    func value(for statId: String) -> Double? {
        switch statId {
        case "R": return r
        case "HR": return hr
        case "RBI": return rbi
        case "SB": return sb
        case "AVG": return avg
        case "OBP": return obp
        case "SLG": return slg
        case "OPS": return ops
        case "AB": return ab
        case "PA": return pa
        case "KO": return ko
        case "CS": return cs
        case "XBH": return xbh
        case "BB": return bb
        case "K": return k
        case "W": return w
        case "ERA": return era
        case "WHIP": return whip
        case "SVHD": return svhd
        case "IP": return ip
        case "HD": return hd
        case "SV": return sv
        case "QS": return qs
        case "K/9": return kPer9
        case "K/BB": return kbb
        case "BS": return bs
        case "HRA": return hra
        default: return nil
        }
    }
}

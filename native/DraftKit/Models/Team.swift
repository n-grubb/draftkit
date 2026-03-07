import Foundation

struct Team: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let color: String
    let logo: TeamLogo?

    struct TeamLogo: Decodable, Hashable {
        let href: String
    }
}

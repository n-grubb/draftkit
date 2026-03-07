import SwiftUI

struct StatCell: View {
    let value: Double?
    let statId: String
    let isBatter: Bool

    var body: some View {
        if let value {
            Text(value.formatted(for: statId))
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(value.statColor(for: statId, isBatter: isBatter))
                .frame(minWidth: 44, alignment: .trailing)
        } else {
            Text("—")
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(.tertiary)
                .frame(minWidth: 44, alignment: .trailing)
        }
    }
}

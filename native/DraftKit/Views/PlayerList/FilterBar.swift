import SwiftUI

struct FilterBar: View {
    @Binding var searchText: String
    @Binding var selectedPosition: Position
    var showStatsPref: Bool = true
    var onStatsPrefTap: (() -> Void)?

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search players…", text: $searchText)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                if !searchText.isEmpty {
                    Button { searchText = "" } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                }
                if showStatsPref {
                    Button { onStatsPrefTap?() } label: {
                        Image(systemName: "slider.horizontal.3")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 10))

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(Position.allCases) { position in
                        PositionChip(position: position, isSelected: selectedPosition == position) {
                            selectedPosition = position
                        }
                    }
                }
                .padding(.horizontal, 4)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
}

struct PositionChip: View {
    let position: Position
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(position.label)
                .font(.caption.weight(.medium))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.accentColor : Color.secondary.opacity(0.15), in: Capsule())
                .foregroundStyle(isSelected ? .white : .primary)
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.15), value: isSelected)
    }
}

import SwiftUI

struct CircularProgress: View {
    let position: String
    let drafted: Int
    let threshold: Int

    private var progress: Double {
        threshold > 0 ? min(1.0, Double(drafted) / Double(threshold)) : 0
    }

    private var progressColor: Color {
        switch progress {
        case 0.66...: return .green
        case 0.33...: return .orange
        default: return .red
        }
    }

    var body: some View {
        VStack(spacing: 2) {
            ZStack {
                Circle()
                    .stroke(Color.secondary.opacity(0.2), lineWidth: 4)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(progressColor, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.3), value: progress)
                Text("\(drafted)")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(progressColor)
            }
            .frame(width: 36, height: 36)
            Text(position)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(.secondary)
        }
    }
}

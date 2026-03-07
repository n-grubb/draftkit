import SwiftUI
import Charts

struct RadarAxis: Identifiable {
    let id: String
    let label: String
    let value: Double  // normalized 0–1
}

struct RadarChartView: View {
    let axes: [RadarAxis]
    var fillColor: Color = .blue
    var title: String = ""

    var body: some View {
        VStack(spacing: 4) {
            if !title.isEmpty {
                Text(title)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            GeometryReader { geo in
                let size = min(geo.size.width, geo.size.height)
                let center = CGPoint(x: geo.size.width / 2, y: geo.size.height / 2)
                let radius = size / 2 * 0.8
                let count = axes.count
                guard count >= 3 else { return AnyView(EmptyView()) }

                return AnyView(
                    ZStack {
                        // Background rings
                        ForEach([0.25, 0.5, 0.75, 1.0], id: \.self) { scale in
                            polygon(count: count, center: center, radius: radius * scale)
                                .stroke(Color.secondary.opacity(0.2), lineWidth: 0.5)
                        }
                        // Axis lines
                        ForEach(0..<count, id: \.self) { i in
                            let angle = axisAngle(i: i, count: count)
                            Path { path in
                                path.move(to: center)
                                path.addLine(to: point(angle: angle, radius: radius, center: center))
                            }
                            .stroke(Color.secondary.opacity(0.2), lineWidth: 0.5)
                        }
                        // Data polygon
                        dataPolygon(count: count, center: center, radius: radius)
                            .fill(fillColor.opacity(0.2))
                        dataPolygon(count: count, center: center, radius: radius)
                            .stroke(fillColor, lineWidth: 2)
                        // Labels
                        ForEach(0..<count, id: \.self) { i in
                            let angle = axisAngle(i: i, count: count)
                            let labelRadius = radius + 16
                            let pt = point(angle: angle, radius: labelRadius, center: center)
                            Text(axes[i].label)
                                .font(.system(size: 9, weight: .medium))
                                .foregroundStyle(.secondary)
                                .position(pt)
                        }
                    }
                )
            }
        }
    }

    private func axisAngle(i: Int, count: Int) -> Double {
        Double(i) * (2 * .pi / Double(count)) - .pi / 2
    }

    private func point(angle: Double, radius: Double, center: CGPoint) -> CGPoint {
        CGPoint(
            x: center.x + radius * cos(angle),
            y: center.y + radius * sin(angle)
        )
    }

    private func polygon(count: Int, center: CGPoint, radius: Double) -> Path {
        Path { path in
            for i in 0..<count {
                let angle = axisAngle(i: i, count: count)
                let pt = point(angle: angle, radius: radius, center: center)
                i == 0 ? path.move(to: pt) : path.addLine(to: pt)
            }
            path.closeSubpath()
        }
    }

    private func dataPolygon(count: Int, center: CGPoint, radius: Double) -> Path {
        Path { path in
            for i in 0..<count {
                let angle = axisAngle(i: i, count: count)
                let r = radius * max(0, min(1, axes[i].value))
                let pt = point(angle: angle, radius: r, center: center)
                i == 0 ? path.move(to: pt) : path.addLine(to: pt)
            }
            path.closeSubpath()
        }
    }
}

import SwiftUI

struct ObsidianCardView: View {
    @ObservedObject private var appState = AppState.shared

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                Circle().fill(Color(hex: "#7C3AED")).frame(width: 7, height: 7)
                Text("Obsidian").font(.system(size: 12, weight: .semibold)).foregroundColor(Color(hex: "#F5F6F8"))
                Text("Memory").font(.system(size: 11)).foregroundColor(Color(hex: "#8E939C"))
            }
            .padding(.top, 6).padding(.leading, 108).padding(.trailing, 36)

            VStack(alignment: .leading, spacing: 2) {
                if !appState.obsidianLastFile.isEmpty {
                    HStack(spacing: 6) {
                        Image(systemName: "doc.text")
                            .font(.system(size: 9))
                            .foregroundColor(Color(hex: "#6B7079"))
                            .frame(width: 14)
                        
                        Text(appState.obsidianLastFile)
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "#C5C8CD"))
                            .lineLimit(1)
                            .truncationMode(.tail)
                            .layoutPriority(1)
                        
                        Spacer(minLength: 4)
                        
                        if let lastSync = appState.obsidianLastSync {
                            Text(relativeTime(lastSync))
                                .font(.system(size: 9))
                                .foregroundColor(Color(hex: "#4B5563"))
                        }
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 4)
                }
                
                if let error = appState.obsidianError {
                    Text(error)
                        .font(.system(size: 10))
                        .foregroundColor(Color(hex: "#F4505E"))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 4)
                }
            }
            .padding(.leading, 102).padding(.trailing, 12).padding(.top, 5)
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .padding(.top, 4)
        .transition(.opacity)
    }
    
    private func relativeTime(_ date: Date) -> String {
        let seconds = Date().timeIntervalSince(date)
        if seconds < 60 { return "now" }
        if seconds < 3600 { return "\(Int(seconds / 60))m ago" }
        if seconds < 86400 { return "\(Int(seconds / 3600))h ago" }
        return "\(Int(seconds / 86400))d ago"
    }
}

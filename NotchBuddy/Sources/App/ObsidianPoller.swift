import Foundation
import SwiftUI

// MARK: - ObsidianPoller
// Polls Obsidian vault every 60s for memory context, writes sessions to vault.
// Reads from local REST API (https://github.com/coddingtonbear/obsidian-local-rest-api)
// vault URL + API token stored in Keychain.

final class ObsidianPoller: @unchecked Sendable {
    static let shared = ObsidianPoller()
    private var timer: DispatchSourceTimer?
    private var lastSyncId: String = ""

    private init() {}

    func start() {
        guard timer == nil else { return }
        let t = DispatchSource.makeTimerSource(queue: .global(qos: .background))
        t.schedule(deadline: .now() + 10, repeating: 60, leeway: .seconds(5))
        t.setEventHandler { [weak self] in self?.poll() }
        t.resume()
        timer = t
    }

    func stop() {
        timer?.cancel()
        timer = nil
    }

    // MARK: - Poll

    func pollNow() { poll() }

    private func poll() {
        guard !DemoEngine.isPollerPaused else { return }
        guard let vaultUrl = KeychainStore.shared.get("obsidian-vault-url"),
              let apiToken = KeychainStore.shared.get("obsidian-api-token") else { return }
        
        fetchMemoryContext(vaultUrl: vaultUrl, apiToken: apiToken)
    }

    // MARK: - Fetch Memory

    private func fetchMemoryContext(vaultUrl: String, apiToken: String) {
        guard let url = URL(string: "\(vaultUrl)/api/vault/active-file") else { return }
        
        var req = URLRequest(url: url, timeoutInterval: 10)
        req.setValue("Bearer \(apiToken)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Accept")

        URLSession.shared.dataTask(with: req) { [weak self] data, response, error in
            guard let self else { return }
            
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            if code != 200 {
                let errMsg: String
                if code == 401 { errMsg = "Invalid API token (401)" }
                else if code == 0 { errMsg = error?.localizedDescription ?? "No connection" }
                else { errMsg = "Obsidian API error \(code)" }
                DispatchQueue.main.async {
                    AppState.shared.setIfChanged(\.obsidianError, errMsg)
                }
                return
            }

            guard let data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let path = json["path"] as? String else {
                DispatchQueue.main.async {
                    AppState.shared.setIfChanged(\.obsidianError, nil)
                }
                return
            }

            DispatchQueue.main.async {
                AppState.shared.setIfChanged(\.obsidianError, nil)
                AppState.shared.setIfChanged(\.obsidianLastFile, path)
                AppState.shared.setIfChanged(\.obsidianLoaded, true)
            }
        }.resume()
    }

    // MARK: - Write Memory

    func writeMemoryNote(title: String, content: String, vaultUrl: String, apiToken: String) {
        let fileName = "\(title.replacingOccurrences(of: " ", with: "-").lowercased()).md"
        guard let url = URL(string: "\(vaultUrl)/api/vault/create") else { return }

        var req = URLRequest(url: url, timeoutInterval: 10)
        req.httpMethod = "POST"
        req.setValue("Bearer \(apiToken)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "path": fileName,
            "data": content
        ]

        req.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: req) { data, response, error in
            let code = (response as? HTTPURLResponse)?.statusCode ?? 0
            if code == 200 {
                SoundEngine.shared.play("finish")
                DispatchQueue.main.async {
                    AppState.shared.setIfChanged(\.obsidianLastSync, Date())
                }
            }
        }.resume()
    }
}

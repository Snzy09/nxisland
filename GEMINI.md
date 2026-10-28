# Project Guidelines & Rules — NxIsland

## Core Development Rules

### 1. Cross-Platform Feature & Update Synchronization
Whenever adding a new feature or making an update, **all platforms must be synchronized** so every client is updated and interoperable:
- **macOS**: `NotchBuddy/Sources/App/` and shared `NotchBuddy/Sources/CoucouKit/`.
- **iOS (iPhone)**: `NotchBuddy/Sources/Phone/`, `Sources/Widgets/`, `Sources/NotificationContent/`, and `relay/`.
- **Windows**: `windows/src-tauri/`, `windows/src/`, and `windows/hook/`.
- **Linux**: `windows/src-tauri/`, `windows/src/`, and `windows/hook/` (Unix domain socket `/run/user/<uid>/nxisland.sock`).
- **Android**: `android/` companion app (Wi-Fi TLS pairing, biometrics, home widgets).

**Key Synchronization Points:**
- **Payload & Hook Protocol**: Ensure socket / named pipe payload schemas (`coucou_agent`, hook events, approval requests) stay consistent across Mac, Windows, and Linux.
- **Mobile Pairing & Relay**: Ensure communication between desktop hosts (Mac, Windows, Linux) and mobile apps (iOS, Android) via local Wi-Fi TLS and Cloudflare Worker relay remains compatible.
- **Pill Catalog & States**: Keep `PillCatalog.swift` and web/desktop pill definitions aligned for new agents, tools, or service integrations.
- **What's New & Localizations**: Update `NotchBuddy/Resources/whats-new.json` and `windows/src/whats-new/whats-new.json` for new versions across all supported languages. Validate with `python3 scripts/test-whats-new.py`.

### 2. Git & GitHub Synchronization
- After completing any feature update or fix, commit changes with clear semantic messages.
- Always push commits to the remote repository (`https://github.com/Snzy09/nxisland.git`) to keep the remote branch up-to-date.

### 3. Architecture & Code Quality
- Swift 6, SwiftUI + AppKit for Apple platforms (no 3rd-party dependencies unless strictly required).
- Character engine (Mochi) is rendered in code (`Canvas` + `TimelineView`), without external animation runtimes.
- Tauri 2 + Rust + Vite for Windows & Linux.
- Secrets stay in OS Keychains (macOS Keychain, Windows Credential Manager, Linux Secret Service), never in plain text or git.
- Zero telemetry and non-blocking hook relays.

### 4. OS-Specific Release Paths
Every platform build and release script must output packaged release artifacts into its dedicated directory:
- **macOS**: `NotchBuddy/release/` (`NxIsland.app`, `NxIsland.zip`)
- **iOS**: `NotchBuddy/release/ios/`
- **Linux**: `linux/release/` (`NxIsland-Linux-*.AppImage`, `NxIsland-Linux-*.deb`, `NxIsland-Linux-*.rpm`, `SHA256SUMS`)
- **Windows**: `windows/release/` (`NxIsland-Windows-*-setup.exe`, `NxIsland-Windows-*.msi`)
- **Android**: `android/release/` (`NxIsland-Android-*.apk`, `SHA256SUMS`)
All release output directories are excluded from git tracking in `.gitignore`.

import Foundation

// MARK: - WakePhrase tests (pure functions, no concurrency)

@main
enum WakePhraseTests {

    static var failures = 0

    static func main() {
        // MARK: split — should match

        // Basic wake phrases (no command)
        checkMatch("ok nxisland",              WakePhrase.split("ok nxisland"),              cmd: "")
        checkMatch("OK COUCOU",              WakePhrase.split("OK COUCOU"),              cmd: "")
        checkMatch("okay nxisland",            WakePhrase.split("okay nxisland"),            cmd: "")
        checkMatch("ok kuku",                WakePhrase.split("ok kuku"),                cmd: "")
        checkMatch("ok cou cou",             WakePhrase.split("ok cou cou"),             cmd: "")
        checkMatch("hey nxisland",             WakePhrase.split("hey nxisland"),             cmd: "")
        checkMatch("Hey NxIsland",             WakePhrase.split("Hey NxIsland"),             cmd: "")

        // Command extracted from original text (casing/punctuation preserved)
        checkMatch("Okay, NxIsland, ajoute GitHub",
                   WakePhrase.split("Okay, NxIsland, ajoute GitHub"),             cmd: "ajoute GitHub")
        checkMatch("ok cuckoo add github",
                   WakePhrase.split("ok cuckoo add github"),                    cmd: "add github")
        checkMatch("ok nxisland ouvre figma",
                   WakePhrase.split("ok nxisland ouvre figma"),                   cmd: "ouvre figma")

        // Apostrophes, hyphens and accents preserved in command
        checkMatch("OK NxIsland, mets l'album de Daft Punk",
                   WakePhrase.split("OK NxIsland, mets l'album de Daft Punk"),   cmd: "mets l'album de Daft Punk")
        checkMatch("ok nxisland qu'est-ce que fait Claude ?",
                   WakePhrase.split("ok nxisland qu'est-ce que fait Claude ?"),  cmd: "qu'est-ce que fait Claude ?")

        // Wake anywhere in transcript (word-boundary search)
        checkMatch("euh ok nxisland mets de la musique",
                   WakePhrase.split("euh ok nxisland mets de la musique"),        cmd: "mets de la musique")
        checkMatch("la chanson dit ok nxisland",
                   WakePhrase.split("la chanson dit ok nxisland"),                cmd: "") // accepted false positive

        // LAST occurrence wins
        checkMatch("ok nxisland search ok nxisland play music",
                   WakePhrase.split("ok nxisland search ok nxisland play music"),   cmd: "play music")

        // Partial word-by-word delivery
        checkNoMatch("ok alone",             WakePhrase.split("ok"))
        checkMatch("ok nxisland partial",      WakePhrase.split("ok nxisland"),              cmd: "")
        checkMatch("ok nxisland with more",    WakePhrase.split("ok nxisland mets"),         cmd: "mets")

        // MARK: split — should NOT match
        checkNoMatch("standalone nxisland",    WakePhrase.split("nxisland"))
        checkNoMatch("standalone COUCOU",    WakePhrase.split("COUCOU"))
        checkNoMatch("partial nxisland ça va", WakePhrase.split("nxisland ça va"))
        checkNoMatch("nxisland comment",       WakePhrase.split("nxisland comment tu vas"))
        checkNoMatch("ok google",            WakePhrase.split("ok google"))
        checkNoMatch("hey siri",             WakePhrase.split("hey siri"))
        checkNoMatch("okkkk nxisland",         WakePhrase.split("okkkk nxisland"))
        checkNoMatch("empty",                WakePhrase.split(""))

        // Summary
        if failures == 0 { print("\n\(total)/\(total) tests passed.") }
        else { print("\n\(failures) test(s) FAILED."); exit(1) }
    }

    static var total = 0

    static func checkMatch(_ label: String, _ r: WakePhrase.SplitResult, cmd: String) {
        total += 1
        if !r.matched {
            print("✗  \(label) — expected match, got no match"); failures += 1; return
        }
        if r.command != cmd {
            print("✗  \(label) — matched ✓ but command \"\(r.command)\" ≠ \"\(cmd)\""); failures += 1; return
        }
        print("✓  \(label)")
    }

    static func checkNoMatch(_ label: String, _ r: WakePhrase.SplitResult) {
        total += 1
        if r.matched { print("✗  \(label) — expected no match, got matched (cmd: \"\(r.command)\")"); failures += 1 }
        else         { print("✓  \(label)") }
    }
}

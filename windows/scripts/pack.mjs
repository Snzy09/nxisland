// Copies the packages Tauri buries in target/release/bundle/ into
// OS-specific release paths (linux/release/ for Linux, windows/release/ for Windows).
// Used by `npm run pack` and by the release workflows.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(root, "..");
const bundleRoot = join(root, "target", "release", "bundle");

// Target directories separated by OS
const outDirs = process.platform === "linux"
  ? [join(repoRoot, "linux", "release"), join(root, "release")]
  : [join(root, "release")];

const { version } = JSON.parse(readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8"));

// What each platform ships: where Tauri puts it, how to recognise it, and the
// names it is published under (the rolling name, when there is one, always
// points at the latest release).
const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
const debArch = process.arch === "arm64" ? "arm64" : "amd64";
const PACKAGES = {
  win32: [
    {
      dir: "nsis",
      suffix: "-setup.exe",
      names: [`NxIsland-Windows-${version}-setup.exe`, "NxIsland-Windows-setup.exe", `Coucou-Windows-${version}-setup.exe`],
    },
    {
      dir: "msi",
      suffix: ".msi",
      names: [`NxIsland-Windows-${version}.msi`, "NxIsland-Windows.msi", `Coucou-Windows-${version}.msi`],
    },
  ],
  linux: [
    {
      dir: "appimage",
      suffix: ".AppImage",
      names: [`NxIsland-Linux-${version}-${arch}.AppImage`, `NxIsland-Linux-${arch}.AppImage`, `Coucou-Linux-${version}-${arch}.AppImage`],
    },
    { dir: "deb", suffix: ".deb", names: [`NxIsland-Linux-${version}-${debArch}.deb`, `Coucou-Linux-${version}-${debArch}.deb`] },
    { dir: "rpm", suffix: ".rpm", names: [`NxIsland-Linux-${version}-${arch}.rpm`, `Coucou-Linux-${version}-${arch}.rpm`] },
  ],
};

const packages = PACKAGES[process.platform];
if (!packages) {
  console.error(`Nothing to pack on ${process.platform}.`);
  process.exit(1);
}

/** The newest file in `dir` ending with `suffix`, in case an older build is still lying around. */
function newest(dir, suffix) {
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(suffix));
  } catch {
    return null;
  }
  if (files.length === 0) return null;
  return files
    .map((f) => join(dir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

for (const dir of outDirs) {
  mkdirSync(dir, { recursive: true });
}
const written = [];
for (const { dir, suffix, names } of packages) {
  const built = newest(join(bundleRoot, dir), suffix);
  if (!built) {
    console.error(`No *${suffix} in ${join(bundleRoot, dir)} — run \`npm run tauri build\` first.`);
    process.exit(1);
  }
  for (const name of names) {
    for (const targetDir of outDirs) {
      const dest = join(targetDir, name);
      copyFileSync(built, dest);
      written.push(dest);
    }
  }
}

for (const targetDir of outDirs) {
  const sums = [];
  const files = readdirSync(targetDir).filter((f) => !f.startsWith(".") && f !== "SHA256SUMS");
  for (const f of files) {
    const full = join(targetDir, f);
    if (!statSync(full).isFile()) continue;
    const hash = createHash("sha256").update(readFileSync(full)).digest("hex");
    sums.push(`${hash}  ${f}`);
  }
  if (sums.length > 0) {
    writeFileSync(join(targetDir, "SHA256SUMS"), sums.join("\n") + "\n");
    console.log(`  Updated ${join(targetDir, "SHA256SUMS")}`);
  }
}

console.log("\n  Packages ready\n");
for (const f of written) {
  const mb = (statSync(f).size / 1024 / 1024).toFixed(2);
  console.log(`  ${f}  (${mb} MB)`);
}
console.log();

// Draws Mochi into the PNG/ICO set across all platforms (Tauri, macOS, iOS, Android, web).
// Rasterised in pure Node with node:zlib, so the app icon stays "drawn in code"
// with the new tactile non-flat Mochi design.
//
//   node scripts/gen-icons.mjs

import { deflateSync } from "node:zlib";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TAURI_ICONS = join(ROOT, "windows", "src-tauri", "icons");
const MAC_ICONS = join(ROOT, "NotchBuddy", "Assets.xcassets", "AppIcon.appiconset");
const IOS_ICONS = join(ROOT, "NotchBuddy", "PhoneAssets.xcassets", "AppIcon.appiconset");
const ANDROID_ICONS = join(ROOT, "android", "app", "src", "main", "res", "mipmap-xxxhdpi");
const DOCS_MEDIA = join(ROOT, "docs", "media");

// ── Mochi ─────────────────────────────────────────────────────────────────────

const BASE_TOP = [255, 252, 248]; // #FFFDF8 warm porcelain
const BASE_BOTTOM = [224, 210, 198]; // #E0D2C6 soft shadow base
const INK = [24, 20, 20]; // #181414
const CATCHLIGHT = [255, 255, 255];
const NOTCH_BG = [14, 17, 23]; // #0E1117 island pill
const NOTCH_PULSE = [56, 189, 248]; // #38BDF8 cyan active island dot
const RIM = [15, 12, 10]; // #0F0C0A subtle vinyl edge

const SS = 4; // supersampling factor

/** Superellipse (exponent 2.7) test in body-local coordinates. */
function insideBody(x, y, rx, ry) {
  const n = 2.7;
  return Math.pow(Math.abs(x / rx), n) + Math.pow(Math.abs(y / ry), n) <= 1;
}

function insidePill(x, y, w, h) {
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(hw, hh);
  const cx = Math.max(-hw + r, Math.min(hw - r, x));
  const cy = Math.max(-hh + r, Math.min(hh - r, y));
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function renderMochi(size) {
  const px = new Uint8Array(size * size * 4);
  const R = size * 0.35;
  const rx = R * 1.12;
  const ry = R * 0.90;
  const cx = size / 2;
  const cy = size / 2 + R * 0.08;
  const rim = R * 0.045;

  // Island notch motif badge at the top
  const notchW = rx * 0.72;
  const notchH = ry * 0.22;
  const notchY = -ry * 0.62;

  // Eyes geometry
  const eyeYaw = 0.36;
  const eyePitch = -0.10;
  const cp = Math.cos(eyePitch);
  const ex = Math.sin(eyeYaw) * cp * rx;
  const ey = -Math.sin(eyePitch) * ry;
  const fx = Math.max(0.18, Math.cos(eyeYaw));
  const fy = Math.max(0.18, cp);
  const ew = R * 0.23 * fx;
  const eh = R * 0.26 * fy;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bodyHits = 0;
      let rimHits = 0;
      let eyeHits = 0;
      let catchHits = 0;
      let notchHits = 0;
      let pulseHits = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px0 = x + (sx + 0.5) / SS - cx;
          const py0 = y + (sy + 0.5) / SS - cy;

          if (!insideBody(px0, py0, rx + rim, ry + rim)) continue;
          rimHits++;

          if (!insideBody(px0, py0, rx, ry)) continue;
          bodyHits++;

          // Island Notch badge at top
          if (insidePill(px0, py0 - notchY, notchW, notchH)) {
            notchHits++;
            // Active pulse dot
            if (px0 * px0 + (py0 - notchY) * (py0 - notchY) <= (notchH * 0.28) ** 2) {
              pulseHits++;
            }
          }

          // Eyes and catchlights
          const inLeftEye = insidePill(px0 + ex, py0 - ey, ew, eh);
          const inRightEye = insidePill(px0 - ex, py0 - ey, ew, eh);
          if (inLeftEye || inRightEye) {
            eyeHits++;
            const eyeCx = inLeftEye ? -ex : ex;
            const clx = px0 - eyeCx + ew * 0.22;
            const cly = py0 - ey + eh * 0.22;
            if (clx * clx + cly * cly <= (ew * 0.32) ** 2) {
              catchHits++;
            }
          }
        }
      }

      if (rimHits === 0) continue;

      const total = SS * SS;
      const rimA = rimHits / total;
      const bodyA = bodyHits / total;
      const eyeA = eyeHits / total;
      const catchA = catchHits / total;
      const notchA = notchHits / total;
      const pulseA = pulseHits / total;

      // Tactile base gradient + radial ambient shading
      const t = Math.min(1, Math.max(0, ((x - cx) * -0.5 + (y - cy) * 0.8) / (2 * ry) + 0.5));
      let r = BASE_TOP[0] + (BASE_BOTTOM[0] - BASE_TOP[0]) * t;
      let g = BASE_TOP[1] + (BASE_BOTTOM[1] - BASE_TOP[1]) * t;
      let b = BASE_TOP[2] + (BASE_BOTTOM[2] - BASE_TOP[2]) * t;

      // Radial gloss highlight on upper-left
      const hlx = (x - cx) + rx * 0.28;
      const hly = (y - cy) + ry * 0.38;
      const hlDist = Math.hypot(hlx, hly);
      const hlRadius = R * 0.48;
      if (hlDist < hlRadius) {
        const factor = Math.cos((hlDist / hlRadius) * (Math.PI / 2));
        const spec = factor * factor * 50;
        r = Math.min(255, r + spec);
        g = Math.min(255, g + spec);
        b = Math.min(255, b + spec);
      }

      // Soft ambient occlusion at bottom
      const ao = Math.max(0, (y - cy) / ry) * 22;
      r = Math.max(0, r - ao);
      g = Math.max(0, g - ao);
      b = Math.max(0, b - ao);

      let col = RIM.slice();
      let alpha = rimA;
      if (bodyA > 0) {
        col = [
          col[0] * (1 - bodyA / rimA) + r * (bodyA / rimA),
          col[1] * (1 - bodyA / rimA) + g * (bodyA / rimA),
          col[2] * (1 - bodyA / rimA) + b * (bodyA / rimA),
        ];
        alpha = rimA;
      }

      // Draw island notch
      if (notchA > 0) {
        let nCol = NOTCH_BG;
        if (pulseA > 0) {
          nCol = [
            NOTCH_BG[0] * (1 - pulseA / notchA) + NOTCH_PULSE[0] * (pulseA / notchA),
            NOTCH_BG[1] * (1 - pulseA / notchA) + NOTCH_PULSE[1] * (pulseA / notchA),
            NOTCH_BG[2] * (1 - pulseA / notchA) + NOTCH_PULSE[2] * (pulseA / notchA),
          ];
        }
        col = [
          col[0] * (1 - notchA) + nCol[0] * notchA,
          col[1] * (1 - notchA) + nCol[1] * notchA,
          col[2] * (1 - notchA) + nCol[2] * notchA,
        ];
      }

      // Draw eyes & catchlight
      if (eyeA > 0) {
        let eyeCol = INK;
        if (catchA > 0) {
          eyeCol = [
            INK[0] * (1 - catchA / eyeA) + CATCHLIGHT[0] * (catchA / eyeA),
            INK[1] * (1 - catchA / eyeA) + CATCHLIGHT[1] * (catchA / eyeA),
            INK[2] * (1 - catchA / eyeA) + CATCHLIGHT[2] * (catchA / eyeA),
          ];
        }
        col = [
          col[0] * (1 - eyeA) + eyeCol[0] * eyeA,
          col[1] * (1 - eyeA) + eyeCol[1] * eyeA,
          col[2] * (1 - eyeA) + eyeCol[2] * eyeA,
        ];
      }

      const o = (y * size + x) * 4;
      px[o] = Math.round(col[0]);
      px[o + 1] = Math.round(col[1]);
      px[o + 2] = Math.round(col[2]);
      px[o + 3] = Math.round(Math.min(1, alpha) * 255);
    }
  }
  return px;
}

// ── PNG ───────────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── ICO (PNG-in-ICO, Vista and later) ─────────────────────────────────────────

function encodeICO(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = header.length + dir.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir[o] = e.size >= 256 ? 0 : e.size;
    dir[o + 1] = e.size >= 256 ? 0 : e.size;
    dir[o + 2] = 0;
    dir[o + 3] = 0;
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(e.png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

// ── Cache & Render ────────────────────────────────────────────────────────────

const cache = new Map();
function png(size) {
  if (!cache.has(size)) {
    cache.set(size, encodePNG(size, renderMochi(size)));
  }
  return cache.get(size);
}

// ── Output Targets ────────────────────────────────────────────────────────────

function writeSafe(destDir, filename, data) {
  if (existsSync(destDir)) {
    writeFileSync(join(destDir, filename), data);
    console.log(`  ${filename} (${data.length} bytes) -> ${destDir}`);
  }
}

console.log("Rendering NxIsland assets...");

// 1. Tauri Windows/Linux Icons
mkdirSync(TAURI_ICONS, { recursive: true });
writeSafe(TAURI_ICONS, "32x32.png", png(32));
writeSafe(TAURI_ICONS, "128x128.png", png(128));
writeSafe(TAURI_ICONS, "128x128@2x.png", png(256));
writeSafe(TAURI_ICONS, "icon.png", png(512));
const ico = encodeICO([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, png: png(size) })));
writeFileSync(join(TAURI_ICONS, "icon.ico"), ico);
console.log(`  icon.ico (${ico.length} bytes) -> ${TAURI_ICONS}`);

// 2. macOS AppIcon
if (existsSync(MAC_ICONS)) {
  writeSafe(MAC_ICONS, "icon_16x16.png", png(16));
  writeSafe(MAC_ICONS, "icon_16x16@2x.png", png(32));
  writeSafe(MAC_ICONS, "icon_32x32.png", png(32));
  writeSafe(MAC_ICONS, "icon_32x32@2x.png", png(64));
  writeSafe(MAC_ICONS, "icon_128x128.png", png(128));
  writeSafe(MAC_ICONS, "icon_128x128@2x.png", png(256));
  writeSafe(MAC_ICONS, "icon_256x256.png", png(256));
  writeSafe(MAC_ICONS, "icon_256x256@2x.png", png(512));
  writeSafe(MAC_ICONS, "icon_512x512.png", png(512));
  writeSafe(MAC_ICONS, "icon_512x512@2x.png", png(1024));
}

// 3. iOS AppIcon
if (existsSync(IOS_ICONS)) {
  writeSafe(IOS_ICONS, "icon-1024.png", png(1024));
}

// 4. Android Launcher Icon
if (existsSync(ANDROID_ICONS)) {
  writeSafe(ANDROID_ICONS, "ic_launcher.png", png(512));
}

// 5. Documentation & Web Media
if (existsSync(DOCS_MEDIA)) {
  writeSafe(DOCS_MEDIA, "icon.png", png(256));
  writeSafe(DOCS_MEDIA, "nxisland.png", png(512));
}

console.log("All NxIsland assets generated successfully.");

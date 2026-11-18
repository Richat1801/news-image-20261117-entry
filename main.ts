// News image: Tuesday 17 November 2026 — one editorial infographic.
// Procedural renderer, Node 22 stdlib only (own PNG encoder, 5x7 bitmap font).
// Writes /output/entry.png (1024x1024, deterministic: no dates, no randomness).
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------- palette ----------
const PAPER: number[] = [246, 241, 231];
const INK: number[] = [20, 24, 32];
const BODY: number[] = [52, 60, 74];
const NAVY: number[] = [15, 30, 51];
const NAVY_LINE: number[] = [30, 58, 95];
const RED: number[] = [180, 35, 24];
const BLUE: number[] = [29, 78, 216];
const GREEN: number[] = [21, 128, 61];
const GREEN_LT: number[] = [34, 163, 88];
const GOLD: number[] = [176, 124, 31];
const GOLD_LT: number[] = [217, 164, 65];
const WHITE: number[] = [255, 255, 255];
const PANEL_BG: number[] = [255, 255, 255];
const SEA: number[] = [38, 92, 138];
const SEA_DK: number[] = [23, 64, 104];
const SKY_SOFT: number[] = [219, 232, 244];

// ---------- framebuffer ----------
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}

function setPixel(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const o = (y * W + x) * 3;
  px[o] = c[0];
  px[o + 1] = c[1];
  px[o + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: number[]): void {
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w);
  const y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const o = (yy * W + xx) * 3;
      px[o] = c[0];
      px[o + 1] = c[1];
      px[o + 2] = c[2];
    }
  }
}

function hline(x: number, y: number, len: number, c: number[]): void {
  fillRect(x, y, len, 1, c);
}

function vline(x: number, y: number, len: number, c: number[]): void {
  fillRect(x, y, 1, len, c);
}

// Bresenham line with a square brush of size t.
function thickLine(x1: number, y1: number, x2: number, y2: number, t: number, c: number[]): void {
  const dx = Math.abs(x2 - x1);
  const dy = -Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let err = dx + dy;
  let x = x1;
  let y = y1;
  const r = Math.floor(t / 2);
  for (;;) {
    fillRect(x - r, y - r, t, t, c);
    if (x === x2 && y === y2) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function circle(cx: number, cy: number, r: number, c: number[], fill: boolean): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d2 = x * x + y * y;
      if (fill ? d2 <= r * r : d2 <= r * r && d2 >= (r - 1) * (r - 1)) {
        setPixel(cx + x, cy + y, c);
      }
    }
  }
}

// Arc points from angle a0..a1 (radians), drawn as a thick polyline.
function arc(cx: number, cy: number, r: number, a0: number, a1: number, t: number, c: number[]): void {
  let px0 = -1;
  let py0 = -1;
  for (let a = a0; a <= a1 + 0.001; a += 0.03) {
    const x = Math.round(cx + r * Math.cos(a));
    const y = Math.round(cy + r * Math.sin(a));
    if (px0 >= 0) thickLine(px0, py0, x, y, t, c);
    px0 = x;
    py0 = y;
  }
}

// ---------- 5x7 bitmap font ----------
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x1f, 0, 0, 0],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
};

function textWidth(text: string, s: number): number {
  return text.length * 6 * s - s;
}

function drawText(text: string, x: number, y: number, s: number, c: number[], align: "left" | "center" = "left"): void {
  const t = text.toUpperCase();
  let cx = align === "center" ? x - Math.floor(textWidth(t, s) / 2) : x;
  for (const ch of t) {
    const g = FONT[ch];
    if (g) {
      for (let r = 0; r < 7; r++) {
        const row = g[r];
        for (let col = 0; col < 5; col++) {
          if (row & (0x10 >> col)) fillRect(cx + col * s, y + r * s, s, s, c);
        }
      }
    }
    cx += 6 * s;
  }
}

// ---------- panel art ----------

// Kerch: bridge deck with a fallen arch and a gap, over the strait.
function artKerch(x0: number, y0: number, w: number, h: number): void {
  fillRect(x0, y0, w, h, SKY_SOFT);
  // water
  fillRect(x0, y0 + h - 30, w, 30, SEA);
  hline(x0 + 8, y0 + h - 22, 90, WHITE);
  hline(x0 + 150, y0 + h - 16, 120, WHITE);
  hline(x0 + 300, y0 + h - 24, 100, WHITE);
  hline(x0 + 40, y0 + h - 8, 70, WHITE);
  // towers
  fillRect(x0 + 66, y0 + 8, 10, 62, INK);
  fillRect(x0 + 356, y0 + 8, 10, 62, INK);
  // standing arch (left, intact)
  arc(x0 + 150, y0 + 70, 58, Math.PI, Math.PI * 2, 5, INK);
  // broken arch stub (right): only a short arc, then nothing
  arc(x0 + 330, y0 + 70, 58, Math.PI * 1.55, Math.PI * 2, 5, INK);
  // deck: left segment intact, gap where the arch fell, right segment intact
  fillRect(x0, y0 + 68, 236, 8, INK);
  fillRect(x0 + 330, y0 + 68, w - 330, 8, INK);
  // fallen deck slab, tilted into the water
  thickLine(x0 + 246, y0 + 72, x0 + 316, y0 + h - 34, 7, INK);
  thickLine(x0 + 246, y0 + 80, x0 + 316, y0 + h - 26, 4, INK);
  // debris triangles in the water
  thickLine(x0 + 268, y0 + h - 28, x0 + 278, y0 + h - 14, 3, WHITE);
  thickLine(x0 + 278, y0 + h - 14, x0 + 288, y0 + h - 28, 3, WHITE);
  // road dashes on the intact deck
  for (let xx = x0 + 12; xx < x0 + 220; xx += 34) hline(xx, y0 + 71, 18, WHITE);
  for (let xx = x0 + 344; xx < x0 + w - 20; xx += 34) hline(xx, y0 + 71, 18, WHITE);
}

// Hormuz: tanker on the strait, drones above, a jet answering.
function artHormuz(x0: number, y0: number, w: number, h: number): void {
  fillRect(x0, y0, w, h, SKY_SOFT);
  // sea
  fillRect(x0, y0 + h - 46, w, 46, SEA);
  hline(x0 + 20, y0 + h - 34, 110, WHITE);
  hline(x0 + 250, y0 + h - 26, 130, WHITE);
  hline(x0 + 90, y0 + h - 12, 90, WHITE);
  // tanker hull
  fillRect(x0 + 46, y0 + h - 62, 250, 18, INK);
  thickLine(x0 + 46, y0 + h - 62, x0 + 30, y0 + h - 44, 4, INK);
  // superstructure + funnel
  fillRect(x0 + 216, y0 + h - 92, 52, 30, WHITE);
  fillRect(x0 + 216, y0 + h - 92, 52, 4, INK);
  fillRect(x0 + 248, y0 + h - 108, 14, 18, RED);
  // containers
  fillRect(x0 + 80, y0 + h - 78, 34, 16, GOLD_LT);
  fillRect(x0 + 120, y0 + h - 78, 34, 16, BLUE);
  fillRect(x0 + 160, y0 + h - 78, 34, 16, GREEN_LT);
  // drones: small triangles with dotted paths
  const drones: Array<[number, number]> = [
    [x0 + 60, y0 + 18],
    [x0 + 120, y0 + 8],
    [x0 + 180, y0 + 20],
  ];
  for (const [dx, dy] of drones) {
    thickLine(dx, dy, dx + 8, dy + 8, 3, INK);
    thickLine(dx + 8, dy + 8, dx + 16, dy, 3, INK);
    thickLine(dx + 8, dy + 8, dx + 8, dy + 14, 3, INK);
    for (let xx = dx - 26; xx < dx + 26; xx += 10) hline(xx, dy + 22, 5, BODY);
  }
  // jet, top right, flying right: fuselage, nose, swept wings, tail fin
  const jx = x0 + w - 110;
  const jy = y0 + 14;
  thickLine(jx, jy + 6, jx + 60, jy + 6, 4, INK);
  thickLine(jx + 60, jy + 6, jx + 68, jy + 2, 3, INK);
  thickLine(jx + 60, jy + 6, jx + 68, jy + 10, 3, INK);
  thickLine(jx + 34, jy + 6, jx + 20, jy + 18, 4, INK);
  thickLine(jx + 34, jy + 6, jx + 20, jy - 6, 4, INK);
  thickLine(jx + 10, jy + 6, jx + 2, jy - 8, 4, INK);
}

// NVIDIA: rising bars and an upward arrow.
function artNvidia(x0: number, y0: number, w: number, h: number): void {
  fillRect(x0, y0, w, h, [235, 245, 236]);
  const base = y0 + h - 10;
  const bars: Array<[number, number, number[]]> = [
    [0, 34, GREEN_LT],
    [1, 52, GREEN_LT],
    [2, 74, GREEN],
    [3, 100, GREEN],
  ];
  for (const [i, bh, col] of bars) {
    const bx = x0 + 34 + i * 96;
    fillRect(bx, base - bh, 62, bh, col);
  }
  // baseline
  fillRect(x0 + 16, base, w - 32, 4, INK);
  // rising arrow over the bars
  thickLine(x0 + 40, base - 30, x0 + w - 90, y0 + 12, 6, RED);
  thickLine(x0 + w - 90, y0 + 12, x0 + w - 118, y0 + 14, 6, RED);
  thickLine(x0 + w - 90, y0 + 12, x0 + w - 92, y0 + 36, 6, RED);
}

// Manila: three flags on poles — US, China, Russia — ahead of Shenzhen.
function artManila(x0: number, y0: number, w: number, h: number): void {
  fillRect(x0, y0, w, h, SKY_SOFT);
  const flagW = 104;
  const flagH = 62;
  const fy = y0 + 10;
  const poles = [x0 + 24, x0 + 171, x0 + 318];
  for (const poleX of poles) vline(poleX, fy - 6, flagH + 34, INK);
  // US flag: stripes + canton
  const us = poles[0] + 2;
  for (let s = 0; s < 7; s++) {
    fillRect(us, fy + s * 9, flagW, 9, s % 2 === 0 ? RED : WHITE);
  }
  fillRect(us, fy, 42, 27, BLUE);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      fillRect(us + 5 + c * 10, fy + 5 + r * 8, 3, 3, WHITE);
    }
  }
  // China flag: red field, yellow stars
  const cn = poles[1] + 2;
  fillRect(cn, fy, flagW, flagH, RED);
  circle(cn + 20, fy + 18, 7, GOLD_LT, true);
  circle(cn + 42, fy + 10, 3, GOLD_LT, true);
  circle(cn + 52, fy + 20, 3, GOLD_LT, true);
  circle(cn + 48, fy + 32, 3, GOLD_LT, true);
  circle(cn + 36, fy + 38, 3, GOLD_LT, true);
  // Russia flag: white / blue / red bands
  const ru = poles[2] + 2;
  fillRect(ru, fy, flagW, 21, WHITE);
  fillRect(ru, fy + 21, flagW, 20, BLUE);
  fillRect(ru, fy + 41, flagW, 21, RED);
  // ground line
  hline(x0 + 8, fy + flagH + 28, w - 16, INK);
}

// ---------- composition ----------
function panel(
  x: number,
  y: number,
  w: number,
  h: number,
  tag: string,
  tagColor: number[],
  headline: string,
  lines: string[],
  art: (x0: number, y0: number, w: number, h: number) => void,
): void {
  fillRect(x, y, w, h, PANEL_BG);
  // border
  fillRect(x, y, w, 3, INK);
  fillRect(x, y + h - 3, w, 3, INK);
  fillRect(x, y, 3, h, INK);
  fillRect(x + w - 3, y, 3, h, INK);
  const cx = x + 16;
  const cw = w - 32;
  // tag chip
  const chipW = textWidth(tag, 2) + 18;
  fillRect(cx, y + 14, chipW, 26, tagColor);
  drawText(tag, cx + 9, y + 19, 2, WHITE);
  // headline
  drawText(headline, cx, y + 52, 4, INK);
  hline(cx, y + 86, cw, INK);
  // art
  art(cx, y + 94, cw, 118);
  // body lines
  let ly = y + 224;
  for (const ln of lines) {
    drawText(ln, cx, ly, 3, BODY);
    ly += 26;
  }
}

// header masthead
fillRect(20, 20, 984, 118, NAVY);
fillRect(20, 20, 984, 4, GOLD_LT);
fillRect(20, 134, 984, 4, GOLD_LT);
drawText("THE WORLD IN ONE DAY", 512, 36, 2, GOLD_LT, "center");
drawText("TUESDAY 17 NOVEMBER 2026", 512, 60, 5, WHITE, "center");
drawText("FOUR STORIES THAT DEFINED THE DAY", 512, 108, 2, [199, 210, 224], "center");

// four story panels
panel(20, 150, 478, 364, "UKRAINE", RED, "KERCH BRIDGE FALLS", [
  "2ND STRIKE IN 2 DAYS",
  "ROAD ARCH IN THE STRAIT",
  "ROAD SHUT, RAIL RESUMES",
  "KREMLIN VOWS TO REBUILD",
  "ZELENSKY: UNPRECEDENTED",
], artKerch);

panel(526, 150, 478, 364, "THE GULF", BLUE, "HORMUZ FLARES UP", [
  "DRONES TARGET US RADAR",
  "IN BAHRAIN - STOPPED",
  "INTERCEPTED, NO DAMAGE",
  "US JETS HIT IRGC SITE",
  "ON QESHM ISLAND",
], artHormuz);

panel(20, 526, 478, 354, "MARKETS", GREEN, "NVIDIA BEATS BIG", [
  "Q3 SALES $115.8B, +103%",
  "Q4 GUIDE $130B BEATS VIEW",
  "FIRST SINCE HUANG EXIT",
  "SHARES +2% AFTER HOURS",
  "MARGIN GUIDE 71-72%",
], artNvidia);

panel(526, 526, 478, 354, "DIPLOMACY", GOLD, "TRUMP IN MANILA", [
  "ASEAN SUMMIT OPENS TOUR",
  "TRUMP, XI, PUTIN TO MEET",
  "THURSDAY IN SHENZHEN",
  "NUCLEAR TALKS ON TABLE",
  "QUAD LEADERS MEET FIRST",
], artManila);

// footer strip
fillRect(20, 892, 672, 112, PANEL_BG);
fillRect(20, 892, 672, 3, INK);
fillRect(20, 1001, 672, 3, INK);
fillRect(20, 892, 3, 112, INK);
fillRect(689, 892, 3, 112, INK);
drawText("ALSO TUESDAY", 36, 908, 3, RED);
drawText("DISNEY + HOME DEPOT REPORT", 36, 940, 3, INK);
drawText("ALL 11 S&P SECTORS FALL", 36, 968, 3, BODY);

fillRect(704, 892, 300, 112, NAVY);
drawText("SOURCES", 720, 908, 2, GOLD_LT);
drawText("BBC, REUTERS, AP,", 720, 934, 2, WHITE);
drawText("CNN, LE MONDE", 720, 956, 2, WHITE);

// ---------- PNG encode ----------
const CRC_TABLE = ((): Uint32Array => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    const o = y * (1 + W * 3);
    raw[o] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), o + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR || "out";
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "entry.png"), encodePng());

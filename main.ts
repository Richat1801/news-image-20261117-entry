// news-image-20261117 (refresh): "The World on Tuesday 17 November 2026"
// A one-image summary of the day's world news, drawn procedurally.
// Node 22, standard library only, no network, deterministic:
// the same bytes come out of every run.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Bitmap font, 8 wide x 12 tall per glyph, drawn by hand for this entry.
// Rows are strings of '#' (ink) and '.' (empty). Only the characters the
// poster uses are defined; the renderer upper-cases everything first.
// ---------------------------------------------------------------------------

type Glyph = string[];

const FONT: Record<string, Glyph> = {
  A: ["........","........","..####..",".##..##.","##....##","##....##","########","##....##","##....##","##....##","........","........"],
  B: ["........","........","#######.","##....##","##....##","#######.","##....##","##....##","##....##","#######.","........","........"],
  C: ["........","........","..#####.",".##...##","##......","##......","##......","##......","##......",".##...##","..#####.","........"],
  D: ["........","........","#######.","##....##","##....##","##....##","##....##","##....##","##....##","#######.","........","........"],
  E: ["........","........","########","##......","##......","#######.","##......","##......","##......","########","........","........"],
  F: ["........","........","########","##......","##......","#######.","##......","##......","##......","##......","........","........"],
  G: ["........","........","..#####.",".##...##","##......","##......","##..####","##....##","##....##",".##...##","..#####.","........"],
  H: ["........","........","##....##","##....##","##....##","########","########","##....##","##....##","##....##","........","........"],
  I: ["........","........",".######.","...##...","...##...","...##...","...##...","...##...","...##...",".######.","........","........"],
  J: ["........","........",".#######",".....##.",".....##.",".....##.",".....##.",".....##.","##...##.","##...##.",".#####..","........"],
  K: ["........","........","##....##","##...##.","##..##..","#####...","####....","##..##..","##...##.","##....##","........","........"],
  L: ["........","........","##......","##......","##......","##......","##......","##......","##......","########","........","........"],
  M: ["........","........","##....##","###..###","##.##.##","##.##.##","##....##","##....##","##....##","##....##","........","........"],
  N: ["........","........","##....##","###...##","####..##","##.##.##","##..####","##...###","##....##","##....##","........","........"],
  O: ["........","........","..####..",".##..##.","##....##","##....##","##....##","##....##","##....##",".##..##.","..####..","........"],
  P: ["........","........","#######.","##....##","##....##","#######.","##......","##......","##......","##......","........","........"],
  Q: ["........","........","..####..",".##..##.","##....##","##....##","##....##","##..##..","##...##.",".##..##.","..#####.",".....##."],
  R: ["........","........","#######.","##....##","##....##","#######.","##..##..","##...##.","##....##","##....##","........","........"],
  S: ["........","........",".#######","##......","##......",".######.","......##","......##","......##","##....##",".######.","........"],
  T: ["........","........","########","...##...","...##...","...##...","...##...","...##...","...##...","...##...","........","........"],
  U: ["........","........","##....##","##....##","##....##","##....##","##....##","##....##","##....##",".##..##.","..####..","........"],
  V: ["........","........","##....##","##....##","##....##","##....##","##....##",".##..##.",".##..##.","..####..","...##...","........"],
  W: ["........","........","##....##","##....##","##....##","##....##","##.##.##","##.##.##","########","###..###","##....##","........"],
  X: ["........","........","##....##",".##..##.","..####..","...##...","...##...","..####..",".##..##.","##....##","........","........"],
  Y: ["........","........","##....##","##....##",".##..##.",".##..##.","..####..","...##...","...##...","...##...","...##...","........"],
  Z: ["........","........","########","......##",".....##.","....##..","...##...","..##....",".##.....","##......","########","........"],
  "0": ["........","........","..####..",".##..##.","##...###","##..#.##","##.#..##","###...##","##....##",".##..##.","..####..","........"],
  "1": ["........","........","...##...","..###...",".####...","...##...","...##...","...##...","...##...","...##...",".######.","........"],
  "2": ["........","........",".#####..","##...##.","......##",".....##.","....##..","...##...","..##....",".##.....","########","........"],
  "3": ["........","........",".#####..","##...##.","......##","..####..","......##","......##","##...##.","##...##.",".#####..","........"],
  "4": ["........","........","....##..","...###..","..#.##..",".#..##..","########","....##..","....##..","....##..","....##..","........"],
  "5": ["........","........","########","##......","##......","#######.","......##","......##","......##","##...##.",".#####..","........"],
  "6": ["........","........","..#####.",".##...##","##......","##......","#######.","##....##","##....##",".##..##.","..####..","........"],
  "7": ["........","........","########","......##",".....##.","....##..","....##..","...##...","...##...","...##...","...##...","........"],
  "8": ["........","........","..####..",".##..##.","##....##","..####..",".##..##.","##....##","##....##",".##..##.","..####..","........"],
  "9": ["........","........","..####..",".##..##.","##....##","##....##",".######.","......##","......##",".##..##.","..####..","........"],
  ".": ["........","........","........","........","........","........","........","........","........","...##...","...##...","........"],
  ",": ["........","........","........","........","........","........","........","........","........","...##...","..##....","........"],
  ";": ["........","........","........","........","........","...##...","...##...","........","........","...##...","..##....","........"],
  ":": ["........","........","........","........","........","...##...","...##...","........","........","...##...","...##...","........"],
  "'": ["........","........","...##...","...##...","..##....","........","........","........","........","........","........","........"],
  "-": ["........","........","........","........","........","........",".######.","........","........","........","........","........"],
  "+": ["........","........","........","........","...##...","...##...",".######.","...##...","...##...","........","........","........"],
  "%": ["........","........","###...##","#.#...#.","###..#..","....#...","...#....","..#..###",".#...#.#",".....###","........","........"],
  "$": ["........","........","...##...","..#####.","##.##...","##.##...","..####..","...##.##","...##.##",".#####..","...##...","........"],
  "/": ["........","........","......##",".....##.",".....##.","....##..","...##...","..##....",".##.....","##......","........","........"],
  "(": ["........","........",".....##.","....##..","...##...","...##...","...##...","...##...","...##...","....##..",".....##.","........"],
  ")": ["........","........",".##.....","..##....","...##...","...##...","...##...","...##...","...##...","..##....",".##.....","........"],
  "!": ["........","........","...##...","...##...","...##...","...##...","...##...","...##...","...##...","........","...##...","........"],
  "?": ["........","........",".#####..","##...##.","......##","....##..","...##...","...##...","........","........","...##...","........"],
  " ": ["........","........","........","........","........","........","........","........","........","........","........","........"],
};

// ---------------------------------------------------------------------------
// Canvas: a supersampled framebuffer. Everything is drawn in logical
// 1024x1024 coordinates at SS times the resolution, then averaged down,
// which anti-aliases diagonals and curves while keeping flat fills crisp.
// ---------------------------------------------------------------------------

const W = 1024;
const H = 1024;
const SS = 2;
const DW = W * SS;
const DH = H * SS;

type Rgb = [number, number, number];

const frame = new Uint8Array(DW * DH * 3);

function putPx(dx: number, dy: number, c: Rgb): void {
  if (dx < 0 || dy < 0 || dx >= DW || dy >= DH) return;
  const i = (dy * DW + dx) * 3;
  frame[i] = c[0];
  frame[i + 1] = c[1];
  frame[i + 2] = c[2];
}

function fillRect(x: number, y: number, w: number, h: number, c: Rgb): void {
  const x0 = Math.round(x * SS);
  const y0 = Math.round(y * SS);
  const x1 = Math.round((x + w) * SS);
  const y1 = Math.round((y + h) * SS);
  for (let dy = y0; dy < y1; dy++) {
    for (let dx = x0; dx < x1; dx++) putPx(dx, dy, c);
  }
}

function strokeLine(x0: number, y0: number, x1: number, y1: number, c: Rgb, thick: number): void {
  const ax = x0 * SS;
  const ay = y0 * SS;
  const bx = x1 * SS;
  const by = y1 * SS;
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 0.5));
  const r = Math.max(1, Math.round((thick * SS) / 2));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const cx = Math.round(ax + (bx - ax) * t);
    const cy = Math.round(ay + (by - ay) * t);
    for (let oy = -r; oy <= r; oy++) {
      for (let ox = -r; ox <= r; ox++) {
        if (ox * ox + oy * oy <= r * r) putPx(cx + ox, cy + oy, c);
      }
    }
  }
}

function fillCircle(cx: number, cy: number, rad: number, c: Rgb): void {
  const ccx = cx * SS;
  const ccy = cy * SS;
  const rr = rad * SS;
  const y0 = Math.floor(ccy - rr);
  const y1 = Math.ceil(ccy + rr);
  for (let dy = y0; dy <= y1; dy++) {
    const ddy = dy - ccy;
    const half = Math.sqrt(Math.max(0, rr * rr - ddy * ddy));
    const x0 = Math.round(ccx - half);
    const x1 = Math.round(ccx + half);
    for (let dx = x0; dx <= x1; dx++) putPx(dx, dy, c);
  }
}

function strokeCircle(cx: number, cy: number, rad: number, c: Rgb, thick: number): void {
  const steps = Math.max(24, Math.ceil(2 * Math.PI * rad * SS));
  let prevX = cx + rad;
  let prevY = cy;
  for (let s = 1; s <= steps; s++) {
    const a = (s / steps) * Math.PI * 2;
    const nx = cx + Math.cos(a) * rad;
    const ny = cy + Math.sin(a) * rad;
    strokeLine(prevX, prevY, nx, ny, c, thick);
    prevX = nx;
    prevY = ny;
  }
}

type Pt = [number, number];

function fillPoly(points: Pt[], c: Rgb): void {
  const pts: Pt[] = points.map(([x, y]) => [x * SS, y * SS] as Pt);
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const y0 = Math.max(0, Math.floor(minY));
  const y1 = Math.min(DH - 1, Math.ceil(maxY));
  for (let dy = y0; dy <= y1; dy++) {
    const yy = dy + 0.5;
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) {
        xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const x0 = Math.round(xs[k]);
      const x1 = Math.round(xs[k + 1]);
      for (let dx = x0; dx <= x1; dx++) putPx(dx, dy, c);
    }
  }
}

function strokeRect(x: number, y: number, w: number, h: number, c: Rgb, thick: number): void {
  fillRect(x, y, w, thick, c);
  fillRect(x, y + h - thick, w, thick, c);
  fillRect(x, y, thick, h, c);
  fillRect(x + w - thick, y, thick, h, c);
}

// ---------------------------------------------------------------------------
// Text: glyphs are 8x12; the advance is 9 units so letters get 1 unit of
// tracking. A scale of 2 gives 16x24 px characters, 3 gives 24x36, and so on.
// ---------------------------------------------------------------------------

const ADV = 9;
const GLYPH_H = 12;

function textWidth(text: string, scale: number): number {
  if (text.length === 0) return 0;
  return text.length * ADV * scale - scale;
}

function drawText(x: number, y: number, text: string, scale: number, c: Rgb): number {
  const upper = text.toUpperCase();
  let cx = x;
  for (const ch of upper) {
    const glyph = FONT[ch] ?? FONT["?"];
    for (let r = 0; r < GLYPH_H; r++) {
      const row = glyph[r];
      for (let col = 0; col < 8; col++) {
        if (row[col] === "#") fillRect(cx + col * scale, y + r * scale, scale, scale, c);
      }
    }
    cx += ADV * scale;
  }
  return cx - x;
}

function drawTextCentered(cx: number, y: number, text: string, scale: number, c: Rgb): void {
  drawText(cx - textWidth(text, scale) / 2, y, text, scale, c);
}

// ---------------------------------------------------------------------------
// PNG encoding: CRC32 + zlib deflate from the standard library, filter 0.
// ---------------------------------------------------------------------------

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
    table.push(v >>> 0);
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(): Buffer {
  // Average the supersampled frame down to 1024x1024 RGB rows.
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    const rowStart = y * (W * 3 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < W; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = ((y * SS + sy) * DW + (x * SS + sx)) * 3;
          r += frame[i];
          g += frame[i + 1];
          b += frame[i + 2];
        }
      }
      const n = SS * SS;
      const o = rowStart + 1 + x * 3;
      raw[o] = Math.round(r / n);
      raw[o + 1] = Math.round(g / n);
      raw[o + 2] = Math.round(b / n);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", idat),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Scene: a newspaper front page for one day.
// Masthead, six story panels in a 2x3 grid, and an "also on Tuesday" strip.
// Every fact below was reported on Tuesday 17 November 2026 and cross-checked
// in at least two outlets before it earned a line here.
// ---------------------------------------------------------------------------

const INK: Rgb = [242, 245, 250]; // headlines
const BODY: Rgb = [185, 198, 220]; // panel text
const DIM: Rgb = [126, 144, 178]; // quiet text
const PAGE: Rgb = [10, 17, 31]; // page background
const CARD: Rgb = [20, 31, 54]; // panel background
const EDGE: Rgb = [43, 61, 99]; // panel border
const GOLD: Rgb = [227, 167, 47]; // masthead + footer accent

type Icon = "bridge" | "radar" | "chip" | "plane" | "virus" | "badge";

interface Panel {
  kicker: string;
  accent: Rgb;
  icon: Icon;
  headline: string[];
  body: string[]; // last line is drawn in the accent colour
}

const PANELS: Panel[] = [
  {
    kicker: "UKRAINE WAR - CRIMEA",
    accent: [228, 87, 46],
    icon: "bridge",
    headline: ["KERCH BRIDGE", "SPAN FELLED"],
    body: [
      "2ND-DAY STRIKE FELLS",
      "ROAD ARCH INTO STRAIT",
      "1,441 DRONES DOWNED -",
      "BIGGEST BARRAGE OF WAR",
    ],
  },
  {
    kicker: "MIDDLE EAST - GULF",
    accent: [227, 167, 47],
    icon: "radar",
    headline: ["US AND IRAN", "TRADE FIRE"],
    body: [
      "IRAN DRONES TARGET US",
      "RADAR IN BAHRAIN",
      "US JETS HIT MISSILE",
      "SITE ON QESHM ISLAND",
    ],
  },
  {
    kicker: "MARKETS - TECH",
    accent: [118, 185, 0],
    icon: "chip",
    headline: ["NVIDIA BEATS;", "HUANG STAYS OUT"],
    body: [
      "Q3 REVENUE $115.8B,",
      "UP 103% IN A YEAR",
      "Q4 OUTLOOK $130B TOPS",
      "STOCK +4.8% AFTER HRS",
    ],
  },
  {
    kicker: "ASIA - DIPLOMACY",
    accent: [76, 154, 255],
    icon: "plane",
    headline: ["TRUMP LANDS IN", "MANILA FOR QUAD"],
    body: [
      "FIRST QUAD LEADERS'",
      "MEETING IN 2 YEARS",
      "US, JAPAN, AUSTRALIA,",
      "INDIA - PLUS ASEAN",
    ],
  },
  {
    kicker: "AFRICA - HEALTH",
    accent: [181, 101, 216],
    icon: "virus",
    headline: ["EBOLA SURGES", "IN DR CONGO"],
    body: [
      "CASES PASS 11,000 AND",
      "DEATHS PASS 5,400: WHO",
      "OUTBREAK DOUBLED IN 3",
      "MONTHS - UNCONTROLLED",
    ],
  },
  {
    kicker: "USA - HEALTH",
    accent: [46, 196, 182],
    icon: "badge",
    headline: ["MEASLES-FREE", "STATUS LOST"],
    body: [
      "ELIMINATION STATUS",
      "HELD FOR 26 YEARS",
      "5,400+ CASES, 10 DEAD",
      "A 40-YEAR HIGH",
    ],
  },
];

const FOOTER_ITEMS: string[] = [
  "SIBERIA: MILITARY PLANE CRASH KILLS ALL 19 ABOARD",
  "FRANCE: 146,000 JOIN 2ND NATIONWIDE STRIKE ON PAY",
  "THURSDAY: TRUMP, XI AND PUTIN MEET IN SHENZHEN",
  "WALL STREET SLIDES: DOW -1.6%, NASDAQ -0.7%",
];

// Small pictograms, drawn inside a 54x54 box whose top-left is (x, y).
function drawIcon(kind: Icon, x: number, y: number, c: Rgb): void {
  const t = 3; // stroke thickness
  if (kind === "bridge") {
    // Two pylons, a deck with its middle span dropped, water below.
    strokeLine(x + 8, y + 10, x + 8, y + 36, c, t);
    strokeLine(x + 46, y + 10, x + 46, y + 36, c, t);
    strokeLine(x + 2, y + 22, x + 20, y + 22, c, t);
    strokeLine(x + 34, y + 22, x + 52, y + 22, c, t);
    strokeLine(x + 20, y + 22, x + 27, y + 33, c, t); // fallen span
    strokeLine(x + 34, y + 22, x + 27, y + 33, c, t);
    strokeLine(x + 4, y + 44, x + 14, y + 40, c, 2);
    strokeLine(x + 14, y + 40, x + 24, y + 44, c, 2);
    strokeLine(x + 30, y + 44, x + 40, y + 40, c, 2);
    strokeLine(x + 40, y + 40, x + 50, y + 44, c, 2);
  } else if (kind === "radar") {
    // A dish on a stand, with signal arcs leaving it.
    strokeLine(x + 12, y + 30, x + 30, y + 16, c, t);
    strokeLine(x + 12, y + 30, x + 28, y + 34, c, t);
    strokeLine(x + 20, y + 32, x + 20, y + 46, c, t);
    strokeLine(x + 12, y + 46, x + 28, y + 46, c, t);
    fillCircle(x + 21, y + 24, 2.6, c);
    for (const r of [9, 15, 21]) {
      const steps = 20;
      let px = x + 27 + r * 0.72;
      let py = y + 22 - r * 0.72;
      for (let s = 1; s <= steps; s++) {
        const a = -Math.PI / 4 + (s / steps) * (Math.PI / 2.4);
        const nx = x + 27 + Math.cos(a) * r;
        const ny = y + 22 + Math.sin(a) * r;
        strokeLine(px, py, nx, ny, c, 2);
        px = nx;
        py = ny;
      }
    }
  } else if (kind === "chip") {
    // A processor: square die, inner core, pins on all four sides.
    strokeRect(x + 12, y + 12, 30, 30, c, t);
    strokeRect(x + 21, y + 21, 12, 12, c, 2);
    for (const p of [16, 24, 32]) {
      strokeLine(x + p, y + 4, x + p, y + 12, c, 2);
      strokeLine(x + p, y + 42, x + p, y + 50, c, 2);
      strokeLine(x + 4, y + p, x + 12, y + p, c, 2);
      strokeLine(x + 42, y + p, x + 50, y + p, c, 2);
    }
  } else if (kind === "plane") {
    // A jet in profile, nose to the right, climbing slightly.
    fillPoly(
      [
        [x + 4, y + 34],
        [x + 30, y + 24],
        [x + 44, y + 14],
        [x + 50, y + 12],
        [x + 46, y + 20],
        [x + 34, y + 30],
        [x + 40, y + 40],
        [x + 34, y + 40],
        [x + 24, y + 34],
        [x + 14, y + 42],
        [x + 10, y + 42],
        [x + 12, y + 34],
      ],
      c,
    );
    strokeLine(x + 4, y + 48, x + 22, y + 48, c, 2);
    strokeLine(x + 28, y + 48, x + 40, y + 48, c, 2);
  } else if (kind === "virus") {
    // A virion: round body, spikes with knobs, a few inner spots.
    fillCircle(x + 27, y + 27, 11, c);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.39;
      const x1 = x + 27 + Math.cos(a) * 13;
      const y1 = y + 27 + Math.sin(a) * 13;
      const x2 = x + 27 + Math.cos(a) * 20;
      const y2 = y + 27 + Math.sin(a) * 20;
      strokeLine(x1, y1, x2, y2, c, 2.4);
      fillCircle(x2, y2, 2.8, c);
    }
    fillCircle(x + 23, y + 24, 2, PAGE);
    fillCircle(x + 31, y + 30, 2, PAGE);
    fillCircle(x + 28, y + 21, 1.6, PAGE);
  } else {
    // badge: a ring of measles spots, struck through - status lost.
    strokeCircle(x + 27, y + 27, 19, c, t);
    for (const [sx, sy] of [
      [20, 20],
      [33, 19],
      [26, 28],
      [18, 33],
      [35, 34],
      [27, 38],
    ] as Pt[]) {
      fillCircle(x + sx, y + sy, 2.4, c);
    }
    strokeLine(x + 13, y + 41, x + 41, y + 13, c, t + 1);
  }
}

function drawPanel(p: Panel, x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, CARD);
  strokeRect(x, y, w, h, EDGE, 2);
  fillRect(x, y, w, 6, p.accent);
  drawText(x + 20, y + 15, p.kicker, 2, p.accent);
  drawIcon(p.icon, x + w - 72, y + 12, p.accent);
  p.headline.forEach((line, i) => {
    drawText(x + 20, y + 44 + i * 39, line, 3, INK);
  });
  p.body.forEach((line, i) => {
    const last = i === p.body.length - 1;
    drawText(x + 20, y + 124 + i * 23, line, 2, last ? p.accent : BODY);
  });
}

function compose(): void {
  fillRect(0, 0, W, H, PAGE);

  // Masthead.
  drawTextCentered(W / 2, 24, "WORLD NEWS - ONE DAY - ONE PICTURE", 2, DIM);
  drawTextCentered(W / 2, 54, "TUESDAY 17 NOVEMBER 2026", 4, INK);
  drawTextCentered(W / 2, 108, "THE DAY'S BIGGEST STORIES IN ONE PICTURE", 2, DIM);
  fillRect(26, 140, W - 52, 3, GOLD);

  // Six panels, two columns by three rows.
  const colX = [26, 519];
  const rowY = [152, 388, 624];
  PANELS.forEach((p, i) => {
    drawPanel(p, colX[i % 2], rowY[Math.floor(i / 2)], 479, 224);
  });

  // Footer strip.
  const fy = 860;
  fillRect(26, fy, W - 52, 140, CARD);
  strokeRect(26, fy, W - 52, 140, EDGE, 2);
  fillRect(26, fy, W - 52, 6, GOLD);
  drawText(46, fy + 14, "ALSO ON TUESDAY", 1, GOLD);
  FOOTER_ITEMS.forEach((item, i) => {
    const ly = fy + 38 + i * 25;
    fillPoly(
      [
        [48, ly + 6],
        [56, ly + 11],
        [48, ly + 16],
      ],
      GOLD,
    );
    drawText(66, ly, item, 2, BODY);
  });
}

function main(): void {
  compose();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.png"), encodePng());
}

main();


// world-gen.mjs
var WORLD_SIZES = Object.freeze({
  small: { width: 1600, depth: 1200, label: "Small valley" },
  medium: { width: 2400, depth: 1800, label: "Medium landscape" },
  large: { width: 3600, depth: 2700, label: "Large region" }
});
var DEFAULT_WORLD = Object.freeze({
  seed: "WILLOW-1048",
  size: "medium",
  lakes: 2,
  rivers: 1,
  waterLevel: 45,
  rolling: 58,
  hills: 48,
  cliffs: 25,
  flatness: 40,
  forest: 65
});
var clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function rockExposure(grade, faceRise) {
  const steep = smooth(clamp((grade - 0.27) / 0.78, 0, 1));
  const height = smooth(clamp((faceRise - 4) / 24, 0, 1));
  return steep * (0.12 + 0.88 * height);
}
var smooth = (t) => t * t * (3 - 2 * t);
function mix(a, b, t) {
  return a + (b - a) * t;
}
function hashSeed(input) {
  let h = 2166136261;
  for (const letter of String(input)) {
    h ^= letter.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function hash2(x, z, seed2) {
  let h = seed2 ^ Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967295;
}
function valueNoise(x, z, seed2) {
  const ix = Math.floor(x), iz = Math.floor(z), tx = smooth(x - ix), tz = smooth(z - iz);
  return mix(
    mix(hash2(ix, iz, seed2), hash2(ix + 1, iz, seed2), tx),
    mix(hash2(ix, iz + 1, seed2), hash2(ix + 1, iz + 1, seed2), tx),
    tz
  );
}
function fbm(x, z, seed2) {
  return valueNoise(x, z, seed2) * 0.56 + valueNoise(x * 2.07 + 12, z * 2.07 - 7, seed2 + 11) * 0.28 + valueNoise(x * 4.11 - 23, z * 4.11 + 33, seed2 + 29) * 0.16;
}
function normalizeWorldSettings(raw = {}) {
  const source = { ...DEFAULT_WORLD, ...raw }, out = {};
  out.seed = String(source.seed ?? DEFAULT_WORLD.seed).trim().slice(0, 40) || DEFAULT_WORLD.seed;
  out.size = WORLD_SIZES[source.size] ? source.size : "medium";
  for (const [key2, low, high] of [
    ["lakes", 0, 4],
    ["rivers", 0, 3],
    ["waterLevel", 0, 100],
    ["rolling", 0, 100],
    ["hills", 0, 100],
    ["cliffs", 0, 100],
    ["flatness", 0, 100],
    ["forest", 0, 100]
  ]) {
    const n = Number(source[key2]);
    out[key2] = Number.isFinite(n) ? clamp(Math.round(n), low, high) : DEFAULT_WORLD[key2];
  }
  return out;
}
function createWorld(raw = {}) {
  const options = normalizeWorldSettings(raw), size = WORLD_SIZES[options.size];
  const width = size.width, depth = size.depth, seed2 = hashSeed(options.seed);
  const rand = (i) => hash2(i, 17, seed2);
  const lakes = [];
  const lakeMin = Math.min(width, depth);
  const lakeTypes = ["ribbon", "branched", "lowland"];
  for (let i = 0; i < options.lakes; i++) {
    let best = null;
    for (let j = 0; j < 22; j++) {
      const x = (0.12 + 0.76 * rand(900 + i * 97 + j * 3)) * width;
      const z = (0.12 + 0.76 * rand(901 + i * 97 + j * 3)) * depth;
      const h = baseHeight(x, z);
      const dx = (baseHeight(x + 12, z) - baseHeight(x - 12, z)) / 24;
      const dz = (baseHeight(x, z + 12) - baseHeight(x, z - 12)) / 24;
      const closest = lakes.length ? Math.min(...lakes.map((l) => Math.hypot(x - l.x, z - l.z))) : Infinity;
      const score = h + Math.hypot(dx, dz) * 12 + Math.max(0, 240 - closest) * 0.3 + rand(902 + i * 97 + j * 3) * 4;
      if (!best || score < best.score) best = { x, z, score, h, dx, dz };
    }
    const type = lakeTypes[(i + Math.floor(rand(700 + i) * 3)) % lakeTypes.length];
    const length2 = lakeMin * (type === "ribbon" ? 0.35 : type === "branched" ? 0.24 : 0.18) * (0.84 + rand(530 + i * 37) * 0.4) * (0.7 + options.waterLevel * 5e-3);
    const halfWidth2 = lakeMin * (type === "ribbon" ? 0.028 : type === "branched" ? 0.041 : 0.072) * (0.8 + rand(531 + i * 37) * 0.48) * (0.6 + options.waterLevel * 8e-3);
    const direction = Math.atan2(best.dz, best.dx) + (type === "ribbon" ? 0.12 : 1.08) + rand(535 + i * 37) * 0.42;
    const ux = Math.cos(direction), uz = Math.sin(direction);
    const vx = -uz, vz = ux;
    const wobble = rand(533 + i * 37) * Math.PI * 2;
    const spine = Array.from({ length: 17 }, (_, j) => {
      const t = j / 16, u = (t - 0.5) * length2;
      const side = (Math.sin(t * Math.PI * 2.4 + wobble) - Math.sin(wobble)) * halfWidth2 * (type === "ribbon" ? 0.65 : 0.8);
      const x = clamp(best.x + ux * u + vx * side, 5, width - 5);
      const z = clamp(best.z + uz * u + vz * side, 5, depth - 5);
      return { x, z, r: halfWidth2 * (0.52 + 0.48 * Math.pow(Math.max(0, 1 - Math.abs(t - 0.5) * 1.8), 0.7)) * (0.85 + 0.18 * Math.sin(t * 23 + wobble)) };
    });
    const arms = [];
    if (type === "branched" || type === "lowland") {
      const count2 = type === "branched" ? 3 : 2;
      for (let j = 0; j < count2; j++) {
        const idx = 3 + Math.floor(rand(610 + i * 37 + j) * 11), origin = spine[idx];
        const side = j % 2 ? 1 : -1;
        const span = length2 * (0.28 + rand(630 + i * 37 + j) * 0.27);
        const shift = side * span;
        arms.push(Array.from({ length: 7 }, (_, k) => {
          const t = k / 6;
          return {
            x: clamp(origin.x + vx * shift * t + ux * span * t * 0.23 * Math.sin(t * 2 + floatHash(i, j)), 5, width - 5),
            z: clamp(origin.z + vz * shift * t + uz * span * t * 0.23 * Math.sin(t * 2 + floatHash(i, j)), 5, depth - 5),
            r: halfWidth2 * (0.63 - 0.54 * t)
          };
        }));
      }
    }
    const level = Math.max(6, best.h + 2.5 + rand(511 + i * 37) * 2);
    lakes.push({
      x: best.x,
      z: best.z,
      rx: length2 / 2,
      rz: halfWidth2,
      level,
      type,
      spine,
      arms
    });
  }
  function floatHash(a, b) {
    return rand(776 + a * 31 + b);
  }
  const rivers = Array.from({ length: options.rivers }, (_, i) => {
    const phase = rand(70 + i * 23) * Math.PI * 2, offset = (i + 1) / (options.rivers + 1);
    const points = Array.from({ length: 61 }, (_2, j) => {
      const t = j / 60;
      return { x: t * width, z: depth * (offset + (0.065 + options.waterLevel * 17e-5) * Math.sin(t * Math.PI * 2.2 + phase) + 0.027 * Math.sin(t * Math.PI * 5.4 + phase * 2)) };
    });
    return {
      width: (7 + options.waterLevel * 0.19) * (width / 1200) ** 0.38,
      level: 7 + options.waterLevel * 0.085,
      points
    };
  });
  function lineDistance3(x, z, points) {
    let best = Infinity;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      best = Math.min(best, Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz)));
    }
    return best;
  }
  function baseHeight(x, z) {
    const nx = x / width, nz = z / depth, rolling = options.rolling / 100, hills = options.hills / 100;
    const broad = fbm(nx * 4.3, nz * 4.3, seed2 + 200) - 0.5;
    const detail = fbm(nx * 13, nz * 13, seed2 + 201) - 0.5;
    const ridge = Math.pow(1 - Math.abs(2 * fbm(nx * 3.5 + 0.5, nz * 3.5 + 0.3, seed2 + 240) - 1), 3.1);
    const cliffNoise = fbm(nx * 5.9 + 0.3, nz * 5.9 + 0.7, seed2 + 270);
    const cliff = smooth(clamp((cliffNoise - 0.475) * 23, 0, 1)) * options.cliffs * 0.65;
    const open = 1 - smooth(clamp((fbm(nx * 2.8, nz * 2.8, seed2 + 330) - 0.34) * 3, 0, 1));
    const flatFactor = 1 - options.flatness / 100 * 0.83 * open;
    return Math.max(1, 11 + (broad * 85 * rolling + detail * 23 * rolling + ridge * 90 * hills + cliff) * flatFactor);
  }
  function lakeDistance(lake, x, z) {
    const warp = lake.rz * 0.34;
    const xx = x + (fbm(x / width * 23, z / depth * 23, seed2 + lake.x % 100 + 451) - 0.5) * warp;
    const zz = z + (fbm(x / width * 21 + 9, z / depth * 21 - 7, seed2 + lake.z % 100 + 452) - 0.5) * warp;
    let best = Infinity;
    for (const path of [lake.spine, ...lake.arms]) for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = clamp(((xx - a.x) * dx + (zz - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      const r = Math.max(1, mix(a.r, b.r, t));
      const d = Math.hypot(xx - (a.x + t * dx), zz - (a.z + t * dz)) / r;
      best = Math.min(best, d);
    }
    return best;
  }
  function sample(x, z) {
    x = clamp(x, 0, width);
    z = clamp(z, 0, depth);
    let height = baseHeight(x, z), water3 = -Infinity, kind = "land";
    for (const lake of lakes) {
      const far = Math.hypot(x - lake.x, z - lake.z);
      if (far > lake.rx + lake.rz * 6) continue;
      const d = lakeDistance(lake, x, z);
      if (d < 1.5) {
        const rim = clamp((d - 0.78) / 0.72, 0, 1);
        const basin = lake.level - 8 + Math.pow(Math.min(d, 1), 1.7) * 7;
        height = mix(Math.min(height, basin), height, smooth(rim));
        if (d < 1) {
          height = Math.min(height, lake.level - 1.5);
          if (lake.level > water3) {
            water3 = lake.level;
            kind = "lake";
          }
        }
      }
    }
    for (const river of rivers) {
      const d = lineDistance3(x, z, river.points), bank = river.width;
      if (d < bank * 1.75) {
        height = Math.min(height, river.level + (d - bank) * 2.2);
        if (d < bank) {
          height = Math.min(height, river.level - 3);
          if (river.level > water3) {
            water3 = river.level;
            kind = "river";
          }
        }
      }
    }
    return { height, water: Number.isFinite(water3) ? water3 : null, kind };
  }
  function slope(x, z) {
    const d = Math.min(width, depth) / 260;
    return Math.hypot(
      (sample(x + d, z).height - sample(x - d, z).height) / (2 * d),
      (sample(x, z + d).height - sample(x, z - d).height) / (2 * d)
    );
  }
  const treeCount = Math.round(width * depth / (1200 * 900) * (35 + options.forest * 2.8) * options.forest / 100);
  const trees = [];
  for (let i = 0; i < treeCount * 5 && trees.length < treeCount; i++) {
    const x = 22 + rand(1e3 + i * 5) * (width - 44), z = 22 + rand(1002 + i * 5) * (depth - 44);
    const land = sample(x, z);
    const patch = fbm(x / width * 10, z / depth * 10, seed2 + 443);
    if (land.water !== null || slope(x, z) > 1.05 || patch < 0.37 || rand(1004 + i * 5) > options.forest / 100 * 0.82 + 0.12) continue;
    trees.push({ x, z, y: land.height, r: 4.3 + rand(1010 + i * 5) * 3.5, h: 19 + rand(1012 + i * 5) * 22 });
  }
  const anchors = [[0.1, 0.1], [0.25, 0.8], [0.5, 0.5], [0.8, 0.25], [0.9, 0.9]];
  const signature = anchors.map(([x, z]) => sample(x * width, z * depth).height.toFixed(3)).join("|") + ":" + lakes.map((l) => l.type).join(",") + ":" + rivers.length + ":" + trees.length;
  return { options, width, depth, lakes, rivers, trees, sample, slope, signature };
}
function previewTrees(world, maxCount = 650) {
  const trees = world.trees || [];
  if (trees.length <= maxCount) return trees;
  const stride = trees.length / maxCount;
  return Array.from({ length: maxCount }, (_, i) => trees[Math.floor((i + 0.5) * stride)]);
}
function createWorldMesh(world, nx = 92, nz = 72, { trees = true, palette = null, treeLimit = 650, coherentMeadow = false } = {}) {
  const { width, depth } = world, ground = [], water3 = [];
  const rand = (i, j) => hash2(i, j, hashSeed(world.options.seed) + 901);
  function triangle(to, a, b, c, color2) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let normal = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const len2 = Math.hypot(...normal) || 1;
    normal = normal.map((v) => v / len2);
    for (const [i, p] of [a, b, c].entries()) to.push(...p, ...Array.isArray(color2[0]) ? color2[i] : color2, ...normal);
  }
  function waterPolygon(corners) {
    const result = [];
    for (let i = 0; i < 3; i++) {
      const a = corners[i], b = corners[(i + 1) % 3];
      if (a.wet) result.push(a);
      if (a.wet === b.wet) continue;
      let lo = a, hi = b;
      for (let step = 0; step < 7; step++) {
        const mid = { x: (lo.x + hi.x) * 0.5, z: (lo.z + hi.z) * 0.5 };
        const value = world.sample(mid.x, mid.z);
        mid.wet = value.water !== null;
        mid.level = value.water;
        if (mid.wet === a.wet) lo = mid;
        else hi = mid;
      }
      const pt = {
        x: (lo.x + hi.x) * 0.5,
        z: (lo.z + hi.z) * 0.5,
        level: a.wet ? a.level : b.level,
        wet: true
      };
      result.push(pt);
    }
    if (result.length < 3) return;
    const deep = palette?.water || [0.29, 0.52, 0.61];
    const isRiver = corners.some((p) => p.kind === "river");
    const shore = corners.some((p) => !p.wet);
    const color2 = deep.map((c, i) => clamp(c + (isRiver ? [0.025, 0.055, 0.043][i] : 0) + (shore ? [0.072, 0.078, 0.054][i] : 0), 0, 1));
    const vertex3 = (p) => [p.x - width / 2, p.level + 0.5, p.z - depth / 2];
    for (let i = 1; i + 1 < result.length; i++)
      triangle(water3, vertex3(result[0]), vertex3(result[i]), vertex3(result[i + 1]), color2);
  }
  const rowLength = nx + 1;
  const sampled = Array.from({ length: (nz + 1) * rowLength }, (_, i) => world.sample(i % rowLength / nx * width, Math.floor(i / rowLength) / nz * depth));
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
    const x0 = x / nx * width, x1 = (x + 1) / nx * width, z0 = z / nz * depth, z1 = (z + 1) / nz * depth;
    const index = z * rowLength + x;
    const a = sampled[index], b = sampled[index + 1], c = sampled[index + rowLength + 1], d = sampled[index + rowLength];
    const cells = [[x0, z0, a], [x1, z0, b], [x1, z1, c], [x0, z1, d]];
    const mid = world.sample((x0 + x1) / 2, (z0 + z1) / 2), rock = world.slope((x0 + x1) / 2, (z0 + z1) / 2);
    const variation = rand(x, z);
    const heights = [a.height, b.height, c.height, d.height];
    const verticalRise = Math.max(...heights) - Math.min(...heights);
    const rocky = rockExposure(rock, verticalRise);
    const green = palette?.land || [0.39, 0.54, 0.36];
    const stone = palette?.stone || [0.49, 0.49, 0.45];
    const stratum = Math.sin(mid.height * 0.38 + 1.3) * 0.045 + Math.sin(mid.height * 0.95 + 0.7) * 0.022;
    const meadowShade = 0.955 + variation * 0.095, rockShade = 0.94 + variation * 0.09 + stratum;
    const color2 = green.map((v, i) => clamp(mix(v * meadowShade, stone[i] * rockShade, rocky), 0.03, 0.93));
    const verts = cells.map((q) => [q[0] - width / 2, q[2].height, q[1] - depth / 2]);
    const vertexColors = coherentMeadow ? cells.map((q) => {
      const shade = 0.98 + Math.sin(q[0] / 75) * 0.015 + Math.cos(q[1] / 90) * 0.012 + Math.sin((q[0] + q[1]) / 110) * 0.01;
      return green.map((v, i) => clamp(mix(v * shade, stone[i] * rockShade, rocky), 0.03, 0.93));
    }) : null;
    triangle(ground, verts[0], verts[3], verts[1], vertexColors ? [vertexColors[0], vertexColors[3], vertexColors[1]] : color2);
    triangle(ground, verts[1], verts[3], verts[2], vertexColors ? [vertexColors[1], vertexColors[3], vertexColors[2]] : color2);
    const surface = cells.map((q) => ({
      x: q[0],
      z: q[1],
      wet: q[2].water !== null,
      level: q[2].water,
      kind: q[2].kind
    }));
    waterPolygon([surface[0], surface[3], surface[1]]);
    waterPolygon([surface[1], surface[3], surface[2]]);
  }
  for (const t of trees ? previewTrees(world, treeLimit) : []) {
    const x = t.x - width / 2, z = t.z - depth / 2, n = 5, base3 = t.y + 1;
    const pine = [0.16 + rand(Math.round(t.x), Math.round(t.z)) * 0.09, 0.36 + rand(Math.round(t.z), Math.round(t.x)) * 0.1, 0.22];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
      triangle(
        ground,
        [x, base3 + t.h, z],
        [x + Math.cos(a) * t.r, base3 + t.h * 0.21, z + Math.sin(a) * t.r],
        [x + Math.cos(b) * t.r, base3 + t.h * 0.21, z + Math.sin(b) * t.r],
        pine
      );
      triangle(
        ground,
        [x, base3 + t.h * 0.63, z],
        [x + Math.cos(a) * t.r * 0.85, base3 + t.h * 0.12, z + Math.sin(a) * t.r * 0.85],
        [x + Math.cos(b) * t.r * 0.85, base3 + t.h * 0.12, z + Math.sin(b) * t.r * 0.85],
        pine.map((v) => v * 0.89)
      );
    }
  }
  return {
    ground: new Float32Array(ground),
    water: new Float32Array(water3),
    groundTriangles: ground.length / 27,
    waterTriangles: water3.length / 27
  };
}

// settlement-render-fixtures.mjs
function settlementRenderFixture(count2 = 30) {
  const large = count2 === 100, width = large ? 1100 : 700, depth = large ? 950 : 650, cols = large ? 10 : 6, rows = count2 / cols;
  const sample = (x, y) => ({ height: x > width * 0.92 ? 12 : 10 + Math.sin(x / 95) * 3 + Math.cos(y / 80) * 2 + x * 0.014, water: x > width * 0.92 ? 18 : null });
  const trees = Array.from({ length: 320 }, (_, i) => {
    const x = 18 + i * 137 % (width - 36), z = 18 + i * 193 % (depth - 36);
    return { x, z, y: sample(x, z).height, r: 5 + i % 4 * 0.5, h: 22 + i % 7 * 2 };
  });
  const world = { width, depth, trees, options: { seed: `WV-${count2 === 100 ? "D01-town100" : "C01-hamlet30"}`, size: "small" }, sample, slope: () => 0.1 };
  const houses = Array.from({ length: count2 }, (_, i) => {
    const x = 90 + i % cols * (width - 280) / (cols - 1) + Math.sin(i * 3) * 14, y = 75 + Math.floor(i / cols) * (depth - 300) / (rows - 1) + Math.cos(i * 2) * 18;
    return { id: i, x, y, foundedTurn: 0, foundedEra: 0, entrance: { x: x + Math.sin(i) * 7, y: y + 25 }, parcel: { vertices: [{ x: x - 19, y: y - 19 }, { x: x + 19, y: y - 19 }, { x: x + 19, y: y + 19 }, { x: x - 19, y: y + 19 }] } };
  });
  const buildings = ["farm", "lumber", "smith", "granary", "market", "plaza", "park"].map((type, i) => ({ id: 1e3 + i, type, x: 70 + (width - 260) / 6 * i, y: depth - 65 }));
  const state = { turn: 2, houses, buildings, roads: [[{ x: 35, y: depth - 125 }, { x: width * 0.88, y: depth - 125 }]], localLanes: Array.from({ length: rows }, (_, row) => ({ points: houses.slice(row * cols, row * cols + cols).map((h) => h.entrance) })), zones: [{ type: "farmland", radius: 80, points: [{ x: 70, y: depth - 25 }] }], desirePaths: [] };
  return { world, state, seed: world.options.seed };
}

// environment-next/previous-materials.mjs
import * as T2 from "../assets/vendor/three.module.mjs";

// terrain-classification.mjs
var clamp2 = (x) => Math.max(0, Math.min(1, x));
function createTerrainClassification(world, { width = 96, height = 72 } = {}) {
  const n = width * height, sx = world.width / (width - 1), sz = world.depth / (height - 1), samples = [], wet = new Uint8Array(n);
  const seed2 = Array.from(String(world.options?.seed ?? "")).reduce((h, c) => Math.imul(h, 31) + c.charCodeAt(0) | 0, 0);
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const q = world.sample(i * sx, j * sz);
    samples.push(q);
    wet[j * width + i] = q.water !== null ? 1 : 0;
  }
  const distance5 = new Float32Array(n).fill(1e6);
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const k = j * width + i;
    if (i && wet[k] !== wet[k - 1] || j && wet[k] !== wet[k - width]) {
      distance5[k] = 0;
      if (i && wet[k] !== wet[k - 1]) distance5[k - 1] = 0;
      if (j && wet[k] !== wet[k - width]) distance5[k - width] = 0;
    }
  }
  const relax = (k, i, j, di, dj) => {
    const x = i + di, z = j + dj;
    if (x >= 0 && x < width && z >= 0 && z < height) distance5[k] = Math.min(distance5[k], distance5[z * width + x] + Math.hypot(di * sx, dj * sz));
  };
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) for (const [di, dj] of [[-1, 0], [0, -1], [-1, -1], [1, -1]]) relax(j * width + i, i, j, di, dj);
  for (let j = height - 1; j >= 0; j--) for (let i = width - 1; i >= 0; i--) for (const [di, dj] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) relax(j * width + i, i, j, di, dj);
  const data = new Uint8Array(n * 4);
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const k = j * width + i, x = i * sx, z = j * sz, q = samples[k];
    let forest = 0;
    for (const t of world.trees || []) forest = Math.max(forest, 1 - Math.hypot(x - t.x, z - t.z) / 42);
    const noise2 = 0.5 + 0.25 * Math.sin(x * 0.017 + seed2 % 103 + Math.sin(z * 0.011)) + 0.25 * Math.cos(z * 0.023 + x * 7e-3 + seed2 % 71);
    const bank = 1 - clamp2(distance5[k] / 32), altitude = clamp2((q.height - 140) / 180);
    data[k * 4] = Math.round(clamp2(forest * 0.48 + bank * 0.52 + noise2 * 0.15 + altitude * 0.12) * 255);
    data[k * 4 + 1] = Math.round(clamp2(distance5[k] / 55) * 255);
    let dx = 0, dz = 0, best = Infinity;
    if (q.kind === "river") for (const r of world.rivers || []) for (let a = 1; a < r.points.length; a++) {
      const p = r.points[a - 1], b = r.points[a], vx = b.x - p.x, vz = (b.z ?? b.y) - (p.z ?? p.y), len2 = vx * vx + vz * vz;
      const t = clamp2(((x - p.x) * vx + (z - (p.z ?? p.y)) * vz) / (len2 || 1)), d = Math.hypot(x - p.x - vx * t, z - (p.z ?? p.y) - vz * t);
      if (d < best) {
        best = d;
        const l = Math.sqrt(len2) || 1;
        dx = vx / l;
        dz = vz / l;
      }
    }
    data[k * 4 + 2] = Math.round((dx * 0.5 + 0.5) * 255);
    data[k * 4 + 3] = Math.round((dz * 0.5 + 0.5) * 255);
  }
  return { data, width, height, distance: distance5 };
}

// environment-next/visual-field.mjs
var clamp3 = (x) => Math.max(0, Math.min(1, x));
function inside(x, z, polygon) {
  let yes = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (a.z > z !== b.z > z && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) yes = !yes;
  }
  return yes;
}
var segmentDistance = (x, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = clamp3(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1));
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
};
function validateVisualInputs(inputs = []) {
  return inputs.filter((p) => p?.envelope?.length >= 3 && p.path?.length >= 2 && Number.isFinite(p.radius) && p.radius > 0 && p.radius <= 20 && [...p.envelope, ...p.path].every((v) => Number.isFinite(v.x) && Number.isFinite(v.z))).map((p) => ({ envelope: p.envelope.map((v) => ({ ...v })), path: p.path.map((v) => ({ ...v })), radius: p.radius, strength: clamp3(p.strength ?? 0.65) }));
}
function createVisualField(world, { low = false, inputs = [] } = {}) {
  const baseWidth = low ? 64 : 96, baseHeight = low ? 48 : 72, accepted = validateVisualInputs(inputs), width = accepted.length ? low ? 192 : 384 : baseWidth, height = accepted.length ? low ? 144 : 288 : baseHeight, base3 = createTerrainClassification(world, { width: baseWidth, height: baseHeight }), data = new Uint8Array(width * height * 4);
  const seed2 = Array.from(String(world.options?.seed ?? "")).reduce((n, c) => Math.imul(n, 31) + c.charCodeAt(0) | 0, 0);
  function sample(x, z) {
    const q = world.sample(x, z), wet = q.water !== null;
    let forest = 0, wear = 0;
    for (const t of world.trees || []) forest = Math.max(forest, clamp3(1 - Math.hypot(x - t.x, z - t.z) / 38));
    if (!wet) {
      for (const p of accepted) if (inside(x, z, p.envelope)) for (let i2 = 1; i2 < p.path.length; i2++) wear = Math.max(wear, clamp3(1 - segmentDistance(x, z, p.path[i2 - 1], p.path[i2]) / p.radius) * p.strength);
    }
    const meadow = 0.5 + 0.22 * Math.sin(x * 0.011 + seed2 % 83 + Math.sin(z * 9e-3)) + 0.18 * Math.cos(z * 0.015 + x * 4e-3 + seed2 % 57);
    const i = Math.round(clamp3(x / world.width) * (baseWidth - 1)), j = Math.round(clamp3(z / world.depth) * (baseHeight - 1)), k = j * baseWidth + i;
    return { wet, forest, wear, meadow, shoreDistance: base3.distance[k], shoreDistanceMethod: "wet-mask chamfer; not bathymetry", flow: [base3.data[k * 4 + 2] / 255 * 2 - 1, base3.data[k * 4 + 3] / 255 * 2 - 1] };
  }
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const p = sample(i * world.width / (width - 1), j * world.depth / (height - 1)), k = (j * width + i) * 4;
    data[k] = Math.round(p.forest * 255);
    data[k + 1] = Math.round(p.wear * 255);
    data[k + 2] = Math.round(p.meadow * 255);
    data[k + 3] = p.wet ? 255 : 0;
  }
  return { ...base3, visualData: data, visualWidth: width, visualHeight: height, sample, acceptedInputs: accepted.length };
}

// environment-next/atmosphere.mjs
import * as T from "../assets/vendor/three.module.mjs";

// environment-next/preset.mjs
var ENVIRONMENT_PRESET = Object.freeze({ revision: "wv006-a-2", runtimeReady: false, sunColor: "#fff4e5", sunIntensity: 2.1, sunDirection: [-0.4, 0.86, 0.25], skyColor: "#eaf0f3", groundColor: "#76745f", fillIntensity: 1.8, horizon: "#c5d1c7", zenith: "#91b2c3", fogColor: "#c5d1c7", fogNear: 3300, fogFar: 4900, shadows: false });

// environment-next/atmosphere.mjs
function attachAtmosphere(scene, { low = false, time = { value: 0 } } = {}) {
  const previousFog = scene.fog, previousBackground = scene.background;
  const sun = new T.DirectionalLight(ENVIRONMENT_PRESET.sunColor, ENVIRONMENT_PRESET.sunIntensity);
  sun.position.set(...ENVIRONMENT_PRESET.sunDirection);
  const fill = new T.HemisphereLight(ENVIRONMENT_PRESET.skyColor, ENVIRONMENT_PRESET.groundColor, ENVIRONMENT_PRESET.fillIntensity);
  const geometry = new T.PlaneGeometry(2, 2), material = new T.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { time, zenith: { value: new T.Color(ENVIRONMENT_PRESET.zenith) }, horizon: { value: new T.Color(ENVIRONMENT_PRESET.horizon) } }, defines: low ? { LOW_QUALITY: 1 } : {}, vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.99999,1.);}", fragmentShader: `varying vec2 vUv;uniform float time;uniform vec3 zenith;uniform vec3 horizon;
 void main(){vec3 c=mix(horizon,zenith,smoothstep(.15,1.,vUv.y));
 #ifndef LOW_QUALITY
 float bands=sin(vUv.x*12.+time*.007+sin(vUv.y*18.))*sin(vUv.x*5.-vUv.y*29.+time*.003);float clouds=smoothstep(.48,.90,bands)*smoothstep(.4,.7,vUv.y);c=mix(c,vec3(.79,.82,.80),clouds*.20);
 #endif
 gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
 }` });
  const sky = new T.Mesh(geometry, material);
  sky.frustumCulled = false;
  sky.renderOrder = -1e4;
  const fog = new T.Fog(ENVIRONMENT_PRESET.fogColor, ENVIRONMENT_PRESET.fogNear, ENVIRONMENT_PRESET.fogFar);
  scene.fog = fog;
  scene.add(sun, fill, sky);
  let detached = false;
  return () => {
    if (detached) return;
    detached = true;
    scene.remove(sun, fill, sky);
    if (scene.fog === fog) scene.fog = previousFog;
    if (scene.background === previousBackground) scene.background = previousBackground;
    geometry.dispose();
    material.dispose();
    sun.dispose();
  };
}

// environment-next/previous-materials.mjs
var vertex = `attribute vec3 color;varying vec3 vColor;varying vec3 vPosition;varying vec3 vNormal;varying float vDepth;
void main(){vColor=color;vPosition=position;vNormal=normal;vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`;
var common = `uniform sampler2D grass;uniform sampler2D soil;uniform sampler2D control;uniform sampler2D visual;uniform vec2 worldSize;uniform float time;uniform vec3 sunDirection;uniform vec3 haze;uniform vec2 fogRange;
varying vec3 vColor;varying vec3 vPosition;varying vec3 vNormal;varying float vDepth;
float lum(vec3 c){return dot(c,vec3(.3,.5,.2));}
float grain(vec2 p){return .5+.25*sin(p.x*.73+sin(p.y*.47))+.25*sin(p.y*1.13+p.x*.21);}
vec3 finish(vec3 c){float light=.72+.28*max(0.,dot(normalize(vNormal),sunDirection));return mix(c*light,haze,smoothstep(fogRange.x,fogRange.y,vDepth)*.62);}
vec2 fieldUV(){return (vPosition.xz+worldSize*.5)/worldSize;}
vec3 meadow(vec3 g,float m){return g*mix(vec3(.79,.86,.66),vec3(.84,.85,.68),m)*(.94+.10*m);}
`;
var terrain = `${common}
float mineralHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float mineral(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mineralHash(i),mineralHash(i+vec2(1.,0.)),f.x),mix(mineralHash(i+vec2(0.,1.)),mineralHash(i+vec2(1.,1.)),f.x),f.y);}
void main(){vec4 f=texture2D(visual,fieldUV()),shore=texture2D(control,fieldUV());vec3 n=normalize(vNormal);vec2 rockUV=abs(n.x)>abs(n.z)?vPosition.zy:vPosition.xy;
vec3 g=texture2D(grass,vPosition.xz/24.).rgb;
#ifdef LOW_QUALITY
vec3 earth=vec3(lum(g))*vec3(.86,.69,.51);
#else
// A second, coarse rotated grass sample breaks the near tile rhythm.
g=mix(g,texture2D(grass,vec2(-vPosition.z,vPosition.x)/63.).rgb,.22);
vec3 earth=texture2D(soil,vPosition.xz/21.).rgb;
#endif
vec3 c=meadow(g,f.b);float leaf=grain(vPosition.xz*.7);vec3 litter=earth*mix(vec3(.68,.58,.43),vec3(.79,.69,.49),leaf);
c=mix(c,litter,f.r*.75);float bank=1.-smoothstep(.0,.48,shore.g);vec3 damp=earth*vec3(.59,.56,.46);vec3 gravel=vec3(lum(earth)) * vec3(.84,.83,.75);
c=mix(c,mix(gravel,damp,1.-smoothstep(0.,.16,shore.g)),bank*.8);
c=mix(c,earth*vec3(.85,.73,.56),f.g);
// Dedicated neutral rock: no foliage albedo. Vertical axis projection follows face orientation.
float slope=smoothstep(.24,.62,1.-abs(n.y));
if(slope>0.){float strata=mineral(rockUV*vec2(.07,.12))*.75+mineral(rockUV*.027)*.25;vec3 rock=mix(vec3(.16,.16,.14),vec3(.235,.225,.20),strata);c=mix(c,rock,slope);}
gl_FragColor=vec4(finish(c),1.);
#include <colorspace_fragment>
}`;
var road = `${common}varying float vKind;varying float vOffset;
void main(){vec3 c=vColor;if(vKind>.5){vec3 earth=texture2D(soil,vPosition.xz/21.).rgb;
#ifdef LOW_QUALITY
vec3 turf=vec3(.19,.26,.11)*(.85+earth.g*.3);
#else
vec4 f=texture2D(visual,fieldUV());vec3 turf=meadow(texture2D(grass,vPosition.xz/24.).rgb,f.b);
#endif
float wear=vKind<1.5?.92:vKind<2.5?(1.-smoothstep(11.5+grain(vPosition.xz)*.6,17.,abs(vOffset)))*.9:vKind<3.5?.72:vKind<4.5?.58:vKind<5.5?.86:.78;
c=mix(turf,earth*vec3(.92,.83,.68),wear);if(vKind>4.5&&vKind<5.5)c=mix(c,vColor*.72,.25);}
gl_FragColor=vec4(finish(c),1.);
#include <colorspace_fragment>
}`;
var water = `${common}
void main(){vec4 field=texture2D(control,fieldUV());vec2 flow=field.ba*2.-1.;float river=smoothstep(.12,.4,length(flow));
// G is normalized shore distance, never measured depth.
vec3 c=mix(vec3(.135,.19,.16),vec3(.105,.22,.225),smoothstep(0.,.23,field.g));c=mix(c,vec3(.04,.12,.155),smoothstep(.16,.98,field.g));
#ifndef LOW_QUALITY
vec2 p=vPosition.xz/35.-flow*time*.025*river-vec2(time*.001*(1.-river));float ripple=sin(p.x*8.+sin(p.y*6.))*sin(p.y*7.);c+=vec3(.004,.006,.006)*ripple*smoothstep(.03,.30,field.g);
#endif
// Water uses the same haze, but no diffuse terrain-normal darkening.
c=mix(c,haze,smoothstep(fogRange.x,fogRange.y,vDepth)*.62);gl_FragColor=vec4(c,1.);
#include <colorspace_fragment>
}`;
function createEnvironmentMaterials({ low = false, onReady = () => {
}, loadTextures = true } = {}) {
  let disposed = false, loaded2 = 0, failed = 0, lastTime = 0, controlBuilds = 0, world = null, inputs = [], field = null, detach = null;
  const textures = /* @__PURE__ */ new Set(), materials = /* @__PURE__ */ new Set();
  const pixel = (rgb) => {
    const t = new T2.DataTexture(new Uint8Array([...rgb, 255]), 1, 1);
    t.needsUpdate = true;
    textures.add(t);
    return t;
  };
  const uniforms = { grass: { value: pixel([106, 124, 72]) }, soil: { value: pixel([116, 94, 66]) }, control: { value: pixel([0, 255, 128]) }, visual: { value: pixel([0, 0, 128]) }, worldSize: { value: new T2.Vector2(1, 1) }, time: { value: 0 }, sunDirection: { value: new T2.Vector3(...ENVIRONMENT_PRESET.sunDirection).normalize() }, haze: { value: new T2.Color(ENVIRONMENT_PRESET.fogColor) }, fogRange: { value: new T2.Vector2(ENVIRONMENT_PRESET.fogNear, ENVIRONMENT_PRESET.fogFar) } };
  if (loadTextures) for (const name of ["grass", "soil"]) {
    const t = new T2.TextureLoader().load(new URL("../assets/wv/environment-v1/" + name + ".jpg", import.meta.url).href, (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      loaded2++;
      uniforms[name].value.dispose();
      textures.delete(uniforms[name].value);
      uniforms[name].value = texture;
      onReady();
    }, void 0, () => {
      if (!disposed) {
        failed++;
        onReady();
      }
    });
    t.colorSpace = T2.SRGBColorSpace;
    t.wrapS = t.wrapT = T2.RepeatWrapping;
    t.minFilter = T2.LinearMipmapLinearFilter;
    t.anisotropy = low ? 1 : 2;
    textures.add(t);
  }
  function rebuild() {
    if (!world || disposed) return;
    field = createVisualField(world, { low, inputs });
    controlBuilds++;
    for (const [key2, data] of [["control", field.data], ["visual", field.visualData]]) {
      const t = uniforms[key2].value;
      t.image = { data, width: key2 === "visual" ? field.visualWidth : field.width, height: key2 === "visual" ? field.visualHeight : field.height };
      t.minFilter = t.magFilter = T2.LinearFilter;
      t.colorSpace = T2.NoColorSpace;
      t.needsUpdate = true;
    }
    uniforms.worldSize.value.set(world.width, world.depth);
  }
  return {
    material(index) {
      if (disposed || ![0, 1, 5].includes(index)) return null;
      const v = index === 5 ? vertex.replace("attribute vec3 color;", "attribute float surfaceKind;attribute float surfaceOffset;varying float vKind;varying float vOffset;attribute vec3 color;").replace("vColor=color;", "vKind=surfaceKind;vOffset=surfaceOffset;vColor=color;") : vertex;
      const m = new T2.ShaderMaterial({ uniforms, defines: low ? { LOW_QUALITY: 1 } : {}, vertexShader: v, fragmentShader: index === 0 ? terrain : index === 1 ? water : road, side: T2.DoubleSide });
      materials.add(m);
      m.addEventListener("dispose", () => materials.delete(m));
      return m;
    },
    setWorld(next) {
      if (disposed) return;
      world = next;
      rebuild();
    },
    setVisualInputs(next = []) {
      if (disposed) return;
      inputs = next;
      rebuild();
    },
    sample(x, z) {
      return field?.sample(x, z) ?? null;
    },
    attachAtmosphere(scene) {
      if (disposed) return () => {
      };
      detach?.();
      const release = attachAtmosphere(scene, { low, time: uniforms.time });
      detach = release;
      return release;
    },
    advance(now) {
      if (disposed || low) return;
      if (lastTime) uniforms.time.value += Math.max(0, Math.min(100, now - lastTime)) / 1e3;
      lastTime = now;
    },
    pause() {
      lastTime = 0;
    },
    status: () => ({ disposed, surfaceControlBuilds: controlBuilds, surfaceTexturesLoaded: loaded2, surfaceTexturesFailed: failed, surfaceTextureBytes: disposed ? 0 : Math.ceil(2 * 512 * 512 * 4 * 4 / 3) + (field ? field.data.byteLength + field.visualData.byteLength : 8), surfaceTime: uniforms.time.value, visualInputs: field?.acceptedInputs ?? 0, quality: low ? "low" : "normal", idleAnimation: !low, shadows: false }),
    dispose() {
      if (disposed) return;
      disposed = true;
      detach?.();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      materials.clear();
      textures.clear();
      field = null;
      world = null;
      inputs = [];
    }
  };
}

// environment-next/materials.mjs
import * as T3 from "../assets/vendor/three.module.mjs";

// environment-next/detail-resources.mjs
var SURFACE_DETAIL = Object.freeze({ revision: "wv006-a-2", grassPeriod: 8.4, soilPeriod: 7, rockPeriod: 5.6, normalStrength: 0.65, normalAnisotropy: 8, lowAnisotropy: 4 });
var DETAIL_TEXTURES = Object.freeze([
  { name: "grass", file: "grass-color.jpg", width: 1024, height: 1024, color: true },
  { name: "soil", file: "soil-color.jpg", width: 1024, height: 1024, color: true },
  { name: "rock", file: "rock-color.jpg", width: 512, height: 512, color: true },
  { name: "grassNormal", file: "grass-normal.png", width: 512, height: 512, color: false },
  { name: "soilNormal", file: "soil-normal.png", width: 512, height: 512, color: false },
  { name: "rockNormal", file: "rock-normal.png", width: 256, height: 256, color: false }
]);
var LOW_TEXTURES = Object.freeze([
  { name: "grass", file: "../environment-v1/grass.jpg", width: 512, height: 512, color: true },
  { name: "soil", file: "../environment-v1/soil.jpg", width: 512, height: 512, color: true },
  { name: "rock", file: "rock-low.jpg", width: 256, height: 256, color: true }
]);
function mipBytes({ width, height }) {
  let bytes = 0;
  for (; ; ) {
    bytes += width * height * 4;
    if (width === 1 && height === 1) return bytes;
    width = Math.max(1, width >> 1);
    height = Math.max(1, height >> 1);
  }
}

// environment-next/materials.mjs
var vertex2 = `attribute vec3 color;varying vec3 vColor;varying vec3 vPosition;varying vec3 vNormal;varying float vDepth;
void main(){vColor=color;vPosition=position;vNormal=normal;vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`;
var common2 = `uniform sampler2D grass;uniform sampler2D soil;uniform sampler2D rock;uniform sampler2D grassNormal;uniform sampler2D soilNormal;uniform sampler2D rockNormal;uniform sampler2D control;uniform sampler2D visual;uniform vec2 worldSize;uniform float time;uniform vec3 sunDirection;uniform vec3 haze;uniform vec2 fogRange;uniform float normalStrength;
varying vec3 vColor;varying vec3 vPosition;varying vec3 vNormal;varying float vDepth;
const float GRASS_PERIOD=${SURFACE_DETAIL.grassPeriod.toFixed(2)},SOIL_PERIOD=${SURFACE_DETAIL.soilPeriod.toFixed(2)},ROCK_PERIOD=${SURFACE_DETAIL.rockPeriod.toFixed(2)};
float grain(vec2 p){return .5+.25*sin(p.x*.73+sin(p.y*.47))+.25*sin(p.y*1.13+p.x*.21);}
vec3 finish(vec3 c,vec3 n){float light=.64+.36*max(0.,dot(normalize(n),sunDirection));return mix(c*light,haze,smoothstep(fogRange.x,fogRange.y,vDepth)*.62);}
vec3 finish(vec3 c){return finish(c,normalize(vNormal));}
vec2 fieldUV(){return (vPosition.xz+worldSize*.5)/worldSize;}
// Macro colour belongs in the control field; it must not blur the albedo.
vec3 meadow(vec3 g,float m){return g*mix(vec3(.87,.96,.81),vec3(.96,.98,.84),m)*(.94+.10*m);}
#ifndef LOW_QUALITY
// Cotangent frame follows the actual rendered face and projection. Geometry is untouched.
vec3 relief(sampler2D detail,vec2 uv,vec3 n){vec3 dp1=dFdx(vPosition),dp2=dFdy(vPosition);vec2 duv1=dFdx(uv),duv2=dFdy(uv);vec3 a=cross(dp2,n),b=cross(n,dp1),t=a*duv1.x+b*duv2.x,bt=a*duv1.y+b*duv2.y;float scale=inversesqrt(max(max(dot(t,t),dot(bt,bt)),1.e-12));vec3 map=texture2D(detail,uv).rgb*2.-1.;map.xy*=normalStrength;return normalize(mat3(t*scale,bt*scale,n)*normalize(map));}
#endif
void stone(vec3 n,out vec3 color,out vec3 litNormal){
 vec2 ux=vec2(vPosition.z*sign(n.x),vPosition.y)/ROCK_PERIOD,uz=vec2(-vPosition.x*sign(n.z),vPosition.y)/ROCK_PERIOD;
 // Continuous world-space warp breaks straight tile columns without geometry displacement.
 ux+=vec2(sin(vPosition.y*.047+sin(vPosition.z*.019)),sin(vPosition.z*.039+sin(vPosition.y*.023)))*.65;
 uz+=vec2(sin(vPosition.y*.043+sin(vPosition.x*.021)),sin(vPosition.x*.037+sin(vPosition.y*.027)))*.65;
 float w=abs(n.x)/(abs(n.x)+abs(n.z)+.00001);
 #ifdef LOW_QUALITY
 vec2 uv=w>.5?ux:uz;color=texture2D(rock,uv).rgb;litNormal=n;
 #else
 color=mix(texture2D(rock,uz).rgb,texture2D(rock,ux).rgb,w);litNormal=normalize(mix(relief(rockNormal,uz,n),relief(rockNormal,ux,n),w));
 #endif
 color=mix(vec3(dot(color,vec3(.3,.5,.2))),color,.65)*vec3(.97,.96,.93);
}
`;
var terrain2 = `${common2}
void main(){vec3 n=normalize(vNormal),lightingNormal=n,c;float slope=smoothstep(.24,.62,1.-abs(n.y));
if(slope>.99){stone(n,c,lightingNormal);}else{
 vec4 f=texture2D(visual,fieldUV()),shore=texture2D(control,fieldUV());
 vec2 guv=vPosition.xz/GRASS_PERIOD,euv=vPosition.xz/SOIL_PERIOD;
 vec3 g=texture2D(grass,guv).rgb,earth=texture2D(soil,euv).rgb;
 c=meadow(g,f.b);float litter=f.r*.42;vec3 floorColor=earth*mix(vec3(.83,.77,.64),vec3(.91,.86,.73),grain(vPosition.xz*.7));c=mix(c,floorColor,litter);
 float bank=1.-smoothstep(0.,.48,shore.g),damp=1.-smoothstep(0.,.16,shore.g);
 vec3 gravel=earth*vec3(.91,.92,.87),wetEarth=earth*vec3(.56,.57,.49);c=mix(c,mix(gravel,wetEarth,damp),bank*.8);
 c=mix(c,earth*vec3(.91,.82,.67),f.g);
 #ifndef LOW_QUALITY
 float earthWeight=max(max(litter,bank*.8),f.g);lightingNormal=normalize(mix(relief(grassNormal,guv,n),relief(soilNormal,euv,n),earthWeight));
 #endif
 if(slope>.001){vec3 rockColor,rockLight;stone(n,rockColor,rockLight);c=mix(c,rockColor,slope);lightingNormal=normalize(mix(lightingNormal,rockLight,slope));}
}
gl_FragColor=vec4(finish(c,lightingNormal),1.);
#include <colorspace_fragment>
}`;
var road2 = `${common2}varying float vKind;varying float vOffset;
void main(){vec3 c=vColor,n=normalize(vNormal);if(vKind>.5){vec2 uv=vPosition.xz/SOIL_PERIOD;vec3 earth=texture2D(soil,uv).rgb;
#ifdef LOW_QUALITY
vec3 turf=vec3(.19,.26,.11)*(.85+earth.g*.3);
#else
vec4 f=texture2D(visual,fieldUV());vec3 turf=meadow(texture2D(grass,vPosition.xz/GRASS_PERIOD).rgb,f.b);n=relief(soilNormal,uv,n);
#endif
float wear=vKind<1.5?.92:vKind<2.5?(1.-smoothstep(11.5+grain(vPosition.xz)*.6,17.,abs(vOffset)))*.9:vKind<3.5?.72:vKind<4.5?.58:vKind<5.5?.86:.78;
c=mix(turf,earth*vec3(.92,.83,.68),wear);if(vKind>4.5&&vKind<5.5)c=mix(c,vColor*.72,.25);}
gl_FragColor=vec4(finish(c,n),1.);
#include <colorspace_fragment>
}`;
var water2 = `${common2}
void main(){vec4 field=texture2D(control,fieldUV());vec2 flow=field.ba*2.-1.;float river=smoothstep(.12,.4,length(flow));
// G is normalized shore distance, never measured depth.
vec3 c=mix(vec3(.135,.19,.16),vec3(.105,.22,.225),smoothstep(0.,.23,field.g));c=mix(c,vec3(.04,.12,.155),smoothstep(.16,.98,field.g));
#ifndef LOW_QUALITY
vec2 p=vPosition.xz/35.-flow*time*.025*river-vec2(time*.001*(1.-river));float ripple=sin(p.x*8.+sin(p.y*6.))*sin(p.y*7.);c+=vec3(.004,.006,.006)*ripple*smoothstep(.03,.30,field.g);
#endif
// Water uses the same haze, but no diffuse terrain-normal darkening.
c=mix(c,haze,smoothstep(fogRange.x,fogRange.y,vDepth)*.62);gl_FragColor=vec4(c,1.);
#include <colorspace_fragment>
}`;
function createEnvironmentMaterials2({ low = false, onReady = () => {
}, loadTextures = true } = {}) {
  let disposed = false, loaded2 = 0, failed = 0, lastTime = 0, controlBuilds = 0, world = null, inputs = [], field = null, detach = null;
  const textures = /* @__PURE__ */ new Set(), materials = /* @__PURE__ */ new Set(), resources = low ? LOW_TEXTURES : DETAIL_TEXTURES;
  const pixel = (rgb) => {
    const t = new T3.DataTexture(new Uint8Array([...rgb, 255]), 1, 1);
    t.needsUpdate = true;
    textures.add(t);
    return t;
  };
  const uniforms = { grass: { value: pixel([106, 124, 72]) }, soil: { value: pixel([116, 94, 66]) }, rock: { value: pixel([126, 122, 110]) }, grassNormal: { value: pixel([128, 128, 255]) }, soilNormal: { value: pixel([128, 128, 255]) }, rockNormal: { value: pixel([128, 128, 255]) }, normalStrength: { value: SURFACE_DETAIL.normalStrength }, control: { value: pixel([0, 255, 128]) }, visual: { value: pixel([0, 0, 128]) }, worldSize: { value: new T3.Vector2(1, 1) }, time: { value: 0 }, sunDirection: { value: new T3.Vector3(...ENVIRONMENT_PRESET.sunDirection).normalize() }, haze: { value: new T3.Color(ENVIRONMENT_PRESET.fogColor) }, fogRange: { value: new T3.Vector2(ENVIRONMENT_PRESET.fogNear, ENVIRONMENT_PRESET.fogFar) } };
  if (loadTextures) for (const resource of resources) {
    const { name, file, color: color2 } = resource, t = new T3.TextureLoader().load(new URL("../assets/wv/environment-next/" + file, import.meta.url).href, (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      loaded2++;
      uniforms[name].value.dispose();
      textures.delete(uniforms[name].value);
      uniforms[name].value = texture;
      onReady();
    }, void 0, () => {
      if (!disposed) {
        failed++;
        onReady();
      }
    });
    t.colorSpace = color2 ? T3.SRGBColorSpace : T3.NoColorSpace;
    t.wrapS = t.wrapT = T3.RepeatWrapping;
    t.minFilter = T3.LinearMipmapLinearFilter;
    t.magFilter = T3.LinearFilter;
    t.anisotropy = low ? SURFACE_DETAIL.lowAnisotropy : SURFACE_DETAIL.normalAnisotropy;
    textures.add(t);
  }
  for (const name of ["grass", "soil", "rock"]) uniforms[name].value.colorSpace = T3.SRGBColorSpace;
  function rebuild() {
    if (!world || disposed) return;
    field = createVisualField(world, { low, inputs });
    controlBuilds++;
    for (const [key2, data] of [["control", field.data], ["visual", field.visualData]]) {
      const t = uniforms[key2].value;
      t.image = { data, width: key2 === "visual" ? field.visualWidth : field.width, height: key2 === "visual" ? field.visualHeight : field.height };
      t.minFilter = t.magFilter = T3.LinearFilter;
      t.colorSpace = T3.NoColorSpace;
      t.needsUpdate = true;
    }
    uniforms.worldSize.value.set(world.width, world.depth);
  }
  return {
    material(index) {
      if (disposed || ![0, 1, 5].includes(index)) return null;
      const v = index === 5 ? vertex2.replace("attribute vec3 color;", "attribute float surfaceKind;attribute float surfaceOffset;varying float vKind;varying float vOffset;attribute vec3 color;").replace("vColor=color;", "vKind=surfaceKind;vOffset=surfaceOffset;vColor=color;") : vertex2;
      const m = new T3.ShaderMaterial({ uniforms, defines: low ? { LOW_QUALITY: 1 } : {}, vertexShader: v, fragmentShader: index === 0 ? terrain2 : index === 1 ? water2 : road2, side: T3.DoubleSide });
      materials.add(m);
      m.addEventListener("dispose", () => materials.delete(m));
      return m;
    },
    setWorld(next) {
      if (disposed) return;
      world = next;
      rebuild();
    },
    setVisualInputs(next = []) {
      if (disposed) return;
      inputs = next;
      rebuild();
    },
    sample(x, z) {
      return field?.sample(x, z) ?? null;
    },
    attachAtmosphere(scene) {
      if (disposed) return () => {
      };
      detach?.();
      const release = attachAtmosphere(scene, { low, time: uniforms.time });
      detach = release;
      return release;
    },
    advance(now) {
      if (disposed || low) return;
      if (lastTime) uniforms.time.value += Math.max(0, Math.min(100, now - lastTime)) / 1e3;
      lastTime = now;
    },
    pause() {
      lastTime = 0;
    },
    status: () => ({ disposed, surfaceControlBuilds: controlBuilds, surfaceTexturesLoaded: loaded2, surfaceTexturesExpected: resources.length, surfaceDetailRevision: SURFACE_DETAIL.revision, normalMaps: low ? 0 : 3, surfaceTexturesFailed: failed, surfaceTextureBytes: disposed ? 0 : resources.reduce((sum, r) => sum + mipBytes(r), 0) + (field ? field.data.byteLength + field.visualData.byteLength : 8), surfaceTime: uniforms.time.value, visualInputs: field?.acceptedInputs ?? 0, quality: low ? "low" : "normal", idleAnimation: !low, shadows: false }),
    dispose() {
      if (disposed) return;
      disposed = true;
      detach?.();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      materials.clear();
      textures.clear();
      field = null;
      world = null;
      inputs = [];
    }
  };
}

// environment-materials.mjs
import * as THREE from "../assets/vendor/three.module.mjs";
function createEnvironmentMaterials3({ low = false, onReady = () => {
} } = {}) {
  let disposed = false, loaded2 = 0, lastTime = 0, controlBuilds = 0;
  const loader = new THREE.TextureLoader(), textures = /* @__PURE__ */ new Map();
  const grass = loader.load(new URL("../assets/wv/environment-v1/grass.jpg", import.meta.url).href, (texture) => {
    if (disposed) return;
    loaded2++;
    onReady();
  });
  grass.colorSpace = THREE.SRGBColorSpace;
  grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
  grass.minFilter = THREE.LinearMipmapLinearFilter;
  grass.magFilter = THREE.LinearFilter;
  grass.generateMipmaps = true;
  grass.anisotropy = low ? 1 : 2;
  textures.set("grass", grass);
  const soil = loader.load(new URL("../assets/wv/environment-v1/soil.jpg", import.meta.url).href, (texture) => {
    if (disposed) return;
    loaded2++;
    onReady();
  });
  soil.colorSpace = THREE.SRGBColorSpace;
  soil.wrapS = soil.wrapT = THREE.RepeatWrapping;
  soil.minFilter = THREE.LinearMipmapLinearFilter;
  soil.anisotropy = low ? 1 : 2;
  textures.set("soil", soil);
  const control = new THREE.DataTexture(new Uint8Array([0, 255, 128, 128]), 1, 1);
  control.colorSpace = THREE.NoColorSpace;
  control.minFilter = control.magFilter = THREE.LinearFilter;
  control.needsUpdate = true;
  textures.set("control", control);
  const uniforms = { grass: { value: grass }, soil: { value: soil }, control: { value: control }, time: { value: 0 }, phase: { value: 0 }, worldSize: { value: new THREE.Vector2(1, 1) } };
  const vertexShader = `attribute vec3 color; varying vec3 vColor; varying vec3 vPosition; varying vec3 vNormal;
 void main(){vColor=color;vPosition=position;vNormal=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
  const fragmentShader = `uniform sampler2D grass; uniform sampler2D soil; uniform sampler2D control; uniform vec2 worldSize; varying vec3 vColor; varying vec3 vPosition; varying vec3 vNormal;
 void main(){vec3 detail=texture2D(grass,vPosition.xz/22.).rgb;
 vec4 weights=texture2D(control,(vPosition.xz+worldSize*.5)/worldSize);
 vec3 normal=normalize(vNormal);
 vec2 earthUV=abs(normal.y)<.65?(abs(normal.x)>abs(normal.z)?vPosition.zy:vPosition.xy):vPosition.xz;
 #ifdef LOW_QUALITY
 vec3 earth=vec3(dot(detail,vec3(.3,.5,.2)))*vec3(.85,.67,.48);
 #else
 vec3 earth=texture2D(soil,earthUV/19.).rgb;
 #endif
 float slope=smoothstep(.18,.65,1.-abs(normalize(vNormal).y));
 vec3 stone=vec3(dot(earth,vec3(.3,.5,.2)))*vec3(.88,.89,.83);
 vec3 meadow=mix(detail*vec3(.72,.84,.62),earth*vec3(.82,.76,.65),weights.r);
 meadow=mix(meadow,stone,slope*.86);
 meadow=mix(earth*vec3(.62,.61,.49),meadow,smoothstep(0.,.45,weights.g));
 float macro=.96+.04*sin(vPosition.x*.013+sin(vPosition.z*.017));
 float light=.70+.30*max(0.,dot(normalize(vNormal),normalize(vec3(-.40,.86,.25))));
 gl_FragColor=vec4(mix(vColor,meadow,.72)*macro*light,1.);
 #include <colorspace_fragment>
 }`;
  const roadVertex = vertexShader.replace("attribute vec3 color;", "attribute float surfaceKind; attribute float surfaceOffset; varying float vOffset; varying float vKind; attribute vec3 color;").replace("vColor=color;", "vOffset=surfaceOffset;vKind=surfaceKind;vColor=color;");
  const roadFragment = `uniform sampler2D soil;uniform sampler2D grass;uniform float phase;varying float vOffset;varying float vKind;varying vec3 vPosition;varying vec3 vColor;varying vec3 vNormal;
 void main(){float light=.70+.30*max(0.,dot(normalize(vNormal),normalize(vec3(-.40,.86,.25))));
 if(vKind<.5){gl_FragColor=vec4(vColor*light,1.);return;}
 vec3 earth=texture2D(soil,vPosition.xz/19.).rgb;
 #ifdef LOW_QUALITY
 vec3 turf=vec3(.19,.26,.11)*(.85+earth.g*.3);
 #else
 vec3 turf=texture2D(grass,vPosition.xz/22.).rgb*vec3(.72,.84,.62);
 #endif
 float noise=.5+.25*sin(vPosition.x*.25+sin(vPosition.z*.18)+phase)+.25*sin(vPosition.z*.19+vPosition.x*.14);
 vec3 dirt=earth*vec3(.92,.83,.68);
 float wear=vKind<1.5?.92:vKind<2.5?(1.-smoothstep(11.5+noise*.6,17.,abs(vOffset)))*.9:vKind<3.5?.72:vKind<4.5?.58:vKind<5.5?.86:.78;
 vec3 result=mix(turf,dirt,wear);
 if(vKind>4.5&&vKind<5.5)result=mix(result,vColor*.72,.25);
 gl_FragColor=vec4(result*light,1.);
 #include <colorspace_fragment>
 }`;
  const waterFragment = `uniform sampler2D control;uniform sampler2D soil;uniform vec2 worldSize;uniform float time;varying vec3 vPosition;
 void main(){vec4 field=texture2D(control,(vPosition.xz+worldSize*.5)/worldSize);
 vec2 flow=field.ba*2.-1.;float river=smoothstep(.1,.3,length(flow));
 vec2 uv=vPosition.xz/30.-flow*time*.035*river-vec2(time*.0015*(1.-river));
 float ripple=sin(uv.x*12.+sin(uv.y*8.))*sin(uv.y*10.);
 #ifndef LOW_QUALITY
 ripple=mix(ripple,texture2D(soil,uv).g*2.-1.,.35);
 #endif
 vec3 mud=vec3(.14,.20,.15),shallow=vec3(.11,.23,.22),deep=vec3(.025,.105,.13);
 vec3 color=mix(mud,shallow,smoothstep(0.,.20,field.g));
 color=mix(color,deep,smoothstep(.12,.95,field.g));
 color+=vec3(.006,.009,.009)*ripple*smoothstep(0.,.20,field.g);
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
 }`;
  return {
    material(index) {
      if (![0, 1, 5].includes(index)) return null;
      return new THREE.ShaderMaterial({ defines: low ? { LOW_QUALITY: 1 } : {}, uniforms, vertexShader: index === 5 ? roadVertex : vertexShader, fragmentShader: index === 1 ? waterFragment : index === 5 ? roadFragment : fragmentShader, side: THREE.DoubleSide });
    },
    advance(now) {
      if (lastTime) uniforms.time.value += Math.min(100, now - lastTime) / 1e3;
      lastTime = now;
    },
    pause() {
      lastTime = 0;
    },
    setWorld(world) {
      controlBuilds++;
      uniforms.phase.value = Array.from(String(world.options?.seed || "")).reduce((n, c) => n + c.charCodeAt(0), 0) % 97;
      const grid = createTerrainClassification(world, { width: low ? 64 : 96, height: low ? 48 : 72 });
      control.image = { data: grid.data, width: grid.width, height: grid.height };
      control.needsUpdate = true;
      uniforms.worldSize.value.set(world.width, world.depth);
    },
    status: () => ({ surfaceControlBuilds: controlBuilds, surfaceTexturesLoaded: loaded2, surfaceTextureBytes: 2 * 512 * 512 * 4 * 4 / 3 + (control.image.data?.byteLength || 0) }),
    dispose() {
      disposed = true;
      for (const texture of textures.values()) texture.dispose();
      textures.clear();
    }
  };
}

// environment-next/scale-context.mjs
import * as T4 from "../assets/vendor/three.module.mjs";

// asset-registry.mjs
var ARCHITECTURE_VERSION = "architecture-v1";
var HOME_IDS = Object.freeze(["home-long-ridge", "home-steep-gable", "home-low-hip", "home-crooked-wing", "home-offset-gables", "home-porch-cabin"]);
var base = new URL("../assets/wv/architecture-v1/", import.meta.url);
var assetURL = (id) => {
  if (!/^[a-z0-9-]+$/.test(id)) throw Error("Invalid asset ID");
  return new URL(id + ".glb", base).href;
};
var manifestURL = new URL("manifest.json", base).href;
function visualIdentity(worldSeed, entity) {
  const key2 = JSON.stringify([ARCHITECTURE_VERSION, worldSeed, entity.id ?? null, entity.x, entity.y, entity.foundedTurn ?? 0, entity.foundedEra ?? 0]);
  let hash = 2166136261;
  for (const c of key2) {
    hash ^= c.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function createResourceDisposer() {
  const geometries = /* @__PURE__ */ new WeakSet(), materials = /* @__PURE__ */ new WeakSet(), textures = /* @__PURE__ */ new WeakSet(), images = /* @__PURE__ */ new WeakSet();
  const once = (set, value, fn) => {
    if (!set.has(value)) {
      set.add(value);
      fn(value);
    }
  };
  return (scene) => scene.traverse((node) => {
    if (node.geometry) once(geometries, node.geometry, (g) => g.dispose());
    for (const material of node.material ? Array.isArray(node.material) ? node.material : [node.material] : []) {
      for (const value of Object.values(material)) if (value?.isTexture) once(textures, value, (texture) => {
        texture.dispose();
        const image = texture.source?.data;
        if (image?.close) once(images, image, (i) => i.close());
      });
      once(materials, material, (m) => m.dispose());
    }
  });
}
function createModelRegistry(loader) {
  const pending = /* @__PURE__ */ new Map();
  let disposed = false;
  const disposeResources = createResourceDisposer();
  let disposal;
  return {
    load(id) {
      if (disposed) return Promise.reject(Error("Registry disposed"));
      if (!pending.has(id)) {
        const source = Promise.resolve().then(() => loader.loadAsync(assetURL(id)));
        const promise = source.then((model) => {
          if (disposed) throw Error("Registry disposed");
          return model;
        }, (error) => {
          pending.delete(id);
          throw error;
        });
        pending.set(id, { source, promise });
      }
      return pending.get(id).promise;
    },
    dispose() {
      if (disposed) return disposal;
      disposed = true;
      disposal = Promise.allSettled([...pending.values()].map((r) => r.source.then((model) => disposeResources(model.scene))));
      pending.clear();
      return disposal;
    }
  };
}

// environment-next/scale-context.mjs
async function loadScaleContext(scene, getSurface, center) {
  const results = await Promise.allSettled([new T4.GLTFLoader().loadAsync(new URL("../assets/wv/megakit-catalog-v1/catalog.glb", import.meta.url).href), fetch(new URL("../assets/wv/megakit-catalog-v1/manifest.json", import.meta.url)).then((r) => {
    if (!r.ok) throw Error("Context manifest unavailable");
    return r.json();
  })]);
  const disposeModel = createResourceDisposer();
  if (results.some((r) => r.status === "rejected")) {
    if (results[0].status === "fulfilled") disposeModel(results[0].value.scene);
    throw Error("Context resources unavailable");
  }
  const model = results[0].value, manifest = results[1].value, group = new T4.Group(), world = getSurface(), envelopes = [], visualInputs = [];
  const ids = ["home-steep-gable", "home-long-ridge", "home-low-hip", "home-porch-cabin", "home-offset-gables", "market"];
  const positions = [];
  for (let z = center.y - 65; z <= center.y + 65; z += 26) for (let x = center.x - 65; x <= center.x + 65; x += 26) {
    const q = world.sample(x, z);
    if (q.water === null && world.slope(x, z) < 0.18) positions.push({ x, z, height: q.height });
  }
  for (const [i, id] of ids.entries()) {
    const source = model.scene.getObjectByName(id) || model.scene.getObjectByName("facility-" + id), p = positions[i];
    if (!source || !p) continue;
    const mesh = source.clone(true);
    mesh.scale.setScalar(2.8);
    const box = new T4.Box3().setFromObject(mesh);
    mesh.position.set(p.x - world.width / 2, p.height - box.min.y, p.z - world.depth / 2);
    group.add(mesh);
    mesh.updateMatrixWorld(true);
    envelopes.push(new T4.Box3().setFromObject(mesh));
    const entry = manifest.entries.find((e) => e.id === source.name), door = entry?.entrances?.[0];
    if (door && entry.overhangPolygon) {
      const point = (a, b) => ({ x: p.x + a * 2.8, z: p.z + b * 2.8 }), from = point(door.threshold[0], door.threshold[2]), to = point(door.threshold[0] + door.forward[0] * door.clearDepth, door.threshold[2] + door.forward[2] * door.clearDepth);
      visualInputs.push({ envelope: entry.overhangPolygon.map((v) => point(...v)), path: [from, to], radius: Math.max(2, door.clearWidth * 2.8), strength: 0.7 });
    }
  }
  const colors2 = ["#d6c5a5", "#765741", "#81503d", "#a58b5b", "#81796a", "#8c5549", "#4a829a"];
  for (const [i, color2] of colors2.entries()) {
    const p = positions[0] || { x: center.x, z: center.y, height: world.sample(center.x, center.y).height }, g = new T4.BoxGeometry(3, 4.9, 3), m = new T4.MeshStandardMaterial({ color: color2, roughness: 1, metalness: 0 }), mesh = new T4.Mesh(g, m);
    mesh.position.set(p.x - world.width / 2 + i * 5, p.height + 2.45, p.z - world.depth / 2 + 17);
    group.add(mesh);
  }
  scene.add(group);
  let disposed = false;
  return { envelopes, visualInputs, dispose() {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    disposeModel(group);
    disposeModel(model.scene);
  } };
}

// scene-batches.mjs
import * as THREE2 from "../assets/vendor/three.module.mjs";
function buildSceneBatches(objects, { chunkSize = 1024 } = {}) {
  const groups = /* @__PURE__ */ new Map();
  for (const { scene, entityKey } of objects) {
    scene.updateMatrixWorld(true);
    scene.traverseVisible((node) => {
      if (!node.isMesh) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      const p = new THREE2.Vector3().setFromMatrixPosition(node.matrixWorld);
      const key2 = [Math.floor((p.x + chunkSize / 2) / chunkSize), Math.floor((p.z + chunkSize / 2) / chunkSize), node.geometry.uuid, ...materials.map((m) => m.uuid)].join(":");
      if (!groups.has(key2)) groups.set(key2, { geometry: node.geometry, material: node.material, matrices: [], entities: [] });
      const batch = groups.get(key2);
      batch.matrices.push(node.matrixWorld.clone());
      batch.entities.push(entityKey);
    });
  }
  return [...groups.values()].map((group) => {
    const mesh = new THREE2.InstancedMesh(group.geometry, group.material, group.matrices.length);
    group.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    mesh.userData.entityKeys = group.entities;
    mesh.renderOrder = 7;
    return mesh;
  });
}
function estimateSceneBytes(scene) {
  const buffers = /* @__PURE__ */ new Set(), textures = /* @__PURE__ */ new Set();
  let geometryBytes = 0, textureBytes = 0;
  const buffer = (array) => {
    if (array && !buffers.has(array)) {
      buffers.add(array);
      geometryBytes += array.byteLength;
    }
  };
  scene.traverse((node) => {
    if (node.geometry) {
      for (const attribute of Object.values(node.geometry.attributes)) buffer(attribute.array || attribute.data?.array);
      buffer(node.geometry.index?.array);
    }
    buffer(node.instanceMatrix?.array);
    for (const material of node.material ? Array.isArray(node.material) ? node.material : [node.material] : [])
      for (const value of [...Object.values(material), ...Object.values(material.uniforms || {}).map((u) => u.value)]) if (value?.isTexture && !textures.has(value)) {
        textures.add(value);
        const data = value.source?.data;
        textureBytes += (data?.width || 0) * (data?.height || 0) * 4 * (value.generateMipmaps ? 4 / 3 : 1);
      }
  });
  return { geometryBytes, textureBytes: Math.ceil(textureBytes) };
}

// settlement-architecture.mjs
var clamp4 = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
var noise = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
var WALLS = [[0.86, 0.78, 0.63], [0.77, 0.7, 0.56], [0.91, 0.84, 0.7], [0.71, 0.69, 0.59], [0.82, 0.73, 0.62]];
var ROOFS = [[0.48, 0.32, 0.24], [0.36, 0.3, 0.26], [0.57, 0.39, 0.25], [0.39, 0.43, 0.38], [0.53, 0.29, 0.23]];
function cottageBlueprint(house) {
  const seed2 = Math.round(house.x) * 31 + Math.round(house.y) * 47 + (house.foundedTurn || 0) * 101;
  const era = clamp4(Math.trunc(house.foundedEra || 0), 0, 3);
  const variant = Math.floor(noise(seed2) * 5);
  const gate = house.entrance;
  const orientation = gate && Math.hypot(gate.x - house.x, gate.y - house.y) > 1 ? Math.atan2(gate.y - house.y, gate.x - house.x) - Math.PI / 2 : house.orientation || 0;
  const width = 17 + Math.floor(noise(seed2 + 9) * 8) + era * 1.5;
  const depth = 19 + Math.floor(noise(seed2 + 27) * 7) + era * 1.5;
  const height = 15 + Math.floor(noise(seed2 + 45) * 5) + era * 2;
  const wall = WALLS[(variant + era) % WALLS.length];
  const roof = ROOFS[(variant + era * 2) % ROOFS.length];
  return {
    era,
    variant,
    width,
    depth,
    height,
    orientation,
    wall,
    roof,
    chimney: era >= 1 || noise(seed2 + 6) > 0.64,
    porch: era < 2 && noise(seed2 + 17) > 0.4,
    roofRise: era >= 2 ? 0.48 : 0.68
  };
}
function buildingBlueprint(building, chapter = 0) {
  const seed2 = Math.round(building.x) * 17 + Math.round(building.y) * 29;
  const variant = Math.floor(noise(seed2 + 23) * 4);
  return {
    variant,
    era: clamp4(building.foundedEra ?? chapter, 0, 3),
    orientation: noise(seed2 + 15) * Math.PI * 0.4,
    roofRise: 0.45 + noise(seed2 + 2) * 0.22
  };
}
function buildingFootprint(type) {
  const width = type === "farm" || type === "market" ? 48 : type === "granary" ? 32 : 35;
  return { width, depth: width * 0.9 };
}

// foundation-system.mjs
function resolveFoundation(world, center, width, depth, orientation = 0) {
  const cs = Math.cos(orientation), sn = Math.sin(orientation);
  const corners = [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]].map(([x, y]) => ({ x: center.x + x * cs - y * sn, y: center.y + x * sn + y * cs }));
  const perimeter = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4];
    const count2 = Math.max(4, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3));
    const points = world.contactTrace ? world.contactTrace(a, b) : Array.from({ length: count2 + 1 }, (_, k) => ({ x: a.x + (b.x - a.x) * k / count2, y: a.y + (b.y - a.y) * k / count2 }));
    perimeter.push(...points.slice(0, -1));
  }
  const contacts = perimeter.map((p) => ({ ...p, ...world.sample(p.x, p.y) }));
  const interior = world.drapePolygon ? world.drapePolygon(corners).flat() : [center];
  const heights = [...contacts.map((p) => p.height), ...interior.map((p) => world.sample(p.x, p.y).height)];
  return {
    corners,
    perimeter: contacts,
    floor: Math.max(...heights) + 0.8,
    relief: Math.max(...heights) - Math.min(...heights),
    flooded: contacts.some((p) => p.water !== null)
  };
}

// organic-world.mjs
var worldModels = /* @__PURE__ */ new Map();
function modelFor(s) {
  if (!s?.worldOptions) return null;
  const opts = normalizeWorldSettings(s.worldOptions), key2 = JSON.stringify(opts);
  if (!worldModels.has(key2)) worldModels.set(key2, createWorld(opts));
  return worldModels.get(key2);
}
var WIDTH = 1200;
var HEIGHT = 900;
var clamp5 = (n, a, b) => Math.max(a, Math.min(b, n));
var dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
var rnd = (n) => {
  const v = Math.sin(n * 38.217 + 14.57) * 43758.5453;
  return v - Math.floor(v);
};
var pointOK = (p, bounds = { w: WIDTH, h: HEIGHT }) => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= bounds.w && p.y >= 0 && p.y <= bounds.h;
var ROAD_PAINT_HALF_WIDTH = 17;
var RIVER_PAINT_HALF_WIDTH = 61;
function riverX(y) {
  return 875 - 90 * Math.sin((y + 80) / 145) + 35 * Math.sin(y / 66);
}
var paintCross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function crossesRoad(a, b, roads) {
  for (const line of roads || []) for (let i = 1; i < line.length; i++) {
    const c = line[i - 1], d = line[i];
    const ab1 = paintCross(a, b, c), ab2 = paintCross(a, b, d), cd1 = paintCross(c, d, a), cd2 = paintCross(c, d, b);
    if (ab1 * ab2 < 0 && cd1 * cd2 < 0) return true;
  }
  return false;
}
function paintOnLand(s, p) {
  if (!pointOK(p)) return false;
  const model = modelFor(s);
  if (model) {
    if (model.sample(p.x, p.y).water !== null || model.slope(p.x, p.y) > 1.1) return false;
  } else if (Math.abs(p.x - riverX(p.y)) < RIVER_PAINT_HALF_WIDTH) return false;
  if ((s.roads || []).length) {
    const road3 = distanceToRoad(p, s.roads);
    if (road3 && road3.distance < ROAD_PAINT_HALF_WIDTH) return false;
  }
  return true;
}
function paintCellReachable(s, stamp, cell) {
  if (!paintOnLand(s, cell) || !paintOnLand(s, stamp)) return false;
  const model = modelFor(s);
  if (model) {
    const steps2 = Math.ceil(dist(stamp, cell) / 10);
    for (let i = 1; i < steps2; i++) {
      const p = { x: stamp.x + (cell.x - stamp.x) * i / steps2, y: stamp.y + (cell.y - stamp.y) * i / steps2 };
      if (model.sample(p.x, p.y).water !== null) return false;
    }
  } else if ((stamp.x - riverX(stamp.y)) * (cell.x - riverX(cell.y)) < 0) return false;
  if (crossesRoad(stamp, cell, s.roads)) return false;
  return true;
}
function zoneAt(s, p) {
  if (!paintOnLand(s, p)) return null;
  let latest = null;
  for (const z of s.zones || []) for (const q of z.points) {
    if (dist(p, q) > z.radius || !paintCellReachable(s, q, p)) continue;
    latest = z.type === "erase" ? null : z.type;
    break;
  }
  return latest;
}
function treeSites() {
  const out = [];
  for (let i = 0; i < 190; i++) {
    const x = 18 + rnd(i + 200) * 1160, y = 10 + rnd(i + 510) * 875;
    if (x > 135 && x < 730 && y > 275 && y < 660 || Math.abs(x - riverX(y)) < 77) continue;
    out.push({ x, y, r: 8 + rnd(i + 840) * 12 });
  }
  return out;
}
var TREES = treeSites();
function distanceToRoad(p, roads) {
  let best = null;
  for (const line of roads || []) for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], v = { x: b.x - a.x, y: b.y - a.y }, ll = v.x * v.x + v.y * v.y;
    const t = ll ? clamp5(((p.x - a.x) * v.x + (p.y - a.y) * v.y) / ll, 0, 1) : 0;
    const q = { x: a.x + v.x * t, y: a.y + v.y * t }, d = dist(p, q);
    if (!best || d < best.distance) best = { point: q, distance: d, segment: [a, b] };
  }
  return best;
}

// nature-visuals.mjs
function naturePlacements(world, state, { low = false } = {}) {
  const result = [];
  for (const tree of previewTrees(world, low ? 95 : 260)) {
    const p = { x: tree.x, y: tree.z }, r = tree.r || 6;
    if (world.sample(p.x, p.y).water !== null || zoneAt(state, p) === "farmland") continue;
    if ((state.houses || []).some((h) => {
      const b = cottageBlueprint(h);
      return Math.hypot(p.x - h.x, p.y - h.y) < Math.max(b.width, b.depth) * 0.72 + r;
    })) continue;
    if ((state.buildings || []).some((b) => {
      const f = buildingFootprint(b.type);
      return Math.hypot(p.x - b.x, p.y - b.y) < Math.max(f.width, f.depth) * 0.72 + r;
    })) continue;
    const lines = [...(state.roads || []).map((points) => ({ points, width: 17 })), ...(state.localLanes || []).map((l) => ({ points: l.points || [], width: 5 })), ...(state.houses || []).filter((h) => h.entrance).map((h) => ({ points: [h, h.entrance], width: 3 }))];
    if (lines.some((line) => line.points.slice(1).some((b, i) => {
      const a = line.points[i], dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t) < line.width + r;
    }))) continue;
    result.push({ key: `tree:${tree.x}:${tree.z}`, origin: [p.x - world.width / 2, world.sample(p.x, p.y).height - 0.02, p.y - world.depth / 2], scale: Math.min(tree.h / 1.22624, r * 2 / 0.739648), yaw: (p.x + p.y) * 0.1 });
  }
  return result;
}

// environment-next/review-renderer.mjs
import * as THREE3 from "../assets/vendor/three.module.mjs";

// editor-overlays.mjs
function projectEditorPoint(world, camera, rect, point) {
  const x = point.x - world.width / 2 - camera.focusX, z = point.y - world.depth / 2 - camera.focusZ;
  const y = world.sample(point.x, point.y).height + 3.2 - 17;
  const co = Math.cos(camera.yaw), si = Math.sin(camera.yaw);
  const xx = co * x + si * z, zz = -si * x + co * z;
  const yy = Math.cos(camera.pitch) * y - Math.sin(camera.pitch) * zz;
  return {
    x: rect.width / 2 + xx * rect.height / (2 * camera.zoom),
    y: rect.height / 2 - yy * rect.height / (2 * camera.zoom)
  };
}
function createEditorOverlay(canvas) {
  const overlay = document.createElement("canvas");
  overlay.setAttribute("aria-hidden", "true");
  overlay.dataset.roadEditorOverlay = "";
  overlay.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3";
  canvas.parentElement.append(overlay);
  const ctx = overlay.getContext("2d");
  return {
    draw(world, camera, markers) {
      const rect = canvas.getBoundingClientRect(), density = Math.min(devicePixelRatio || 1, 1.75);
      overlay.width = Math.round(rect.width * density);
      overlay.height = Math.round(rect.height * density);
      ctx.setTransform(density, 0, 0, density, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (const marker of markers) {
        const p = projectEditorPoint(world, camera, rect, marker.point);
        if (p.x < -22 || p.y < -22 || p.x > rect.width + 22 || p.y > rect.height + 22) continue;
        const rgb = marker.color.map((c) => Math.round(c * 255)).join(",");
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,250,223,.85)";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${rgb})`;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#33483c";
        ctx.stroke();
      }
      overlay.dataset.markerCount = String(markers.length);
    },
    dispose() {
      overlay.remove();
    }
  };
}

// terrain-surface.mjs
function terrainResolution(world, { lite = false, gameplay = false } = {}) {
  return lite ? [48, 36] : gameplay ? { small: [62, 46], medium: [76, 56], large: [88, 66] }[world.options.size] || [76, 56] : { small: [96, 72], medium: [112, 84], large: [128, 96] }[world.options.size] || [112, 84];
}
function createTerrainSurface(world, nx, nz) {
  const sx = world.width / nx, sy = world.depth / nz, cache = /* @__PURE__ */ new Map();
  const height = (i, j) => {
    const key2 = j * (nx + 1) + i;
    if (!cache.has(key2)) cache.set(key2, world.sample(i * sx, j * sy).height);
    return cache.get(key2);
  };
  function sample(x, y) {
    const gx = Math.max(0, Math.min(nx, x / sx)), gy = Math.max(0, Math.min(nz, y / sy));
    const i = Math.min(nx - 1, Math.floor(gx)), j = Math.min(nz - 1, Math.floor(gy));
    const u = gx - i, v = gy - j, a = height(i, j), b = height(i + 1, j), c = height(i + 1, j + 1), d = height(i, j + 1);
    return { ...world.sample(x, y), height: u + v <= 1 ? a + (b - a) * u + (d - a) * v : c + (d - c) * (1 - u) + (b - c) * (1 - v) };
  }
  function trace(a, b) {
    const times = [0, 1];
    for (const [start, end] of [
      [a.x / sx, b.x / sx],
      [a.y / sy, b.y / sy],
      [a.x / sx + a.y / sy, b.x / sx + b.y / sy]
    ]) {
      if (Math.abs(end - start) < 1e-10) continue;
      for (let k = Math.floor(Math.min(start, end)) + 1; k < Math.max(start, end); k++) {
        const t = (k - start) / (end - start);
        if (t > 0 && t < 1) times.push(t);
      }
    }
    return [...new Set(times)].sort((a2, b2) => a2 - b2).map((t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }));
  }
  function drape(polygon) {
    const result = [];
    const xs = polygon.map((p) => p.x / sx), ys = polygon.map((p) => p.y / sy);
    const loX = Math.max(0, Math.floor(Math.min(...xs))), hiX = Math.min(nx - 1, Math.floor(Math.max(...xs)));
    const loY = Math.max(0, Math.floor(Math.min(...ys))), hiY = Math.min(nz - 1, Math.floor(Math.max(...ys)));
    for (let j = loY; j <= hiY; j++) for (let i = loX; i <= hiX; i++) {
      for (const planes of [
        [(p) => p.x / sx - i, (p) => p.y / sy - j, (p) => 1 - (p.x / sx - i) - (p.y / sy - j)],
        [(p) => i + 1 - p.x / sx, (p) => j + 1 - p.y / sy, (p) => p.x / sx - i + (p.y / sy - j) - 1]
      ]) {
        let clipped = polygon;
        for (const distance5 of planes) {
          const next = [];
          for (let k = 0; k < clipped.length; k++) {
            const a = clipped[k], b = clipped[(k + 1) % clipped.length], da = distance5(a), db = distance5(b);
            if (da >= -1e-9) next.push(a);
            if (da < 0 && db > 0 || da > 0 && db < 0) {
              const t = da / (da - db);
              next.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
            }
          }
          clipped = next;
          if (clipped.length < 3) break;
        }
        for (let k = 1; k + 1 < clipped.length; k++) {
          const tri = [clipped[0], clipped[k], clipped[k + 1]];
          const [a, b, c] = tri;
          if (Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) > 1e-7) result.push(tri);
        }
      }
    }
    return result;
  }
  return { ...world, sample, contactTrace: trace, drapePolygon: drape };
}

// road-network.mjs
var nodeAt = (g, id) => g.nodes.find((n) => n.id === id) || null;
var lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
function quadraticPoint(a, c, b, t) {
  return lerp(lerp(a, c, t), lerp(c, b, t), t);
}

// road-surface.mjs
function sampleRoadAlignment(a, control, b, spacing = 6) {
  const distance5 = (p, q) => Math.hypot(q.x - p.x, q.y - p.y);
  const length2 = control ? distance5(a, control) + distance5(control, b) : distance5(a, b);
  const count2 = Math.max(1, Math.ceil(length2 / spacing));
  return Array.from({ length: count2 + 1 }, (_, i) => control ? quadraticPoint(a, control, b, i / count2) : { x: a.x + (b.x - a.x) * i / count2, y: a.y + (b.y - a.y) * i / count2 });
}

// road-visual-offsets.mjs
function roadVisualOffsets(world, state, vertices, kinds, liveCurve = null) {
  const lines = [];
  if (state.roadGraph?.segments?.length) {
    const nodes = new Map(state.roadGraph.nodes.map((n) => [n.id, n]));
    for (const e of state.roadGraph.segments) {
      const a = nodes.get(e.a), b = nodes.get(e.b);
      if (a && b) lines.push(sampleRoadAlignment(a, liveCurve?.id === e.id ? liveCurve.control : e.control, b));
    }
  } else lines.push(...state.roads || []);
  const segments = lines.flatMap((points) => points.slice(1).map((b, i) => [points[i], b]));
  const offsets = new Float32Array(kinds.length);
  for (let k = 0; k < kinds.length; k++) if (kinds[k] === 2) {
    const x = vertices[k * 9] + world.width / 2, y = vertices[k * 9 + 2] + world.depth / 2;
    let best = Infinity, signed = 0;
    for (const [a, b] of segments) {
      const dx = b.x - a.x, dy = b.y - a.y, len2 = Math.hypot(dx, dy);
      if (len2 < 1e-8) continue;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (len2 * len2)));
      const distance5 = Math.hypot(x - a.x - dx * t, y - a.y - dy * t);
      if (distance5 < best) {
        best = distance5;
        signed = distance5 * Math.sign(dx * (y - a.y) - dy * (x - a.x));
      }
    }
    offsets[k] = signed;
  }
  return offsets;
}

// road-junctions.mjs
var halfWidth = (p, width) => width / 2 + (width === 34 ? 1.2 : 0.45) * Math.sin(p.x * 0.11 + p.y * 0.07) * Math.sin(p.y * 0.13 - p.x * 0.04);
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
var cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function hull(points) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y), lower = [], upper = [];
  for (const p of sorted) {
    while (lower.length > 1 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop();
    lower.push(p);
  }
  for (const p of sorted.reverse()) {
    while (upper.length > 1 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
function trim(points, amount) {
  let remaining = amount;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length2 = distance(a, b);
    if (length2 >= remaining) {
      const t = remaining / (length2 || 1);
      return [
        { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        ...points.slice(i)
      ];
    }
    remaining -= length2;
  }
  return points;
}
function roadJunctionPolygons(graph, liveCurve = null) {
  const edges = [], incident = new Map(graph.nodes.map((n) => [n.id, []]));
  for (const edge of graph.segments) {
    const a = nodeAt(graph, edge.a), b = nodeAt(graph, edge.b);
    if (!a || !b) continue;
    const control = liveCurve?.id === edge.id ? liveCurve.control : edge.control;
    const length2 = control ? distance(a, control) + distance(control, b) : distance(a, b);
    const steps2 = Math.max(1, Math.ceil(length2 / 6));
    const points = Array.from({ length: steps2 + 1 }, (_, k) => control ? quadraticPoint(a, control, b, k / steps2) : { x: a.x + (b.x - a.x) * k / steps2, y: a.y + (b.y - a.y) * k / steps2 });
    const run = points.slice(1).reduce((n, p, i) => n + distance(p, points[i]), 0);
    const item = { edge, points, run };
    edges.push(item);
    incident.get(a.id).push(item);
    incident.get(b.id).push(item);
  }
  const radius = (id) => Math.min(24, ...incident.get(id).map((e) => e.run * 0.3));
  const layers = [];
  for (const width of [34, 24]) {
    const polygons = [], mouths = new Map(graph.nodes.map((n) => [n.id, []]));
    for (const { edge, points: original } of edges) {
      let points = trim(original, incident.get(edge.a).length > 1 ? radius(edge.a) : 0);
      points = trim([...points].reverse(), incident.get(edge.b).length > 1 ? radius(edge.b) : 0).reverse();
      const crossSections = points.map((p, i) => {
        const before = points[Math.max(0, i - 1)], after = points[Math.min(points.length - 1, i + 1)];
        const dx = after.x - before.x, dy = after.y - before.y, d = Math.hypot(dx, dy) || 1;
        const r = halfWidth(p, width);
        return [{ x: p.x - dy / d * r, y: p.y + dx / d * r }, { x: p.x + dy / d * r, y: p.y - dx / d * r }];
      });
      for (let i = 1; i < crossSections.length; i++) polygons.push([
        crossSections[i - 1][0],
        crossSections[i][0],
        crossSections[i][1],
        crossSections[i - 1][1]
      ]);
      for (const [id, index, other] of [[edge.a, 0, 1], [edge.b, points.length - 1, points.length - 2]]) {
        mouths.get(id).push(...crossSections[index]);
        if (incident.get(id).length !== 1) continue;
        const p = points[index], q = points[other], angle = Math.atan2(p.y - q.y, p.x - q.x);
        polygons.push([p, ...Array.from({ length: 13 }, (_, k) => ({
          x: p.x + Math.cos(angle - Math.PI / 2 + k / 12 * Math.PI) * halfWidth(p, width),
          y: p.y + Math.sin(angle - Math.PI / 2 + k / 12 * Math.PI) * halfWidth(p, width)
        }))]);
      }
    }
    for (const [id, points] of mouths) if (incident.get(id).length > 1) {
      const polygon = hull(points);
      if (polygon.length >= 3) polygons.push(polygon);
    }
    layers.push(polygons);
  }
  return { shoulders: layers[0], pavement: layers[1] };
}

// desire-paths.mjs
var distance2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
var lerp2 = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
function visibleDesirePaths(state) {
  return (state.desirePaths || []).map((path) => {
    if (!Array.isArray(path.via) || path.via.length < 2)
      return {
        from: path.from,
        to: lerp2(path.from, path.to, path.progress),
        complete: path.progress >= 1,
        nodeId: path.nodeId
      };
    const segments = path.via.slice(1).map((p, i) => ({
      a: path.via[i],
      b: p,
      length: distance2(path.via[i], p)
    }));
    const total = segments.reduce((n, e) => n + e.length, 0);
    let remaining = total * path.progress;
    const visible = [path.via[0]];
    for (const part of segments) {
      if (remaining <= 0) break;
      const t = Math.min(1, remaining / Math.max(1e-3, part.length));
      visible.push(lerp2(part.a, part.b, t));
      remaining -= part.length;
    }
    return {
      from: visible[0],
      to: visible.at(-1),
      points: visible,
      complete: path.progress >= 1,
      nodeId: path.nodeId
    };
  });
}

// road-editor.mjs
var CURVE_STEPS = 14;
var copyPoint = (p) => ({ x: p.x, y: p.y });
var quadratic = (a, c, b, t) => ({
  x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x,
  y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y
});
function flattenRoadDraft(d) {
  if (!d.anchors.length) return [];
  const points = [copyPoint(d.anchors[0])];
  for (let i = 0; i < d.controls.length; i++) {
    const a = d.anchors[i], b = d.anchors[i + 1], c = d.controls[i];
    if (c) for (let step = 1; step <= CURVE_STEPS; step++) points.push(quadratic(a, c, b, step / CURVE_STEPS));
    else points.push(copyPoint(b));
  }
  return points;
}
function curvePoint(d, index, t) {
  const a = d.anchors[index], b = d.anchors[index + 1], c = d.controls[index];
  return c ? quadratic(a, c, b, t) : { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function curvedSegments(d) {
  return d.controls.map((c, i) => c ? { index: i, anchor: curvePoint(d, i, 0.5), control: copyPoint(c) } : null).filter(Boolean);
}

// game-3d-mesh.mjs
var colors = {
  road: [0.73, 0.65, 0.49],
  roadEdge: [0.48, 0.51, 0.36],
  path: [0.6, 0.49, 0.34],
  residential: [0.76, 0.61, 0.41],
  commercial: [0.48, 0.64, 0.69],
  farmland: [0.7, 0.68, 0.38],
  preserve: [0.4, 0.59, 0.39],
  erase: [0.71, 0.37, 0.29],
  wall: [0.86, 0.78, 0.62],
  roof: [0.5, 0.32, 0.25],
  farm: [0.69, 0.58, 0.38],
  lumber: [0.56, 0.38, 0.26],
  smith: [0.39, 0.48, 0.48],
  park: [0.39, 0.59, 0.4],
  plaza: [0.7, 0.65, 0.51],
  market: [0.78, 0.57, 0.35],
  granary: [0.62, 0.46, 0.31]
};
var len = (v) => Math.hypot(...v) || 1;
function addTri(out, a, b, c, color2) {
  const u = b.map((v2, i) => v2 - a[i]), v = c.map((x, i) => x - a[i]);
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const norm = n.map((x) => x / len(n));
  for (const p of [a, b, c]) {
    out.push(...p, ...color2, ...norm);
    out.surfaceKinds?.push(out.surfaceKind || 0);
  }
}
function quad(out, a, b, c, d, color2) {
  addTri(out, a, b, c, color2);
  addTri(out, a, c, d, color2);
}
function groundPolygon(out, world, points, color2, offset) {
  if (world.drapePolygon) {
    for (const tri of world.drapePolygon(points)) {
      const vertices = tri.map((p) => worldPos(world, p, offset));
      const [a, b, c] = vertices;
      if ((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]) > 0) vertices.reverse();
      addTri(out, ...vertices, color2);
    }
  } else for (let i = 1; i + 1 < points.length; i++)
    addTri(out, worldPos(world, points[0], offset), worldPos(world, points[i], offset), worldPos(world, points[i + 1], offset), color2);
}
function worldPos(world, p, offset = 2) {
  const sample = world.sample(p.x, p.y);
  return [p.x - world.width / 2, sample.height + offset, p.y - world.depth / 2];
}
function terrainRibbon(out, world, points, width, color2, offset = 1.1, spacing = 6) {
  if (!Array.isArray(points) || points.length < 2) return;
  const samples = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length2 = Math.hypot(b.x - a.x, b.y - a.y);
    if (length2 < 0.01) continue;
    const count2 = Math.max(1, Math.ceil(length2 / spacing));
    for (let k = 1; k <= count2; k++) {
      const t = k / count2;
      samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  if (samples.length < 2) return;
  const cross3 = [];
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i], before = samples[Math.max(0, i - 1)], after = samples[Math.min(samples.length - 1, i + 1)];
    const dx = after.x - before.x, dy = after.y - before.y, length2 = Math.hypot(dx, dy) || 1;
    const nx = -dy / length2 * width * 0.5, ny = dx / length2 * width * 0.5;
    cross3.push([
      worldPos(world, { x: p.x + nx, y: p.y + ny }, offset),
      worldPos(world, { x: p.x - nx, y: p.y - ny }, offset)
    ]);
  }
  for (let i = 1; i < cross3.length; i++)
    groundPolygon(out, world, [cross3[i - 1][0], cross3[i][0], cross3[i][1], cross3[i - 1][1]].map((p) => ({ x: p[0] + world.width / 2, y: p[2] + world.depth / 2 })), color2, offset);
}
function ribbon(out, world, points, width, color2, offset = 1.1) {
  terrainRibbon(out, world, points, width, color2, offset);
}
function surfaceRibbon(out, world, points, width, color2, offset = 1.1, kind = 4) {
  const before = out.surfaceKind;
  out.surfaceKind = kind;
  ribbon(out, world, points, width, color2, offset);
  out.surfaceKind = before;
}
function surfacePolygon(out, world, points, color2, offset, kind = 6) {
  const before = out.surfaceKind;
  out.surfaceKind = kind;
  groundPolygon(out, world, points, color2, offset);
  out.surfaceKind = before;
}
function block(out, world, p, width, depth, height, wall, roof, orientation = 0, style = {}) {
  const cs = Math.cos(orientation), sn = Math.sin(orientation), x = width / 2, z = depth / 2;
  const position = (dx, dz) => ({
    x: p.x + dx * cs - dz * sn,
    y: p.y + dx * sn + dz * cs
  });
  const footprint2 = [[-x, -z], [x, -z], [x, z], [-x, z]];
  const foundation = resolveFoundation(world, p, width, depth, orientation);
  const floor = style.floorY ?? foundation.floor;
  const vert = (dx, y, dz) => {
    const xy = position(dx, dz);
    return [xy.x - world.width / 2, floor + y, xy.y - world.depth / 2];
  };
  const stone = [0.5, 0.47, 0.4];
  const contacts = foundation.perimeter;
  for (let i = 0; i < contacts.length; i++) {
    const a2 = contacts[i], b2 = contacts[(i + 1) % contacts.length];
    const vertex3 = (q, y) => [q.x - world.width / 2, y, q.y - world.depth / 2];
    quad(
      out,
      vertex3(a2, a2.height - 0.4),
      vertex3(b2, b2.height - 0.4),
      vertex3(b2, floor),
      vertex3(a2, floor),
      stone
    );
  }
  if (style.foundationOnly) {
    quad(out, vert(-x, 0, -z), vert(x, 0, -z), vert(x, 0, z), vert(-x, 0, z), stone);
    return;
  }
  const a = vert(-x, 0, -z), b = vert(x, 0, -z), c = vert(x, 0, z), d = vert(-x, 0, z);
  const at = vert(-x, height, -z), bt = vert(x, height, -z), ct = vert(x, height, z), dt = vert(-x, height, z);
  quad(out, a, b, bt, at, wall);
  quad(out, b, c, ct, bt, wall);
  quad(out, c, d, dt, ct, wall);
  quad(out, d, a, at, dt, wall);
  const rise = Math.min(width, depth) * (style.roofRise ?? 0.62);
  const ridgeLeft = vert(0, height + rise, -z), ridgeRight = vert(0, height + rise, z);
  quad(out, at, bt, ridgeRight, ridgeLeft, roof);
  quad(out, dt, ct, ridgeRight, ridgeLeft, roof);
  addTri(out, at, ridgeLeft, bt, wall);
  addTri(out, dt, ct, ridgeRight, wall);
  if (style.chimney) {
    const chimneyStone = [0.44, 0.4, 0.35], h = height + rise + 5;
    const c1 = vert(width * 0.16, height + 2, -depth * 0.23), c2 = vert(width * 0.32, height + 2, -depth * 0.23), c3 = vert(width * 0.32, height + 2, -depth * 0.1), c4 = vert(width * 0.16, height + 2, -depth * 0.1), u1 = vert(width * 0.16, h, -depth * 0.23), u2 = vert(width * 0.32, h, -depth * 0.23), u3 = vert(width * 0.32, h, -depth * 0.1), u4 = vert(width * 0.16, h, -depth * 0.1);
    quad(out, c1, c2, u2, u1, chimneyStone);
    quad(out, c2, c3, u3, u2, chimneyStone);
    quad(out, c3, c4, u4, u3, chimneyStone);
    quad(out, c4, c1, u1, u4, chimneyStone);
    quad(out, u1, u2, u3, u4, [0.3, 0.29, 0.27]);
  }
  if (style.porch) {
    const wood = [0.45, 0.33, 0.24], w = Math.min(6, width * 0.3);
    quad(
      out,
      vert(-w, height * 0.47, depth / 2),
      vert(w, height * 0.47, depth / 2),
      vert(w, height * 0.47, depth / 2 + 6),
      vert(-w, height * 0.47, depth / 2 + 6),
      wood
    );
  }
}
function accessSteps(markers, surfaces, world, approach) {
  if (!approach) return;
  const { from, to, dx, dy, distance: distance5, floor } = approach;
  const stairLength = Math.min(distance5, Math.max(3, (floor - world.sample(from.x, from.y).height) * 1.8));
  const n = Math.max(2, Math.ceil(stairLength / 1.5));
  const point = (along, side, y) => [from.x + dx * along - dy * side - world.width / 2, y, from.y + dy * along + dx * side - world.depth / 2];
  const end = { x: from.x + dx * stairLength, y: from.y + dy * stairLength };
  const bottom = world.sample(end.x, end.y).height + 0.85;
  for (let i = 0; i < n; i++) {
    const a = i / n * stairLength, b = (i + 1) / n * stairLength, y = floor + (bottom - floor) * i / n, next = floor + (bottom - floor) * (i + 1) / n;
    quad(markers, point(a, -1.2, y), point(b, -1.2, y), point(b, 1.2, y), point(a, 1.2, y), [0.5, 0.47, 0.4]);
    quad(markers, point(b, -1.2, y), point(b, -1.2, next), point(b, 1.2, next), point(b, 1.2, y), [0.46, 0.43, 0.37]);
  }
  surfaceRibbon(surfaces, world, [end, to], 2.4, colors.path, 0.85);
}
function beacon(out, world, p, radius, color2) {
  (out.editorMarkers ??= []).push({ point: { x: p.x, y: p.y }, color: color2 });
}
var curvePoints = (a, c, b, steps2 = 18) => Array.from({ length: steps2 + 1 }, (_, i) => quadraticPoint(a, c, b, i / steps2));
function settlementGeometry(world, state, {
  modelHouses = /* @__PURE__ */ new Map(),
  modelBuildings = /* @__PURE__ */ new Map(),
  cropRows = [],
  draft = null,
  zoneStrokes = [],
  zoneType = "residential",
  zoneRadius = 54,
  zoneEdits = null,
  mode = "explore",
  liveCurve = null,
  liveGesture = null,
  pendingControl = null,
  touchFocus = null
} = {}) {
  const surfaces = [], zones = [], markers = [], roadGuides = [];
  surfaces.surfaceKinds = [];
  const zonePalette = { ...colors };
  const paint = /* @__PURE__ */ new Map(), step = 20;
  function applyStroke(points, radius, type) {
    for (const p of points) for (let dx = -radius; dx <= radius; dx += step) for (let dy = -radius; dy <= radius; dy += step) {
      if (dx * dx + dy * dy > radius * radius) continue;
      const x = Math.floor((p.x + dx) / step), y = Math.floor((p.y + dy) / step);
      const center = { x: (x + 0.5) * step, y: (y + 0.5) * step };
      if (center.x < 0 || center.y < 0 || center.x > world.width || center.y > world.depth) continue;
      if (world.sample(center.x, center.y).water !== null) continue;
      if ((state.roads || []).some((line) => line.some((point, i) => {
        if (!i) return false;
        const a = line[i - 1], b = point, vx = b.x - a.x, vy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((center.x - a.x) * vx + (center.y - a.y) * vy) / (vx * vx + vy * vy || 1)));
        return Math.hypot(center.x - a.x - vx * t, center.y - a.y - vy * t) < 17;
      }))) continue;
      paint.set(x + "," + y, { x, y, type });
    }
  }
  for (const stroke of state.zones || []) applyStroke(stroke.points, stroke.radius, stroke.type);
  const pending = zoneEdits || zoneStrokes.map((points) => ({ type: zoneType, radius: zoneRadius, points }));
  for (const edit of pending) applyStroke(edit.points, edit.radius, edit.type);
  let drawn = 0;
  for (const p of paint.values()) {
    if (p.type === "erase" || drawn++ > 12e3) continue;
    const x = p.x * step, y = p.y * step;
    const corners = [[x, y], [x + step, y], [x + step, y + step], [x, y + step]].map(([xx, yy]) => worldPos(world, { x: xx, y: yy }, 0.35));
    quad(zones, ...corners, zonePalette[p.type] || colors.residential);
  }
  for (const lane3 of state.localLanes || []) if (lane3.points?.length > 1) {
    surfaceRibbon(surfaces, world, lane3.points, 5, colors.path, 0.85, 3);
    if (lane3.foundedTurn === state.turn) ribbon(roadGuides, world, lane3.points, 2.5, [0.99, 0.77, 0.4], 4);
  }
  for (const trail of visibleDesirePaths(state)) {
    const line = trail.points || [trail.from, trail.to];
    if (line.length > 1) surfaceRibbon(surfaces, world, line, 4, colors.path, 0.8);
  }
  const graph = state.roadGraph;
  if (graph?.segments?.length) {
    const network = roadJunctionPolygons(graph, liveCurve);
    for (const polygon of network.shoulders) surfacePolygon(surfaces, world, polygon, colors.roadEdge, 0.95, 2);
    for (const polygon of network.pavement) surfacePolygon(surfaces, world, polygon, colors.road, 1.3, 1);
    if (liveCurve) {
      const e = graph.segments.find((e2) => e2.id === liveCurve.id);
      const a = e && nodeAt(graph, e.a), b = e && nodeAt(graph, e.b);
      if (a && b) ribbon(roadGuides, world, curvePoints(a, liveCurve.control, b), 13, [0.99, 0.77, 0.34], 4.8);
    }
  } else for (const road3 of state.roads || []) {
    if (road3.length < 2) continue;
    surfaceRibbon(surfaces, world, road3, 34, colors.roadEdge, 0.95, 2);
    surfaceRibbon(surfaces, world, road3, 24, colors.road, 1.3, 1);
  }
  for (const house of state.houses || []) {
    const style = cottageBlueprint(house), model = modelHouses.get?.(house);
    block(markers, world, house, model?.width ?? style.width, model?.depth ?? style.depth, style.height, style.wall, style.roof, style.orientation, { ...style, foundationOnly: modelHouses.has(house) });
    if (model) accessSteps(markers, surfaces, world, model.approach);
    if (house.foundedTurn === state.turn && house.parcel?.vertices?.length > 2)
      ribbon(roadGuides, world, [...house.parcel.vertices, house.parcel.vertices[0]], 2.5, [1, 0.8, 0.37], 4);
  }
  for (const building of state.buildings || []) {
    const material = colors[building.type] || colors.wall;
    const { width: size, depth } = buildingFootprint(building.type);
    const height = building.type === "granary" ? 40 : building.type === "market" ? 29 : building.type === "lumber" ? 27 : 24;
    const style = buildingBlueprint(building, state.civic?.chapter || 0);
    const model = modelBuildings.get(building);
    if (model) {
      if (model.groundSpace) {
        const cs = Math.cos(-model.yaw), sn = Math.sin(-model.yaw);
        const position = (x, y) => ({ x: building.x + x * cs - y * sn, y: building.y + x * sn + y * cs });
        const w = model.width / 2, d = model.depth / 2;
        const polygon = [[-w * 0.7, -d], [w * 0.7, -d], [w, -d * 0.7], [w, d * 0.7], [w * 0.7, d], [-w * 0.7, d], [-w, d * 0.7], [-w, -d * 0.7]].map(([x, y]) => position(x, y));
        if (building.type !== "park") {
          const triangles = world.drapePolygon ? world.drapePolygon(polygon) : [polygon];
          for (const tri of triangles) {
            const center = { x: tri.reduce((n, p) => n + p.x, 0) / tri.length, y: tri.reduce((n, p) => n + p.y, 0) / tri.length };
            if ([...tri, center].every((p) => world.sample(p.x, p.y).water === null)) surfacePolygon(surfaces, world, tri, building.type === "plaza" ? [0.58, 0.55, 0.47] : colors.path, 0.65, building.type === "plaza" ? 5 : 6);
          }
        } else {
          const points = [position(0, -d), position(-w * 0.25, -d * 0.3), position(w * 0.25, d * 0.3), position(0, d)];
          if (points.every((p) => world.sample(p.x, p.y).water === null)) surfaceRibbon(surfaces, world, points, 3, colors.path, 0.65);
        }
        if (model.approach) surfaceRibbon(surfaces, world, [model.approach.from, model.approach.to], 2.4, colors.path, 0.65);
        for (const rect of model.propFoundations || []) block(markers, world, rect, rect.width, rect.depth, 0, material, colors.roof, 0, { foundationOnly: true, floorY: rect.floor });
      } else {
        for (const rect of model.foundationRects || [{ ...building, width: model.width, depth: model.depth }])
          block(markers, world, rect, rect.width, rect.depth, 0, material, colors.roof, -model.yaw, { foundationOnly: true, floorY: model.origin[1] });
        accessSteps(markers, surfaces, world, model.approach);
      }
    } else block(markers, world, building, size, depth, height, material, colors.roof, style.orientation, style);
  }
  for (const row of cropRows) {
    for (const dx of [-2, 2]) {
      surfaceRibbon(surfaces, world, [{ x: row.x + dx, y: row.y - 4 }, { x: row.x + dx, y: row.y + 4 }], 1.7, [0.36, 0.29, 0.18], 0.9, 0);
      for (const dy of [-3, -1, 1, 3]) {
        const p = worldPos(world, { x: row.x + dx, y: row.y + dy }, 1);
        addTri(markers, [p[0] - 1, p[1], p[2]], [p[0] + 1, p[1], p[2]], [p[0], p[1] + 3, p[2]], [0.64, 0.58, 0.3]);
      }
    }
  }
  if (mode === "road") {
    if (touchFocus && Number.isFinite(touchFocus.x) && Number.isFinite(touchFocus.y))
      beacon(roadGuides, world, touchFocus, 5, [1, 0.91, 0.61], [0.32, 0.42, 0.3], 7);
    if (graph) {
      for (const n of graph.nodes) beacon(
        roadGuides,
        world,
        n,
        n.id === graph.hubId ? 8 : 6,
        n.id === graph.hubId ? [0.97, 0.72, 0.37] : [0.86, 0.94, 0.77]
      );
      for (const e of graph.segments) {
        if (!e.control) continue;
        const a = nodeAt(graph, e.a), b = nodeAt(graph, e.b);
        if (a && b) beacon(
          roadGuides,
          world,
          quadraticPoint(a, liveCurve?.id === e.id ? liveCurve.control : e.control, b, 0.5),
          7,
          [1, 0.58, 0.26],
          [0.38, 0.24, 0.16],
          15
        );
      }
    }
    const draftLine = draft?.anchors?.length > 1 ? flattenRoadDraft(draft) : [];
    if (draftLine.length > 1) {
      ribbon(roadGuides, world, draftLine, 26, [0.99, 0.72, 0.37], 5);
      ribbon(roadGuides, world, draftLine, 12, [1, 0.9, 0.58], 5.7);
    }
    for (const p of draft?.anchors || []) beacon(roadGuides, world, p, 7, [1, 0.91, 0.6], [0.36, 0.33, 0.22], 13);
    for (const bend of draft ? curvedSegments(draft) : [])
      beacon(roadGuides, world, bend.anchor, 7, [1, 0.67, 0.32], [0.42, 0.25, 0.12], 15);
    if (pendingControl && draft?.anchors?.length) {
      const anchor = draft.anchors.at(-1);
      ribbon(roadGuides, world, [anchor, pendingControl], 3, [1, 0.82, 0.48], 10);
      beacon(roadGuides, world, pendingControl, 7, [1, 0.57, 0.21], [0.4, 0.22, 0.1], 16);
    }
    if (liveGesture) {
      const { start, end, control } = liveGesture;
      if (start && end && control) {
        const shape = curvePoints(start, control, end);
        if (Math.hypot(end.x - start.x, end.y - start.y) > 8)
          ribbon(roadGuides, world, shape, 14, [0.99, 0.77, 0.37], 6);
        ribbon(roadGuides, world, [end, control], 3, [0.99, 0.85, 0.55], 11);
        beacon(roadGuides, world, end, 7, [1, 0.94, 0.66], [0.31, 0.35, 0.22], 16);
        beacon(roadGuides, world, control, 7, [1, 0.55, 0.22], [0.39, 0.22, 0.12], 16);
      }
    }
  }
  return {
    editorMarkers: roadGuides.editorMarkers || [],
    surfaceOffsets: roadVisualOffsets(world, state, surfaces, surfaces.surfaceKinds, liveCurve),
    surfaceKinds: new Float32Array(surfaces.surfaceKinds),
    surfaces: new Float32Array(surfaces),
    zones: new Float32Array(zones),
    structures: new Float32Array(markers),
    guides: new Float32Array(roadGuides),
    counts: {
      roads: (state.roads || []).length,
      houses: (state.houses || []).length,
      buildings: (state.buildings || []).length,
      zonedCells: drawn,
      guideTriangles: roadGuides.length / 27
    }
  };
}

// camera-gestures.mjs
var wrapAngle = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
var pair = (points) => {
  const [a, b] = points, dx = b.x - a.x, dy = b.y - a.y;
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    distance: Math.max(1, Math.hypot(dx, dy)),
    angle: Math.atan2(dy, dx)
  };
};
function trackballVector(x, y, viewport) {
  const w = Math.max(1, viewport.width), h = Math.max(1, viewport.height);
  const size = Math.max(80, Math.min(w, h) * 1.2);
  const nx = (x - (viewport.left + w / 2)) * 2 / size;
  const ny = (viewport.top + h / 2 - y) * 2 / size;
  const d = nx * nx + ny * ny;
  const z = d <= 0.5 ? Math.sqrt(Math.max(0, 1 - d)) : 0.5 / Math.sqrt(d);
  const norm = Math.hypot(nx, ny, z) || 1;
  return [nx / norm, ny / norm, z / norm];
}
function beginCameraGesture(points, viewport = { left: 0, top: 0, width: 400, height: 400 }) {
  if (!Array.isArray(points) || points.length !== 2) return null;
  const initial = pair(points);
  return { last: initial, viewport: {
    left: viewport.left || 0,
    top: viewport.top || 0,
    width: Math.max(1, viewport.width || 400),
    height: Math.max(1, viewport.height || 400)
  } };
}
function advanceCameraGesture(gesture, points) {
  if (!gesture || !Array.isArray(points) || points.length !== 2) return null;
  const previous2 = gesture.last, current = pair(points);
  gesture.last = current;
  const v = trackballVector(previous2.x, previous2.y, gesture.viewport);
  const w = trackballVector(current.x, current.y, gesture.viewport);
  const cross3 = [
    v[1] * w[2] - v[2] * w[1],
    v[2] * w[0] - v[0] * w[2],
    v[0] * w[1] - v[1] * w[0]
  ];
  const magnitude = Math.hypot(...cross3);
  const angle = Math.atan2(
    magnitude,
    Math.max(-1, Math.min(1, v[0] * w[0] + v[1] * w[1] + v[2] * w[2]))
  );
  const scale = magnitude > 1e-9 ? angle / magnitude : 0;
  const twist = wrapAngle(current.angle, previous2.angle);
  return {
    kind: "trackball",
    // "Push" direction: the map moves with the hands, not as if the user
    // were dragging the camera rig in the opposite direction.
    yawDelta: -cross3[1] * scale - twist * 0.78,
    pitchDelta: cross3[0] * scale,
    zoomRatio: previous2.distance / current.distance,
    previous: previous2,
    current
  };
}

// ui-kit/kenney-models.mjs
var HOST = "https://hidencod.github.io/tge-assets/packs/";
var KENNEY_MODELS = Object.freeze({
  oak: HOST + "nature-kit/tree-oak.glb",
  pine: HOST + "nature-kit/tree-pinedefaulta.glb",
  birch: HOST + "nature-kit/tree-default.glb",
  rock: HOST + "nature-kit/rock-largea.glb",
  shrub: HOST + "nature-kit/plant-bush.glb",
  bridge: HOST + "nature-kit/bridge-wood.glb",
  tower: HOST + "castle-kit/tower-square.glb",
  ground: HOST + "nature-kit/ground-grass.glb",
  waterTile: HOST + "nature-kit/ground-rivertile.glb",
  bank: HOST + "nature-kit/ground-riverside.glb",
  cliff: HOST + "nature-kit/cliff-rock.glb",
  beach: HOST + "nature-kit/platform-beach.glb"
});
var WILLOW_PALETTE = Object.freeze({
  land: [0.393, 0.535, 0.358],
  water: [0.29, 0.51, 0.604],
  stone: [0.493, 0.483, 0.443],
  cliff: [0.493, 0.483, 0.443],
  rock: [0.51, 0.49, 0.446],
  ground: [0.41, 0.548, 0.372],
  bank: [0.55, 0.553, 0.471],
  beach: [0.675, 0.645, 0.526],
  waterTile: [0.31, 0.527, 0.615],
  oak: [0.3, 0.485, 0.345],
  pine: [0.25, 0.426, 0.325],
  birch: [0.345, 0.52, 0.385],
  shrub: [0.39, 0.53, 0.34],
  tower: [0.58, 0.56, 0.49]
});
function harmonizeKenneyColor(type, source) {
  const raw = source.map((v) => Math.max(0, Math.min(1, Number(v) || 0)));
  const tree = ["oak", "pine", "birch", "shrub"].includes(type);
  const bark = tree && raw[0] > raw[1] * 1.065 && raw[0] > raw[2] * 1.18;
  const target = bark ? [0.48, 0.365, 0.265] : WILLOW_PALETTE[type] || WILLOW_PALETTE.rock;
  const luminance = 0.25 * raw[0] + 0.62 * raw[1] + 0.13 * raw[2];
  const detail = Math.max(0.78, Math.min(1.13, 0.79 + luminance * 0.48));
  return target.map((v) => Math.min(0.91, Math.max(0.03, v * detail)));
}
var loaded = /* @__PURE__ */ new Map();
function parseGLB(buffer) {
  const v = new DataView(buffer);
  if (v.getUint32(0, true) !== 1179937895 || v.getUint32(4, true) !== 2)
    throw Error("Invalid glTF binary model");
  const decoder = new TextDecoder();
  let offset = 12, document2 = null, binary = null;
  while (offset + 8 <= buffer.byteLength) {
    const length2 = v.getUint32(offset, true), type = v.getUint32(offset + 4, true);
    if (length2 < 0 || offset + 8 + length2 > buffer.byteLength) throw Error("Corrupt model chunk");
    if (type === 1313821514) document2 = JSON.parse(decoder.decode(new Uint8Array(buffer, offset + 8, length2)));
    if (type === 5130562) binary = buffer.slice(offset + 8, offset + 8 + length2);
    offset += 8 + length2;
  }
  if (!document2 || !binary) throw Error("Incomplete glTF binary");
  const bin = new DataView(binary);
  const accessor = (id) => {
    const a = document2.accessors[id], b = document2.bufferViews[a.bufferView];
    if (!a || !b) throw Error("Missing glTF buffer");
    const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type] || 1;
    const bytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
    if (!bytes) throw Error("Unsupported glTF component type");
    const stride = b.byteStride || width * bytes;
    const begin = (b.byteOffset || 0) + (a.byteOffset || 0);
    function read(i, k) {
      const pos = begin + i * stride + k * bytes;
      switch (a.componentType) {
        case 5126:
          return bin.getFloat32(pos, true);
        case 5125:
          return bin.getUint32(pos, true);
        case 5123:
          return bin.getUint16(pos, true);
        case 5122:
          return bin.getInt16(pos, true);
        case 5121:
          return bin.getUint8(pos);
        default:
          return bin.getInt8(pos);
      }
    }
    return { count: a.count, width, read };
  };
  function rotate(v2, q) {
    const [x, y, z, w] = q, uv = [
      y * v2[2] - z * v2[1],
      z * v2[0] - x * v2[2],
      x * v2[1] - y * v2[0]
    ];
    const uuv = [y * uv[2] - z * uv[1], z * uv[0] - x * uv[2], x * uv[1] - y * uv[0]];
    return v2.map((n, i) => n + 2 * (w * uv[i] + uuv[i]));
  }
  function makeTransform(node, parent) {
    const t = node.translation || [0, 0, 0], s = node.scale || [1, 1, 1], q = node.rotation || [0, 0, 0, 1];
    const map = (point) => {
      const rotated = rotate(point.map((value, i) => value * s[i]), q);
      return parent(rotated.map((value, i) => value + t[i]));
    };
    return map;
  }
  const identity = (p) => p;
  const output = [], dims = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
  const parents = document2.nodes || [];
  const scene = document2.scenes?.[document2.scene || 0];
  function visit(index, transform) {
    const node = parents[index];
    if (!node) return;
    const toWorld = makeTransform(node, transform);
    if (node.mesh !== void 0) {
      const mesh = document2.meshes[node.mesh];
      for (const primitive of mesh.primitives || []) {
        if (primitive.mode !== void 0 && primitive.mode !== 4) continue;
        if (primitive.attributes?.POSITION === void 0) continue;
        const pos = accessor(primitive.attributes.POSITION);
        const normals = primitive.attributes.NORMAL !== void 0 ? accessor(primitive.attributes.NORMAL) : null;
        const colors2 = primitive.attributes.COLOR_0 !== void 0 ? accessor(primitive.attributes.COLOR_0) : null;
        const indices = primitive.indices !== void 0 ? accessor(primitive.indices) : null;
        const material = document2.materials?.[primitive.material || 0] || {};
        const base3 = material.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1];
        const getIndex = (i) => indices ? indices.read(i, 0) : i;
        for (let i = 0; i < (indices?.count || pos.count); i += 3) {
          if (i + 2 >= (indices?.count || pos.count)) break;
          const triangle = [getIndex(i), getIndex(i + 1), getIndex(i + 2)];
          const points = triangle.map((j) => {
            const vtx = toWorld([pos.read(j, 0), pos.read(j, 1), pos.read(j, 2)]);
            for (let a2 = 0; a2 < 3; a2++) {
              dims.min[a2] = Math.min(dims.min[a2], vtx[a2]);
              dims.max[a2] = Math.max(dims.max[a2], vtx[a2]);
            }
            return vtx;
          });
          const [a, b, c] = points;
          const ab = b.map((x, j) => x - a[j]), ac = c.map((x, j) => x - a[j]);
          const n = [
            ab[1] * ac[2] - ab[2] * ac[1],
            ab[2] * ac[0] - ab[0] * ac[2],
            ab[0] * ac[1] - ab[1] * ac[0]
          ];
          const length2 = Math.hypot(...n) || 1, normal = n.map((x) => x / length2);
          triangle.forEach((j, k) => {
            const p = points[k], vertexColor = colors2 ? [
              colors2.read(j, 0),
              colors2.read(j, 1),
              colors2.read(j, 2)
            ] : [1, 1, 1];
            const color2 = base3.slice(0, 3).map((x, k2) => Math.min(1, Math.max(0.02, x * vertexColor[k2])));
            output.push(...p, ...color2, ...normal);
          });
        }
      }
    }
    for (const child of node.children || []) visit(child, toWorld);
  }
  for (const root of scene?.nodes || parents.map((_, i) => i)) visit(root, identity);
  if (!output.length) throw Error("Model has no triangles");
  return { vertices: new Float32Array(output), min: dims.min, max: dims.max };
}
async function fetchKenneyModel(name) {
  if (!KENNEY_MODELS[name]) throw Error("Unknown Kenney model " + name);
  if (!loaded.has(name)) {
    loaded.set(name, (async () => {
      const response = await fetch(KENNEY_MODELS[name], { mode: "cors" });
      if (!response.ok) throw Error("Kenney model " + name + ": HTTP " + response.status);
      return parseGLB(await response.arrayBuffer());
    })().catch((error) => {
      loaded.delete(name);
      throw error;
    }));
  }
  return loaded.get(name);
}
function instantiateKenney(world, models, { showReference = false, maxTrees = 650 } = {}) {
  const output = [];
  function put(name, x, z, height, yaw) {
    const model = models[name];
    if (!model) return;
    const span = Math.max(1e-3, model.max[1] - model.min[1]);
    const scale = height / span;
    const base3 = world.sample(x, z).height;
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    const data = model.vertices;
    for (let i = 0; i < data.length; i += 9) {
      const px = (data[i] - (model.min[0] + model.max[0]) / 2) * scale;
      const py = (data[i + 1] - model.min[1]) * scale;
      const pz = (data[i + 2] - (model.min[2] + model.max[2]) / 2) * scale;
      const nx = data[i + 6], ny = data[i + 7], nz = data[i + 8];
      output.push(
        x - world.width / 2 + px * cs - pz * sn,
        base3 + py,
        z - world.depth / 2 + px * sn + pz * cs,
        ...harmonizeKenneyColor(name, [data[i + 3], data[i + 4], data[i + 5]]),
        nx * cs - nz * sn,
        ny,
        nx * sn + nz * cs
      );
    }
  }
  const mix2 = ["oak", "pine", "birch"];
  let treeModels = 0;
  const drawnTrees = previewTrees(world, maxTrees);
  for (let i = 0; i < drawnTrees.length; i++) {
    const t = drawnTrees[i], which = mix2[i % mix2.length];
    if (!models[which]) continue;
    put(which, t.x, t.z, t.h, i * 1.61803398875 % 6.283);
    treeModels++;
  }
  if (models.rock) for (let i = 0; i < 23; i++) {
    const x = (0.09 + i * 73 % 79 / 100) * world.width;
    const z = (0.13 + i * 47 % 69 / 100) * world.depth;
    const terrain3 = world.sample(x, z);
    if (terrain3.water !== null || world.slope(x, z) > 1.2) continue;
    put("rock", x, z, 6 + i % 5 * 2, i * 0.47);
  }
  if (showReference && models.tower) {
    const x = world.width * 0.36, z = world.depth * 0.58;
    if (world.sample(x, z).water === null) put("tower", x, z, 34, 0.48);
  }
  return { vertices: new Float32Array(output), treeModels };
}
function instantiateKenneyTerrain(world, models, { density = 1 } = {}) {
  const land = [], water3 = [];
  const size = Math.min(world.width, world.depth);
  const hash = (i) => {
    let v = i * 1664525 + 1013904223 + world.options.seed.length * 374761393 >>> 0;
    v = Math.imul(v ^ v >>> 13, 1274126177);
    return ((v ^ v >>> 16) >>> 0) / 4294967295;
  };
  function instance(key2, x, z, footprint2, rotation, category = "land", faceRise = 0) {
    const model = models[key2];
    if (!model) return;
    const destination = category === "water" ? water3 : land;
    const span = Math.max(1e-4, model.max[0] - model.min[0], model.max[2] - model.min[2]);
    const verticalSpan = Math.max(1e-3, model.max[1] - model.min[1]);
    const scale = footprint2 / span, cs = Math.cos(rotation), sn = Math.sin(rotation);
    const centerX = (model.min[0] + model.max[0]) / 2, centerZ = (model.min[2] + model.max[2]) / 2;
    const reference = world.sample(x, z), level = reference.water;
    if (category === "water" && level === null) return;
    const input = model.vertices;
    for (let i = 0; i + 26 < input.length; i += 27) {
      const triangle = [], terrain3 = [];
      for (let j = 0; j < 3; j++) {
        const v = i + j * 9;
        const dx = (input[v] - centerX) * scale, dz = (input[v + 2] - centerZ) * scale;
        const X = x + dx * cs - dz * sn, Z = z + dx * sn + dz * cs;
        const surface = world.sample(X, Z);
        const up = Math.max(0, input[v + 1] - model.min[1]);
        let y = surface.height + 0.11 + up * Math.min(0.33, scale * 0.042);
        if (category === "water") y = level + 0.74;
        if (category === "cliff") {
          y = reference.height - faceRise * 0.42 + up / verticalSpan * faceRise;
        }
        const nx = input[v + 6], ny = input[v + 7], nz = input[v + 8];
        const rgb = harmonizeKenneyColor(key2, [input[v + 3], input[v + 4], input[v + 5]]);
        triangle.push(
          X - world.width / 2,
          y,
          Z - world.depth / 2,
          ...rgb,
          nx * cs - nz * sn,
          ny,
          nx * sn + nz * cs
        );
        terrain3.push(surface);
      }
      if (category === "water" && terrain3.some((p) => p.water === null)) continue;
      if (category === "land" && terrain3.some((p) => p.water !== null)) continue;
      destination.push(...triangle);
    }
  }
  if (models.ground) for (let i = 0; i < Math.max(8, Math.round(100 * density)); i++) {
    const x = (0.035 + 0.93 * hash(i * 19 + 3)) * world.width;
    const z = (0.035 + 0.93 * hash(i * 19 + 7)) * world.depth;
    const local = world.sample(x, z);
    if (local.water !== null || world.slope(x, z) > 0.24) continue;
    instance("ground", x, z, 9 + hash(i * 19 + 11) * 9, hash(i * 19 + 17) * Math.PI * 2);
  }
  if (models.waterTile) for (const stream of world.rivers) for (let i = 2; i < stream.points.length - 2; i += 3) {
    const point = stream.points[i], a = stream.points[i - 1], b = stream.points[i + 1];
    if (world.sample(point.x, point.z).kind !== "river") continue;
    instance(
      "waterTile",
      point.x,
      point.z,
      stream.width * 0.9,
      Math.atan2(b.z - a.z, b.x - a.x),
      "water"
    );
  }
  if (models.bank || models.beach) for (const lake of world.lakes) for (let i = 0; i < lake.spine.length; i += density < 0.5 ? 4 : 2) {
    const p = lake.spine[i], angle = (i + lake.x) * 2.4;
    const x = p.x + Math.cos(angle) * p.r * 1.12, z = p.z + Math.sin(angle) * p.r * 1.12;
    if (world.sample(x, z).water !== null) continue;
    instance(i % 3 === 0 && models.beach ? "beach" : "bank", x, z, 10 + hash(i * 17 + Math.round(lake.x)) * 8, angle);
  }
  if (models.cliff) for (let i = 0; i < Math.max(20, Math.round(260 * density)); i++) {
    const x = (0.045 + 0.91 * hash(1400 + i * 23)) * world.width;
    const z = (0.045 + 0.91 * hash(1401 + i * 23)) * world.depth;
    const sample = world.sample(x, z);
    if (sample.water !== null) continue;
    const d = 9, west = world.sample(x - d, z).height, east = world.sample(x + d, z).height;
    const north = world.sample(x, z - d).height, south = world.sample(x, z + d).height;
    const rise = Math.max(west, east, north, south) - Math.min(west, east, north, south);
    const grade = world.slope(x, z);
    if (grade < 0.64 || rise < 12) continue;
    const angle = Math.atan2(south - north, east - west);
    const height = Math.min(36, Math.max(10, rise * 0.89));
    instance("cliff", x, z, Math.min(23, Math.max(12, height * 0.7)), angle, "cliff", height);
  }
  return { land: new Float32Array(land), water: new Float32Array(water3) };
}
function kenneyLandscapePalette(models) {
  const brightness = (model) => {
    if (!model) return 1;
    const data = model.vertices, stride = Math.max(9, Math.floor(data.length / 5e3) * 9);
    let total = 0, count2 = 0;
    for (let i = 0; i < data.length; i += stride) {
      total += 0.25 * data[i + 3] + 0.62 * data[i + 4] + 0.13 * data[i + 5];
      count2++;
    }
    const mean = count2 ? total / count2 : 0.5;
    return Math.max(0.965, Math.min(1.035, 1 + (mean - 0.5) * 0.085));
  };
  return {
    land: WILLOW_PALETTE.land.map((v) => v * brightness(models.ground)),
    water: WILLOW_PALETTE.water.map((v) => v * brightness(models.waterTile)),
    stone: WILLOW_PALETTE.stone.map((v) => v * brightness(models.cliff))
  };
}

// ui-kit/render-3d.mjs
var VERTEX = [
  "attribute vec3 aPosition; attribute vec3 aColor; attribute vec3 aNormal;",
  "uniform vec3 uFocus; uniform float uYaw; uniform float uPitch;",
  "uniform float uZoom; uniform float uAspect;",
  "varying vec3 vColor; varying float vLight; varying vec3 vWorld;",
  "void main(){",
  " vec3 p=aPosition-uFocus; vWorld=aPosition;",
  " float co=cos(uYaw),si=sin(uYaw);",
  " float xx=co*p.x+si*p.z;",
  " float zz=-si*p.x+co*p.z;",
  " float yy=cos(uPitch)*p.y-sin(uPitch)*zz;",
  " float depth=sin(uPitch)*p.y+cos(uPitch)*zz;",
  " gl_Position=vec4(xx/(uZoom*uAspect),yy/uZoom,-depth/2700.0,1.0);",
  " vec3 sun=normalize(vec3(-0.40,0.86,0.25));",
  " vLight=0.70+0.30*max(0.0,dot(normalize(aNormal),sun));",
  " vColor=aColor;",
  "}"
].join("\n");
var FRAGMENT = [
  "precision mediump float; varying vec3 vColor; varying float vLight;",
  "varying vec3 vWorld; uniform float uWater; uniform float uOpacity;",
  "void main(){",
  " vec3 color=vColor*vLight;",
  " if(uWater>0.5){",
  "   // Subtle sunlight glints across calm water; no saturated cyan or",
  "   // time-dependent noise that would shimmer while the camera moves.",
  "   float wave=sin(vWorld.x*0.105+vWorld.z*0.052)*",
  "              sin(vWorld.z*0.089-vWorld.x*0.036);",
  "   float glint=pow(max(0.0,wave),5.0)*0.085;",
  "   color+=vec3(glint*0.64,glint*0.88,glint);",
  " }",
  " gl_FragColor=vec4(clamp(color,0.0,1.0),uOpacity);",
  "}"
].join("\n");
function makeShader(gl, type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) || "Shader error");
  return s;
}
function makeProgram(gl) {
  const p = gl.createProgram();
  gl.attachShader(p, makeShader(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(p, makeShader(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p) || "3D unavailable");
  return p;
}
function mountWorld3D(canvas, initialWorld, {
  onAssets = () => {
  },
  onCamera = () => {
  },
  onReady = () => {
  },
  onError = () => {
  },
  showReference = false,
  interactive = true,
  quality: quality2 = "standard",
  presentation = null
} = {}) {
  const gl = presentation ? null : canvas.getContext("webgl", {
    antialias: true,
    alpha: false,
    depth: true,
    powerPreference: "low-power",
    preserveDrawingBuffer: false
  });
  if (!gl && !presentation) throw new Error("3D preview requires WebGL support in your browser.");
  const program = presentation ? null : makeProgram(gl);
  const loc = presentation ? {} : {
    position: gl.getAttribLocation(program, "aPosition"),
    color: gl.getAttribLocation(program, "aColor"),
    normal: gl.getAttribLocation(program, "aNormal"),
    focus: gl.getUniformLocation(program, "uFocus"),
    yaw: gl.getUniformLocation(program, "uYaw"),
    pitch: gl.getUniformLocation(program, "uPitch"),
    zoom: gl.getUniformLocation(program, "uZoom"),
    aspect: gl.getUniformLocation(program, "uAspect"),
    water: gl.getUniformLocation(program, "uWater"),
    opacity: gl.getUniformLocation(program, "uOpacity")
  };
  const editorOverlay = createEditorOverlay(canvas);
  let editorMarkers = [];
  const buffers = Array.from({ length: 9 }, () => presentation ? null : gl.createBuffer());
  const kenney = {}, kitNames = ["oak", "pine", "birch", "rock", "tower", "ground", "waterTile", "bank", "cliff", "beach"];
  let loadedAssets = 0, showcase = showReference, disposed = false, firstDraw = false;
  const lite = quality2 === "lite", gameplay = quality2 === "game" || lite;
  let counts = [0, 0, 0, 0, 0, 0, 0, 0, 0], world = initialWorld;
  let contactWorld = initialWorld;
  let settlement = null, settlementDraft = null, settlementZoneStrokes = [], settlementZoneType = "residential", settlementRadius = 54;
  let settlementEdits = null, settlementMode = "explore", settlementLiveCurve = null, settlementLiveGesture = null, settlementPendingControl = null, settlementTouchFocus = null;
  const camera = { yaw: 0.71, pitch: 0.86, zoom: 650, focusX: 0, focusZ: 0 };
  const pointers = /* @__PURE__ */ new Map();
  let gesture = null, frame = 0;
  function resetCamera() {
    camera.yaw = 0.71;
    camera.pitch = 0.86;
    camera.focusX = 0;
    camera.focusZ = 0;
    const aspect = Math.max(0.4, canvas.getBoundingClientRect().width / Math.max(1, canvas.getBoundingClientRect().height));
    camera.zoom = Math.max(world.width / aspect, world.depth) * 0.71;
    render();
  }
  function upload(newWorld, reset = true) {
    world = newWorld;
    const resolution = terrainResolution(world, { lite, gameplay });
    contactWorld = createTerrainSurface(world, ...resolution);
    const geometry = createWorldMesh(world, ...resolution, {
      trees: !presentation && !["oak", "pine", "birch"].some((key2) => kenney[key2]),
      coherentMeadow: !!presentation,
      palette: kenneyLandscapePalette(kenney),
      treeLimit: lite ? 95 : gameplay ? 300 : 650
    });
    put(0, geometry.ground);
    put(1, geometry.water);
    presentation?.setTerrain(contactWorld, geometry.ground);
    counts = [geometry.ground.length / 9, geometry.water.length / 9, 0, 0, 0, 0, 0, 0, 0];
    updateKenney();
    if (settlement) updateSettlement();
    if (reset) resetCamera();
    else render();
  }
  function put(index, data, surfaceKinds = null, surfaceOffsets = null) {
    if (presentation) {
      presentation.upload(index, data, surfaceKinds, surfaceOffsets);
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers[index]);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  }
  function updateKenney() {
    if (!loadedAssets || disposed) return;
    const props = instantiateKenney(contactWorld, kenney, {
      showReference: showcase,
      maxTrees: gameplay ? 260 : 650
    });
    const terrain3 = instantiateKenneyTerrain(contactWorld, kenney, {
      density: gameplay ? 0.32 : 1
    });
    for (const [index, data] of [[2, props.vertices], [3, terrain3.land], [4, terrain3.water]]) {
      put(index, data);
      counts[index] = data.length / 9;
    }
    render();
  }
  async function loadModels() {
    if (lite || presentation) return;
    const results = await Promise.allSettled(kitNames.map((key2) => fetchKenneyModel(key2)));
    if (disposed) return;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        kenney[kitNames[i]] = r.value;
        loadedAssets++;
      }
    });
    if (loadedAssets) try {
      upload(world, false);
    } catch (error) {
      onError(error);
    }
    onAssets({
      loaded: loadedAssets,
      total: kitNames.length,
      treeModels: ["oak", "pine", "birch"].filter((k) => kenney[k]).length,
      reference: !!kenney.tower,
      terrain: !!kenney.ground,
      river: !!kenney.waterTile,
      bank: !!kenney.bank,
      online: loadedAssets > 0
    });
  }
  function drawBuffer(buffer, count2, isWater = false, opacity = 1) {
    if (!count2) return;
    gl.uniform1f(loc.water, isWater ? 1 : 0);
    gl.uniform1f(loc.opacity, opacity);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (const [location2, offset] of [
      [loc.position, 0],
      [loc.color, 3],
      [loc.normal, 6]
    ]) {
      gl.enableVertexAttribArray(location2);
      gl.vertexAttribPointer(location2, 3, gl.FLOAT, false, 36, offset * 4);
    }
    gl.drawArrays(gl.TRIANGLES, 0, count2);
  }
  function draw() {
    frame = 0;
    if (disposed || document.hidden) return;
    try {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      if (presentation) presentation.draw(camera, rect);
      else {
        const density = Math.min(window.devicePixelRatio || 1, 1.75);
        const width = Math.round(rect.width * density), height = Math.round(rect.height * density);
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
        gl.clearColor(0.71, 0.8, 0.74, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(program);
        gl.uniform3f(loc.focus, camera.focusX, 17, camera.focusZ);
        gl.uniform1f(loc.yaw, camera.yaw);
        gl.uniform1f(loc.pitch, camera.pitch);
        gl.uniform1f(loc.zoom, camera.zoom);
        gl.uniform1f(loc.aspect, Math.max(0.1, width / height));
        drawBuffer(buffers[0], counts[0]);
        drawBuffer(buffers[3], counts[3]);
        drawBuffer(buffers[1], counts[1], true);
        drawBuffer(buffers[4], counts[4], true);
        drawBuffer(buffers[2], counts[2]);
        drawBuffer(buffers[5], counts[5]);
        drawBuffer(buffers[6], counts[6], false, 0.52);
        drawBuffer(buffers[7], counts[7]);
        gl.disable(gl.DEPTH_TEST);
        drawBuffer(buffers[8], counts[8]);
        gl.enable(gl.DEPTH_TEST);
      }
      editorOverlay.draw(contactWorld, camera, editorMarkers);
      if (!firstDraw) {
        firstDraw = true;
        onReady();
      }
    } catch (error) {
      onError(error);
    }
  }
  function render() {
    if (disposed) return;
    onCamera({ ...camera });
    if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function zoomBy(factor) {
    camera.zoom = clamp(
      camera.zoom * factor,
      Math.max(world.width, world.depth) * 0.08,
      Math.max(world.width, world.depth) * 2.4
    );
    render();
  }
  function updateSettlement() {
    if (!settlement) return;
    const placements = presentation?.setSettlement(contactWorld, settlement, updateSettlement);
    const modelHouses = placements?.houses || /* @__PURE__ */ new Map(), modelBuildings = placements?.buildings || /* @__PURE__ */ new Map();
    const data = settlementGeometry(contactWorld, settlement, {
      modelHouses,
      modelBuildings,
      cropRows: placements?.cropRows || [],
      draft: settlementDraft,
      zoneStrokes: settlementZoneStrokes,
      zoneType: settlementZoneType,
      zoneRadius: settlementRadius,
      zoneEdits: settlementEdits,
      mode: settlementMode,
      liveCurve: settlementLiveCurve,
      touchFocus: settlementTouchFocus,
      liveGesture: settlementLiveGesture,
      pendingControl: settlementPendingControl
    });
    for (const [index, vertices] of [[5, data.surfaces], [6, data.zones], [7, data.structures], [8, data.guides]]) {
      put(index, vertices, index === 5 ? data.surfaceKinds : null, index === 5 ? data.surfaceOffsets : null);
      counts[index] = vertices.length / 9;
    }
    editorMarkers = data.editorMarkers;
    canvas.dataset.roadEditorMarkers = String(editorMarkers.length);
    canvas.dataset.terrainContact = "triangle-grid";
    canvas.dataset.roadGuideTriangles = String(data.counts.guideTriangles || 0);
    canvas.dataset.roadCurveRadius = String(settlementLiveGesture?.radius || 0);
    canvas.dataset.pendingZoning = String(settlementEdits?.length || 0);
    render();
  }
  function screenToWorld(clientX, clientY) {
    if (presentation) return presentation.screenToWorld(clientX, clientY, camera);
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    const sx = (clientX - rect.left) / rect.width * 2 - 1, sy = 1 - (clientY - rect.top) / rect.height * 2;
    const xx = sx * camera.zoom * rect.width / rect.height, yy = sy * camera.zoom;
    const cs = Math.cos(camera.yaw), sn = Math.sin(camera.yaw);
    let depth = (Math.cos(camera.pitch) * (15 - 17) - yy) / Math.max(0.2, Math.sin(camera.pitch));
    let x = camera.focusX + xx * cs - depth * sn, z = camera.focusZ + xx * sn + depth * cs;
    for (let i = 0; i < 7; i++) {
      const ground = contactWorld.sample(x + world.width / 2, z + world.depth / 2).height;
      depth = (Math.cos(camera.pitch) * (ground - 17) - yy) / Math.max(0.2, Math.sin(camera.pitch));
      x = camera.focusX + xx * cs - depth * sn;
      z = camera.focusZ + xx * sn + depth * cs;
    }
    return { x: x + world.width / 2, y: z + world.depth / 2 };
  }
  function focusOn(x, z, zoom = null) {
    camera.focusX = clamp(x - world.width / 2, -world.width / 2, world.width / 2);
    camera.focusZ = clamp(z - world.depth / 2, -world.depth / 2, world.depth / 2);
    if (zoom !== null) camera.zoom = clamp(
      zoom,
      Math.max(world.width, world.depth) * 0.08,
      Math.max(world.width, world.depth) * 2.4
    );
    render();
  }
  function panBy(dx, dy) {
    const rect = canvas.getBoundingClientRect();
    const horizontal = -dx / Math.max(1, rect.height) * 2 * camera.zoom;
    const vertical = -dy / Math.max(1, rect.height) * 2 * camera.zoom / Math.max(0.22, Math.sin(camera.pitch));
    const cs = Math.cos(camera.yaw), sn = Math.sin(camera.yaw);
    camera.focusX = clamp(camera.focusX + horizontal * cs - vertical * sn, -world.width / 2, world.width / 2);
    camera.focusZ = clamp(camera.focusZ + horizontal * sn + vertical * cs, -world.depth / 2, world.depth / 2);
    render();
  }
  function navigateTouches(change) {
    if (!change) return;
    camera.yaw += change.yawDelta;
    camera.pitch = clamp(camera.pitch + change.pitchDelta, 0.32, 1.47);
    camera.zoom = clamp(
      camera.zoom * change.zoomRatio,
      Math.max(world.width, world.depth) * 0.035,
      Math.max(world.width, world.depth) * 2.4
    );
    render();
  }
  function homeView(x, z, zoom = null) {
    camera.yaw = 0.71;
    camera.pitch = 0.86;
    focusOn(x, z, zoom);
  }
  function setSettlement(state, {
    draft = null,
    zoneStrokes = [],
    zoneType = "residential",
    zoneRadius = 54,
    zoneEdits = null,
    mode = "explore",
    liveCurve = null,
    liveGesture = null,
    pendingControl = null,
    touchFocus = null
  } = {}) {
    settlement = presentation ? structuredClone(state) : state;
    settlementDraft = draft;
    settlementZoneStrokes = zoneStrokes;
    settlementZoneType = zoneType;
    settlementRadius = zoneRadius;
    settlementEdits = zoneEdits;
    settlementMode = mode;
    settlementLiveCurve = liveCurve;
    settlementLiveGesture = liveGesture;
    settlementPendingControl = pendingControl;
    settlementTouchFocus = touchFocus;
    updateSettlement();
  }
  function onDown(e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) gesture = beginCameraGesture([...pointers.values()], canvas.getBoundingClientRect());
    else if (pointers.size > 2) gesture = null;
  }
  function onMove(e) {
    const last = pointers.get(e.pointerId);
    if (!last) return;
    e.preventDefault();
    const dx = e.clientX - last.x, dy = e.clientY - last.y;
    last.x = e.clientX;
    last.y = e.clientY;
    if (pointers.size === 2 && gesture) {
      navigateTouches(advanceCameraGesture(gesture, [...pointers.values()]));
    } else if (pointers.size === 1) {
      const rect = canvas.getBoundingClientRect();
      camera.yaw -= dx / Math.max(120, rect.width) * Math.PI * 1.5;
      camera.pitch = clamp(camera.pitch + dy / Math.max(180, rect.height) * 1.8, 0.32, 1.47);
      render();
    }
  }
  function onUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size !== 2) gesture = null;
  }
  const lost = (e) => {
    e.preventDefault();
    onError(new Error("3D graphics context was lost. Retry the scene in lighter mode."));
  };
  canvas.addEventListener("webglcontextlost", lost);
  if (interactive) canvas.addEventListener("pointerdown", onDown);
  if (interactive) canvas.addEventListener("pointermove", onMove);
  if (interactive) canvas.addEventListener("pointerup", onUp);
  if (interactive) canvas.addEventListener("pointercancel", onUp);
  const onWheel = (e) => {
    e.preventDefault();
    zoomBy(e.deltaY > 0 ? 1.12 : 1 / 1.12);
  };
  canvas.addEventListener("wheel", onWheel, { passive: false });
  document.addEventListener("visibilitychange", render);
  window.addEventListener("resize", render);
  upload(world);
  void loadModels();
  return {
    setWorld: upload,
    resetCamera,
    zoomBy,
    panBy,
    focusOn,
    homeView,
    navigateTouches,
    screenToWorld,
    setSettlement,
    render,
    setReference(value) {
      showcase = Boolean(value);
      updateKenney();
    },
    assetStatus: () => presentation?.assetStatus() || { loaded: loadedAssets, total: kitNames.length },
    getCamera: () => ({ ...camera }),
    setCamera(view) {
      Object.assign(camera, view);
      render();
    },
    dispose() {
      disposed = true;
      editorOverlay.dispose();
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      document.removeEventListener("visibilitychange", render);
      window.removeEventListener("resize", render);
      if (frame) cancelAnimationFrame(frame);
      if (presentation) presentation.dispose();
      else {
        for (const b of buffers) gl.deleteBuffer(b);
        gl.deleteProgram(program);
      }
    }
  };
}

// building-visuals.mjs
function homePlacement(world, house, entries, preferredID = null) {
  const style = cottageBlueprint(house), id = preferredID ?? HOME_IDS[visualIdentity(world.options?.seed ?? world.seed ?? 0, house) % HOME_IDS.length];
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;
  const extent = [0, 1, 2].map((i) => Math.max(Math.abs(entry.boundsMin[i]), Math.abs(entry.boundsMax[i])) * 2);
  const scale = Math.min((style.width - 1) / extent[0], (style.depth - 1) / extent[2], style.height);
  if (!Number.isFinite(scale) || scale <= 0) return null;
  const cs = Math.cos(style.orientation), sn = Math.sin(style.orientation);
  const transform = (x, z) => ({ x: house.x + (x * cs - z * sn) * scale, y: house.y + (x * sn + z * cs) * scale });
  const polygon = house.parcel?.vertices;
  const inside3 = (p) => {
    let yes = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if (a.y > p.y !== b.y > p.y && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) yes = !yes;
    }
    return yes;
  };
  const footprint2 = [[-extent[0] / 2, -extent[2] / 2], [extent[0] / 2, -extent[2] / 2], [extent[0] / 2, extent[2] / 2], [-extent[0] / 2, extent[2] / 2]].map(([x, z]) => transform(x, z));
  if (polygon?.length > 2 && !footprint2.every(inside3)) return null;
  const foundation = resolveFoundation(world, house, extent[0] * scale, extent[2] * scale, style.orientation);
  if (foundation.flooded) return null;
  const entrance = transform(entry.entrance.position[0], entry.entrance.position[2]);
  return { id, scale, width: extent[0] * scale, depth: extent[2] * scale, yaw: -style.orientation, origin: [house.x - world.width / 2, foundation.floor, house.y - world.depth / 2], entrance, footprint: footprint2 };
}
function homeApproach(world, house, placement) {
  const from = placement?.entrance, to = house.entrance;
  if (!from || !to) return null;
  const distance5 = Math.hypot(to.x - from.x, to.y - from.y);
  if (distance5 < 0.5 || distance5 > 60) return null;
  const dx = (to.x - from.x) / distance5, dy = (to.y - from.y) / distance5;
  const count2 = Math.ceil(distance5 / 2) + 1;
  const samples = Array.from({ length: count2 }, (_, i) => {
    const t = i / (count2 - 1);
    return { x: from.x + dx * distance5 * t, y: from.y + dy * distance5 * t };
  });
  for (const p of samples) for (const side of [-1, 0, 1]) {
    const x = p.x - dy * side, y = p.y + dx * side;
    if (x < 0 || y < 0 || x > world.width || y > world.depth || world.sample(x, y).water !== null) return null;
  }
  return { from, to, distance: distance5, dx, dy, floor: placement.origin[1] + (placement.entranceHeight || 0), samples };
}
var WORKING_FACILITIES = ["farm", "lumber", "smith", "granary"];
var PUBLIC_FACILITIES = ["market", "plaza", "park"];
var FACILITY_TYPES = [...WORKING_FACILITIES, ...PUBLIC_FACILITIES];
function facilityPlacement(world, building, state, entries) {
  const entry = entries.find((e) => e.id === "facility-" + building.type);
  if (!entry) return null;
  const envelope = buildingFootprint(building.type), extent = [0, 1, 2].map((i) => Math.max(Math.abs(entry.boundsMin[i]), Math.abs(entry.boundsMax[i])) * 2);
  let approach = null, nearest = Infinity;
  for (const line of [...state.roads || [], ...(state.localLanes || []).map((l) => l.points || [])]) for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((building.x - a.x) * dx + (building.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const p = { x: a.x + dx * t, y: a.y + dy * t }, distance5 = Math.hypot(p.x - building.x, p.y - building.y);
    if (distance5 < nearest) {
      nearest = distance5;
      approach = p;
    }
  }
  const orientation = approach ? Math.atan2(approach.y - building.y, approach.x - building.x) - Math.PI / 2 : buildingBlueprint(building).orientation;
  const scale = Math.min((envelope.width - 2) / extent[0], (envelope.depth - 2) / extent[2], 48 / (entry.boundsMax[1] - entry.boundsMin[1]));
  const width = extent[0] * scale, depth = extent[2] * scale, foundation = resolveFoundation(world, building, width, depth, orientation);
  if (foundation.flooded || !Number.isFinite(scale) || scale <= 0) return null;
  const [ex, , ez] = entry.entrance.position, cs = Math.cos(orientation), sn = Math.sin(orientation);
  const foundationRects = entry.foundationRects?.map(([x, z, w, d]) => ({ x: building.x + (x * cs - z * sn) * scale, y: building.y + (x * sn + z * cs) * scale, width: w * scale, depth: d * scale }));
  return {
    id: entry.id,
    type: building.type,
    groundSpace: entry.groundSpace,
    scale,
    width,
    depth,
    foundationRects,
    entranceHeight: entry.entrance.position[1] * scale,
    yaw: -orientation,
    origin: [building.x - world.width / 2, foundation.floor, building.y - world.depth / 2],
    entrance: { x: building.x + (ex * cs - ez * sn) * scale, y: building.y + (ex * sn + ez * cs) * scale },
    approachTarget: approach
  };
}
function farmlandRows(world, state) {
  const farms = (state.buildings || []).filter((b) => b.type === "farm"), seen = /* @__PURE__ */ new Set(), rows = [];
  for (const farm of farms) for (let x = Math.ceil((farm.x - 92) / 12) * 12; x <= farm.x + 92; x += 12) for (let y = Math.ceil((farm.y - 92) / 12) * 12; y <= farm.y + 92; y += 12) {
    const key2 = x + "," + y;
    if (seen.has(key2)) continue;
    seen.add(key2);
    if (Math.hypot(x - farm.x, y - farm.y) > 92) continue;
    if ((state.houses || []).some((h) => Math.hypot(h.x - x, h.y - y) < 20)) continue;
    if ((state.buildings || []).some((b) => Math.hypot(b.x - x, b.y - y) < Math.max(buildingFootprint(b.type).width, buildingFootprint(b.type).depth) * 0.72)) continue;
    const contacts = [{ x: x - 4, y: y - 4 }, { x: x + 4, y: y - 4 }, { x: x + 4, y: y + 4 }, { x: x - 4, y: y + 4 }, { x, y }];
    if (contacts.some((p) => p.x < 0 || p.y < 0 || p.x > world.width || p.y > world.depth || zoneAt(state, p) !== "farmland" || world.sample(p.x, p.y).water !== null)) continue;
    const blocked = [...(state.roads || []).map((points) => ({ points, radius: 18 })), ...(state.localLanes || []).map((l) => ({ points: l.points || [], radius: 7 }))].some((line) => line.points.slice(1).some((b, i) => {
      const a = line.points[i], dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(x - a.x - dx * t, y - a.y - dy * t) < line.radius;
    }));
    if (!blocked) rows.push({ x, y });
  }
  return rows;
}

// environment-next/review-renderer.mjs
function mountWorld3D2(canvas, world, options = {}) {
  const renderer = new THREE3.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.outputColorSpace = THREE3.SRGBColorSpace;
  const scene = new THREE3.Scene();
  scene.background = new THREE3.Color("#b5ccbd");
  const camera = new THREE3.OrthographicCamera(-1, 1, 1, -1, 0.1, 5400);
  const light = new THREE3.DirectionalLight("#fff1db", 2);
  light.position.set(-400, 860, 250);
  if (options.baseline) scene.add(light, new THREE3.HemisphereLight("#eff5ff", "#61734e", 2));
  const houses = new THREE3.Group();
  scene.add(houses);
  const requiredIDs = [...HOME_IDS, ...FACILITY_TYPES.map((type) => "facility-" + type), "tree-oak"];
  const low = options.quality === "lite";
  const environment = (options.baseline ? createEnvironmentMaterials3 : options.previous ? createEnvironmentMaterials : createEnvironmentMaterials2)({ low, onReady: () => controller?.render() });
  if (!options.baseline) environment.attachAtmosphere(scene);
  let contextRelease = () => {
  }, contextLoaded = false, contextEnvelopes = [];
  if (options.contextCenter) void loadScaleContext(scene, () => contact, options.contextCenter).then((result) => {
    if (disposed) {
      result.dispose();
      return;
    }
    contextRelease = result.dispose;
    contextEnvelopes = result.envelopes;
    environment.setVisualInputs?.(result.visualInputs);
    contextLoaded = true;
    lastPlacementKey = "";
    refresh();
    controller?.render();
  }).catch(() => {
    canvas.dataset.contextFallback = "unavailable";
  });
  let waterTimer = 0, waterFrames = 0;
  const waterFrustum = new THREE3.Frustum(), waterMatrix = new THREE3.Matrix4();
  const pauseWater = () => {
    clearTimeout(waterTimer);
    waterTimer = 0;
    environment.pause();
  };
  document.addEventListener("visibilitychange", pauseWater);
  let surfaceVersion = 0, lastPlacementKey = "", cached = null;
  const clearBatches = () => {
    for (const mesh of houses.children) mesh.dispose();
    houses.clear();
  };
  const bind = (state, c) => ({ houses: new Map((state.houses || []).flatMap((h, i) => c.homes[i] ? [[h, c.homes[i]]] : [])), buildings: new Map((state.buildings || []).flatMap((b, i) => c.facilities[i] ? [[b, c.facilities[i]]] : [])), cropRows: c.cropRows });
  const buffers = /* @__PURE__ */ new Map(), registry = createModelRegistry(new THREE3.GLTFLoader()), models = /* @__PURE__ */ new Map();
  let entries = [], disposed = false, contact = world, terrain3 = null, refresh = () => {
  }, loaded2 = 0;
  const raycaster = new THREE3.Raycaster();
  function updateCamera(view, rect) {
    const aspect = rect.width / Math.max(1, rect.height), { yaw, pitch, zoom, focusX, focusZ } = view;
    camera.left = -zoom * aspect;
    camera.right = zoom * aspect;
    camera.top = zoom;
    camera.bottom = -zoom;
    const focus = new THREE3.Vector3(focusX, view.focusY ?? 17, focusZ);
    camera.position.copy(focus).add(new THREE3.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(2700));
    camera.up.set(0, 1, 0);
    camera.lookAt(focus);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  function material(index) {
    const surface = environment.material(index);
    if (surface) return surface;
    return new THREE3.ShaderMaterial({
      uniforms: { opacity: { value: index === 6 ? 0.52 : 1 } },
      transparent: index === 6,
      depthTest: index !== 8,
      depthWrite: index !== 6,
      side: THREE3.DoubleSide,
      vertexShader: "attribute vec3 color; varying vec3 vColor; varying float vLight; void main(){vColor=color;vLight=.70+.30*max(0.,dot(normalize(normal),normalize(vec3(-.40,.86,.25))));gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader: "uniform float opacity; varying vec3 vColor; varying float vLight; void main(){gl_FragColor=vec4(vColor*vLight,opacity);}"
    });
  }
  const backend = {
    upload(index, data, surfaceKinds = null, surfaceOffsets = null) {
      const previous2 = buffers.get(index);
      if (previous2) {
        scene.remove(previous2);
        previous2.geometry.dispose();
        previous2.material.dispose();
      }
      const geometry = new THREE3.BufferGeometry(), array = new THREE3.InterleavedBuffer(data, 9);
      for (const [name, offset] of [["position", 0], ["color", 3], ["normal", 6]]) geometry.setAttribute(name, new THREE3.InterleavedBufferAttribute(array, 3, offset));
      if (index === 5) {
        geometry.setAttribute("surfaceKind", new THREE3.BufferAttribute(surfaceKinds || new Float32Array(data.length / 9), 1));
        geometry.setAttribute("surfaceOffset", new THREE3.BufferAttribute(surfaceOffsets || new Float32Array(data.length / 9), 1));
      }
      const mesh = new THREE3.Mesh(geometry, material(index));
      mesh.renderOrder = index;
      buffers.set(index, mesh);
      scene.add(mesh);
      if (index === 0) terrain3 = mesh;
    },
    setTerrain(surface) {
      environment.setWorld(surface);
      contact = surface;
      surfaceVersion++;
      lastPlacementKey = "";
    },
    setSettlement(surface, state, onRefresh) {
      refresh = onRefresh;
      contact = surface;
      const key2 = JSON.stringify([surfaceVersion, models.size, state.houses, state.buildings, state.roads, state.localLanes, state.zones]);
      if (key2 === lastPlacementKey && cached) return bind(state, cached);
      clearBatches();
      let groundContactError = 0;
      const objects = [], represented = /* @__PURE__ */ new Map();
      for (const house of state.houses || []) {
        let p = homePlacement(surface, house, entries);
        if (!p) for (const id of HOME_IDS) {
          p = homePlacement(surface, house, entries, id);
          if (p) break;
        }
        const source = p && models.get(p.id);
        if (!source) continue;
        p.approach = homeApproach(surface, house, p);
        const model = source.clone(true);
        model.position.set(...p.origin);
        model.scale.setScalar(p.scale);
        model.rotation.y = p.yaw;
        objects.push({ scene: model, entityKey: "house:" + (house.id ?? JSON.stringify([house.x, house.y])) });
        represented.set(house, p);
      }
      const representedFacilities = /* @__PURE__ */ new Map();
      for (const building of state.buildings || []) {
        const p = facilityPlacement(surface, building, state, entries), source = p && models.get(p.id);
        if (!source) continue;
        p.approach = homeApproach(surface, { ...building, entrance: p.approachTarget }, p);
        const model = source.clone(true);
        model.position.set(...p.origin);
        model.scale.setScalar(p.scale);
        model.rotation.y = p.yaw;
        if (building.type === "lumber" || p.groundSpace) {
          p.propFoundations = [];
          model.updateMatrixWorld(true);
          model.traverse((node) => {
            if (node.userData.terrainGrounded) {
              const point = new THREE3.Vector3();
              node.getWorldPosition(point);
              if (node.userData.footing) {
                const box = new THREE3.Box3().setFromObject(node), center = box.getCenter(new THREE3.Vector3()), size = box.getSize(new THREE3.Vector3());
                const rect = { x: center.x + surface.width / 2, y: center.z + surface.depth / 2, width: size.x, depth: size.z };
                const seat = resolveFoundation(surface, rect, rect.width, rect.depth, 0);
                if (seat.flooded) {
                  node.visible = false;
                  return;
                }
                node.position.y += (seat.floor - box.min.y) / p.scale;
                p.propFoundations.push({ ...rect, floor: seat.floor });
              } else {
                const box = new THREE3.Box3().setFromObject(node), ground = surface.sample(point.x + surface.width / 2, point.z + surface.depth / 2).height;
                const stack = (node.userData.groundOffset || 0) * p.scale;
                node.position.y += (ground + stack - 0.02 - box.min.y) / p.scale;
                const seated = new THREE3.Box3().setFromObject(node);
                groundContactError = Math.max(groundContactError, Math.abs(seated.min.y - ground - stack));
              }
            }
          });
        }
        model.traverse((node) => {
          if (node.userData.galleryOnly) node.visible = false;
        });
        objects.push({ scene: model, entityKey: "facility:" + (building.id ?? JSON.stringify([building.type, building.x, building.y])) });
        representedFacilities.set(building, p);
      }
      const nature = models.get("tree-oak");
      let natureCount = 0;
      if (nature) for (const p of naturePlacements(surface, state, { low })) {
        if (contextEnvelopes.some((e) => p.origin[0] > e.min.x - 4 && p.origin[0] < e.max.x + 4 && p.origin[2] > e.min.z - 4 && p.origin[2] < e.max.z + 4)) continue;
        const model = nature.clone(true);
        model.position.set(...p.origin);
        model.scale.setScalar(p.scale);
        model.rotation.y = p.yaw;
        objects.push({ scene: model, entityKey: p.key });
        natureCount++;
      }
      for (const batch of buildSceneBatches(objects)) houses.add(batch);
      canvas.dataset.groundContactError = String(groundContactError);
      canvas.dataset.natureInstances = String(natureCount);
      canvas.dataset.quality = low ? "low" : "normal";
      canvas.dataset.modelFacilities = String(representedFacilities.size);
      canvas.dataset.modelHouses = String(represented.size);
      canvas.dataset.loadedModels = String(models.size - (models.has("tree-oak") ? 1 : 0));
      canvas.dataset.homeModels = [...new Set([...represented.values()].map((p) => p.id))].sort().join(",");
      const cropRows = farmlandRows(surface, state);
      canvas.dataset.cropRows = String(cropRows.length);
      cached = { homes: (state.houses || []).map((h) => represented.get(h) || null), facilities: (state.buildings || []).map((b) => representedFacilities.get(b) || null), cropRows };
      lastPlacementKey = key2;
      return bind(state, cached);
    },
    draw(view, rect) {
      clearTimeout(waterTimer);
      waterTimer = 0;
      if (options.animateWater !== false) environment.advance(performance.now());
      updateCamera(view, rect);
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1 : 1.5));
      renderer.setSize(rect.width, rect.height, false);
      renderer.render(scene, camera);
      waterFrames++;
      const water3 = buffers.get(1);
      waterFrustum.setFromProjectionMatrix(waterMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
      if (options.animateWater !== false && !low && !document.hidden && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth && water3?.geometry.getAttribute("position").count && waterFrustum.intersectsObject(water3)) waterTimer = setTimeout(() => {
        waterTimer = 0;
        if (!disposed && !document.hidden) controller?.render();
      }, 100);
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.triangles = String(renderer.info.render.triangles);
    },
    screenToWorld(x, y, view) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height || !terrain3) return null;
      updateCamera(view, rect);
      raycaster.setFromCamera(new THREE3.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), camera);
      const hit = raycaster.intersectObject(terrain3, false)[0];
      return hit ? { x: hit.point.x + contact.width / 2, y: hit.point.z + contact.depth / 2 } : null;
    },
    assetStatus: () => ({ contextLoaded, waterFrames, loaded: loaded2, total: requiredIDs.length, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, ...estimateSceneBytes(scene), ...environment.status() }),
    dispose() {
      disposed = true;
      contextRelease();
      pauseWater();
      document.removeEventListener("visibilitychange", pauseWater);
      clearBatches();
      for (const mesh of buffers.values()) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      buffers.clear();
      registry.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };
  let controller;
  try {
    controller = mountWorld3D(canvas, world, { ...options, presentation: backend });
  } catch (error) {
    backend.dispose();
    throw error;
  }
  canvas.dataset.renderer = "three";
  void fetch(manifestURL).then((r) => {
    if (!r.ok) throw Error("Architecture manifest unavailable");
    return r.json();
  }).then(async (manifest) => {
    if (disposed) return;
    entries = manifest.entries;
    await Promise.allSettled(requiredIDs.map(async (id) => {
      const model = await registry.load(id);
      if (disposed) return;
      models.set(id, model.scene);
      loaded2++;
    }));
    if (!disposed) {
      refresh();
      options.onAssets?.(backend.assetStatus());
    }
  }).catch(() => {
    if (!disposed) canvas.dataset.modelFallback = "unavailable";
  });
  return { ...controller, environmentSample: (x, z) => environment.sample?.(x, z), setVisualInputs: (inputs) => {
    environment.setVisualInputs?.(inputs);
    controller.render();
  } };
}

// environment-next/inspection-controls.mjs
function attachInspectionControls(canvas, viewer, world) {
  const points = /* @__PURE__ */ new Map(), limit = Math.max(world.width, world.depth), clamp7 = (v, a, b) => Math.max(a, Math.min(b, v));
  let gesture = null;
  const close = () => viewer.getCamera().zoom < limit * 0.08, stop = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  const down = (e) => {
    if (!close() && !points.size) return;
    stop(e);
    points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
    }
    if (points.size === 2) gesture = beginCameraGesture([...points.values()], canvas.getBoundingClientRect());
  };
  const move = (e) => {
    const last = points.get(e.pointerId);
    if (!last) return;
    stop(e);
    points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const v = viewer.getCamera(), rect = canvas.getBoundingClientRect();
    if (points.size === 2 && gesture) {
      const change = advanceCameraGesture(gesture, [...points.values()]);
      viewer.setCamera({ ...v, yaw: v.yaw + change.yawDelta, pitch: clamp7(v.pitch + change.pitchDelta, 0.32, 1.47), zoom: clamp7(v.zoom * change.zoomRatio, 6, limit * 2.4) });
    } else if (points.size === 1) viewer.setCamera({ ...v, yaw: v.yaw - (e.clientX - last.x) / Math.max(120, rect.width) * Math.PI * 1.5, pitch: clamp7(v.pitch + (e.clientY - last.y) / Math.max(180, rect.height) * 1.8, 0.32, 1.47) });
  };
  const up = (e) => {
    if (!points.has(e.pointerId)) return;
    stop(e);
    points.delete(e.pointerId);
    if (points.size !== 2) gesture = null;
  };
  const wheel = (e) => {
    stop(e);
    const v = viewer.getCamera();
    viewer.setCamera({ ...v, zoom: clamp7(v.zoom * (e.deltaY > 0 ? 1.12 : 1 / 1.12), 6, limit * 2.4) });
  };
  const handlers = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: up, lostpointercapture: up, wheel };
  for (const [type, fn] of Object.entries(handlers)) canvas.addEventListener(type, fn, { capture: true, passive: false });
  return () => {
    for (const [type, fn] of Object.entries(handlers)) canvas.removeEventListener(type, fn, true);
    points.clear();
    gesture = null;
  };
}

// environment-next/review-fixture.mjs
function createReviewSurfaces(world) {
  return [createTerrainSurface(world, ...terrainResolution(world, { gameplay: true })), createTerrainSurface(world, ...terrainResolution(world, { lite: true }))];
}
function auditCorridor(surfaces, points, width = 5) {
  let maxGrade = 0, samples = 0;
  for (let k = 1; k < points.length; k++) {
    const a = points[k - 1], b = points[k], dx = b.x - a.x, dz = b.y - a.y, length2 = Math.hypot(dx, dz), steps2 = Math.max(1, Math.ceil(length2 / 3)), nx = -dz / (length2 || 1), nz = dx / (length2 || 1);
    for (let i = 0; i <= steps2; i++) for (const offset of [-width / 2, 0, width / 2]) {
      const x = a.x + dx * i / steps2 + nx * offset, z = a.y + dz * i / steps2 + nz * offset;
      for (const surface of surfaces) {
        samples++;
        const p = surface.sample(x, z);
        if (p.water !== null) return { ok: false, reason: "wet corridor", maxGrade, samples };
        const gx = (surface.sample(x + 2, z).height - surface.sample(x - 2, z).height) / 4, gz = (surface.sample(x, z + 2).height - surface.sample(x, z - 2).height) / 4, grade = Math.hypot(gx, gz);
        maxGrade = Math.max(maxGrade, grade);
        if (grade > 0.28) return { ok: false, reason: "steep displayed surface", maxGrade, samples };
      }
    }
  }
  return { ok: true, maxGrade, samples };
}
function createReviewFixture(world) {
  const surfaces = createReviewSurfaces(world);
  let best = null;
  for (const half2 of [90, 65, 45, 32]) {
    for (let z = 130; z < world.depth - 130; z += 65) for (let x2 = 130; x2 < world.width - 130; x2 += 65) {
      let lo = Infinity, hi = -Infinity, maxGrade = 0, ok = true;
      outer: for (let dz = -half2; dz <= half2; dz += Math.max(6, half2 / 5)) for (let dx = -half2; dx <= half2; dx += Math.max(6, half2 / 5)) for (const s of surfaces) {
        const q = s.sample(x2 + dx, z + dz);
        if (q.water !== null) {
          ok = false;
          break outer;
        }
        lo = Math.min(lo, q.height);
        hi = Math.max(hi, q.height);
        if (hi - lo > half2 * 0.3) {
          ok = false;
          break outer;
        }
        const grade = Math.hypot((s.sample(x2 + dx + 3, z + dz).height - s.sample(x2 + dx - 3, z + dz).height) / 6, (s.sample(x2 + dx, z + dz + 3).height - s.sample(x2 + dx, z + dz - 3).height) / 6);
        maxGrade = Math.max(maxGrade, grade);
        if (grade > 0.28) {
          ok = false;
          break outer;
        }
      }
      if (ok) {
        const score = hi - lo + maxGrade * 12 + Math.hypot(x2 - world.width / 2, z - world.depth / 2) * 5e-4;
        if (!best || score < best.score) best = { x: x2, y: z, half: half2, score, heightSpread: hi - lo, maxGrade };
      }
    }
    if (best) break;
  }
  if (!best) throw Error("No safe dry review corridor in this seed; do not render a road across a cliff.");
  const { x, y, half } = best, r = half * 0.7, paths = [[{ x: x - r, y: y - r * 0.35 }, { x: x - r * 0.25, y: y - r * 0.31 }, { x: x + r * 0.42, y: y - r * 0.28 }, { x: x + r, y: y - r * 0.18 }], [{ x: x - r * 0.25, y: y - r * 0.31 }, { x: x - r * 0.18, y: y + r * 0.08 }, { x: x - r * 0.09, y: y + r * 0.7 }]];
  const audits = paths.map((p) => auditCorridor(surfaces, p, 5));
  if (audits.some((a) => !a.ok)) throw Error("Review footpath failed full-width contact validation.");
  const reach = Math.max(8, half - 22), nodes = [{ id: 1, x, y }, { id: 2, x: x - reach, y }, { id: 3, x: x + reach, y }, { id: 4, x, y: y - reach }, { id: 5, x: x + reach * 0.6, y: y + reach }], graph = { hubId: 1, nodes, segments: [{ id: 1, a: 1, b: 2 }, { id: 2, a: 1, b: 3 }, { id: 3, a: 1, b: 4 }, { id: 4, a: 1, b: 5 }] };
  const polygons = roadJunctionPolygons(graph).shoulders;
  const junctionOK = polygons.every((poly) => auditCorridor(surfaces, [...poly, poly[0]], 0).ok);
  const empty = { turn: 2, houses: [], buildings: [], roads: [], zones: [], desirePaths: [] };
  return { center: best, paths, audits, state: { ...empty, localLanes: paths.map((points) => ({ points })) }, junctionState: junctionOK ? { ...empty, localLanes: [], roadGraph: graph } : null };
}

// environment-next/meadow-study.mjs
import * as T10 from "../assets/vendor/three.module.mjs";

// assets/wv/landscape-next/hamlet-scene.mjs?v=plot-aware-1
import * as T8 from "../assets/vendor/three.module.mjs";

// assets/wv/landscape-next/batches.mjs
import * as T5 from "../assets/vendor/three.module.mjs";
function createLandscapeLibrary(scene) {
  const sources = /* @__PURE__ */ new Map(), geometries = /* @__PURE__ */ new Set(), materials = /* @__PURE__ */ new Set();
  let disposed = false;
  scene.traverse((n) => {
    if (n.isMesh) {
      sources.set(n.name, n);
      geometries.add(n.geometry);
      for (const m of Array.isArray(n.material) ? n.material : [n.material]) materials.add(m);
    }
  });
  return { build(records) {
    if (disposed) throw Error("Landscape library disposed");
    const group = new T5.Group(), byNode = /* @__PURE__ */ new Map(), matrix = new T5.Matrix4(), q = new T5.Quaternion(), up = new T5.Vector3(0, 1, 0);
    for (const r of records) {
      const key2 = r.assetId + "__" + r.lod;
      if (!sources.has(key2)) throw Error("Missing landscape node " + key2);
      if (!byNode.has(key2)) byNode.set(key2, []);
      byNode.get(key2).push(r);
    }
    for (const [key2, rows] of byNode) {
      const source = sources.get(key2), batch = new T5.InstancedMesh(source.geometry, source.material, rows.length);
      rows.forEach((r, i) => {
        matrix.compose(new T5.Vector3(...r.origin), q.setFromAxisAngle(up, r.yaw), new T5.Vector3().setScalar(r.scale));
        batch.setMatrixAt(i, matrix);
      });
      batch.instanceMatrix.needsUpdate = true;
      batch.computeBoundingBox();
      batch.computeBoundingSphere();
      batch.userData.keys = rows.map((r) => r.key);
      group.add(batch);
    }
    let released = false;
    return { group, dispose() {
      if (released) return;
      released = true;
      group.removeFromParent();
      for (const b of group.children) b.dispose();
      group.clear();
    } };
  }, dispose() {
    if (disposed) return;
    disposed = true;
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    sources.clear();
  }, get disposed() {
    return disposed;
  } };
}

// assets/wv/landscape-next/catalog.mjs
var UNITS_PER_METRE = 2.8;
var FORMS = Object.freeze([
  ["oak-spreading", "woodland", "Spreading oak"],
  ["beech-upright", "woodland", "Upright beech"],
  ["birch-open", "woodland", "Open birch"],
  ["pine-tiered", "woodland", "Tiered pine"],
  ["oak-young", "young-tree", "Young oak"],
  ["pine-young", "young-tree", "Young pine"],
  ["hazel-shrub", "shrub", "Hazel stool"],
  ["thorn-shrub", "shrub", "Low thorn"],
  ["hedge-fragment", "hedgerow", "Broken hedgerow"],
  ["fern-cluster", "ground-cover", "Fern rosette"],
  ["grass-tuft", "ground-cover", "Fine grass tussocks"],
  ["flower-cream", "wildflower", "Sparse cream flowers"],
  ["flower-mauve", "wildflower", "Sparse mauve flowers"],
  ["reed-cluster", "bank-cover", "Reeds"],
  ["rush-cluster", "bank-cover", "Rushes"],
  ["bank-stones", "stone", "Small bank stones"],
  ["boulder-rounded", "outcrop", "Rounded boulder"],
  ["outcrop-layered", "outcrop", "Layered outcrop"],
  ["stump", "deadwood", "Cut stump"],
  ["fallen-log", "deadwood", "Fallen log"]
].map(([id, category, name]) => Object.freeze({ id, category, name, status: "gallery-review", runtimeReady: false })));
var TREE_IDS = Object.freeze(["oak-spreading", "beech-upright", "birch-open", "pine-tiered"]);

// assets/wv/landscape-next/placement.mjs
function stableUnit(...parts) {
  let h = 2166136261;
  for (const c of JSON.stringify(parts)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}
var distance4 = (p, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
};
function inside2(p, polygon) {
  let yes = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (a.z > p.z !== b.z > p.z && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) yes = !yes;
  }
  return yes;
}
function createExclusionIndex(exclusions = [], cellSize = 32) {
  const cells = /* @__PURE__ */ new Map();
  let queries = 0, tests = 0;
  for (const e of exclusions) {
    const points = e.polygon || e.points || [], pad = e.radius || 0;
    if (!points.length) continue;
    const loX = Math.floor((Math.min(...points.map((p) => p.x)) - pad) / cellSize), hiX = Math.floor((Math.max(...points.map((p) => p.x)) + pad) / cellSize), loZ = Math.floor((Math.min(...points.map((p) => p.z)) - pad) / cellSize), hiZ = Math.floor((Math.max(...points.map((p) => p.z)) + pad) / cellSize);
    for (let x = loX; x <= hiX; x++) for (let z = loZ; z <= hiZ; z++) {
      const key2 = x + ":" + z;
      if (!cells.has(key2)) cells.set(key2, []);
      cells.get(key2).push(e);
    }
  }
  return { blocked(p, r, { tree = false } = {}) {
    queries++;
    const nearby = /* @__PURE__ */ new Set();
    for (let x = Math.floor((p.x - r) / cellSize); x <= Math.floor((p.x + r) / cellSize); x++) for (let z = Math.floor((p.z - r) / cellSize); z <= Math.floor((p.z + r) / cellSize); z++) for (const e of cells.get(x + ":" + z) || []) nearby.add(e);
    for (const e of nearby) {
      tests++;
      if (tree && e.kind === "preserve") continue;
      const poly = e.polygon;
      if (poly?.length) {
        if (inside2(p, poly) || poly.some((a, i) => distance4(p, a, poly[(i + 1) % poly.length]) <= r + (e.radius || 0))) return e.kind || "polygon";
      } else {
        const pts = e.points || [];
        if (pts.length === 1 && Math.hypot(p.x - pts[0].x, p.z - pts[0].z) <= r + (e.radius || 0)) return e.kind || "point";
        for (let i = 1; i < pts.length; i++) if (distance4(p, pts[i - 1], pts[i]) <= r + (e.radius || 0)) return e.kind || "corridor";
      }
    }
    return null;
  }, stats: () => ({ queries, tests, cells: cells.size }) };
}
function footprint(entry, scale, yaw, p) {
  const c = Math.cos(yaw), s = Math.sin(yaw), points = [];
  for (const x of [entry.boundsMin[0], (entry.boundsMin[0] + entry.boundsMax[0]) / 2, entry.boundsMax[0]]) for (const z of [entry.boundsMin[2], (entry.boundsMin[2] + entry.boundsMax[2]) / 2, entry.boundsMax[2]]) points.push({ x: p.x + (x * c + z * s) * scale, z: p.z + (-x * s + z * c) * scale });
  return points;
}
function placeLandscape({ seed: seed2, treeCandidates = [], coverRegions = [], decorativeCandidates = [], exclusions = [], sample, width, depth, entries, quality: quality2 = "normal", distance: distance5 = "near" }) {
  if (typeof sample !== "function" || !Number.isFinite(width) || !Number.isFinite(depth)) throw Error("Displayed terrain sampler and dimensions required");
  const index = createExclusionIndex(exclusions), catalog = new Map(entries.map((e) => [e.id, e])), instances = [], retainedTrees = [];
  function place(id, key2, p, scale, yaw, tree = false) {
    const e = catalog.get(id);
    if (!e) throw Error("Unknown landscape asset: " + id);
    if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(p.x) || !Number.isFinite(p.z) || !Number.isFinite(yaw)) return false;
    const radius = Math.max(...[e.boundsMin[0], e.boundsMax[0], e.boundsMin[2], e.boundsMax[2]].map(Math.abs)) * scale * Math.SQRT2;
    if (index.blocked(p, radius, { tree })) return false;
    const points = tree ? [p] : footprint(e, scale, yaw, p), contacts = [];
    for (const pt of points) {
      if (pt.x < 0 || pt.z < 0 || pt.x > width || pt.z > depth) return false;
      const v = sample(pt.x, pt.z);
      if (!Number.isFinite(v.height) || v.water !== null || !Number.isFinite(v.slope) || v.slope > (tree ? 0.8 : e.category === "outcrop" ? 0.18 : 0.3)) return false;
      if (e.category === "bank-cover" && !(v.moisture >= 0.65)) return false;
      contacts.push({ ...pt, height: v.height, moisture: v.moisture });
    }
    const heights = contacts.map((p2) => p2.height), spread = Math.max(...heights) - Math.min(...heights);
    if (!tree && spread > (e.id === "fallen-log" ? 0.18 : e.category === "outcrop" ? 0.45 : 0.16)) return false;
    const ground = tree ? heights[0] : Math.max(...heights), origin = [p.x - width / 2, ground - e.boundsMin[1] * scale, p.z - depth / 2], lod = distance5 === "far" ? "far" : quality2 === "low" ? "low" : "normal";
    const corners = footprint(e, scale, yaw, p), xs = corners.map((p2) => p2.x - width / 2), zs = corners.map((p2) => p2.z - depth / 2);
    instances.push({ assetId: id, key: key2, origin, scale, yaw, bounds: { min: [Math.min(...xs), origin[1] + e.boundsMin[1] * scale, Math.min(...zs)], max: [Math.max(...xs), origin[1] + e.boundsMax[1] * scale, Math.max(...zs)] }, quality: quality2, lod, groundContact: { mode: e.groundContacts.type, points: contacts, maxGap: spread, baseY: ground }, routing: "decoration-only" });
    return true;
  }
  const seen = /* @__PURE__ */ new Set();
  for (const t of [...treeCandidates].sort((a, b) => String(a.key ?? `${a.x}:${a.z}`).localeCompare(String(b.key ?? `${b.x}:${b.z}`)))) {
    const key2 = "tree:" + String(t.key ?? `${t.x}:${t.z}`);
    if (seen.has(key2)) throw Error("Duplicate authoritative tree key: " + key2);
    seen.add(key2);
    const id = TREE_IDS[Math.floor(stableUnit(seed2, key2, "species") * TREE_IDS.length)], e = catalog.get(id), scale = Number.isFinite(t.h) ? t.h / e.boundsMax[1] : UNITS_PER_METRE;
    if (!place(id, key2, t, scale, stableUnit(seed2, key2, "yaw") * Math.PI * 2, true)) retainedTrees.push({ key: key2, reason: "conservative envelope or contact rejection; retain existing tree presentation" });
  }
  const candidates = [...decorativeCandidates];
  for (const r of coverRegions) {
    const step = 10;
    for (let x = Math.ceil(r.bounds.minX / step) * step; x <= r.bounds.maxX; x += step) for (let z = Math.ceil(r.bounds.minZ / step) * step; z <= r.bounds.maxZ; z += step) {
      const key2 = `cover:${r.key}:${x}:${z}`, patch = stableUnit(seed2, r.key, Math.floor(x / 36), Math.floor(z / 36), "patch");
      if (patch < 0.56 || stableUnit(seed2, key2, "gap") < 0.3) continue;
      if (quality2 === "low" && stableUnit(seed2, key2, "low") > 0.32) continue;
      if (distance5 === "far") continue;
      const choice = stableUnit(seed2, key2, "form"), id = r.kind === "bank" ? choice < 0.55 ? "reed-cluster" : choice < 0.8 ? "rush-cluster" : "bank-stones" : r.kind === "woodland" ? choice < 0.4 ? "fern-cluster" : choice < 0.8 ? "grass-tuft" : "hazel-shrub" : choice < 0.9 ? "grass-tuft" : choice < 0.96 ? "flower-cream" : "flower-mauve";
      candidates.push({ key: key2, assetId: id, x: x + (stableUnit(seed2, key2, "x") - 0.5) * 4, z: z + (stableUnit(seed2, key2, "z") - 0.5) * 4 });
    }
  }
  for (const p of candidates.sort((a, b) => a.key.localeCompare(b.key))) {
    if (seen.has(p.key)) throw Error("Duplicate landscape key: " + p.key);
    seen.add(p.key);
    if (distance5 === "far" && !["outcrop"].includes(catalog.get(p.assetId)?.category)) continue;
    place(p.assetId, p.key, p, (p.scale ?? 1) * UNITS_PER_METRE, p.yaw ?? stableUnit(seed2, p.key, "yaw") * Math.PI * 2);
  }
  instances.sort((a, b) => a.key.localeCompare(b.key));
  return { instances, retainedTrees, diagnostics: index.stats() };
}

// assets/wv/landscape-next/hamlet-props.mjs
import * as T6 from "../assets/vendor/three.module.mjs";
function createHamletProps({ low = false } = {}) {
  const material = new T6.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), geometries = /* @__PURE__ */ new Map();
  function make(kind) {
    const parts = [];
    const add = (g, color2) => {
      const c = new T6.Color(color2), n = g.index ? g.toNonIndexed() : g;
      if (n !== g) g.dispose();
      n.setAttribute("color", new T6.Float32BufferAttribute(Array.from({ length: n.attributes.position.count }, () => c.toArray()).flat(), 3));
      parts.push(n);
    };
    const box = (w, h, d, x, y, z, color2 = "#765741", yaw = 0) => add(new T6.BoxGeometry(w, h, d).rotateY(yaw).translate(x, y, z), color2);
    const blob = (x, y, z, rx, ry, rz, color2) => add(new T6.IcosahedronGeometry(1, 0).scale(rx, ry, rz).translate(x, y, z), color2);
    const pole = (a, b, r = 0.035, color2 = "#796347", sides = 5) => {
      const v = new T6.Vector3(...a), to = new T6.Vector3(...b), delta = to.clone().sub(v), g = new T6.CylinderGeometry(r * 0.82, r, delta.length(), sides);
      g.applyQuaternion(new T6.Quaternion().setFromUnitVectors(new T6.Vector3(0, 1, 0), delta.normalize()));
      g.translate(...v.add(to).multiplyScalar(0.5).toArray());
      add(g, color2);
    };
    if (kind === "fence-rail" || kind === "fence-wattle") {
      for (const x of [-1, 1]) box(0.09, 0.9, 0.09, x, 0.45, 0, "#77674e");
      if (kind === "fence-rail") {
        for (const y of low ? [0.62] : [0.32, 0.72]) box(2, 0.065, 0.065, 0, y, 0, "#918266");
      } else {
        for (let j = 0; j < (low ? 2 : 5); j++) box(2, 0.055, 0.045, 0, 0.17 + j * (low ? 0.38 : 0.15), j % 2 ? 0.025 : -0.025, "#8d7956");
        if (!low) for (const x of [-0.55, 0, 0.55]) pole([x, 0.05, 0], [x, 0.87, 0], 0.018, "#796347", 3);
      }
    } else if (kind === "garden-greens") {
      for (let i = 0; i < (low ? 1 : 2); i++) {
        const a = i * 2.4;
        blob(Math.sin(a) * 0.1, 0.12 + i % 2 * 0.025, Math.cos(a) * 0.1, 0.18, 0.14, 0.17, i % 2 ? "#71844d" : "#536f41");
      }
    } else if (kind === "garden-herbs") {
      for (let i = 0; i < (low ? 2 : 3); i++) {
        const a = i * 2.4, x = Math.sin(a) * 0.12, z = Math.cos(a) * 0.12;
        pole([x, 0, z], [x, 0.32 + i % 2 * 0.1, z], 0.014, "#657748", 3);
        blob(x, 0.24, z, 0.075, 0.14, 0.075, i % 2 ? "#87935d" : "#5e7749");
      }
    } else if (kind === "grain-sheaf") {
      for (let i = 0; i < (low ? 2 : 3); i++) {
        const a = i * 2.4;
        pole([Math.sin(a) * 0.1, 0, Math.cos(a) * 0.1], [Math.sin(a) * 0.13, 0.7 + i % 2 * 0.09, Math.cos(a) * 0.13], 0.021, "#a89f69", 3);
        add(new T6.ConeGeometry(0.055, 0.19, 3).translate(Math.sin(a) * 0.13, 0.73, Math.cos(a) * 0.13), "#b2aa78");
      }
    } else if (kind === "fruit-tree") {
      pole([0, 0, 0], [0.05, 2.6, 0], 0.1, "#66543e", low ? 5 : 7);
      for (let i = 0; i < (low ? 3 : 5); i++) {
        const a = i * 2.4, x = Math.sin(a) * 0.65, z = Math.cos(a) * 0.65;
        pole([0, 1.1, 0], [x, 2.2, z], 0.055, "#66543e");
        blob(x, 2.65 + i % 2 * 0.2, z, 0.92, 0.8, 0.85, i % 2 ? "#789257" : "#5d824e");
        if (!low) add(new T6.OctahedronGeometry(0.08).translate(x + 0.34, 2.4, z + 0.3), "#b39b61");
      }
    } else if (kind === "wood-stack") {
      for (let i = 0; i < (low ? 2 : 5); i++) {
        const y = i < 4 ? 0.13 : 0.37, z = i < 4 ? (i - 1.5) * 0.24 : (i - 5) * 0.24;
        pole([-1, y, z], [1, y, z], 0.12, "#7a6249", 6);
        pole([1, y, z], [1.008, y, z], 0.09, "#ac936d", 6);
      }
    } else if (kind === "bench") {
      box(1.65, 0.12, 0.42, 0, 0.48, 0, "#938164");
      for (const x of [-0.6, 0.6]) {
        box(0.13, 0.44, 0.34, x, 0.22, 0);
        pole([x, 0.48, 0.13], [x, 0.96, 0.18], 0.035);
      }
      box(1.65, 0.25, 0.07, 0, 0.82, 0.18, "#8b7758");
    } else if (kind === "well") {
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        box(0.38, 0.58, 0.24, Math.sin(a) * 0.68, 0.29, Math.cos(a) * 0.68, i % 2 ? "#9b9380" : "#847c6a", a);
      }
      for (const x of [-0.9, 0.9]) box(0.12, 1.85, 0.12, x, 0.925, 0);
      pole([-0.94, 1.33, 0], [0.94, 1.33, 0], 0.07);
      for (const s of [-1, 1]) add(new T6.BoxGeometry(1.2, 0.1, 2.1).rotateZ(-s * 0.48).translate(s * 0.49, 1.92, 0), "#887351");
      box(0.1, 2, 0.1, 0, 1, 0, "#6a5943");
    } else if (kind === "cart") {
      box(1.1, 0.1, 1.7, 0, 0.48, 0);
      for (const x of [-0.55, 0.55]) box(0.07, 0.4, 1.7, x, 0.72, 0, "#8b7659");
      box(1.1, 0.4, 0.07, 0, 0.72, -0.85, "#8b7659");
      for (const x of [-0.66, 0.66]) add(new T6.TorusGeometry(0.37, 0.045, 4, low ? 8 : 12).rotateY(Math.PI / 2).translate(x, 0.37, 0), "#695845");
      for (const x of [-0.4, 0.4]) pole([x, 0.45, 0.4], [x, 0.5, 2.2], 0.045);
    } else if (kind === "barrel") {
      add(new T6.CylinderGeometry(0.25, 0.24, 0.64, low ? 6 : 9).translate(0, 0.32, 0), "#8e7958");
      for (const y of [0.1, 0.5]) add(new T6.TorusGeometry(0.25, 0.025, 3, low ? 6 : 9).rotateX(Math.PI / 2).translate(0, y, 0), "#665f50");
    } else if (kind === "person") {
      add(new T6.SphereGeometry(0.115, 8, 6).translate(0, 1.635, 0), "#b99e7a");
      add(new T6.CylinderGeometry(0.17, 0.14, 0.54, 6).translate(0, 1.22, 0), "#718176");
      for (const s of [-1, 1]) {
        add(new T6.CylinderGeometry(0.065, 0.05, 0.9, 5).translate(s * 0.1, 0.45, 0), "#665e50");
        add(new T6.CylinderGeometry(0.05, 0.043, 0.62, 5).translate(s * 0.235, 1.12, 0), "#718176");
      }
    } else throw Error("Unknown hamlet prop: " + kind);
    const result = new T6.BufferGeometry();
    for (const name of ["position", "normal", "color"]) result.setAttribute(name, new T6.Float32BufferAttribute(parts.flatMap((p) => Array.from(p.attributes[name].array)), 3));
    for (const p of parts) p.dispose();
    result.computeBoundingBox();
    return result;
  }
  let disposed = false;
  return { build(records) {
    if (disposed) throw Error("Prop library disposed");
    const byKind = /* @__PURE__ */ new Map(), group = new T6.Group(), matrix = new T6.Matrix4(), q = new T6.Quaternion(), up = new T6.Vector3(0, 1, 0);
    for (const r of records) {
      if (!byKind.has(r.kind)) byKind.set(r.kind, []);
      byKind.get(r.kind).push(r);
    }
    for (const [kind, rows] of byKind) {
      if (!geometries.has(kind)) geometries.set(kind, make(kind));
      const mesh = new T6.InstancedMesh(geometries.get(kind), material, rows.length);
      rows.forEach((r, i) => {
        matrix.compose(new T6.Vector3(...r.origin), q.setFromAxisAngle(up, r.yaw || 0), new T6.Vector3(...r.scale || [2.8, 2.8, 2.8]));
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.computeBoundingBox();
      mesh.userData.keys = rows.map((r) => r.key);
      group.add(mesh);
    }
    let released = false;
    return { group, dispose() {
      if (released) return;
      released = true;
      group.removeFromParent();
      for (const m of group.children) m.dispose();
      group.clear();
    } };
  }, measurements() {
    return [...geometries].map(([kind, g]) => ({ kind, triangles: g.attributes.position.count / 3, boundsMin: g.boundingBox.min.toArray(), boundsMax: g.boundingBox.max.toArray(), materials: 1, textureBytes: 0, status: "gallery-review", runtimeReady: false }));
  }, dispose() {
    if (disposed) return;
    disposed = true;
    for (const g of geometries.values()) g.dispose();
    geometries.clear();
    material.dispose();
  } };
}

// assets/wv/landscape-next/plot-geometry.mjs
var EPS = 1e-7;
var lerp3 = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
var length = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
var dot = (a, b) => a.x * b.x + a.z * b.z;
var cross2 = (a, b) => a.x * b.z - a.z * b.x;
var sub = (a, b) => ({ x: a.x - b.x, z: a.z - b.z });
var pointKey = (p) => Math.round(p.x * 1e4) + "," + Math.round(p.z * 1e4);
var segmentKey = (a, b) => [pointKey(a), pointKey(b)].sort().join(":");
function ringArea(ring) {
  return ring.reduce((n, p, i) => n + cross2(p, ring[(i + 1) % ring.length]), 0) / 2;
}
function normalizeRing(input) {
  const ring = [];
  for (const p of input || []) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) throw Error("Polygon coordinates must be finite visual metres");
    if (!ring.length || length(p, ring.at(-1)) > EPS) ring.push({ x: p.x, z: p.z });
  }
  if (ring.length > 1 && length(ring[0], ring.at(-1)) < EPS) ring.pop();
  if (ring.length < 3 || Math.abs(ringArea(ring)) < EPS) throw Error("A plot needs a nondegenerate polygon");
  if (ringArea(ring) < 0) ring.reverse();
  let first = 0;
  for (let i = 1; i < ring.length; i++) if (ring[i].x < ring[first].x || ring[i].x === ring[first].x && ring[i].z < ring[first].z) first = i;
  return ring.slice(first).concat(ring.slice(0, first));
}
function boundsOf(points, pad = 0) {
  return { minX: Math.min(...points.map((p) => p.x)) - pad, maxX: Math.max(...points.map((p) => p.x)) + pad, minZ: Math.min(...points.map((p) => p.z)) - pad, maxZ: Math.max(...points.map((p) => p.z)) + pad };
}
function createSpatialIndex(cell = 8) {
  const bins = /* @__PURE__ */ new Map();
  let tests = 0;
  function keys(b) {
    const out = [];
    for (let x = Math.floor(b.minX / cell); x <= Math.floor(b.maxX / cell); x++) for (let z = Math.floor(b.minZ / cell); z <= Math.floor(b.maxZ / cell); z++) out.push(x + ":" + z);
    return out;
  }
  return { add(item, b) {
    for (const k of keys(b)) {
      if (!bins.has(k)) bins.set(k, []);
      bins.get(k).push(item);
    }
  }, query(b) {
    const found = /* @__PURE__ */ new Set();
    for (const k of keys(b)) for (const item of bins.get(k) || []) found.add(item);
    tests += found.size;
    return [...found];
  }, stats: () => ({ cells: bins.size, tests }) };
}
function pointInRing(p, ring) {
  let inside3 = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if (a.z > p.z !== b.z > p.z && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) inside3 = !inside3;
  }
  return inside3;
}
function pointInShape(p, shape) {
  return pointInRing(p, shape.polygon) && !(shape.holes || []).some((h) => pointInRing(p, h));
}
function segmentDistance3(p, a, b) {
  const d = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(p, a), d) / (dot(d, d) || 1)));
  return length(p, lerp3(a, b, t));
}
var edgeDistance = (p, ring) => Math.min(...ring.map((a, i) => segmentDistance3(p, a, ring[(i + 1) % ring.length])));
function fitsCircle(p, r, shape) {
  return pointInShape(p, shape) && edgeDistance(p, shape.polygon) >= r && (shape.holes || []).every((h) => edgeDistance(p, h) >= r);
}
function segmentIntersection(a, b, c, d) {
  const v = sub(b, a), w = sub(d, c), den = cross2(v, w);
  if (Math.abs(den) < EPS) return null;
  const t = cross2(sub(c, a), w) / den, u = cross2(sub(c, a), v) / den;
  return t >= -EPS && t <= 1 + EPS && u >= -EPS && u <= 1 + EPS ? { t, u } : null;
}
function fitsPolygon(poly, shape, margin = 0.08) {
  if (!poly.every((p) => fitsCircle(p, margin, shape))) return false;
  for (const ring of [shape.polygon, ...shape.holes || []]) for (let i = 0; i < ring.length; i++) for (let j = 0; j < poly.length; j++) if (segmentIntersection(ring[i], ring[(i + 1) % ring.length], poly[j], poly[(j + 1) % poly.length])) return false;
  return !(shape.holes || []).some((h) => pointInRing(h[0], poly));
}
function unionIntervals(input) {
  const list = input.map(([a, b]) => [Math.max(0, a), Math.min(1, b)]).filter(([a, b]) => b - a > EPS).sort((a, b) => a[0] - b[0] || a[1] - b[1]), out = [];
  for (const r of list) {
    const prev = out.at(-1);
    if (prev && r[0] <= prev[1] + EPS) prev[1] = Math.max(prev[1], r[1]);
    else out.push([...r]);
  }
  return out;
}
function subtractIntervals(input, cuts) {
  let out = input;
  for (const [lo, hi] of unionIntervals(cuts)) {
    const next = [];
    for (const [a, b] of out) {
      if (lo >= b || hi <= a) next.push([a, b]);
      else {
        if (lo > a) next.push([a, lo]);
        if (hi < b) next.push([hi, b]);
      }
    }
    out = next;
  }
  return out;
}
function circleRange(a, b, p, r) {
  const v = sub(b, a), ll = dot(v, v);
  if (ll < EPS) return [];
  const t = dot(sub(p, a), v) / ll, d2 = dot(sub(p, a), sub(p, a)) - t * t * ll;
  if (d2 > r * r) return [];
  const dt = Math.sqrt(Math.max(0, r * r - d2) / ll);
  return [[t - dt, t + dt]];
}
function capsuleRanges(a, b, c, d, r) {
  const len2 = length(c, d);
  if (len2 < EPS) return circleRange(a, b, c, r);
  const u = { x: (d.x - c.x) / len2, z: (d.z - c.z) / len2 }, v = { x: -u.z, z: u.x }, p = sub(a, c), step = sub(b, a);
  let lo = 0, hi = 1;
  for (const [axis, min, max] of [[u, 0, len2], [v, -r, r]]) {
    const start = dot(p, axis), delta = dot(step, axis);
    if (Math.abs(delta) < EPS) {
      if (start < min || start > max) {
        hi = -1;
        break;
      }
    } else {
      let x = (min - start) / delta, y = (max - start) / delta;
      if (x > y) [x, y] = [y, x];
      lo = Math.max(lo, x);
      hi = Math.min(hi, y);
    }
  }
  return unionIntervals([...hi > lo ? [[lo, hi]] : [], ...circleRange(a, b, c, r), ...circleRange(a, b, d, r)]);
}
function polygonRanges(a, b, ring) {
  const cuts = [0, 1];
  for (let i = 0; i < ring.length; i++) {
    const hit = segmentIntersection(a, b, ring[i], ring[(i + 1) % ring.length]);
    if (hit) cuts.push(Math.max(0, Math.min(1, hit.t)));
  }
  cuts.sort((a2, b2) => a2 - b2);
  const out = [];
  for (let i = 1; i < cuts.length; i++) {
    const lo = cuts[i - 1], hi = cuts[i], p = lerp3(a, b, (lo + hi) / 2);
    if (hi - lo > EPS && pointInRing(p, ring) && edgeDistance(p, ring) > EPS) out.push([lo, hi]);
  }
  return out;
}
function parallelOverlap(a, b, c, d, tolerance = 0.3) {
  const v = sub(b, a), w = sub(d, c), len2 = length(a, b), other = length(c, d);
  if (len2 < EPS || other < EPS || Math.abs(cross2(v, w)) / (len2 * other) > 0.087) return null;
  const t0 = dot(sub(c, a), v) / (len2 * len2), t1 = dot(sub(d, a), v) / (len2 * len2);
  let lo = Math.max(0, Math.min(t0, t1)), hi = Math.min(1, Math.max(t0, t1));
  const start = cross2(w, sub(a, c)) / other, delta = cross2(w, v) / other;
  if (Math.abs(delta) < EPS) {
    if (Math.abs(start) > tolerance) return null;
  } else {
    let p = (-tolerance - start) / delta, q = (tolerance - start) / delta;
    if (p > q) [p, q] = [q, p];
    lo = Math.max(lo, p);
    hi = Math.min(hi, q);
  }
  return hi - lo > EPS ? [lo, hi] : null;
}

// assets/wv/landscape-next/plot-boundaries.mjs
function planPlotBoundaries({ plots = [], existingFences = [], exclusions = [], sample = () => ({ height: 0, water: null, slope: 0 }), reuseDistance = 0.3 } = {}) {
  const accepted = [], uses = [], gaps = [], conflicts = [], fenceIndex = createSpatialIndex(), blockIndex = createSpatialIndex(), plotIndex = createSpatialIndex(), requests = [];
  const sorted = plots.map((p) => ({ ...p, polygon: normalizeRing(p.polygon), holes: (p.holes || []).map(normalizeRing) })).sort((a, b) => (a.establishedAt || 0) - (b.establishedAt || 0) || a.key.localeCompare(b.key));
  if (new Set(sorted.map((p) => p.key)).size !== sorted.length) throw Error("Plot keys must be unique");
  for (const p of sorted) plotIndex.add(p, boundsOf(p.polygon));
  for (const e of exclusions) {
    const points = e.polygon || e.points;
    if (points?.length) blockIndex.add(e, boundsOf(points, e.radius || 0.15));
  }
  for (const f of [...existingFences].sort((a, b) => a.key.localeCompare(b.key))) {
    const ref = { ...f, a: { ...f.a }, b: { ...f.b }, source: "existing", users: new Set(f.users || [f.ownerKey].filter(Boolean)) };
    accepted.push(ref);
    fenceIndex.add(ref, boundsOf([f.a, f.b], reuseDistance));
  }
  function excluded(a, b) {
    const cuts = [];
    for (const e of blockIndex.query(boundsOf([a, b], 0.12))) {
      if (e.polygon) {
        cuts.push(...polygonRanges(a, b, e.polygon));
        for (let i = 0; i < e.polygon.length; i++) cuts.push(...capsuleRanges(a, b, e.polygon[i], e.polygon[(i + 1) % e.polygon.length], (e.radius || 0) + 0.1));
      } else for (let i = 1; i < e.points.length; i++) cuts.push(...capsuleRanges(a, b, e.points[i - 1], e.points[i], (e.radius || 0) + 0.1));
    }
    return cuts;
  }
  for (const f of accepted) if (excluded(f.a, f.b).length) conflicts.push({ key: f.key, reason: "existing-fence-in-exclusion" });
  for (const plot of sorted) {
    if (plot.kind === "field" && !plot.gates?.length) {
      let best = null;
      const routes = exclusions.filter((e) => e.points?.length > 1 && ["lane", "road", "path", "approach"].includes(e.kind));
      for (let i = 0; i < plot.polygon.length; i++) {
        const a = plot.polygon[i], b = plot.polygon[(i + 1) % plot.polygon.length];
        for (const route of routes) for (const p of route.points) {
          const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz))), q = lerp3(a, b, t), d = length(p, q);
          if (!best || d < best.distance) best = { point: q, distance: d };
        }
      }
      const point = best?.point || lerp3(plot.polygon[0], plot.polygon[1], 0.5);
      plot.gates = [{ point, width: 2.8 }];
      gaps.push({ plotKey: plot.key, reason: "field-access", point, width: 2.8, source: best ? "nearest-supplied-corridor" : "caller-access-required" });
    }
    const edges = plot.fenceEdges?.map(([a, b]) => ({ a, b })) || [plot.polygon, ...plot.holes].flatMap((r) => r.map((a, i) => ({ a, b: r[(i + 1) % r.length] })));
    edges.sort((a, b) => segmentKey(a.a, a.b).localeCompare(segmentKey(b.a, b.b)));
    for (const { a, b } of edges) if (length(a, b) > 0.15) requests.push({ a, b, plot });
  }
  for (const { a, b, plot } of requests) {
    const len2 = length(a, b), cuts = excluded(a, b), neighbors = fenceIndex.query(boundsOf([a, b], reuseDistance + 0.12));
    for (const f of neighbors) {
      const shared = parallelOverlap(a, b, f.a, f.b, reuseDistance);
      if (shared) {
        cuts.push(shared);
        f.users.add(plot.key);
        uses.push({ plotKey: plot.key, boundaryKey: f.key, range: shared, source: f.source });
        continue;
      }
      const hit = segmentIntersection(a, b, f.a, f.b);
      if (hit && hit.t > EPS && hit.t < 1 - EPS && hit.u > EPS && hit.u < 1 - EPS) {
        cuts.push([hit.t - 0.15 / len2, hit.t + 0.15 / len2]);
        gaps.push({ plotKey: plot.key, reason: "fence-crossing", at: lerp3(a, b, hit.t) });
      }
    }
    for (const other of plotIndex.query(boundsOf([a, b]))) {
      if (other.key === plot.key) continue;
      cuts.push(...polygonRanges(a, b, other.polygon));
    }
    for (const gate of plot.gates || []) {
      const w = (gate.width || 2.4) / 2 + 0.12;
      cuts.push(...capsuleRanges(a, b, gate.point, gate.point, w));
    }
    const n = Math.max(1, Math.ceil(len2 / 0.25));
    for (let i = 0; i < n; i++) {
      const lo = i / n, hi = (i + 1) / n;
      for (const t of [lo, (lo + hi) / 2, hi]) {
        const p = lerp3(a, b, t), s = sample(p.x, p.z);
        if (!s || !Number.isFinite(s.height) || s.water != null || Math.abs(s.slope || 0) > 0.45) {
          cuts.push([lo, hi]);
          break;
        }
      }
    }
    for (const [lo, hi] of subtractIntervals([[0, 1]], cuts)) {
      const aa = lerp3(a, b, lo), bb = lerp3(a, b, hi);
      if (length(aa, bb) < 0.35) continue;
      const key2 = "boundary:" + segmentKey(aa, bb), f = { key: key2, a: aa, b: bb, ownerKey: plot.key, users: /* @__PURE__ */ new Set([plot.key]), kind: plot.fenceKind || "fence-rail", source: "candidate" };
      accepted.push(f);
      fenceIndex.add(f, boundsOf([aa, bb], reuseDistance));
      uses.push({ plotKey: plot.key, boundaryKey: key2, range: [lo, hi], source: f.source });
    }
  }
  const fences = accepted.map((f) => ({ ...f, users: [...f.users].sort() })).sort((a, b) => a.key.localeCompare(b.key));
  return { revision: "plot-boundaries-1", runtimeReady: false, fences, uses: uses.sort((a, b) => a.plotKey.localeCompare(b.plotKey) || a.boundaryKey.localeCompare(b.boundaryKey)), gaps, conflicts, diagnostics: { requests: requests.length, fenceQueries: fenceIndex.stats(), exclusionQueries: blockIndex.stats(), plotQueries: plotIndex.stats() } };
}

// assets/wv/landscape-next/hamlet-plan.mjs
var HAMLET_STAGES = Object.freeze([4, 12, 30]);
function keyedUnit(key2) {
  let h = 2166136261;
  for (const c of String(key2)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}
var transformPoint = (p, origin, yaw = 0) => {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: origin.x + p.x * c + p.z * s, z: origin.z - p.x * s + p.z * c };
};
var rectangle = (x, z, w, d, yaw = 0) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => transformPoint({ x: a, z: b }, { x, z }, yaw));
function segmentDistance4(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}
var lineDistance = (p, points) => Math.min(...points.slice(1).map((b, i) => segmentDistance4(p, points[i], b)));
var lane = (key2, stage, width, xy) => ({ key: key2, stage, width, points: xy.map(([x, z]) => ({ x, z })), kind: "lane" });
var LANES = [
  lane("old-bend", 4, 2.65, [[-73, 27], [-64, 20], [-45, 12], [-27, 5], [-10, 0], [8, 0], [26, -4], [46, -12], [65, -27]]),
  lane("brook-lane", 4, 1.9, [[12, -1], [18, 12], [34, 23], [51, 24], [67, 34]]),
  lane("farm-track", 4, 2.1, [[-45, 12], [-54, -9], [-52, -24], [-49, -41], [-61, -58]]),
  lane("north-croft", 30, 1.8, [[-42, 10], [-48, -12], [-32, -32], [-5, -39], [22, -37], [43, -42], [59, -51]]),
  lane("south-croft", 30, 1.7, [[-35, 8], [-42, 32], [-18, 48], [5, 51], [27, 50], [50, 49], [76, 54], [77, 31]])
];

// assets/wv/landscape-next/plot-dressing.mjs
function createPlotClearance(exclusions = []) {
  const index = createSpatialIndex();
  for (const e of exclusions) {
    const points = e.polygon || e.points;
    if (points?.length) index.add(e, boundsOf(points, e.radius || 0));
  }
  return { blocked(p, r = 0) {
    for (const e of index.query(boundsOf([p], r))) {
      const radius = r + (e.radius || 0);
      if (e.polygon) {
        if (pointInRing(p, e.polygon) || edgeDistance(p, e.polygon) < radius) return true;
      } else if (e.points.length === 1) {
        if (Math.hypot(p.x - e.points[0].x, p.z - e.points[0].z) < radius) return true;
      } else if (e.points.slice(1).some((b, i) => segmentDistance3(p, e.points[i], b) < radius)) return true;
    }
    return false;
  }, stats: () => index.stats() };
}
function dressPlots({ seed: seed2, plots = [], existingFences = [], exclusions = [], sample = () => ({ height: 0, water: null, slope: 0 }), quality: quality2 = "normal", distance: distance5 = "near", omitSmallPlants = false } = {}) {
  const ordered = plots.map((p) => ({ ...p, polygon: normalizeRing(p.polygon), holes: (p.holes || []).map(normalizeRing) })).sort((a, b) => a.key.localeCompare(b.key));
  const boundaries = planPlotBoundaries({ plots: ordered, existingFences, exclusions, sample }), clearance = createPlotClearance(exclusions), neighbors = createSpatialIndex(), occupied = createSpatialIndex(), fenceClearance = createPlotClearance(boundaries.fences.map((f) => ({ points: [f.a, f.b], radius: 0.1 }))), props = [], beds = [], plotStats = [];
  for (const p of ordered) neighbors.add(p, boundsOf(p.polygon));
  function validPoint(p, r, plot, region) {
    if (!fitsCircle(p, r + 0.08, plot) || region && !fitsCircle(p, r + 0.04, region) || clearance.blocked(p, r) || fenceClearance.blocked(p, r)) return false;
    for (const other of neighbors.query(boundsOf([p], r))) if (other.key !== plot.key && (pointInShape(p, other) || edgeDistance(p, other.polygon) < r)) return false;
    for (const q of occupied.query(boundsOf([p], r))) if (Math.hypot(p.x - q.x, p.z - q.z) < r + q.radius + 0.08) return false;
    return [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]].every(([dx, dz]) => {
      const s = sample(p.x + dx, p.z + dz);
      return s && Number.isFinite(s.height) && s.water == null && Math.abs(s.slope || 0) <= 0.3;
    });
  }
  function add(kind, key2, p, radius, height, plot, yaw = 0, scale = 1, footRadius = 0.12) {
    if (!validPoint(p, radius, plot)) return false;
    const center = sample(p.x, p.z), points = [[0, 0], [footRadius, 0], [-footRadius, 0], [0, footRadius], [0, -footRadius]].map(([dx, dz]) => ({ x: p.x + dx, z: p.z + dz, ...sample(p.x + dx, p.z + dz) }));
    if (points.some((s) => s.water != null || !Number.isFinite(s.height))) return false;
    const baseY = Math.max(...points.map((s) => s.height)), gap = baseY - Math.min(...points.map((s) => s.height));
    if (gap > (kind === "wood-stack" ? 0.06 : 0.1)) return false;
    props.push({ key: key2, plotKey: plot.key, kind, assetId: kind, origin: [p.x, baseY, p.z], scale, yaw, bounds: { min: [p.x - radius, baseY, p.z - radius], max: [p.x + radius, baseY + height * scale, p.z + radius] }, quality: quality2, lod: distance5, groundContact: { baseY, maxGap: gap, points: points.map(({ x, z, height: height2 }) => ({ x, z, height: height2 })) } });
    occupied.add({ x: p.x, z: p.z, radius }, boundsOf([p], radius));
    return true;
  }
  for (const plot of ordered) {
    const start = props.length, bedStart = beds.length, region = plot.plantingPolygon ? { polygon: normalizeRing(plot.plantingPolygon), holes: plot.holes } : plot, origin = plot.origin || { x: 0, z: 0 }, yaw = plot.yaw || 0, local = (p) => transformPoint(p, origin, yaw), inverse = (p) => transformPoint({ x: p.x - origin.x, z: p.z - origin.z }, { x: 0, z: 0 }, -yaw), box = boundsOf(region.polygon.map(inverse)), area = Math.max(0, Math.abs(ringArea(region.polygon)) - (region.holes || []).reduce((n, h) => n + Math.abs(ringArea(h)), 0));
    const use = plot.kind === "field" ? "field" : plot.use || "kitchen-garden", step = use === "orchard" ? 3.6 : use === "work-yard" ? 2.8 : use === "field" ? 1.8 : 1.5, candidates = [];
    if (plot.planting === false) {
      plotStats.push({ key: plot.key, kind: plot.kind || "home", use: "open-ground", area, props: 0, beds: 0 });
      continue;
    }
    const nx = Math.ceil((box.maxX - box.minX) / step) + 2, nz = Math.ceil((box.maxZ - box.minZ) / step) + 2;
    if (nx * nz > 5e4) throw Error("Plot exceeds decoration candidate budget");
    for (let ix = Math.floor(box.minX / step); ix <= Math.ceil(box.maxX / step); ix++) for (let iz = Math.floor(box.minZ / step); iz <= Math.ceil(box.maxZ / step); iz++) {
      const key2 = plot.key + ":" + use + ":" + ix + "," + iz, p = local({ x: ix * step, z: iz * step });
      if (pointInShape(p, region)) candidates.push({ key: key2, p, rank: keyedUnit(seed2 + ":" + key2), ix, iz });
    }
    candidates.sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key));
    if (use === "orchard") {
      const cap = Math.min(6, Math.floor(area / 9));
      let count2 = 0;
      for (const c of candidates) {
        if (count2 >= cap) break;
        const scale = 0.87 + c.rank * 0.13, r = 1.65 * scale;
        if (validPoint(c.p, r, plot, region) && add("fruit-tree", c.key, c.p, r, 3.75, plot, yaw, scale)) count2++;
      }
    } else if (use === "work-yard") {
      let count2 = 0;
      for (const c of candidates) {
        if (count2 >= Math.min(2, Math.floor(area / 16))) break;
        if (validPoint(c.p, 1.1, plot, region) && add("wood-stack", c.key, c.p, 1.1, 0.55, plot, yaw, 1, 0.95)) count2++;
      }
      for (const c of candidates) if (validPoint(c.p, 0.3, plot, region) && add("barrel", c.key + ":barrel", c.p, 0.3, 0.65, plot, yaw, 1, 0.22)) break;
    } else if (use === "field") {
      if (distance5 !== "far" && !omitSmallPlants) {
        let count2 = 0;
        for (const c of candidates) {
          if (count2 >= 150) break;
          if (quality2 === "low" && c.rank > 0.4) continue;
          if (validPoint(c.p, 0.25, plot, region) && add("grain-sheaf", c.key, c.p, 0.25, 0.92, plot, yaw, 0.83, 0.12)) count2++;
        }
      }
    } else {
      const cap = Math.min(6, Math.floor(area / 4.8));
      for (const c of candidates) {
        if (beds.length - bedStart >= cap) break;
        const poly = rectangle(c.p.x, c.p.z, 1.05, 2.05, yaw);
        if (!fitsPolygon(poly, plot) || !fitsPolygon(poly, region) || poly.some((p) => clearance.blocked(p, 0.2)) || !validPoint(c.p, 1.14, plot)) continue;
        beds.push({ key: c.key + ":bed", plotKey: plot.key, polygon: poly });
        occupied.add({ ...c.p, radius: 1.14 }, boundsOf(poly, 0.1));
        if (distance5 === "far" || omitSmallPlants) continue;
        for (const [i, offset] of [[0, { x: 0, z: -0.58 }], [1, { x: 0, z: 0 }], [2, { x: 0, z: 0.58 }]]) {
          if (quality2 === "low" && i !== 1) continue;
          const p = transformPoint(offset, c.p, yaw), height = sample(p.x, p.z).height, kind = c.rank > 0.66 ? "garden-herbs" : "garden-greens", r = 0.23;
          props.push({ key: c.key + ":plant:" + i, plotKey: plot.key, kind, assetId: kind, origin: [p.x, height, p.z], scale: 0.85, yaw, bounds: { min: [p.x - r, height, p.z - r], max: [p.x + r, height + 0.45, p.z + r] }, quality: quality2, lod: distance5, groundContact: { baseY: height, maxGap: 0, points: [{ ...p, height }] } });
        }
      }
    }
    plotStats.push({ key: plot.key, kind: plot.kind || "home", use, area, props: props.length - start, beds: beds.length - bedStart });
  }
  return { revision: "plot-dressing-1", runtimeReady: false, props: props.sort((a, b) => a.key.localeCompare(b.key)), beds: beds.sort((a, b) => a.key.localeCompare(b.key)), boundaries, plotStats, diagnostics: { clearances: clearance.stats(), neighbors: neighbors.stats(), occupied: occupied.stats() } };
}

// assets/wv/landscape-next/plot-fence-view.mjs
import * as T7 from "../assets/vendor/three.module.mjs";
function createPlotFenceLibrary() {
  const geometry = new T7.BoxGeometry(1, 1, 1), material = new T7.MeshStandardMaterial({ roughness: 1 });
  let disposed = false;
  return { build(fences, { sample, units = 2.8, quality: quality2 = "normal" } = {}) {
    if (disposed) throw Error("Fence library disposed");
    const posts = /* @__PURE__ */ new Map(), rails = [], contacts = [];
    for (const f of fences) {
      const n = Math.max(1, Math.ceil(length(f.a, f.b) / 2.4)), points = [], indices = [];
      for (let i = 0; i < n; i += quality2 === "low" ? 2 : 1) indices.push(i);
      indices.push(n);
      for (const i of indices) {
        const p = lerp3(f.a, f.b, i / n), y = sample(p.x, p.z).height, k = pointKey(p);
        points.push({ ...p, y });
        if (!posts.has(k)) {
          posts.set(k, { ...p, y, key: k });
          contacts.push({ key: k, x: p.x, z: p.z, height: y });
        }
      }
      for (let i = 1; i < points.length; i++) for (const height of quality2 === "low" ? [0.62] : f.kind === "fence-wattle" ? [0.22, 0.47, 0.72] : [0.32, 0.72]) rails.push({ a: points[i - 1], b: points[i], height });
    }
    const group = new T7.Group(), pmesh = new T7.InstancedMesh(geometry, material, posts.size), rmesh = new T7.InstancedMesh(geometry, material, rails.length), matrix = new T7.Matrix4(), q = new T7.Quaternion(), up = new T7.Vector3(1, 0, 0), wood = new T7.Color("#867253");
    group.userData.kind = "plot-fences";
    pmesh.userData.kind = "fence-post";
    rmesh.userData.kind = "fence-rail";
    [...posts.values()].forEach((p, i) => {
      matrix.compose(new T7.Vector3(p.x * units, (p.y + 0.45) * units, p.z * units), new T7.Quaternion(), new T7.Vector3(0.09 * units, 0.9 * units, 0.09 * units));
      pmesh.setMatrixAt(i, matrix);
      pmesh.setColorAt(i, wood);
    });
    rails.forEach((r, i) => {
      const a = new T7.Vector3(r.a.x, r.a.y + r.height, r.a.z), b = new T7.Vector3(r.b.x, r.b.y + r.height, r.b.z), delta = b.clone().sub(a);
      q.setFromUnitVectors(up, delta.clone().normalize());
      matrix.compose(a.add(b).multiplyScalar(units / 2), q, new T7.Vector3(delta.length() * units, 0.06 * units, 0.055 * units));
      rmesh.setMatrixAt(i, matrix);
      rmesh.setColorAt(i, wood);
    });
    for (const mesh of [pmesh, rmesh]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingBox();
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
    const bounds = new T7.Box3().setFromObject(group);
    let released = false;
    return { group, contacts, stats: { boundaries: fences.length, posts: posts.size, rails: rails.length, triangles: (posts.size + rails.length) * 12, drawCalls: 2, materials: 1, textureBytes: 0, boundsMin: bounds.isEmpty() ? null : bounds.min.toArray(), boundsMax: bounds.isEmpty() ? null : bounds.max.toArray(), boundsUnits: "game units; source construction in metres" }, dispose() {
      if (released) return;
      released = true;
      group.removeFromParent();
      pmesh.dispose();
      rmesh.dispose();
      group.clear();
    } };
  }, dispose() {
    if (disposed) return;
    disposed = true;
    geometry.dispose();
    material.dispose();
  } };
}

// assets/wv/landscape-next/painted-fields.mjs
var key = (x, z) => x + "," + z;
var steps = [[1, 0], [0, 1], [-1, 0], [0, -1]];
function derivePaintedFields({ cellSize = 1, bounds, cells, sampleUse, sampleSurface = () => ({ height: 0, water: null, slope: 0 }), maxCells = 2e5 } = {}) {
  if (!(cellSize > 0)) throw Error("Field cellSize must be positive");
  const filled = /* @__PURE__ */ new Set();
  let queries = 0;
  function dry(x, z) {
    const s = sampleSurface(x, z);
    return s && Number.isFinite(s.height) && s.water == null && Math.abs(s.slope || 0) <= 0.45;
  }
  if (cells) {
    if (cells.length > maxCells) throw Error("Field mask exceeds cell budget");
    for (const c of cells) {
      if (!Number.isInteger(c.ix) || !Number.isInteger(c.iz)) throw Error("Field mask uses integer ix/iz cells");
      const x = (c.ix + 0.5) * cellSize, z = (c.iz + 0.5) * cellSize;
      if (dry(x, z)) filled.add(key(c.ix, c.iz));
    }
  } else {
    if (!bounds || typeof sampleUse !== "function") throw Error("Supply committed field cells, or bounds and sampleUse");
    const x0 = Math.floor(bounds.minX / cellSize), x1 = Math.ceil(bounds.maxX / cellSize), z0 = Math.floor(bounds.minZ / cellSize), z1 = Math.ceil(bounds.maxZ / cellSize);
    if ((x1 - x0) * (z1 - z0) > maxCells) throw Error("Field bounds exceed cell budget");
    for (let x = x0; x < x1; x++) for (let z = z0; z < z1; z++) {
      let valid = true;
      for (const [u, v] of [[0.5, 0.5], [0, 0], [1, 0], [1, 1], [0, 1]]) {
        const px = (x + u) * cellSize, pz = (z + v) * cellSize;
        queries++;
        if (sampleUse(px, pz) !== "farmland" || !dry(px, pz)) {
          valid = false;
          break;
        }
      }
      if (valid) filled.add(key(x, z));
    }
  }
  const sorted = [...filled].map((k) => k.split(",").map(Number)).sort((a, b) => a[0] - b[0] || a[1] - b[1]), visited = /* @__PURE__ */ new Set(), fields = [];
  const allowed = sampleUse ? (x, z) => sampleUse(x, z) === "farmland" && dry(x, z) : (x, z) => [-1, 1].some((a) => [-1, 1].some((b) => filled.has(key(Math.floor((x + a * 1e-6) / cellSize), Math.floor((z + b * 1e-6) / cellSize)))));
  function simplify(ring) {
    let out = ring;
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      for (let i = 0; i < out.length && out.length > 4; i++) {
        const a = out[(i + out.length - 1) % out.length], b = out[i], c = out[(i + 1) % out.length];
        if (segmentDistance3(b, a, c) > cellSize * 0.8) continue;
        const n = Math.max(1, Math.ceil(length(a, c) / 0.2));
        let ok = true;
        for (let j = 0; j <= n; j++) {
          const p = lerp3(a, c, j / n);
          if (!allowed(p.x, p.z)) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        out = out.filter((_, j) => j !== i);
        i--;
        changed = true;
      }
      if (!changed) break;
    }
    return out;
  }
  for (const [sx, sz] of sorted) {
    let add = function(ax, az, bx, bz) {
      const edge = { a: { x: ax * cellSize, z: az * cellSize }, b: { x: bx * cellSize, z: bz * cellSize }, used: false }, k = key(ax, az);
      edges.push(edge);
      if (!starts.has(k)) starts.set(k, []);
      starts.get(k).push(edge);
    };
    if (visited.has(key(sx, sz))) continue;
    const queue = [[sx, sz]], component = /* @__PURE__ */ new Set([key(sx, sz)]);
    visited.add(key(sx, sz));
    for (let at = 0; at < queue.length; at++) {
      const [x, z] = queue[at];
      for (const [dx, dz] of steps) {
        const k = key(x + dx, z + dz);
        if (filled.has(k) && !visited.has(k)) {
          visited.add(k);
          component.add(k);
          queue.push([x + dx, z + dz]);
        }
      }
    }
    const edges = [], starts = /* @__PURE__ */ new Map();
    for (const [x, z] of queue) {
      if (!component.has(key(x, z - 1))) add(x, z, x + 1, z);
      if (!component.has(key(x + 1, z))) add(x + 1, z, x + 1, z + 1);
      if (!component.has(key(x, z + 1))) add(x + 1, z + 1, x, z + 1);
      if (!component.has(key(x - 1, z))) add(x, z + 1, x, z);
    }
    const rings = [];
    for (const first of edges) {
      if (first.used) continue;
      const ring = [];
      let e = first;
      while (e && !e.used) {
        e.used = true;
        ring.push(e.a);
        if (length(e.b, first.a) < 1e-7) break;
        const candidates = (starts.get(key(Math.round(e.b.x / cellSize), Math.round(e.b.z / cellSize))) || []).filter((n) => !n.used), dx = e.b.x - e.a.x, dz = e.b.z - e.a.z;
        const rank = (n) => {
          const xx = n.b.x - n.a.x, zz = n.b.z - n.a.z, c = dx * zz - dz * xx, d = dx * xx + dz * zz;
          return c > 0 ? 0 : d > 0 ? 1 : c < 0 ? 2 : 3;
        };
        candidates.sort((a, b) => rank(a) - rank(b));
        e = candidates[0];
      }
      if (ring.length >= 4) {
        const area = ringArea(ring);
        rings.push({ area, polygon: normalizeRing(simplify(ring)) });
      }
    }
    const outer = rings.filter((r) => r.area > 0), holes = rings.filter((r) => r.area < 0);
    for (const [i, r] of outer.entries()) {
      const ownHoles = holes.filter((h) => pointInRing(h.polygon[0], r.polygon));
      fields.push({ key: `painted-field:${sx},${sz}:${i}`, kind: "field", polygon: r.polygon, holes: ownHoles.map((h) => h.polygon), area: Math.abs(ringArea(r.polygon)) - ownHoles.reduce((n, h) => n + Math.abs(ringArea(h.polygon)), 0), rasterArea: Math.abs(r.area) - ownHoles.reduce((n, h) => n + Math.abs(h.area), 0), cellSize, source: "committed-land-use-mask" });
    }
  }
  return { revision: "painted-fields-1", runtimeReady: false, fields, diagnostics: { cells: filled.size, queries, components: fields.length, cellSize } };
}

// assets/wv/landscape-next/plot-study.mjs
function createPlotStudyPlan() {
  const lane3 = { key: "study-lane", stage: 4, width: 2.6, kind: "lane", points: [{ x: -42, z: 15 }, { x: 45, z: 15 }] }, fieldPath = { key: "field-access", kind: "path", width: 1.8, points: [{ x: -26, z: 15 }, { x: -26, z: -23 }] };
  const holdings = [
    { key: "holding-01", assetId: "home-steep-gable", origin: { x: -14, z: 4 }, yaw: 0, use: "kitchen-garden", polygon: [{ x: -21, z: 12 }, { x: -8, z: 12 }, { x: -8, z: -9 }, { x: -16, z: -12 }, { x: -22, z: -5 }], garden: { center: { x: -14, z: -5 }, width: 8, depth: 6, yaw: 0 }, gate: { x: -14, z: 13.6 } },
    { key: "holding-02", assetId: "home-low-hip", origin: { x: -2, z: 4 }, yaw: 0, use: "work-yard", polygon: [{ x: -8, z: 12 }, { x: 4, z: 12 }, { x: 4, z: -6 }, { x: 0, z: -11 }, { x: -8, z: -9 }], garden: { center: { x: -2, z: -5 }, width: 7, depth: 6, yaw: 0 }, gate: { x: -2, z: 13.6 } },
    { key: "holding-03", assetId: "home-porch-cabin", origin: { x: 15, z: 3 }, yaw: 0, use: "orchard", polygon: [{ x: 8, z: 12 }, { x: 24, z: 12 }, { x: 26, z: -8 }, { x: 20, z: -16 }, { x: 9, z: -14 }, { x: 7, z: -4 }], garden: { center: { x: 16, z: -9 }, width: 13, depth: 8, yaw: 0 }, gate: { x: 15, z: 13.6 } },
    { key: "holding-04", assetId: "home-low-hip", origin: { x: 32, z: 4 }, yaw: 0, use: "orchard", polygon: [{ x: 29, z: 11 }, { x: 37, z: 10 }, { x: 35, z: -1 }, { x: 28, z: -1 }, { x: 27, z: 8 }], garden: { center: { x: 31.6, z: 0.25 }, width: 5, depth: 1.5, yaw: 0 }, gate: { x: 32, z: 13.6 } }
  ].map((p, i) => ({ ...p, stage: 4, establishedAt: i, source: "detached-plot-study" }));
  const dabs = [{ x: -28, z: -33 }, { x: -15, z: -31 }, { x: -2, z: -33 }, { x: 11, z: -31 }];
  const sampleUse = (x, z) => dabs.some((p) => Math.hypot(x - p.x, z - p.z) <= 10.5) && Math.hypot(x + 6, z + 32) > 2.7 && lineDistance({ x, z }, fieldPath.points) > fieldPath.width / 2 ? "farmland" : null;
  const fieldMask = derivePaintedFields({ bounds: { minX: -40, minZ: -45, maxX: 23, maxZ: -19 }, cellSize: 0.75, sampleUse });
  const regions = [...fieldMask.fields, ...holdings.map((h) => ({ key: h.key + ":holding", kind: "holding", polygon: h.polygon })), ...holdings.map((h) => ({ key: h.key + ":use", kind: h.use === "work-yard" ? "yard" : "garden", polygon: rectangle(h.garden.center.x, h.garden.center.z, h.garden.width, h.garden.depth), holdingKey: h.key }))];
  return {
    revision: "irregular-plot-study-1",
    status: "gallery-review",
    runtimeReady: false,
    isPlotStudy: true,
    source: "authored irregular holdings and supplied committed-use fixture; no simulation mutation",
    seed: "WV-SHARED-PLOTS-1",
    stage: 4,
    width: 180,
    depth: 164,
    holdings,
    buildings: [],
    lanes: [lane3],
    paths: [fieldPath],
    regions,
    features: [],
    fieldMask: fieldMask.diagnostics,
    existingFences: [{ key: "earlier-household-fence", ownerKey: "holding-01", kind: "fence-wattle", a: { x: -8, z: -9 }, b: { x: -8, z: 12 } }],
    camera: { overview: { x: -2, z: -8, zoom: 102 }, green: { x: -8, z: 3, zoom: 57 }, gardens: { x: 12, z: -3, zoom: 62 }, farm: { x: -8, z: -31, zoom: 73 } }
  };
}

// assets/wv/landscape-next/hamlet-plan.mjs?v=plot-aware-1
var HAMLET_REVISION = "inhabited-hamlet-2";
var METRES_TO_GAME = 2.8;
var HAMLET_STAGES2 = Object.freeze([4, 12, 30]);
var HOME_IDS2 = ["home-steep-gable", "home-low-hip", "home-porch-cabin", "home-long-ridge", "home-offset-gables"];
function keyedUnit2(key2) {
  let h = 2166136261;
  for (const c of String(key2)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}
var transformPoint2 = (p, origin, yaw = 0) => {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { x: origin.x + p.x * c + p.z * s, z: origin.z - p.x * s + p.z * c };
};
var rectangle2 = (x, z, w, d, yaw = 0) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([a, b]) => transformPoint2({ x: a, z: b }, { x, z }, yaw));
function pointInPolygon(p, poly) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.z > p.z !== b.z > p.z && p.x < (b.x - a.x) * (p.z - a.z) / (b.z - a.z) + a.x) yes = !yes;
  }
  return yes;
}
function segmentDistance5(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}
var lineDistance2 = (p, points) => Math.min(...points.slice(1).map((b, i) => segmentDistance5(p, points[i], b)));
function atStation(points, station) {
  let left = station;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], d = Math.hypot(b.x - a.x, b.z - a.z);
    if (left <= d || i === points.length - 1) {
      const t = Math.min(1, left / d);
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / d, dz: (b.z - a.z) / d };
    }
    left -= d;
  }
  throw Error("A lane needs two points");
}
var lane2 = (key2, stage, width, xy) => ({ key: key2, stage, width, points: xy.map(([x, z]) => ({ x, z })), kind: "lane" });
var LANES2 = [
  lane2("old-bend", 4, 2.65, [[-73, 27], [-64, 20], [-45, 12], [-27, 5], [-10, 0], [8, 0], [26, -4], [46, -12], [65, -27]]),
  lane2("brook-lane", 4, 1.9, [[12, -1], [18, 12], [34, 23], [51, 24], [67, 34]]),
  lane2("farm-track", 4, 2.1, [[-45, 12], [-54, -9], [-52, -24], [-49, -41], [-61, -58]]),
  lane2("north-croft", 30, 1.8, [[-42, 10], [-48, -12], [-32, -32], [-5, -39], [22, -37], [43, -42], [59, -51]]),
  lane2("south-croft", 30, 1.7, [[-35, 8], [-42, 32], [-18, 48], [5, 51], [27, 50], [50, 49], [76, 54], [77, 31]])
];
var HOLDINGS = [
  ["old-bend", 72, -1, 8.3, 9.2, 4],
  ["old-bend", 89, -1, 8.8, 10.2, 4],
  ["old-bend", 59, 1, 8.7, 8.8, 4],
  ["brook-lane", 17, 1, 8.4, 9.2, 4],
  ["old-bend", 50, -1, 8.6, 9.8, 12],
  ["old-bend", 48, 1, 9, 9.1, 12],
  ["old-bend", 102, -1, 8.9, 10.1, 12],
  ["old-bend", 115, -1, 8.6, 9.6, 12],
  ["old-bend", 118, 1, 9.3, 10.2, 12],
  ["brook-lane", 34, 1, 8.9, 10, 12],
  ["brook-lane", 34, -1, 8.4, 8.6, 12],
  ["brook-lane", 55, 1, 9, 9.6, 12],
  ["old-bend", 146, -1, 8.9, 9.4, 30],
  ["old-bend", 145, 1, 9.5, 9.8, 30],
  ["old-bend", 23, -1, 8.7, 9.3, 30],
  ["old-bend", 9, -1, 9.5, 9.5, 30],
  ["brook-lane", 68, -1, 8.8, 9.5, 30],
  ["brook-lane", 68, 1, 8.9, 9.8, 30],
  ["north-croft", 34, 1, 8.1, 8.9, 30],
  ["north-croft", 49, 1, 8, 9.6, 30],
  ["north-croft", 65, 1, 8.4, 9.4, 30],
  ["north-croft", 82, 1, 8.8, 9.8, 30],
  ["north-croft", 98, 1, 8.6, 9.4, 30],
  ["north-croft", 116, 1, 8.4, 9.6, 30],
  ["south-croft", 33, 1, 8.6, 9, 30],
  ["south-croft", 48, 1, 8.7, 9.4, 30],
  ["south-croft", 64, 1, 8.8, 9.3, 30],
  ["south-croft", 81, 1, 8.9, 9.5, 30],
  ["south-croft", 99, 1, 8.7, 9.3, 30],
  ["south-croft", 118, 1, 8.8, 9.5, 30]
];
function holding(row, index, seed2) {
  const [laneKey, station, side, setback, width, stage] = row, route = LANES2.find((l) => l.key === laneKey), p = atStation(route.points, station);
  const origin = { x: p.x - p.dz * side * setback, z: p.z + p.dx * side * setback };
  const yaw = Math.atan2(p.x - origin.x, p.z - origin.z), key2 = "holding-" + String(index + 1).padStart(2, "0");
  const assetId = HOME_IDS2[index % HOME_IDS2.length];
  const use = index % 5 === 0 ? "orchard" : index % 4 === 0 ? "work-yard" : "kitchen-garden";
  const rear = use === "orchard" ? 11 : use === "work-yard" ? 7.5 : 9.2;
  const local = (q) => transformPoint2(q, origin, yaw), gate = { x: p.x - p.dz * side * (route.width / 2 + 0.1), z: p.z + p.dx * side * (route.width / 2 + 0.1) };
  return {
    key: key2,
    stage,
    assetId,
    origin,
    yaw,
    laneKey,
    station,
    side,
    width,
    use,
    roofFootprint: rectangle2(origin.x, origin.z, 7.8, 8.3, yaw),
    polygon: [[-width / 2, 5.8], [width / 2, 5.8], [width / 2, -4.8], [width / 2 - 0.4 - keyedUnit2(key2) * 0.5, -rear - 1.1], [-width / 2 + 0.5, -rear - 1.4], [-width / 2, -5.3]].map(([x, z]) => local({ x, z })),
    garden: { center: local({ x: 0, z: -rear * 0.72 }), width: width - 1.8, depth: use === "work-yard" ? 3.2 : 4.8, yaw },
    gate,
    entrance: local({ x: 0, z: 3.3 }),
    approach: [local({ x: 0, z: 3.3 }), local({ x: 0, z: 5.2 }), gate],
    stableVariant: keyedUnit2(seed2 + ":" + key2),
    source: "detached-reference-holding"
  };
}
function createHamletPlan({ stage = 12, seed: seed2 = "WV-INHABITED-01" } = {}) {
  if (!HAMLET_STAGES2.includes(Number(stage))) throw Error("Hamlet stage must be 4, 12 or 30");
  stage = Number(stage);
  const all = HOLDINGS.map((r, i) => holding(r, i, seed2)), holdings = all.filter((h) => h.stage <= stage);
  const lanes = LANES2.filter((l) => l.stage <= stage).map((l) => ({ ...l, points: l.points.map((p) => ({ ...p })) }));
  const buildings = [
    { key: "barn", assetId: "facility-farm", origin: { x: -45.7, z: -25 }, yaw: 0.1, stage: 4, kind: "farm", yard: rectangle2(-47, -17, 13, 12, 0.1) },
    { key: "smith", assetId: "facility-smith", origin: { x: -49, z: 28 }, yaw: -2, stage: 12, kind: "smith", yard: rectangle2(-49, 24, 13, 13, -0.3) },
    { key: "market", assetId: "facility-market", origin: { x: 0, z: 12.5 }, yaw: Math.PI, stage: 12, kind: "market", yard: rectangle2(0, 10, 11, 5) },
    { key: "grain-store", assetId: "facility-granary", origin: { x: -42, z: -43 }, yaw: 0.15, stage: 12, kind: "granary", yard: rectangle2(-43, -37, 12, 8) },
    { key: "wood-yard", assetId: "facility-lumber", origin: { x: 63, z: -58 }, yaw: -0.5, stage: 30, kind: "lumber", yard: rectangle2(61, -52, 14, 12, -0.5) }
  ].filter((b) => b.stage <= stage);
  const paths = [
    ...holdings.map((h) => ({ key: h.key + ":door", kind: "approach", width: 1.1, points: h.approach })),
    { key: "green-access", kind: "path", width: 1.5, points: [{ x: -9, z: 0 }, { x: -8.5, z: 4.5 }, { x: -7, z: 7.5 }, { x: 0, z: 8 }, { x: 12, z: 1 }] },
    ...buildings.filter((b) => b.kind === "smith").map((b) => ({ key: b.key + ":access", kind: "approach", width: 2.4, points: [{ x: -45, z: 22 }, { x: -45, z: 15 }] })),
    ...buildings.filter((b) => b.kind === "farm").map((b) => ({ key: b.key + ":access", kind: "approach", width: 2.4, points: [{ x: -49, z: -20 }, { x: -52, z: -17 }] })),
    ...buildings.filter((b) => b.kind === "granary").map((b) => ({ key: b.key + ":access", kind: "approach", width: 2.4, points: [{ x: -52, z: -37 }, { x: -50, z: -35 }] })),
    ...buildings.filter((b) => b.kind === "lumber").map((b) => ({ key: b.key + ":access", kind: "approach", width: 2.4, points: [{ x: 56, z: -46 }, { x: 56, z: -48 }] }))
  ];
  paths.push({ key: "field-gate", kind: "path", width: 1.6, points: [{ x: -52, z: -24 }, { x: -61, z: -26 }] });
  const regions = [
    { key: "paddock", kind: "common", polygon: [{ x: -41, z: -14 }, { x: -24, z: -22 }, { x: -17, z: -34 }, { x: -38, z: -39 }] },
    { key: "common", kind: "common", polygon: rectangle2(-1, 6.5, 13, 10.5, -0.08) },
    { key: "barn-field", kind: "field", polygon: [{ x: -78, z: -13 }, { x: -60, z: -15 }, { x: -59, z: -43 }, { x: -77, z: -49 }] },
    { key: "north-field", kind: stage >= 12 ? "field" : "meadow", polygon: [{ x: -39, z: -50 }, { x: -18, z: -57 }, { x: -8, z: -68 }, { x: -38, z: -65 }] }
  ];
  for (const h of holdings) {
    regions.push({ key: h.key + ":holding", kind: "holding", polygon: h.polygon });
    regions.push({ key: h.key + ":yard", kind: "yard", polygon: [[-2, 1.5], [1.7, 1.4], [2, 4.2], [-1.5, 5.1], [-2.4, 3.5]].map(([x, z]) => transformPoint2({ x, z }, h.origin, h.yaw)) });
    regions.push({ key: h.key + ":" + h.use, kind: h.use === "work-yard" ? "yard" : "garden", polygon: rectangle2(h.garden.center.x, h.garden.center.z, h.garden.width, h.garden.depth, h.yaw), holdingKey: h.key });
  }
  for (const b of buildings) regions.push({ key: b.key + ":yard", kind: "work", polygon: b.yard });
  return {
    revision: HAMLET_REVISION,
    status: "gallery-review",
    runtimeReady: false,
    source: "authored reference composition; no simulation state",
    seed: seed2,
    stage,
    width: 180,
    depth: 164,
    holdings,
    buildings,
    lanes,
    paths,
    regions,
    features: [{ key: "shared-well", kind: "well", origin: { x: -6, z: 5 }, yaw: 0.2 }, { key: "green-bench", kind: "bench", origin: { x: 4, z: 8 }, yaw: -0.2 }],
    markers: [{ key: "green", label: "The shared green", x: -2, z: 7 }, { key: "gardens", label: "Household gardens", x: 6, z: -18 }, { key: "farm", label: "Fields & farmyard", x: -54, z: -32 }, { key: "edge", label: "The woodland edge", x: 52, z: -33 }],
    camera: { overview: { x: 0, z: 0, zoom: stage === 30 ? 160 : stage === 4 ? 102 : 124 }, green: { x: 0, z: 8, zoom: 58 }, gardens: { x: 8, z: -11, zoom: 75 }, farm: { x: -48, z: -31, zoom: 82 } }
  };
}
function hamletHeight(x, z) {
  const outer = Math.min(36, Math.max(0, Math.hypot(x * 0.8, z) - 54));
  return 0.32 * Math.sin(x / 33) * Math.cos(z / 31) + 0.12 * Math.cos(z / 19) + outer * outer * 35e-4;
}
function createHamletUseIndex(plan, { cellSize = 8 } = {}) {
  const cells = /* @__PURE__ */ new Map(), shapes = [];
  function add(shape, points, pad = 0) {
    const bounds = { minX: Math.min(...points.map((p) => p.x)) - pad, maxX: Math.max(...points.map((p) => p.x)) + pad, minZ: Math.min(...points.map((p) => p.z)) - pad, maxZ: Math.max(...points.map((p) => p.z)) + pad };
    const item = { ...shape, bounds };
    shapes.push(item);
    for (let x = Math.floor(bounds.minX / cellSize); x <= Math.floor(bounds.maxX / cellSize); x++) for (let z = Math.floor(bounds.minZ / cellSize); z <= Math.floor(bounds.maxZ / cellSize); z++) {
      const key2 = x + ":" + z;
      if (!cells.has(key2)) cells.set(key2, []);
      cells.get(key2).push(item);
    }
  }
  for (const r of plan.regions) add(r, r.polygon, 0.65);
  for (const l of [...plan.lanes, ...plan.paths]) add(l, l.points, l.width / 2 + 0.8);
  const rank = { seat: 9, holding: 1, common: 1, meadow: 1, field: 2, garden: 3, yard: 4, work: 5, path: 6, approach: 7, lane: 8 };
  return { query(x, z) {
    const p = { x, z };
    let kind = "meadow", strength = 0, priority = 0;
    for (const s of cells.get(Math.floor(x / cellSize) + ":" + Math.floor(z / cellSize)) || []) {
      let amount = 0;
      if (s.polygon) amount = s.holes?.some((h) => pointInPolygon(p, h)) ? 0 : pointInPolygon(p, s.polygon) ? 1 : Math.max(0, 1 - Math.min(...s.polygon.map((a, i) => segmentDistance5(p, a, s.polygon[(i + 1) % s.polygon.length]))) / 0.38);
      else {
        const d = lineDistance2(p, s.points);
        amount = Math.max(0, Math.min(1, (s.width / 2 + 0.45 - d) / 0.65));
      }
      if (amount > 0 && (rank[s.kind] > priority || rank[s.kind] === priority && amount > strength)) {
        kind = s.kind;
        strength = amount;
        priority = rank[s.kind] || 0;
      }
    }
    return { kind, strength };
  }, shapes, cells: cells.size };
}
function displayedHamletHeight(x, z) {
  const w = 180 * 2.1, d = 164 * 2.1, nx = 40, nz = 36, sx = w / nx, sz = d / nz;
  const gx = Math.max(0, Math.min(nx, (x + w / 2) / sx)), gz = Math.max(0, Math.min(nz, (z + d / 2) / sz));
  const i = Math.min(nx - 1, Math.floor(gx)), j = Math.min(nz - 1, Math.floor(gz)), u = gx - i, v = gz - j;
  const a = hamletHeight(i * sx - w / 2, j * sz - d / 2), b = hamletHeight((i + 1) * sx - w / 2, j * sz - d / 2), c = hamletHeight((i + 1) * sx - w / 2, (j + 1) * sz - d / 2), e = hamletHeight(i * sx - w / 2, (j + 1) * sz - d / 2);
  return (u + v <= 1 ? a + (b - a) * u + (e - a) * v : c + (e - c) * (1 - u) + (b - c) * (1 - v)) - 0.012;
}
function polygonsOverlap(a, b, margin = 0) {
  for (const p of [a, b]) for (let i = 0; i < p.length; i++) {
    const u = p[i], v = p[(i + 1) % p.length], nx = v.z - u.z, nz = u.x - v.x, pa = a.map((q) => q.x * nx + q.z * nz), pb = b.map((q) => q.x * nx + q.z * nz), pad = margin * Math.hypot(nx, nz);
    if (Math.max(...pa) < Math.min(...pb) + pad || Math.max(...pb) < Math.min(...pa) + pad) return false;
  }
  return true;
}
function laneCorridors(line) {
  return line.points.slice(1).map((b, i) => {
    const a = line.points[i], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), nx = -dz / d * line.width / 2, nz = dx / d * line.width / 2;
    return [{ x: a.x + nx, z: a.z + nz }, { x: b.x + nx, z: b.z + nz }, { x: b.x - nx, z: b.z - nz }, { x: a.x - nx, z: a.z - nz }];
  });
}

// assets/wv/landscape-next/hamlet-scene.mjs?v=plot-aware-1
var base2 = new URL("../assets/wv/landscape-next/", import.meta.url);
var CBASE = new URL("../assets/wv/buildings-next/", import.meta.url);
function grainAt(x, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967296;
}
function smoothNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), a = x - ix, b = z - iz, u = a * a * (3 - 2 * a), v = b * b * (3 - 2 * b);
  return T8.MathUtils.lerp(T8.MathUtils.lerp(grainAt(ix, iz), grainAt(ix + 1, iz), u), T8.MathUtils.lerp(grainAt(ix, iz + 1), grainAt(ix + 1, iz + 1), u), v);
}
var color = (hex) => new T8.Color(hex);
var COLORS = { meadow: color("#829166"), wood: color("#61774f"), lane: color("#ad9c7d"), approach: color("#ab9b7d"), path: color("#a59574"), yard: color("#8c8168"), work: color("#97866a"), garden: color("#869567"), field: color("#a39e66"), common: color("#91a16a"), holding: color("#8a986a"), seat: color("#677054") };
var HAMLET_LIGHT = { revision: "wv006-a-1", sun: "#fff4e5", intensity: 2.1, sky: "#eaf0f3", ground: "#76745f", fill: 1.8 };
var coord = (x, z) => [x * METRES_TO_GAME, displayedHamletHeight(x, z) * METRES_TO_GAME, z * METRES_TO_GAME];
var gamePoint = (p, plan) => ({ x: (p.x + plan.width / 2) * METRES_TO_GAME, z: (p.z + plan.depth / 2) * METRES_TO_GAME });
function resolveHamlet(plan, entries) {
  const catalog = new Map(entries.map((e) => [e.id, e]));
  const entities = [...plan.holdings, ...plan.buildings].map((h) => {
    const e = catalog.get(h.assetId);
    if (!e) throw Error("Missing hamlet model " + h.assetId);
    const footprint2 = rectangle2((e.boundsMin[0] + e.boundsMax[0]) / 2, (e.boundsMin[2] + e.boundsMax[2]) / 2, e.boundsMax[0] - e.boundsMin[0], e.boundsMax[2] - e.boundsMin[2]).map((p) => transformPoint2(p, h.origin, h.yaw));
    const floor = Math.max(...footprint2.map((p) => displayedHamletHeight(p.x, p.z))), threshold = transformPoint2({ x: e.entrances[0].threshold[0], z: e.entrances[0].threshold[2] }, h.origin, h.yaw);
    const entranceExit = transformPoint2({ x: e.entrances[0].threshold[0], z: e.entrances[0].threshold[2] + (h.assetId === "home-porch-cabin" ? 1.6 : 0.55) }, h.origin, h.yaw);
    return { ...h, entry: e, footprint: footprint2, floor, threshold, entranceExit, modelOrigin: [h.origin.x * METRES_TO_GAME, (floor + 0.12) * METRES_TO_GAME, h.origin.z * METRES_TO_GAME], scale: METRES_TO_GAME };
  });
  const paths = plan.paths.filter((p) => !p.key.endsWith(":door") && !p.key.endsWith(":access"));
  for (const b of entities.filter((e) => !e.key.startsWith("holding-") && e.key !== "market")) {
    const marker = b.entry.accessPoints?.find((a) => a.kind === "stair-foot"), start = marker ? transformPoint2({ x: marker.threshold[0] - 0.4, z: marker.threshold[2] }, b.origin, b.yaw) : b.entranceExit;
    let best = null;
    for (const lane3 of plan.lanes) for (let i = 1; i < lane3.points.length; i++) {
      const a = lane3.points[i - 1], c = lane3.points[i], dx = c.x - a.x, dz = c.z - a.z, t = Math.max(0, Math.min(1, ((start.x - a.x) * dx + (start.z - a.z) * dz) / (dx * dx + dz * dz)));
      const p = { x: a.x + dx * t, z: a.z + dz * t }, d = Math.hypot(p.x - start.x, p.z - start.z);
      if (!best || d < best.d) best = { p, d };
    }
    paths.push({ key: b.key + ":access", kind: "approach", width: marker ? 1.3 : 2.4, points: [start, best.p] });
  }
  for (const h of entities.filter((e) => e.key.startsWith("holding-"))) paths.push({ key: h.key + ":door", kind: "approach", width: 1.15, points: [h.threshold, h.entranceExit, h.gate] });
  return { ...plan, paths, entities, regions: [...plan.regions, ...entities.map((e) => ({ key: e.key + ":seat-tone", kind: "seat", polygon: e.footprint }))] };
}
function naturalTrees(plan) {
  const candidates = [{ key: "green-shade", x: (0 + plan.width / 2) * METRES_TO_GAME, z: (26 + plan.depth / 2) * METRES_TO_GAME, h: 7.8 * METRES_TO_GAME }, { key: "croft-shade", x: (-24 + plan.width / 2) * METRES_TO_GAME, z: (-18 + plan.depth / 2) * METRES_TO_GAME, h: 7 * METRES_TO_GAME }];
  const patches = [{ x: 70, z: -28, n: 18, rx: 15, rz: 32 }, { x: -73, z: -54, n: 10, rx: 13, rz: 18 }, { x: 63, z: 65, n: 11, rx: 22, rz: 12 }, { x: -66, z: 53, n: 9, rx: 19, rz: 13 }];
  for (const [k, p] of patches.entries()) for (let i = 0; i < p.n; i++) {
    const a = i * 2.399, r = Math.sqrt((i + 0.5) / p.n), x = p.x + Math.cos(a) * p.rx * r, z = p.z + Math.sin(a) * p.rz * r;
    candidates.push({ key: `retained-edge:${k}:${i}`, x: (x + plan.width / 2) * METRES_TO_GAME, z: (z + plan.depth / 2) * METRES_TO_GAME, h: (7 + keyedUnit2("edge-height" + i + k) * 4) * METRES_TO_GAME });
  }
  return candidates;
}
function landscapeRecords(plan, entries, quality2, distance5, treeCandidates = naturalTrees(plan)) {
  const exclusions = [...plan.entities.map((e) => ({ kind: "structure", polygon: e.footprint.map((p) => gamePoint(p, plan)), radius: 1.1 * METRES_TO_GAME })), ...plan.regions.filter((r) => r.kind !== "meadow").map((r) => ({ kind: r.kind, polygon: r.polygon.map((p) => gamePoint(p, plan)) })), ...[...plan.lanes, ...plan.paths].map((l) => ({ kind: l.kind, points: l.points.map((p) => gamePoint(p, plan)), radius: (l.width / 2 + 0.5) * METRES_TO_GAME }))];
  const result = placeLandscape({
    seed: plan.seed,
    width: plan.width * METRES_TO_GAME,
    depth: plan.depth * METRES_TO_GAME,
    entries,
    quality: quality2,
    distance: distance5,
    treeCandidates,
    exclusions,
    sample: (x, z) => {
      const xx = x / METRES_TO_GAME - plan.width / 2, zz = z / METRES_TO_GAME - plan.depth / 2;
      return { height: displayedHamletHeight(xx, zz) * METRES_TO_GAME, water: null, slope: 0.04, moisture: zz > 55 ? 0.75 : 0.3 };
    },
    coverRegions: [{ key: "west-margins", kind: "woodland", bounds: { minX: 5 * METRES_TO_GAME, minZ: 10 * METRES_TO_GAME, maxX: 29 * METRES_TO_GAME, maxZ: (plan.depth - 12) * METRES_TO_GAME } }, { key: "east-margins", kind: "meadow", bounds: { minX: 151 * METRES_TO_GAME, minZ: 10 * METRES_TO_GAME, maxX: 176 * METRES_TO_GAME, maxZ: (plan.depth - 12) * METRES_TO_GAME } }]
  });
  for (const r of result.instances) if (r.key.startsWith("tree:") && (plan.stage === 30 || Math.hypot(r.origin[0], r.origin[2]) > 72 * METRES_TO_GAME)) r.lod = "far";
  return result;
}
function createGround(plan, index, trees, low) {
  const width = low ? 448 : 896, height = Math.round(width * plan.depth / plan.width), data = new Uint8Array(width * height * 4), c = new T8.Color();
  const bins = /* @__PURE__ */ new Map();
  for (const t of trees) {
    const x = t.origin[0] / METRES_TO_GAME, z = t.origin[2] / METRES_TO_GAME, key2 = Math.floor(x / 10) + ":" + Math.floor(z / 10);
    if (!bins.has(key2)) bins.set(key2, []);
    bins.get(key2).push({ x, z, r: Math.min(3.2, (t.bounds.max[1] - t.bounds.min[1]) / METRES_TO_GAME * 0.3) });
  }
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const x = (i / (width - 1) - 0.5) * plan.width * 2.1, z = (j / (height - 1) - 0.5) * plan.depth * 2.1, land = index.query(x, z), noise2 = grainAt(Math.floor(x * 5), Math.floor(z * 5)) * 2 - 1, broad = smoothNoise(x * 0.08, z * 0.08) * 2 - 1;
    c.copy(COLORS.meadow).lerp(COLORS.wood, Math.max(0, Math.min(0.32, (Math.hypot(x, z) - 47) / 90)));
    if (land.kind !== "meadow") c.lerp(COLORS[land.kind] || COLORS.meadow, land.strength);
    const grain = land.kind === "garden" ? 0.08 : 0.035;
    c.multiplyScalar(0.97 + broad * 0.035 + noise2 * grain);
    for (let bx = Math.floor(x / 10) - 1; bx <= Math.floor(x / 10) + 1; bx++) for (let bz = Math.floor(z / 10) - 1; bz <= Math.floor(z / 10) + 1; bz++) for (const t of bins.get(bx + ":" + bz) || []) {
      const d = Math.hypot(x - t.x - 0.6, z - t.z + 0.3);
      if (d < t.r) c.multiplyScalar(1 - 0.17 * (1 - d / t.r));
    }
    c.convertLinearToSRGB();
    const k = (j * width + i) * 4;
    data[k] = Math.round(T8.MathUtils.clamp(c.r, 0, 1) * 255);
    data[k + 1] = Math.round(T8.MathUtils.clamp(c.g, 0, 1) * 255);
    data[k + 2] = Math.round(T8.MathUtils.clamp(c.b, 0, 1) * 255);
    data[k + 3] = 255;
  }
  const texture = new T8.DataTexture(data, width, height, T8.RGBAFormat);
  texture.colorSpace = T8.SRGBColorSpace;
  texture.magFilter = T8.LinearFilter;
  texture.minFilter = T8.LinearFilter;
  texture.needsUpdate = true;
  texture.flipY = false;
  const nx = 40, nz = 36, g = new T8.PlaneGeometry(plan.width * METRES_TO_GAME * 2.1, plan.depth * METRES_TO_GAME * 2.1, nx, nz);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / METRES_TO_GAME, z = p.getZ(i) / METRES_TO_GAME;
    p.setY(i, (hamletHeight(x, z) - 0.012) * METRES_TO_GAME);
    uv.setXY(i, x / (plan.width * 2.1) + 0.5, z / (plan.depth * 2.1) + 0.5);
  }
  g.computeVertexNormals();
  const material = new T8.MeshStandardMaterial({ map: texture, roughness: 1 }), mesh = new T8.Mesh(g, material);
  return { mesh, texture, geometry: g, material, dispose() {
    texture.dispose();
    g.dispose();
    material.dispose();
  } };
}
function decorativeProps(plan, quality2, distance5) {
  const low = quality2 === "low", rows = [], fences = [], beds = [], add = (kind, key2, p, yaw = 0, scale = 1) => {
    const clearance = { "fruit-tree": 1.35, "wood-stack": 1.05, cart: 1.6, barrel: 0.28, well: 1.05, bench: 0.9 }[kind] || 0.18;
    if (kind !== "person" && blocked(p, clearance)) return;
    rows.push({ kind, key: key2, origin: coord(p.x, p.z), yaw, scale: [METRES_TO_GAME * scale, METRES_TO_GAME * scale, METRES_TO_GAME * scale] });
  };
  const blocked = (p, r = 0.4) => [...plan.lanes, ...plan.paths].some((l) => lineDistance2(p, l.points) < l.width / 2 + r) || plan.entities.some((e) => pointInPolygon(p, e.footprint) || e.footprint.some((a, i) => segmentDistance5(p, a, e.footprint[(i + 1) % e.footprint.length]) < r));
  const plots = [...plan.holdings.map((h) => {
    const inverse = (p) => transformPoint2({ x: p.x - h.origin.x, z: p.z - h.origin.z }, { x: 0, z: 0 }, -h.yaw);
    const fenceEdges = plan.isPlotStudy ? void 0 : h.polygon.map((a, i) => [a, h.polygon[(i + 1) % h.polygon.length]]).filter(([a, b]) => {
      const c = inverse({ x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 });
      return c.z < -3 || c.x > 1 && Number(h.key.slice(-2)) % 3 !== 0;
    });
    return { ...h, kind: "home", establishedAt: h.establishedAt ?? h.stage, fenceEdges, gates: [{ point: h.gate, width: 1.5 }], plantingPolygon: rectangle2(h.garden.center.x, h.garden.center.z, h.garden.width, h.garden.depth, h.garden.yaw), fenceKind: h.use === "orchard" ? "fence-rail" : "fence-wattle" };
  }), ...plan.regions.filter((r) => r.key === "paddock" || r.kind === "field").map((r) => ({ ...r, kind: "field", planting: r.key !== "paddock" }))];
  const exclusions = [...plan.entities.map((e) => ({ kind: "structure", polygon: e.footprint })), ...[...plan.lanes, ...plan.paths].map((l) => ({ kind: l.kind, points: l.points, radius: l.width / 2 }))];
  const dressing = dressPlots({ seed: plan.seed, plots, existingFences: plan.existingFences || [], exclusions, sample: (x, z) => ({ height: displayedHamletHeight(x, z), water: null, slope: 0.04 }), quality: quality2, distance: distance5, omitSmallPlants: low && plan.stage === 30 });
  for (const r of dressing.props) rows.push({ ...r, origin: r.origin.map((v) => v * METRES_TO_GAME), scale: [METRES_TO_GAME * r.scale, METRES_TO_GAME * r.scale, METRES_TO_GAME * r.scale] });
  beds.push(...dressing.beds);
  fences.push(...dressing.boundaries.fences);
  if (plan.isPlotStudy) {
    for (const [i, p] of [{ x: -11, z: 15.4 }, { x: 17, z: 14 }].entries()) add("person", "reference-person:" + i, p, i);
    return { records: rows, fences, beds, dressing };
  }
  for (const f of plan.features) add(f.kind, f.key, f.origin, f.yaw);
  const people = [{ x: -8, z: 1 }, { x: 1, z: 5 }, { x: 14, z: 4 }, { x: -36, z: 9 }, { x: 24, z: 18 }, { x: -52, z: -16 }];
  for (const [i, p] of people.slice(0, plan.stage === 4 || low && plan.stage === 30 ? 3 : 6).entries()) add("person", "reference-person:" + i, p, i * 0.9);
  if (plan.stage >= 12) {
    add("cart", "smith-cart", { x: -53, z: 33 }, 0.5);
    add("wood-stack", "smith-fuel", { x: -51, z: 24 }, 1.1);
    add("barrel", "market-barrel", { x: 5, z: 11 }, 0.2);
  }
  for (const [i, p] of [{ x: -43, z: -19 }, { x: -45, z: -19 }].entries()) add("grain-sheaf", "barn-sheaf:" + i, p, i);
  return { records: rows, fences, beds, dressing };
}
function groundBedMesh(beds) {
  const positions = [], colors2 = [], n = color("#726043");
  for (const bed of beds) for (let i = 1; i < bed.polygon.length - 1; i++) for (const p of [bed.polygon[0], bed.polygon[i], bed.polygon[i + 1]]) {
    positions.push(p.x * METRES_TO_GAME, (displayedHamletHeight(p.x, p.z) + 0.025) * METRES_TO_GAME, p.z * METRES_TO_GAME);
    colors2.push(...n.toArray());
  }
  const g = new T8.BufferGeometry();
  g.setAttribute("position", new T8.Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new T8.Float32BufferAttribute(colors2, 3));
  g.computeVertexNormals();
  return new T8.Mesh(g, new T8.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: T8.DoubleSide }));
}
function footings(plan) {
  const group = new T8.Group(), material = new T8.MeshStandardMaterial({ color: "#8b8470", roughness: 1 }), parts = [];
  for (const e of plan.entities) {
    if (e.entry.supportPoints?.length) {
      for (const support of e.entry.supportPoints) {
        const pt = support.contact || support.point, p = transformPoint2({ x: pt[0], z: pt[2] }, e.origin, e.yaw), bottom = displayedHamletHeight(p.x, p.z) - 0.03, top = e.floor + 0.05, h = top - bottom;
        if (h <= 0) continue;
        const geo = new T8.CylinderGeometry(0.15 * METRES_TO_GAME, 0.18 * METRES_TO_GAME, h * METRES_TO_GAME, 5).translate(p.x * METRES_TO_GAME, (top + bottom) / 2 * METRES_TO_GAME, p.z * METRES_TO_GAME);
        parts.push(geo);
      }
    } else for (const s of e.entry.structuralSeats || []) {
      const xs = s.polygon.map((p2) => p2[0]), zs = s.polygon.map((p2) => p2[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2, p = transformPoint2({ x: cx, z: cz }, e.origin, e.yaw), bottom = Math.min(...e.footprint.map((q) => displayedHamletHeight(q.x, q.z))) - 0.04, top = e.floor + 0.08;
      const geo = new T8.BoxGeometry((Math.max(...xs) - Math.min(...xs)) * METRES_TO_GAME, (top - bottom) * METRES_TO_GAME, (Math.max(...zs) - Math.min(...zs)) * METRES_TO_GAME).rotateY(e.yaw).translate(p.x * METRES_TO_GAME, (top + bottom) / 2 * METRES_TO_GAME, p.z * METRES_TO_GAME);
      parts.push(geo);
    }
  }
  const g = new T8.BufferGeometry();
  for (const name of ["position", "normal"]) {
    const array = [];
    for (const part of parts) {
      const p = part.index ? part.toNonIndexed() : part;
      array.push(...p.attributes[name].array);
      if (p !== part) p.dispose();
    }
    g.setAttribute(name, new T8.Float32BufferAttribute(array, 3));
  }
  for (const p of parts) p.dispose();
  group.add(new T8.Mesh(g, material));
  return { group, dispose() {
    g.dispose();
    material.dispose();
  } };
}
async function loadHamletLibrary() {
  const loader = new T8.GLTFLoader(), disposeResources = createResourceDisposer();
  const metadata = await Promise.all([fetch(new URL("manifest.json?v=inhabited-1", CBASE), { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw Error("Building catalog unavailable");
    return r.json();
  }), fetch(new URL("manifest.json?v=inhabited-1", base2), { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw Error("Landscape manifest unavailable");
    return r.json();
  })]);
  const [architecture, landscape] = metadata;
  const loading = [loader.loadAsync(new URL("catalog.glb?v=" + architecture.output.sha256, CBASE).href), loader.loadAsync(new URL("landscape.glb?v=" + landscape.output.sha256, base2).href)];
  let loaded2;
  try {
    loaded2 = await Promise.all(loading);
  } catch (error) {
    void Promise.allSettled(loading).then((results) => {
      for (const r of results) if (r.status === "fulfilled" && r.value?.scene) disposeResources(r.value.scene);
    });
    throw error;
  }
  const [buildingGLTF, natureGLTF] = loaded2;
  const finalPlan = resolveHamlet(createHamletPlan({ stage: 30 }), architecture.entries), reservedKeys = new Set(landscapeRecords(finalPlan, landscape.entries, "normal", "far").instances.map((r) => r.key)), inheritedTrees = naturalTrees(finalPlan).filter((t) => reservedKeys.has("tree:" + t.key));
  const landscapeLibrary = createLandscapeLibrary(natureGLTF.scene), propsNormal = createHamletProps(), propsLow = createHamletProps({ low: true }), fenceLibrary = createPlotFenceLibrary();
  let disposed = false;
  return { architecture, build({ stage = 12, quality: quality2 = "normal", distance: distance5 = "near", study: study2 = false } = {}) {
    if (disposed) throw Error("Hamlet library disposed");
    const plan = resolveHamlet(study2 ? createPlotStudyPlan() : createHamletPlan({ stage }), architecture.entries), index = createHamletUseIndex(plan), group = new T8.Group(), objects = [];
    stage = plan.stage;
    for (const e of plan.entities) {
      const source = buildingGLTF.scene.getObjectByName(quality2 === "low" || distance5 === "far" || stage === 30 ? e.entry.lowNode : e.entry.normalNode);
      if (!source) throw Error("Missing model " + e.assetId);
      const model = source.clone(true);
      if (quality2 === "low" && stage === 30) model.traverse((n) => {
        if (n.userData?.category === "detail" || n.userData?.optional) n.visible = false;
      });
      model.position.set(...e.modelOrigin);
      model.rotation.y = e.yaw;
      model.scale.setScalar(METRES_TO_GAME);
      objects.push({ scene: model, entityKey: e.key });
    }
    const buildingBatches = buildSceneBatches(objects);
    for (const b of buildingBatches) group.add(b);
    const nature = landscapeRecords(plan, landscape.entries, quality2, distance5, inheritedTrees), natureBatches = landscapeLibrary.build(nature.instances);
    group.add(natureBatches.group);
    const dressing = decorativeProps(plan, quality2, distance5), propLibrary = quality2 === "low" ? propsLow : propsNormal, propBatches = propLibrary.build(dressing.records);
    group.add(propBatches.group);
    const fenceView = fenceLibrary.build(dressing.fences, { sample: (x, z) => ({ height: displayedHamletHeight(x, z) }), quality: distance5 === "far" ? "low" : quality2 });
    group.add(fenceView.group);
    const beds = groundBedMesh(dressing.beds);
    group.add(beds);
    const feet = footings(plan);
    group.add(feet.group);
    const ground = createGround(plan, index, nature.instances.filter((r) => r.key.startsWith("tree:")), quality2 === "low");
    group.add(ground.mesh);
    let released = false;
    return {
      group,
      plan,
      nature: nature.instances,
      groundMesh: ground.mesh,
      props: dressing.records,
      plotDressing: dressing.dressing,
      fenceContacts: fenceView.contacts,
      sourceMeasurements: () => propLibrary.measurements(),
      stats: () => ({ stage, homes: plan.holdings.length, workplaces: plan.buildings.length, lanes: plan.lanes.length, landUseRegions: plan.regions.length, plantAndPropInstances: dressing.records.length, landscapeInstances: nature.instances.length, landscapeBatches: natureBatches.group.children.length, propBatches: propBatches.group.children.length, surfaceTextureBytes: ground.texture.image.data.byteLength, architectureLOD: quality2 === "low" || distance5 === "far" || stage === 30 ? "low" : "normal", plotStatistics: dressing.dressing.plotStats, sharedBoundaries: dressing.fences.filter((f) => f.users.length > 1).length, reusedBoundaries: dressing.fences.filter((f) => f.source === "existing").length, fenceStats: fenceView.stats, runtimeReady: false, ...estimateSceneBytes(group) }),
      inspectGround() {
        group.updateMatrixWorld(true);
        const ray = new T8.Raycaster(), issues = [];
        for (const r of new Map(nature.instances.map((r2) => [r2.assetId, r2])).values()) for (const p of r.groundContact.points) {
          ray.set(new T8.Vector3(p.x - plan.width * METRES_TO_GAME / 2, p.height + 150, p.z - plan.depth * METRES_TO_GAME / 2), new T8.Vector3(0, -1, 0));
          const hit = ray.intersectObject(ground.mesh, false)[0];
          if (!hit || Math.abs(hit.point.y - p.height) > 2e-3) issues.push({ key: r.key, error: hit ? hit.point.y - p.height : null });
        }
        for (const r of new Map(dressing.records.map((r2) => [r2.kind, r2])).values()) for (const p of r.groundContact?.points || [{ x: r.origin[0] / METRES_TO_GAME, z: r.origin[2] / METRES_TO_GAME, height: r.origin[1] / METRES_TO_GAME }]) {
          ray.set(new T8.Vector3(p.x * METRES_TO_GAME, p.height * METRES_TO_GAME + 150, p.z * METRES_TO_GAME), new T8.Vector3(0, -1, 0));
          const hit = ray.intersectObject(ground.mesh, false)[0];
          if (!hit || Math.abs(hit.point.y - p.height * METRES_TO_GAME) > 2e-3) issues.push({ key: r.key, error: hit ? hit.point.y - p.height * METRES_TO_GAME : null });
        }
        for (let i = 0; i < fenceView.contacts.length; i += Math.max(1, Math.ceil(fenceView.contacts.length / 64))) {
          const p = fenceView.contacts[i];
          ray.set(new T8.Vector3(p.x * METRES_TO_GAME, p.height * METRES_TO_GAME + 150, p.z * METRES_TO_GAME), new T8.Vector3(0, -1, 0));
          const hit = ray.intersectObject(ground.mesh, false)[0];
          if (!hit || Math.abs(hit.point.y - p.height * METRES_TO_GAME) > 2e-3) issues.push({ key: p.key, type: "fence-contact" });
        }
        return issues;
      },
      inspect() {
        const issues = [];
        for (let i = 0; i < plan.entities.length; i++) {
          const e = plan.entities[i];
          for (const b of plan.entities.slice(i + 1)) if (polygonsOverlap(e.footprint, b.footprint, 0.01)) issues.push({ key: e.key, type: "roof-overlap", other: b.key });
          for (const l of plan.lanes) if (laneCorridors(l).some((poly) => polygonsOverlap(e.footprint, poly, 0.01))) issues.push({ key: e.key, type: "lane-overlap", lane: l.key });
        }
        for (const f of dressing.fences) {
          for (const l of [...plan.lanes, ...plan.paths]) if (l.points.slice(1).some((p, i) => capsuleRanges(f.a, f.b, l.points[i], p, l.width / 2).length)) issues.push({ key: f.key, type: "blocked-route", route: l.key });
        }
        return issues;
      },
      dispose() {
        if (released) return;
        released = true;
        group.removeFromParent();
        for (const b of buildingBatches) b.dispose();
        natureBatches.dispose();
        propBatches.dispose();
        fenceView.dispose();
        beds.geometry.dispose();
        beds.material.dispose();
        feet.dispose();
        ground.dispose();
        group.clear();
      }
    };
  }, dispose() {
    if (disposed) return;
    disposed = true;
    landscapeLibrary.dispose();
    propsNormal.dispose();
    propsLow.dispose();
    fenceLibrary.dispose();
    disposeResources(buildingGLTF.scene);
  } };
}

// environment-next/meadow-layer.mjs
import * as T9 from "../assets/vendor/three.module.mjs";
var MEADOW_PALETTE = Object.freeze({ meadow: "#789f40", light: "#adc05c", wood: "#688b37", lane: "#ceb17a", approach: "#ceb17a", path: "#c8ad78", yard: "#b5a075", work: "#b9a074", garden: "#779941", field: "#b9ad68", common: "#91ad47", holding: "#86a243", seat: "#8e9262", root: "#5c7e2d", tip: "#b0c65c" });
var unit = (seed2, x, z, suffix = "") => keyedUnit2(`${seed2}:${x}:${z}:${suffix}`);
function smooth2(seed2, x, z) {
  const i = Math.floor(x), j = Math.floor(z), a = x - i, b = z - j, u = a * a * (3 - 2 * a), v = b * b * (3 - 2 * b), mix2 = (a2, b2, t) => a2 + (b2 - a2) * t;
  return mix2(mix2(unit(seed2, i, j), unit(seed2, i + 1, j), u), mix2(unit(seed2, i, j + 1), unit(seed2, i + 1, j + 1), u), v);
}
function meadowRecords(plan, { seed: seed2 = "WV-MEADOW", low = false } = {}) {
  const index = createHamletUseIndex(plan), paths = [...plan.lanes, ...plan.paths], records = [];
  for (let ix = -39; ix <= 18; ix++) for (let iz = -18; iz <= 38; iz++) {
    const x = ix * 1.05 + (unit(seed2, ix, iz, "x") - 0.5) * 0.95, z = iz * 1.05 + (unit(seed2, ix, iz, "z") - 0.5) * 0.95;
    const p = { x, z }, kind = index.query(x, z).kind;
    if (!["meadow", "common", "holding"].includes(kind)) continue;
    const scale = 0.45 + unit(seed2, ix, iz, "height") * 0.7, radius = 0.68 * scale;
    if (paths.some((l) => lineDistance2(p, l.points) < l.width / 2 + radius + 0.04) || plan.entities.some((e) => pointInPolygon(p, e.footprint) || e.footprint.some((a, i) => lineDistance2(p, [a, e.footprint[(i + 1) % e.footprint.length]]) < radius + 0.08))) continue;
    const patch = smooth2(seed2, x * 0.055, z * 0.055);
    if (unit(seed2, ix, iz, "gap") > 0.7 + patch * 0.29) continue;
    const heights = [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]].map(([dx, dz]) => displayedHamletHeight(x + dx, z + dz) * METRES_TO_GAME), spread = Math.max(...heights) - Math.min(...heights);
    if (spread > 0.16) continue;
    records.push({ key: `meadow:${ix}:${iz}`, x, z, scale: scale * METRES_TO_GAME, yaw: unit(seed2, ix, iz, "yaw") * Math.PI * 2, y: heights[0], slopeX: (displayedHamletHeight(x + 0.2, z) - displayedHamletHeight(x - 0.2, z)) / 0.4, slopeZ: (displayedHamletHeight(x, z + 0.2) - displayedHamletHeight(x, z - 0.2)) / 0.4, maxGap: spread, brightness: 0.88 + unit(seed2, ix, iz, "shade") * 0.24, rank: unit(seed2, ix, iz, "rank") });
  }
  const normal = records.sort((a, b) => a.rank - b.rank).slice(0, 1900);
  return low ? normal.filter((r) => unit(seed2, r.x, r.z, "low") < 0.33).slice(0, 850) : normal;
}
function colourField(plan, trees, seed2, low) {
  const width = low ? 448 : 896, height = Math.round(width * plan.depth / plan.width), data = new Uint8Array(width * height * 4), index = createHamletUseIndex(plan), colors2 = Object.fromEntries(Object.entries(MEADOW_PALETTE).map(([k, v]) => [k, new T9.Color(v)])), c = new T9.Color(), bins = /* @__PURE__ */ new Map();
  for (const t of trees) {
    const x = t.origin[0] / METRES_TO_GAME, z = t.origin[2] / METRES_TO_GAME, k = Math.floor(x / 10) + ":" + Math.floor(z / 10);
    if (!bins.has(k)) bins.set(k, []);
    bins.get(k).push({ x, z, r: Math.min(3.2, (t.bounds.max[1] - t.bounds.min[1]) / METRES_TO_GAME * 0.3) });
  }
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const x = (i / (width - 1) - 0.5) * plan.width * 2.1, z = (j / (height - 1) - 0.5) * plan.depth * 2.1, land = index.query(x, z), broad = smooth2(seed2, x * 0.042, z * 0.042), grain = unit(seed2, Math.floor(x * 3), Math.floor(z * 3));
    c.copy(colors2.meadow).lerp(colors2.light, broad);
    if (land.kind !== "meadow") c.lerp(colors2[land.kind] || colors2.meadow, land.strength);
    c.multiplyScalar(0.98 + (grain - 0.5) * 0.1);
    for (let bx = Math.floor(x / 10) - 1; bx <= Math.floor(x / 10) + 1; bx++) for (let bz = Math.floor(z / 10) - 1; bz <= Math.floor(z / 10) + 1; bz++) for (const t of bins.get(bx + ":" + bz) || []) {
      const d = Math.hypot(x - t.x - 0.6, z - t.z + 0.3);
      if (d < t.r) c.multiplyScalar(1 - 0.15 * (1 - d / t.r));
    }
    c.convertLinearToSRGB();
    const k = (j * width + i) * 4;
    data[k] = Math.round(T9.MathUtils.clamp(c.r, 0, 1) * 255);
    data[k + 1] = Math.round(T9.MathUtils.clamp(c.g, 0, 1) * 255);
    data[k + 2] = Math.round(T9.MathUtils.clamp(c.b, 0, 1) * 255);
    data[k + 3] = 255;
  }
  const texture = new T9.DataTexture(data, width, height);
  texture.colorSpace = T9.SRGBColorSpace;
  texture.minFilter = texture.magFilter = T9.LinearFilter;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}
function grassSurfaceGeometry(low = false) {
  const positions = [], indices = [], blades = low ? 5 : 19, levels = low ? [0, 0.65, 1] : [0, 0.45, 0.78, 1];
  for (let b = 0; b < blades; b++) {
    const angle = unit("blade", b, 0) * Math.PI * 2, radius = Math.sqrt(unit("blade", b, 1)) * 0.3, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius, yaw = unit("blade", b, 2) * Math.PI * 2, height = 0.28 + unit("blade", b, 3) * 0.2, width = 0.024 + unit("blade", b, 4) * 0.031, bend = 0.045 + unit("blade", b, 5) * 0.09, base3 = positions.length / 3;
    for (let j = 0; j < levels.length; j++) {
      const t = levels[j], cx = x + Math.cos(yaw) * bend * t * t, cz = z + Math.sin(yaw) * bend * t * t, w = width * (1 - t) * 0.5;
      if (t === 1) positions.push(cx, height, cz);
      else for (const side of [-1, 1]) positions.push(cx + Math.sin(yaw) * w * side, t * height, cz - Math.cos(yaw) * w * side);
    }
    for (let j = 0; j < levels.length - 2; j++) {
      const k2 = base3 + j * 2;
      indices.push(k2, k2 + 1, k2 + 2, k2 + 1, k2 + 3, k2 + 2);
    }
    const k = base3 + (levels.length - 2) * 2;
    indices.push(k, k + 1, k + 2);
  }
  const geometry = new T9.BufferGeometry();
  geometry.setAttribute("position", new T9.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
function grassMaterial() {
  return new T9.ShaderMaterial({ side: T9.DoubleSide, fog: true, uniforms: T9.UniformsUtils.merge([T9.UniformsLib.fog, { root: { value: new T9.Color(MEADOW_PALETTE.root) }, tip: { value: new T9.Color(MEADOW_PALETTE.tip) }, sun: { value: new T9.Vector3(-0.4, 0.86, 0.25).normalize() } }]), vertexShader: `varying float vHeight;varying vec3 vNormal;varying vec3 vTint;
 #include <fog_pars_vertex>
 void main(){vHeight=clamp(position.y/.48,0.,1.);vTint=vec3(1.);
 #ifdef USE_INSTANCING_COLOR
 vTint=instanceColor;
 #endif
 vec4 p=vec4(position,1.);vec3 n=normal;
 #ifdef USE_INSTANCING
 p=instanceMatrix*p;n=mat3(instanceMatrix)*n;
 #endif
 vNormal=normalize(mat3(modelMatrix)*n);vec4 mvPosition=modelViewMatrix*p;gl_Position=projectionMatrix*mvPosition;
 #include <fog_vertex>
 }`, fragmentShader: `uniform vec3 root;uniform vec3 tip;uniform vec3 sun;varying float vHeight;varying vec3 vNormal;varying vec3 vTint;
 #include <fog_pars_fragment>
 void main(){float light=.79+.21*abs(dot(normalize(vNormal),sun));gl_FragColor=vec4(mix(root,tip,smoothstep(0.,1.,vHeight))*vTint*light,1.);
 #include <fog_fragment>
 #include <colorspace_fragment>
 }` });
}
function attachMeadowLayer(component, { low = false, seed: seed2 = "WV-MEADOW", look = "meadow", grass = true } = {}) {
  const snapshot = JSON.stringify(component.plan), records = meadowRecords(component.plan, { seed: seed2, low }), geometry = grassSurfaceGeometry(low), muted = new T9.MeshStandardMaterial({ color: "#829452", roughness: 1, side: T9.DoubleSide });
  const texture = colourField(component.plan, component.nature.filter((r) => r.key.startsWith("tree:")), seed2, low), original = component.groundMesh.material, material = new T9.MeshStandardMaterial({ map: texture, roughness: 1, metalness: 0 }), blades = grassMaterial();
  const mesh = new T9.InstancedMesh(geometry, blades, records.length), matrix = new T9.Matrix4(), q = new T9.Quaternion(), up = new T9.Vector3(0, 1, 0), color2 = new T9.Color();
  records.forEach((r, i) => {
    matrix.compose(new T9.Vector3(r.x * METRES_TO_GAME, r.y, r.z * METRES_TO_GAME), q.setFromUnitVectors(up, new T9.Vector3(-r.slopeX, 1, -r.slopeZ).normalize()).multiply(new T9.Quaternion().setFromAxisAngle(up, r.yaw)), new T9.Vector3().setScalar(r.scale));
    mesh.setMatrixAt(i, matrix);
    color2.setRGB(r.brightness, r.brightness, r.brightness);
    mesh.setColorAt(i, color2);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  component.group.add(mesh);
  let disposed = false, current = look;
  const setLook = (value) => {
    if (disposed) return;
    current = value;
    component.groundMesh.material = value === "context" ? original : material;
    mesh.material = value === "context" ? muted : blades;
  };
  setLook(look);
  mesh.visible = grass;
  return {
    setLook,
    setGrass(value) {
      mesh.visible = Boolean(value);
    },
    pause() {
    },
    advance() {
    },
    records,
    status: () => ({ meadowBuilds: 1, meadowInstances: records.length, meadowTriangles: records.length * (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3, meadowTextureBytes: texture.image.data.byteLength, meadowLook: current, meadowGrassVisible: mesh.visible, borrowedGrassGeometry: false, planUnchanged: JSON.stringify(component.plan) === snapshot, disposed, runtimeReady: false }),
    dispose() {
      if (disposed) return;
      disposed = true;
      if (component.groundMesh.material === material) component.groundMesh.material = original;
      mesh.removeFromParent();
      mesh.dispose();
      geometry.dispose();
      muted.dispose();
      blades.dispose();
      material.dispose();
      texture.dispose();
    }
  };
}

// environment-next/meadow-study.mjs
async function mountMeadowStudy(canvas, { low = false, seed: seed2 = "WV-MEADOW", look = "meadow", grass = true, signal } = {}) {
  const renderer = new T10.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.outputColorSpace = T10.SRGBColorSpace;
  const scene = new T10.Scene();
  scene.background = new T10.Color("#bedde9");
  scene.fog = new T10.Fog("#bedde9", 1850, 2700);
  const camera = new T10.OrthographicCamera(-1, 1, 1, -1, 0.1, 4e3);
  const sun = new T10.DirectionalLight(HAMLET_LIGHT.sun, HAMLET_LIGHT.intensity);
  sun.position.set(-40, 86, 25);
  scene.add(sun, new T10.HemisphereLight(HAMLET_LIGHT.sky, HAMLET_LIGHT.ground, HAMLET_LIGHT.fill));
  let library, component, layer, controller, releaseInspection = () => {
  }, disposed = false, draws = 0;
  const ready = loadHamletLibrary();
  const abort = () => {
    if (controller) controller.dispose();
    else {
      disposed = true;
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    library = await ready;
    if (disposed || signal?.aborted) {
      library.dispose();
      throw new DOMException("Disposed before model load", "AbortError");
    }
    component = library.build({ stage: 4, quality: low ? "low" : "normal", distance: "near" });
    scene.add(component.group);
    layer = attachMeadowLayer(component, { low, seed: seed2, look, grass });
    const width = component.plan.width * METRES_TO_GAME * 2.1, depth = component.plan.depth * METRES_TO_GAME * 2.1, world = { width, depth, trees: [], options: { size: "small", seed: seed2 }, sample: (x, z) => ({ height: displayedHamletHeight((x - width / 2) / METRES_TO_GAME, (z - depth / 2) / METRES_TO_GAME) * METRES_TO_GAME, water: null }), slope: () => 0.04 };
    const backend = { upload() {
    }, setTerrain() {
    }, setSettlement() {
      return { houses: /* @__PURE__ */ new Map(), buildings: /* @__PURE__ */ new Map(), cropRows: [] };
    }, draw(view, rect) {
      if (disposed || document.hidden) return;
      const aspect = rect.width / rect.height;
      camera.left = -view.zoom * aspect;
      camera.right = view.zoom * aspect;
      camera.top = view.zoom;
      camera.bottom = -view.zoom;
      const target = new T10.Vector3(view.focusX, view.focusY ?? 10, view.focusZ);
      camera.position.copy(target).add(new T10.Vector3(-Math.sin(view.yaw) * Math.cos(view.pitch), Math.sin(view.pitch), Math.cos(view.yaw) * Math.cos(view.pitch)).multiplyScalar(1600));
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, low ? 1 : 1.5));
      renderer.setSize(rect.width, rect.height, false);
      renderer.render(scene, camera);
      draws++;
    }, screenToWorld: () => null, assetStatus: () => ({ ready: true, draws, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, quality: low ? "low" : "normal", ...estimateSceneBytes(scene), ...layer.status() }), dispose() {
      if (disposed) return;
      disposed = true;
      signal?.removeEventListener("abort", abort);
      releaseInspection();
      layer.dispose();
      component.dispose();
      library.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    } };
    controller = mountWorld3D(canvas, world, { quality: low ? "lite" : "game", presentation: backend });
    releaseInspection = attachInspectionControls(canvas, controller, world);
    const focus = (x, z, zoom, pitch = 0.65) => {
      controller.focusOn(width / 2 + x * METRES_TO_GAME, depth / 2 + z * METRES_TO_GAME);
      controller.setCamera({ ...controller.getCamera(), zoom, pitch, yaw: 0.63, focusY: 10 });
    };
    const views = { detail: () => focus(-20, 4, 30, 0.5), ground: () => focus(-8, 14, 12, 0.6), near: () => focus(-20, 4, 65, 0.7), wide: () => focus(0, 0, 245, 0.85), forest: () => focus(-50, -15, 115, 0.5), junction: () => focus(-20, 5, 75, 0.75), lowpitch: () => controller.setCamera({ ...controller.getCamera(), pitch: 0.4 }), highpitch: () => controller.setCamera({ ...controller.getCamera(), pitch: 1.25 }) };
    views.detail();
    let measuring = false;
    async function measure(duration = 8, warmup = 2) {
      if (measuring) throw Error("Already measuring");
      measuring = true;
      const initial = controller.getCamera(), frames = [], stats = [];
      let start = performance.now(), previous2 = null;
      await new Promise((resolve) => {
        const tick = (now) => {
          if (disposed || document.hidden) {
            resolve();
            return;
          }
          const sec = (now - start) / 1e3;
          controller.setCamera({ ...initial, yaw: initial.yaw + Math.sin(sec * 0.18) * 0.3, pitch: initial.pitch + Math.sin(sec * 0.1) * 0.1 });
          if (sec >= warmup && previous2 !== null) {
            frames.push(now - previous2);
            stats.push(backend.assetStatus());
          }
          previous2 = now;
          if (sec < duration + warmup) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      measuring = false;
      controller.setCamera(initial);
      const sorted = frames.sort((a, b) => a - b), p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))], peak = (k) => Math.max(0, ...stats.map((s) => s[k] || 0)), gl = renderer.getContext(), ext = gl.getExtension("WEBGL_debug_renderer_info");
      return { seed: seed2, quality: low ? "low" : "normal", look: layer.status().meadowLook, grass: layer.status().meadowGrassVisible, scene: "unchanged B/C four-home context", initialCamera: initial, cameraPath: "meadow-orbit-v1", viewport: { width: canvas.clientWidth, height: canvas.clientHeight }, devicePixelRatio, renderDPR: Math.min(devicePixelRatio, low ? 1 : 1.5), warmupSeconds: warmup, durationSeconds: duration, frameCount: frames.length, medianMs: p(0.5), p95Ms: p(0.95), p99Ms: p(0.99), peakDrawCalls: peak("drawCalls"), peakTriangles: peak("triangles"), textureBytes: peak("textureBytes"), geometryBytes: peak("geometryBytes"), meadowInstances: layer.status().meadowInstances, meadowTextureBytes: layer.status().meadowTextureBytes, renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), shadows: false, phonePerformanceVerified: false, serializationUnchanged: layer.status().planUnchanged };
    }
    return { viewer: controller, component, world, views, measure, setLook(value) {
      layer.setLook(value);
      controller.render();
    }, setGrass(value) {
      layer.setGrass(value);
      controller.render();
    }, inspectGround: () => component.inspectGround(), serializationUnchanged: () => layer.status().planUnchanged, dispose: () => controller.dispose() };
  } catch (error) {
    signal?.removeEventListener("abort", abort);
    layer?.dispose();
    component?.dispose();
    library?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  }
}

// environment-next/review-page.mjs
var params = new URLSearchParams(location.search);
var $ = (id) => document.getElementById(id);
var seed = params.get("seed") || "WILLOW-1048";
var quality = params.get("quality") || "normal";
var study = params.get("count") === "study";
var count = Number(params.get("count")) || 0;
var baseline = params.get("treatment") === "before";
var previous = !params.has("treatment") || params.get("treatment") === "previous";
for (const [id, value] of Object.entries({ seed, quality, count: study ? "study" : String(count), treatment: baseline ? "before" : previous ? "previous" : "after" })) $(id).value = value;
if (study) {
  $("junction").textContent = "Village paths";
  $("wide").textContent = "Village overview";
  $("near").textContent = "Town zoom";
  $("seed").closest("label").firstChild.textContent = "Grass seed";
  $("treatment").closest("label").hidden = true;
  $("study-controls").hidden = false;
  $("study-look").value = params.get("look") || "meadow";
  $("study-grass").checked = params.get("grass") !== "off";
  document.querySelector("h1").textContent = "A sunlit meadow study.";
  $("intro").textContent = "Brighter greens, warm footpaths and individual grass clumps. This small study borrows the existing village context; it does not change the game.";
  const cancellation = new AbortController();
  window.addEventListener("pagehide", () => cancellation.abort(), { once: true });
  try {
    const h = await mountMeadowStudy($("environment"), { low: quality === "low", seed, look: $("study-look").value, grass: $("study-grass").checked, signal: cancellation.signal });
    window.meadowHarness = h;
    for (const id of ["detail", "ground", "wide", "near", "lowpitch", "highpitch", "forest", "junction", "cliff", "lake", "river"]) {
      if (h.views[id]) $(id).onclick = h.views[id];
      else $(id).hidden = true;
    }
    (h.views[params.get("view")] || h.views.detail)();
    $("study-look").onchange = () => h.setLook($("study-look").value);
    $("study-grass").onchange = () => h.setGrass($("study-grass").checked);
    $("status").textContent = "Meadow study ready \xB7 four-home visual context \xB7 " + quality;
    $("scope").textContent = "The building, planting and layout sources are unchanged committed B/C study assets. Only the meadow surface and additional instanced grass layer are A\u2019s study. There is no new functional building, road, simulation or saved state.";
    $("run").hidden = true;
    $("record").textContent = JSON.stringify(h.viewer.assetStatus(), null, 2);
    window.addEventListener("pagehide", () => h.dispose(), { once: true });
  } catch (e) {
    if (!cancellation.signal.aborted) $("status").textContent = "Meadow study unavailable: " + e.message;
  }
  for (const id of ["seed", "quality", "count"]) $(id).onchange = () => {
    params.set(id, $(id).value);
    params.delete("camera");
    location.search = params;
  };
} else {
  let focus = function(x, y, zoom, pitch = 0.65) {
    viewer.focusOn(x, y, zoom);
    viewer.setCamera({ ...viewer.getCamera(), pitch, yaw: 0.6, focusY: 17 });
  };
  const fixture = count ? settlementRenderFixture(count) : null, world = fixture?.world || createWorld({ seed, size: "small", lakes: 2, rivers: 1, hills: 70, cliffs: 65 });
  const review = fixture ? null : createReviewFixture(world), center = review?.center || { x: world.width * 0.5, y: world.depth * 0.5 }, state = fixture?.state || review.state;
  const beforeState = JSON.stringify(state), viewer = mountWorld3D2($("environment"), world, { baseline, previous, quality: quality === "low" ? "lite" : "game", animateWater: params.get("motion") !== "off", contextCenter: count ? null : center, onAssets: () => {
    $("status").textContent = "Local models ready \xB7 " + (baseline ? "existing environment" : previous ? "published A1 surface" : "fine-detail A2 surface");
  } });
  viewer.setSettlement(state);
  const releaseInspection = attachInspectionControls($("environment"), viewer, world);
  const views = { ground: () => {
    const x = center.x - 52, z = center.y - 45;
    viewer.focusOn(x, z);
    viewer.setCamera({ ...viewer.getCamera(), zoom: 7, pitch: 1.1, yaw: 0.6, focusY: world.sample(x, z).height });
  }, detail: () => {
    viewer.focusOn(center.x - 52, center.y - 52);
    viewer.setCamera({ ...viewer.getCamera(), zoom: 17, pitch: 0.58, yaw: 0.6, focusY: 17 });
  }, wide: () => focus(world.width * 0.5, world.depth * 0.5, world.depth * 0.7, 0.85), near: () => focus(center.x, center.y, 105, 0.42), junction: () => {
    if (review?.junctionState) viewer.setSettlement(review.junctionState);
    focus(center.x, center.y, 110, 0.78);
  }, forest: () => {
    const p = world.trees.find((t) => world.sample(t.x, t.z).water === null) || { x: center.x, z: center.y };
    focus(p.x, p.z, 130, 0.55);
  }, cliff: () => {
    let p = center, slope = 0;
    for (let z = 30; z < world.depth; z += 20) for (let x = 30; x < world.width; x += 20) if (world.sample(x, z).water === null && world.slope(x, z) > slope) {
      p = { x, y: z };
      slope = world.slope(x, z);
    }
    focus(p.x, p.y, 140, 0.4);
  }, lake: () => {
    const p = world.lakes?.find((l) => world.sample(l.x, l.z).kind === "lake");
    if (p) focus(p.x, p.z, 230, 0.45);
  }, river: () => {
    const r = world.rivers?.[0];
    let p = null, score = Infinity;
    for (const v of r?.points.slice(6, -6) || []) {
      const q = world.sample(v.x, v.z);
      if (q.kind !== "river") continue;
      const obstruction = [[60, 0], [-60, 0], [0, 60], [0, -60]].reduce((n, [dx, dz]) => n + Math.max(0, world.sample(v.x + dx, v.z + dz).height - q.water), 0);
      if (obstruction < score) {
        p = v;
        score = obstruction;
      }
    }
    if (p) focus(p.x, p.z, 140, 0.55);
  }, lowpitch: () => viewer.setCamera({ ...viewer.getCamera(), pitch: 0.4 }), highpitch: () => viewer.setCamera({ ...viewer.getCamera(), pitch: 1.35 }) };
  for (const [id, action] of Object.entries(views)) $(id).onclick = () => {
    if (id !== "junction") viewer.setSettlement(state);
    action();
    params.set("view", id);
  };
  const benchmarkCamera = { focusY: 17, yaw: 0.71, pitch: 0.86, zoom: world.depth * 0.84, focusX: world.width * -0.03, focusZ: world.depth * -0.02 };
  if (count) viewer.setCamera(benchmarkCamera);
  else (views[params.get("view")] || views.detail)();
  if (params.has("camera")) try {
    viewer.setCamera(JSON.parse(params.get("camera")));
  } catch {
  }
  for (const id of ["seed", "quality", "count", "treatment"]) $(id).onchange = () => {
    params.set(id, $(id).value);
    if (id === "treatment") params.set("camera", JSON.stringify(viewer.getCamera()));
    else params.delete("camera");
    location.search = params;
  };
  let running = false, cancel = false;
  async function measure(duration = 8, warmup = 2) {
    if (running) throw Error("Already recording");
    running = true;
    cancel = false;
    const times = [], stats = [], initial = { ...benchmarkCamera };
    let previous2 = null, begin = performance.now();
    $("run").disabled = true;
    await new Promise((resolve) => {
      function tick(now) {
        if (cancel || document.hidden) {
          resolve();
          return;
        }
        const sec = (now - begin) / 1e3, phase = sec * 0.12;
        viewer.setCamera({ ...initial, yaw: 0.71 + Math.sin(phase) * 0.6, pitch: 0.86 + Math.sin(phase * 0.7) * 0.25, zoom: initial.zoom * (0.5 + 0.5 * Math.cos(phase) ** 2), focusX: initial.focusX + Math.sin(phase) * 35 });
        if (sec >= warmup && previous2 !== null) {
          times.push(now - previous2);
          stats.push(viewer.assetStatus());
        }
        previous2 = now;
        if (sec < duration + warmup) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
    running = false;
    $("run").disabled = false;
    const sorted = times.sort((a, b) => a - b), p = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))], peak = (k) => Math.max(0, ...stats.map((s) => s[k] || 0)), gl = $("environment").getContext("webgl2"), ext = gl.getExtension("WEBGL_debug_renderer_info");
    const result = { seed: fixture?.seed || seed, count, quality, treatment: baseline ? "before" : previous2 ? "previous" : "after", viewport: { width: $("environment").clientWidth, height: $("environment").clientHeight }, devicePixelRatio, renderDPR: Math.min(devicePixelRatio, quality === "low" ? 1 : 1.5), cameraPath: "orbit-v1", initialCamera: initial, warmupSeconds: warmup, durationSeconds: duration, frameCount: times.length, medianMs: p(0.5), p95Ms: p(0.95), p99Ms: p(0.99), peakDrawCalls: peak("drawCalls"), peakTriangles: peak("triangles"), textureBytes: peak("textureBytes"), surfaceTextureBytes: peak("surfaceTextureBytes"), geometryBytes: peak("geometryBytes"), renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), shadows: false, cancelled: cancel, phonePerformanceVerified: false };
    $("record").textContent = JSON.stringify(result, null, 2);
    return result;
  }
  $("run").onclick = () => void measure(60, 10);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancel = true;
  });
  window.environmentHarness = { viewer, world, state, center, review, measure, serializationUnchanged: () => beforeState === JSON.stringify(state) };
  window.addEventListener("pagehide", () => {
    cancel = true;
    releaseInspection();
    viewer.dispose();
  });
}

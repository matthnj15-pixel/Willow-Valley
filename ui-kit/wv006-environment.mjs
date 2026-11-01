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
function hash2(x2, z, seed2) {
  let h = seed2 ^ Math.imul(x2, 374761393) ^ Math.imul(z, 668265263);
  h = Math.imul(h ^ h >>> 13, 1274126177);
  return ((h ^ h >>> 16) >>> 0) / 4294967295;
}
function valueNoise(x2, z, seed2) {
  const ix = Math.floor(x2), iz = Math.floor(z), tx = smooth(x2 - ix), tz = smooth(z - iz);
  return mix(
    mix(hash2(ix, iz, seed2), hash2(ix + 1, iz, seed2), tx),
    mix(hash2(ix, iz + 1, seed2), hash2(ix + 1, iz + 1, seed2), tx),
    tz
  );
}
function fbm(x2, z, seed2) {
  return valueNoise(x2, z, seed2) * 0.56 + valueNoise(x2 * 2.07 + 12, z * 2.07 - 7, seed2 + 11) * 0.28 + valueNoise(x2 * 4.11 - 23, z * 4.11 + 33, seed2 + 29) * 0.16;
}
function normalizeWorldSettings(raw = {}) {
  const source = { ...DEFAULT_WORLD, ...raw }, out = {};
  out.seed = String(source.seed ?? DEFAULT_WORLD.seed).trim().slice(0, 40) || DEFAULT_WORLD.seed;
  out.size = WORLD_SIZES[source.size] ? source.size : "medium";
  for (const [key, low, high] of [
    ["lakes", 0, 4],
    ["rivers", 0, 3],
    ["waterLevel", 0, 100],
    ["rolling", 0, 100],
    ["hills", 0, 100],
    ["cliffs", 0, 100],
    ["flatness", 0, 100],
    ["forest", 0, 100]
  ]) {
    const n = Number(source[key]);
    out[key] = Number.isFinite(n) ? clamp(Math.round(n), low, high) : DEFAULT_WORLD[key];
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
    let best2 = null;
    for (let j = 0; j < 22; j++) {
      const x2 = (0.12 + 0.76 * rand(900 + i * 97 + j * 3)) * width;
      const z = (0.12 + 0.76 * rand(901 + i * 97 + j * 3)) * depth;
      const h = baseHeight(x2, z);
      const dx = (baseHeight(x2 + 12, z) - baseHeight(x2 - 12, z)) / 24;
      const dz = (baseHeight(x2, z + 12) - baseHeight(x2, z - 12)) / 24;
      const closest = lakes.length ? Math.min(...lakes.map((l) => Math.hypot(x2 - l.x, z - l.z))) : Infinity;
      const score = h + Math.hypot(dx, dz) * 12 + Math.max(0, 240 - closest) * 0.3 + rand(902 + i * 97 + j * 3) * 4;
      if (!best2 || score < best2.score) best2 = { x: x2, z, score, h, dx, dz };
    }
    const type = lakeTypes[(i + Math.floor(rand(700 + i) * 3)) % lakeTypes.length];
    const length = lakeMin * (type === "ribbon" ? 0.35 : type === "branched" ? 0.24 : 0.18) * (0.84 + rand(530 + i * 37) * 0.4) * (0.7 + options.waterLevel * 5e-3);
    const halfWidth2 = lakeMin * (type === "ribbon" ? 0.028 : type === "branched" ? 0.041 : 0.072) * (0.8 + rand(531 + i * 37) * 0.48) * (0.6 + options.waterLevel * 8e-3);
    const direction = Math.atan2(best2.dz, best2.dx) + (type === "ribbon" ? 0.12 : 1.08) + rand(535 + i * 37) * 0.42;
    const ux = Math.cos(direction), uz = Math.sin(direction);
    const vx = -uz, vz = ux;
    const wobble = rand(533 + i * 37) * Math.PI * 2;
    const spine = Array.from({ length: 17 }, (_, j) => {
      const t = j / 16, u = (t - 0.5) * length;
      const side = (Math.sin(t * Math.PI * 2.4 + wobble) - Math.sin(wobble)) * halfWidth2 * (type === "ribbon" ? 0.65 : 0.8);
      const x2 = clamp(best2.x + ux * u + vx * side, 5, width - 5);
      const z = clamp(best2.z + uz * u + vz * side, 5, depth - 5);
      return { x: x2, z, r: halfWidth2 * (0.52 + 0.48 * Math.pow(Math.max(0, 1 - Math.abs(t - 0.5) * 1.8), 0.7)) * (0.85 + 0.18 * Math.sin(t * 23 + wobble)) };
    });
    const arms = [];
    if (type === "branched" || type === "lowland") {
      const count2 = type === "branched" ? 3 : 2;
      for (let j = 0; j < count2; j++) {
        const idx = 3 + Math.floor(rand(610 + i * 37 + j) * 11), origin = spine[idx];
        const side = j % 2 ? 1 : -1;
        const span = length * (0.28 + rand(630 + i * 37 + j) * 0.27);
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
    const level = Math.max(6, best2.h + 2.5 + rand(511 + i * 37) * 2);
    lakes.push({
      x: best2.x,
      z: best2.z,
      rx: length / 2,
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
  function lineDistance(x2, z, points) {
    let best2 = Infinity;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = clamp(((x2 - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      best2 = Math.min(best2, Math.hypot(x2 - (a.x + t * dx), z - (a.z + t * dz)));
    }
    return best2;
  }
  function baseHeight(x2, z) {
    const nx = x2 / width, nz = z / depth, rolling = options.rolling / 100, hills = options.hills / 100;
    const broad = fbm(nx * 4.3, nz * 4.3, seed2 + 200) - 0.5;
    const detail = fbm(nx * 13, nz * 13, seed2 + 201) - 0.5;
    const ridge = Math.pow(1 - Math.abs(2 * fbm(nx * 3.5 + 0.5, nz * 3.5 + 0.3, seed2 + 240) - 1), 3.1);
    const cliffNoise = fbm(nx * 5.9 + 0.3, nz * 5.9 + 0.7, seed2 + 270);
    const cliff = smooth(clamp((cliffNoise - 0.475) * 23, 0, 1)) * options.cliffs * 0.65;
    const open = 1 - smooth(clamp((fbm(nx * 2.8, nz * 2.8, seed2 + 330) - 0.34) * 3, 0, 1));
    const flatFactor = 1 - options.flatness / 100 * 0.83 * open;
    return Math.max(1, 11 + (broad * 85 * rolling + detail * 23 * rolling + ridge * 90 * hills + cliff) * flatFactor);
  }
  function lakeDistance(lake, x2, z) {
    const warp = lake.rz * 0.34;
    const xx = x2 + (fbm(x2 / width * 23, z / depth * 23, seed2 + lake.x % 100 + 451) - 0.5) * warp;
    const zz = z + (fbm(x2 / width * 21 + 9, z / depth * 21 - 7, seed2 + lake.z % 100 + 452) - 0.5) * warp;
    let best2 = Infinity;
    for (const path of [lake.spine, ...lake.arms]) for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = clamp(((xx - a.x) * dx + (zz - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      const r = Math.max(1, mix(a.r, b.r, t));
      const d = Math.hypot(xx - (a.x + t * dx), zz - (a.z + t * dz)) / r;
      best2 = Math.min(best2, d);
    }
    return best2;
  }
  function sample(x2, z) {
    x2 = clamp(x2, 0, width);
    z = clamp(z, 0, depth);
    let height = baseHeight(x2, z), water3 = -Infinity, kind = "land";
    for (const lake of lakes) {
      const far = Math.hypot(x2 - lake.x, z - lake.z);
      if (far > lake.rx + lake.rz * 6) continue;
      const d = lakeDistance(lake, x2, z);
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
      const d = lineDistance(x2, z, river.points), bank = river.width;
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
  function slope(x2, z) {
    const d = Math.min(width, depth) / 260;
    return Math.hypot(
      (sample(x2 + d, z).height - sample(x2 - d, z).height) / (2 * d),
      (sample(x2, z + d).height - sample(x2, z - d).height) / (2 * d)
    );
  }
  const treeCount = Math.round(width * depth / (1200 * 900) * (35 + options.forest * 2.8) * options.forest / 100);
  const trees = [];
  for (let i = 0; i < treeCount * 5 && trees.length < treeCount; i++) {
    const x2 = 22 + rand(1e3 + i * 5) * (width - 44), z = 22 + rand(1002 + i * 5) * (depth - 44);
    const land = sample(x2, z);
    const patch = fbm(x2 / width * 10, z / depth * 10, seed2 + 443);
    if (land.water !== null || slope(x2, z) > 1.05 || patch < 0.37 || rand(1004 + i * 5) > options.forest / 100 * 0.82 + 0.12) continue;
    trees.push({ x: x2, z, y: land.height, r: 4.3 + rand(1010 + i * 5) * 3.5, h: 19 + rand(1012 + i * 5) * 22 });
  }
  const anchors = [[0.1, 0.1], [0.25, 0.8], [0.5, 0.5], [0.8, 0.25], [0.9, 0.9]];
  const signature = anchors.map(([x2, z]) => sample(x2 * width, z * depth).height.toFixed(3)).join("|") + ":" + lakes.map((l) => l.type).join(",") + ":" + rivers.length + ":" + trees.length;
  return { options, width, depth, lakes, rivers, trees, sample, slope, signature };
}
function previewTrees(world2, maxCount = 650) {
  const trees = world2.trees || [];
  if (trees.length <= maxCount) return trees;
  const stride = trees.length / maxCount;
  return Array.from({ length: maxCount }, (_, i) => trees[Math.floor((i + 0.5) * stride)]);
}
function createWorldMesh(world2, nx = 92, nz = 72, { trees = true, palette = null, treeLimit = 650, coherentMeadow = false } = {}) {
  const { width, depth } = world2, ground = [], water3 = [];
  const rand = (i, j) => hash2(i, j, hashSeed(world2.options.seed) + 901);
  function triangle(to, a, b, c, color) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let normal = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    const len2 = Math.hypot(...normal) || 1;
    normal = normal.map((v) => v / len2);
    for (const [i, p] of [a, b, c].entries()) to.push(...p, ...Array.isArray(color[0]) ? color[i] : color, ...normal);
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
        const value = world2.sample(mid.x, mid.z);
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
    const color = deep.map((c, i) => clamp(c + (isRiver ? [0.025, 0.055, 0.043][i] : 0) + (shore ? [0.072, 0.078, 0.054][i] : 0), 0, 1));
    const vertex3 = (p) => [p.x - width / 2, p.level + 0.5, p.z - depth / 2];
    for (let i = 1; i + 1 < result.length; i++)
      triangle(water3, vertex3(result[0]), vertex3(result[i]), vertex3(result[i + 1]), color);
  }
  const rowLength = nx + 1;
  const sampled = Array.from({ length: (nz + 1) * rowLength }, (_, i) => world2.sample(i % rowLength / nx * width, Math.floor(i / rowLength) / nz * depth));
  for (let z = 0; z < nz; z++) for (let x2 = 0; x2 < nx; x2++) {
    const x0 = x2 / nx * width, x1 = (x2 + 1) / nx * width, z0 = z / nz * depth, z1 = (z + 1) / nz * depth;
    const index = z * rowLength + x2;
    const a = sampled[index], b = sampled[index + 1], c = sampled[index + rowLength + 1], d = sampled[index + rowLength];
    const cells = [[x0, z0, a], [x1, z0, b], [x1, z1, c], [x0, z1, d]];
    const mid = world2.sample((x0 + x1) / 2, (z0 + z1) / 2), rock = world2.slope((x0 + x1) / 2, (z0 + z1) / 2);
    const variation = rand(x2, z);
    const heights = [a.height, b.height, c.height, d.height];
    const verticalRise = Math.max(...heights) - Math.min(...heights);
    const rocky = rockExposure(rock, verticalRise);
    const green = palette?.land || [0.39, 0.54, 0.36];
    const stone = palette?.stone || [0.49, 0.49, 0.45];
    const stratum = Math.sin(mid.height * 0.38 + 1.3) * 0.045 + Math.sin(mid.height * 0.95 + 0.7) * 0.022;
    const meadowShade = 0.955 + variation * 0.095, rockShade = 0.94 + variation * 0.09 + stratum;
    const color = green.map((v, i) => clamp(mix(v * meadowShade, stone[i] * rockShade, rocky), 0.03, 0.93));
    const verts = cells.map((q) => [q[0] - width / 2, q[2].height, q[1] - depth / 2]);
    const vertexColors = coherentMeadow ? cells.map((q) => {
      const shade = 0.98 + Math.sin(q[0] / 75) * 0.015 + Math.cos(q[1] / 90) * 0.012 + Math.sin((q[0] + q[1]) / 110) * 0.01;
      return green.map((v, i) => clamp(mix(v * shade, stone[i] * rockShade, rocky), 0.03, 0.93));
    }) : null;
    triangle(ground, verts[0], verts[3], verts[1], vertexColors ? [vertexColors[0], vertexColors[3], vertexColors[1]] : color);
    triangle(ground, verts[1], verts[3], verts[2], vertexColors ? [vertexColors[1], vertexColors[3], vertexColors[2]] : color);
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
  for (const t of trees ? previewTrees(world2, treeLimit) : []) {
    const x2 = t.x - width / 2, z = t.z - depth / 2, n = 5, base2 = t.y + 1;
    const pine = [0.16 + rand(Math.round(t.x), Math.round(t.z)) * 0.09, 0.36 + rand(Math.round(t.z), Math.round(t.x)) * 0.1, 0.22];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
      triangle(
        ground,
        [x2, base2 + t.h, z],
        [x2 + Math.cos(a) * t.r, base2 + t.h * 0.21, z + Math.sin(a) * t.r],
        [x2 + Math.cos(b) * t.r, base2 + t.h * 0.21, z + Math.sin(b) * t.r],
        pine
      );
      triangle(
        ground,
        [x2, base2 + t.h * 0.63, z],
        [x2 + Math.cos(a) * t.r * 0.85, base2 + t.h * 0.12, z + Math.sin(a) * t.r * 0.85],
        [x2 + Math.cos(b) * t.r * 0.85, base2 + t.h * 0.12, z + Math.sin(b) * t.r * 0.85],
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
  const sample = (x2, y2) => ({ height: x2 > width * 0.92 ? 12 : 10 + Math.sin(x2 / 95) * 3 + Math.cos(y2 / 80) * 2 + x2 * 0.014, water: x2 > width * 0.92 ? 18 : null });
  const trees = Array.from({ length: 320 }, (_, i) => {
    const x2 = 18 + i * 137 % (width - 36), z = 18 + i * 193 % (depth - 36);
    return { x: x2, z, y: sample(x2, z).height, r: 5 + i % 4 * 0.5, h: 22 + i % 7 * 2 };
  });
  const world2 = { width, depth, trees, options: { seed: `WV-${count2 === 100 ? "D01-town100" : "C01-hamlet30"}`, size: "small" }, sample, slope: () => 0.1 };
  const houses = Array.from({ length: count2 }, (_, i) => {
    const x2 = 90 + i % cols * (width - 280) / (cols - 1) + Math.sin(i * 3) * 14, y2 = 75 + Math.floor(i / cols) * (depth - 300) / (rows - 1) + Math.cos(i * 2) * 18;
    return { id: i, x: x2, y: y2, foundedTurn: 0, foundedEra: 0, entrance: { x: x2 + Math.sin(i) * 7, y: y2 + 25 }, parcel: { vertices: [{ x: x2 - 19, y: y2 - 19 }, { x: x2 + 19, y: y2 - 19 }, { x: x2 + 19, y: y2 + 19 }, { x: x2 - 19, y: y2 + 19 }] } };
  });
  const buildings = ["farm", "lumber", "smith", "granary", "market", "plaza", "park"].map((type, i) => ({ id: 1e3 + i, type, x: 70 + (width - 260) / 6 * i, y: depth - 65 }));
  const state2 = { turn: 2, houses, buildings, roads: [[{ x: 35, y: depth - 125 }, { x: width * 0.88, y: depth - 125 }]], localLanes: Array.from({ length: rows }, (_, row) => ({ points: houses.slice(row * cols, row * cols + cols).map((h) => h.entrance) })), zones: [{ type: "farmland", radius: 80, points: [{ x: 70, y: depth - 25 }] }], desirePaths: [] };
  return { world: world2, state: state2, seed: world2.options.seed };
}

// environment-next/previous-materials.mjs
import * as T2 from "../assets/vendor/three.module.mjs";

// terrain-classification.mjs
var clamp2 = (x2) => Math.max(0, Math.min(1, x2));
function createTerrainClassification(world2, { width = 96, height = 72 } = {}) {
  const n = width * height, sx = world2.width / (width - 1), sz = world2.depth / (height - 1), samples = [], wet = new Uint8Array(n);
  const seed2 = Array.from(String(world2.options?.seed ?? "")).reduce((h, c) => Math.imul(h, 31) + c.charCodeAt(0) | 0, 0);
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const q = world2.sample(i * sx, j * sz);
    samples.push(q);
    wet[j * width + i] = q.water !== null ? 1 : 0;
  }
  const distance4 = new Float32Array(n).fill(1e6);
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const k = j * width + i;
    if (i && wet[k] !== wet[k - 1] || j && wet[k] !== wet[k - width]) {
      distance4[k] = 0;
      if (i && wet[k] !== wet[k - 1]) distance4[k - 1] = 0;
      if (j && wet[k] !== wet[k - width]) distance4[k - width] = 0;
    }
  }
  const relax = (k, i, j, di, dj) => {
    const x2 = i + di, z = j + dj;
    if (x2 >= 0 && x2 < width && z >= 0 && z < height) distance4[k] = Math.min(distance4[k], distance4[z * width + x2] + Math.hypot(di * sx, dj * sz));
  };
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) for (const [di, dj] of [[-1, 0], [0, -1], [-1, -1], [1, -1]]) relax(j * width + i, i, j, di, dj);
  for (let j = height - 1; j >= 0; j--) for (let i = width - 1; i >= 0; i--) for (const [di, dj] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) relax(j * width + i, i, j, di, dj);
  const data = new Uint8Array(n * 4);
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const k = j * width + i, x2 = i * sx, z = j * sz, q = samples[k];
    let forest = 0;
    for (const t of world2.trees || []) forest = Math.max(forest, 1 - Math.hypot(x2 - t.x, z - t.z) / 42);
    const noise2 = 0.5 + 0.25 * Math.sin(x2 * 0.017 + seed2 % 103 + Math.sin(z * 0.011)) + 0.25 * Math.cos(z * 0.023 + x2 * 7e-3 + seed2 % 71);
    const bank = 1 - clamp2(distance4[k] / 32), altitude = clamp2((q.height - 140) / 180);
    data[k * 4] = Math.round(clamp2(forest * 0.48 + bank * 0.52 + noise2 * 0.15 + altitude * 0.12) * 255);
    data[k * 4 + 1] = Math.round(clamp2(distance4[k] / 55) * 255);
    let dx = 0, dz = 0, best2 = Infinity;
    if (q.kind === "river") for (const r of world2.rivers || []) for (let a = 1; a < r.points.length; a++) {
      const p = r.points[a - 1], b = r.points[a], vx = b.x - p.x, vz = (b.z ?? b.y) - (p.z ?? p.y), len2 = vx * vx + vz * vz;
      const t = clamp2(((x2 - p.x) * vx + (z - (p.z ?? p.y)) * vz) / (len2 || 1)), d = Math.hypot(x2 - p.x - vx * t, z - (p.z ?? p.y) - vz * t);
      if (d < best2) {
        best2 = d;
        const l = Math.sqrt(len2) || 1;
        dx = vx / l;
        dz = vz / l;
      }
    }
    data[k * 4 + 2] = Math.round((dx * 0.5 + 0.5) * 255);
    data[k * 4 + 3] = Math.round((dz * 0.5 + 0.5) * 255);
  }
  return { data, width, height, distance: distance4 };
}

// environment-next/visual-field.mjs
var clamp3 = (x2) => Math.max(0, Math.min(1, x2));
function inside(x2, z, polygon) {
  let yes = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (a.z > z !== b.z > z && x2 < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) yes = !yes;
  }
  return yes;
}
var segmentDistance = (x2, z, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = clamp3(((x2 - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1));
  return Math.hypot(x2 - a.x - t * dx, z - a.z - t * dz);
};
function validateVisualInputs(inputs = []) {
  return inputs.filter((p) => p?.envelope?.length >= 3 && p.path?.length >= 2 && Number.isFinite(p.radius) && p.radius > 0 && p.radius <= 20 && [...p.envelope, ...p.path].every((v) => Number.isFinite(v.x) && Number.isFinite(v.z))).map((p) => ({ envelope: p.envelope.map((v) => ({ ...v })), path: p.path.map((v) => ({ ...v })), radius: p.radius, strength: clamp3(p.strength ?? 0.65) }));
}
function createVisualField(world2, { low = false, inputs = [] } = {}) {
  const baseWidth = low ? 64 : 96, baseHeight = low ? 48 : 72, accepted = validateVisualInputs(inputs), width = accepted.length ? low ? 192 : 384 : baseWidth, height = accepted.length ? low ? 144 : 288 : baseHeight, base2 = createTerrainClassification(world2, { width: baseWidth, height: baseHeight }), data = new Uint8Array(width * height * 4);
  const seed2 = Array.from(String(world2.options?.seed ?? "")).reduce((n, c) => Math.imul(n, 31) + c.charCodeAt(0) | 0, 0);
  function sample(x2, z) {
    const q = world2.sample(x2, z), wet = q.water !== null;
    let forest = 0, wear = 0;
    for (const t of world2.trees || []) forest = Math.max(forest, clamp3(1 - Math.hypot(x2 - t.x, z - t.z) / 38));
    if (!wet) {
      for (const p of accepted) if (inside(x2, z, p.envelope)) for (let i2 = 1; i2 < p.path.length; i2++) wear = Math.max(wear, clamp3(1 - segmentDistance(x2, z, p.path[i2 - 1], p.path[i2]) / p.radius) * p.strength);
    }
    const meadow = 0.5 + 0.22 * Math.sin(x2 * 0.011 + seed2 % 83 + Math.sin(z * 9e-3)) + 0.18 * Math.cos(z * 0.015 + x2 * 4e-3 + seed2 % 57);
    const i = Math.round(clamp3(x2 / world2.width) * (baseWidth - 1)), j = Math.round(clamp3(z / world2.depth) * (baseHeight - 1)), k = j * baseWidth + i;
    return { wet, forest, wear, meadow, shoreDistance: base2.distance[k], shoreDistanceMethod: "wet-mask chamfer; not bathymetry", flow: [base2.data[k * 4 + 2] / 255 * 2 - 1, base2.data[k * 4 + 3] / 255 * 2 - 1] };
  }
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const p = sample(i * world2.width / (width - 1), j * world2.depth / (height - 1)), k = (j * width + i) * 4;
    data[k] = Math.round(p.forest * 255);
    data[k + 1] = Math.round(p.wear * 255);
    data[k + 2] = Math.round(p.meadow * 255);
    data[k + 3] = p.wet ? 255 : 0;
  }
  return { ...base2, visualData: data, visualWidth: width, visualHeight: height, sample, acceptedInputs: accepted.length };
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
  let disposed = false, loaded2 = 0, failed = 0, lastTime = 0, controlBuilds = 0, world2 = null, inputs = [], field = null, detach = null;
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
    if (!world2 || disposed) return;
    field = createVisualField(world2, { low, inputs });
    controlBuilds++;
    for (const [key, data] of [["control", field.data], ["visual", field.visualData]]) {
      const t = uniforms[key].value;
      t.image = { data, width: key === "visual" ? field.visualWidth : field.width, height: key === "visual" ? field.visualHeight : field.height };
      t.minFilter = t.magFilter = T2.LinearFilter;
      t.colorSpace = T2.NoColorSpace;
      t.needsUpdate = true;
    }
    uniforms.worldSize.value.set(world2.width, world2.depth);
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
      world2 = next;
      rebuild();
    },
    setVisualInputs(next = []) {
      if (disposed) return;
      inputs = next;
      rebuild();
    },
    sample(x2, z) {
      return field?.sample(x2, z) ?? null;
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
      world2 = null;
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
  let disposed = false, loaded2 = 0, failed = 0, lastTime = 0, controlBuilds = 0, world2 = null, inputs = [], field = null, detach = null;
  const textures = /* @__PURE__ */ new Set(), materials = /* @__PURE__ */ new Set(), resources = low ? LOW_TEXTURES : DETAIL_TEXTURES;
  const pixel = (rgb) => {
    const t = new T3.DataTexture(new Uint8Array([...rgb, 255]), 1, 1);
    t.needsUpdate = true;
    textures.add(t);
    return t;
  };
  const uniforms = { grass: { value: pixel([106, 124, 72]) }, soil: { value: pixel([116, 94, 66]) }, rock: { value: pixel([126, 122, 110]) }, grassNormal: { value: pixel([128, 128, 255]) }, soilNormal: { value: pixel([128, 128, 255]) }, rockNormal: { value: pixel([128, 128, 255]) }, normalStrength: { value: SURFACE_DETAIL.normalStrength }, control: { value: pixel([0, 255, 128]) }, visual: { value: pixel([0, 0, 128]) }, worldSize: { value: new T3.Vector2(1, 1) }, time: { value: 0 }, sunDirection: { value: new T3.Vector3(...ENVIRONMENT_PRESET.sunDirection).normalize() }, haze: { value: new T3.Color(ENVIRONMENT_PRESET.fogColor) }, fogRange: { value: new T3.Vector2(ENVIRONMENT_PRESET.fogNear, ENVIRONMENT_PRESET.fogFar) } };
  if (loadTextures) for (const resource of resources) {
    const { name, file, color } = resource, t = new T3.TextureLoader().load(new URL("../assets/wv/environment-next/" + file, import.meta.url).href, (texture) => {
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
    t.colorSpace = color ? T3.SRGBColorSpace : T3.NoColorSpace;
    t.wrapS = t.wrapT = T3.RepeatWrapping;
    t.minFilter = T3.LinearMipmapLinearFilter;
    t.magFilter = T3.LinearFilter;
    t.anisotropy = low ? SURFACE_DETAIL.lowAnisotropy : SURFACE_DETAIL.normalAnisotropy;
    textures.add(t);
  }
  for (const name of ["grass", "soil", "rock"]) uniforms[name].value.colorSpace = T3.SRGBColorSpace;
  function rebuild() {
    if (!world2 || disposed) return;
    field = createVisualField(world2, { low, inputs });
    controlBuilds++;
    for (const [key, data] of [["control", field.data], ["visual", field.visualData]]) {
      const t = uniforms[key].value;
      t.image = { data, width: key === "visual" ? field.visualWidth : field.width, height: key === "visual" ? field.visualHeight : field.height };
      t.minFilter = t.magFilter = T3.LinearFilter;
      t.colorSpace = T3.NoColorSpace;
      t.needsUpdate = true;
    }
    uniforms.worldSize.value.set(world2.width, world2.depth);
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
      world2 = next;
      rebuild();
    },
    setVisualInputs(next = []) {
      if (disposed) return;
      inputs = next;
      rebuild();
    },
    sample(x2, z) {
      return field?.sample(x2, z) ?? null;
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
      world2 = null;
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
    setWorld(world2) {
      controlBuilds++;
      uniforms.phase.value = Array.from(String(world2.options?.seed || "")).reduce((n, c) => n + c.charCodeAt(0), 0) % 97;
      const grid = createTerrainClassification(world2, { width: low ? 64 : 96, height: low ? 48 : 72 });
      control.image = { data: grid.data, width: grid.width, height: grid.height };
      control.needsUpdate = true;
      uniforms.worldSize.value.set(world2.width, world2.depth);
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
  const key = JSON.stringify([ARCHITECTURE_VERSION, worldSeed, entity.id ?? null, entity.x, entity.y, entity.foundedTurn ?? 0, entity.foundedEra ?? 0]);
  let hash = 2166136261;
  for (const c of key) {
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
async function loadScaleContext(scene, getSurface, center2) {
  const results = await Promise.allSettled([new T4.GLTFLoader().loadAsync(new URL("../assets/wv/megakit-catalog-v1/catalog.glb", import.meta.url).href), fetch(new URL("../assets/wv/megakit-catalog-v1/manifest.json", import.meta.url)).then((r) => {
    if (!r.ok) throw Error("Context manifest unavailable");
    return r.json();
  })]);
  const disposeModel = createResourceDisposer();
  if (results.some((r) => r.status === "rejected")) {
    if (results[0].status === "fulfilled") disposeModel(results[0].value.scene);
    throw Error("Context resources unavailable");
  }
  const model = results[0].value, manifest = results[1].value, group = new T4.Group(), world2 = getSurface(), envelopes = [], visualInputs = [];
  const ids = ["home-steep-gable", "home-long-ridge", "home-low-hip", "home-porch-cabin", "home-offset-gables", "market"];
  const positions = [];
  for (let z = center2.y - 65; z <= center2.y + 65; z += 26) for (let x2 = center2.x - 65; x2 <= center2.x + 65; x2 += 26) {
    const q = world2.sample(x2, z);
    if (q.water === null && world2.slope(x2, z) < 0.18) positions.push({ x: x2, z, height: q.height });
  }
  for (const [i, id] of ids.entries()) {
    const source = model.scene.getObjectByName(id) || model.scene.getObjectByName("facility-" + id), p = positions[i];
    if (!source || !p) continue;
    const mesh = source.clone(true);
    mesh.scale.setScalar(2.8);
    const box = new T4.Box3().setFromObject(mesh);
    mesh.position.set(p.x - world2.width / 2, p.height - box.min.y, p.z - world2.depth / 2);
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
  for (const [i, color] of colors2.entries()) {
    const p = positions[0] || { x: center2.x, z: center2.y, height: world2.sample(center2.x, center2.y).height }, g = new T4.BoxGeometry(3, 4.9, 3), m = new T4.MeshStandardMaterial({ color, roughness: 1, metalness: 0 }), mesh = new T4.Mesh(g, m);
    mesh.position.set(p.x - world2.width / 2 + i * 5, p.height + 2.45, p.z - world2.depth / 2 + 17);
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
      const key = [Math.floor((p.x + chunkSize / 2) / chunkSize), Math.floor((p.z + chunkSize / 2) / chunkSize), node.geometry.uuid, ...materials.map((m) => m.uuid)].join(":");
      if (!groups.has(key)) groups.set(key, { geometry: node.geometry, material: node.material, matrices: [], entities: [] });
      const batch = groups.get(key);
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
  const x2 = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x2 - Math.floor(x2);
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
function resolveFoundation(world2, center2, width, depth, orientation = 0) {
  const cs = Math.cos(orientation), sn = Math.sin(orientation);
  const corners = [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]].map(([x2, y2]) => ({ x: center2.x + x2 * cs - y2 * sn, y: center2.y + x2 * sn + y2 * cs }));
  const perimeter = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4];
    const count2 = Math.max(4, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3));
    const points = world2.contactTrace ? world2.contactTrace(a, b) : Array.from({ length: count2 + 1 }, (_, k) => ({ x: a.x + (b.x - a.x) * k / count2, y: a.y + (b.y - a.y) * k / count2 }));
    perimeter.push(...points.slice(0, -1));
  }
  const contacts = perimeter.map((p) => ({ ...p, ...world2.sample(p.x, p.y) }));
  const interior = world2.drapePolygon ? world2.drapePolygon(corners).flat() : [center2];
  const heights = [...contacts.map((p) => p.height), ...interior.map((p) => world2.sample(p.x, p.y).height)];
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
  const opts = normalizeWorldSettings(s.worldOptions), key = JSON.stringify(opts);
  if (!worldModels.has(key)) worldModels.set(key, createWorld(opts));
  return worldModels.get(key);
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
function riverX(y2) {
  return 875 - 90 * Math.sin((y2 + 80) / 145) + 35 * Math.sin(y2 / 66);
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
    const steps = Math.ceil(dist(stamp, cell) / 10);
    for (let i = 1; i < steps; i++) {
      const p = { x: stamp.x + (cell.x - stamp.x) * i / steps, y: stamp.y + (cell.y - stamp.y) * i / steps };
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
    const x2 = 18 + rnd(i + 200) * 1160, y2 = 10 + rnd(i + 510) * 875;
    if (x2 > 135 && x2 < 730 && y2 > 275 && y2 < 660 || Math.abs(x2 - riverX(y2)) < 77) continue;
    out.push({ x: x2, y: y2, r: 8 + rnd(i + 840) * 12 });
  }
  return out;
}
var TREES = treeSites();
function distanceToRoad(p, roads) {
  let best2 = null;
  for (const line of roads || []) for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], v = { x: b.x - a.x, y: b.y - a.y }, ll = v.x * v.x + v.y * v.y;
    const t = ll ? clamp5(((p.x - a.x) * v.x + (p.y - a.y) * v.y) / ll, 0, 1) : 0;
    const q = { x: a.x + v.x * t, y: a.y + v.y * t }, d = dist(p, q);
    if (!best2 || d < best2.distance) best2 = { point: q, distance: d, segment: [a, b] };
  }
  return best2;
}

// nature-visuals.mjs
function naturePlacements(world2, state2, { low = false } = {}) {
  const result = [];
  for (const tree of previewTrees(world2, low ? 95 : 260)) {
    const p = { x: tree.x, y: tree.z }, r = tree.r || 6;
    if (world2.sample(p.x, p.y).water !== null || zoneAt(state2, p) === "farmland") continue;
    if ((state2.houses || []).some((h) => {
      const b = cottageBlueprint(h);
      return Math.hypot(p.x - h.x, p.y - h.y) < Math.max(b.width, b.depth) * 0.72 + r;
    })) continue;
    if ((state2.buildings || []).some((b) => {
      const f = buildingFootprint(b.type);
      return Math.hypot(p.x - b.x, p.y - b.y) < Math.max(f.width, f.depth) * 0.72 + r;
    })) continue;
    const lines = [...(state2.roads || []).map((points) => ({ points, width: 17 })), ...(state2.localLanes || []).map((l) => ({ points: l.points || [], width: 5 })), ...(state2.houses || []).filter((h) => h.entrance).map((h) => ({ points: [h, h.entrance], width: 3 }))];
    if (lines.some((line) => line.points.slice(1).some((b, i) => {
      const a = line.points[i], dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t) < line.width + r;
    }))) continue;
    result.push({ key: `tree:${tree.x}:${tree.z}`, origin: [p.x - world2.width / 2, world2.sample(p.x, p.y).height - 0.02, p.y - world2.depth / 2], scale: Math.min(tree.h / 1.22624, r * 2 / 0.739648), yaw: (p.x + p.y) * 0.1 });
  }
  return result;
}

// environment-next/review-renderer.mjs
import * as THREE3 from "../assets/vendor/three.module.mjs";

// editor-overlays.mjs
function projectEditorPoint(world2, camera, rect, point) {
  const x2 = point.x - world2.width / 2 - camera.focusX, z = point.y - world2.depth / 2 - camera.focusZ;
  const y2 = world2.sample(point.x, point.y).height + 3.2 - 17;
  const co = Math.cos(camera.yaw), si = Math.sin(camera.yaw);
  const xx = co * x2 + si * z, zz = -si * x2 + co * z;
  const yy = Math.cos(camera.pitch) * y2 - Math.sin(camera.pitch) * zz;
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
    draw(world2, camera, markers) {
      const rect = canvas.getBoundingClientRect(), density = Math.min(devicePixelRatio || 1, 1.75);
      overlay.width = Math.round(rect.width * density);
      overlay.height = Math.round(rect.height * density);
      ctx.setTransform(density, 0, 0, density, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (const marker of markers) {
        const p = projectEditorPoint(world2, camera, rect, marker.point);
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
function terrainResolution(world2, { lite = false, gameplay = false } = {}) {
  return lite ? [48, 36] : gameplay ? { small: [62, 46], medium: [76, 56], large: [88, 66] }[world2.options.size] || [76, 56] : { small: [96, 72], medium: [112, 84], large: [128, 96] }[world2.options.size] || [112, 84];
}
function createTerrainSurface(world2, nx, nz) {
  const sx = world2.width / nx, sy = world2.depth / nz, cache = /* @__PURE__ */ new Map();
  const height = (i, j) => {
    const key = j * (nx + 1) + i;
    if (!cache.has(key)) cache.set(key, world2.sample(i * sx, j * sy).height);
    return cache.get(key);
  };
  function sample(x2, y2) {
    const gx = Math.max(0, Math.min(nx, x2 / sx)), gy = Math.max(0, Math.min(nz, y2 / sy));
    const i = Math.min(nx - 1, Math.floor(gx)), j = Math.min(nz - 1, Math.floor(gy));
    const u = gx - i, v = gy - j, a = height(i, j), b = height(i + 1, j), c = height(i + 1, j + 1), d = height(i, j + 1);
    return { ...world2.sample(x2, y2), height: u + v <= 1 ? a + (b - a) * u + (d - a) * v : c + (d - c) * (1 - u) + (b - c) * (1 - v) };
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
        for (const distance4 of planes) {
          const next = [];
          for (let k = 0; k < clipped.length; k++) {
            const a = clipped[k], b = clipped[(k + 1) % clipped.length], da = distance4(a), db = distance4(b);
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
  return { ...world2, sample, contactTrace: trace, drapePolygon: drape };
}

// road-network.mjs
var nodeAt = (g, id) => g.nodes.find((n) => n.id === id) || null;
var lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
function quadraticPoint(a, c, b, t) {
  return lerp(lerp(a, c, t), lerp(c, b, t), t);
}

// road-surface.mjs
function sampleRoadAlignment(a, control, b, spacing = 6) {
  const distance4 = (p, q) => Math.hypot(q.x - p.x, q.y - p.y);
  const length = control ? distance4(a, control) + distance4(control, b) : distance4(a, b);
  const count2 = Math.max(1, Math.ceil(length / spacing));
  return Array.from({ length: count2 + 1 }, (_, i) => control ? quadraticPoint(a, control, b, i / count2) : { x: a.x + (b.x - a.x) * i / count2, y: a.y + (b.y - a.y) * i / count2 });
}

// road-visual-offsets.mjs
function roadVisualOffsets(world2, state2, vertices, kinds, liveCurve = null) {
  const lines = [];
  if (state2.roadGraph?.segments?.length) {
    const nodes2 = new Map(state2.roadGraph.nodes.map((n) => [n.id, n]));
    for (const e of state2.roadGraph.segments) {
      const a = nodes2.get(e.a), b = nodes2.get(e.b);
      if (a && b) lines.push(sampleRoadAlignment(a, liveCurve?.id === e.id ? liveCurve.control : e.control, b));
    }
  } else lines.push(...state2.roads || []);
  const segments = lines.flatMap((points) => points.slice(1).map((b, i) => [points[i], b]));
  const offsets = new Float32Array(kinds.length);
  for (let k = 0; k < kinds.length; k++) if (kinds[k] === 2) {
    const x2 = vertices[k * 9] + world2.width / 2, y2 = vertices[k * 9 + 2] + world2.depth / 2;
    let best2 = Infinity, signed = 0;
    for (const [a, b] of segments) {
      const dx = b.x - a.x, dy = b.y - a.y, len2 = Math.hypot(dx, dy);
      if (len2 < 1e-8) continue;
      const t = Math.max(0, Math.min(1, ((x2 - a.x) * dx + (y2 - a.y) * dy) / (len2 * len2)));
      const distance4 = Math.hypot(x2 - a.x - dx * t, y2 - a.y - dy * t);
      if (distance4 < best2) {
        best2 = distance4;
        signed = distance4 * Math.sign(dx * (y2 - a.y) - dy * (x2 - a.x));
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
    const a = points[i - 1], b = points[i], length = distance(a, b);
    if (length >= remaining) {
      const t = remaining / (length || 1);
      return [
        { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        ...points.slice(i)
      ];
    }
    remaining -= length;
  }
  return points;
}
function roadJunctionPolygons(graph, liveCurve = null) {
  const edges = [], incident = new Map(graph.nodes.map((n) => [n.id, []]));
  for (const edge of graph.segments) {
    const a = nodeAt(graph, edge.a), b = nodeAt(graph, edge.b);
    if (!a || !b) continue;
    const control = liveCurve?.id === edge.id ? liveCurve.control : edge.control;
    const length = control ? distance(a, control) + distance(control, b) : distance(a, b);
    const steps = Math.max(1, Math.ceil(length / 6));
    const points = Array.from({ length: steps + 1 }, (_, k) => control ? quadraticPoint(a, control, b, k / steps) : { x: a.x + (b.x - a.x) * k / steps, y: a.y + (b.y - a.y) * k / steps });
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
function visibleDesirePaths(state2) {
  return (state2.desirePaths || []).map((path) => {
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
function addTri(out, a, b, c, color) {
  const u = b.map((v2, i) => v2 - a[i]), v = c.map((x2, i) => x2 - a[i]);
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const norm = n.map((x2) => x2 / len(n));
  for (const p of [a, b, c]) {
    out.push(...p, ...color, ...norm);
    out.surfaceKinds?.push(out.surfaceKind || 0);
  }
}
function quad(out, a, b, c, d, color) {
  addTri(out, a, b, c, color);
  addTri(out, a, c, d, color);
}
function groundPolygon(out, world2, points, color, offset) {
  if (world2.drapePolygon) {
    for (const tri of world2.drapePolygon(points)) {
      const vertices = tri.map((p) => worldPos(world2, p, offset));
      const [a, b, c] = vertices;
      if ((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]) > 0) vertices.reverse();
      addTri(out, ...vertices, color);
    }
  } else for (let i = 1; i + 1 < points.length; i++)
    addTri(out, worldPos(world2, points[0], offset), worldPos(world2, points[i], offset), worldPos(world2, points[i + 1], offset), color);
}
function worldPos(world2, p, offset = 2) {
  const sample = world2.sample(p.x, p.y);
  return [p.x - world2.width / 2, sample.height + offset, p.y - world2.depth / 2];
}
function terrainRibbon(out, world2, points, width, color, offset = 1.1, spacing = 6) {
  if (!Array.isArray(points) || points.length < 2) return;
  const samples = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length < 0.01) continue;
    const count2 = Math.max(1, Math.ceil(length / spacing));
    for (let k = 1; k <= count2; k++) {
      const t = k / count2;
      samples.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  if (samples.length < 2) return;
  const cross2 = [];
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i], before = samples[Math.max(0, i - 1)], after = samples[Math.min(samples.length - 1, i + 1)];
    const dx = after.x - before.x, dy = after.y - before.y, length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length * width * 0.5, ny = dx / length * width * 0.5;
    cross2.push([
      worldPos(world2, { x: p.x + nx, y: p.y + ny }, offset),
      worldPos(world2, { x: p.x - nx, y: p.y - ny }, offset)
    ]);
  }
  for (let i = 1; i < cross2.length; i++)
    groundPolygon(out, world2, [cross2[i - 1][0], cross2[i][0], cross2[i][1], cross2[i - 1][1]].map((p) => ({ x: p[0] + world2.width / 2, y: p[2] + world2.depth / 2 })), color, offset);
}
function ribbon(out, world2, points, width, color, offset = 1.1) {
  terrainRibbon(out, world2, points, width, color, offset);
}
function surfaceRibbon(out, world2, points, width, color, offset = 1.1, kind = 4) {
  const before = out.surfaceKind;
  out.surfaceKind = kind;
  ribbon(out, world2, points, width, color, offset);
  out.surfaceKind = before;
}
function surfacePolygon(out, world2, points, color, offset, kind = 6) {
  const before = out.surfaceKind;
  out.surfaceKind = kind;
  groundPolygon(out, world2, points, color, offset);
  out.surfaceKind = before;
}
function block(out, world2, p, width, depth, height, wall, roof, orientation = 0, style = {}) {
  const cs = Math.cos(orientation), sn = Math.sin(orientation), x2 = width / 2, z = depth / 2;
  const position = (dx, dz) => ({
    x: p.x + dx * cs - dz * sn,
    y: p.y + dx * sn + dz * cs
  });
  const footprint = [[-x2, -z], [x2, -z], [x2, z], [-x2, z]];
  const foundation = resolveFoundation(world2, p, width, depth, orientation);
  const floor = style.floorY ?? foundation.floor;
  const vert = (dx, y2, dz) => {
    const xy = position(dx, dz);
    return [xy.x - world2.width / 2, floor + y2, xy.y - world2.depth / 2];
  };
  const stone = [0.5, 0.47, 0.4];
  const contacts = foundation.perimeter;
  for (let i = 0; i < contacts.length; i++) {
    const a2 = contacts[i], b2 = contacts[(i + 1) % contacts.length];
    const vertex3 = (q, y2) => [q.x - world2.width / 2, y2, q.y - world2.depth / 2];
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
    quad(out, vert(-x2, 0, -z), vert(x2, 0, -z), vert(x2, 0, z), vert(-x2, 0, z), stone);
    return;
  }
  const a = vert(-x2, 0, -z), b = vert(x2, 0, -z), c = vert(x2, 0, z), d = vert(-x2, 0, z);
  const at = vert(-x2, height, -z), bt = vert(x2, height, -z), ct = vert(x2, height, z), dt = vert(-x2, height, z);
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
function accessSteps(markers, surfaces, world2, approach) {
  if (!approach) return;
  const { from, to, dx, dy, distance: distance4, floor } = approach;
  const stairLength = Math.min(distance4, Math.max(3, (floor - world2.sample(from.x, from.y).height) * 1.8));
  const n = Math.max(2, Math.ceil(stairLength / 1.5));
  const point = (along, side, y2) => [from.x + dx * along - dy * side - world2.width / 2, y2, from.y + dy * along + dx * side - world2.depth / 2];
  const end = { x: from.x + dx * stairLength, y: from.y + dy * stairLength };
  const bottom = world2.sample(end.x, end.y).height + 0.85;
  for (let i = 0; i < n; i++) {
    const a = i / n * stairLength, b = (i + 1) / n * stairLength, y2 = floor + (bottom - floor) * i / n, next = floor + (bottom - floor) * (i + 1) / n;
    quad(markers, point(a, -1.2, y2), point(b, -1.2, y2), point(b, 1.2, y2), point(a, 1.2, y2), [0.5, 0.47, 0.4]);
    quad(markers, point(b, -1.2, y2), point(b, -1.2, next), point(b, 1.2, next), point(b, 1.2, y2), [0.46, 0.43, 0.37]);
  }
  surfaceRibbon(surfaces, world2, [end, to], 2.4, colors.path, 0.85);
}
function beacon(out, world2, p, radius, color) {
  (out.editorMarkers ??= []).push({ point: { x: p.x, y: p.y }, color });
}
var curvePoints = (a, c, b, steps = 18) => Array.from({ length: steps + 1 }, (_, i) => quadraticPoint(a, c, b, i / steps));
function settlementGeometry(world2, state2, {
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
      const x2 = Math.floor((p.x + dx) / step), y2 = Math.floor((p.y + dy) / step);
      const center2 = { x: (x2 + 0.5) * step, y: (y2 + 0.5) * step };
      if (center2.x < 0 || center2.y < 0 || center2.x > world2.width || center2.y > world2.depth) continue;
      if (world2.sample(center2.x, center2.y).water !== null) continue;
      if ((state2.roads || []).some((line) => line.some((point, i) => {
        if (!i) return false;
        const a = line[i - 1], b = point, vx = b.x - a.x, vy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((center2.x - a.x) * vx + (center2.y - a.y) * vy) / (vx * vx + vy * vy || 1)));
        return Math.hypot(center2.x - a.x - vx * t, center2.y - a.y - vy * t) < 17;
      }))) continue;
      paint.set(x2 + "," + y2, { x: x2, y: y2, type });
    }
  }
  for (const stroke of state2.zones || []) applyStroke(stroke.points, stroke.radius, stroke.type);
  const pending = zoneEdits || zoneStrokes.map((points) => ({ type: zoneType, radius: zoneRadius, points }));
  for (const edit of pending) applyStroke(edit.points, edit.radius, edit.type);
  let drawn = 0;
  for (const p of paint.values()) {
    if (p.type === "erase" || drawn++ > 12e3) continue;
    const x2 = p.x * step, y2 = p.y * step;
    const corners = [[x2, y2], [x2 + step, y2], [x2 + step, y2 + step], [x2, y2 + step]].map(([xx, yy]) => worldPos(world2, { x: xx, y: yy }, 0.35));
    quad(zones, ...corners, zonePalette[p.type] || colors.residential);
  }
  for (const lane of state2.localLanes || []) if (lane.points?.length > 1) {
    surfaceRibbon(surfaces, world2, lane.points, 5, colors.path, 0.85, 3);
    if (lane.foundedTurn === state2.turn) ribbon(roadGuides, world2, lane.points, 2.5, [0.99, 0.77, 0.4], 4);
  }
  for (const trail of visibleDesirePaths(state2)) {
    const line = trail.points || [trail.from, trail.to];
    if (line.length > 1) surfaceRibbon(surfaces, world2, line, 4, colors.path, 0.8);
  }
  const graph = state2.roadGraph;
  if (graph?.segments?.length) {
    const network = roadJunctionPolygons(graph, liveCurve);
    for (const polygon of network.shoulders) surfacePolygon(surfaces, world2, polygon, colors.roadEdge, 0.95, 2);
    for (const polygon of network.pavement) surfacePolygon(surfaces, world2, polygon, colors.road, 1.3, 1);
    if (liveCurve) {
      const e = graph.segments.find((e2) => e2.id === liveCurve.id);
      const a = e && nodeAt(graph, e.a), b = e && nodeAt(graph, e.b);
      if (a && b) ribbon(roadGuides, world2, curvePoints(a, liveCurve.control, b), 13, [0.99, 0.77, 0.34], 4.8);
    }
  } else for (const road3 of state2.roads || []) {
    if (road3.length < 2) continue;
    surfaceRibbon(surfaces, world2, road3, 34, colors.roadEdge, 0.95, 2);
    surfaceRibbon(surfaces, world2, road3, 24, colors.road, 1.3, 1);
  }
  for (const house of state2.houses || []) {
    const style = cottageBlueprint(house), model = modelHouses.get?.(house);
    block(markers, world2, house, model?.width ?? style.width, model?.depth ?? style.depth, style.height, style.wall, style.roof, style.orientation, { ...style, foundationOnly: modelHouses.has(house) });
    if (model) accessSteps(markers, surfaces, world2, model.approach);
    if (house.foundedTurn === state2.turn && house.parcel?.vertices?.length > 2)
      ribbon(roadGuides, world2, [...house.parcel.vertices, house.parcel.vertices[0]], 2.5, [1, 0.8, 0.37], 4);
  }
  for (const building of state2.buildings || []) {
    const material = colors[building.type] || colors.wall;
    const { width: size, depth } = buildingFootprint(building.type);
    const height = building.type === "granary" ? 40 : building.type === "market" ? 29 : building.type === "lumber" ? 27 : 24;
    const style = buildingBlueprint(building, state2.civic?.chapter || 0);
    const model = modelBuildings.get(building);
    if (model) {
      if (model.groundSpace) {
        const cs = Math.cos(-model.yaw), sn = Math.sin(-model.yaw);
        const position = (x2, y2) => ({ x: building.x + x2 * cs - y2 * sn, y: building.y + x2 * sn + y2 * cs });
        const w = model.width / 2, d = model.depth / 2;
        const polygon = [[-w * 0.7, -d], [w * 0.7, -d], [w, -d * 0.7], [w, d * 0.7], [w * 0.7, d], [-w * 0.7, d], [-w, d * 0.7], [-w, -d * 0.7]].map(([x2, y2]) => position(x2, y2));
        if (building.type !== "park") {
          const triangles = world2.drapePolygon ? world2.drapePolygon(polygon) : [polygon];
          for (const tri of triangles) {
            const center2 = { x: tri.reduce((n, p) => n + p.x, 0) / tri.length, y: tri.reduce((n, p) => n + p.y, 0) / tri.length };
            if ([...tri, center2].every((p) => world2.sample(p.x, p.y).water === null)) surfacePolygon(surfaces, world2, tri, building.type === "plaza" ? [0.58, 0.55, 0.47] : colors.path, 0.65, building.type === "plaza" ? 5 : 6);
          }
        } else {
          const points = [position(0, -d), position(-w * 0.25, -d * 0.3), position(w * 0.25, d * 0.3), position(0, d)];
          if (points.every((p) => world2.sample(p.x, p.y).water === null)) surfaceRibbon(surfaces, world2, points, 3, colors.path, 0.65);
        }
        if (model.approach) surfaceRibbon(surfaces, world2, [model.approach.from, model.approach.to], 2.4, colors.path, 0.65);
        for (const rect of model.propFoundations || []) block(markers, world2, rect, rect.width, rect.depth, 0, material, colors.roof, 0, { foundationOnly: true, floorY: rect.floor });
      } else {
        for (const rect of model.foundationRects || [{ ...building, width: model.width, depth: model.depth }])
          block(markers, world2, rect, rect.width, rect.depth, 0, material, colors.roof, -model.yaw, { foundationOnly: true, floorY: model.origin[1] });
        accessSteps(markers, surfaces, world2, model.approach);
      }
    } else block(markers, world2, building, size, depth, height, material, colors.roof, style.orientation, style);
  }
  for (const row of cropRows) {
    for (const dx of [-2, 2]) {
      surfaceRibbon(surfaces, world2, [{ x: row.x + dx, y: row.y - 4 }, { x: row.x + dx, y: row.y + 4 }], 1.7, [0.36, 0.29, 0.18], 0.9, 0);
      for (const dy of [-3, -1, 1, 3]) {
        const p = worldPos(world2, { x: row.x + dx, y: row.y + dy }, 1);
        addTri(markers, [p[0] - 1, p[1], p[2]], [p[0] + 1, p[1], p[2]], [p[0], p[1] + 3, p[2]], [0.64, 0.58, 0.3]);
      }
    }
  }
  if (mode === "road") {
    if (touchFocus && Number.isFinite(touchFocus.x) && Number.isFinite(touchFocus.y))
      beacon(roadGuides, world2, touchFocus, 5, [1, 0.91, 0.61], [0.32, 0.42, 0.3], 7);
    if (graph) {
      for (const n of graph.nodes) beacon(
        roadGuides,
        world2,
        n,
        n.id === graph.hubId ? 8 : 6,
        n.id === graph.hubId ? [0.97, 0.72, 0.37] : [0.86, 0.94, 0.77]
      );
      for (const e of graph.segments) {
        if (!e.control) continue;
        const a = nodeAt(graph, e.a), b = nodeAt(graph, e.b);
        if (a && b) beacon(
          roadGuides,
          world2,
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
      ribbon(roadGuides, world2, draftLine, 26, [0.99, 0.72, 0.37], 5);
      ribbon(roadGuides, world2, draftLine, 12, [1, 0.9, 0.58], 5.7);
    }
    for (const p of draft?.anchors || []) beacon(roadGuides, world2, p, 7, [1, 0.91, 0.6], [0.36, 0.33, 0.22], 13);
    for (const bend of draft ? curvedSegments(draft) : [])
      beacon(roadGuides, world2, bend.anchor, 7, [1, 0.67, 0.32], [0.42, 0.25, 0.12], 15);
    if (pendingControl && draft?.anchors?.length) {
      const anchor = draft.anchors.at(-1);
      ribbon(roadGuides, world2, [anchor, pendingControl], 3, [1, 0.82, 0.48], 10);
      beacon(roadGuides, world2, pendingControl, 7, [1, 0.57, 0.21], [0.4, 0.22, 0.1], 16);
    }
    if (liveGesture) {
      const { start, end, control } = liveGesture;
      if (start && end && control) {
        const shape = curvePoints(start, control, end);
        if (Math.hypot(end.x - start.x, end.y - start.y) > 8)
          ribbon(roadGuides, world2, shape, 14, [0.99, 0.77, 0.37], 6);
        ribbon(roadGuides, world2, [end, control], 3, [0.99, 0.85, 0.55], 11);
        beacon(roadGuides, world2, end, 7, [1, 0.94, 0.66], [0.31, 0.35, 0.22], 16);
        beacon(roadGuides, world2, control, 7, [1, 0.55, 0.22], [0.39, 0.22, 0.12], 16);
      }
    }
  }
  return {
    editorMarkers: roadGuides.editorMarkers || [],
    surfaceOffsets: roadVisualOffsets(world2, state2, surfaces, surfaces.surfaceKinds, liveCurve),
    surfaceKinds: new Float32Array(surfaces.surfaceKinds),
    surfaces: new Float32Array(surfaces),
    zones: new Float32Array(zones),
    structures: new Float32Array(markers),
    guides: new Float32Array(roadGuides),
    counts: {
      roads: (state2.roads || []).length,
      houses: (state2.houses || []).length,
      buildings: (state2.buildings || []).length,
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
function trackballVector(x2, y2, viewport) {
  const w = Math.max(1, viewport.width), h = Math.max(1, viewport.height);
  const size = Math.max(80, Math.min(w, h) * 1.2);
  const nx = (x2 - (viewport.left + w / 2)) * 2 / size;
  const ny = (viewport.top + h / 2 - y2) * 2 / size;
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
  const cross2 = [
    v[1] * w[2] - v[2] * w[1],
    v[2] * w[0] - v[0] * w[2],
    v[0] * w[1] - v[1] * w[0]
  ];
  const magnitude = Math.hypot(...cross2);
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
    yawDelta: -cross2[1] * scale - twist * 0.78,
    pitchDelta: cross2[0] * scale,
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
    const length = v.getUint32(offset, true), type = v.getUint32(offset + 4, true);
    if (length < 0 || offset + 8 + length > buffer.byteLength) throw Error("Corrupt model chunk");
    if (type === 1313821514) document2 = JSON.parse(decoder.decode(new Uint8Array(buffer, offset + 8, length)));
    if (type === 5130562) binary = buffer.slice(offset + 8, offset + 8 + length);
    offset += 8 + length;
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
    const [x2, y2, z, w] = q, uv = [
      y2 * v2[2] - z * v2[1],
      z * v2[0] - x2 * v2[2],
      x2 * v2[1] - y2 * v2[0]
    ];
    const uuv = [y2 * uv[2] - z * uv[1], z * uv[0] - x2 * uv[2], x2 * uv[1] - y2 * uv[0]];
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
        const base2 = material.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1];
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
          const ab = b.map((x2, j) => x2 - a[j]), ac = c.map((x2, j) => x2 - a[j]);
          const n = [
            ab[1] * ac[2] - ab[2] * ac[1],
            ab[2] * ac[0] - ab[0] * ac[2],
            ab[0] * ac[1] - ab[1] * ac[0]
          ];
          const length = Math.hypot(...n) || 1, normal = n.map((x2) => x2 / length);
          triangle.forEach((j, k) => {
            const p = points[k], vertexColor = colors2 ? [
              colors2.read(j, 0),
              colors2.read(j, 1),
              colors2.read(j, 2)
            ] : [1, 1, 1];
            const color = base2.slice(0, 3).map((x2, k2) => Math.min(1, Math.max(0.02, x2 * vertexColor[k2])));
            output.push(...p, ...color, ...normal);
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
function instantiateKenney(world2, models, { showReference = false, maxTrees = 650 } = {}) {
  const output = [];
  function put(name, x2, z, height, yaw) {
    const model = models[name];
    if (!model) return;
    const span = Math.max(1e-3, model.max[1] - model.min[1]);
    const scale = height / span;
    const base2 = world2.sample(x2, z).height;
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    const data = model.vertices;
    for (let i = 0; i < data.length; i += 9) {
      const px = (data[i] - (model.min[0] + model.max[0]) / 2) * scale;
      const py = (data[i + 1] - model.min[1]) * scale;
      const pz = (data[i + 2] - (model.min[2] + model.max[2]) / 2) * scale;
      const nx = data[i + 6], ny = data[i + 7], nz = data[i + 8];
      output.push(
        x2 - world2.width / 2 + px * cs - pz * sn,
        base2 + py,
        z - world2.depth / 2 + px * sn + pz * cs,
        ...harmonizeKenneyColor(name, [data[i + 3], data[i + 4], data[i + 5]]),
        nx * cs - nz * sn,
        ny,
        nx * sn + nz * cs
      );
    }
  }
  const mix2 = ["oak", "pine", "birch"];
  let treeModels = 0;
  const drawnTrees = previewTrees(world2, maxTrees);
  for (let i = 0; i < drawnTrees.length; i++) {
    const t = drawnTrees[i], which = mix2[i % mix2.length];
    if (!models[which]) continue;
    put(which, t.x, t.z, t.h, i * 1.61803398875 % 6.283);
    treeModels++;
  }
  if (models.rock) for (let i = 0; i < 23; i++) {
    const x2 = (0.09 + i * 73 % 79 / 100) * world2.width;
    const z = (0.13 + i * 47 % 69 / 100) * world2.depth;
    const terrain3 = world2.sample(x2, z);
    if (terrain3.water !== null || world2.slope(x2, z) > 1.2) continue;
    put("rock", x2, z, 6 + i % 5 * 2, i * 0.47);
  }
  if (showReference && models.tower) {
    const x2 = world2.width * 0.36, z = world2.depth * 0.58;
    if (world2.sample(x2, z).water === null) put("tower", x2, z, 34, 0.48);
  }
  return { vertices: new Float32Array(output), treeModels };
}
function instantiateKenneyTerrain(world2, models, { density = 1 } = {}) {
  const land = [], water3 = [];
  const size = Math.min(world2.width, world2.depth);
  const hash = (i) => {
    let v = i * 1664525 + 1013904223 + world2.options.seed.length * 374761393 >>> 0;
    v = Math.imul(v ^ v >>> 13, 1274126177);
    return ((v ^ v >>> 16) >>> 0) / 4294967295;
  };
  function instance(key, x2, z, footprint, rotation, category = "land", faceRise = 0) {
    const model = models[key];
    if (!model) return;
    const destination = category === "water" ? water3 : land;
    const span = Math.max(1e-4, model.max[0] - model.min[0], model.max[2] - model.min[2]);
    const verticalSpan = Math.max(1e-3, model.max[1] - model.min[1]);
    const scale = footprint / span, cs = Math.cos(rotation), sn = Math.sin(rotation);
    const centerX = (model.min[0] + model.max[0]) / 2, centerZ = (model.min[2] + model.max[2]) / 2;
    const reference = world2.sample(x2, z), level = reference.water;
    if (category === "water" && level === null) return;
    const input = model.vertices;
    for (let i = 0; i + 26 < input.length; i += 27) {
      const triangle = [], terrain3 = [];
      for (let j = 0; j < 3; j++) {
        const v = i + j * 9;
        const dx = (input[v] - centerX) * scale, dz = (input[v + 2] - centerZ) * scale;
        const X = x2 + dx * cs - dz * sn, Z = z + dx * sn + dz * cs;
        const surface = world2.sample(X, Z);
        const up = Math.max(0, input[v + 1] - model.min[1]);
        let y2 = surface.height + 0.11 + up * Math.min(0.33, scale * 0.042);
        if (category === "water") y2 = level + 0.74;
        if (category === "cliff") {
          y2 = reference.height - faceRise * 0.42 + up / verticalSpan * faceRise;
        }
        const nx = input[v + 6], ny = input[v + 7], nz = input[v + 8];
        const rgb = harmonizeKenneyColor(key, [input[v + 3], input[v + 4], input[v + 5]]);
        triangle.push(
          X - world2.width / 2,
          y2,
          Z - world2.depth / 2,
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
    const x2 = (0.035 + 0.93 * hash(i * 19 + 3)) * world2.width;
    const z = (0.035 + 0.93 * hash(i * 19 + 7)) * world2.depth;
    const local = world2.sample(x2, z);
    if (local.water !== null || world2.slope(x2, z) > 0.24) continue;
    instance("ground", x2, z, 9 + hash(i * 19 + 11) * 9, hash(i * 19 + 17) * Math.PI * 2);
  }
  if (models.waterTile) for (const stream of world2.rivers) for (let i = 2; i < stream.points.length - 2; i += 3) {
    const point = stream.points[i], a = stream.points[i - 1], b = stream.points[i + 1];
    if (world2.sample(point.x, point.z).kind !== "river") continue;
    instance(
      "waterTile",
      point.x,
      point.z,
      stream.width * 0.9,
      Math.atan2(b.z - a.z, b.x - a.x),
      "water"
    );
  }
  if (models.bank || models.beach) for (const lake of world2.lakes) for (let i = 0; i < lake.spine.length; i += density < 0.5 ? 4 : 2) {
    const p = lake.spine[i], angle = (i + lake.x) * 2.4;
    const x2 = p.x + Math.cos(angle) * p.r * 1.12, z = p.z + Math.sin(angle) * p.r * 1.12;
    if (world2.sample(x2, z).water !== null) continue;
    instance(i % 3 === 0 && models.beach ? "beach" : "bank", x2, z, 10 + hash(i * 17 + Math.round(lake.x)) * 8, angle);
  }
  if (models.cliff) for (let i = 0; i < Math.max(20, Math.round(260 * density)); i++) {
    const x2 = (0.045 + 0.91 * hash(1400 + i * 23)) * world2.width;
    const z = (0.045 + 0.91 * hash(1401 + i * 23)) * world2.depth;
    const sample = world2.sample(x2, z);
    if (sample.water !== null) continue;
    const d = 9, west = world2.sample(x2 - d, z).height, east = world2.sample(x2 + d, z).height;
    const north = world2.sample(x2, z - d).height, south = world2.sample(x2, z + d).height;
    const rise = Math.max(west, east, north, south) - Math.min(west, east, north, south);
    const grade = world2.slope(x2, z);
    if (grade < 0.64 || rise < 12) continue;
    const angle = Math.atan2(south - north, east - west);
    const height = Math.min(36, Math.max(10, rise * 0.89));
    instance("cliff", x2, z, Math.min(23, Math.max(12, height * 0.7)), angle, "cliff", height);
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
  let counts = [0, 0, 0, 0, 0, 0, 0, 0, 0], world2 = initialWorld;
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
    camera.zoom = Math.max(world2.width / aspect, world2.depth) * 0.71;
    render();
  }
  function upload(newWorld, reset = true) {
    world2 = newWorld;
    const resolution = terrainResolution(world2, { lite, gameplay });
    contactWorld = createTerrainSurface(world2, ...resolution);
    const geometry = createWorldMesh(world2, ...resolution, {
      trees: !presentation && !["oak", "pine", "birch"].some((key) => kenney[key]),
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
    const results = await Promise.allSettled(kitNames.map((key) => fetchKenneyModel(key)));
    if (disposed) return;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        kenney[kitNames[i]] = r.value;
        loadedAssets++;
      }
    });
    if (loadedAssets) try {
      upload(world2, false);
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
      Math.max(world2.width, world2.depth) * 0.08,
      Math.max(world2.width, world2.depth) * 2.4
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
    let x2 = camera.focusX + xx * cs - depth * sn, z = camera.focusZ + xx * sn + depth * cs;
    for (let i = 0; i < 7; i++) {
      const ground = contactWorld.sample(x2 + world2.width / 2, z + world2.depth / 2).height;
      depth = (Math.cos(camera.pitch) * (ground - 17) - yy) / Math.max(0.2, Math.sin(camera.pitch));
      x2 = camera.focusX + xx * cs - depth * sn;
      z = camera.focusZ + xx * sn + depth * cs;
    }
    return { x: x2 + world2.width / 2, y: z + world2.depth / 2 };
  }
  function focusOn(x2, z, zoom = null) {
    camera.focusX = clamp(x2 - world2.width / 2, -world2.width / 2, world2.width / 2);
    camera.focusZ = clamp(z - world2.depth / 2, -world2.depth / 2, world2.depth / 2);
    if (zoom !== null) camera.zoom = clamp(
      zoom,
      Math.max(world2.width, world2.depth) * 0.08,
      Math.max(world2.width, world2.depth) * 2.4
    );
    render();
  }
  function panBy(dx, dy) {
    const rect = canvas.getBoundingClientRect();
    const horizontal = -dx / Math.max(1, rect.height) * 2 * camera.zoom;
    const vertical = -dy / Math.max(1, rect.height) * 2 * camera.zoom / Math.max(0.22, Math.sin(camera.pitch));
    const cs = Math.cos(camera.yaw), sn = Math.sin(camera.yaw);
    camera.focusX = clamp(camera.focusX + horizontal * cs - vertical * sn, -world2.width / 2, world2.width / 2);
    camera.focusZ = clamp(camera.focusZ + horizontal * sn + vertical * cs, -world2.depth / 2, world2.depth / 2);
    render();
  }
  function navigateTouches(change) {
    if (!change) return;
    camera.yaw += change.yawDelta;
    camera.pitch = clamp(camera.pitch + change.pitchDelta, 0.32, 1.47);
    camera.zoom = clamp(
      camera.zoom * change.zoomRatio,
      Math.max(world2.width, world2.depth) * 0.035,
      Math.max(world2.width, world2.depth) * 2.4
    );
    render();
  }
  function homeView(x2, z, zoom = null) {
    camera.yaw = 0.71;
    camera.pitch = 0.86;
    focusOn(x2, z, zoom);
  }
  function setSettlement(state2, {
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
    settlement = presentation ? structuredClone(state2) : state2;
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
  upload(world2);
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
function homePlacement(world2, house, entries, preferredID = null) {
  const style = cottageBlueprint(house), id = preferredID ?? HOME_IDS[visualIdentity(world2.options?.seed ?? world2.seed ?? 0, house) % HOME_IDS.length];
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;
  const extent = [0, 1, 2].map((i) => Math.max(Math.abs(entry.boundsMin[i]), Math.abs(entry.boundsMax[i])) * 2);
  const scale = Math.min((style.width - 1) / extent[0], (style.depth - 1) / extent[2], style.height);
  if (!Number.isFinite(scale) || scale <= 0) return null;
  const cs = Math.cos(style.orientation), sn = Math.sin(style.orientation);
  const transform = (x2, z) => ({ x: house.x + (x2 * cs - z * sn) * scale, y: house.y + (x2 * sn + z * cs) * scale });
  const polygon = house.parcel?.vertices;
  const inside2 = (p) => {
    let yes = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if (a.y > p.y !== b.y > p.y && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) yes = !yes;
    }
    return yes;
  };
  const footprint = [[-extent[0] / 2, -extent[2] / 2], [extent[0] / 2, -extent[2] / 2], [extent[0] / 2, extent[2] / 2], [-extent[0] / 2, extent[2] / 2]].map(([x2, z]) => transform(x2, z));
  if (polygon?.length > 2 && !footprint.every(inside2)) return null;
  const foundation = resolveFoundation(world2, house, extent[0] * scale, extent[2] * scale, style.orientation);
  if (foundation.flooded) return null;
  const entrance = transform(entry.entrance.position[0], entry.entrance.position[2]);
  return { id, scale, width: extent[0] * scale, depth: extent[2] * scale, yaw: -style.orientation, origin: [house.x - world2.width / 2, foundation.floor, house.y - world2.depth / 2], entrance, footprint };
}
function homeApproach(world2, house, placement) {
  const from = placement?.entrance, to = house.entrance;
  if (!from || !to) return null;
  const distance4 = Math.hypot(to.x - from.x, to.y - from.y);
  if (distance4 < 0.5 || distance4 > 60) return null;
  const dx = (to.x - from.x) / distance4, dy = (to.y - from.y) / distance4;
  const count2 = Math.ceil(distance4 / 2) + 1;
  const samples = Array.from({ length: count2 }, (_, i) => {
    const t = i / (count2 - 1);
    return { x: from.x + dx * distance4 * t, y: from.y + dy * distance4 * t };
  });
  for (const p of samples) for (const side of [-1, 0, 1]) {
    const x2 = p.x - dy * side, y2 = p.y + dx * side;
    if (x2 < 0 || y2 < 0 || x2 > world2.width || y2 > world2.depth || world2.sample(x2, y2).water !== null) return null;
  }
  return { from, to, distance: distance4, dx, dy, floor: placement.origin[1] + (placement.entranceHeight || 0), samples };
}
var WORKING_FACILITIES = ["farm", "lumber", "smith", "granary"];
var PUBLIC_FACILITIES = ["market", "plaza", "park"];
var FACILITY_TYPES = [...WORKING_FACILITIES, ...PUBLIC_FACILITIES];
function facilityPlacement(world2, building, state2, entries) {
  const entry = entries.find((e) => e.id === "facility-" + building.type);
  if (!entry) return null;
  const envelope = buildingFootprint(building.type), extent = [0, 1, 2].map((i) => Math.max(Math.abs(entry.boundsMin[i]), Math.abs(entry.boundsMax[i])) * 2);
  let approach = null, nearest = Infinity;
  for (const line of [...state2.roads || [], ...(state2.localLanes || []).map((l) => l.points || [])]) for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((building.x - a.x) * dx + (building.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const p = { x: a.x + dx * t, y: a.y + dy * t }, distance4 = Math.hypot(p.x - building.x, p.y - building.y);
    if (distance4 < nearest) {
      nearest = distance4;
      approach = p;
    }
  }
  const orientation = approach ? Math.atan2(approach.y - building.y, approach.x - building.x) - Math.PI / 2 : buildingBlueprint(building).orientation;
  const scale = Math.min((envelope.width - 2) / extent[0], (envelope.depth - 2) / extent[2], 48 / (entry.boundsMax[1] - entry.boundsMin[1]));
  const width = extent[0] * scale, depth = extent[2] * scale, foundation = resolveFoundation(world2, building, width, depth, orientation);
  if (foundation.flooded || !Number.isFinite(scale) || scale <= 0) return null;
  const [ex, , ez] = entry.entrance.position, cs = Math.cos(orientation), sn = Math.sin(orientation);
  const foundationRects = entry.foundationRects?.map(([x2, z, w, d]) => ({ x: building.x + (x2 * cs - z * sn) * scale, y: building.y + (x2 * sn + z * cs) * scale, width: w * scale, depth: d * scale }));
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
    origin: [building.x - world2.width / 2, foundation.floor, building.y - world2.depth / 2],
    entrance: { x: building.x + (ex * cs - ez * sn) * scale, y: building.y + (ex * sn + ez * cs) * scale },
    approachTarget: approach
  };
}
function farmlandRows(world2, state2) {
  const farms = (state2.buildings || []).filter((b) => b.type === "farm"), seen = /* @__PURE__ */ new Set(), rows = [];
  for (const farm of farms) for (let x2 = Math.ceil((farm.x - 92) / 12) * 12; x2 <= farm.x + 92; x2 += 12) for (let y2 = Math.ceil((farm.y - 92) / 12) * 12; y2 <= farm.y + 92; y2 += 12) {
    const key = x2 + "," + y2;
    if (seen.has(key)) continue;
    seen.add(key);
    if (Math.hypot(x2 - farm.x, y2 - farm.y) > 92) continue;
    if ((state2.houses || []).some((h) => Math.hypot(h.x - x2, h.y - y2) < 20)) continue;
    if ((state2.buildings || []).some((b) => Math.hypot(b.x - x2, b.y - y2) < Math.max(buildingFootprint(b.type).width, buildingFootprint(b.type).depth) * 0.72)) continue;
    const contacts = [{ x: x2 - 4, y: y2 - 4 }, { x: x2 + 4, y: y2 - 4 }, { x: x2 + 4, y: y2 + 4 }, { x: x2 - 4, y: y2 + 4 }, { x: x2, y: y2 }];
    if (contacts.some((p) => p.x < 0 || p.y < 0 || p.x > world2.width || p.y > world2.depth || zoneAt(state2, p) !== "farmland" || world2.sample(p.x, p.y).water !== null)) continue;
    const blocked = [...(state2.roads || []).map((points) => ({ points, radius: 18 })), ...(state2.localLanes || []).map((l) => ({ points: l.points || [], radius: 7 }))].some((line) => line.points.slice(1).some((b, i) => {
      const a = line.points[i], dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((x2 - a.x) * dx + (y2 - a.y) * dy) / (dx * dx + dy * dy || 1)));
      return Math.hypot(x2 - a.x - dx * t, y2 - a.y - dy * t) < line.radius;
    }));
    if (!blocked) rows.push({ x: x2, y: y2 });
  }
  return rows;
}

// environment-next/review-renderer.mjs
function mountWorld3D2(canvas, world2, options = {}) {
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
  const bind = (state2, c) => ({ houses: new Map((state2.houses || []).flatMap((h, i) => c.homes[i] ? [[h, c.homes[i]]] : [])), buildings: new Map((state2.buildings || []).flatMap((b, i) => c.facilities[i] ? [[b, c.facilities[i]]] : [])), cropRows: c.cropRows });
  const buffers = /* @__PURE__ */ new Map(), registry = createModelRegistry(new THREE3.GLTFLoader()), models = /* @__PURE__ */ new Map();
  let entries = [], disposed = false, contact = world2, terrain3 = null, refresh = () => {
  }, loaded2 = 0;
  const raycaster = new THREE3.Raycaster();
  function updateCamera(view, rect) {
    const aspect = rect.width / Math.max(1, rect.height), { yaw, pitch, zoom, focusX, focusZ } = view;
    camera.left = -zoom * aspect;
    camera.right = zoom * aspect;
    camera.top = zoom;
    camera.bottom = -zoom;
    const focus2 = new THREE3.Vector3(focusX, view.focusY ?? 17, focusZ);
    camera.position.copy(focus2).add(new THREE3.Vector3(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(2700));
    camera.up.set(0, 1, 0);
    camera.lookAt(focus2);
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
    setSettlement(surface, state2, onRefresh) {
      refresh = onRefresh;
      contact = surface;
      const key = JSON.stringify([surfaceVersion, models.size, state2.houses, state2.buildings, state2.roads, state2.localLanes, state2.zones]);
      if (key === lastPlacementKey && cached) return bind(state2, cached);
      clearBatches();
      let groundContactError = 0;
      const objects = [], represented = /* @__PURE__ */ new Map();
      for (const house of state2.houses || []) {
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
      for (const building of state2.buildings || []) {
        const p = facilityPlacement(surface, building, state2, entries), source = p && models.get(p.id);
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
                const box = new THREE3.Box3().setFromObject(node), center2 = box.getCenter(new THREE3.Vector3()), size = box.getSize(new THREE3.Vector3());
                const rect = { x: center2.x + surface.width / 2, y: center2.z + surface.depth / 2, width: size.x, depth: size.z };
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
      if (nature) for (const p of naturePlacements(surface, state2, { low })) {
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
      const cropRows = farmlandRows(surface, state2);
      canvas.dataset.cropRows = String(cropRows.length);
      cached = { homes: (state2.houses || []).map((h) => represented.get(h) || null), facilities: (state2.buildings || []).map((b) => representedFacilities.get(b) || null), cropRows };
      lastPlacementKey = key;
      return bind(state2, cached);
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
    screenToWorld(x2, y2, view) {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height || !terrain3) return null;
      updateCamera(view, rect);
      raycaster.setFromCamera(new THREE3.Vector2((x2 - rect.left) / rect.width * 2 - 1, 1 - (y2 - rect.top) / rect.height * 2), camera);
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
    controller = mountWorld3D(canvas, world2, { ...options, presentation: backend });
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
  return { ...controller, environmentSample: (x2, z) => environment.sample?.(x2, z), setVisualInputs: (inputs) => {
    environment.setVisualInputs?.(inputs);
    controller.render();
  } };
}

// environment-next/inspection-controls.mjs
function attachInspectionControls(canvas, viewer2, world2) {
  const points = /* @__PURE__ */ new Map(), limit = Math.max(world2.width, world2.depth), clamp7 = (v, a, b) => Math.max(a, Math.min(b, v));
  let gesture = null;
  const close = () => viewer2.getCamera().zoom < limit * 0.08, stop = (e) => {
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
    const v = viewer2.getCamera(), rect = canvas.getBoundingClientRect();
    if (points.size === 2 && gesture) {
      const change = advanceCameraGesture(gesture, [...points.values()]);
      viewer2.setCamera({ ...v, yaw: v.yaw + change.yawDelta, pitch: clamp7(v.pitch + change.pitchDelta, 0.32, 1.47), zoom: clamp7(v.zoom * change.zoomRatio, 6, limit * 2.4) });
    } else if (points.size === 1) viewer2.setCamera({ ...v, yaw: v.yaw - (e.clientX - last.x) / Math.max(120, rect.width) * Math.PI * 1.5, pitch: clamp7(v.pitch + (e.clientY - last.y) / Math.max(180, rect.height) * 1.8, 0.32, 1.47) });
  };
  const up = (e) => {
    if (!points.has(e.pointerId)) return;
    stop(e);
    points.delete(e.pointerId);
    if (points.size !== 2) gesture = null;
  };
  const wheel = (e) => {
    if (!close()) return;
    stop(e);
    const v = viewer2.getCamera();
    viewer2.setCamera({ ...v, zoom: clamp7(v.zoom * (e.deltaY > 0 ? 1.12 : 1 / 1.12), 6, limit * 2.4) });
  };
  const handlers = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: up, lostpointercapture: up, wheel };
  for (const [type, fn] of Object.entries(handlers)) canvas.addEventListener(type, fn, { capture: true, passive: false });
  return () => {
    for (const [type, fn] of Object.entries(handlers)) canvas.removeEventListener(type, fn, true);
    points.clear();
    gesture = null;
  };
}

// environment-next/review-page.mjs
var params = new URLSearchParams(location.search);
var $ = (id) => document.getElementById(id);
var seed = params.get("seed") || "WILLOW-1048";
var quality = params.get("quality") || "normal";
var count = Number(params.get("count")) || 0;
var baseline = params.get("treatment") === "before";
var previous = params.get("treatment") === "previous";
for (const [id, value] of Object.entries({ seed, quality, count: String(count), treatment: baseline ? "before" : previous ? "previous" : "after" })) $(id).value = value;
var fixture = count ? settlementRenderFixture(count) : null;
var world = fixture?.world || createWorld({ seed, size: "small", lakes: 2, rivers: 1, hills: 70, cliffs: 65 });
var center = { x: world.width * 0.5, y: world.depth * 0.5 };
var best = Infinity;
for (let z = 100; z < world.depth - 100; z += 30) for (let x2 = 100; x2 < world.width - 100; x2 += 30) {
  const points = [{ x: x2 - 75, y: z }, { x: x2 + 75, y: z }, { x: x2, y: z - 65 }, { x: x2 + 45, y: z + 65 }, { x: x2, y: z }];
  if (points.every((p) => world.sample(p.x, p.y).water === null) && world.slope(x2, z) < best) {
    best = world.slope(x2, z);
    center = { x: x2, y: z };
  }
}
var { x, y } = center;
var nodes = [{ id: 1, x, y }, { id: 2, x: x - 75, y }, { id: 3, x: x + 75, y }, { id: 4, x, y: y - 65 }, { id: 5, x: x + 45, y: y + 65 }];
var state = fixture?.state || { turn: 2, houses: [], buildings: [], roads: [], roadGraph: { hubId: 1, nodes, segments: [{ id: 1, a: 1, b: 2 }, { id: 2, a: 1, b: 3, control: { x: x + 50, y: y - 20 } }, { id: 3, a: 1, b: 4 }, { id: 4, a: 1, b: 5 }] }, localLanes: [{ points: [{ x: x - 75, y: y + 30 }, { x: x - 20, y: y + 40 }] }], zones: [], desirePaths: [] };
var beforeState = JSON.stringify(state);
var viewer = mountWorld3D2($("environment"), world, { baseline, previous, quality: quality === "low" ? "lite" : "game", animateWater: params.get("motion") !== "off", contextCenter: count ? null : center, onAssets: () => {
  $("status").textContent = "Local models ready \xB7 " + (baseline ? "existing environment" : previous ? "published A1 surface" : "fine-detail A2 surface");
} });
viewer.setSettlement(state);
var releaseInspection = attachInspectionControls($("environment"), viewer, world);
function focus(x2, y2, zoom, pitch = 0.65) {
  viewer.focusOn(x2, y2, zoom);
  viewer.setCamera({ ...viewer.getCamera(), pitch, yaw: 0.6, focusY: 17 });
}
var views = { ground: () => {
  const x2 = center.x - 52, z = center.y - 45;
  viewer.focusOn(x2, z);
  viewer.setCamera({ ...viewer.getCamera(), zoom: 7, pitch: 1.1, yaw: 0.6, focusY: world.sample(x2, z).height });
}, detail: () => {
  viewer.focusOn(center.x - 52, center.y - 52);
  viewer.setCamera({ ...viewer.getCamera(), zoom: 17, pitch: 0.58, yaw: 0.6 });
}, wide: () => focus(world.width * 0.5, world.depth * 0.5, world.depth * 0.7, 0.85), near: () => focus(center.x, center.y, 105, 0.42), junction: () => focus(center.x, center.y, 110, 0.78), forest: () => {
  const p = world.trees.find((t) => world.sample(t.x, t.z).water === null) || { x: center.x, z: center.y };
  focus(p.x, p.z, 130, 0.55);
}, cliff: () => {
  let p = center, slope = 0;
  for (let z = 30; z < world.depth; z += 20) for (let x2 = 30; x2 < world.width; x2 += 20) if (world.sample(x2, z).water === null && world.slope(x2, z) > slope) {
    p = { x: x2, y: z };
    slope = world.slope(x2, z);
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
  action();
  params.set("view", id);
};
var benchmarkCamera = { yaw: 0.71, pitch: 0.86, zoom: world.depth * 0.84, focusX: world.width * -0.03, focusZ: world.depth * -0.02 };
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
var running = false;
var cancel = false;
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
window.environmentHarness = { viewer, world, state, center, measure, serializationUnchanged: () => beforeState === JSON.stringify(state) };
window.addEventListener("pagehide", () => {
  cancel = true;
  releaseInspection();
  viewer.dispose();
});

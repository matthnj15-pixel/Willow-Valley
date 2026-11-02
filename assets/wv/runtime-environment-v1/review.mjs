// render-adoption/world/review.mjs
import * as T7 from "../../vendor/three.module.mjs";

// foundation-system.mjs
function resolveFoundation(world2, center, width, depth, orientation = 0) {
  const cs = Math.cos(orientation), sn = Math.sin(orientation);
  const corners = [[-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth / 2], [-width / 2, depth / 2]].map(([x, y]) => ({ x: center.x + x * cs - y * sn, y: center.y + x * sn + y * cs }));
  const perimeter = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i], b = corners[(i + 1) % 4];
    const count = Math.max(4, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3));
    const points = world2.contactTrace ? world2.contactTrace(a, b) : Array.from({ length: count + 1 }, (_, k) => ({ x: a.x + (b.x - a.x) * k / count, y: a.y + (b.y - a.y) * k / count }));
    perimeter.push(...points.slice(0, -1));
  }
  const contacts = perimeter.map((p) => ({ ...p, ...world2.sample(p.x, p.y) }));
  const interior = world2.drapePolygon ? world2.drapePolygon(corners).flat() : [center];
  const heights = [...contacts.map((p) => p.height), ...interior.map((p) => world2.sample(p.x, p.y).height)];
  return {
    corners,
    perimeter: contacts,
    floor: Math.max(...heights) + 0.8,
    relief: Math.max(...heights) - Math.min(...heights),
    flooded: contacts.some((p) => p.water !== null)
  };
}

// settlement-architecture.mjs
var clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
var noise = (n) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
var WALLS = [[0.86, 0.78, 0.63], [0.77, 0.7, 0.56], [0.91, 0.84, 0.7], [0.71, 0.69, 0.59], [0.82, 0.73, 0.62]];
var ROOFS = [[0.48, 0.32, 0.24], [0.36, 0.3, 0.26], [0.57, 0.39, 0.25], [0.39, 0.43, 0.38], [0.53, 0.29, 0.23]];
function cottageBlueprint(house) {
  const seed2 = Math.round(house.x) * 31 + Math.round(house.y) * 47 + (house.foundedTurn || 0) * 101;
  const era = clamp(Math.trunc(house.foundedEra || 0), 0, 3);
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
    era: clamp(building.foundedEra ?? chapter, 0, 3),
    orientation: noise(seed2 + 15) * Math.PI * 0.4,
    roofRise: 0.45 + noise(seed2 + 2) * 0.22
  };
}
function buildingFootprint(type) {
  const width = type === "farm" || type === "market" ? 48 : type === "granary" ? 32 : 35;
  return { width, depth: width * 0.9 };
}

// road-network.mjs
var BOUNDS = { w: 1200, h: 900 };
function setRoadBounds(w, h) {
  BOUNDS.w = w;
  BOUNDS.h = h;
}
var CURVE_SAMPLES = 14;
var nodeAt = (g, id) => g.nodes.find((n) => n.id === id) || null;
var lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
function quadraticPoint(a, c, b, t) {
  return lerp(lerp(a, c, t), lerp(c, b, t), t);
}
function edgePoints(g, e) {
  const a = nodeAt(g, e.a), b = nodeAt(g, e.b);
  if (!a || !b) return [];
  if (!e.control) return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
  return Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => quadraticPoint(a, e.control, b, i / CURVE_SAMPLES));
}
function graphLines(g, reachableOnly = false) {
  const ids = reachableOnly ? connectedEdgeIds(g) : null;
  return g.segments.filter((e) => !ids || ids.has(e.id)).map((e) => edgePoints(g, e)).filter((l) => l.length >= 2);
}
function createGraph(roads) {
  const g = { nodes: [], segments: [], nextId: 1, hubId: null };
  const cache = /* @__PURE__ */ new Map();
  function getOrCreate(p) {
    const key = Math.round(p.x * 100) / 100 + ":" + Math.round(p.y * 100) / 100;
    if (cache.has(key)) return cache.get(key);
    const n = { id: g.nextId++, x: p.x, y: p.y };
    g.nodes.push(n);
    cache.set(key, n.id);
    return n.id;
  }
  for (const line of roads) {
    if (!Array.isArray(line)) continue;
    for (let i = 0; i < line.length; i++) {
      const id = getOrCreate(line[i]);
      if (g.hubId === null) g.hubId = id;
      if (i === 0) continue;
      const a = getOrCreate(line[i - 1]);
      if (a !== id) g.segments.push({ id: g.nextId++, a, b: id, control: null });
    }
  }
  return g;
}
function ensureGraph(state2) {
  if (!state2.roadGraph) {
    state2.roadGraph = createGraph(state2.roads);
    state2.roads = graphLines(state2.roadGraph);
  }
  return state2.roadGraph;
}
function connectedEdgeIds(g) {
  const adjacency = new Map(g.nodes.map((n) => [n.id, []]));
  for (const e of g.segments) {
    adjacency.get(e.a)?.push(e);
    adjacency.get(e.b)?.push(e);
  }
  const visited = /* @__PURE__ */ new Set([g.hubId]), queue = [g.hubId], active = /* @__PURE__ */ new Set();
  for (let i = 0; i < queue.length; i++) {
    for (const e of adjacency.get(queue[i]) || []) {
      active.add(e.id);
      const other = e.a === queue[i] ? e.b : e.a;
      if (!visited.has(other)) {
        visited.add(other);
        queue.push(other);
      }
    }
  }
  return active;
}

// road-surface.mjs
function sampleRoadAlignment(a, control, b, spacing = 6) {
  const distance5 = (p, q) => Math.hypot(q.x - p.x, q.y - p.y);
  const length = control ? distance5(a, control) + distance5(control, b) : distance5(a, b);
  const count = Math.max(1, Math.ceil(length / spacing));
  return Array.from({ length: count + 1 }, (_, i) => control ? quadraticPoint(a, control, b, i / count) : { x: a.x + (b.x - a.x) * i / count, y: a.y + (b.y - a.y) * i / count });
}

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
var clamp2 = (n, a, b) => Math.max(a, Math.min(b, n));
function rockExposure(grade, faceRise) {
  const steep = smooth(clamp2((grade - 0.27) / 0.78, 0, 1));
  const height = smooth(clamp2((faceRise - 4) / 24, 0, 1));
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
    out[key] = Number.isFinite(n) ? clamp2(Math.round(n), low, high) : DEFAULT_WORLD[key];
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
    const length = lakeMin * (type === "ribbon" ? 0.35 : type === "branched" ? 0.24 : 0.18) * (0.84 + rand(530 + i * 37) * 0.4) * (0.7 + options.waterLevel * 5e-3);
    const halfWidth2 = lakeMin * (type === "ribbon" ? 0.028 : type === "branched" ? 0.041 : 0.072) * (0.8 + rand(531 + i * 37) * 0.48) * (0.6 + options.waterLevel * 8e-3);
    const direction = Math.atan2(best.dz, best.dx) + (type === "ribbon" ? 0.12 : 1.08) + rand(535 + i * 37) * 0.42;
    const ux = Math.cos(direction), uz = Math.sin(direction);
    const vx = -uz, vz = ux;
    const wobble = rand(533 + i * 37) * Math.PI * 2;
    const spine = Array.from({ length: 17 }, (_, j) => {
      const t = j / 16, u = (t - 0.5) * length;
      const side = (Math.sin(t * Math.PI * 2.4 + wobble) - Math.sin(wobble)) * halfWidth2 * (type === "ribbon" ? 0.65 : 0.8);
      const x = clamp2(best.x + ux * u + vx * side, 5, width - 5);
      const z = clamp2(best.z + uz * u + vz * side, 5, depth - 5);
      return { x, z, r: halfWidth2 * (0.52 + 0.48 * Math.pow(Math.max(0, 1 - Math.abs(t - 0.5) * 1.8), 0.7)) * (0.85 + 0.18 * Math.sin(t * 23 + wobble)) };
    });
    const arms = [];
    if (type === "branched" || type === "lowland") {
      const count = type === "branched" ? 3 : 2;
      for (let j = 0; j < count; j++) {
        const idx = 3 + Math.floor(rand(610 + i * 37 + j) * 11), origin = spine[idx];
        const side = j % 2 ? 1 : -1;
        const span = length * (0.28 + rand(630 + i * 37 + j) * 0.27);
        const shift = side * span;
        arms.push(Array.from({ length: 7 }, (_, k) => {
          const t = k / 6;
          return {
            x: clamp2(origin.x + vx * shift * t + ux * span * t * 0.23 * Math.sin(t * 2 + floatHash(i, j)), 5, width - 5),
            z: clamp2(origin.z + vz * shift * t + uz * span * t * 0.23 * Math.sin(t * 2 + floatHash(i, j)), 5, depth - 5),
            r: halfWidth2 * (0.63 - 0.54 * t)
          };
        }));
      }
    }
    const level = Math.max(6, best.h + 2.5 + rand(511 + i * 37) * 2);
    lakes.push({
      x: best.x,
      z: best.z,
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
  function lineDistance(x, z, points) {
    let best = Infinity;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dx = b.x - a.x, dz = b.z - a.z;
      const t = clamp2(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
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
    const cliff = smooth(clamp2((cliffNoise - 0.475) * 23, 0, 1)) * options.cliffs * 0.65;
    const open = 1 - smooth(clamp2((fbm(nx * 2.8, nz * 2.8, seed2 + 330) - 0.34) * 3, 0, 1));
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
      const t = clamp2(((xx - a.x) * dx + (zz - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
      const r = Math.max(1, mix(a.r, b.r, t));
      const d = Math.hypot(xx - (a.x + t * dx), zz - (a.z + t * dz)) / r;
      best = Math.min(best, d);
    }
    return best;
  }
  function sample(x, z) {
    x = clamp2(x, 0, width);
    z = clamp2(z, 0, depth);
    let height = baseHeight(x, z), water2 = -Infinity, kind = "land";
    for (const lake of lakes) {
      const far = Math.hypot(x - lake.x, z - lake.z);
      if (far > lake.rx + lake.rz * 6) continue;
      const d = lakeDistance(lake, x, z);
      if (d < 1.5) {
        const rim = clamp2((d - 0.78) / 0.72, 0, 1);
        const basin = lake.level - 8 + Math.pow(Math.min(d, 1), 1.7) * 7;
        height = mix(Math.min(height, basin), height, smooth(rim));
        if (d < 1) {
          height = Math.min(height, lake.level - 1.5);
          if (lake.level > water2) {
            water2 = lake.level;
            kind = "lake";
          }
        }
      }
    }
    for (const river of rivers) {
      const d = lineDistance(x, z, river.points), bank = river.width;
      if (d < bank * 1.75) {
        height = Math.min(height, river.level + (d - bank) * 2.2);
        if (d < bank) {
          height = Math.min(height, river.level - 3);
          if (river.level > water2) {
            water2 = river.level;
            kind = "river";
          }
        }
      }
    }
    return { height, water: Number.isFinite(water2) ? water2 : null, kind };
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
function previewTrees(world2, maxCount = 650) {
  const trees = world2.trees || [];
  if (trees.length <= maxCount) return trees;
  const stride = trees.length / maxCount;
  return Array.from({ length: maxCount }, (_, i) => trees[Math.floor((i + 0.5) * stride)]);
}
function createWorldMesh(world2, nx = 92, nz = 72, { trees = true, palette = null, treeLimit = 650, coherentMeadow = false } = {}) {
  const { width, depth } = world2, ground2 = [], water2 = [];
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
    const color = deep.map((c, i) => clamp2(c + (isRiver ? [0.025, 0.055, 0.043][i] : 0) + (shore ? [0.072, 0.078, 0.054][i] : 0), 0, 1));
    const vertex = (p) => [p.x - width / 2, p.level + 0.5, p.z - depth / 2];
    for (let i = 1; i + 1 < result.length; i++)
      triangle(water2, vertex(result[0]), vertex(result[i]), vertex(result[i + 1]), color);
  }
  const rowLength = nx + 1;
  const sampled = Array.from({ length: (nz + 1) * rowLength }, (_, i) => world2.sample(i % rowLength / nx * width, Math.floor(i / rowLength) / nz * depth));
  for (let z = 0; z < nz; z++) for (let x = 0; x < nx; x++) {
    const x0 = x / nx * width, x1 = (x + 1) / nx * width, z0 = z / nz * depth, z1 = (z + 1) / nz * depth;
    const index = z * rowLength + x;
    const a = sampled[index], b = sampled[index + 1], c = sampled[index + rowLength + 1], d = sampled[index + rowLength];
    const cells = [[x0, z0, a], [x1, z0, b], [x1, z1, c], [x0, z1, d]];
    const mid = world2.sample((x0 + x1) / 2, (z0 + z1) / 2), rock = world2.slope((x0 + x1) / 2, (z0 + z1) / 2);
    const variation = rand(x, z);
    const heights = [a.height, b.height, c.height, d.height];
    const verticalRise = Math.max(...heights) - Math.min(...heights);
    const rocky = rockExposure(rock, verticalRise);
    const green = palette?.land || [0.39, 0.54, 0.36];
    const stone = palette?.stone || [0.49, 0.49, 0.45];
    const stratum = Math.sin(mid.height * 0.38 + 1.3) * 0.045 + Math.sin(mid.height * 0.95 + 0.7) * 0.022;
    const meadowShade = 0.955 + variation * 0.095, rockShade = 0.94 + variation * 0.09 + stratum;
    const color = green.map((v, i) => clamp2(mix(v * meadowShade, stone[i] * rockShade, rocky), 0.03, 0.93));
    const verts = cells.map((q) => [q[0] - width / 2, q[2].height, q[1] - depth / 2]);
    const vertexColors = coherentMeadow ? cells.map((q) => {
      const shade = 0.98 + Math.sin(q[0] / 75) * 0.015 + Math.cos(q[1] / 90) * 0.012 + Math.sin((q[0] + q[1]) / 110) * 0.01;
      return green.map((v, i) => clamp2(mix(v * shade, stone[i] * rockShade, rocky), 0.03, 0.93));
    }) : null;
    triangle(ground2, verts[0], verts[3], verts[1], vertexColors ? [vertexColors[0], vertexColors[3], vertexColors[1]] : color);
    triangle(ground2, verts[1], verts[3], verts[2], vertexColors ? [vertexColors[1], vertexColors[3], vertexColors[2]] : color);
    const surface2 = cells.map((q) => ({
      x: q[0],
      z: q[1],
      wet: q[2].water !== null,
      level: q[2].water,
      kind: q[2].kind
    }));
    waterPolygon([surface2[0], surface2[3], surface2[1]]);
    waterPolygon([surface2[1], surface2[3], surface2[2]]);
  }
  for (const t of trees ? previewTrees(world2, treeLimit) : []) {
    const x = t.x - width / 2, z = t.z - depth / 2, n = 5, base = t.y + 1;
    const pine = [0.16 + rand(Math.round(t.x), Math.round(t.z)) * 0.09, 0.36 + rand(Math.round(t.z), Math.round(t.x)) * 0.1, 0.22];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
      triangle(
        ground2,
        [x, base + t.h, z],
        [x + Math.cos(a) * t.r, base + t.h * 0.21, z + Math.sin(a) * t.r],
        [x + Math.cos(b) * t.r, base + t.h * 0.21, z + Math.sin(b) * t.r],
        pine
      );
      triangle(
        ground2,
        [x, base + t.h * 0.63, z],
        [x + Math.cos(a) * t.r * 0.85, base + t.h * 0.12, z + Math.sin(a) * t.r * 0.85],
        [x + Math.cos(b) * t.r * 0.85, base + t.h * 0.12, z + Math.sin(b) * t.r * 0.85],
        pine.map((v) => v * 0.89)
      );
    }
  }
  return {
    ground: new Float32Array(ground2),
    water: new Float32Array(water2),
    groundTriangles: ground2.length / 27,
    waterTriangles: water2.length / 27
  };
}

// organic-world.mjs
var WIDTH = 1200;
var HEIGHT = 900;
function configureOrganicBounds(w, h) {
  WIDTH = w;
  HEIGHT = h;
}
var rnd = (n) => {
  const v = Math.sin(n * 38.217 + 14.57) * 43758.5453;
  return v - Math.floor(v);
};
function riverX(y) {
  return 875 - 90 * Math.sin((y + 80) / 145) + 35 * Math.sin(y / 66);
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

// desire-paths.mjs
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
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
      length: distance(path.via[i], p)
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

// settlement-play.mjs
var POLICIES = {
  tax: [["gentle", "Gentle levy", "70% revenue, +1 morale/month"], ["balanced", "Balanced levy", "Normal revenue"], ["high", "Heavy levy", "145% revenue, -3 morale/month"]],
  rations: [["careful", "Stretch provisions", "20% less food, -2 morale/month"], ["normal", "Normal meals", "Normal food use"], ["generous", "Community feasts", "25% more food, +2 morale/month"]],
  labor: [["food", "Prioritize growers", "Staff farms first"], ["balanced", "Balanced workforce", "Staff farms, wood, and services"], ["materials", "Prioritize makers", "Staff lumber and toolsmiths first"]]
};
function ensureCivic(s) {
  const c = s.civic || (s.civic = {});
  if (!POLICIES.tax.some((x) => x[0] === c.tax)) c.tax = "balanced";
  if (!POLICIES.rations.some((x) => x[0] === c.rations)) c.rations = "normal";
  if (!POLICIES.labor.some((x) => x[0] === c.labor)) c.labor = "balanced";
  if (!Number.isInteger(c.chapter) || c.chapter < 0 || c.chapter > 3) c.chapter = 0;
  if (!Array.isArray(c.charters)) c.charters = [];
  if (!Array.isArray(c.petitions)) c.petitions = [];
  if (!Number.isInteger(c.lastTrade)) c.lastTrade = -1;
  if (!Number.isInteger(c.steadyMonths)) c.steadyMonths = 0;
  if (!c.changed || typeof c.changed !== "object") c.changed = {};
  if (!c.ledger || typeof c.ledger !== "object") c.ledger = {};
  return c;
}

// simulation.mjs
var VERSION = 1;
var WORLD = { w: 1200, h: 900 };
var modelCache = /* @__PURE__ */ new Map();
function worldDimensions(state2) {
  const size = state2?.worldOptions?.size;
  const preset = WORLD_SIZES[size];
  return preset ? { w: preset.width, h: preset.depth } : { w: 1200, h: 900 };
}
function configureWorldState(state2) {
  const bounds = worldDimensions(state2);
  WORLD.w = bounds.w;
  WORLD.h = bounds.h;
  setRoadBounds(bounds.w, bounds.h);
  configureOrganicBounds(bounds.w, bounds.h);
  return bounds;
}
function generatedWorld(state2) {
  if (!state2?.worldOptions) return null;
  const options = normalizeWorldSettings(state2.worldOptions);
  const key = JSON.stringify(options);
  if (!modelCache.has(key)) modelCache.set(key, createWorld(options));
  return modelCache.get(key);
}
function drySite(world2, x, z) {
  for (const [dx, dz] of [[0, 0], [-180, 0], [180, 0], [0, -180], [0, 180], [-115, -85], [90, 95]]) {
    const p = { x: x + dx, z: z + dz };
    if (p.x < 35 || p.z < 35 || p.x > world2.width - 35 || p.z > world2.depth - 35) return false;
    if (world2.sample(p.x, p.z).water !== null || world2.slope(p.x, p.z) > 0.42) return false;
  }
  return true;
}
function startWorldGame(raw = DEFAULT_WORLD) {
  const options = normalizeWorldSettings(raw), world2 = createWorld(options);
  let center = { x: world2.width / 2, z: world2.depth / 2 }, best = Infinity;
  for (let z = 240; z < world2.depth - 240; z += 65)
    for (let x = 240; x < world2.width - 240; x += 65) {
      if (!drySite(world2, x, z)) continue;
      const score = Math.hypot((x - world2.width * 0.47) / world2.width, (z - world2.depth * 0.49) / world2.depth) + world2.slope(x, z) * 0.3;
      if (score < best) {
        best = score;
        center = { x, z };
      }
    }
  if (!Number.isFinite(best)) throw Error("No suitable founding meadow. Choose flatter terrain or another seed.");
  const state2 = startGame(), shiftX = center.x - 440, shiftY = center.z - 450;
  const shift = (p) => ({ x: Math.round(p.x + shiftX), y: Math.round(p.y + shiftY) });
  state2.worldOptions = options;
  state2.roads = state2.roads.map((line) => line.map(shift));
  state2.houses = state2.houses.map(shift);
  state2.buildings = state2.buildings.map((b) => ({ ...b, ...shift(b) }));
  delete state2.roadGraph;
  state2.logs = ["The founding families arrived in " + options.size + " landscape, seed " + options.seed + "."];
  state2.report = "The first village has been established on a natural meadow. Expand roads and paint residential land.";
  configureWorldState(state2);
  ensureGraph(state2);
  return state2;
}
function startGame() {
  const state2 = {
    version: VERSION,
    turn: 0,
    people: 32,
    gold: 740,
    food: 66,
    wood: 20,
    tools: 9,
    roads: [[{ x: 172, y: 472 }, { x: 330, y: 417 }, { x: 460, y: 454 }, { x: 656, y: 383 }]],
    buildings: [{ type: "lumber", x: 288, y: 340 }, { type: "farm", x: 530, y: 553 }],
    houses: [{ x: 242, y: 505 }, { x: 350, y: 374 }, { x: 418, y: 497 }, { x: 545, y: 400 }],
    happiness: 76,
    desirePaths: [],
    zones: [],
    localLanes: [],
    housing: { housed: 32, pending: [], attractiveness: 75, nextId: 1 },
    logs: ["The first families establish Willow Valley beside an old forest road."],
    report: "Your town has supplies for its first expansion. Design a new road or develop another industry."
  };
  ensureGraph(state2);
  ensureCivic(state2);
  return state2;
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
  function sample(x, y) {
    const gx = Math.max(0, Math.min(nx, x / sx)), gy = Math.max(0, Math.min(nz, y / sy));
    const i = Math.min(nx - 1, Math.floor(gx)), j = Math.min(nz - 1, Math.floor(gy));
    const u = gx - i, v = gy - j, a = height(i, j), b = height(i + 1, j), c = height(i + 1, j + 1), d = height(i, j + 1);
    return { ...world2.sample(x, y), height: u + v <= 1 ? a + (b - a) * u + (d - a) * v : c + (d - c) * (1 - u) + (b - c) * (1 - v) };
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
  return { ...world2, sample, contactTrace: trace, drapePolygon: drape };
}

// render-adoption/world/fixtures.mjs
function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function realWorldFixture(seed2 = "WILLOW-1048", quality2 = "normal", size = "small") {
  const state2 = startWorldGame({ seed: seed2, size, flatness: 80, hills: 20, cliffs: 15, lakes: 2, rivers: 1 }), before = JSON.stringify(state2), world2 = generatedWorld(state2), detached = structuredClone(state2);
  if (detached.zones.length) throw Error("Fixture expects actual initial empty committed zones");
  const [nx, nz] = terrainResolution(world2, { lite: quality2 === "low", gameplay: true });
  const surface2 = createTerrainSurface(world2, nx, nz);
  const view2 = freeze({
    schemaVersion: 1,
    revision: `${seed2}:initial`,
    quality: quality2,
    world: { seed: state2.worldOptions.seed, width: world2.width, depth: world2.depth, terrainRevision: `${nx}:${nz}` },
    houses: state2.houses.map((h) => ({ key: `home:${h.x}:${h.y}`, savedPosition: { x: h.x, y: h.y }, parcel: h.parcel ?? null, yaw: 0 })),
    facilities: state2.buildings.map((b) => ({ key: `${b.type}:${b.x}:${b.y}`, type: b.type, savedPosition: { x: b.x, y: b.y }, yaw: 0 })),
    roads: state2.roads.map((points, i) => ({ key: `road:${i}`, points: structuredClone(points), width: 34 })),
    localLanes: state2.localLanes.map((l, i) => ({ key: `lane:${i}`, points: structuredClone(l.points), width: 5 })),
    approaches: visibleDesirePaths(state2).map((l, i) => ({ key: `path:${i}`, points: structuredClone(l.points), width: l.width ?? 3 })),
    committedFields: [],
    retainedTrees: world2.trees.map((t, i) => ({ key: `tree:${i}`, savedPosition: { x: t.x, y: t.z }, canopyRadiusWorldGame: 38 })),
    retainedBoundaries: []
  });
  const context = freeze({ placementView: { revision: "peer-fixture-1", complete: true, exclusionsWorldGame: [], groundInfluencesWorldGame: [] }, landscapeView: { revision: "peer-fixture-1", complete: true, exclusionsWorldGame: [] } });
  return { state: state2, before, world: world2, surface: surface2, view: view2, context };
}

// render-adoption/world/index.mjs
import * as T6 from "../../vendor/three.module.mjs";

// render-adoption/world/spatial.mjs
var U = 2.8;
var clamp3 = (x) => Math.max(0, Math.min(1, x));
function unit(seed2, x, z, suffix = "") {
  let h = 2166136261;
  for (const c of `${seed2}:${x}:${z}:${suffix}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
function smooth2(seed2, x, z) {
  const i = Math.floor(x), j = Math.floor(z), a = x - i, b = z - j, u = a * a * (3 - 2 * a), v = b * b * (3 - 2 * b);
  const mix2 = (a2, b2, t) => a2 + (b2 - a2) * t;
  return mix2(mix2(unit(seed2, i, j), unit(seed2, i + 1, j), u), mix2(unit(seed2, i, j + 1), unit(seed2, i + 1, j + 1), u), v);
}
function distance2(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, t = clamp3(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function inside(p, poly) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) yes = !yes;
  }
  return yes;
}
var finitePoint = (p) => Number.isFinite(p?.x) && Number.isFinite(p?.y);
var polygonNear = (p, poly, radius = 0) => inside(p, poly) || poly.some((a, i) => distance2(p, a, poly[(i + 1) % poly.length]) <= radius);
function spatialIndex(size = 64) {
  const bins = /* @__PURE__ */ new Map();
  return {
    add(value, x0, y0, x1, y1) {
      for (let j = Math.floor(y0 / size); j <= Math.floor(y1 / size); j++) for (let i = Math.floor(x0 / size); i <= Math.floor(x1 / size); i++) {
        const k = `${i}:${j}`;
        if (!bins.has(k)) bins.set(k, []);
        bins.get(k).push(value);
      }
    },
    at(x, y) {
      return bins.get(`${Math.floor(x / size)}:${Math.floor(y / size)}`) || [];
    }
  };
}
function indexPolygon(index, polygon, value, pad = 4) {
  if (polygon?.length < 3 || !polygon.every(finitePoint)) throw Error("Expected world-game polygon {x,y}");
  index.add(value, Math.min(...polygon.map((p) => p.x)) - pad, Math.min(...polygon.map((p) => p.y)) - pad, Math.max(...polygon.map((p) => p.x)) + pad, Math.max(...polygon.map((p) => p.y)) + pad);
}

// render-adoption/world/classification.mjs
function createClassification(world2, surface2, view2, context = {}) {
  const obstacles = spatialIndex(), roads = spatialIndex(), trees = spatialIndex(), fields = spatialIndex();
  const placement = context.placementView, landscape = context.landscapeView;
  const safeCover = placement?.complete === true && landscape?.complete === true && (Array.isArray(view2.committedFields) || typeof view2.committedFields?.intersectsCircleWorldGame === "function") && Array.isArray(view2.retainedTrees);
  const exclusions = [...placement?.exclusionsWorldGame || [], ...landscape?.exclusionsWorldGame || []];
  for (const record of exclusions) {
    const polygon = record.polygon;
    indexPolygon(obstacles, polygon, { polygon }, 4);
  }
  let unknownRoadWidths = 0;
  for (const [family, lines] of [["road", view2.roads], ["lane", view2.localLanes], ["approach", view2.approaches]]) for (const line of lines || []) {
    if (!Number.isFinite(line.width) || line.width <= 0) {
      unknownRoadWidths++;
      continue;
    }
    if (!Array.isArray(line.points) || !line.points.every(finitePoint)) throw Error("Expected actual sampled road polyline");
    for (let i = 1; i < line.points.length; i++) {
      const a = line.points[i - 1], b = line.points[i], pad = line.width / 2 + 4;
      roads.add({ a, b, width: line.width, family }, Math.min(a.x, b.x) - pad, Math.min(a.y, b.y) - pad, Math.max(a.x, b.x) + pad, Math.max(a.y, b.y) + pad);
    }
  }
  for (const t of view2.retainedTrees || []) {
    const p = t.savedPosition;
    if (!finitePoint(p)) continue;
    const radius = t.canopyRadiusWorldGame ?? 12;
    trees.add({ p, radius }, p.x - radius, p.y - radius, p.x + radius, p.y + radius);
    if (t.protected) {
      const r = t.protectedRadiusWorldGame ?? radius;
      const poly = [{ x: p.x - r, y: p.y - r }, { x: p.x + r, y: p.y - r }, { x: p.x + r, y: p.y + r }, { x: p.x - r, y: p.y + r }];
      indexPolygon(obstacles, poly, { polygon: poly });
    }
  }
  const committed = view2.committedFields;
  if (Array.isArray(committed)) {
    for (const cell of committed) if (cell.kind === "farmland") indexPolygon(fields, cell.polygon, cell);
  }
  const work = placement?.groundInfluencesWorldGame || [];
  const wear = spatialIndex();
  for (const w of work) {
    if (!w.polygon?.every(finitePoint) || !w.path?.every(finitePoint) || !(w.radius > 0 && w.radius <= 20)) throw Error("Invalid measured ground influence");
    indexPolygon(wear, w.polygon, w, 0);
  }
  const sampleField = (x, y) => typeof committed?.sample === "function" ? committed.sample(x, y) : fields.at(x, y).some((c) => inside({ x, y }, c.polygon) && !(c.holes || []).some((h) => inside({ x, y }, h))) ? "farmland" : null;
  function query(x, y, radius = 0) {
    const p = { x, y }, a = world2.sample(x, y), q = surface2.sample(x, y), wet = a.water !== null;
    const e = 0.01, dx = (surface2.sample(Math.min(world2.width, x + e), y).height - surface2.sample(Math.max(0, x - e), y).height) / (x > e && x < world2.width - e ? 2 * e : e), dy = (surface2.sample(x, Math.min(world2.depth, y + e)).height - surface2.sample(x, Math.max(0, y - e)).height) / (y > e && y < world2.depth - e ? 2 * e : e);
    const grade = Math.hypot(dx, dy);
    let forest = 0, road2 = null, wearAmount = 0;
    for (const t of trees.at(x, y)) forest = Math.max(forest, clamp3(1 - Math.hypot(x - t.p.x, y - t.p.y) / t.radius));
    for (const r of roads.at(x, y)) if (distance2(p, r.a, r.b) <= r.width / 2 + radius) {
      road2 = r;
      break;
    }
    for (const w of wear.at(x, y)) if (inside(p, w.polygon)) for (let i = 1; i < w.path.length; i++) wearAmount = Math.max(wearAmount, clamp3(1 - distance2(p, w.path[i - 1], w.path[i]) / w.radius) * (w.strength ?? 0.65));
    let field = sampleField(x, y);
    if (radius > 0 && fields.at(x, y).some((c) => polygonNear(p, c.polygon, radius) && !(c.holes || []).some((h) => inside(p, h) && !h.some((a2, i) => distance2(p, a2, h[(i + 1) % h.length]) <= radius)))) field = "farmland";
    if (radius > 0 && committed?.intersectsCircleWorldGame?.(x, y, radius)) field = "farmland";
    const blocked = obstacles.at(x, y).some((o) => polygonNear(p, o.polygon, radius));
    let kind = wet ? a.kind === "river" ? "river" : "lake" : road2 ? road2.family : field === "farmland" ? "field" : grade > 0.65 ? "rock" : forest > 0.25 ? "forest" : wearAmount > 0.1 ? "work" : "meadow";
    let bank = 0;
    if (!wet) {
      for (const [ox, oy] of [[-8, 0], [8, 0], [0, -8], [0, 8]]) if (world2.sample(Math.max(0, Math.min(world2.width, x + ox)), Math.max(0, Math.min(world2.depth, y + oy))).water !== null) {
        bank = 1;
        break;
      }
    }
    if (kind === "meadow" && bank) kind = "bank";
    return {
      kind,
      height: q.height,
      wet,
      forest,
      wear: wearAmount,
      grade,
      bank,
      blocked,
      field,
      meadow: !wet && !bank && !road2 && field !== "farmland" && grade <= 0.65 && forest <= 0.25,
      landMeadow: !wet && !bank && !road2 && field !== "farmland" && forest <= 0.25,
      cover: safeCover && !unknownRoadWidths && !blocked && !wet && !bank && !road2 && field !== "farmland" && grade <= 0.35 && forest <= 0.25 && wearAmount <= 0.1
    };
  }
  return {
    query,
    safeCover,
    unknownRoadWidths,
    coverage(revision) {
      return Object.freeze({
        schemaVersion: 1,
        revision,
        units: "centered-metres",
        owner: "world-layer-A3",
        boundsCenteredMetres: Object.freeze({ minX: -world2.width / 2 / U, maxX: world2.width / 2 / U, minZ: -world2.depth / 2 / U, maxZ: world2.depth / 2 / U }),
        // Ownership is authoritative category, independent of camera, density or LOD.
        containsCenteredMetres(x, z) {
          const a = x * U + world2.width / 2, b = z * U + world2.depth / 2;
          if (!(a >= 0 && b >= 0 && a <= world2.width && b <= world2.depth)) return false;
          const q = query(a, b);
          return q.landMeadow && (typeof world2.slope === "function" ? world2.slope(a, b) : q.grade) <= 0.65;
        }
      });
    }
  };
}

// render-adoption/world/fields.mjs
import * as T2 from "../../vendor/three.module.mjs";

// render-adoption/world/recipe.mjs
import * as T from "../../vendor/three.module.mjs";
var MEADOW_PALETTE = Object.freeze({ meadow: "#789f40", light: "#adc05c", wood: "#688b37", lane: "#ceb17a", approach: "#ceb17a", path: "#c8ad78", yard: "#b5a075", work: "#b9a074", garden: "#779941", field: "#b9ad68", common: "#91ad47", holding: "#86a243", seat: "#8e9262", root: "#5c7e2d", tip: "#b0c65c" });
function grassSurfaceGeometry(low = false) {
  const positions = [], indices = [], blades = low ? 5 : 19, levels = low ? [0, 0.65, 1] : [0, 0.45, 0.78, 1];
  for (let b = 0; b < blades; b++) {
    const angle = unit("blade", b, 0) * Math.PI * 2, radius = Math.sqrt(unit("blade", b, 1)) * 0.3, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius, yaw = unit("blade", b, 2) * Math.PI * 2, height = 0.28 + unit("blade", b, 3) * 0.2, width = 0.024 + unit("blade", b, 4) * 0.031, bend = 0.045 + unit("blade", b, 5) * 0.09, base = positions.length / 3;
    for (let j = 0; j < levels.length; j++) {
      const t = levels[j], cx = x + Math.cos(yaw) * bend * t * t, cz = z + Math.sin(yaw) * bend * t * t, w = width * (1 - t) * 0.5;
      if (t === 1) positions.push(cx, height, cz);
      else for (const side of [-1, 1]) positions.push(cx + Math.sin(yaw) * w * side, t * height, cz - Math.cos(yaw) * w * side);
    }
    for (let j = 0; j < levels.length - 2; j++) {
      const k2 = base + j * 2;
      indices.push(k2, k2 + 1, k2 + 2, k2 + 1, k2 + 3, k2 + 2);
    }
    const k = base + (levels.length - 2) * 2;
    indices.push(k, k + 1, k + 2);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// render-adoption/world/fields.mjs
function buildFields(world2, classification, quality2) {
  const tileGame = 128, samplesPerTile = quality2 === "low" ? 8 : 16, columns = Math.ceil(world2.width / tileGame), rows = Math.ceil(world2.depth / tileGame), width = columns * samplesPerTile + 1, height = rows * samplesPerTile + 1, n = width * height, color = new Uint8Array(n * 4), control = new Uint8Array(n * 4), wet = new Uint8Array(n), dist = new Float32Array(n).fill(1e6), samples = [];
  const palette = Object.fromEntries(Object.entries(MEADOW_PALETTE).map(([k, v]) => [k, new T2.Color(v)])), c = new T2.Color(), seed2 = world2.options?.seed;
  const sx = world2.width / (width - 1), sy = world2.depth / (height - 1), counts = {};
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const x = i * sx, y = j * sy, k = j * width + i, q = classification.query(x, y);
    samples.push(q);
    wet[k] = q.wet ? 1 : 0;
    counts[q.kind] = (counts[q.kind] || 0) + 1;
    c.copy(palette.meadow).lerp(palette.light, smooth2(seed2, x / 2.8 * 0.042, y / 2.8 * 0.042));
    c.multiplyScalar(0.98 + (unit(seed2, Math.floor(x), Math.floor(y)) - 0.5) * 0.1);
    c.lerp(new T2.Color("#5f703d"), q.forest * 0.72);
    if (q.wear) c.lerp(palette.work, q.wear);
    if (q.kind === "road" || q.kind === "lane" || q.kind === "approach") c.copy(palette.lane);
    if (q.kind === "field") c.copy(palette.field);
    if (q.bank) c.lerp(new T2.Color("#80775e"), 0.8);
    if (q.grade > 0.24) c.lerp(new T2.Color().setRGB(0.16, 0.16, 0.14).lerp(new T2.Color().setRGB(0.235, 0.225, 0.2), smooth2(seed2, x * 0.07, y * 0.12)), clamp3((q.grade - 0.24) / 0.9));
    c.convertLinearToSRGB();
    color[k * 4] = Math.round(clamp3(c.r) * 255);
    color[k * 4 + 1] = Math.round(clamp3(c.g) * 255);
    color[k * 4 + 2] = Math.round(clamp3(c.b) * 255);
    color[k * 4 + 3] = 255;
  }
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const k = j * width + i;
    if (i && wet[k] !== wet[k - 1]) dist[k] = dist[k - 1] = 0;
    if (j && wet[k] !== wet[k - width]) dist[k] = dist[k - width] = 0;
  }
  const relax = (i, j, di, dj) => {
    const x = i + di, y = j + dj;
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const k = j * width + i;
      dist[k] = Math.min(dist[k], dist[y * width + x] + Math.hypot(di * sx, dj * sy));
    }
  };
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) for (const [di, dj] of [[-1, 0], [0, -1], [-1, -1], [1, -1]]) relax(i, j, di, dj);
  for (let j = height - 1; j >= 0; j--) for (let i = width - 1; i >= 0; i--) for (const [di, dj] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) relax(i, j, di, dj);
  for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
    const k = j * width + i, x = i * sx, y = j * sy;
    let dx = 0, dy = 0, best = Infinity;
    if (samples[k].kind === "river") for (const r of world2.rivers || []) for (let a = 1; a < r.points.length; a++) {
      const p = r.points[a - 1], b = r.points[a], vx = b.x - p.x, vy = (b.z ?? b.y) - (p.z ?? p.y), len2 = vx * vx + vy * vy, t = clamp3(((x - p.x) * vx + (y - (p.z ?? p.y)) * vy) / (len2 || 1)), d = Math.hypot(x - p.x - vx * t, y - (p.z ?? p.y) - vy * t);
      if (d < best) {
        best = d;
        const l = Math.sqrt(len2) || 1;
        dx = vx / l;
        dy = vy / l;
      }
    }
    control[k * 4] = wet[k] * 255;
    control[k * 4 + 1] = Math.round(clamp3(dist[k] / 55) * 255);
    control[k * 4 + 2] = Math.round((dx * 0.5 + 0.5) * 255);
    control[k * 4 + 3] = Math.round((dy * 0.5 + 0.5) * 255);
  }
  const textures = [];
  try {
    for (const [data, space] of [[color, T2.SRGBColorSpace], [control, T2.NoColorSpace]]) {
      const t = new T2.DataTexture(data, width, height);
      textures.push(t);
      t.colorSpace = space;
      t.generateMipmaps = false;
      t.minFilter = t.magFilter = T2.LinearFilter;
      t.needsUpdate = true;
    }
  } catch (e) {
    textures.forEach((t) => t.dispose());
    throw e;
  }
  return { color: textures[0], control: textures[1], status: { tileGame, samplesPerTile, columns, rows, width, height, decodedBytes: color.byteLength + control.byteLength, counts, shoreDistanceMethod: "unsigned wet-mask chamfer; not bathymetry" }, dispose() {
    textures.forEach((t) => t.dispose());
  } };
}

// render-adoption/world/materials.mjs
import * as T3 from "../../vendor/three.module.mjs";

// render-adoption/world/preset.mjs
var ENVIRONMENT_PRESET = Object.freeze({ revision: "wv006-a-2", runtimeReady: false, sunColor: "#fff4e5", sunIntensity: 2.1, sunDirection: [-0.4, 0.86, 0.25], skyColor: "#eaf0f3", groundColor: "#76745f", fillIntensity: 1.8, horizon: "#c5d1c7", zenith: "#91b2c3", fogColor: "#c5d1c7", fogNear: 3300, fogFar: 4900, shadows: false });

// render-adoption/world/materials.mjs
function createMaterials(quality2) {
  const uniforms = {
    colorField: { value: null },
    control: { value: null },
    worldSize: { value: new T3.Vector2(1, 1) },
    fieldSize: { value: new T3.Vector2(1, 1) },
    time: { value: 0 },
    sunDirection: { value: new T3.Vector3(...ENVIRONMENT_PRESET.sunDirection).normalize() },
    haze: { value: new T3.Color(ENVIRONMENT_PRESET.fogColor) },
    fogRange: { value: new T3.Vector2(ENVIRONMENT_PRESET.fogNear, ENVIRONMENT_PRESET.fogFar) }
  };
  const vertex = `attribute vec3 color;varying vec3 vColor;varying vec3 vPosition;varying vec3 vNormal;varying float vDepth;
 void main(){vColor=color;vPosition=position;vNormal=normal;vec4 mv=modelViewMatrix*vec4(position,1.);vDepth=-mv.z;gl_Position=projectionMatrix*mv;}`;
  const common = `uniform sampler2D colorField;uniform sampler2D control;uniform vec2 worldSize;uniform vec2 fieldSize;uniform float time;uniform vec3 sunDirection;uniform vec3 haze;uniform vec2 fogRange;
 varying vec3 vColor;varying vec3 vPosition;varying vec3 vNormal;varying float vDepth;
 vec2 fieldUV(){return ((vPosition.xz/worldSize+.5)*(fieldSize-1.)+.5)/fieldSize;}
 vec3 finish(vec3 c){float light=.72+.28*max(0.,dot(normalize(vNormal),sunDirection));return mix(c*light,haze,smoothstep(fogRange.x,fogRange.y,vDepth)*.62);}`;
  const terrain = `${common}
 void main(){vec3 c=texture2D(colorField,fieldUV()).rgb;
 #ifndef LOW_QUALITY
 float grain=.5+.25*sin(vPosition.x*.73+sin(vPosition.z*.47))+.25*sin(vPosition.z*1.13+vPosition.x*.21);c*=.96+.08*grain;
 #endif
 gl_FragColor=vec4(finish(c),1.);
 #include <colorspace_fragment>
 }`;
  const water2 = `${common}
 void main(){vec4 field=texture2D(control,fieldUV());vec2 flow=field.ba*2.-1.;float river=smoothstep(.12,.4,length(flow));
 vec3 c=mix(vec3(.135,.19,.16),vec3(.105,.22,.225),smoothstep(0.,.23,field.g));c=mix(c,vec3(.04,.12,.155),smoothstep(.16,.98,field.g));
 #ifndef LOW_QUALITY
 vec2 p=vPosition.xz/35.-flow*time*.025*river-vec2(time*.001*(1.-river));float ripple=sin(p.x*8.+sin(p.y*6.))*sin(p.y*7.);c+=vec3(.004,.006,.006)*ripple*smoothstep(.03,.30,field.g);
 #endif
 c=mix(c,haze,smoothstep(fogRange.x,fogRange.y,vDepth)*.62);gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
 }`;
  const road2 = `${common}varying float vKind;
 void main(){vec3 c=vColor;
 // Surface kinds preserve actual geometry, curves, junctions and widths. No
 // main-road width constant is imposed on local lanes or desire paths.
 if(vKind>.5){float grain=.96+.04*sin(vPosition.x*.7+sin(vPosition.z));vec3 earth=vec3(.61,.46,.255)*grain;
 c=mix(vColor,earth,vKind<1.5?.80:vKind<2.5?.62:vKind<3.5?.74:vKind<4.5?.60:.78);}
 gl_FragColor=vec4(finish(c),1.);
 #include <colorspace_fragment>
 }`;
  const materials = /* @__PURE__ */ new Map();
  for (const index of [0, 1, 5]) {
    const v = index === 5 ? vertex.replace("attribute vec3 color;", "attribute float surfaceKind;varying float vKind;attribute vec3 color;").replace("vColor=color;", "vKind=surfaceKind;vColor=color;") : vertex;
    materials.set(index, new T3.ShaderMaterial({ uniforms, defines: quality2 === "low" ? { LOW_QUALITY: 1 } : {}, vertexShader: v, fragmentShader: index === 0 ? terrain : index === 1 ? water2 : road2, side: T3.DoubleSide }));
  }
  const grass = new T3.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: T3.DoubleSide });
  return {
    uniforms,
    material: (index) => materials.get(index) ?? null,
    grass,
    bind(fields, world2) {
      uniforms.colorField.value = fields.color;
      uniforms.control.value = fields.control;
      uniforms.worldSize.value.set(world2.width, world2.depth);
      uniforms.fieldSize.value.set(fields.status.width, fields.status.height);
    },
    dispose() {
      for (const m of materials.values()) m.dispose();
      grass.dispose();
    }
  };
}

// render-adoption/world/grass.mjs
import * as T4 from "../../vendor/three.module.mjs";
var GRASS_CHUNK_GAME = 64;
function grassRecords(world2, classification, ix, iz) {
  const records = [], step = 1.05 * U, seed2 = world2.options?.seed;
  const loX = ix * GRASS_CHUNK_GAME, loY = iz * GRASS_CHUNK_GAME;
  for (let j = Math.ceil(loY / step); j < Math.ceil(Math.min(world2.depth, loY + GRASS_CHUNK_GAME) / step); j++)
    for (let i = Math.ceil(loX / step); i < Math.ceil(Math.min(world2.width, loX + GRASS_CHUNK_GAME) / step); i++) {
      const x = (i + 0.1 + unit(seed2, i, j, "x") * 0.8) * step, y = (j + 0.1 + unit(seed2, i, j, "y") * 0.8) * step;
      if (x >= world2.width || y >= world2.depth) continue;
      const scale = 0.45 + unit(seed2, i, j, "height") * 0.7, radius = 0.68 * scale * U;
      if (x < radius || y < radius || x > world2.width - radius || y > world2.depth - radius) continue;
      const q = classification.query(x, y, radius);
      if (!q.cover) continue;
      if ([[radius, 0], [-radius, 0], [0, radius], [0, -radius]].some(([dx, dy]) => !classification.query(x + dx, y + dy).cover)) continue;
      if (unit(seed2, i, j, "gap") > 0.7 + smooth2(seed2, x / U * 0.055, y / U * 0.055) * 0.29) continue;
      records.push({ key: `meadow:${i}:${j}`, x, y, scale: scale * U, yaw: unit(seed2, i, j, "yaw") * Math.PI * 2, brightness: 0.88 + unit(seed2, i, j, "shade") * 0.24, rank: unit(seed2, i, j, "rank") });
    }
  return records.sort((a, b) => a.rank - b.rank);
}
function buildGrassGeometry(records, surface2, world2, low = false) {
  const recipe = grassSurfaceGeometry(low), p = recipe.attributes.position, idx = recipe.index;
  const positions = [], colors2 = [], indices = [], root = new T4.Color(MEADOW_PALETTE.root), tip = new T4.Color(MEADOW_PALETTE.tip), c = new T4.Color();
  for (const r of records) {
    const base = positions.length / 3, cs = Math.cos(r.yaw), sn = Math.sin(r.yaw);
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i) * r.scale, pz = p.getZ(i) * r.scale, x = r.x + px * cs + pz * sn, y = r.y - px * sn + pz * cs, lift = p.getY(i) * r.scale;
      positions.push(x - world2.width / 2, surface2.sample(x, y).height + lift, y - world2.depth / 2);
      c.copy(root).lerp(tip, p.getY(i) / 0.48).multiplyScalar(r.brightness);
      colors2.push(c.r, c.g, c.b);
    }
    for (let i = 0; i < idx.count; i++) indices.push(base + idx.array[i]);
  }
  recipe.dispose();
  const geometry = new T4.BufferGeometry();
  geometry.setAttribute("position", new T4.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new T4.Float32BufferAttribute(colors2, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
function createGrassManager(group, world2, surface2, classification, material, quality2) {
  const chunks = /* @__PURE__ */ new Map(), frustum = new T4.Frustum(), matrix = new T4.Matrix4(), tiles = [];
  let visible = true, disposed2 = false, builds = 0;
  if (classification.safeCover) for (let iz = 0; iz < Math.ceil(world2.depth / GRASS_CHUNK_GAME); iz++) for (let ix = 0; ix < Math.ceil(world2.width / GRASS_CHUNK_GAME); ix++) {
    const x = Math.min(world2.width, (ix + 0.5) * GRASS_CHUNK_GAME), y = Math.min(world2.depth, (iz + 0.5) * GRASS_CHUNK_GAME), h = surface2.sample(x, y).height;
    const center = new T4.Vector3(x - world2.width / 2, h, y - world2.depth / 2);
    tiles.push({ ix, iz, center, sphere: new T4.Sphere(center, GRASS_CHUNK_GAME * 2) });
  }
  function clear() {
    for (const c of chunks.values()) {
      c.mesh.removeFromParent();
      c.mesh.geometry.dispose();
    }
    chunks.clear();
  }
  function setCamera(camera2) {
    if (disposed2 || !visible || !classification.safeCover) return;
    camera2.updateMatrixWorld();
    frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera2.projectionMatrix, camera2.matrixWorldInverse));
    const candidates = [];
    for (const { ix, iz, center, sphere } of tiles) {
      if (!frustum.intersectsSphere(sphere)) continue;
      const projected = GRASS_CHUNK_GAME * (camera2.isOrthographicCamera ? camera2.zoom / (camera2.top - camera2.bottom) : 1 / (Math.max(1, camera2.position.distanceTo(center)) * Math.tan(T4.MathUtils.degToRad(camera2.fov / 2)) * 2));
      if (projected < 0.045) continue;
      const ndc = center.clone().project(camera2), score = ndc.x * ndc.x + ndc.y * ndc.y;
      candidates.push({ ix, iz, key: `${ix}:${iz}`, score, near: quality2 === "normal" && projected > 0.22 });
    }
    candidates.sort((a, b) => a.score - b.score || a.key.localeCompare(b.key));
    const selected = candidates.slice(0, quality2 === "low" ? 12 : 16);
    const desired = new Map(selected.map((c) => {
      c.lod = c.near ? "near" : quality2 === "low" ? "low" : "mid";
      return [c.key, c];
    }));
    for (const [key, c] of chunks) if (!desired.has(key) || desired.get(key).lod !== c.lod) {
      c.mesh.removeFromParent();
      c.mesh.geometry.dispose();
      chunks.delete(key);
    }
    for (const c of desired.values()) if (!chunks.has(c.key)) {
      const records = grassRecords(world2, classification, c.ix, c.iz).slice(0, c.lod === "near" ? 128 : c.lod === "mid" ? 48 : 32);
      if (!records.length) continue;
      const geometry = buildGrassGeometry(records, surface2, world2, c.lod !== "near");
      const mesh2 = new T4.Mesh(geometry, material);
      mesh2.name = `wv007-grass:${c.key}:${c.lod}`;
      group.add(mesh2);
      chunks.set(c.key, { mesh: mesh2, lod: c.lod, count: records.length });
      builds++;
    }
  }
  return {
    setCamera,
    setVisible(next) {
      visible = !!next;
      group.visible = visible;
    },
    status() {
      let triangles = 0, vertices = 0, bytes = 0, tufts = 0;
      const lods = { near: 0, mid: 0, low: 0 };
      for (const c of chunks.values()) {
        const g = c.mesh.geometry;
        triangles += g.index.count / 3;
        vertices += g.attributes.position.count;
        bytes += g.index.array.byteLength + Object.values(g.attributes).reduce((n, a) => n + a.array.byteLength, 0);
        tufts += c.count;
        lods[c.lod]++;
      }
      return { chunks: chunks.size, visibleChunks: visible ? chunks.size : 0, tufts, triangles, vertices, geometryBytes: bytes, geometryBuilds: builds, lods, chunkGame: GRASS_CHUNK_GAME, nearTrianglesPerTuft: 95, otherTrianglesPerTuft: 15, wind: false };
    },
    dispose() {
      if (disposed2) return;
      disposed2 = true;
      clear();
    }
  };
}

// render-adoption/world/atmosphere.mjs
import * as T5 from "../../vendor/three.module.mjs";
function attachAtmosphere(scene2, { low = false, time = { value: 0 } } = {}) {
  const previousFog = scene2.fog, previousBackground = scene2.background;
  const sun = new T5.DirectionalLight(ENVIRONMENT_PRESET.sunColor, ENVIRONMENT_PRESET.sunIntensity);
  sun.position.set(...ENVIRONMENT_PRESET.sunDirection);
  const fill = new T5.HemisphereLight(ENVIRONMENT_PRESET.skyColor, ENVIRONMENT_PRESET.groundColor, ENVIRONMENT_PRESET.fillIntensity);
  const geometry = new T5.PlaneGeometry(2, 2), material = new T5.ShaderMaterial({ depthTest: false, depthWrite: false, uniforms: { time, zenith: { value: new T5.Color(ENVIRONMENT_PRESET.zenith) }, horizon: { value: new T5.Color(ENVIRONMENT_PRESET.horizon) } }, defines: low ? { LOW_QUALITY: 1 } : {}, vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,.99999,1.);}", fragmentShader: `varying vec2 vUv;uniform float time;uniform vec3 zenith;uniform vec3 horizon;
 void main(){vec3 c=mix(horizon,zenith,smoothstep(.15,1.,vUv.y));
 #ifndef LOW_QUALITY
 float bands=sin(vUv.x*12.+time*.007+sin(vUv.y*18.))*sin(vUv.x*5.-vUv.y*29.+time*.003);float clouds=smoothstep(.48,.90,bands)*smoothstep(.4,.7,vUv.y);c=mix(c,vec3(.79,.82,.80),clouds*.20);
 #endif
 gl_FragColor=vec4(c,1.);
 #include <colorspace_fragment>
 }` });
  const sky = new T5.Mesh(geometry, material);
  sky.frustumCulled = false;
  sky.renderOrder = -1e4;
  const fog = new T5.Fog(ENVIRONMENT_PRESET.fogColor, ENVIRONMENT_PRESET.fogNear, ENVIRONMENT_PRESET.fogFar);
  scene2.fog = fog;
  scene2.add(sun, fill, sky);
  let detached = false;
  return () => {
    if (detached) return;
    detached = true;
    scene2.remove(sun, fill, sky);
    if (scene2.fog === fog) scene2.fog = previousFog;
    if (scene2.background === previousBackground) scene2.background = previousBackground;
    geometry.dispose();
    material.dispose();
    sun.dispose();
  };
}

// render-adoption/world/source-pins.mjs
var SOURCE_PINS = Object.freeze([
  {
    "path": "environment-next/meadow-layer.mjs",
    "sha256": "e8b539efc934616c05f3281ccee5e7b1017fd35f911a251b7e6f830e8f1d05d0"
  },
  {
    "path": "environment-next/previous-materials.mjs",
    "sha256": "f2488bca0f9065e9771effba1f989adf8c26ac0953646f654356ccb55b507113"
  },
  {
    "path": "environment-next/atmosphere.mjs",
    "sha256": "b6f92aca1f1dc039f6647e1b1fbe1af098463fe7e7b1cce7eda8fc23b5ebf42c"
  },
  {
    "path": "environment-next/preset.mjs",
    "sha256": "4ca21b71d5b332967af7101df049f292b5211cfec59fdab6d81639c05946ada7"
  },
  {
    "path": "environment-next/visual-field.mjs",
    "sha256": "aea9ff7ea6449161e4ad5d327be3b4dfc6793067c3ac034eff9bff8f0e3b399d"
  }
].map(Object.freeze));

// render-adoption/world/index.mjs
var qualityName = (q) => {
  if (!["normal", "low"].includes(q)) throw Error("quality must be normal or low");
  return q;
};
function createWorldLayer({ scene: scene2, terrainSurface, world: world2, invalidate = () => {
}, quality: quality2 = "normal" }) {
  if (!scene2?.add || !terrainSurface?.sample || !world2?.sample) throw Error("scene, displayed terrainSurface and analytic world required");
  quality2 = qualityName(quality2);
  let disposed2 = false, token = 0, pending = 0, current = null, lastView = null, lastContext = null, key = null, viewRevision = null, error = null, builds = 0, camera2 = null, visible = true, lastTime = null, detach = null;
  const group = new T6.Group();
  group.name = "wv007-world-grass";
  scene2.add(group);
  let materials = createMaterials(quality2);
  const notify = () => {
    if (!disposed2) invalidate();
  };
  function releaseCurrent() {
    current?.grass.dispose();
    current?.fields.dispose();
    current = null;
  }
  const api = {
    async update(view2, context = {}) {
      if (disposed2) return false;
      if (view2.schemaVersion !== 1 || view2.world.width !== world2.width || view2.world.depth !== world2.depth || String(view2.world.seed) !== String(world2.options?.seed ?? world2.seed)) throw Error("Mismatched world/read-view contract");
      const nextKey = JSON.stringify([view2.revision, view2.world.terrainRevision, context.placementView?.revision ?? null, context.landscapeView?.revision ?? null, quality2]);
      if (key === nextKey) {
        if (pending) {
          ++token;
          lastView = view2;
          lastContext = context;
        }
        return true;
      }
      const generation = ++token;
      pending++;
      lastView = view2;
      lastContext = context;
      error = null;
      await Promise.resolve();
      let fields = null, grass = null;
      try {
        if (disposed2 || generation !== token) return false;
        const classification = createClassification(world2, terrainSurface, view2, context);
        fields = buildFields(world2, classification, quality2);
        grass = createGrassManager(group, world2, terrainSurface, classification, materials.grass, quality2);
        grass.setVisible(visible);
        if (camera2) grass.setCamera(camera2);
        if (disposed2 || generation !== token) {
          grass.dispose();
          fields.dispose();
          return false;
        }
        releaseCurrent();
        current = { fields, grass, classification, coverage: classification.coverage(view2.revision) };
        materials.bind(fields, world2);
        key = nextKey;
        viewRevision = view2.revision;
        builds++;
        notify();
        return true;
      } catch (e) {
        grass?.dispose();
        fields?.dispose();
        error = String(e.message);
        notify();
        throw e;
      } finally {
        pending--;
      }
    },
    async setQuality(next) {
      if (disposed2) return false;
      next = qualityName(next);
      if (next === quality2) return true;
      ++token;
      quality2 = next;
      key = null;
      lastTime = null;
      const atmosphereWasAttached = !!detach;
      detach?.();
      detach = null;
      releaseCurrent();
      materials.dispose();
      materials = createMaterials(quality2);
      if (atmosphereWasAttached) detach = attachAtmosphere(scene2, { low: quality2 === "low", time: materials.uniforms.time });
      notify();
      return lastView ? api.update(lastView, lastContext) : true;
    },
    material(index) {
      return disposed2 ? null : materials.material(index);
    },
    attachAtmosphere() {
      if (disposed2) return () => {
      };
      detach?.();
      const release = attachAtmosphere(scene2, { low: quality2 === "low", time: materials.uniforms.time });
      detach = release;
      return () => {
        release();
        if (detach === release) detach = null;
      };
    },
    getCoverage() {
      return disposed2 ? null : current?.coverage ?? null;
    },
    sampleWorldGame(x, y) {
      return disposed2 ? null : current?.classification.query(x, y) ?? null;
    },
    setCamera(next) {
      if (disposed2) return;
      camera2 = next;
      current?.grass.setCamera(next);
    },
    setVisible(next) {
      if (disposed2) return;
      visible = !!next;
      current?.grass.setVisible(visible);
      if (!visible) api.pause();
      else if (camera2) current?.grass.setCamera(camera2);
    },
    needsAnimation({ waterVisible = false, hidden: hidden2 = false, offscreen = false } = {}) {
      return !disposed2 && !!current && visible && quality2 === "normal" && waterVisible && !hidden2 && !offscreen;
    },
    advance(now, visibility = {}) {
      if (!api.needsAnimation(visibility) || !Number.isFinite(now)) {
        api.pause();
        return false;
      }
      if (lastTime !== null) materials.uniforms.time.value += Math.max(0, Math.min(100, now - lastTime)) / 1e3;
      lastTime = now;
      return true;
    },
    pause() {
      lastTime = null;
    },
    status() {
      const grass = current?.grass.status() ?? null;
      return {
        contractRevision: 1,
        sourcePins: SOURCE_PINS,
        viewRevision,
        quality: quality2,
        effectiveLods: { terrain: quality2 === "low" ? "A3-field-low" : "A3-field-normal", water: quality2 === "low" ? "A1-static" : "A1-bounded-ripple", grass: grass?.lods ?? { near: 0, mid: 0, low: 0 } },
        pendingLoads: pending,
        disposed: disposed2,
        ready: !!current && !pending && !error,
        runtimeReady: false,
        error,
        fields: current?.fields.status ?? null,
        fieldBuilds: builds,
        grass,
        coverDeferred: !current?.classification.safeCover,
        unknownRoadWidths: current?.classification.unknownRoadWidths ?? 0,
        resources: { textures: current ? 2 : 0, decodedTextureBytes: current?.fields.status.decodedBytes ?? 0, externalImages: 0, transferImageBytes: 0, normalMaps: 0, renderTargets: 0 },
        textureSamplesPerFragment: { terrain: 1, road: 0, water: 1, grass: 0 },
        surfaceTime: materials.uniforms.time.value,
        scheduling: { ownsRAF: false, ownsTimers: false, viewportResizes: 0, visible },
        acceptance: "P5 attachment, combined offline and target-device checks pending"
      };
    },
    dispose() {
      if (disposed2) return;
      disposed2 = true;
      ++token;
      detach?.();
      detach = null;
      releaseCurrent();
      materials.dispose();
      group.removeFromParent();
      lastView = lastContext = camera2 = null;
      key = null;
    }
  };
  return api;
}

// road-visual-offsets.mjs
function roadVisualOffsets(world2, state2, vertices, kinds, liveCurve = null) {
  const lines = [];
  if (state2.roadGraph?.segments?.length) {
    const nodes = new Map(state2.roadGraph.nodes.map((n) => [n.id, n]));
    for (const e of state2.roadGraph.segments) {
      const a = nodes.get(e.a), b = nodes.get(e.b);
      if (a && b) lines.push(sampleRoadAlignment(a, liveCurve?.id === e.id ? liveCurve.control : e.control, b));
    }
  } else lines.push(...state2.roads || []);
  const segments = lines.flatMap((points) => points.slice(1).map((b, i) => [points[i], b]));
  const offsets = new Float32Array(kinds.length);
  for (let k = 0; k < kinds.length; k++) if (kinds[k] === 2) {
    const x = vertices[k * 9] + world2.width / 2, y = vertices[k * 9 + 2] + world2.depth / 2;
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
var distance3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
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
    const a = points[i - 1], b = points[i], length = distance3(a, b);
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
    const length = control ? distance3(a, control) + distance3(control, b) : distance3(a, b);
    const steps = Math.max(1, Math.ceil(length / 6));
    const points = Array.from({ length: steps + 1 }, (_, k) => control ? quadraticPoint(a, control, b, k / steps) : { x: a.x + (b.x - a.x) * k / steps, y: a.y + (b.y - a.y) * k / steps });
    const run = points.slice(1).reduce((n, p, i) => n + distance3(p, points[i]), 0);
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
  const u = b.map((v2, i) => v2 - a[i]), v = c.map((x, i) => x - a[i]);
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const norm = n.map((x) => x / len(n));
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
    const count = Math.max(1, Math.ceil(length / spacing));
    for (let k = 1; k <= count; k++) {
      const t = k / count;
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
  const cs = Math.cos(orientation), sn = Math.sin(orientation), x = width / 2, z = depth / 2;
  const position = (dx, dz) => ({
    x: p.x + dx * cs - dz * sn,
    y: p.y + dx * sn + dz * cs
  });
  const footprint = [[-x, -z], [x, -z], [x, z], [-x, z]];
  const foundation = resolveFoundation(world2, p, width, depth, orientation);
  const floor = style.floorY ?? foundation.floor;
  const vert = (dx, y, dz) => {
    const xy = position(dx, dz);
    return [xy.x - world2.width / 2, floor + y, xy.y - world2.depth / 2];
  };
  const stone = [0.5, 0.47, 0.4];
  const contacts = foundation.perimeter;
  for (let i = 0; i < contacts.length; i++) {
    const a2 = contacts[i], b2 = contacts[(i + 1) % contacts.length];
    const vertex = (q, y) => [q.x - world2.width / 2, y, q.y - world2.depth / 2];
    quad(
      out,
      vertex(a2, a2.height - 0.4),
      vertex(b2, b2.height - 0.4),
      vertex(b2, floor),
      vertex(a2, floor),
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
function accessSteps(markers, surfaces, world2, approach) {
  if (!approach) return;
  const { from, to, dx, dy, distance: distance5, floor } = approach;
  const stairLength = Math.min(distance5, Math.max(3, (floor - world2.sample(from.x, from.y).height) * 1.8));
  const n = Math.max(2, Math.ceil(stairLength / 1.5));
  const point = (along, side, y) => [from.x + dx * along - dy * side - world2.width / 2, y, from.y + dy * along + dx * side - world2.depth / 2];
  const end = { x: from.x + dx * stairLength, y: from.y + dy * stairLength };
  const bottom = world2.sample(end.x, end.y).height + 0.85;
  for (let i = 0; i < n; i++) {
    const a = i / n * stairLength, b = (i + 1) / n * stairLength, y = floor + (bottom - floor) * i / n, next = floor + (bottom - floor) * (i + 1) / n;
    quad(markers, point(a, -1.2, y), point(b, -1.2, y), point(b, 1.2, y), point(a, 1.2, y), [0.5, 0.47, 0.4]);
    quad(markers, point(b, -1.2, y), point(b, -1.2, next), point(b, 1.2, next), point(b, 1.2, y), [0.46, 0.43, 0.37]);
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
      const x = Math.floor((p.x + dx) / step), y = Math.floor((p.y + dy) / step);
      const center = { x: (x + 0.5) * step, y: (y + 0.5) * step };
      if (center.x < 0 || center.y < 0 || center.x > world2.width || center.y > world2.depth) continue;
      if (world2.sample(center.x, center.y).water !== null) continue;
      if ((state2.roads || []).some((line) => line.some((point, i) => {
        if (!i) return false;
        const a = line[i - 1], b = point, vx = b.x - a.x, vy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((center.x - a.x) * vx + (center.y - a.y) * vy) / (vx * vx + vy * vy || 1)));
        return Math.hypot(center.x - a.x - vx * t, center.y - a.y - vy * t) < 17;
      }))) continue;
      paint.set(x + "," + y, { x, y, type });
    }
  }
  for (const stroke of state2.zones || []) applyStroke(stroke.points, stroke.radius, stroke.type);
  const pending = zoneEdits || zoneStrokes.map((points) => ({ type: zoneType, radius: zoneRadius, points }));
  for (const edit of pending) applyStroke(edit.points, edit.radius, edit.type);
  let drawn = 0;
  for (const p of paint.values()) {
    if (p.type === "erase" || drawn++ > 12e3) continue;
    const x = p.x * step, y = p.y * step;
    const corners = [[x, y], [x + step, y], [x + step, y + step], [x, y + step]].map(([xx, yy]) => worldPos(world2, { x: xx, y: yy }, 0.35));
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
  } else for (const road2 of state2.roads || []) {
    if (road2.length < 2) continue;
    surfaceRibbon(surfaces, world2, road2, 34, colors.roadEdge, 0.95, 2);
    surfaceRibbon(surfaces, world2, road2, 24, colors.road, 1.3, 1);
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
        const position = (x, y) => ({ x: building.x + x * cs - y * sn, y: building.y + x * sn + y * cs });
        const w = model.width / 2, d = model.depth / 2;
        const polygon = [[-w * 0.7, -d], [w * 0.7, -d], [w, -d * 0.7], [w, d * 0.7], [w * 0.7, d], [-w * 0.7, d], [-w, d * 0.7], [-w, -d * 0.7]].map(([x, y]) => position(x, y));
        if (building.type !== "park") {
          const triangles = world2.drapePolygon ? world2.drapePolygon(polygon) : [polygon];
          for (const tri of triangles) {
            const center = { x: tri.reduce((n, p) => n + p.x, 0) / tri.length, y: tri.reduce((n, p) => n + p.y, 0) / tri.length };
            if ([...tri, center].every((p) => world2.sample(p.x, p.y).water === null)) surfacePolygon(surfaces, world2, tri, building.type === "plaza" ? [0.58, 0.55, 0.47] : colors.path, 0.65, building.type === "plaza" ? 5 : 6);
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

// render-adoption/world/review.mjs
var params = new URLSearchParams(location.search);
var quality = params.get("quality") === "low" ? "low" : "normal";
var seed = params.get("seed") || "WILLOW-1048";
var fixture = realWorldFixture(seed, quality);
var { world, surface, view, state } = fixture;
var canvas = document.querySelector("canvas");
var scene = new T7.Scene();
var renderer = new T7.WebGLRenderer({ canvas, antialias: true });
renderer.outputColorSpace = T7.SRGBColorSpace;
var camera = new T7.OrthographicCamera(-1, 1, 1, -1, 0.1, 5400);
var layer = createWorldLayer({ scene, world, terrainSurface: surface, quality });
var dims = view.world.terrainRevision.split(":").map(Number);
var mesh = createWorldMesh(world, ...dims, { trees: false });
var settlement = settlementGeometry(surface, state);
var owned = [];
var draws = 0;
var resizes = 0;
var disposed = false;
var lastSize = "";
var target = state.houses[0];
var zoom = 90;
var hidden = false;
function add(data, material, kinds) {
  const g = new T7.BufferGeometry(), buffer = new T7.InterleavedBuffer(data, 9);
  for (const [n, o] of [["position", 0], ["color", 3], ["normal", 6]]) g.setAttribute(n, new T7.InterleavedBufferAttribute(buffer, 3, o));
  if (kinds) g.setAttribute("surfaceKind", new T7.BufferAttribute(kinds, 1));
  const m = new T7.Mesh(g, material);
  scene.add(m);
  owned.push(m);
  return m;
}
await layer.update(view);
layer.attachAtmosphere();
var ground = add(mesh.ground, layer.material(0));
var water = add(mesh.water, layer.material(1));
var road = add(settlement.surfaces, layer.material(5), settlement.surfaceKinds);
if (settlement.structures.length) add(new Float32Array(settlement.structures), new T7.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
function render() {
  if (disposed || hidden || document.hidden) return;
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(devicePixelRatio || 1, quality === "low" ? 1 : 1.5), size = `${w}:${h}:${dpr}`;
  if (size !== lastSize) {
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    lastSize = size;
    resizes++;
  }
  camera.left = -zoom * w / h;
  camera.right = zoom * w / h;
  camera.top = zoom;
  camera.bottom = -zoom;
  camera.position.set(target.x - world.width / 2, 400, target.y - world.depth / 2 + 340);
  camera.lookAt(target.x - world.width / 2, surface.sample(target.x, target.y).height, target.y - world.depth / 2);
  camera.updateProjectionMatrix();
  layer.setCamera(camera);
  renderer.render(scene, camera);
  draws++;
  document.querySelector("output").textContent = JSON.stringify(status(), null, 2);
}
function status() {
  return { ...layer.status(), draws, viewportResizes: resizes, renderer: { ...renderer.info.render, drawingBufferWidth: canvas.width, drawingBufferHeight: canvas.height, outputColorSpace: renderer.outputColorSpace, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures }, stateUnchanged: JSON.stringify(state) === fixture.before };
}
function find(kind) {
  for (let y = 140; y < world.depth - 140; y += 15) for (let x = 140; x < world.width - 140; x += 15) {
    if (view.houses.concat(view.facilities).some((h) => Math.hypot(x - h.savedPosition.x, y - h.savedPosition.y) < 180)) continue;
    const q = layer.sampleWorldGame(x, y);
    if (q.kind === kind) return { x, y };
  }
  return null;
}
async function setView(name) {
  zoom = name === "wide" ? 700 : 90;
  target = name === "homes" || name === "wide" ? state.houses[0] : find(name) ?? state.houses[0];
  const exclusionsWorldGame = view.houses.concat(view.facilities).map((h) => {
    const { x, y } = h.savedPosition, r = 100;
    return { polygon: [{ x: x - r, y: y - r }, { x: x + r, y: y - r }, { x: x + r, y: y + r }, { x: x - r, y: y + r }] };
  });
  await layer.update(view, { placementView: { revision: "review-conservative-1", complete: true, exclusionsWorldGame }, landscapeView: { revision: "review-empty-1", complete: true, exclusionsWorldGame: [] } });
  render();
  return { found: name === "homes" || name === "wide" || layer.sampleWorldGame(target.x, target.y).kind === name, target };
}
for (const name of ["homes", "meadow", "forest", "rock", "bank", "lake", "river", "wide"]) {
  const b = document.createElement("button");
  b.textContent = name;
  b.onclick = () => setView(name);
  document.querySelector("nav").append(b);
}
window.worldHarness = {
  fixture,
  layer,
  camera,
  renderer,
  scene,
  ground,
  water,
  road,
  status,
  render,
  setView,
  setHidden(v) {
    hidden = v;
    layer.setVisible(!v);
    render();
  },
  async quality(next) {
    await layer.setQuality(next);
    ground.material = layer.material(0);
    water.material = layer.material(1);
    road.material = layer.material(5);
    render();
  },
  dispose() {
    if (disposed) return;
    disposed = true;
    layer.dispose();
    for (const m of owned) {
      m.removeFromParent();
      m.geometry.dispose();
      if (![ground, water, road].includes(m)) m.material.dispose();
    }
    renderer.dispose();
  }
};
window.addEventListener("resize", render);
window.addEventListener("pagehide", () => window.worldHarness.dispose());
render();

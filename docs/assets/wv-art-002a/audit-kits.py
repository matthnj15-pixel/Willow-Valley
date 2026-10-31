#!/usr/bin/env python3
"""Reproduce research metadata, not a runtime importer. Python 3 stdlib only.
Usage: python audit-kits.py --kits /tmp/wv-kits --out /tmp/wv-audit
Kits directory contains fantasy/, survival/, nature/, castle/ extracted archives.
Measures default-scene bind pose with node transforms; no animation evaluation.
"""
import argparse, csv, hashlib, json, math, struct
from pathlib import Path


def sha(data):
    return hashlib.sha256(data).hexdigest()


def mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def identity():
    return [[float(i == j) for j in range(4)] for i in range(4)]


def matrix(node):
    if 'matrix' in node:
        return [[node['matrix'][j*4+i] for j in range(4)] for i in range(4)]
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    s = node.get('scale', [1, 1, 1]); t = node.get('translation', [0, 0, 0])
    r = [[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
         [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
         [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]]
    return [[r[i][j]*s[j] if j < 3 else t[i] for j in range(4)] for i in range(3)] + [[0, 0, 0, 1]]


def inspect(path, root):
    data = path.read_bytes(); magic, version, length = struct.unpack_from('<III', data)
    assert magic == 0x46546c67 and version == 2 and length == len(data), path
    chunks = {}; pos = 12
    while pos < length:
        size, kind = struct.unpack_from('<II', data, pos); pos += 8
        assert pos+size <= length
        chunks[kind] = data[pos:pos+size]; pos += size
    g = json.loads(chunks[0x4e4f534a]); binary = chunks.get(0x004e4942, b'')
    def positions(aid):
        a = g['accessors'][aid]; assert a['type'] == 'VEC3' and a['componentType'] == 5126
        assert 'sparse' not in a
        bv = g['bufferViews'][a['bufferView']]; assert bv.get('buffer', 0) == 0
        offset = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        return [struct.unpack_from('<fff', binary, offset+i*bv.get('byteStride', 12)) for i in range(a['count'])]
    lo = [math.inf]*3; hi = [-math.inf]*3; triangles = 0; primitives = 0
    def walk(nid, parent):
        nonlocal triangles, primitives
        n = g['nodes'][nid]; m = mul(parent, matrix(n))
        if 'mesh' in n:
            for p in g['meshes'][n['mesh']]['primitives']:
                mode = p.get('mode', 4); assert mode == 4, (path, mode)
                primitives += 1
                aid = p.get('indices', p['attributes']['POSITION']); count = g['accessors'][aid]['count']
                assert count % 3 == 0
                triangles += count//3
                for xyz in positions(p['attributes']['POSITION']):
                    point = [sum(m[i][j]*(*xyz, 1)[j] for j in range(4)) for i in range(3)]
                    for i in range(3): lo[i] = min(lo[i], point[i]); hi[i] = max(hi[i], point[i])
        for child in n.get('children', []): walk(child, m)
    for nid in g['scenes'][g.get('scene', 0)]['nodes']: walk(nid, identity())
    deps = []
    for image in g.get('images', []):
        uri = image.get('uri')
        if uri and not uri.startswith('data:'):
            target = path.parent/uri; b = target.read_bytes()
            dims = list(struct.unpack_from('>II', b, 16)) if b[:8] == b'\x89PNG\r\n\x1a\n' else None
            deps.append(dict(uri=uri, path=target.relative_to(root).as_posix(), bytes=len(b), sha256=sha(b), pngSize=dims))
    return dict(path=path.relative_to(root).as_posix(), bytes=len(data), sha256=sha(data),
        boundsMin=[round(v,6) for v in lo], boundsMax=[round(v,6) for v in hi],
        dimensions=[round(hi[i]-lo[i],6) for i in range(3)], sceneTriangles=triangles,
        scenePrimitives=primitives, materials=len(g.get('materials', [])),
        nodes=len(g.get('nodes', [])), animations=len(g.get('animations', [])),
        extensionsUsed=g.get('extensionsUsed', []), extensionsRequired=g.get('extensionsRequired', []),
        externalImages=deps, embeddedImages=sum('bufferView' in i for i in g.get('images', [])),
        rootNodes=g['scenes'][g.get('scene',0)]['nodes'],
        rootTransforms=[g['nodes'][i] for i in g['scenes'][g.get('scene',0)]['nodes']],
        license='CC0-1.0', entranceVerified=False)


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--kits', type=Path, required=True); parser.add_argument('--out',type=Path,required=True)
    args = parser.parse_args(); args.out.mkdir(parents=True,exist_ok=True)
    rows = []
    for kit in ['fantasy','survival','nature','castle']:
        root = args.kits/kit
        for p in sorted(root.rglob('*.glb')): rows.append(dict(kit=kit, **inspect(p,root)))
    (args.out/'measured-models.json').write_text(json.dumps(rows,indent=2)+'\n')
    fields=['kit','path','bytes','sha256','dimensions','boundsMin','boundsMax','sceneTriangles','scenePrimitives','materials','nodes','animations','extensionsUsed','externalImages','embeddedImages']
    with (args.out/'kit-inventory.csv').open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=fields,lineterminator="\n"); w.writeheader()
        for row in rows:
            w.writerow({k:json.dumps(row[k],separators=(',',':')) if isinstance(row[k],(list,dict)) else row[k] for k in fields})
    print(json.dumps({kit:sum(r['kit']==kit for r in rows) for kit in ['fantasy','survival','nature','castle']}))

if __name__ == '__main__': main()

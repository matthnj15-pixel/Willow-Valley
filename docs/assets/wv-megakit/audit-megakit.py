#!/usr/bin/env python3
"""Read an unmodified, locally owned MegaKit ZIP; emit metadata only.

Requires Python 3 + numpy. Never copies model, texture, engine or archive bytes
to the output directory. Outputs are deterministic except for CLI source paths,
which are deliberately omitted. Scene recipes contain source references and
authored transforms, not embedded geometry. No vendor code is executed.
"""
import argparse, collections, csv, hashlib, io, json, math, re, struct, zipfile
from pathlib import Path, PurePosixPath
import numpy as np

MODEL_EXTS = {'.gltf', '.fbx', '.obj', '.blend', '.uasset'}
GROUPS = ['House C', 'House C2', 'Tower', 'Houses A', 'Houses D']

def sha(data):
    return hashlib.sha256(data).hexdigest()

def dump(path, data):
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

def category(name):
    for prefix, label in [('Balcony_', 'balcony'), ('Corner_', 'corner'),
                          ('DoorFrame_', 'door-frame'), ('Door_', 'door'),
                          ('Floor_', 'floor'), ('HoleCover_', 'closure'),
                          ('Overhang_', 'overhang'), ('Prop_', 'prop'),
                          ('Roof_', 'roof'), ('Stairs_', 'stairs'),
                          ('Stair_', 'stairs'), ('Wall_', 'wall'),
                          ('WindowShutters_', 'shutter'), ('Window_', 'window')]:
        if name.startswith(prefix): return label
    return 'other'

def matrix(node):
    if 'matrix' in node: return np.array(node['matrix']).reshape(4, 4, order='F')
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    rotation = np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)],
                         [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)],
                         [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
    result = np.eye(4)
    result[:3, :3] = rotation @ np.diag(node.get('scale', [1, 1, 1]))
    result[:3, 3] = node.get('translation', [0, 0, 0])
    return result

def inspect_gltf(z, name):
    doc = json.loads(z.read(name))
    base = PurePosixPath(name).parent
    dependencies, missing_dependencies = [], []
    for item in doc.get('buffers', []) + doc.get('images', []):
        if 'uri' in item:
            uri = item['uri']
            if uri.startswith('data:') or '://' in uri:
                raise ValueError('Unexpected embedded/remote URI: ' + uri)
            path = str(base / uri)
            dependencies.append(path)
            if path not in z.namelist(): missing_dependencies.append(path)
    buffers = [z.read(str(base / b['uri'])) for b in doc.get('buffers', [])]
    all_points, primitives, tris, visual_nodes = [], 0, 0, 0
    def visit(index, parent):
        nonlocal primitives, tris, visual_nodes
        node = doc['nodes'][index]
        transform = parent @ matrix(node)
        # Godot collision nodes are import directives, never visual scenery.
        collision = '-convcolonly' in node.get('name', '')
        if 'mesh' in node and not collision:
            visual_nodes += 1
            for primitive in doc['meshes'][node['mesh']]['primitives']:
                if primitive.get('mode', 4) != 4: raise ValueError('Non-triangle primitive')
                accessor = doc['accessors'][primitive['attributes']['POSITION']]
                if accessor['componentType'] != 5126: raise ValueError('Non-float POSITION')
                view = doc['bufferViews'][accessor['bufferView']]
                offset = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
                points = np.ndarray((accessor['count'], 3), dtype='<f4',
                    buffer=buffers[view['buffer']], offset=offset,
                    strides=(view.get('byteStride', 12), 4)).astype(float)
                points = points @ transform[:3, :3].T + transform[:3, 3]
                all_points.append(points)
                tris += doc['accessors'][primitive['indices']]['count']//3 if 'indices' in primitive else accessor['count']//3
                primitives += 1
        for child in node.get('children', []): visit(child, transform)
    for root in doc['scenes'][doc.get('scene', 0)].get('nodes', []): visit(root, np.eye(4))
    points = np.concatenate(all_points) if all_points else np.empty((0, 3))
    lo, hi = points.min(axis=0), points.max(axis=0)
    record = dict(name=PurePosixPath(name).stem, path=name, category=category(PurePosixPath(name).stem),
        sha256=sha(z.read(name)), bytes=len(z.read(name)),
        boundsMin=lo.tolist(), boundsMax=hi.tolist(), dimensions=(hi-lo).tolist(),
        triangles=tris, primitives=primitives, visualMeshNodes=visual_nodes,
        materialNames=[m.get('name', '') for m in doc.get('materials', [])],
        materials=len(doc.get('materials', [])), dependencies=dependencies,
        dependencyBytes=sum(len(z.read(n)) for n in dependencies if n not in missing_dependencies),
        missingDependencies=missing_dependencies,
        animations=len(doc.get('animations', [])), units='unverified authoring units',
        completeBuilding=False)
    return record, points

def godot_transform(body):
    found = re.search(r'^transform = Transform3D\(([^)]+)\)', body, re.M)
    result = np.eye(4)
    if found:
        values = [float(n) for n in found[1].split(',')]
        result[:3, :3] = np.array(values[:9]).reshape(3, 3, order='F')
        result[:3, 3] = values[9:]
    return result

def inspect_scene(z, scene_name):
    text = z.read(scene_name).decode()
    refs = {id_: path.replace('res://', 'Godot/') for path, id_ in
            re.findall(r'^\[ext_resource type="PackedScene".*?path="([^"]+)" id="([^"]+)"\]', text, re.M)}
    scene_nodes = list(re.finditer(r'^\[node([^\n]*)\]\n([^\[]*)', text, re.M))
    geometries = {}
    recipes = []
    for group in GROUPS:
        parts, combined, triangles, primitive_count = [], [], 0, 0
        for match in scene_nodes:
            header, body = match[1], match[2]
            parent = re.search(r'parent="([^"]+)"', header)
            ref = re.search(r'instance=ExtResource\("([^"]+)"\)', header)
            if not parent or parent[1] != group or not ref: continue
            path = refs[ref[1]]
            if path not in geometries: geometries[path] = inspect_gltf(z, path)
            record, points = geometries[path]
            transform = godot_transform(body)
            combined.append(points @ transform[:3, :3].T + transform[:3, 3])
            triangles += record['triangles']; primitive_count += record['primitives']
            parts.append(dict(node=re.search(r'name="([^"]+)"', header)[1],
                source=path, canonicalSource='glTF/'+PurePosixPath(path).name,
                matrix=transform.flatten(order='F').tolist()))
        points = np.concatenate(combined)
        lo, hi = points.min(axis=0), points.max(axis=0)
        signature = sha(json.dumps([(p['canonicalSource'], p['matrix']) for p in parts], sort_keys=True).encode())
        recipes.append(dict(group=group, sourceScene=scene_name,
            sourceGroupPlacementExcluded=True, parts=parts,
            boundsMin=lo.tolist(), boundsMax=hi.tolist(), dimensions=(hi-lo).tolist(),
            triangles=triangles, primitivesBeforeBatching=primitive_count,
            uniqueModules=len(set(p['canonicalSource'] for p in parts)),
            recipeSignature=signature, status='source-demo-assembly; visual review required'))
    return recipes, len(scene_nodes)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('archive', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    archive_hash = hashlib.file_digest(args.archive.open('rb'), 'sha256').hexdigest()
    file_rows, nested_summaries, licenses = [], [], []
    def inventory(z, container=''):
        for info in z.infolist():
            if info.is_dir(): continue
            content = z.read(info)
            ext = PurePosixPath(info.filename).suffix.lower()
            file_rows.append(dict(container=container or 'outer', path=info.filename,
                bytes=info.file_size, sha256=sha(content), extension=ext,
                modelContainer=ext in MODEL_EXTS))
            if any(t in PurePosixPath(info.filename).name.lower() for t in ['license', 'licence', 'copyright']):
                licenses.append(dict(container=container or 'outer', path=info.filename,
                    sha256=sha(content), text=content.decode(errors='replace')))
            if ext == '.zip':
                with zipfile.ZipFile(io.BytesIO(content)) as nested:
                    nested_summaries.append(dict(path=info.filename,
                        fileCount=sum(not i.is_dir() for i in nested.infolist()),
                        expandedBytes=sum(i.file_size for i in nested.infolist()),
                        extensions=dict(collections.Counter(PurePosixPath(i.filename).suffix.lower() for i in nested.infolist() if not i.is_dir()))))
                    inventory(nested, info.filename)
    with zipfile.ZipFile(args.archive) as z:
        inventory(z)
        models = [inspect_gltf(z, n)[0] for n in sorted(z.namelist())
                  if n.startswith('glTF/') and n.endswith('.gltf')]
        variants = []
        for name in sorted(z.namelist()):
            if name.startswith('glTF (Godot)/') and name.endswith('.gltf'):
                variants.append(inspect_gltf(z, name)[0])
        with zipfile.ZipFile(io.BytesIO(z.read('Engine Projects/Godot.zip'))) as godot:
            scene_name = next(n for n in godot.namelist() if n.endswith('.tscn'))
            recipes, scene_node_count = inspect_scene(godot, scene_name)
        textures = []
        for n in z.namelist():
            if n.lower().endswith('.png'):
                data = z.read(n)
                width, height = struct.unpack('>II', data[16:24])
                textures.append(dict(path=n, bytes=len(data), sha256=sha(data),
                    width=width, height=height, estimatedRGBA8Bytes=width*height*4))
        unique_textures = {t['sha256']: t for t in textures}
        license_doc = z.read('License_Source.txt')
        summary = dict(schemaVersion=1, baselineCommit='604a2272a38e02c539027d2611d0d059b1370e76',
            inspectionDate='2026-10-31', archive=dict(filename='Medieval Village MegaKit[Source].zip',
            bytes=args.archive.stat().st_size, sha256=archive_hash,
            expandedBytes=sum(i.file_size for i in z.infolist()),
            files=sum(not i.is_dir() for i in z.infolist())),
            canonicalModelCount=len(models), categoryCounts=dict(collections.Counter(m['category'] for m in models)),
            completeLooseBuildingModels=0, godotExportCount=len(variants),
            canonicalTriangles=sum(m['triangles'] for m in models),
            triangleRange=[min(m['triangles'] for m in models), max(m['triangles'] for m in models)],
            sourceLicense=dict(path='License_Source.txt', sha256=sha(license_doc), declared='CC0-1.0'),
            nestedArchives=nested_summaries, allContainerFileCount=len(file_rows),
            demoSceneNodeCount=scene_node_count, demoBuildingGroups=len(recipes),
            uniqueOuterPNGHashes=len(unique_textures),
            uniqueOuterPNGBytes=sum(t['bytes'] for t in unique_textures.values()))
    dump(args.output/'summary.json', summary)
    dump(args.output/'models.json', models)
    dump(args.output/'godot-variants.json', variants)
    dump(args.output/'demo-assemblies.json', recipes)
    dump(args.output/'license-findings.json', licenses)
    dump(args.output/'textures.json', textures)
    with (args.output/'all-files.csv').open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(file_rows[0]), lineterminator='\n'); writer.writeheader(); writer.writerows(file_rows)
    with (args.output/'models.csv').open('w', newline='') as f:
        writer = csv.writer(f, lineterminator='\n')
        writer.writerow(['name', 'category', 'path', 'triangles', 'primitives', 'materials', 'width', 'height', 'depth', 'bytes', 'dependencyBytes', 'sha256'])
        for m in models:
            writer.writerow([m['name'], m['category'], m['path'], m['triangles'], m['primitives'], m['materials'], *m['dimensions'], m['bytes'], m['dependencyBytes'], m['sha256']])
    print(json.dumps(summary, indent=2))
    for r in recipes: print(r['group'], len(r['parts']), r['dimensions'], r['triangles'], r['uniqueModules'])

if __name__ == '__main__': main()

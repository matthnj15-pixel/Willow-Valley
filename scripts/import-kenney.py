"""Acquire only manifest-approved CC0 meshes, verifying every byte and dependency."""
import hashlib,json,pathlib,urllib.request,zipfile,io
root=pathlib.Path(__file__).resolve().parents[1]
manifest=json.loads((root/'docs/assets/wv-art-002a/source-manifest.json').read_text())
def verified(data,expected):
    actual=hashlib.sha256(data).hexdigest()
    if actual!=expected: raise ValueError('SHA-256 mismatch: '+actual)
    return data
for archive in manifest['archives']:
    data=verified(urllib.request.urlopen(archive['acquiredURL']).read(),archive['sha256'])
    kit=archive['id'];destination=root/'assets/wv/sources'/kit
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        rows=[a for a in manifest['assets'] if a['kit']==kit]
        for row in rows:
            for item in [row,*row['externalImages']]:
                content=verified(z.read(item['path']),item['sha256'])
                target=destination/item['path'];target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(content)
        license=(root/'docs/assets/wv-art-002a'/archive['licensePath']).read_bytes()
        verified(license,archive['licenseSha256'])
        (destination/'License.txt').write_bytes(license)
    print(kit,len(rows),'verified source files')

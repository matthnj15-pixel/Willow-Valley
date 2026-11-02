// Selective CC0 MegaKit import. Source archives and raw collections stay outside Git.
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {Document,NodeIO} from '@gltf-transform/core';import {copyToDocument,flatten,join as joinMeshes,prune,dedup,weld,unpartition,getBounds} from '@gltf-transform/functions';import sharp from 'sharp';
export const kitNames=['Prop_Crate','Prop_Wagon','Prop_WoodenFence_Single','Prop_Support','Prop_Vine1','Prop_Vine4','WindowShutters_Thin_Round_Open','WindowShutters_Thin_Flat_Open','Window_Thin_Flat1'];
export const kitHash=b=>createHash('sha256').update(b).digest('hex');
const root='assets/wv/buildings-next';
export async function importKit(archive){
 const temp=await mkdtemp(join(tmpdir(),'wv006-kit-'));
 try{
  const report=JSON.parse(execFileSync('python3',['-c',`import sys,json,csv,zipfile,hashlib,pathlib
archive,dest,names=sys.argv[1:];names=json.loads(names);sha=hashlib.file_digest(open(archive,'rb'),'sha256').hexdigest()
assert sha in ['e60dea67c10f30dccccfbff92a7933f5ea5cfe99be0e2a0fa5118cceabeec5c4','5e60888e2babe418a4618e7815539d9b1b2c3b24c1db2b22cd7a2a7f66140732'],'Unreviewed archive revision'
is_source=sha.startswith('5e60888e')
models=json.load(open('docs/assets/wv-megakit/models.json'));rows={r['path']:r for r in csv.DictReader(open('docs/assets/wv-megakit/all-files.csv')) if r['container']=='outer'}
paths=set()
for m in models:
 if m['name'] in names:paths.update([m['path'],*m['dependencies']])
for family,kind in [('WoodTrim','Roughness'),('RockTrim','ORM'),('Plaster','ORM'),('RoundTiles','Roughness')]:
 for suffix in ['BaseColor','Normal',kind]:paths.add('glTF/T_'+family+'_'+suffix+'.png')
for family in ['Brick','UnevenBrick']:
 for suffix in ['Normal','Roughness']:paths.add('glTF/T_'+family+'_'+suffix+'.png')
records=[]
with zipfile.ZipFile(archive) as z:
 prefix='' if is_source else 'Medieval Village MegaKit[Standard]/';license=z.read(prefix+('License_Source.txt' if is_source else 'License_Standard.txt'));assert b'CC0 1.0 Universal' in license
 if is_source:assert hashlib.sha256(license).hexdigest()=='7310dfa8512d7ca12b6591329fda4adab7e8b9cdbe04c7d7061c2fe5c7dc38ee'
 if is_source:
  for suffix in ['BaseColor','Normal','Roughness']:paths.add('glTF/T_FlatTiles_'+suffix+'.png')
 pathlib.Path(dest,'License_Kit_Standard.txt').write_bytes(license)
 for p in sorted(paths):
  b=z.read(prefix+p);assert hashlib.sha256(b).hexdigest()==rows[p]['sha256'],p
  f=pathlib.Path(dest,p);f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(b);records.append({'url':p,'sha256':rows[p]['sha256'],'bytes':len(b)})
print(json.dumps({'sourceTier':'Source' if is_source else 'Standard matching subset','archiveSha256':sha,'archiveBytes':pathlib.Path(archive).stat().st_size,'licenseSha256':hashlib.sha256(license).hexdigest(),'files':records}))`,archive,temp,JSON.stringify(kitNames)],{encoding:'utf8'}));
  await mkdir(root+'/kit-surfaces',{recursive:true});await writeFile(root+'/License_Kit_Source.txt',await readFile(temp+'/License_Kit_Standard.txt'));
  const surfaces={};for(const [family,rough] of [['WoodTrim','Roughness'],['RockTrim','ORM'],['Plaster','ORM'],['RoundTiles','Roughness'],['Brick','Roughness'],['UnevenBrick','Roughness'],['FlatTiles','Roughness']]){surfaces[family]={};for(const [kind,suffix,size] of [['base','BaseColor',512],['normal','Normal',512],['rough',rough,256]]){const url='glTF/T_'+family+'_'+suffix+'.png';if(!report.files.some(f=>f.url===url))continue;const src=await readFile(temp+'/'+url);let bytes,mime;
    if(kind==='base'){bytes=await sharp(src).resize(size,size).modulate({saturation:.68}).jpeg({quality:90,mozjpeg:true}).toBuffer();mime='image/jpeg';}
    else {const {data,info}=await sharp(src).resize(size,size).removeAlpha().raw().toBuffer({resolveWithObject:true});for(let i=0;i<data.length;i+=info.channels){if(kind==='normal'){const x=data[i]/127.5-1,y=data[i+1]/127.5-1,z=data[i+2]/127.5-1,L=Math.hypot(x,y,z)||1;data[i]=Math.round((x/L+1)*127.5);data[i+1]=Math.round((y/L+1)*127.5);data[i+2]=Math.round((z/L+1)*127.5);}else{const r=data[i+1];data[i]=255;data[i+1]=r;data[i+2]=0;}}bytes=await sharp(data,{raw:info}).png().toBuffer();mime='image/png';}
    const output=root+'/kit-surfaces/'+family+'-'+kind+(kind==='base'?'.jpg':'.png');await writeFile(output,bytes);surfaces[family][kind]={url:output,sha256:kitHash(bytes),source:url,sourceSha256:kitHash(src),bytes:bytes.length,width:size,height:size,mime,recipe:kind==='base'?'resize 512, saturation .68, JPEG90':kind==='normal'?'linear resize 512 and renormalize tangent-space RGB':'resize 256; keep roughness G; R=255, B=0 (nonmetal)'};
  }}
  const io=new NodeIO(),doc=new Document(),scene=doc.createScene('licensed-kit-details');doc.getRoot().setDefaultScene(scene);const entries=[];
  for(const name of kitNames){const source=await io.read(temp+'/glTF/'+name+'.gltf'),src=source.getRoot().getDefaultScene().listChildren(),map=copyToDocument(doc,source,src),r=doc.createNode(name);scene.addChild(r);src.forEach(n=>r.addChild(map.get(n)));}
  for(const m of doc.getRoot().listMaterials())m.setNormalTexture(null).setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(.94);
  await doc.transform(prune());for(const t of doc.getRoot().listTextures()){const alpha=(await sharp(t.getImage()).metadata()).hasAlpha;const bytes=alpha?await sharp(t.getImage()).resize(256,256).modulate({saturation:.68}).png().toBuffer():await sharp(t.getImage()).resize(512,512).modulate({saturation:.68}).jpeg({quality:90,mozjpeg:true}).toBuffer();t.setImage(bytes).setMimeType(alpha?'image/png':'image/jpeg');}
  for(const r of [...scene.listChildren()]){const sub=new Document(),s=sub.createScene(),map=copyToDocument(sub,doc,[r]);s.addChild(map.get(r));await sub.transform(flatten(),joinMeshes(),prune());const copied=copyToDocument(doc,sub,s.listChildren()),wrapper=doc.createNode(r.getName());s.listChildren().forEach(n=>wrapper.addChild(copied.get(n)));scene.removeChild(r);scene.addChild(wrapper);}
  await doc.transform(dedup(),weld(),unpartition(),prune());for(const r of scene.listChildren()){const b=getBounds(r);let triangles=0;const materials=new Set();r.traverse(n=>n.getMesh()?.listPrimitives().forEach(p=>{triangles+=(p.getIndices()?.getCount()??p.getAttribute('POSITION').getCount())/3;materials.add(p.getMaterial());}));entries.push({id:r.getName(),boundsMin:b.min,boundsMax:b.max,triangles,materialGroups:materials.size,source:'glTF/'+r.getName()+'.gltf'});}
  const bytes=await io.writeBinary(doc);await writeFile(root+'/kit-library.glb',bytes);await writeFile(root+'/kit-library-manifest.json',JSON.stringify({recipeRevision:1,license:'CC0-1.0',publisher:'Quaternius',downloadPage:'https://quaternius.itch.io/medieval-village-megakit',...report,surfaces,entries,output:{url:root+'/kit-library.glb',sha256:kitHash(bytes),bytes:bytes.length},notice:root+'/License_Kit_Source.txt',privateArchiveUsed:report.sourceTier==='Source',missingSourceMaps:surfaces.FlatTiles.normal?[]:['FlatTiles normal/roughness unavailable in this subset; existing geometry/base colors retained.']},null,2)+'\n');
 }finally{await rm(temp,{recursive:true,force:true});}
}

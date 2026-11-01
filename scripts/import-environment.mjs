// Offline derivative build: fetch source URLs from the manifest separately.
import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
const entries=[];
for(const [id,asset] of [['grass','leafy_grass'],['soil','dirt']]){
 const name=id==='soil'?'dirt':id,metadata=JSON.parse(await readFile('/tmp/'+name+'-files.json'));
 const source=metadata.Diffuse['1k'].jpg,bytes=await readFile('/tmp/'+name+'-source.jpg');
 if(createHash('md5').update(bytes).digest('hex')!==source.md5||bytes.length!==source.size)throw Error('Publisher byte mismatch');
 const output=await sharp(bytes).resize(512,512).jpeg({quality:82,chromaSubsampling:'4:4:4'}).toBuffer();
 const url='assets/wv/environment-v1/'+id+'.jpg';await writeFile(url,output);
 entries.push({id,url,publisher:'Poly Haven',assetURL:'https://polyhaven.com/a/'+asset,metadataURL:'https://api.polyhaven.com/files/'+asset,license:'CC0-1.0',licenseURL:'https://polyhaven.com/license',sourceURL:source.url,sourceSHA256:hash(bytes),sourceBytes:bytes.length,publisherMD5:source.md5,sha256:hash(output),bytes:output.length,width:512,height:512,map:'albedo',colorSpace:'srgb',processing:'sharp 0.35.5 resize 512x512, JPEG quality 82, 4:4:4'});
}
await writeFile('environment-asset-manifest.json',JSON.stringify({version:1,entries},null,2)+'\n');

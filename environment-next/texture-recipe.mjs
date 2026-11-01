import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
export async function importDetailTextures(sourceDirectory){
 const sources=[],entries=[];
 for(const [id,asset,name] of [['grass','leafy_grass','grass'],['soil','dirt','dirt'],['rock','rock_face_03','rock']]){
  const metadataBytes=await readFile(path.join(sourceDirectory,name+'-files.json')),metadata=JSON.parse(metadataBytes);
  for(const [map,key,ext,size] of [['color','Diffuse','jpg',id==='rock'?512:1024],['normal','nor_gl','png',id==='rock'?256:512]]){
   const acquired=await readFile(path.join(sourceDirectory,name+'-'+map+'.'+ext)),publisher=metadata[key]['1k'][ext];
   if(acquired.length!==publisher.size||createHash('md5').update(acquired).digest('hex')!==publisher.md5)throw Error('Publisher mismatch: '+id+' '+map);
   const source={id:id+'-'+map,assetURL:'https://polyhaven.com/a/'+asset,metadataURL:'https://api.polyhaven.com/files/'+asset,metadataSHA256:sha(metadataBytes),sourceURL:publisher.url,sourceBytes:acquired.length,sourceSHA256:sha(acquired),publisherMD5:publisher.md5,license:'CC0-1.0',licenseURL:'https://polyhaven.com/license'};sources.push(source);
   const image=sharp(acquired).resize(size,size,{kernel:'lanczos3'}),output=map==='color'?await image.jpeg({quality:90,chromaSubsampling:'4:4:4'}).toBuffer():await image.png({compressionLevel:9,adaptiveFiltering:true}).toBuffer();
   const file=id+'-'+map+(map==='color'?'.jpg':'.png');await writeFile('assets/wv/environment-next/'+file,output);
   entries.push({id:id+'-'+map,file,width:size,height:size,bytes:output.length,sha256:sha(output),colorSpace:map==='color'?'srgb':'linear',source:source.id,processing:map==='color'?'sharp 0.35.5 Lanczos3, JPEG quality 90 4:4:4':'sharp 0.35.5 Lanczos3, lossless PNG, no sRGB conversion'});
   if(id==='rock'&&map==='color'){const low=await sharp(acquired).resize(256,256).jpeg({quality:85,chromaSubsampling:'4:4:4'}).toBuffer();await writeFile('assets/wv/environment-next/rock-low.jpg',low);entries.push({id:'rock-low',file:'rock-low.jpg',width:256,height:256,bytes:low.length,sha256:sha(low),colorSpace:'srgb',source:source.id,processing:'sharp 0.35.5 Lanczos3, JPEG quality 85 4:4:4'});}
  }
 }
 const manifest={revision:'wv006-a-2',runtimeReady:false,sources,entries};await writeFile('assets/wv/environment-next/detail-manifest.json',JSON.stringify(manifest,null,2)+'\n');
 console.log('Imported hash-verified CC0 detail textures: '+entries.reduce((n,e)=>n+e.bytes,0)+' encoded bytes.');
}

// Estimates of explicitly supplied owned/loaded objects, not a GPU heap query.
// Pass loader-retained textures too: scene traversal alone misses parsed unused LODs.
export function estimateResources({roots=[],loadedTextures=[],retainedBuffers=[]}={}) {
  const buffers=new Set(retainedBuffers),textures=new Set(loadedTextures),geometries=new Set(),materials=new Set();
  function buffer(attribute) {
    const b=attribute?.array?.buffer??attribute?.data?.array?.buffer;
    if (b) buffers.add(b);
  }
  for (const root of roots) root.traverse?.(node=>{
    const g=node.geometry;
    if (g&&!geometries.has(g)) {
      geometries.add(g);buffer(g.index);
      Object.values(g.attributes||{}).forEach(buffer);
      Object.values(g.morphAttributes||{}).flat().forEach(buffer);
    }
    for (const material of [node.material].flat().filter(Boolean)) {
      materials.add(material);
      for (const v of Object.values(material)) if(v?.isTexture)textures.add(v);
      for (const u of Object.values(material.uniforms||{})) if(u?.value?.isTexture)textures.add(u.value);
    }
  });
  const decodedImages=new Set();
  let textureBytesEstimate=0,decodedImageBytesEstimate=0,unknownTextures=0;
  for (const texture of textures) {
    const image=texture.source?.data??texture.image;
    const images=Array.isArray(image)?image:[image];
    for (const i of images) {
      if (!i?.width||!i?.height) {unknownTextures++;continue;}
      const decoded=i.data?.byteLength??i.width*i.height*4;
      if(!decodedImages.has(i)){decodedImages.add(i);decodedImageBytesEstimate+=decoded;}
      // Explicit compressed mip buffers are countable. Otherwise use an RGBA8/
      // data-byte estimate with a full mip chain when generateMipmaps is enabled.
      const mipmaps=texture.mipmaps;
      textureBytesEstimate+=mipmaps?.length&&mipmaps.every(m=>m.data?.byteLength)?
        mipmaps.reduce((n,m)=>n+m.data.byteLength,0):Math.ceil(decoded*(texture.generateMipmaps?4/3:1));
    }
  }
  return {bufferBytesEstimate:[...buffers].reduce((n,b)=>n+(b.byteLength||0),0),
    textureBytesEstimate:unknownTextures?null:textureBytesEstimate,decodedImageBytesEstimate,
    geometries:geometries.size,materials:materials.size,textures:textures.size,unknownTextures,
    assumptions:'Unique backing ArrayBuffers; supplied loader-retained images/textures plus scene references; RGBA8 for decoded browser images; full mip estimate when generated. Excludes driver copies, render targets, JS objects and other unprovided allocations. Not exact GPU/JS memory.'};
}

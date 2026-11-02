// Exact-coordinate bounded memoization. No quantization, new heights or terrain
// generation. Repeated admission/contacts share values from the borrowed APIs.
export function memoizeSurface(source,limit=32768){
 const caches={sample:new Map(),slope:new Map()};
 const memo=(name)=>(x,y)=>{const key=x+':'+y,cache=caches[name];if(cache.has(key))return cache.get(key);const value=source[name](x,y);if(cache.size>=limit){let count=0;for(const k of cache.keys()){cache.delete(k);if(++count>=limit/4)break;}}cache.set(key,value);return value;};
 return {...source,sample:memo('sample'),...(source.slope?{slope:memo('slope')}:{}),memoStats:()=>({sampleEntries:caches.sample.size,slopeEntries:caches.slope.size,limit})};
}

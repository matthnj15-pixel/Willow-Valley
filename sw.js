/* Willow Valley offline shell.
 * Assets are cached at install time; app data stays in local browser storage.
 * Each Pages path has its own service-worker scope and cache namespace.
 */
const VERSION="__BUILD_VERSION__";
const PREFIX="willow-valley:"+new URL(self.registration.scope).pathname+":";
const CACHE=PREFIX+VERSION;
const REQUIRED=["./foundation-system.mjs","./road-surface.mjs","./","./index.html","./styles.css","./app.mjs","./camera-gestures.mjs","./world-route.mjs","./config.mjs","./save-slots.mjs","./organic-world.mjs","./zone-silhouette.mjs","./terrain-contours.mjs","./simulation.mjs","./settlement-play.mjs","./turn-highlights.mjs","./settlement-architecture.mjs","./council-ui.mjs","./ui-components.mjs"];
const OPTIONAL=["./terrain-surface.mjs","./foundation-system.mjs","./world-gen.mjs","./game-3d-mesh.mjs","./ui-kit/world-lab.html","./ui-kit/world-lab.mjs","./ui-kit/render-3d.mjs","./ui-kit/world-lab.css","./world-lab/index.html","./world-lab/world-lab.mjs","./world-lab/render-3d.mjs","./world-lab/world-lab.css","./road-editor.mjs","./road-network.mjs","./road-gesture.mjs","./desire-paths.mjs","./manifest.webmanifest","./icon.svg","./apple-touch-icon.png","./icon-192.png","./icon-512.png","./offline.html","./ui-kit/index.html","./ui-kit/catalog.mjs","./ui-kit/catalog.css","./ui-kit/kenney-models.mjs"];
self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(REQUIRED);
    await Promise.all(OPTIONAL.map(async url=>{
      try{const response=await fetch(new URL(url,self.registration.scope),{cache:"reload"});if(response.ok)await cache.put(new URL(url,self.registration.scope),response);}
      catch(error){/* Older stable builds may not include optional modules. */}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener("fetch",event=>{
 const request=event.request;
 if(request.method!=="GET")return;
 const url=new URL(request.url),scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const canonical=new URL("./ui-kit/world-lab.html",scope);
  // Redirect links created by the original World Builder prototype.
  if(request.mode==="navigate"&&
   (/\/world-lab\/?$/.test(url.pathname)||/\/world-lab\/index\.html$/.test(url.pathname)||
    /\/ui-kit\/world-lab\/?$/.test(url.pathname))){
   return Response.redirect(canonical.href,302);
  }
  if(url.pathname.endsWith("/ui-kit/")||url.pathname.endsWith("/ui-kit")){
   const kit=await cache.match("./ui-kit/index.html");
   if(kit)return kit;
  }
  // Network-first for navigation and the game bootstrap, so Safari does not
  // stay on stale cached routes after a successful GitHub Pages deployment.
  // All executable modules and styles must move together across deployments.
  // Old Safari SWs could serve a new entrypoint with old cached dependencies.
  // Network-first while online and cache fallback when offline keeps versions
  // coherent without sacrificing offline play.
  const shouldRevalidate=request.mode==="navigate"||
   /\.(?:mjs|js|css|html)$/.test(url.pathname);
  if(shouldRevalidate){
   try{
    const response=await fetch(request,{cache:"no-cache"});
    if(response.ok){await cache.put(request,response.clone());return response;}
    // A real 404 is not silently replaced by the game home page.
    if(response.status===404)return response;
   }catch(error){/* Offline: return the previously installed shell below. */}
  }
  const matched=await cache.match(request,{ignoreSearch:true});
  if(matched)return matched;
  try{
   const response=await fetch(request);
   if(response.ok&&url.origin===scope.origin)await cache.put(request,response.clone());
   return response;
  }catch(error){
   if(request.mode==="navigate")return await cache.match("./index.html")||Response.error();
   return Response.error();
  }
 })());
});

// Read-only contact with createWorldMesh's two triangles per cell (b--d diagonal).
// Analytic water/suitability stay authoritative; only displayed height changes.
export function terrainResolution(world,{lite=false,gameplay=false}={}){
 return lite?[48,36]:gameplay?
  ({small:[62,46],medium:[76,56],large:[88,66]}[world.options.size]||[76,56]):
  ({small:[96,72],medium:[112,84],large:[128,96]}[world.options.size]||[112,84]);
}
export function createTerrainSurface(world,nx,nz){
 const sx=world.width/nx,sy=world.depth/nz,cache=new Map();
 const height=(i,j)=>{
  const key=j*(nx+1)+i;
  if(!cache.has(key))cache.set(key,world.sample(i*sx,j*sy).height);
  return cache.get(key);
 };
 function sample(x,y){
  const gx=Math.max(0,Math.min(nx,x/sx)),gy=Math.max(0,Math.min(nz,y/sy));
  const i=Math.min(nx-1,Math.floor(gx)),j=Math.min(nz-1,Math.floor(gy));
  const u=gx-i,v=gy-j,a=height(i,j),b=height(i+1,j),c=height(i+1,j+1),d=height(i,j+1);
  return{...world.sample(x,y),height:u+v<=1?a+(b-a)*u+(d-a)*v:
   c+(d-c)*(1-u)+(b-c)*(1-v)};
 }
 // Include every grid/diagonal crossing: each interval lies on one plane.
 function trace(a,b){
  const times=[0,1];
  for(const [start,end] of [[a.x/sx,b.x/sx],[a.y/sy,b.y/sy],
   [a.x/sx+a.y/sy,b.x/sx+b.y/sy]]){
   if(Math.abs(end-start)<1e-10)continue;
   for(let k=Math.floor(Math.min(start,end))+1;k<Math.max(start,end);k++){
    const t=(k-start)/(end-start);if(t>0&&t<1)times.push(t);
   }
  }
  return [...new Set(times)].sort((a,b)=>a-b).map(t=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}));
 }
 // Clip a convex footprint to the terrain triangles. Merely sampling more
 // vertices still leaves road triangles cutting across terrain creases.
 function drape(polygon){
  const result=[];
  const xs=polygon.map(p=>p.x/sx),ys=polygon.map(p=>p.y/sy);
  const loX=Math.max(0,Math.floor(Math.min(...xs))),hiX=Math.min(nx-1,Math.floor(Math.max(...xs)));
  const loY=Math.max(0,Math.floor(Math.min(...ys))),hiY=Math.min(nz-1,Math.floor(Math.max(...ys)));
  for(let j=loY;j<=hiY;j++)for(let i=loX;i<=hiX;i++){
   for(const planes of [[p=>p.x/sx-i,p=>p.y/sy-j,p=>1-(p.x/sx-i)-(p.y/sy-j)],
    [p=>i+1-p.x/sx,p=>j+1-p.y/sy,p=>(p.x/sx-i)+(p.y/sy-j)-1]]){
    let clipped=polygon;
    for(const distance of planes){
     const next=[];
     for(let k=0;k<clipped.length;k++){
      const a=clipped[k],b=clipped[(k+1)%clipped.length],da=distance(a),db=distance(b);
      if(da>=-1e-9)next.push(a);
      if((da<0&&db>0)||(da>0&&db<0)){
       const t=da/(da-db);next.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
      }
     }
     clipped=next;if(clipped.length<3)break;
    }
    for(let k=1;k+1<clipped.length;k++){
     const tri=[clipped[0],clipped[k],clipped[k+1]];
     const [a,b,c]=tri;
     if(Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))>1e-7)result.push(tri);
    }
   }
  }
  return result;
 }
 return{...world,sample,contactTrace:trace,drapePolygon:drape};
}

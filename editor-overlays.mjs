// Presentation only: hit testing and gesture ownership remain in the editor.
export function projectEditorPoint(world,camera,rect,point){
 const x=point.x-world.width/2-camera.focusX,z=point.y-world.depth/2-camera.focusZ;
 const y=world.sample(point.x,point.y).height+3.2-17;
 const co=Math.cos(camera.yaw),si=Math.sin(camera.yaw);
 const xx=co*x+si*z,zz=-si*x+co*z;
 const yy=Math.cos(camera.pitch)*y-Math.sin(camera.pitch)*zz;
 return{x:rect.width/2+xx*rect.height/(2*camera.zoom),
  y:rect.height/2-yy*rect.height/(2*camera.zoom)};
}
export function createEditorOverlay(canvas){
 const overlay=document.createElement('canvas');
 overlay.setAttribute('aria-hidden','true');overlay.dataset.roadEditorOverlay='';
 overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';
 canvas.parentElement.append(overlay);
 const ctx=overlay.getContext('2d');
 return{
  draw(world,camera,markers){
   const rect=canvas.getBoundingClientRect(),density=Math.min(devicePixelRatio||1,1.75);
   overlay.width=Math.round(rect.width*density);overlay.height=Math.round(rect.height*density);
   ctx.setTransform(density,0,0,density,0,0);ctx.clearRect(0,0,rect.width,rect.height);
   for(const marker of markers){
    const p=projectEditorPoint(world,camera,rect,marker.point);
    if(p.x< -22||p.y< -22||p.x>rect.width+22||p.y>rect.height+22)continue;
    const rgb=marker.color.map(c=>Math.round(c*255)).join(',');
    ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);
    ctx.fillStyle='rgba(255,250,223,.85)';ctx.fill();
    ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);
    ctx.fillStyle=`rgb(${rgb})`;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#33483c';ctx.stroke();
   }
   overlay.dataset.markerCount=String(markers.length);
  },
  dispose(){overlay.remove();}
 };
}

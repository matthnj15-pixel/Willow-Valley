// Read-only reference scenes. These never become saves or simulation inputs.
export function settlementRenderFixture(count=30){
 const large=count===100,width=large?1100:700,depth=large?950:650,cols=large?10:6,rows=count/cols;
 const sample=(x,y)=>({height:x>width*.92?12:10+Math.sin(x/95)*3+Math.cos(y/80)*2+x*.014,water:x>width*.92?18:null});
 const trees=Array.from({length:320},(_,i)=>{const x=18+(i*137)%(width-36),z=18+(i*193)%(depth-36);return{x,z,y:sample(x,z).height,r:5+(i%4)*.5,h:22+(i%7)*2};});
 const world={width,depth,trees,options:{seed:`WV-${count===100?'D01-town100':'C01-hamlet30'}`,size:'small'},sample,slope:()=>.1};
 const houses=Array.from({length:count},(_,i)=>{
  const x=90+(i%cols)*(width-280)/(cols-1)+Math.sin(i*3)*14,y=75+Math.floor(i/cols)*(depth-300)/(rows-1)+Math.cos(i*2)*18;
  return{id:i,x,y,foundedTurn:0,foundedEra:0,entrance:{x:x+Math.sin(i)*7,y:y+25},parcel:{vertices:[{x:x-19,y:y-19},{x:x+19,y:y-19},{x:x+19,y:y+19},{x:x-19,y:y+19}]}};
 });
 const buildings=['farm','lumber','smith','granary','market','plaza','park'].map((type,i)=>({id:1000+i,type,x:70+(width-260)/6*i,y:depth-65}));
 const state={turn:2,houses,buildings,roads:[[{x:35,y:depth-125},{x:width*.88,y:depth-125}]],localLanes:Array.from({length:rows},(_,row)=>({points:houses.slice(row*cols,row*cols+cols).map(h=>h.entrance)})),zones:[{type:'farmland',radius:80,points:[{x:70,y:depth-25}]}],desirePaths:[]};
 return {world,state,seed:world.options.seed};
}

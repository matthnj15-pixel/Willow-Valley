// Repeat periods are authored visual scale, not measured photogrammetry dimensions.
export const SURFACE_DETAIL=Object.freeze({revision:'wv006-a-2',grassPeriod:8.4,soilPeriod:7,rockPeriod:5.6,normalStrength:.65,normalAnisotropy:8,lowAnisotropy:4});
export const DETAIL_TEXTURES=Object.freeze([
 {name:'grass',file:'grass-color.jpg',width:1024,height:1024,color:true},
 {name:'soil',file:'soil-color.jpg',width:1024,height:1024,color:true},
 {name:'rock',file:'rock-color.jpg',width:512,height:512,color:true},
 {name:'grassNormal',file:'grass-normal.png',width:512,height:512,color:false},
 {name:'soilNormal',file:'soil-normal.png',width:512,height:512,color:false},
 {name:'rockNormal',file:'rock-normal.png',width:256,height:256,color:false}
]);
export const LOW_TEXTURES=Object.freeze([
 {name:'grass',file:'../environment-v1/grass.jpg',width:512,height:512,color:true},
 {name:'soil',file:'../environment-v1/soil.jpg',width:512,height:512,color:true},
 {name:'rock',file:'rock-low.jpg',width:256,height:256,color:true}
]);
export function mipBytes({width,height}){let bytes=0;for(;;){bytes+=width*height*4;if(width===1&&height===1)return bytes;width=Math.max(1,width>>1);height=Math.max(1,height>>1);}}

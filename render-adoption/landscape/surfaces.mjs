import * as T from '../../assets/vendor/three.module.mjs';
import {UNITS,metresToSaved,savedToMetres} from './bridge.mjs';
// Triangulate the actual field/beds including holes, then split every triangle on
// displayed terrain planes. One merged opaque draw, no generic enclosing slab.
export function createLandscapeSurfaces(plan,{terrainSurface,world}) {
  const positions=[],colors=[],soil=new T.Color('#8b795b'),field=new T.Color('#a39e66');
  for(const shape of [...plan.fields,...plan.beds]) {
    const rings=[shape.polygon,...(shape.holes??[])],color=shape.kind==='field'?field:soil;
    const vectors=rings.map(r=>r.map(p=>new T.Vector2(p.x,p.z))),vertices=rings.flat();
    const triangles=T.ShapeUtils.triangulateShape(vectors[0],vectors.slice(1));
    for(const ids of triangles){
      const tri=ids.map(i=>metresToSaved(vertices[i],world));
      // Host supplies the same displayed triangle draper as terrain rendering.
      for(const piece of terrainSurface.drapePolygon(tri))for(const p of piece){
        const m=savedToMetres(p,world),height=terrainSurface.sample(p.x,p.y).height+.018;
        positions.push(m.x*UNITS,height,m.z*UNITS);colors.push(...color.toArray());
      }
    }
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const material=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide}),group=new T.Group();
  if(positions.length)group.add(new T.Mesh(geometry,material));
  let disposed=false;return {group,triangles:positions.length/9,dispose(){if(disposed)return;disposed=true;group.removeFromParent();group.clear();geometry.dispose();material.dispose();}};
}

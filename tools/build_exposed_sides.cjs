// Extract only generated material. Original fronts and background are never replaced.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'review-assets/exposed-sides-v1');
const config=JSON.parse(fs.readFileSync(path.join(dir,'config.json'),'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
(async()=>{
  await sharp(path.join(root,'app/assets/kitchen/overlays/tempered-glass.svg')).png().toFile(path.join(root,'app/assets/kitchen/overlays/tempered-glass.png'));
  const records=[];
  for(const face of config.faces){
    const xs=face.quad.map(p=>p[0]),ys=face.quad.map(p=>p[1]);
    const x=Math.min(...xs),y=Math.min(...ys),width=Math.max(...xs)-x,height=Math.max(...ys)-y;
    const [left,top,cw,ch]=face.crop;
    const donor=path.join(dir,face.donor);
    const texture=await sharp(donor).extract({left,top,width:cw,height:ch}).png().toBuffer();
    const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024"><defs><clipPath id="side"><polygon points="${face.quad.map(p=>p.join(',')).join(' ')}"/></clipPath></defs><image x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="none" href="data:image/png;base64,${texture.toString('base64')}" clip-path="url(#side)"/></svg>`);
    const asset=`assets/kitchen/overlays/${face.id}.png`;
    const output=path.join(root,'app',asset);
    await sharp(svg).png().toFile(output);
    const {data,info}=await sharp(output).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let changed=0,outside=0,minX=1536,minY=1024,maxX=0,maxY=0;
    for(let py=0;py<info.height;py++)for(let px=0;px<info.width;px++)if(data[(py*info.width+px)*4+3]){
      changed++;if(px<x||px>=x+width||py<y||py>=y+height)outside++;
      minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px+1);maxY=Math.max(maxY,py+1);
    }
    if(outside)throw new Error(`${face.id}: pixels outside ROI`);
    records.push({id:face.id,asset,sha256:hash(output),donorSha256:hash(donor),alphaBounds:[minX,minY,maxX,maxY],changedPixels:changed,outsideRoiPixels:outside});
  }
  fs.writeFileSync(path.join(dir,'gate.json'),JSON.stringify({status:'PASS',visualApproval:'PENDING',records},null,2)+'\n');
  console.log(JSON.stringify({passed:true,faces:records.length,outsideRoiPixels:0}));
})();

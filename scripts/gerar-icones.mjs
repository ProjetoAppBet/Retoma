import zlib from 'node:zlib';
import fs from 'node:fs';

// Polilinha oficial do simbolo. NAO alterar.
const PTS=[[19,62],[43,62],[43,34],[77,34]];

// distancia de um ponto ao segmento (capsula) -> cap/join redondos exatos
function distSeg(px,py,[ax,ay],[bx,by]){
  const dx=bx-ax, dy=by-ay, l2=dx*dx+dy*dy;
  let t = l2===0 ? 0 : ((px-ax)*dx+(py-ay)*dy)/l2;
  t=Math.max(0,Math.min(1,t));
  const cx=ax+t*dx, cy=ay+t*dy;
  return Math.hypot(px-cx,py-cy);
}
function distPolyline(px,py){
  let m=Infinity;
  for(let i=0;i<PTS.length-1;i++) m=Math.min(m,distSeg(px,py,PTS[i],PTS[i+1]));
  return m;
}
function hex2rgb(h){return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}

function render({size, vbMin, vbSize, stroke, bg, fg, ss=4}){
  const R=stroke/2, BG=hex2rgb(bg), FG=hex2rgb(fg);
  const stride=size*3, raw=Buffer.alloc(size*(stride+1));
  for(let y=0;y<size;y++){
    raw[y*(stride+1)]=0; // filter none
    for(let x=0;x<size;x++){
      let hits=0;
      for(let sy=0;sy<ss;sy++)for(let sx=0;sx<ss;sx++){
        const ux=vbMin[0]+((x+(sx+0.5)/ss)/size)*vbSize;
        const uy=vbMin[1]+((y+(sy+0.5)/ss)/size)*vbSize;
        if(distPolyline(ux,uy)<=R) hits++;
      }
      const a=hits/(ss*ss), o=y*(stride+1)+1+x*3;
      for(let c=0;c<3;c++) raw[o+c]=Math.round(BG[c]*(1-a)+FG[c]*a);
    }
  }
  const crcT=[...Array(256)].map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0;});
  const crc=b=>{let c=0xFFFFFFFF;for(const v of b)c=crcT[(c^v)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
  const chunk=(t,d)=>{const len=Buffer.alloc(4);len.writeUInt32BE(d.length);
    const td=Buffer.concat([Buffer.from(t,'ascii'),d]);
    const cr=Buffer.alloc(4);cr.writeUInt32BE(crc(td));return Buffer.concat([len,td,cr]);};
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);
  ihdr[8]=8;ihdr[9]=2;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr), chunk('IDAT',zlib.deflateSync(raw,{level:9})), chunk('IEND',Buffer.alloc(0))]);
}

const ARDOSIA='#0F1719', CAL='#E9E7E2';
// Favicon: traco 15 (abaixo de 24px), respiro 22,5 = 1,5 x 15
const FAV={vbMin:[-11,-11], vbSize:118, stroke:15, bg:ARDOSIA, fg:CAL};
// App icon: traco 12, respiro 18 = 1,5 x 12
const APP={vbMin:[-5,-5], vbSize:106, stroke:12, bg:ARDOSIA, fg:CAL};

const out=process.argv[2];
for(const s of [16,32,48]) fs.writeFileSync(`${out}/favicon-${s}.png`, render({size:s,...FAV}));
fs.writeFileSync(`${out}/apple-icon.png`, render({size:180,...APP}));
fs.writeFileSync(`${out}/app-icon-512.png`, render({size:512,...APP}));
console.log('gerados');

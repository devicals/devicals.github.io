const graphState={nodes:[],edges:[],dragging:null,moved:false,canvas:null,ctx:null};

function graphAdminVisible(){
  return window.isAdmin&&window.showHiddenPages!==false;
}

function buildGraphNodes(nodes,base,admin,parentId,out){
  nodes.forEach(node=>{
    if(node.admin&&!admin)return;
    const path=base+'/'+slug(node.n);
    out.nodes.push({id:path,label:node.n,type:node.t,path,x:Math.random()*400+50,y:Math.random()*300+50,vx:0,vy:0});
    if(parentId)out.edges.push({a:parentId,b:path});
    if(node.c)buildGraphNodes(node.c,path,admin,path,out);
  });
}

function buildGraphData(){
  const admin=graphAdminVisible();
  const out={nodes:[],edges:[]};
  buildGraphNodes(NAV,'',admin,null,out);
  const prev=graphState.nodes;
  out.nodes.forEach(n=>{
    const old=prev.find(p=>p.id===n.id);
    if(old){n.x=old.x;n.y=old.y;n.vx=old.vx;n.vy=old.vy;}
  });
  graphState.nodes=out.nodes;
  graphState.edges=out.edges;
}
window.rebuildGraph=buildGraphData;

function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function stepPhysics(w,h){
  const nodes=graphState.nodes;
  const cx=w/2,cy=h/2;
  for(let i=0;i<nodes.length;i++){
    const n=nodes[i];
    if(n===graphState.dragging)continue;
    let fx=(cx-n.x)*0.002;
    let fy=(cy-n.y)*0.002;
    for(let j=0;j<nodes.length;j++){
      if(i===j)continue;
      const o=nodes[j];
      let dx=n.x-o.x,dy=n.y-o.y;
      let distSq=dx*dx+dy*dy;
      if(distSq<1)distSq=1;
      const dist=Math.sqrt(distSq);
      const force=600/distSq;
      fx+=dx/dist*force;
      fy+=dy/dist*force;
    }
    n.vx=(n.vx+fx)*0.85;
    n.vy=(n.vy+fy)*0.85;
  }
  graphState.edges.forEach(e=>{
    const a=nodes.find(n=>n.id===e.a);
    const b=nodes.find(n=>n.id===e.b);
    if(!a||!b)return;
    const dx=b.x-a.x,dy=b.y-a.y;
    const dist=Math.sqrt(dx*dx+dy*dy)||1;
    const rest=70;
    const force=(dist-rest)*0.02;
    const fx=dx/dist*force,fy=dy/dist*force;
    if(a!==graphState.dragging){a.vx+=fx;a.vy+=fy;}
    if(b!==graphState.dragging){b.vx-=fx;b.vy-=fy;}
  });
  nodes.forEach(n=>{
    if(n===graphState.dragging)return;
    n.x+=n.vx;
    n.y+=n.vy;
    n.x=Math.max(10,Math.min(w-10,n.x));
    n.y=Math.max(10,Math.min(h-10,n.y));
  });
}

function drawGraph(){
  const{canvas,ctx}=graphState;
  if(!canvas)return;
  const w=canvas.clientWidth,h=canvas.clientHeight;
  ctx.clearRect(0,0,w,h);
  const edgeColor=cssVar('--bg-hover');
  const folderColor=cssVar('--graph-folder');
  const pageColor=cssVar('--graph-page');
  const activeColor=cssVar('--graph-active');
  const textColor=cssVar('--text-faint');
  const interfaceFont=cssVar('--font-interface');
  const activePath=decodeURIComponent(location.hash.slice(1));
  ctx.strokeStyle=edgeColor;
  ctx.lineWidth=1;
  graphState.edges.forEach(e=>{
    const a=graphState.nodes.find(n=>n.id===e.a);
    const b=graphState.nodes.find(n=>n.id===e.b);
    if(!a||!b)return;
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.lineTo(b.x,b.y);
    ctx.stroke();
  });
  graphState.nodes.forEach(n=>{
    const isActive=n.type==='p'&&n.path===activePath;
    const color=isActive?activeColor:(n.type==='f'?folderColor:pageColor);
    const r=isActive?7:(n.type==='f'?6:4);
    ctx.beginPath();
    ctx.arc(n.x,n.y,r,0,Math.PI*2);
    ctx.fillStyle=color;
    ctx.fill();
    ctx.font='9px '+interfaceFont;
    ctx.fillStyle=textColor;
    ctx.fillText(n.label,n.x+r+3,n.y+3);
  });
}

function loop(){
  const{canvas}=graphState;
  if(canvas){
    stepPhysics(canvas.clientWidth,canvas.clientHeight);
    drawGraph();
  }
  requestAnimationFrame(loop);
}

function hitTest(x,y){
  return graphState.nodes.find(n=>{
    const dx=n.x-x,dy=n.y-y;
    return dx*dx+dy*dy<100;
  });
}

function resizeGraphCanvas(){
  const{canvas,ctx}=graphState;
  const dpr=window.devicePixelRatio||1;
  canvas.width=canvas.clientWidth*dpr;
  canvas.height=canvas.clientHeight*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

function initGraph(){
  const canvas=document.getElementById('graph-canvas');
  if(!canvas)return;
  graphState.canvas=canvas;
  graphState.ctx=canvas.getContext('2d');
  resizeGraphCanvas();
  buildGraphData();
  window.addEventListener('resize',resizeGraphCanvas);
  window.addEventListener('hashchange',buildGraphData);
  canvas.addEventListener('mousedown',e=>{
    const rect=canvas.getBoundingClientRect();
    const x=e.clientX-rect.left,y=e.clientY-rect.top;
    const hit=hitTest(x,y);
    graphState.moved=false;
    if(hit){
      graphState.dragging=hit;
      canvas.style.cursor='grabbing';
    }
  });
  window.addEventListener('mousemove',e=>{
    if(!graphState.dragging)return;
    graphState.moved=true;
    const rect=canvas.getBoundingClientRect();
    graphState.dragging.x=e.clientX-rect.left;
    graphState.dragging.y=e.clientY-rect.top;
    graphState.dragging.vx=0;
    graphState.dragging.vy=0;
  });
  window.addEventListener('mouseup',()=>{
    if(graphState.dragging){
      graphState.dragging=null;
      canvas.style.cursor='grab';
    }
  });
  canvas.addEventListener('click',e=>{
    if(graphState.moved)return;
    const rect=canvas.getBoundingClientRect();
    const x=e.clientX-rect.left,y=e.clientY-rect.top;
    const hit=hitTest(x,y);
    if(hit&&hit.type==='p')location.hash='#'+hit.path;
  });
  loop();
}

document.addEventListener('DOMContentLoaded',initGraph);
document.addEventListener('authchange',buildGraphData);
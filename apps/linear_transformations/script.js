// ── Math ──────────────────────────────────────────────────────────────────────
function mat2(a,b,c,d){return{a,b,c,d}}
function eye(){return mat2(1,0,0,1)}
function mulM(A,B){return mat2(A.a*B.a+A.b*B.c,A.a*B.b+A.b*B.d,A.c*B.a+A.d*B.c,A.c*B.b+A.d*B.d)}
function invM(M){const d=M.a*M.d-M.b*M.c;if(Math.abs(d)<1e-10)return null;return mat2(M.d/d,-M.b/d,-M.c/d,M.a/d)}
function applyM(M,x,y){return{x:M.a*x+M.b*y,y:M.c*x+M.d*y}}
function subM(A,B){return mat2(A.a-B.a,A.b-B.b,A.c-B.c,A.d-B.d)}
function normM(M){return Math.max(Math.abs(M.a),Math.abs(M.b),Math.abs(M.c),Math.abs(M.d))}
function fmt(v){return parseFloat(v.toFixed(3))}
function f2(v){return v.toFixed(2)}

// ── State ─────────────────────────────────────────────────────────────────────
let nodeSeq=0,connSeq=0;
const nodes=[]; // {id, v1:[x,y], v2:[x,y]}
const conns=[]; // {id, type, T:mat2, exprs:{t11,t12,t21,t22}}

// ── Basis / transport ─────────────────────────────────────────────────────────
function basisMat(node){return mat2(node.v1[0],node.v2[0],node.v1[1],node.v2[1])}

// Effective standard-coord matrix for connection i (linear only)
function connMatrix(i){
  const conn=conns[i];
  if(conn.type==='nonlinear')return null;
  const Bf=basisMat(nodes[i]),Bt=basisMat(nodes[i+1]);
  const invBf=invM(Bf);
  if(!invBf)return conn.T;
  return mulM(Bt,mulM(conn.T,invBf));
}

// Raw T matrix without basis change (for "T only" curvature)
function rawT(i){return conns[i].type==='linear'?conns[i].T:null}

// Transport (x,y) through connections 0..(toNode-1) in forward order
function transportPt(x,y,toNode){
  let p={x,y};
  for(let i=0;i<toNode;i++){
    const conn=conns[i];
    const Bf=basisMat(nodes[i]),Bt=basisMat(nodes[i+1]);
    const invBf=invM(Bf);if(!invBf)continue;
    const loc=applyM(invBf,p.x,p.y);
    const tr=conn.type==='linear'?applyM(conn.T,loc.x,loc.y):applyNL(conn,loc.x,loc.y);
    p=applyM(Bt,tr.x,tr.y);
  }
  return p;
}

// Transport in reverse connection order (for holonomy: apply Tn, Tn-1, ..., T1)
function transportPtRev(x,y,numConns){
  let p={x,y};
  for(let i=numConns-1;i>=0;i--){
    const conn=conns[i];
    const Bf=basisMat(nodes[i]),Bt=basisMat(nodes[i+1]);
    const invBf=invM(Bf);if(!invBf)continue;
    const loc=applyM(invBf,p.x,p.y);
    const tr=conn.type==='linear'?applyM(conn.T,loc.x,loc.y):applyNL(conn,loc.x,loc.y);
    p=applyM(Bt,tr.x,tr.y);
  }
  return p;
}

function applyNL(conn,x,y){
  return{x:evalExpr(conn.exprs.t11,x,y)*x+evalExpr(conn.exprs.t12,x,y)*y,
         y:evalExpr(conn.exprs.t21,x,y)*x+evalExpr(conn.exprs.t22,x,y)*y};
}

const _fnCache=new Map();
function evalExpr(expr,x,y){
  if(!_fnCache.has(expr)){
    try{_fnCache.set(expr,new Function('x','y',`'use strict';try{return+(${expr})}catch(e){return 0}`));}
    catch(e){_fnCache.set(expr,()=>0);}
  }
  try{return _fnCache.get(expr)(x,y);}catch(e){return 0;}
}
function clearExprCache(expr){_fnCache.delete(expr);}

// ── Per-canvas zoom/pan state ─────────────────────────────────────────────────
// Keyed by node id → {zoom, panX, panY}
const cvState=new Map();
function getCvState(nodeId){
  if(!cvState.has(nodeId))cvState.set(nodeId,{zoom:1,panX:0,panY:0});
  return cvState.get(nodeId);
}

function attachCanvasInteraction(cv,nodeId){
  let dragging=false,lastX=0,lastY=0;

  cv.addEventListener('wheel',e=>{
    e.preventDefault();
    const s=getCvState(nodeId);
    const rect=cv.getBoundingClientRect();
    const dpr=window.devicePixelRatio||1;
    // Mouse position in canvas pixels
    const mx=(e.clientX-rect.left)*dpr;
    const my=(e.clientY-rect.top)*dpr;
    const factor=e.deltaY<0?1.12:1/1.12;
    // Zoom toward mouse: adjust pan so mouse point stays fixed
    s.panX=(s.panX-mx)*factor+mx;
    s.panY=(s.panY-my)*factor+my;
    s.zoom*=factor;
    s.zoom=Math.max(0.1,Math.min(50,s.zoom));
    renderCanvas(cv,parseInt(cv.dataset.nodeIdx));
  },{passive:false});

  cv.addEventListener('mousedown',e=>{
    dragging=true;lastX=e.clientX;lastY=e.clientY;
    cv.style.cursor='grabbing';
  });
  window.addEventListener('mousemove',e=>{
    if(!dragging)return;
    const s=getCvState(nodeId);
    const dpr=window.devicePixelRatio||1;
    s.panX+=(e.clientX-lastX)*dpr;
    s.panY+=(e.clientY-lastY)*dpr;
    lastX=e.clientX;lastY=e.clientY;
    renderCanvas(cv,parseInt(cv.dataset.nodeIdx));
  });
  window.addEventListener('mouseup',()=>{
    if(dragging){dragging=false;cv.style.cursor='grab';}
  });
  cv.style.cursor='grab';

  // Double-click resets zoom/pan
  cv.addEventListener('dblclick',()=>{
    const s=getCvState(nodeId);
    s.zoom=1;s.panX=0;s.panY=0;
    renderCanvas(cv,parseInt(cv.dataset.nodeIdx));
  });
}

// ── Canvas drawing ────────────────────────────────────────────────────────────
const SAMPLES=28;

// Resize observer for HD canvas — each canvas observes itself
const canvasRO=new ResizeObserver(entries=>{
  for(const e of entries){
    const cv=e.target;
    const idx=parseInt(cv.dataset.nodeIdx);
    if(!isNaN(idx)) renderCanvas(cv,idx);
  }
});

function renderCanvas(cv,nodeIdx){
  const dpr=window.devicePixelRatio||1;
  const rect=cv.getBoundingClientRect();
  const cssW=rect.width>0?rect.width:180;
  const cssH=rect.height>0?rect.height:cssW;
  const pw=Math.round(cssW*dpr),ph=Math.round(cssH*dpr);
  if(cv.width!==pw||cv.height!==ph){cv.width=pw;cv.height=ph;}
  drawNodeCanvas(cv,nodeIdx);
}

function drawNodeCanvas(cv,nodeIdx){
  const W=cv.width,H=cv.height;
  const nodeId=nodes[nodeIdx]?.id;
  const st=nodeId!=null?getCvState(nodeId):{zoom:1,panX:0,panY:0};
  const range=getRange();
  const baseScale=Math.min(W,H)*0.44/range;
  const scale=baseScale*st.zoom;
  const cx=W/2+st.panX,cy=H/2+st.panY;
  const ctx=cv.getContext('2d');
  ctx.clearRect(0,0,W,H);

  const toSc=(x,y)=>({sx:cx+x*scale,sy:cy-y*scale});
  // Transport a point from V1 frame through all connections to nodeIdx
  const tp=(x,y)=>{const p=transportPt(x,y,nodeIdx);return toSc(p.x,p.y);};

  const dpr=window.devicePixelRatio||1;

  // ── 1. Reference grid: standard flat grid (dashed, very faint) ──────────
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,0.06)';
  ctx.lineWidth=dpr;
  ctx.setLineDash([3*dpr,5*dpr]);
  for(let k=-range;k<=range;k++){
    ctx.beginPath();
    const a=toSc(-range,k),b=toSc(range,k);
    ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke();
    ctx.beginPath();
    const c=toSc(k,-range),d=toSc(k,range);
    ctx.moveTo(c.sx,c.sy);ctx.lineTo(d.sx,d.sy);ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();

  const showGrid=document.getElementById('opt-grid').checked;
  const showBasis=document.getElementById('opt-basis').checked;

  // ── 2. Transported grid (solid, indigo tint) ─────────────────────────────
  if(showGrid){
    ctx.strokeStyle='rgba(120,120,255,0.18)';
    ctx.lineWidth=dpr;
    for(let k=-range;k<=range;k++){
      ctx.beginPath();
      for(let s=0;s<=SAMPLES;s++){
        const x=-range+s*2*range/SAMPLES,p=tp(x,k);
        s===0?ctx.moveTo(p.sx,p.sy):ctx.lineTo(p.sx,p.sy);
      }
      ctx.stroke();
      ctx.beginPath();
      for(let s=0;s<=SAMPLES;s++){
        const y=-range+s*2*range/SAMPLES,p=tp(k,y);
        s===0?ctx.moveTo(p.sx,p.sy):ctx.lineTo(p.sx,p.sy);
      }
      ctx.stroke();
    }
  }

  // ── 3. Screen axes ────────────────────────────────────────────────────────
  ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=dpr;
  const al=toSc(-range,0),ar=toSc(range,0);
  ctx.beginPath();ctx.moveTo(al.sx,al.sy);ctx.lineTo(ar.sx,ar.sy);ctx.stroke();
  const ab=toSc(0,-range),at_=toSc(0,range);
  ctx.beginPath();ctx.moveTo(ab.sx,ab.sy);ctx.lineTo(at_.sx,at_.sy);ctx.stroke();

  // ── 5. Basis vectors of this node (local frame, drawn in standard coords) ─
  if(showBasis){
    const n=nodes[nodeIdx];
    const o=toSc(0,0);
    const tip1=toSc(n.v1[0],n.v1[1]),tip2=toSc(n.v2[0],n.v2[1]);
    drawArrow(ctx,o,tip1,'#ff4d4d',dpr);   // v1 red
    drawArrow(ctx,o,tip2,'#00e5a0',dpr);   // v2 teal
  }

  // ── 6. Origin dot ─────────────────────────────────────────────────────────
  const o=toSc(0,0);
  ctx.fillStyle='rgba(255,255,255,0.6)';
  ctx.beginPath();ctx.arc(o.sx,o.sy,2.5*dpr,0,Math.PI*2);ctx.fill();

  // ── 7. Corner label: identity check ──────────────────────────────────────
  const isV1=(nodeIdx===0);
  const M=linearAccum(nodeIdx);
  const isId=M&&normM(subM(M,eye()))<1e-6;
  ctx.font=`${10*dpr}px monospace`;
  ctx.fillStyle=isV1?'rgba(100,100,180,0.7)':(isId?'rgba(16,185,129,0.7)':'rgba(99,102,241,0.7)');
  ctx.fillText(isV1?'source':(isId?'T=I':'transported'),5*dpr,14*dpr);
}

// Accumulated linear matrix from V1 to node k (null if any nonlinear connection)
function linearAccum(k){
  let M=eye();
  for(let i=0;i<k;i++){
    const C=connMatrix(i);if(!C)return null;
    M=mulM(C,M);
  }
  return M;
}

function drawArrow(ctx,from,to,color,dpr=1){
  const dx=to.sx-from.sx,dy=to.sy-from.sy;
  const len=Math.sqrt(dx*dx+dy*dy);
  if(len<2)return;
  const ux=dx/len,uy=dy/len;
  const hs=Math.min(12*dpr,len*0.4);
  ctx.save();
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2.5*dpr;
  ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(from.sx,from.sy);
  ctx.lineTo(to.sx-ux*hs*0.6,to.sy-uy*hs*0.6);ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.sx,to.sy);
  ctx.lineTo(to.sx-ux*hs-uy*hs*0.45,to.sy-uy*hs+ux*hs*0.45);
  ctx.lineTo(to.sx-ux*hs+uy*hs*0.45,to.sy-uy*hs-ux*hs*0.45);
  ctx.closePath();ctx.fill();
  ctx.restore();
}

// Draw a fixed-matrix transformed grid (for curvature canvases)
function drawMatGrid(ctx,M,range,transformed){
  const W=ctx.canvas.width,H=ctx.canvas.height;
  const cx=W/2,cy=H/2;
  const dpr=window.devicePixelRatio||1;
  const scale=Math.min(W,H)*0.44/range;
  const ts=(x,y)=>{
    if(!transformed)return{sx:cx+x*scale,sy:cy-y*scale};
    const p=applyM(M,x,y);return{sx:cx+p.x*scale,sy:cy-p.y*scale};
  };
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle='rgba(120,120,255,0.18)';ctx.lineWidth=dpr;
  for(let k=-range;k<=range;k++){
    ctx.beginPath();const a=ts(-range,k),b=ts(range,k);ctx.moveTo(a.sx,a.sy);ctx.lineTo(b.sx,b.sy);ctx.stroke();
    ctx.beginPath();const c=ts(k,-range),d=ts(k,range);ctx.moveTo(c.sx,c.sy);ctx.lineTo(d.sx,d.sy);ctx.stroke();
  }
  // Axes
  ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=dpr;
  const al=ts(-range,0),ar=ts(range,0);ctx.beginPath();ctx.moveTo(al.sx,al.sy);ctx.lineTo(ar.sx,ar.sy);ctx.stroke();
  const ab=ts(0,-range),at_=ts(0,range);ctx.beginPath();ctx.moveTo(ab.sx,ab.sy);ctx.lineTo(at_.sx,at_.sy);ctx.stroke();
}

// ── DOM building ──────────────────────────────────────────────────────────────
function buildAll(){
  buildSidebar();
  buildChain();
  updateCurvature();
  // setTimeout(0) fires after layout is complete, even in background tabs
  // (requestAnimationFrame is throttled when page is not visible)
  setTimeout(sizeAllCanvases, 0);
}

function buildSidebar(){
  const sc=document.getElementById('sidebar-content');sc.innerHTML='';
  nodes.forEach((node,i)=>{
    sc.appendChild(makeNodeSection(node,i));
    if(i<conns.length)sc.appendChild(makeConnSection(conns[i],i));
  });
}

function makeNodeSection(node,idx){
  const d=document.createElement('div');
  d.className='sb-section sb-node';d.id=`sb-node-${node.id}`;
  d.innerHTML=`
    <div class="sb-head">
      <span class="sb-label node-label">V${idx+1}</span>
      <span class="sb-sublabel">Local frame ${idx+1}</span>
      ${nodes.length>2?`<button class="sb-close" title="Remove">✕</button>`:''}
    </div>
    <div class="vec-grid">
      <span class="vec-name">v₁</span>
      <input type="number" data-f="v1x" value="${node.v1[0]}" step="0.25">
      <input type="number" data-f="v1y" value="${node.v1[1]}" step="0.25">
      <span class="vec-name">v₂</span>
      <input type="number" data-f="v2x" value="${node.v2[0]}" step="0.25">
      <input type="number" data-f="v2y" value="${node.v2[1]}" step="0.25">
    </div>`;
  d.querySelectorAll('input').forEach(inp=>inp.addEventListener('input',()=>{
    const v=parseFloat(inp.value)||0;
    const f=inp.dataset.f;
    if(f==='v1x')node.v1[0]=v; else if(f==='v1y')node.v1[1]=v;
    else if(f==='v2x')node.v2[0]=v; else node.v2[1]=v;
    rerenderAll();
  }));
  const cb=d.querySelector('.sb-close');if(cb)cb.addEventListener('click',()=>removeNode(node.id));
  return d;
}

function makeConnSection(conn,idx){
  const isNL=conn.type==='nonlinear';
  const d=document.createElement('div');
  d.className='sb-section sb-conn';d.id=`sb-conn-${conn.id}`;
  d.innerHTML=`
    <div class="sb-head">
      <span class="sb-label conn-label">T${idx+1}</span>
      <span class="sb-sublabel">Connection ${idx+1}→${idx+2}</span>
    </div>
    <div class="type-row">
      <button class="type-btn${!isNL?' active':''}" data-t="linear">Linear</button>
      <button class="type-btn${isNL?' active':''}" data-t="nonlinear">Nonlinear</button>
    </div>
    <div class="linear-inputs"${isNL?' style="display:none"':''}>
      <div class="mat-grid">
        <input type="number" data-e="a" value="${conn.T.a}" step="0.25">
        <input type="number" data-e="b" value="${conn.T.b}" step="0.25">
        <input type="number" data-e="c" value="${conn.T.c}" step="0.25">
        <input type="number" data-e="d" value="${conn.T.d}" step="0.25">
      </div>
    </div>
    <div class="nl-inputs"${!isNL?' style="display:none"':''}>
      <p class="fn-hint">f(x,y) e.g. <code>1-0.2*y</code></p>
      <div class="fn-grid">
        <span>t₁₁</span><input type="text" data-e="t11" value="${conn.exprs.t11}">
        <span>t₁₂</span><input type="text" data-e="t12" value="${conn.exprs.t12}">
        <span>t₂₁</span><input type="text" data-e="t21" value="${conn.exprs.t21}">
        <span>t₂₂</span><input type="text" data-e="t22" value="${conn.exprs.t22}">
      </div>
    </div>`;
  d.querySelectorAll('.type-btn').forEach(btn=>btn.addEventListener('click',()=>{
    conn.type=btn.dataset.t;
    document.getElementById(`sb-conn-${conn.id}`)?.replaceWith(makeConnSection(conn,conns.indexOf(conn)));
    rerenderAll();
  }));
  d.querySelectorAll('.linear-inputs input').forEach(inp=>inp.addEventListener('input',()=>{
    conn.T[inp.dataset.e]=parseFloat(inp.value)||0;rerenderAll();
  }));
  d.querySelectorAll('.nl-inputs input').forEach(inp=>inp.addEventListener('input',()=>{
    clearExprCache(conn.exprs[inp.dataset.e]);conn.exprs[inp.dataset.e]=inp.value;rerenderAll();
  }));
  return d;
}

function matStr(T){
  return`[${f2(T.a)} ${f2(T.b)}]\n[${f2(T.c)} ${f2(T.d)}]`;
}

function buildChain(){
  const row=document.getElementById('chain-row');
  row.innerHTML='';
  canvasRO.disconnect();

  nodes.forEach((node,i)=>{
    const wrap=document.createElement('div');
    wrap.className='chain-node';wrap.id=`cn-${node.id}`;

    const lbl=document.createElement('div');lbl.className='chain-node-label';lbl.textContent=`V${i+1}`;

    const cv=document.createElement('canvas');
    cv.className='node-cv';cv.id=`cv-${node.id}`;
    cv.dataset.nodeIdx=String(i);

    wrap.appendChild(lbl);wrap.appendChild(cv);
    row.appendChild(wrap);

    canvasRO.observe(cv);
    attachCanvasInteraction(cv,node.id);

    if(i<conns.length){
      const conn=conns[i];
      const arr=document.createElement('div');arr.className='chain-arrow';arr.id=`ca-${conn.id}`;

      const cl=document.createElement('div');cl.className='chain-conn-label';cl.textContent=`T${i+1}`;
      const ct=document.createElement('div');
      ct.className=`chain-conn-type ${conn.type}`;
      ct.textContent=conn.type==='nonlinear'?'∿':'→';
      const cm=document.createElement('pre');
      cm.className='chain-conn-mat';cm.id=`cmd-${conn.id}`;
      cm.textContent=conn.type==='linear'?matStr(conn.T):'f(x,y)';

      arr.appendChild(cl);arr.appendChild(ct);arr.appendChild(cm);
      row.appendChild(arr);
    }
  });
}

function rerenderAll(){
  nodes.forEach((node,i)=>{
    const cv=document.getElementById(`cv-${node.id}`);
    if(cv){
      cv.dataset.nodeIdx=String(i);
      renderCanvas(cv,i); // renderCanvas handles sizing via getBoundingClientRect
    }
    const cn=document.getElementById(`cn-${node.id}`);
    if(cn)cn.querySelector('.chain-node-label').textContent=`V${i+1}`;
  });
  conns.forEach((conn,i)=>{
    const ca=document.getElementById(`ca-${conn.id}`);
    if(ca){
      ca.querySelector('.chain-conn-label').textContent=`T${i+1}`;
      const ct=ca.querySelector('.chain-conn-type');
      ct.className=`chain-conn-type ${conn.type}`;
      ct.textContent=conn.type==='nonlinear'?'∿':'→';
      const cm=document.getElementById(`cmd-${conn.id}`);
      if(cm)cm.textContent=conn.type==='linear'?matStr(conn.T):'f(x,y)';
    }
  });
  updateCurvature();
}

// ── Add / remove ──────────────────────────────────────────────────────────────
function addNode(){
  nodeSeq++;
  nodes.push({id:nodeSeq,v1:[1,0],v2:[0,1]});
  if(nodes.length>1){
    connSeq++;
    conns.push({id:connSeq,type:'linear',T:eye(),exprs:{t11:'1',t12:'0',t21:'0',t22:'1'}});
  }
}

function removeNode(nid){
  const idx=nodes.findIndex(n=>n.id===nid);
  if(idx<0||nodes.length<=2)return;
  nodes.splice(idx,1);
  const ci=Math.max(0,idx-1);
  if(conns.length>ci)conns.splice(ci,1);
  buildAll();
}

// ── Curvature ─────────────────────────────────────────────────────────────────
function updateCurvature(){
  const body=document.getElementById('curv-body');body.innerHTML='';
  const explainBtn=document.getElementById('explain-btn');

  if(conns.length<2){
    body.innerHTML='<div class="curv-empty">Add at least 3 nodes (2 connections) to detect curvature.</div>';
    explainBtn.style.display='none';
    _modalData=null;
    return;
  }

  const n=conns.length,range=getRange();
  const allLinear=conns.every(c=>c.type==='linear');

  // ── Total holonomy ─────────────────────────────────────────────────────
  const sumBlock=document.createElement('div');sumBlock.className='curv-summary-block';

  if(allLinear){
    let Mfwd=eye(),Mrev=eye(),ok=true;
    for(let i=0;i<n;i++){const M=connMatrix(i);if(!M){ok=false;break;}Mfwd=mulM(M,Mfwd);}
    for(let i=n-1;i>=0;i--){const M=connMatrix(i);if(!M){ok=false;break;}Mrev=mulM(M,Mrev);}

    if(ok){
      const invF=invM(Mfwd);
      const hol=invF?mulM(Mrev,invF):eye();
      const mag=normM(subM(hol,eye()));
      const flat=mag<1e-6;

      const cvF=makeCanvas(100,100),cvR=makeCanvas(100,100);
      drawMatGrid(cvF.getContext('2d'),Mfwd,range,true);
      drawMatGrid(cvR.getContext('2d'),Mrev,range,true);

      sumBlock.innerHTML=`<div class="curv-block-title">Total Holonomy</div>`;
      const row=document.createElement('div');row.className='curv-canvas-row';
      row.appendChild(cvWrap('T₁·…·Tₙ',cvF));
      const vs=document.createElement('span');vs.className='curv-vs';vs.textContent='vs';
      row.appendChild(vs);row.appendChild(cvWrap('Tₙ·…·T₁',cvR));
      sumBlock.appendChild(row);

      const ind=document.createElement('div');
      ind.className=`curv-indicator ${flat?'flat':'curved'}`;
      ind.textContent=flat?'✓ Flat':'⚠ Curved';
      sumBlock.appendChild(ind);

      const dat=document.createElement('div');dat.className='curv-data';
      dat.innerHTML=`‖H−I‖ = ${mag.toFixed(5)}<br>H=[${fmt(hol.a)} ${fmt(hol.b)}; ${fmt(hol.c)} ${fmt(hol.d)}]`;
      sumBlock.appendChild(dat);
    }
  } else {
    const tests=[[1,0],[0,1],[1,1],[-1,1]];
    const maxD=tests.reduce((acc,[x,y])=>{
      const pF=transportPt(x,y,n),pR=transportPtRev(x,y,n);
      return Math.max(acc,Math.hypot(pF.x-pR.x,pF.y-pR.y));
    },0);
    const flat=maxD<1e-6;
    sumBlock.innerHTML=`
      <div class="curv-block-title">Holonomy (sampled)</div>
      <div class="curv-indicator ${flat?'flat':'curved'}">${flat?'✓ Flat':'⚠ Curved'}</div>
      <div class="curv-data">Max deviation: ${maxD.toFixed(5)}</div>`;
  }
  body.appendChild(sumBlock);

  // ── Per-pair commutators ───────────────────────────────────────────────
  // Show TWO rows: effective (basis-dependent) and raw T only (basis-independent)
  for(let i=0;i<n-1;i++){
    const Ma=connMatrix(i),Mb=connMatrix(i+1);
    if(!Ma||!Mb)continue;
    const AB=mulM(Ma,Mb),BA=mulM(Mb,Ma);
    const comm=subM(AB,BA);
    const mag=normM(comm);
    const flat=mag<1e-6;

    // Raw T commutator (removes basis effect)
    const Ta=rawT(i),Tb=rawT(i+1);
    let rawComm=null,rawMag=null,rawFlat=null;
    if(Ta&&Tb){
      rawComm=subM(mulM(Ta,Tb),mulM(Tb,Ta));
      rawMag=normM(rawComm);rawFlat=rawMag<1e-6;
    }

    const block=document.createElement('div');block.className='curv-pair-block';

    const cvAB=makeCanvas(72,72),cvBA=makeCanvas(72,72);
    drawMatGrid(cvAB.getContext('2d'),AB,range,true);
    drawMatGrid(cvBA.getContext('2d'),BA,range,true);

    const prow=document.createElement('div');prow.className='curv-pair-canvases';
    const vs=document.createElement('span');vs.className='curv-vs';vs.textContent='vs';
    prow.appendChild(cvWrap('AB',cvAB));prow.appendChild(vs);prow.appendChild(cvWrap('BA',cvBA));

    const ind=document.createElement('div');
    ind.className=`curv-indicator ${flat?'flat':'curved'}`;
    ind.style.fontSize='10px';
    ind.textContent=flat?'✓ Flat':'⚠ Curved';

    const dat=document.createElement('div');dat.className='curv-data';
    let datHTML=`effective ‖[A,B]‖=${mag.toFixed(4)}`;
    if(rawMag!==null)datHTML+=`<br>raw T only ‖[T,T]‖=${rawMag.toFixed(4)} ${rawFlat?'(flat)':'(curved)'}`;
    dat.innerHTML=datHTML;

    block.innerHTML=`<div class="curv-pair-title">[T${i+1}, T${i+2}]</div>`;
    block.appendChild(prow);block.appendChild(ind);block.appendChild(dat);
    body.appendChild(block);
  }

  // ── Update modal data & explain button ────────────────────────────────
  const pairData=[];
  for(let i=0;i<n-1;i++){
    const Ma=connMatrix(i),Mb=connMatrix(i+1);
    if(!Ma||!Mb)continue;
    const AB=mulM(Ma,Mb),BA=mulM(Mb,Ma);
    const comm=subM(AB,BA);
    const mag=normM(comm);
    pairData.push({i,Ma,Mb,AB,BA,comm,mag,flat:mag<1e-6});
  }

  let totalHolonomy=null,totalMag=0,isCurved=false;
  if(allLinear){
    let Mfwd=eye(),Mrev=eye(),ok=true;
    for(let i=0;i<n;i++){const M=connMatrix(i);if(!M){ok=false;break;}Mfwd=mulM(M,Mfwd);}
    for(let i=n-1;i>=0;i--){const M=connMatrix(i);if(!M){ok=false;break;}Mrev=mulM(M,Mrev);}
    if(ok){
      const invF=invM(Mfwd);
      totalHolonomy=invF?mulM(Mrev,invF):eye();
      totalMag=normM(subM(totalHolonomy,eye()));
      isCurved=totalMag>1e-6;
    }
  } else {
    isCurved=pairData.some(p=>!p.flat);
    totalMag=Math.max(...pairData.map(p=>p.mag),0);
  }

  _modalData={isCurved,totalMag,holonomy:totalHolonomy,pairs:pairData};

  // Update button
  explainBtn.style.display='block';
  explainBtn.className='explain-btn '+(isCurved?'curved':'flat');
  explainBtn.textContent=isCurved?'⚠ Why is this curved?':'✓ Why is this flat?';

  // If modal is open, refresh it live
  if(document.getElementById('modal-backdrop').classList.contains('open')){
    buildModalContent(_modalData);
  }
}

function cvWrap(label,cv){
  const w=document.createElement('div');w.className='curv-cv-wrap';
  const l=document.createElement('div');l.className='curv-cv-label';l.textContent=label;
  w.appendChild(l);w.appendChild(cv);return w;
}
function makeCanvas(w,h){
  const dpr=window.devicePixelRatio||1;
  const cv=document.createElement('canvas');
  cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
  cv.style.width=w+'px';cv.style.height=h+'px';
  return cv;
}

// ── Explanation modal ─────────────────────────────────────────────────────────
let _modalData = null; // updated by updateCurvature

function openModal(){
  if(!_modalData)return;
  buildModalContent(_modalData);
  document.getElementById('modal-backdrop').classList.add('open');
}
function closeModal(){
  document.getElementById('modal-backdrop').classList.remove('open');
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', e=>{
  if(e.target===e.currentTarget) closeModal();
});
document.getElementById('explain-btn').addEventListener('click', openModal);

function buildModalContent(data){
  const { isCurved, totalMag, holonomy, pairs } = data;
  document.getElementById('modal-title').textContent =
    isCurved ? '⚠ Why is this Curved?' : '✓ Why is this Flat?';

  const body = document.getElementById('modal-body');
  body.innerHTML = '';

  // ── 1. The transformations ──────────────────────────────────────────────
  const sec1 = msec('The Connection Matrices');
  const matRow = div('mmat-row');
  conns.forEach((conn, i) => {
    if(conn.type !== 'linear') return;
    const bl = div('mmat-block');
    bl.appendChild(mlabel(`T${i+1}`, 'conn-label'));
    bl.appendChild(mmat(conn.T));
    matRow.appendChild(bl);
  });
  sec1.appendChild(matRow);
  if(conns.some(c=>c.type==='nonlinear')){
    const note = document.createElement('p');
    note.style.cssText='font-size:11px;color:var(--muted);margin-top:4px';
    note.textContent='Nonlinear connections cannot be represented as fixed matrices — their entries vary with position.';
    sec1.appendChild(note);
  }
  body.appendChild(sec1);

  // ── 2. Composition: AB vs BA (first pair) ──────────────────────────────
  if(pairs.length > 0){
    const {i, Ma, Mb, AB, BA, comm, mag, flat} = pairs[0];
    const sec2 = msec(`Composition: T${i+1} and T${i+2}`);

    const compRow = div('comp-row');

    const abBlock = div('mmat-block');
    abBlock.appendChild(mlabel(`T${i+1} · T${i+2} =`, 'muted-label'));
    abBlock.appendChild(mmat(AB, flat?'result-flat':'result-curved'));
    compRow.appendChild(abBlock);

    const sym = document.createElement('span');
    sym.className = flat ? 'comp-eq' : 'comp-neq';
    sym.textContent = flat ? '=' : '≠';
    compRow.appendChild(sym);

    const baBlock = div('mmat-block');
    baBlock.appendChild(mlabel(`T${i+2} · T${i+1} =`, 'muted-label'));
    baBlock.appendChild(mmat(BA, flat?'result-flat':'result-curved'));
    compRow.appendChild(baBlock);

    sec2.appendChild(compRow);

    // Commutator
    const commSec = div('mmat-row');
    commSec.style.marginTop = '10px';
    const commBlock = div('mmat-block');
    commBlock.appendChild(mlabel('[A, B] = AB − BA', 'muted-label'));
    commBlock.appendChild(mmat(comm, flat?'result-flat':'result-curved'));
    const normBlock = div('mmat-block');
    normBlock.style.justifyContent='center';
    const normBadge = document.createElement('div');
    normBadge.style.cssText = `margin-top:20px;padding:6px 12px;border-radius:8px;font-size:13px;font-weight:700;
      background:${flat?'rgba(16,185,129,.12)':'rgba(239,68,68,.12)'};
      color:${flat?'var(--green)':'var(--red)'};border:1px solid ${flat?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)'}`;
    normBadge.textContent = `‖[A,B]‖ = ${mag.toFixed(5)}`;
    normBlock.appendChild(normBadge);
    commSec.appendChild(commBlock);
    commSec.appendChild(normBlock);
    sec2.appendChild(commSec);
    body.appendChild(sec2);
  }

  // ── 3. Total holonomy ──────────────────────────────────────────────────
  if(holonomy){
    const sec3 = msec('Total Holonomy  H = (T₁·…·Tₙ)⁻¹ · (Tₙ·…·T₁)');
    const hRow = div('mmat-row');
    const hBlock = div('mmat-block');
    hBlock.appendChild(mlabel('H =', 'muted-label'));
    hBlock.appendChild(mmat(holonomy, isCurved?'result-curved':'result-flat'));
    const magBlock = div('mmat-block');
    magBlock.style.justifyContent = 'center';
    const magBadge = document.createElement('div');
    magBadge.style.cssText = `margin-top:20px;padding:6px 12px;border-radius:8px;font-size:13px;font-weight:700;
      background:${isCurved?'rgba(239,68,68,.12)':'rgba(16,185,129,.12)'};
      color:${isCurved?'var(--red)':'var(--green)'};border:1px solid ${isCurved?'rgba(239,68,68,.3)':'rgba(16,185,129,.3)'}`;
    magBadge.innerHTML = `‖H − I‖ = ${totalMag.toFixed(5)}<br>${isCurved?'curved':'flat — H = identity'}`;
    magBlock.appendChild(magBadge);
    hRow.appendChild(hBlock); hRow.appendChild(magBlock);
    sec3.appendChild(hRow);
    body.appendChild(sec3);
  }

  // ── 4. Physics explanation ─────────────────────────────────────────────
  const sec4 = msec('What This Means');
  const box = div('physics-box');
  box.innerHTML = isCurved ? curvedExplanation(pairs, totalMag) : flatExplanation();
  sec4.appendChild(box);
  body.appendChild(sec4);
}

function curvedExplanation(pairs, totalMag){
  const curved = pairs.filter(p=>!p.flat);
  const pairNames = curved.map(p=>`T${p.i+1} and T${p.i+2}`).join(', ');
  return `
    <p><strong>Non-commutativity:</strong> The connection matrices do not commute —
    applying them in different orders produces different results.
    This is the hallmark of <span class="hi-curved">curvature</span> in the connection.
    Non-commuting pair${curved.length>1?'s':''}: <strong>${pairNames}</strong>.</p>

    <p><strong>Path dependence:</strong> A vector parallel-transported along path
    T₁→T₂→… arrives at a different orientation than one transported along T₂→T₁→…
    This path-dependence <em>is</em> curvature — it's not a coordinate artifact, it's physical.</p>

    <p><strong>Holonomy ‖H−I‖ = ${totalMag.toFixed(4)}:</strong>
    If you transport a vector around a closed loop (forward order, then reverse), it
    returns rotated or sheared — not to its original state.
    The holonomy matrix H measures exactly how much it drifts.</p>

    <hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:10px 0">

    <p><strong>⚠ There are actually two distinct sources of curvature here:</strong></p>

    <p><strong>1. Curvature of the Connection (Riemann Curvature).</strong>
    This is a property of the <em>space itself</em> — it cannot be removed by changing
    coordinates. Even with the simplest, most "boring" basis, a vector still rotates
    when transported around a loop because the geometry is intrinsically curved.
    Measured by the Riemann tensor R(u,v)w. The logical test: if you can find any
    coordinate system where all connection coefficients Γ<sup>α</sup><sub>βγ</sub>
    vanish everywhere, the space is flat.</p>

    <p><strong>2. Curvature of the Basis (Frame / Anholonomicity).</strong>
    Even in a perfectly <em>flat</em> space (like a sheet of paper), you can choose
    basis vectors V<sub>i</sub> that "twist" as you move. If your basis vectors are
    not the gradient of a coordinate system, they generally don't commute — their
    Lie bracket [e<sub>i</sub>, e<sub>j</sub>] = f<sup>k</sup><sub>ij</sub> e<sub>k</sub>
    is non-zero. This "curvature" is a <em>choice</em>: you can always fix it by
    switching to a Cartesian grid. You cannot fix Riemann curvature that way.</p>

    <p><strong>The bridge — Cartan's Structure Equations.</strong>
    In the moving-frames formalism, the total holonomy is a combination of:
    (a) the twisting of the frame (how your "camera" rotates as you move), and
    (b) the actual curvature of the space (how the "floor" bends under you).
    Your tool reports the <em>net holonomy</em> — it cannot tell you how much comes
    from each source. To isolate pure connection curvature: set all basis vectors to
    Identity and vary only the T matrices. To isolate pure frame curvature: set all
    T = Identity and vary the basis vectors V<sub>i</sub>.</p>

    <p><strong>Physics connection:</strong> In gauge theory, this is how the
    field-strength tensor F<sub>μν</sub> = [D<sub>μ</sub>, D<sub>ν</sub>] is defined.
    In GR, this is the heart of the Equivalence Principle: locally you cannot tell
    whether a vector rotates because the space curves (connection) or because your
    reference frame rotates (basis). The Riemann tensor is the "leftover" part that
    survives no matter how cleverly you choose your frame — it is the gauge-invariant
    content of the curvature.</p>

    <p><strong>To make it flat:</strong> Set all T matrices to be scalar multiples of
    the identity, or ensure every pair commutes (e.g. all diagonal matrices commute
    with each other).</p>`;
}

function flatExplanation(){
  return `
    <p><strong>Commutativity:</strong> All connection matrices commute — applying them
    in any order produces the same result.
    This means the connection is <span class="hi-flat">flat</span>.</p>

    <p><strong>Path independence:</strong> A vector parallel-transported along any
    path between two tangent spaces arrives with the same orientation, regardless of
    the route taken. There is no holonomy.</p>

    <p><strong>Holonomy = identity:</strong> A vector transported around a closed loop
    returns exactly to its starting orientation. The loop closes perfectly.</p>

    <hr style="border:none;border-top:1px solid rgba(255,255,255,.08);margin:10px 0">

    <p><strong>Note on two types of "curvature."</strong>
    This tool measures <em>net holonomy</em>, which can come from two distinct sources —
    and it is important not to conflate them:</p>

    <p><strong>1. Curvature of the Connection</strong> is intrinsic to the space. It
    cannot be removed by any change of basis. Even with the simplest "boring" frame,
    a vector rotates after transport because the <em>geometry itself</em> is curved.
    This is what the Riemann tensor R(u,v)w measures.</p>

    <p><strong>2. Curvature of the Basis (Anholonomicity)</strong> is a property of
    your <em>choice of frame</em>, not the space. In a perfectly flat space, you can
    still choose basis vectors V<sub>i</sub> that twist as you move, producing a
    non-zero holonomy. Because e<sub>i</sub> ≠ ∂/∂x<sup>i</sup>, the Lie bracket
    [e<sub>i</sub>, e<sub>j</sub>] = f<sup>k</sup><sub>ij</sub> e<sub>k</sub> ≠ 0.
    This "curvature" is a choice — you can fix it by picking a Cartesian grid.</p>

    <p><strong>Your connection is currently flat</strong> in the <em>net</em> sense.
    But to verify it is truly intrinsically flat (rather than frame-curvature
    cancelling connection curvature), set all basis vectors to Identity and check
    whether the T matrices alone still commute.</p>

    <p><strong>Physics connection:</strong> This corresponds to a zero field-strength
    tensor — F<sub>μν</sub> = 0 in gauge theory, or a flat metric in GR.
    Even if the individual basis frames (V<sub>i</sub>) look different, the
    <em>net connection</em> between them is integrable and carries no holonomy.
    This is the sense in which a pure gauge transformation "looks curved" locally
    but is globally trivial.</p>`;
}

// ── Modal DOM helpers ─────────────────────────────────────────────────────────
function div(cls){ const d=document.createElement('div'); d.className=cls; return d; }
function msec(title){
  const s=div('msec');
  const t=document.createElement('div'); t.className='msec-title'; t.textContent=title;
  s.appendChild(t); return s;
}
function mlabel(text, cls){
  const l=document.createElement('div');
  l.style.cssText='font-size:11px;color:var(--muted);margin-bottom:2px';
  if(cls==='conn-label') l.style.color='var(--accent)';
  l.textContent=text; return l;
}
function mmat(M, extraClass=''){
  const d=document.createElement('div');
  d.className='mmat-bracket'+(extraClass?' '+extraClass:'');
  d.textContent=`${f2(M.a)}  ${f2(M.b)}\n${f2(M.c)}  ${f2(M.d)}`;
  return d;
}

function sizeAllCanvases(){
  nodes.forEach((node,i)=>{
    const cv=document.getElementById(`cv-${node.id}`);
    if(cv)renderCanvas(cv,i);
  });
}

// ── Options ───────────────────────────────────────────────────────────────────
function getRange(){return parseInt(document.getElementById('opt-range').value)||3;}

// ── Init ──────────────────────────────────────────────────────────────────────
addNode();addNode();addNode();
buildAll();

document.getElementById('add-node-btn').addEventListener('click',()=>{
  addNode();buildAll();
  document.querySelector('.chain-scroll-wrap').scrollLeft=1e6;
});

const sidebar=document.getElementById('sidebar');
document.getElementById('sidebar-toggle').addEventListener('click',()=>{
  sidebar.classList.toggle('collapsed');
  document.getElementById('sidebar-toggle').textContent=sidebar.classList.contains('collapsed')?'›':'‹';
});

['opt-grid','opt-basis'].forEach(id=>
  document.getElementById(id).addEventListener('change',rerenderAll));
document.getElementById('opt-range').addEventListener('input',function(){
  document.getElementById('opt-range-val').textContent=this.value;rerenderAll();
});

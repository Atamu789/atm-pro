window.Draw={
  items:[],undoS:[],redoS:[],active:null,draft:null,sel:null,magnet:false,drag:null,
  colors:["#38bdf8","#ec4899","#10b981","#f43f5e","#f59e0b","#a855f7","#ffffff"],
  tools:[["long","📈 Position Longue","TP vert / SL rouge & R:R"],["short","📉 Position Courte","Short R:R & PnL"],["fibo","📐 Fibonacci","0 • 0.5 • 0.618 • 0.786 • 1"],["range","📏 Intervalle prix","Points, % & pips"],["trend","╱ Ligne tendance","2 points"],["hline","─ Ligne horizontale","Niveau de prix"],["ray","→ Rayon horizontal","Vers la droite"],["rect","▭ Rectangle","Zone & 4 coins"],["arrow","↗ Flèche","Direction visuelle"],["brush","🖌 Pinceau","Tracé libre"],["text","T Texte","Annotation"],["clear","🗑 Tout effacer","Vider le graphique"]],
  key(){return "atm_draw_"+(window.App?App.sym:"XAU");},
  load(){try{this.items=JSON.parse(localStorage.getItem(this.key())||"[]");}catch(e){this.items=[];}this.sel=null;this.syncBar();},
  save(){try{localStorage.setItem(this.key(),JSON.stringify(this.items));}catch(e){}},
  snap(){this.undoS.push(JSON.stringify(this.items));if(this.undoS.length>40)this.undoS.shift();this.redoS=[];},
  undo(){if(!this.undoS.length)return;this.redoS.push(JSON.stringify(this.items));this.items=JSON.parse(this.undoS.pop());this.sel=null;this.save();this.syncBar();if(window.Ind)Ind.draw();},
  redo(){if(!this.redoS.length)return;this.undoS.push(JSON.stringify(this.items));this.items=JSON.parse(this.redoS.pop());this.sel=null;this.save();this.syncBar();if(window.Ind)Ind.draw();},
  renderModal(){const w=document.getElementById("draw-grid-wrap");if(!w)return;w.innerHTML='<div class="dr-grid">'+this.tools.map(([id,n,s])=>'<button type="button" class="dr-item'+(id==="clear"?" danger":"")+'" onclick="'+(id==="clear"?"Draw.clearAll()":"Draw.start('"+id+"')")+'"><b>'+n+'</b><small>'+s+'</small></button>').join("")+'</div>';},
  toggleMagnet(){this.magnet=!this.magnet;document.getElementById("bb-mag-btn")?.classList.toggle("active",this.magnet);},
  start(type){
    App.closeModals();this.active=type;this.draft=null;this.select(null);
    const b=document.getElementById("draw-banner"),h=document.getElementById("draw-hint"),t=this.tools.find(x=>x[0]===type);
    if(b)b.style.display="flex";if(h)h.textContent=(t?t[1]:type)+" — Touche le graphique";
    document.getElementById("bb-draw-btn")?.classList.add("active");
    if(App.chart)App.chart.applyOptions({handleScroll:false,handleScale:false});
  },
  cancel(){this.active=null;this.draft=null;const b=document.getElementById("draw-banner");if(b)b.style.display="none";document.getElementById("bb-draw-btn")?.classList.remove("active");if(App.chart)App.chart.applyOptions({handleScroll:true,handleScale:true});if(window.Ind)Ind.draw();},
  clearAll(){App.closeModals();if(!this.items.length)return;this.snap();this.items=[];this.select(null);this.save();if(window.Ind)Ind.draw();},
  ptFromXY(x,y){
    if(!App.chart||!App.series||!App.candles.length)return null;
    let ix=App.chart.timeScale().coordinateToLogical(x),pr=App.series.coordinateToPrice(y);if(ix===null||pr===null)return null;
    const ci=Math.max(0,Math.min(App.candles.length-1,Math.round(ix)));
    if(this.magnet&&App.candles[ci]){const c=App.candles[ci],vs=[c.open,c.high,c.low,c.close];let b=vs[0],bd=Math.abs(pr-b);vs.forEach(v=>{const d=Math.abs(pr-v);if(d<bd){bd=d;b=v;}});pr=b;ix=ci;}
    return{i:+ix.toFixed(2),p:+pr.toFixed(pr>100?2:4)};
  },
  xyOf(pt){if(!App.chart||!App.series)return null;const x=App.chart.timeScale().logicalToCoordinate(pt.i),y=App.series.priceToCoordinate(pt.p);return(x===null||y===null)?null:{x,y};},
  defaultItem(type,p1){
    const a=App.candles.length>5?Math.max(App.candles[App.candles.length-1].high-App.candles[App.candles.length-1].low,p1.p*.0012):2;
    const it={id:Date.now()+Math.random(),type,color:"#38bdf8",w:2,dash:0,lock:false,pts:[p1]};
    if(type==="long"){it.color="#10b981";it.cap=10000;it.risk=1;it.pts=[p1,{i:p1.i+14,p:+(p1.p+a*2.2).toFixed(2)},{i:p1.i+14,p:+(p1.p-a).toFixed(2)}];}
    else if(type==="short"){it.color="#f43f5e";it.cap=10000;it.risk=1;it.pts=[p1,{i:p1.i+14,p:+(p1.p-a*2.2).toFixed(2)},{i:p1.i+14,p:+(p1.p+a).toFixed(2)}];}
    else if(type==="fibo"){it.color="#f59e0b";it.lvls=[0,.236,.382,.5,.618,.786,1];it.fill=true;it.pts=[p1,{i:p1.i+16,p:+(p1.p-a*2).toFixed(2)}];}
    else if(type==="text"){it.txt=prompt("Texte sur le graphique :","Zone clé")||"Note";}
    else if(type!=="hline"&&type!=="ray"){it.pts=[p1,{i:p1.i+1,p:p1.p}];}
    return it;
  },
  hitTest(x,y){
    for(let k=this.items.length-1;k>=0;k--){
      const it=this.items[k],xys=it.pts.map(p=>this.xyOf(p));if(xys.some(v=>!v))continue;
      for(let h=0;h<xys.length;h++)if(Math.hypot(x-xys[h].x,y-xys[h].y)<=18)return{item:it,handle:h};
      if(it.type==="hline"||it.type==="ray"){if(Math.abs(y-xys[0].y)<=14)return{item:it,handle:-1};}
      else if(xys.length>=2){const xs=xys.map(v=>v.x),ys=xys.map(v=>v.y);if(x>=Math.min(...xs)-12&&x<=Math.max(...xs)+12&&y>=Math.min(...ys)-12&&y<=Math.max(...ys)+12)return{item:it,handle:-1};}
      else if(Math.hypot(x-xys[0].x,y-xys[0].y)<=22)return{item:it,handle:-1};
    }
    return null;
  },
  select(it){this.sel=it;this.syncBar();if(window.Ind)Ind.draw();},
  syncBar(){const tb=document.getElementById("draw-toolbar");if(!tb)return;if(!this.sel){tb.style.display="none";return;}tb.style.display="flex";document.getElementById("dt-col-btn").style.background=this.sel.color;document.getElementById("dt-w-btn").textContent=this.sel.w+"px";document.getElementById("dt-d-btn").textContent=this.sel.dash?"┄┄":"──";document.getElementById("dt-lk-btn").textContent=this.sel.lock?"🔒":"🔓";},
  cycleColor(){if(!this.sel)return;this.snap();this.sel.color=this.colors[(this.colors.indexOf(this.sel.color)+1)%this.colors.length];this.save();this.syncBar();if(window.Ind)Ind.draw();},
  cycleWidth(){if(!this.sel)return;this.snap();this.sel.w=this.sel.w>=4?1:this.sel.w+1;this.save();this.syncBar();if(window.Ind)Ind.draw();},
  cycleDash(){if(!this.sel)return;this.snap();this.sel.dash=this.sel.dash?0:1;this.save();this.syncBar();if(window.Ind)Ind.draw();},
  toggleLock(){if(!this.sel)return;this.sel.lock=!this.sel.lock;this.save();this.syncBar();},
  delSel(){if(!this.sel)return;this.snap();this.items=this.items.filter(x=>x.id!==this.sel.id);this.select(null);this.save();},
  bindTouch(){
    const cw=document.getElementById("chart-wrap");if(!cw||this._b)return;this._b=true;
    const gxy=e=>{const r=cw.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return{x:t.clientX-r.left,y:t.clientY-r.top};};
    cw.addEventListener("touchstart",e=>{
      if(!e.touches.length||e.target.closest("#draw-toolbar")||e.target.closest("#draw-banner"))return;
      const{x,y}=gxy(e);
      if(this.active){const pt=this.ptFromXY(x,y);if(!pt)return;const it=this.defaultItem(this.active,pt);if(["hline","ray","text","long","short"].includes(this.active)){this.snap();this.items.push(it);this.save();this.select(it);this.cancel();return;}this.draft=it;if(e.cancelable)e.preventDefault();return;}
      const hit=this.hitTest(x,y);
      if(hit){this.select(hit.item);if(!hit.item.lock){this.snap();this.drag={item:hit.item,handle:hit.handle,sp:this.ptFromXY(x,y),orig:hit.item.pts.map(o=>({i:o.i,p:o.p}))};if(App.chart)App.chart.applyOptions({handleScroll:false,handleScale:false});}}
      else if(this.sel)this.select(null);
    },{passive:false});
    cw.addEventListener("touchmove",e=>{
      if(!e.touches.length)return;const{x,y}=gxy(e);
      if(this.draft){if(e.cancelable)e.preventDefault();const pt=this.ptFromXY(x,y);if(!pt)return;if(this.draft.type==="brush")this.draft.pts.push(pt);else this.draft.pts[1]=pt;if(window.Ind)Ind.draw();return;}
      if(this.drag){if(e.cancelable)e.preventDefault();const pt=this.ptFromXY(x,y);if(!pt||!this.drag.sp)return;const it=this.drag.item,h=this.drag.handle;if(h>=0){it.pts[h]=pt;if((it.type==="long"||it.type==="short")&&(h===1||h===2)){it.pts[1].i=pt.i;it.pts[2].i=pt.i;}}else{const di=pt.i-this.drag.sp.i,dp=pt.p-this.drag.sp.p;it.pts=this.drag.orig.map(o=>({i:+(o.i+di).toFixed(2),p:+(o.p+dp).toFixed(o.p>100?2:4)}));}if(window.Ind)Ind.draw();}
    },{passive:false});
    const end=()=>{if(this.draft){this.snap();this.items.push(this.draft);this.save();const d=this.draft;this.draft=null;this.select(d);this.cancel();}if(this.drag){this.drag=null;this.save();if(App.chart)App.chart.applyOptions({handleScroll:true,handleScale:true});}};
    cw.addEventListener("touchend",end);cw.addEventListener("touchcancel",end);
  }
};

Object.assign(Draw,{
  openCfg(){
    const it=this.sel;if(!it)return;
    document.getElementById("dc-title").textContent="Paramètres — "+it.type.toUpperCase();
    let h='<div class="cfg-g">';
    if(it.type==="long"||it.type==="short")h+='<label>Entrée<input id="dc-p0" type="number" step="0.01" value="'+it.pts[0].p+'"/></label><label>Take Profit<input id="dc-p1" type="number" step="0.01" value="'+it.pts[1].p+'"/></label><label>Stop Loss<input id="dc-p2" type="number" step="0.01" value="'+it.pts[2].p+'"/></label><label>Capital ($)<input id="dc-cap" type="number" value="'+(it.cap||10000)+'"/></label><label>Risque (%)<input id="dc-rk" type="number" step="0.25" value="'+(it.risk||1)+'"/></label>';
    else if(it.type==="fibo")h+='<label style="grid-column:span 2">Niveaux Fibo<input id="dc-flv" value="'+(it.lvls||[0,.5,.618,.786,1]).join(",")+'"/></label><label>Remplissage<select id="dc-ff" class="m-inp"><option value="1"'+(it.fill?" selected":"")+'>Actif</option><option value="0"'+(!it.fill?" selected":"")+'>Sans fond</option></select></label>';
    else if(it.type==="text")h+='<label style="grid-column:span 2">Texte<input id="dc-txt" value="'+(it.txt||"Note")+'"/></label>';
    else{h+='<label>Prix Pt 1<input id="dc-p0" type="number" step="0.01" value="'+it.pts[0].p+'"/></label>';if(it.pts[1])h+='<label>Prix Pt 2<input id="dc-p1" type="number" step="0.01" value="'+it.pts[1].p+'"/></label>';}
    document.getElementById("dc-body").innerHTML=h+'</div><button type="button" class="sc-scan-btn" style="margin-top:12px" onclick="Draw.applyCfg()">✓ APPLIQUER</button>';
    App.openModal("draw-cfg-modal");
  },
  applyCfg(){
    const it=this.sel;if(!it)return;this.snap();const gv=id=>document.getElementById(id)?.value;
    if(gv("dc-p0")!==undefined)it.pts[0].p=+gv("dc-p0");if(gv("dc-p1")!==undefined&&it.pts[1])it.pts[1].p=+gv("dc-p1");if(gv("dc-p2")!==undefined&&it.pts[2])it.pts[2].p=+gv("dc-p2");
    if(gv("dc-cap")!==undefined)it.cap=Math.max(100,+gv("dc-cap")||10000);if(gv("dc-rk")!==undefined)it.risk=Math.max(.1,+gv("dc-rk")||1);
    if(gv("dc-flv")!==undefined)it.lvls=gv("dc-flv").split(",").map(Number).filter(x=>isFinite(x));
    if(gv("dc-ff")!==undefined)it.fill=gv("dc-ff")==="1";if(gv("dc-txt")!==undefined)it.txt=gv("dc-txt")||"Note";
    this.save();App.closeModals();if(window.Ind)Ind.draw();
  },
  render(ctx,rE,bE,dec){
    const all=this.draft?[...this.items,this.draft]:this.items;
    all.forEach(it=>{
      const xys=it.pts.map(p=>this.xyOf(p));if(xys.some(v=>!v))return;
      const isS=this.sel&&this.sel.id===it.id;
      ctx.save();ctx.strokeStyle=it.color;ctx.fillStyle=it.color;ctx.lineWidth=it.w||2;if(it.dash)ctx.setLineDash([5,4]);
      if(it.type==="hline"){ctx.beginPath();ctx.moveTo(0,xys[0].y);ctx.lineTo(rE,xys[0].y);ctx.stroke();ctx.setLineDash([]);ctx.font="bold 9px monospace";ctx.fillText(it.pts[0].p.toFixed(dec),6,xys[0].y-4);}
      else if(it.type==="ray"){ctx.beginPath();ctx.moveTo(xys[0].x,xys[0].y);ctx.lineTo(rE,xys[0].y);ctx.stroke();}
      else if(it.type==="trend"||it.type==="arrow"){
        ctx.beginPath();ctx.moveTo(xys[0].x,xys[0].y);ctx.lineTo(xys[1].x,xys[1].y);ctx.stroke();
        if(it.type==="arrow"){const a=Math.atan2(xys[1].y-xys[0].y,xys[1].x-xys[0].x),hl=11;ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(xys[1].x,xys[1].y);ctx.lineTo(xys[1].x-hl*Math.cos(a-.45),xys[1].y-hl*Math.sin(a-.45));ctx.moveTo(xys[1].x,xys[1].y);ctx.lineTo(xys[1].x-hl*Math.cos(a+.45),xys[1].y-hl*Math.sin(a+.45));ctx.stroke();}
      }
      else if(it.type==="rect"){const rx=Math.min(xys[0].x,xys[1].x),ry=Math.min(xys[0].y,xys[1].y),rw=Math.abs(xys[1].x-xys[0].x),rh=Math.abs(xys[1].y-xys[0].y);ctx.globalAlpha=.14;ctx.fillRect(rx,ry,rw,rh);ctx.globalAlpha=1;ctx.strokeRect(rx,ry,rw,rh);}
      else if(it.type==="brush"){ctx.beginPath();xys.forEach((v,i)=>i===0?ctx.moveTo(v.x,v.y):ctx.lineTo(v.x,v.y));ctx.stroke();}
      else if(it.type==="text"){ctx.setLineDash([]);ctx.font="bold 11px sans-serif";const tw=ctx.measureText(it.txt||"Note").width+12;ctx.fillStyle="rgba(8,12,24,.88)";ctx.fillRect(xys[0].x-4,xys[0].y-16,tw,20);ctx.strokeRect(xys[0].x-4,xys[0].y-16,tw,20);ctx.fillStyle=it.color;ctx.fillText(it.txt||"Note",xys[0].x+2,xys[0].y-2);}
      else if(it.type==="range"){const rx=Math.min(xys[0].x,xys[1].x),ry=Math.min(xys[0].y,xys[1].y),rw=Math.max(24,Math.abs(xys[1].x-xys[0].x)),rh=Math.abs(xys[1].y-xys[0].y),dp=it.pts[1].p-it.pts[0].p,pc=(dp/Math.max(Math.abs(it.pts[0].p),1e-6))*100,cl=dp>=0?"#10b981":"#f43f5e";ctx.fillStyle=dp>=0?"rgba(16,185,129,.16)":"rgba(244,63,94,.16)";ctx.fillRect(rx,ry,rw,rh);ctx.strokeStyle=cl;ctx.strokeRect(rx,ry,rw,rh);const tg=(dp>=0?"+":"")+dp.toFixed(dec)+" ("+(pc>=0?"+":"")+pc.toFixed(2)+"%)";ctx.setLineDash([]);ctx.font="bold 9.5px monospace";const tw=ctx.measureText(tg).width+10;ctx.fillStyle=cl;ctx.fillRect(rx+rw/2-tw/2,ry-18,tw,16);ctx.fillStyle="#04101c";ctx.fillText(tg,rx+rw/2-tw/2+5,ry-6.5);}
      else if(it.type==="fibo"){const x1=Math.min(xys[0].x,xys[1].x),x2=Math.max(xys[0].x,xys[1].x),p0=it.pts[0].p,p1=it.pts[1].p;ctx.strokeStyle="rgba(148,163,184,.5)";ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.moveTo(xys[0].x,xys[0].y);ctx.lineTo(xys[1].x,xys[1].y);ctx.stroke();ctx.setLineDash([]);const lvs=it.lvls||[0,.236,.382,.5,.618,.786,1],cls=["#94a3b8","#38bdf8","#10b981","#facc15","#ec4899","#a855f7","#94a3b8"];lvs.forEach((lv,ix)=>{const pv=p1+(p0-p1)*lv,y=App.series.priceToCoordinate(pv);if(y===null)return;const c=cls[ix%cls.length];if(it.fill&&ix>0){const py=App.series.priceToCoordinate(p1+(p0-p1)*lvs[ix-1]);if(py!==null){ctx.fillStyle=c+"18";ctx.fillRect(x1,Math.min(y,py),Math.max(40,x2-x1),Math.abs(y-py));}}ctx.strokeStyle=c;ctx.lineWidth=(lv===.618||lv===.5)?1.5:1;ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(Math.max(x1+40,x2),y);ctx.stroke();ctx.font="bold 8.5px monospace";ctx.fillStyle=c;ctx.fillText(lv+" ("+pv.toFixed(dec)+")",x1+4,y-3);});}
      else if(it.type==="long"||it.type==="short"){const e=xys[0],tp=xys[1],sl=xys[2],x1=Math.min(e.x,tp.x),x2=Math.max(e.x+56,tp.x),rw=Math.abs(it.pts[1].p-it.pts[0].p),rk=Math.max(Math.abs(it.pts[0].p-it.pts[2].p),1e-6),rr=(rw/rk).toFixed(2),rU=(it.cap||10000)*(it.risk||1)/100,gU=rU*(rw/rk);ctx.fillStyle="rgba(16,185,129,.2)";ctx.fillRect(x1,Math.min(e.y,tp.y),x2-x1,Math.abs(tp.y-e.y));ctx.fillStyle="rgba(244,63,94,.2)";ctx.fillRect(x1,Math.min(e.y,sl.y),x2-x1,Math.abs(sl.y-e.y));ctx.setLineDash([]);ctx.strokeStyle="#94a3b8";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x1,e.y);ctx.lineTo(x2,e.y);ctx.stroke();ctx.strokeStyle="#10b981";ctx.beginPath();ctx.moveTo(x1,tp.y);ctx.lineTo(x2,tp.y);ctx.stroke();ctx.strokeStyle="#f43f5e";ctx.beginPath();ctx.moveTo(x1,sl.y);ctx.lineTo(x2,sl.y);ctx.stroke();ctx.font="bold 9px monospace";ctx.fillStyle="#34d399";ctx.fillText("TP "+it.pts[1].p.toFixed(dec)+" (+$"+gU.toFixed(0)+")",x1+5,tp.y+(it.type==="long"?12:-4));ctx.fillStyle="#fda4af";ctx.fillText("SL "+it.pts[2].p.toFixed(dec)+" (-$"+rU.toFixed(0)+")",x1+5,sl.y+(it.type==="long"?-4:12));const rt=(it.type==="long"?"LONG ":"SHORT ")+"R:R 1:"+rr,tw=ctx.measureText(rt).width+10;ctx.fillStyle="rgba(8,12,24,.9)";ctx.fillRect(x1+4,e.y-9,tw,16);ctx.fillStyle="#f8fafc";ctx.fillText(rt,x1+9,e.y+2);}
      if(isS){ctx.setLineDash([]);xys.forEach(v=>{ctx.fillStyle="#fff";ctx.strokeStyle=it.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(v.x,v.y,5,0,Math.PI*2);ctx.fill();ctx.stroke();});}
      ctx.restore();
    });
  }
});
(function(){
  if(window.Ind&&typeof Ind.draw==="function"&&!Ind._dh){Ind._dh=true;const o=Ind.draw.bind(Ind);Ind.draw=function(){o();const cv=document.getElementById("overlay-canvas"),cs=App.candles;if(!cv||!cs||!cs.length||!App.chart)return;let pw=70;try{const rw=App.chart.priceScale("right").width();if(rw>40)pw=Math.ceil(rw)+2;}catch(e){}const ctx=cv.getContext("2d"),rE=Math.max(80,cv.clientWidth-pw),bE=Math.max(60,cv.clientHeight-28),dec=cs[cs.length-1].close>100?2:4;ctx.save();ctx.beginPath();ctx.rect(0,0,rE,bE);ctx.clip();Draw.render(ctx,rE,bE,dec);ctx.restore();};}
  const op=App.setPair.bind(App);App.setPair=function(s){op(s);Draw.load();};
  Draw.bindTouch();Draw.load();Draw.renderModal();
})();

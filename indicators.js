window.Ind = {
  on:{ struct:true, ob:true, fvg:true, sd:false, dxy:true, atm2:false, ema:false, tl:false },
  cfg:{ tp1:0.5, tp2:3.0, alen:10, amul:3.0, ext:6, sw:3 },
  data:{ st:[], sigs:[], stats:{} },
  smc:{ pivots:[], structs:[], liqs:[], obs:[], fvgs:[], bias:0 },
  sd:{ zones:[] },
  dxy:{ pts:[], dir:0, pct:0, corr:0, status:"NEUTRE", inverseOk:false },

  syncBtns(){
    ["struct","ob","fvg","sd","dxy","atm2","ema","tl"].forEach(k=>{
      const b=document.getElementById("tog-"+k); if(b){ b.classList.toggle("on",!!this.on[k]); b.textContent=this.on[k]?"Actif":"Afficher"; }
      const q=document.getElementById("qp-"+k); if(q) q.classList.toggle("on",!!this.on[k]);
    });
    const dp=document.getElementById("dxy-pill"); if(dp) dp.style.display=this.on.dxy?"block":"none";
  },
  toggle(k){ this.on[k]=!this.on[k]; this.syncBtns(); if(k==="dxy"&&this.on.dxy) this.refreshDXY(); this.draw(); },
  saveCfg(){
    this.cfg.tp1=Math.max(0.2,parseFloat(document.getElementById("cfg-tp1")?.value)||0.5);
    this.cfg.tp2=Math.max(0.8,parseFloat(document.getElementById("cfg-tp2")?.value)||3.0);
    this.cfg.alen=Math.max(5,Math.min(30,parseInt(document.getElementById("cfg-alen")?.value,10)||10));
    this.cfg.sw=Math.max(2,Math.min(8,parseInt(document.getElementById("cfg-sw")?.value,10)||3));
    this.compute(); this.draw();
  },
  calcAtr(cs,per){ const a=new Array(cs.length).fill(0); for(let i=0;i<cs.length;i++){ const c=cs[i]; a[i]=i===0?(c.high-c.low):((a[i-1]*(per-1)+Math.max(c.high-c.low,Math.abs(c.high-cs[i-1].close),Math.abs(c.low-cs[i-1].close)))/per); } return a; },
  compute(){ const cs=App.candles; if(!cs||cs.length<25) return; this.computeSMC(cs); this.computeSD(cs); this.computeAtm2(cs); this.syncBtns(); },

  async refreshDXY(){
    try {
      const sp=App.spec||App.parseTF(App.tf), iv=(sp.kind==="native"&&sp.rest!=="1s")?sp.rest:"1m";
      const [eur,gbp]=await Promise.all([App.fetchBin("/api/v3/klines?symbol=EURUSDT&interval="+iv+"&limit=60"), App.fetchBin("/api/v3/klines?symbol=GBPUSDT&interval="+iv+"&limit=60")]);
      if(eur.length<20) return;
      const gm=new Map(gbp.map(k=>[Math.floor(+k[0]/1000),+k[4]])), pts=[];
      for(const k of eur){ const t=Math.floor(+k[0]/1000), ec=+k[4], gc=gm.get(t)||1.27; pts.push({ time:t, val:100/(Math.pow(ec,0.76)*Math.pow(gc,0.24)) }); }
      const n=pts.length, p0=pts[Math.max(0,n-15)].val, p1=pts[n-1].val, pct=+(((p1-p0)/p0)*100).toFixed(3), dir=pct>0.012?1:(pct<-0.012?-1:0);
      let corr=0; const cs=App.candles;
      if(cs.length>=26&&pts.length>=26){
        const aC=cs.slice(-26).map(c=>c.close), dC=pts.slice(-26).map(x=>x.val), rx=[], ry=[];
        for(let i=1;i<26;i++){ rx.push((aC[i]-aC[i-1])/aC[i-1]); ry.push((dC[i]-dC[i-1])/dC[i-1]); }
        const mx=rx.reduce((a,b)=>a+b,0)/rx.length, my=ry.reduce((a,b)=>a+b,0)/ry.length;
        let num=0, dx=0, dy=0; for(let i=0;i<rx.length;i++){ const a=rx[i]-mx, b=ry[i]-my; num+=a*b; dx+=a*a; dy+=b*b; }
        corr=(dx>0&&dy>0)?Math.round((num/Math.sqrt(dx*dy))*100):0;
      }
      const inv=corr<=-35, status=inv?"✓ CORR INVERSE":(corr>=30?"⚠ DIVERGENCE":"• NEUTRE");
      this.dxy={ pts, dir, pct, corr, status, inverseOk:inv };
      const dE=document.getElementById("dxy-dir"), cE=document.getElementById("dxy-corr"), sE=document.getElementById("dxy-st");
      if(dE){ dE.textContent=(dir>=0?"▲ ":"▼ ")+(pct>=0?"+":"")+pct+"%"; dE.style.color=dir>=0?"#fb7185":"#34d399"; }
      if(cE){ cE.textContent=(corr>=0?"+":"")+corr+"%"; cE.style.color=inv?"#34d399":(corr>=30?"#fde047":"#cbd5e1"); }
      if(sE){ sE.textContent=status; sE.style.color=inv?"#34d399":(corr>=30?"#fb7185":"#94a3b8"); }
      this.draw();
    } catch(e){}
  },

  computeSMC(cs){
    const len=cs.length, L=this.cfg.sw||3, atr=this.calcAtr(cs,14), pivots=[], structs=[], liqs=[], obs=[], fvgs=[];
    let pH=null, pL=null;
    for(let i=L;i<len-L;i++){
      let isH=true, isL=true;
      for(let j=i-L;j<=i+L;j++){ if(j===i) continue; if(cs[j].high>=cs[i].high) isH=false; if(cs[j].low<=cs[i].low) isL=false; }
      if(isH){
        const p={ idx:i, type:"H", price:cs[i].high, lbl:!pH?"H":(cs[i].high>pH.price?"HH":"LH"), broken:false }; pivots.push(p);
        if(pH&&Math.abs(cs[i].high-pH.price)<=Math.max(atr[i]*0.35,cs[i].close*0.00018)&&(i-pH.idx)>=4&&(i-pH.idx)<=45) liqs.push({ idx1:pH.idx, idx2:i, price:Math.max(pH.price,cs[i].high), type:"BSL", lbl:"EQH $$$" });
        pH=p;
      }
      if(isL){
        const p={ idx:i, type:"L", price:cs[i].low, lbl:!pL?"L":(cs[i].low<pL.price?"LL":"HL"), broken:false }; pivots.push(p);
        if(pL&&Math.abs(cs[i].low-pL.price)<=Math.max(atr[i]*0.35,cs[i].close*0.00018)&&(i-pL.idx)>=4&&(i-pL.idx)<=45) liqs.push({ idx1:pL.idx, idx2:i, price:Math.min(pL.price,cs[i].low), type:"SSL", lbl:"EQL $$$" });
        pL=p;
      }
    }
    let tr=0, lH=null, lL=null, ptr=0;
    for(let i=0;i<len;i++){
      while(ptr<pivots.length&&pivots[ptr].idx<=i-L){ const pv=pivots[ptr++]; if(pv.type==="H") lH=pv; else lL=pv; }
      if(lH&&!lH.broken&&cs[i].close>lH.price){ lH.broken=true; structs.push({ idx1:lH.idx, idx2:i, price:lH.price, dir:1, kind:tr===-1?"CHoCH":"BOS" }); tr=1; for(let k=i-1;k>=Math.max(0,lH.idx-6);k--){ if(cs[k].close<cs[k].open){ obs.push({ idx:k, top:Math.max(cs[k].open,cs[k].close), bot:cs[k].low, dir:1, active:true }); break; } } }
      if(lL&&!lL.broken&&cs[i].close<lL.price){ lL.broken=true; structs.push({ idx1:lL.idx, idx2:i, price:lL.price, dir:-1, kind:tr===1?"CHoCH":"BOS" }); tr=-1; for(let k=i-1;k>=Math.max(0,lL.idx-6);k--){ if(cs[k].close>cs[k].open){ obs.push({ idx:k, top:cs[k].high, bot:Math.min(cs[k].open,cs[k].close), dir:-1, active:true }); break; } } }
    }
    pivots.filter(p=>p.type==="H"&&!p.broken).slice(-2).forEach(p=>liqs.push({ idx1:p.idx, idx2:len-1, price:p.price, type:"BSL", lbl:"BSL $$$" }));
    pivots.filter(p=>p.type==="L"&&!p.broken).slice(-2).forEach(p=>liqs.push({ idx1:p.idx, idx2:len-1, price:p.price, type:"SSL", lbl:"SSL $$$" }));
    obs.forEach(o=>{ for(let k=o.idx+2;k<len;k++) if((o.dir===1&&cs[k].close<o.bot)||(o.dir===-1&&cs[k].close>o.top)){ o.active=false; break; } });
    for(let i=2;i<len;i++){
      const mg=Math.max(atr[i]*0.35,cs[i].close*0.00015);
      if(cs[i].low-cs[i-2].high>=mg){ let f=false; for(let k=i+1;k<len;k++) if(cs[k].low<=cs[i-2].high){ f=true; break; } if(!f) fvgs.push({ idx:i-1, top:cs[i].low, bot:cs[i-2].high, dir:1 }); }
      else if(cs[i-2].low-cs[i].high>=mg){ let f=false; for(let k=i+1;k<len;k++) if(cs[k].high>=cs[i-2].low){ f=true; break; } if(!f) fvgs.push({ idx:i-1, top:cs[i-2].low, bot:cs[i].high, dir:-1 }); }
    }
    this.smc={ pivots:pivots.slice(-24), structs:structs.slice(-14), liqs:liqs.slice(-6), obs:obs.filter(o=>o.active).slice(-5), fvgs:fvgs.slice(-6), bias:tr };
  },

  computeSD(cs){
    const len=cs.length, atr=this.calcAtr(cs,14), zs=[];
    for(let i=3;i<len-3;i++){
      if(Math.abs(cs[i].close-cs[i].open)>atr[i]*0.95||(cs[i].high-cs[i].low)>atr[i]*1.8) continue;
      const mU=Math.max(cs[i+1].close-cs[i].high, cs[i+2]?cs[i+2].close-cs[i].high:0), mD=Math.max(cs[i].low-cs[i+1].close, cs[i+2]?cs[i].low-cs[i+2].close:0);
      if(mU>=atr[i]*1.55&&cs[i+1].close>cs[i+1].open){ const top=Math.max(cs[i].open,cs[i].close), bot=cs[i].low; let t=0, br=false; for(let k=i+3;k<len;k++){ if(cs[k].close<bot){br=true;break;} if(cs[k].low<=top&&cs[k-1].low>top) t++; } if(!br&&t<=2) zs.push({ idx:i, top, bot, type:"DEMAND", tests:t }); }
      else if(mD>=atr[i]*1.55&&cs[i+1].close<cs[i+1].open){ const top=cs[i].high, bot=Math.min(cs[i].open,cs[i].close); let t=0, br=false; for(let k=i+3;k<len;k++){ if(cs[k].close>top){br=true;break;} if(cs[k].high>=bot&&cs[k-1].high<bot) t++; } if(!br&&t<=2) zs.push({ idx:i, top, bot, type:"SUPPLY", tests:t }); }
    }
    const pk=a=>{ const o=[]; for(let i=a.length-1;i>=0&&o.length<2;i--){ const z=a[i]; if(!o.some(k=>Math.abs(k.top-z.top)<(k.top-k.bot)*1.2)) o.push(z); } return o; };
    this.sd={ zones:[...pk(zs.filter(z=>z.type==="SUPPLY")), ...pk(zs.filter(z=>z.type==="DEMAND"))] };
  },

  computeAtm2(cs){
    const len=cs.length, {alen,amul,tp1,tp2}=this.cfg, dec=cs[len-1].close>100?2:4, pm=App.sym.startsWith("XAU")?10:(App.sym.startsWith("BTC")?1:(cs[len-1].close>100?10:10000));
    const atr=this.calcAtr(cs,alen), up=[], dn=[], trd=[], st=[], sigs=[];
    for(let i=0;i<len;i++){
      const c=cs[i], hl2=(c.high+c.low)/2, bU=hl2-amul*atr[i], bD=hl2+amul*atr[i];
      if(i===0){ up[i]=bU; dn[i]=bD; trd[i]=1; st[i]={v:+bU.toFixed(dec),t:1}; continue; }
      const pc=cs[i-1].close; up[i]=(bU>up[i-1]||pc<up[i-1])?bU:up[i-1]; dn[i]=(bD<dn[i-1]||pc>dn[i-1])?bD:dn[i-1];
      let ct=trd[i-1]; if(ct===1&&c.close<up[i-1]) ct=-1; else if(ct===-1&&c.close>dn[i-1]) ct=1;
      trd[i]=ct; const v=ct===1?up[i]:dn[i]; st[i]={v:+v.toFixed(dec),t:ct};
      if(i>=alen&&ct!==trd[i-1]){ const isB=ct===1, entry=isB?dn[i-1]:up[i-1], risk=Math.max(Math.abs(entry-v),atr[i]*0.6); sigs.push({ idx:i, isB, dir:isB?"ACHAT":"VENTE", entry:+entry.toFixed(dec), sl:+v.toFixed(dec), tp1:+(isB?entry+risk*tp1:entry-risk*tp1).toFixed(dec), tp2:+(isB?entry+risk*tp2:entry-risk*tp2).toFixed(dec), rP:+(risk*pm).toFixed(1), t1P:+(risk*tp1*pm).toFixed(1), t1H:false, t2H:false, slH:false, st:"EN COURS", pnl:0 }); }
    }
    let w=0, l=0, t2w=0;
    for(let j=0;j<sigs.length;j++){
      const s=sigs[j], end=j+1<sigs.length?sigs[j+1].idx:len-1;
      for(let k=s.idx+1;k<=end;k++){ const ck=cs[k]; if(!s.slH&&!s.t2H){ if(s.isB){ if(ck.high>=s.tp1) s.t1H=true; if(ck.high>=s.tp2){s.t2H=true;s.st="✓ GAGNÉ";} else if(ck.low<=s.sl){s.slH=true;s.st=s.t1H?"✓ GAGNÉ":"PERDU";} } else { if(ck.low<=s.tp1) s.t1H=true; if(ck.low<=s.tp2){s.t2H=true;s.st="✓ GAGNÉ";} else if(ck.high>=s.sl){s.slH=true;s.st=s.t1H?"✓ GAGNÉ":"PERDU";} } } }
      const rp=(s.isB?cs[end].close-s.entry:s.entry-cs[end].close)*pm;
      s.pnl=s.t2H?+(Math.abs(s.tp2-s.entry)*pm).toFixed(1):(s.t1H?(s.st="✓ GAGNÉ",+Math.max(s.t1P,rp).toFixed(1)):(s.slH?-s.rP:+rp.toFixed(1)));
      if(s.st!=="EN COURS"||j<sigs.length-1){ if(s.t1H||s.t2H||s.pnl>0) w++; else l++; if(s.t2H) t2w++; }
    }
    this.data={ st, sigs, stats:{ tot:w+l, w, l, wr:w+l?((w/(w+l))*100).toFixed(1):"0.0", t2r:w+l?((t2w/(w+l))*100).toFixed(1):"0.0" } };
    if(document.getElementById("atm2-panel").style.display==="block") this.renderPanel();
  },

  renderPanel(){
    const cs=App.candles, dec=cs.length&&cs[cs.length-1].close>100?2:4, cur=this.data.sigs[this.data.sigs.length-1], s=this.data.stats;
    const row=t=>{ const tr=App.htf[t]||0; return '<tr><td>UT '+t.toUpperCase()+'</td><td class="'+(tr===1?'p-b':(tr===-1?'p-s':''))+'">'+(tr===1?'HAUSSE':(tr===-1?'BAISSE':'--'))+'</td></tr>'; };
    let h='<div class="ap-hdr">SCANNER MTF</div><table class="ap-tbl">'+["5m","15m","1h","4h"].map(row).join("")+'</table>';
    if(cur) h+='<div class="ap-hdr">ATM 2 — TRADE ACTIF</div><table class="ap-tbl"><tr><td>Sens</td><td class="'+(cur.isB?'p-b':'p-s')+'">'+cur.dir+'</td></tr><tr><td>Entrée</td><td>'+cur.entry.toFixed(dec)+'</td></tr><tr><td>SL</td><td class="p-s">'+cur.sl.toFixed(dec)+'</td></tr><tr><td>TP1</td><td class="p-w">'+cur.tp1.toFixed(dec)+'</td></tr><tr><td>TP2</td><td class="p-b">'+cur.tp2.toFixed(dec)+'</td></tr><tr><td>PnL</td><td class="'+(cur.pnl>=0?'p-b':'p-s')+'">'+(cur.pnl>=0?'+':'')+cur.pnl+'p</td></tr></table>';
    h+='<div class="ap-hdr">STATS GLOBALES</div><table class="ap-tbl"><tr><td>Trades</td><td class="p-b">'+(s.tot||0)+' ('+(s.wr||'0.0')+'%)</td></tr><tr><td>Wins/Loss</td><td>'+(s.w||0)+'W / '+(s.l||0)+'L</td></tr><tr><td>Taux TP2</td><td class="p-b">'+(s.t2r||'0.0')+'%</td></tr></table>';
    document.getElementById("atm2-panel").innerHTML=h;
  },

  draw(){
    const cv=document.getElementById("overlay-canvas"), ctx=cv.getContext("2d"), w=cv.clientWidth, h=cv.clientHeight, cs=App.candles;
    ctx.clearRect(0,0,w,h); if(!cs||!cs.length||!App.chart||!App.series) return;
    const vr=App.chart.timeScale().getVisibleLogicalRange(); if(!vr) return;
    let psW=70; try{ const rw=App.chart.priceScale("right").width(); if(rw>40) psW=Math.ceil(rw)+2; }catch(e){}
    const rE=Math.max(80,w-psW), bE=Math.max(60,h-28);
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,rE,bE); ctx.clip();
    const sI=Math.max(1,Math.floor(vr.from)-2), eI=Math.min(cs.length-1,Math.ceil(vr.to)+2), dec=cs[cs.length-1].close>100?2:4;
    const xOf=i=>App.chart.timeScale().logicalToCoordinate(i), yOf=p=>App.series.priceToCoordinate(p);

    if(this.on.sd) this.sd.zones.forEach(z=>{
      const x1=Math.max(0,xOf(z.idx)??0), y1=yOf(z.top), y2=yOf(z.bot); if(y1===null||y2===null||x1>=rE) return;
      const zh=Math.max(5,Math.abs(y2-y1)), yt=Math.min(y1,y2), isS=z.type==="SUPPLY";
      ctx.fillStyle=isS?"rgba(244,63,94,0.12)":"rgba(16,185,129,0.12)"; ctx.fillRect(x1,yt,rE-x1,zh);
      ctx.strokeStyle=isS?"rgba(244,63,94,0.55)":"rgba(16,185,129,0.55)"; ctx.lineWidth=1; ctx.strokeRect(x1,yt,rE-x1,zh);
      const tag=z.type+" • "+(z.tests===0?"FRAÎCHE":z.tests+"x"); ctx.font="bold 8.5px sans-serif"; ctx.fillStyle=isS?"#fda4af":"#6ee7b7";
      ctx.fillText(tag, Math.max(x1+4,rE-ctx.measureText(tag).width-6), yt+(zh>14?11:-3));
    });
    if(this.on.fvg) this.smc.fvgs.forEach(f=>{
      const x1=Math.max(0,xOf(f.idx)??0), y1=yOf(f.top), y2=yOf(f.bot); if(y1===null||y2===null||x1>=rE) return;
      const fh=Math.max(3,Math.abs(y2-y1)), yt=Math.min(y1,y2), isB=f.dir===1;
      ctx.fillStyle=isB?"rgba(56,189,248,0.13)":"rgba(192,132,252,0.13)"; ctx.fillRect(x1,yt,rE-x1,fh);
      ctx.strokeStyle=isB?"rgba(56,189,248,0.45)":"rgba(192,132,252,0.45)"; ctx.lineWidth=0.8; ctx.setLineDash([3,3]); ctx.strokeRect(x1,yt,rE-x1,fh); ctx.setLineDash([]);
      ctx.font="bold 8px sans-serif"; ctx.fillStyle=isB?"#7dd3fc":"#d8b4fe"; ctx.fillText(isB?"FVG+":"FVG-", x1+4, yt+(fh>11?9.5:-2));
    });
    if(this.on.ob) this.smc.obs.forEach(o=>{
      const x1=Math.max(0,xOf(o.idx)??0), y1=yOf(o.top), y2=yOf(o.bot); if(y1===null||y2===null||x1>=rE) return;
      const oh=Math.max(4,Math.abs(y2-y1)), yt=Math.min(y1,y2), isB=o.dir===1;
      ctx.fillStyle=isB?"rgba(16,185,129,0.20)":"rgba(244,63,94,0.20)"; ctx.fillRect(x1,yt,rE-x1,oh);
      ctx.strokeStyle=isB?"#10b981":"#f43f5e"; ctx.lineWidth=1.1; ctx.beginPath(); ctx.moveTo(x1,yt); ctx.lineTo(rE,yt); ctx.moveTo(x1,yt+oh); ctx.lineTo(rE,yt+oh); ctx.stroke();
      ctx.font="bold 8.5px sans-serif"; ctx.fillStyle=isB?"#34d399":"#fb7185"; ctx.fillText(isB?"OB+":"OB-", x1+4, yt+(oh>12?10:-3));
    });
    if(this.on.struct){
      this.smc.liqs.forEach(lq=>{
        const x1=xOf(lq.idx1), y=yOf(lq.price); if(x1===null||y===null||x1>=rE) return;
        const sx=Math.max(2,x1), ex=Math.min(rE-4,Math.max(sx+40,xOf(lq.idx2)??rE-4));
        ctx.strokeStyle="#facc15"; ctx.lineWidth=1.1; ctx.setLineDash([2,3]); ctx.beginPath(); ctx.moveTo(sx,y); ctx.lineTo(ex,y); ctx.stroke(); ctx.setLineDash([]);
        ctx.font="bold 8.5px sans-serif"; const tw=ctx.measureText(lq.lbl).width; ctx.fillStyle="#fde047";
        ctx.fillText(lq.lbl, Math.min(rE-tw-4,Math.max(sx+2,(sx+ex)/2-tw/2)), lq.type==="BSL"?y-3:y+10);
      });
      this.smc.structs.forEach(st=>{
        if(st.idx2<sI-10||st.idx1>eI+2) return;
        const x1=xOf(st.idx1), x2=xOf(st.idx2), y=yOf(st.price); if(x1===null||x2===null||y===null) return;
        const sx=Math.max(0,x1), ex=Math.min(rE-2,x2); if(ex<=sx+4) return;
        const col=st.dir===1?"#34d399":"#fb7185"; ctx.strokeStyle=col; ctx.lineWidth=st.kind==="CHoCH"?1.5:1.1; ctx.setLineDash(st.kind==="CHoCH"?[]:[4,3]);
        ctx.beginPath(); ctx.moveTo(sx,y); ctx.lineTo(ex,y); ctx.stroke(); ctx.setLineDash([]);
        ctx.font="bold 8.5px sans-serif"; const tw=ctx.measureText(st.kind).width+6, mx=Math.max(4,Math.min(rE-tw-4,(sx+ex)/2-tw/2));
        ctx.fillStyle="rgba(8,12,22,0.88)"; ctx.fillRect(mx,y-12,tw,11); ctx.fillStyle=col; ctx.fillText(st.kind, mx+3, y-3.5);
      });
      const pL=this.smc.pivots.length;
      this.smc.pivots.forEach((pv,idx)=>{
        if(pv.idx<sI||pv.idx>eI) return; const x=xOf(pv.idx), y=yOf(pv.price); if(x===null||y===null||x<6||x>rE-6) return;
        const isH=pv.type==="H", col=(pv.lbl==="HH"||pv.lbl==="HL")?"#34d399":(pv.lbl==="LH"||pv.lbl==="LL"?"#fb7185":"#94a3b8");
        ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x,y,2.3,0,Math.PI*2); ctx.fill();
        const tx=idx>=pL-4?(pv.lbl+" "+pv.price.toFixed(dec)):pv.lbl; ctx.font="bold 8.5px sans-serif"; const tw=ctx.measureText(tx).width;
        ctx.fillText(tx, Math.max(4,Math.min(rE-tw-4,x-tw/2)), isH?Math.max(12,y-6):Math.min(bE-4,y+12));
      });
    }
    if(this.on.dxy&&this.dxy.pts.length>10){
      const pts=this.dxy.pts, n=Math.min(pts.length,cs.length), ds=pts.slice(-n), mn=Math.min(...ds.map(p=>p.val)), mx=Math.max(...ds.map(p=>p.val)), sp=Math.max(mx-mn,1e-6);
      const tY=bE*0.66, boY=bE-10; ctx.strokeStyle="rgba(251,191,36,0.72)"; ctx.lineWidth=1.3; ctx.beginPath(); let st=false;
      for(let i=0;i<n;i++){ const x=xOf(cs.length-n+i); if(x===null||x<0||x>rE) continue; const y=boY-((ds[i].val-mn)/sp)*(boY-tY); if(!st){ctx.moveTo(x,y);st=true;}else ctx.lineTo(x,y); }
      ctx.stroke();
    }
    if(this.on.ema) [[20,"#38bdf8"],[50,"#f59e0b"],[200,"#a855f7"]].forEach(([per,col])=>{
      const k=2/(per+1); let e=cs[0].close; const arr=[e]; for(let i=1;i<cs.length;i++){ e=cs[i].close*k+e*(1-k); arr.push(e); }
      ctx.strokeStyle=col; ctx.lineWidth=1.3; ctx.beginPath(); let st=false;
      for(let i=sI;i<=eI;i++){ const x=xOf(i), y=yOf(arr[i]); if(x===null||y===null) continue; if(!st){ctx.moveTo(x,y);st=true;}else ctx.lineTo(x,y); }
      ctx.stroke();
    });
    if(this.on.tl&&cs.length>25){
      const base=Math.max(0,eI-45), sl=cs.slice(base,eI+1), hf=Math.floor(sl.length/2); let h1=0,h2=hf,l1=0,l2=hf;
      for(let i=0;i<hf;i++){ if(sl[i].high>sl[h1].high) h1=i; if(sl[i].low<sl[l1].low) l1=i; }
      for(let i=hf;i<sl.length;i++){ if(sl[i].high>sl[h2].high) h2=i; if(sl[i].low<sl[l2].low) l2=i; }
      [[h1,h2,"high","#f43f5e"],[l1,l2,"low","#10b981"]].forEach(([a,b,f,col])=>{ const x1=xOf(base+a),y1=yOf(sl[a][f]),x2=xOf(base+b),y2=yOf(sl[b][f]); if(x1===null||x2===null||y1===null||y2===null) return; ctx.strokeStyle=col; ctx.lineWidth=1.4; ctx.setLineDash([5,4]); ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); ctx.setLineDash([]); });
    }
    if(this.on.atm2&&this.data.st.length===cs.length){
      const st=this.data.st, sigs=this.data.sigs; ctx.lineWidth=1.8;
      for(let i=sI;i<=eI;i++){ if(st[i].t!==st[i-1].t) continue; const x1=xOf(i-1),x2=xOf(i),y1=yOf(st[i-1].v),y2=yOf(st[i].v); if(x1===null||x2===null||y1===null||y2===null) continue; ctx.strokeStyle=st[i].t===1?"#10b981":"#f43f5e"; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
      const lastI=sigs.length-1, pl=[];
      sigs.forEach((s,idx)=>{
        if(s.idx<sI-6||s.idx>eI+2) return; const x0=xOf(s.idx), yE=yOf(s.entry); if(x0===null||yE===null||x0<6||x0>rE-4) return;
        const isW=s.t1H||s.t2H||s.st.includes("GAGNÉ"), xEnd=Math.min(rE-4,Math.max(x0+28,xOf(s.idx+this.cfg.ext)||x0+50));
        ctx.strokeStyle="rgba(148,163,184,0.45)"; ctx.lineWidth=1; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(x0,yE); ctx.lineTo(xEnd,yE); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle=isW?"#facc15":"#94a3b8"; ctx.lineWidth=1.7; ctx.beginPath(); ctx.moveTo(x0-3.5,yE-3.5); ctx.lineTo(x0+3.5,yE+3.5); ctx.moveTo(x0+3.5,yE-3.5); ctx.lineTo(x0-3.5,yE+3.5); ctx.stroke();
        if(idx===lastI) [[s.tp1,"#facc15"],[s.tp2,"#10b981"]].forEach(([lv,col])=>{ const y=yOf(lv); if(y!==null&&y>14&&y<bE-14){ ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(Math.min(rE-4,Math.max(xEnd,x0+60)),y); ctx.stroke(); } });
        const yA=yOf(s.isB?cs[s.idx].low:cs[s.idx].high);
        if(yA!==null){
          const lbl=isW?("✓ "+s.dir+" "+s.entry.toFixed(dec)+" • "+(s.pnl>=0?"+":"")+s.pnl+"p"):((s.isB?"▲ ":"▼ ")+s.dir+" "+s.entry.toFixed(dec));
          ctx.font="bold 9px sans-serif"; const tw=ctx.measureText(lbl).width+12, bh=17, bx=Math.max(6,Math.min(rE-tw-6,x0-tw/2));
          let by=s.isB?Math.min(bE-20,yA+12):Math.max(6,yA-28);
          for(const p of pl) if(Math.abs(bx-p.x)<(tw+p.w)*0.55&&Math.abs(by-p.y)<20) by+=s.isB?19:-19;
          pl.push({x:bx,y:by,w:tw}); ctx.fillStyle=isW?"#facc15":"rgba(44,56,74,0.94)"; ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(bx,by,tw,bh,5); else ctx.rect(bx,by,tw,bh); ctx.fill();
          ctx.fillStyle=isW?"#090d16":"#f1f5f9"; ctx.fillText(lbl, bx+6, by+12);
        }
      });
    }
    if(window.Scanner&&Scanner.lastRes&&!Scanner.scanning&&document.getElementById("scanner-card")?.style.display!=="none"){
      const r=Scanner.lastRes, x1=xOf(r.i1), x2=xOf(r.i2), yT=yOf(r.top), yB=yOf(r.bot);
      if(x1!==null&&x2!==null&&yT!==null&&yB!==null){
        const bx1=Math.max(6,Math.min(x1,x2)-12), bx2=Math.min(rE-6,Math.max(x1,x2)+12), by1=Math.max(16,Math.min(yT,yB)-10), by2=Math.min(bE-6,Math.max(yT,yB)+10);
        const col=r.isR?"#94a3b8":(r.wantB?"#2dd4bf":"#f87171"), cl=10;
        ctx.fillStyle=r.isR?"rgba(148,163,184,0.06)":(r.wantB?"rgba(45,212,191,0.08)":"rgba(248,113,113,0.08)"); ctx.fillRect(bx1,by1,bx2-bx1,by2-by1);
        ctx.strokeStyle="rgba(148,163,184,0.35)"; ctx.lineWidth=1; ctx.setLineDash([3,4]); ctx.beginPath(); ctx.moveTo(x2,by1); ctx.lineTo(x2,bE); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle=col; ctx.lineWidth=1.6; ctx.beginPath();
        ctx.moveTo(bx1,by1+cl); ctx.lineTo(bx1,by1); ctx.lineTo(bx1+cl,by1); ctx.moveTo(bx2-cl,by1); ctx.lineTo(bx2,by1); ctx.lineTo(bx2,by1+cl);
        ctx.moveTo(bx1,by2-cl); ctx.lineTo(bx1,by2); ctx.lineTo(bx1+cl,by2); ctx.moveTo(bx2-cl,by2); ctx.lineTo(bx2,by2); ctx.lineTo(bx2,by2-cl); ctx.stroke();
        ctx.font="bold 8.5px sans-serif"; ctx.fillStyle=col; ctx.fillText(String(r.pat||"").toUpperCase(), bx1, Math.max(10,by1-4));
      }
    }
    if(window.Scanner&&Scanner.sim.pos&&Scanner.sim.pos.sym===App.sym){
      const pos=Scanner.sim.pos, yE=yOf(pos.pe);
      if(yE!==null&&yE>18&&yE<bE-10){
        const pnl=Scanner.pnlOf(pos,cs[cs.length-1].close), col=pnl>=0?"#10b981":"#f43f5e";
        ctx.strokeStyle=col; ctx.lineWidth=1.3; ctx.setLineDash([5,3]); ctx.beginPath(); ctx.moveTo(8,yE); ctx.lineTo(rE-4,yE); ctx.stroke(); ctx.setLineDash([]);
        const tag=(pos.isB?"BUY ":"SELL ")+pos.lot+"L | "+(pnl>=0?"+$":"-$")+Math.abs(pnl).toFixed(2);
        ctx.font="bold 9px monospace"; const bw=ctx.measureText(tag).width+10, bx=Math.max(6,rE-bw-6);
        ctx.fillStyle="rgba(8,12,22,0.92)"; ctx.strokeStyle=col; ctx.lineWidth=1; ctx.fillRect(bx,yE-16,bw,15); ctx.strokeRect(bx,yE-16,bw,15);
        ctx.fillStyle=pnl>=0?"#34d399":"#fda4af"; ctx.fillText(tag, bx+5, yE-5);
      }
    }
    ctx.restore();
  }
};

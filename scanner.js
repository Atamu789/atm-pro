window.Scanner = {
  sim:{ bal:10000, lot:0.50, auto:false, w:0, l:0, pos:null },
  lastRes:null, scanning:false, scans:0,

  fmtCd(rem){
    const r=Math.max(0,Math.floor(rem));
    if(r>=86400) return Math.floor(r/86400)+"j "+String(Math.floor((r%86400)/3600)).padStart(2,"0")+"h";
    if(r>=3600) return String(Math.floor(r/3600)).padStart(2,"0")+":"+String(Math.floor((r%3600)/60)).padStart(2,"0")+":"+String(r%60).padStart(2,"0");
    return String(Math.floor(r/60)).padStart(2,"0")+":"+String(r%60).padStart(2,"0");
  },
  tickTimers(){
    const now=Math.floor(Date.now()/1000);
    [["1m",60],["5m",300],["15m",900],["1h",3600]].forEach(([k,s])=>{
      const el=now%s, rem=s-el, tr=App.htf[k]||0, ch=document.getElementById("ch-"+k); if(!ch) return;
      document.getElementById("cd-"+k).textContent=this.fmtCd(rem);
      document.getElementById("pr-"+k).style.width=((el/s)*100).toFixed(1)+"%";
      document.getElementById("dir-"+k).textContent=tr===1?"▲":(tr===-1?"▼":"•");
      ch.classList.toggle("bull",tr===1); ch.classList.toggle("bear",tr===-1);
      ch.classList.toggle("act",App.tf===k); ch.classList.toggle("urg",k==="1m"&&rem<=10);
    });
    const sp=App.spec||App.parseTF(App.tf), tx=sp.kind==="tick"?(App.tickCnt+"/"+sp.tickSize+"T"):this.fmtCd(sp.sec-(now%sp.sec));
    const mt=document.getElementById("main-timer"), st=document.getElementById("sc-tm");
    if(mt) mt.textContent=tx; if(st) st.textContent=tx;
  },
  ema(v,p){ const k=2/(p+1), o=[v[0]]; for(let i=1;i<v.length;i++) o.push(v[i]*k+o[i-1]*(1-k)); return o; },
  rsi14(c){
    if(c.length<16) return 50; let g=0, l=0; for(let i=1;i<=14;i++){ const d=c[i]-c[i-1]; if(d>=0) g+=d; else l-=d; }
    let ag=g/14, al=l/14; for(let i=15;i<c.length;i++){ const d=c[i]-c[i-1]; ag=(ag*13+(d>0?d:0))/14; al=(al*13+(d<0?-d:0))/14; }
    return al===0?100:+(100-100/(1+ag/al)).toFixed(1);
  },
  adx14(kl){
    if(kl.length<28) return 22; let trS=0, pS=0, mS=0; const dx=[];
    for(let i=1;i<kl.length;i++){
      const h=kl[i].high, l=kl[i].low, ph=kl[i-1].high, pl=kl[i-1].low, pc=kl[i-1].close;
      const tr=Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)), u=h-ph, d=pl-l, pD=u>d&&u>0?u:0, mD=d>u&&d>0?d:0;
      if(i<=14){ trS+=tr; pS+=pD; mS+=mD; } else { trS=trS-trS/14+tr; pS=pS-pS/14+pD; mS=mS-mS/14+mD; }
      if(i>=14&&trS>0){ const pI=100*pS/trS, mI=100*mS/trS; dx.push(pI+mI>0?100*Math.abs(pI-mI)/(pI+mI):0); }
    }
    const last=dx.slice(-14); return last.length?+(last.reduce((a,b)=>a+b,0)/last.length).toFixed(1):20;
  },
  detectPattern(cs,atr,wantB){
    const len=cs.length, c0=cs[len-1], c1=cs[len-2], c2=cs[len-3];
    const b1=Math.abs(c1.close-c1.open), r1=Math.max(c1.high-c1.low,1e-6), b2=Math.abs(c2.close-c2.open);
    const uw=c1.high-Math.max(c1.open,c1.close), dw=Math.min(c1.open,c1.close)-c1.low;
    let pat=wantB?"Trend ↑":"Trend ↓", i1=len-4, i2=len-1;
    if((c1.close>c1.open&&c2.close<c2.open&&b1>=b2*0.95)||(c1.close<c1.open&&c2.close>c2.open&&b1>=b2*0.95)){ pat="Engulfing"; i1=len-3; i2=len-2; }
    else if((dw>b1*1.15&&dw>r1*0.36)||(uw>b1*1.15&&uw>r1*0.36)){ pat="Pin Bar"; i1=len-2; i2=len-1; }
    else if(c1.high<=c2.high&&c1.low>=c2.low){ pat="Inside Bar"; i1=len-3; i2=len-1; }
    else if(b1<r1*0.14&&r1<atr*0.6){ pat="Doji"; i1=len-2; i2=len-1; }
    else if(r1<atr*0.30&&Math.abs(c0.close-c0.open)<atr*0.25){ pat="No pattern"; i1=len-3; i2=len-1; }
    let top=-Infinity, bot=Infinity;
    for(let i=Math.max(0,i1);i<=Math.min(len-1,i2);i++){ if(cs[i].high>top) top=cs[i].high; if(cs[i].low<bot) bot=cs[i].low; }
    return { pat, i1, i2, top, bot };
  },

  async manualScan(){
    if(this.scanning) return; this.scanning=true; this.scans++;
    const card=document.getElementById("scanner-card"), btn=document.getElementById("sc-refresh-btn");
    if(card) card.classList.add("scanning"); if(btn) btn.textContent="SCANNING";
    document.getElementById("sc-score-wrap").style.display="none";
    document.getElementById("sc-dir").textContent="SCANNING";
    document.getElementById("sc-qual").textContent="-";
    document.getElementById("sc-pat").textContent="-";
    document.getElementById("sc-bars").className="sc-bars";
    if(window.Ind) Ind.draw();
    await Promise.all([this.refresh(), new Promise(r=>setTimeout(r,900))]);
    this.scanning=false; if(card) card.classList.remove("scanning"); if(btn) btn.textContent="SCAN";
    document.getElementById("sc-score-wrap").style.display="block";
    if(window.Ind){ Ind.compute(); Ind.draw(); }
    this.run();
  },
  async refresh(){
    const bin=App.getBin(), off=App.getOff();
    await Promise.all(["1m","5m","15m","1h","4h"].map(async tf=>{
      const raw=await App.fetchBin("/api/v3/klines?symbol="+bin+"&interval="+tf+"&limit=80"); if(raw.length<30) return;
      const cl=raw.map(k=>+k[4]+off), e20=this.ema(cl,20), e50=this.ema(cl,50), li=cl.length-1, r=this.rsi14(cl);
      App.htf[tf]=((e20[li]>e50[li]?2:-2)+(cl[li]>e20[li]?1:-1)+(e20[li]>e20[li-3]?1:-1)+(r>51?1:(r<49?-1:0)))>=0?1:-1;
    }));
    if(window.Ind) await Ind.refreshDXY();
    this.tickTimers(); if(!this.scanning) this.run();
    if(document.getElementById("atm2-panel").style.display==="block") Ind.renderPanel();
  },

  run(){
    if(this.scanning) return; const cs=App.candles; if(cs.length<35) return;
    const len=cs.length, cl=cs.map(c=>c.close), pr=cl[len-1], dec=pr>100?2:4;
    const e20=this.ema(cl,20), e50=this.ema(cl,50), rsi=this.rsi14(cl), adx=this.adx14(cs.slice(-55));
    const mL=this.ema(cl,12).map((v,i)=>v-this.ema(cl,26)[i]), mS=this.ema(mL,9), mH=mL[len-1]-mS[len-1], mHp=mL[len-2]-mS[len-2];
    let trS=0; for(let i=len-14;i<len;i++) trS+=Math.max(cs[i].high-cs[i].low,Math.abs(cs[i].high-cs[i-1].close),Math.abs(cs[i].low-cs[i-1].close));
    const atr=Math.max(trS/14,pr*0.0003);

    const t1=App.htf["1m"]||(e20[len-1]>=e50[len-1]?1:-1), t5=App.htf["5m"]||t1, t15=App.htf["15m"]||t5, t1h=App.htf["1h"]||t15, t4h=App.htf["4h"]||t1h;
    const bC=[t1,t5,t15,t1h].filter(v=>v===1).length, hB=t1h===1&&t15===1, hS=t1h===-1&&t15===-1;
    const wantB=hB?true:(hS?false:bC>=2), al4=wantB?bC:(4-bC), pt=this.detectPattern(cs,atr,wantB);
    const smc=window.Ind?Ind.smc:{bias:0,obs:[],fvgs:[]}, sdZ=window.Ind?Ind.sd.zones:[], dxy=window.Ind?Ind.dxy:{dir:0,corr:0,inverseOk:false};
    const inD=sdZ.some(z=>z.type==="DEMAND"&&pr>=z.bot-atr*0.4&&pr<=z.top+atr*0.5), inS=sdZ.some(z=>z.type==="SUPPLY"&&pr>=z.bot-atr*0.5&&pr<=z.top+atr*0.4);

    const chips=[], risks=[]; let sc=0;
    if(al4===4){ sc+=25; chips.push({t:"✓ 4/4 TF",ok:true}); } else if(al4===3&&(wantB?hB:hS)){ sc+=19; chips.push({t:"✓ 3/4 + HTF",ok:true}); } else { sc+=6; risks.push("CONFLIT HTF/LTF"); chips.push({t:"⚠ Conflit TF",w:true}); }
    if((wantB&&smc.bias===1)||(!wantB&&smc.bias===-1)){ sc+=14; chips.push({t:"✓ BOS "+(wantB?"▲":"▼"),ok:true}); }
    if(smc.obs.some(o=>pr>=o.bot-atr*0.5&&pr<=o.top+atr*0.5&&((wantB&&o.dir===1)||(!wantB&&o.dir===-1)))){ sc+=8; chips.push({t:wantB?"✓ OB+":"✓ OB-",ok:true}); }
    if((wantB&&inD)||(!wantB&&inS)){ sc+=10; chips.push({t:wantB?"✓ Demand":"✓ Supply",ok:true}); }
    if((wantB&&inS)||(!wantB&&inD)){ risks.push(wantB?"MUR SUPPLY":"MUR DEMAND"); chips.push({t:"⚠ Mur S&D",w:true}); }
    const dHelp=(wantB&&dxy.dir===-1)||(!wantB&&dxy.dir===1), dOpp=(wantB&&dxy.dir===1&&dxy.inverseOk)||(!wantB&&dxy.dir===-1&&dxy.inverseOk);
    if(dHelp){ sc+=10; chips.push({t:"✓ DXY "+(dxy.dir<0?"▼":"▲"),ok:true}); } else if(dOpp){ risks.push("DXY OPPOSE LE SIGNAL"); chips.push({t:"⚠ DXY Opposé",w:true}); }
    if(adx>=20){ sc+=12; chips.push({t:"✓ ADX "+adx,ok:true}); } else if(adx>=16) sc+=7; else { risks.push("RANGE ADX "+adx); chips.push({t:"⚠ Range "+adx,w:true}); }
    const rR=(wantB&&rsi>=73)||(!wantB&&rsi<=27), rO=(wantB&&rsi>=48&&rsi<=68)||(!wantB&&rsi<=52&&rsi>=32);
    if(rR){ risks.push("RSI EXTRÊME ("+rsi+")"); chips.push({t:"⚠ RSI "+rsi,w:true}); } else if(rO){ sc+=11; chips.push({t:"✓ RSI "+rsi,ok:true}); } else sc+=5;
    if(wantB?(mH>0&&mH>=mHp):(mH<0&&mH<=mHp)){ sc+=8; chips.push({t:"✓ MACD",ok:true}); }
    if((wantB&&t4h===1)||(!wantB&&t4h===-1)) sc+=5;
    if(pt.pat==="No pattern"||pt.pat==="Doji"){ risks.push("PAS DE PATTERN CLAIR"); sc=Math.min(sc,35); }
    sc=Math.min(99,sc);

    const isR=risks.length>0||sc<70||al4<3, qual=isR?"LOW":(sc>=82?"HIGH":"MEDIUM"), rD=Math.max(atr*1.35,pr*0.0004), rr=sc>=84?2.5:2.1;
    const pe=+pr.toFixed(dec), sl=+(wantB?pr-rD:pr+rD).toFixed(dec), tp=+(wantB?pr+rD*rr:pr-rD*rr).toFixed(dec);
    this.lastRes={ isR, wantB, sc, pe, sl, tp, ...pt };

    document.getElementById("sc-pair").textContent=App.disp;
    document.getElementById("sc-pct").textContent=Math.max(50,Math.round(al4/4*100))+"%";
    document.getElementById("sc-cnt").textContent="• "+this.scans+" SCANS";
    document.getElementById("sc-score").textContent=(isR&&pt.pat==="No pattern")?0:sc;
    const dE=document.getElementById("sc-dir"); dE.textContent=isR?"WAIT":(wantB?"BUY":"SELL"); dE.style.color=isR?"#fde047":(wantB?"#34d399":"#fb7185");
    document.getElementById("sc-fill").style.width=Math.max(4,sc)+"%";
    const qE=document.getElementById("sc-qual"); qE.textContent=qual; qE.style.color=qual==="HIGH"?"#34d399":(qual==="MEDIUM"?"#facc15":"#f87171");
    document.getElementById("sc-bars").className="sc-bars "+(qual==="HIGH"?"lv3":(qual==="MEDIUM"?"lv2":"lv1"));
    document.getElementById("sc-pat").textContent=pt.pat;
    const bn=document.getElementById("sc-banner"); bn.textContent=isR?("🛑 WAIT — "+(risks[0]||"CONFLUENCES FAIBLES")):("🎯 "+(wantB?"BUY":"SELL")+" VALIDÉ • R:R 1:"+rr); bn.style.color=isR?"#fde047":(wantB?"#5eead4":"#fda4af");

    [["sp-1m","M1",t1],["sp-5m","M5",t5],["sp-15m","M15",t15],["sp-1h","H1",t1h]].forEach(([id,l,t])=>{ const e=document.getElementById(id); e.textContent=l+" "+(t===1?"▲":"▼"); e.className=t===1?"bull":"bear"; });
    document.getElementById("sm-rsi").textContent=rsi; document.getElementById("sm-adx").textContent=adx;
    document.getElementById("sm-smc").textContent=inD?"DEM":(inS?"SUP":(smc.bias===1?"BOS▲":(smc.bias===-1?"BOS▼":"--")));
    document.getElementById("sm-dxy").textContent=(dxy.dir>0?"▲":(dxy.dir<0?"▼":"•"))+" "+dxy.corr+"%";
    document.getElementById("sc-chips").innerHTML=chips.slice(0,6).map(x=>'<span class="sc-ch '+(x.ok?'ok':(x.w?'w':''))+'">'+x.t+'</span>').join("");
    document.getElementById("sl-pe").textContent=isR?"WAIT":pe.toFixed(dec); document.getElementById("sl-sl").textContent=isR?"---":sl.toFixed(dec); document.getElementById("sl-tp").textContent=isR?"---":tp.toFixed(dec);
    if(this.sim.auto&&!this.sim.pos&&!isR) this.execSim();
    this.tickSim(); if(window.Ind) Ind.draw();
  },

  pnlOf(pos,pr){ const m=pos.sym.startsWith("BTC")?1:100; return +((pr-pos.pe)*(pos.isB?1:-1)*m*pos.lot).toFixed(2); },
  tickSim(){
    const cs=App.candles; if(!cs.length) return;
    const c=cs[cs.length-1], pr=c.close, s=this.sim, pos=s.pos;
    if(pos&&pos.sym===App.sym){
      const hT=pos.isB?c.high>=pos.tp:c.low<=pos.tp, hS=pos.isB?c.low<=pos.sl:c.high>=pos.sl;
      if(hT||hS){ const r=this.pnlOf(pos,hT?pos.tp:pos.sl); s.bal=+(s.bal+r).toFixed(2); if(r>=0) s.w++; else s.l++; s.pos=null; Ind.draw(); }
    }
    document.getElementById("sc-wins").textContent=s.w; document.getElementById("sc-loss").textContent=s.l;
    const wr=s.w+s.l?Math.round(s.w/(s.w+s.l)*100):100, pnl=(s.pos&&s.pos.sym===App.sym)?this.pnlOf(s.pos,pr):0, eq=+(s.bal+pnl).toFixed(2);
    document.getElementById("sim-eq").textContent="$"+eq.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
    const pE=document.getElementById("sim-pnl"); pE.textContent=(pnl>=0?"+$":"-$")+Math.abs(pnl).toFixed(2); pE.style.color=pnl>0?"#34d399":(pnl<0?"#fb7185":"#94a3b8");
    document.getElementById("sim-st").textContent=pnl<0?"DRAWDOWN":(pnl>0?"PROFIT LIVE":"PNL LIVE");
    document.getElementById("sim-info").textContent=s.pos?((s.pos.isB?"BUY ":"SELL ")+s.pos.lot+"L @ "+s.pos.pe+" ("+wr+"% WR)"):(wr+"% WR • Prêt ("+s.lot+"L)");
    document.getElementById("sim-auto").textContent=s.auto?"🤖 AUTO: ON":"🤖 AUTO: OFF";
    document.getElementById("sim-exec").textContent=s.pos?"✕ CLÔTURER":"⚡ TESTER";
  },
  toggleAuto(){ this.sim.auto=!this.sim.auto; this.tickSim(); },
  execSim(){
    if(!App.candles.length) return; const pr=App.candles[App.candles.length-1].close;
    if(this.sim.pos){ const r=this.pnlOf(this.sim.pos,pr); this.sim.bal=+(this.sim.bal+r).toFixed(2); if(r>=0) this.sim.w++; else this.sim.l++; this.sim.pos=null; this.tickSim(); Ind.draw(); return; }
    const lr=this.lastRes||{wantB:true,pe:pr,sl:pr-3,tp:pr+6};
    this.sim.pos={ sym:App.sym, isB:lr.wantB, pe:lr.pe, sl:lr.sl, tp:lr.tp, lot:this.sim.lot };
    this.tickSim(); Ind.draw();
  },
  resetSim(){ this.sim={bal:10000,lot:0.50,auto:false,w:0,l:0,pos:null}; this.tickSim(); Ind.draw(); },
  toggleRisk(){ const b=document.getElementById("sc-risk-body"), a=document.getElementById("sc-risk-arr"), op=b.style.display==="none"; b.style.display=op?"block":"none"; a.textContent=op?"⌃":"⌄"; },
  toggle(){
    const c=document.getElementById("scanner-card"); if(!c) return;
    const show=(getComputedStyle(c).display==="none"); c.style.display=show?"block":"none";
    document.getElementById("bb-scan-btn")?.classList.toggle("active",show);
    document.getElementById("qp-scan")?.classList.toggle("on",show);
    if(show) this.manualScan(); else if(window.Ind) Ind.draw();
  },
  mini(){ document.getElementById("scanner-card")?.classList.toggle("mini"); },
  initDrag(){
    const card=document.getElementById("scanner-card"); if(!card) return;
    let drag=false, sx=0, sy=0, ox=10, oy=76;
    card.addEventListener("touchstart", e=>{ if(e.target.closest("button")||e.target.closest("input")||e.target.closest(".sc-risk-hdr")) return; drag=true; sx=e.touches[0].clientX; sy=e.touches[0].clientY; const r=card.getBoundingClientRect(); ox=r.left; oy=r.top; }, {passive:true});
    window.addEventListener("touchmove", e=>{ if(!drag) return; if(e.cancelable) e.preventDefault(); card.style.left=Math.max(-40,Math.min(window.innerWidth-70,ox+e.touches[0].clientX-sx))+"px"; card.style.top=Math.max(58,Math.min(window.innerHeight-64,oy+e.touches[0].clientY-sy))+"px"; }, {passive:false});
    window.addEventListener("touchend", ()=>{ drag=false; });
  }
};

(function boot(){
  const off=parseFloat(localStorage.getItem("atm_clean_off")); if(isFinite(off)) App.offset=off;
  try{ const f=JSON.parse(localStorage.getItem("atm_clean_fav")||"null"); if(Array.isArray(f)&&f.length) App.favs=f; }catch(e){}
  App.initChart(); App.startLoop(); if(window.ThemeFX) ThemeFX.start();
  Scanner.initDrag(); Ind.syncBtns();
  setInterval(()=>Scanner.tickTimers(), 250);
  setInterval(()=>Scanner.refresh(), 12000);
  Scanner.tickTimers(); App.load(); Scanner.refresh();
})();

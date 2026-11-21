window.App = {
  sym:"XAUUSD_VT", disp:"XAUUSD·VT", tf:"1m", offset:7.24,
  candles:[], htf:{}, chart:null, series:null, ws:null, wsKey:"", spec:null, targetP:null, dispP:null, tickCnt:0,
  pairs:[
    { sym:"XAUUSD_VT",  disp:"XAUUSD·VT",  bin:"PAXGUSDT", cat:"metals", ico:"Au", bg:"#d97706", name:"XAUUSD (VT)", brk:"VT / Vantage", sub:"Commodity CFD" },
    { sym:"XAUUSD_CFD", disp:"XAUUSD·CFD", bin:"PAXGUSDT", cat:"metals", ico:"Au", bg:"#f59e0b", name:"XAUUSD (CFD)", brk:"OANDA / TVC", sub:"Spot CFD" },
    { sym:"XAUUSD_FUT", disp:"XAUUSD·FUT", bin:"PAXGUSDT", cat:"metals futures", ico:"FUT", bg:"#7c3aed", name:"XAUUSD (FUT)", brk:"Binance/CME", sub:"Futures" },
    { sym:"BTCUSD",     disp:"BTCUSD",     bin:"BTCUSDT",  cat:"crypto", ico:"₿", bg:"#ea580c", name:"BTCUSD", brk:"Spot Direct", sub:"Crypto" },
    { sym:"BTCUSDT",    disp:"BTC·FUT",    bin:"BTCUSDT",  cat:"crypto futures", ico:"₿", bg:"#6366f1", name:"BTCUSD (FUT)", brk:"Binance", sub:"Perpetual" },
    { sym:"ETHUSDT",    disp:"ETHUSD",     bin:"ETHUSDT",  cat:"crypto", ico:"Ξ", bg:"#4f46e5", name:"ETHUSD", brk:"Binance Spot", sub:"Crypto" },
    { sym:"SOLUSDT",    disp:"SOLUSD",     bin:"SOLUSDT",  cat:"crypto", ico:"◎", bg:"#0d9488", name:"SOLUSD", brk:"Binance Spot", sub:"Crypto" },
    { sym:"XRPUSDT",    disp:"XRPUSD",     bin:"XRPUSDT",  cat:"crypto", ico:"✕", bg:"#0284c7", name:"XRPUSD", brk:"Binance Spot", sub:"Crypto" },
    { sym:"BNBUSDT",    disp:"BNBUSD",     bin:"BNBUSDT",  cat:"crypto", ico:"B", bg:"#ca8a04", name:"BNBUSD", brk:"Binance Spot", sub:"Crypto" }
  ],
  favs:["5m","1h","4h"], cat:"all",
  getBin(){ return (this.pairs.find(p => p.sym === this.sym) || this.pairs[0]).bin; },
  getOff(){ return (this.sym === "XAUUSD_VT" || this.sym === "XAUUSD_CFD") ? this.offset : 0; },

  parseTF(raw){
    const N = new Set(["1s","1m","3m","5m","15m","30m","1h","2h","4h","6h","8h","12h","1d","3d","1w","1M"]);
    const tf = String(raw || "1m").trim();
    const mT = tf.match(/^(\d+)\s*[tT]$/); if (mT){ const n=Math.max(1,Math.min(10000,+mT[1])); return { kind:"tick", code:n+"T", lbl:n+"T", tickSize:n, sec:1 }; }
    if (tf === "1M") return { kind:"native", code:"1M", lbl:"1M", rest:"1M", ws:"1M", sec:2592000 };
    if (tf === "1w" || tf === "1S") return { kind:"native", code:"1w", lbl:"1S", rest:"1w", ws:"1w", sec:604800 };
    const mD = tf.match(/^(\d+)\s*[dDjJ]$/); if (mD){ const n=Math.max(1,+mD[1]), c=n+"d"; return N.has(c)?{kind:"native",code:c,lbl:n+"J",rest:c,ws:c,sec:n*86400}:{kind:"agg",code:c,lbl:n+"J",base:"1d",ws:"1d",sec:n*86400}; }
    const mS = tf.match(/^(\d+)\s*s$/); if (mS){ const n=Math.max(1,Math.min(3600,+mS[1])), c=n+"s"; return n===1?{kind:"native",code:"1s",lbl:"1s",rest:"1s",ws:"1s",sec:1}:{kind:"agg",code:c,lbl:c,base:"1s",ws:"1s",sec:n}; }
    const mH = tf.match(/^(\d+)\s*[hH]$/); if (mH){ const n=Math.max(1,+mH[1]), c=n+"h"; return N.has(c)?{kind:"native",code:c,lbl:c,rest:c,ws:c,sec:n*3600}:{kind:"agg",code:c,lbl:c,base:"1h",ws:"1h",sec:n*3600}; }
    const mM = tf.match(/^(\d+)\s*m?$/); if (mM){ const n=Math.max(1,+mM[1]), c=n+"m"; return N.has(c)?{kind:"native",code:c,lbl:c,rest:c,ws:c,sec:n*60}:{kind:"agg",code:c,lbl:c,base:(n%15===0?"15m":(n%5===0?"5m":"1m")),ws:"1m",sec:n*60}; }
    return { kind:"native", code:"1m", lbl:"1m", rest:"1m", ws:"1m", sec:60 };
  },

  async fetchBin(path){
    for (const h of ["https://data-api.binance.vision","https://api.binance.com","https://api1.binance.com"]) {
      try { const r = await fetch(h + path); if (r.ok){ const j = await r.json(); if (Array.isArray(j) && j.length) return j; } } catch(e){}
    }
    return [];
  },

  initChart(){
    const el = document.getElementById("chart");
    this.chart = LightweightCharts.createChart(el, {
      width:el.clientWidth, height:el.clientHeight,
      layout:{ background:{ type:"solid", color:"transparent" }, textColor:"#94a3b8", fontSize:11 },
      grid:{ vertLines:{ color:"rgba(255,255,255,0.035)" }, horzLines:{ color:"rgba(255,255,255,0.035)" } },
      crosshair:{ mode:LightweightCharts.CrosshairMode.Normal },
      rightPriceScale:{ borderColor:"rgba(255,255,255,0.08)", scaleMargins:{ top:0.12, bottom:0.12 } },
      timeScale:{ borderColor:"rgba(255,255,255,0.08)", timeVisible:true, secondsVisible:false, rightOffset:6 }
    });
    this.series = this.chart.addCandlestickSeries({ upColor:"#10b981", downColor:"#f43f5e", borderVisible:false, wickUpColor:"#10b981", wickDownColor:"#f43f5e" });
    const rs = () => {
      const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
      this.chart.applyOptions({ width:w, height:h });
      const cv = document.getElementById("overlay-canvas"), dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = w * dpr; cv.height = h * dpr; cv.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
      if (window.Ind) Ind.draw();
    };
    window.addEventListener("resize", rs);
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(rs).observe(document.getElementById("chart-wrap"));
    this.chart.timeScale().subscribeVisibleLogicalRangeChange(() => { if (window.Ind) Ind.draw(); });
    rs();
  },

  closeWs(){ if (this.ws){ try{ this.ws.onclose=null; this.ws.onmessage=null; this.ws.close(); }catch(e){} this.ws=null; } if (this.wsTimer){ clearTimeout(this.wsTimer); this.wsTimer=null; } },
  updateHud(c){ if (!c) return; const d=c.close>100?2:4, e=document.getElementById("hud-ohlc"); if(e) e.textContent="O "+c.open.toFixed(d)+" H "+c.high.toFixed(d)+" L "+c.low.toFixed(d)+" C "+c.close.toFixed(d); },

  async load(){
    this.closeWs(); this.targetP=null; this.dispP=null;
    const sp=this.parseTF(this.tf), bin=this.getBin(), off=this.getOff(), isG=bin==="PAXGUSDT"; this.spec=sp;
    document.getElementById("hud-title").textContent=this.disp;
    document.getElementById("hud-tf-badge").textContent=sp.lbl;
    document.getElementById("bb-pair").textContent=this.disp;
    document.getElementById("bb-tf").textContent=sp.lbl;
    document.getElementById("wm-pair").textContent=this.disp;
    document.getElementById("wm-tf").textContent=sp.lbl;
    let list=[];
    if (sp.kind==="tick"){
      const tr=await this.fetchBin("/api/v3/aggTrades?symbol="+bin+"&limit=1000"), dec=(isG||(tr.length&&+tr[0].p+off>100))?2:4;
      let lt=0;
      for (let i=0;i<tr.length;i+=sp.tickSize){
        const ch=tr.slice(i,i+sp.tickSize), ps=ch.map(x=>+x.p+off); let t=Math.floor(+ch[ch.length-1].T/1000); if(t<=lt) t=lt+1; lt=t;
        list.push({ time:t, open:+ps[0].toFixed(dec), high:+Math.max(...ps).toFixed(dec), low:+Math.min(...ps).toFixed(dec), close:+ps[ps.length-1].toFixed(dec), _tc:ch.length });
      }
      this.tickCnt=list.length?list[list.length-1]._tc:0;
    } else {
      const iv=sp.kind==="native"?sp.rest:sp.base, lim=sp.code==="1M"?120:(sp.code==="1w"?200:(sp.kind==="agg"?1000:350));
      const raw=await this.fetchBin("/api/v3/klines?symbol="+bin+"&interval="+iv+"&limit="+lim), dec=(isG||(raw.length&&+raw[0][4]>100))?2:4;
      const base=raw.map(k=>({ time:Math.floor(+k[0]/1000), open:+(+k[1]+off).toFixed(dec), high:+(+k[2]+off).toFixed(dec), low:+(+k[3]+off).toFixed(dec), close:+(+k[4]+off).toFixed(dec) }));
      if (sp.kind==="native") list=base;
      else { let cur=null; for(const c of base){ const bt=Math.floor(c.time/sp.sec)*sp.sec; if(!cur||cur.time!==bt){ if(cur) list.push(cur); cur={time:bt,open:c.open,high:c.high,low:c.low,close:c.close}; } else { if(c.high>cur.high) cur.high=c.high; if(c.low<cur.low) cur.low=c.low; cur.close=c.close; } } if(cur) list.push(cur); }
    }
    if (list.length){
      this.candles=list; this.series.setData(list); this.updateHud(list[list.length-1]);
      this.chart.timeScale().setVisibleLogicalRange({ from:Math.max(0,list.length-85), to:list.length+6 });
      if (window.Ind){ Ind.compute(); Ind.draw(); }
      if (window.Scanner) Scanner.run();
    }
    this.startWS();
  },

  pushPrice(price, barT, isTrade){
    if (!this.candles.length||!isFinite(price)||!this.spec) return;
    const sp=this.spec, dec=price>100?2:4, p=+price.toFixed(dec), last=this.candles[this.candles.length-1];
    if (sp.kind==="tick"){
      if (isTrade && ++this.tickCnt>sp.tickSize){ this.tickCnt=1; const nb={time:Math.max(Math.floor(Date.now()/1000),last.time+1),open:p,high:p,low:p,close:p}; this.candles.push(nb); if(this.candles.length>420) this.candles.shift(); this.targetP=p; this.dispP=p; this.series.update(nb); this.updateHud(nb); return; }
      this.targetP=p; if(this.dispP===null) this.dispP=last.close; return;
    }
    if (sp.sec<86400){
      const now=Math.floor(Date.now()/1000), b=barT?(sp.kind==="native"?barT:Math.floor(barT/sp.sec)*sp.sec):(Math.floor(now/sp.sec)*sp.sec);
      if (b>last.time){ const nb={time:b,open:p,high:p,low:p,close:p}; this.candles.push(nb); if(this.candles.length>520) this.candles.shift(); this.targetP=p; this.dispP=p; this.series.update(nb); this.updateHud(nb); if(window.Ind){Ind.compute();Ind.draw();} if(window.Scanner) Scanner.run(); return; }
    }
    this.targetP=p; if(this.dispP===null) this.dispP=last.close;
  },

  startWS(){
    this.closeWs();
    const bin=this.getBin().toLowerCase(), sp=this.spec, key=this.sym+"_"+sp.code+"_"+Date.now(); this.wsKey=key;
    const st=[bin+"@bookTicker", bin+"@aggTrade"]; if(sp.kind!=="tick"&&sp.ws) st.push(bin+"@kline_"+sp.ws);
    const ws=new WebSocket("wss://stream.binance.com:9443/stream?streams="+st.join("/")); this.ws=ws;
    ws.onmessage=(e)=>{
      if(this.wsKey!==key||!this.candles.length) return;
      try {
        const d=(JSON.parse(e.data).data)||{}, off=this.getOff();
        if(d.b&&d.a&&!d.k&&!d.p){ this.pushPrice((+d.b + +d.a)/2 + off, null, false); return; }
        if(d.e==="aggTrade"&&d.p){ this.pushPrice(+d.p + off, null, true); return; }
        if(d.e==="kline"&&d.k){
          const k=d.k, bt=Math.floor(+k.t/1000), c=+k.c+off, h=+k.h+off, l=+k.l+off, dec=c>100?2:4, last=this.candles[this.candles.length-1], b=sp.kind==="native"?bt:Math.floor(bt/sp.sec)*sp.sec;
          if(b===last.time){ if(h>last.high) last.high=+h.toFixed(dec); if(l<last.low) last.low=+l.toFixed(dec); }
          this.pushPrice(c, b, false);
        }
      } catch(err){}
    };
    ws.onclose=()=>{ if(this.wsKey===key) this.wsTimer=setTimeout(()=>{ if(this.wsKey===key) this.startWS(); }, 2000); };
  },

  startLoop(){
    let lastOv=0;
    const loop=(ts)=>{
      requestAnimationFrame(loop);
      if(!this.candles.length||this.targetP===null) return;
      const last=this.candles[this.candles.length-1], dec=last.close>100?2:4, eps=dec===2?0.01:0.0001;
      if(this.dispP===null) this.dispP=last.close;
      const diff=this.targetP-this.dispP;
      if(Math.abs(diff)>=eps*0.5){
        this.dispP=Math.abs(diff)<=eps*1.5?this.targetP:this.dispP+diff*0.34;
        const v=+this.dispP.toFixed(dec);
        if(v!==last.close){ last.close=v; if(v>last.high) last.high=v; if(v<last.low) last.low=v; this.series.update(last); this.updateHud(last); if(window.Scanner) Scanner.tickSim(); if(ts-lastOv>140){ lastOv=ts; if(window.Ind) Ind.draw(); } }
      }
    };
    requestAnimationFrame(loop);
  },

  openModal(id){ this.closeModals(); if(id==="pair-modal"){ document.getElementById("off-lbl").textContent=(this.offset>=0?"+":"")+this.offset.toFixed(2); this.renderPairs(); } if(id==="tf-modal") this.renderTFs(); document.getElementById(id).style.display="flex"; },
  closeModals(){ document.querySelectorAll(".m-back").forEach(m=>m.style.display="none"); },
  setPair(sym){ const p=this.pairs.find(x=>x.sym===sym); if(!p) return; this.sym=p.sym; this.disp=p.disp; this.closeModals(); this.load(); if(window.Scanner) Scanner.refresh(); },
  setTF(tf){ this.tf=this.parseTF(tf).code; this.closeModals(); this.load(); },
  setCat(c,btn){ this.cat=c; document.querySelectorAll(".m-tab").forEach(b=>b.classList.remove("on")); btn.classList.add("on"); this.filterPairs(); },
  renderPairs(){
    document.getElementById("pair-list").innerHTML=this.pairs.map(p=>'<div class="p-card" data-cat="'+p.cat+'" data-q="'+(p.sym+p.name+p.brk).toLowerCase()+'" onclick="App.setPair(\''+p.sym+'\')"><div class="p-l"><div class="p-ico" style="background:'+p.bg+'">'+p.ico+'</div><div><b>'+p.name+'</b><small>'+p.sub+'</small></div></div><div class="p-r"><b>'+p.brk+'</b><span>Direct</span></div></div>').join("");
    this.filterPairs();
  },
  filterPairs(){ const q=(document.getElementById("pair-q").value||"").toLowerCase(); document.querySelectorAll("#pair-list .p-card").forEach(c=>{ const ok=this.cat==="all"||c.dataset.cat.split(" ").includes(this.cat); c.style.display=(ok&&(!q||c.dataset.q.includes(q)))?"flex":"none"; }); },
  calibrate(){ const v=parseFloat(document.getElementById("mt5-inp").value); if(!isFinite(v)||!this.candles.length) return; this.offset=+(v-(this.candles[this.candles.length-1].close-this.getOff())).toFixed(2); localStorage.setItem("atm_clean_off",String(this.offset)); this.closeModals(); this.load(); },
  resetOff(){ this.offset=0; localStorage.setItem("atm_clean_off","0"); this.closeModals(); this.load(); },
  renderTFs(){
    const STD=["1m","3m","5m","15m","30m","45m","1h","2h","4h","1d","1w","1M"], SEC=["1s","5s","10s","15s","30s"], TCK=["1T","10T","100T","1000T"];
    const mk=c=>{ const l=this.parseTF(c).lbl, f=this.favs.includes(c); return '<div class="tf-btn '+(this.tf===c?'act':'')+'" onclick="App.setTF(\''+c+'\')"><span>'+l+'</span><button class="tf-st '+(f?'on':'')+'" onclick="App.togFav(\''+c+'\',event)">'+(f?'★':'☆')+'</button></div>'; };
    document.getElementById("tf-fav").innerHTML=this.favs.map(mk).join(""); document.getElementById("tf-std").innerHTML=STD.map(mk).join("");
    document.getElementById("tf-sec").innerHTML=SEC.map(mk).join(""); document.getElementById("tf-tck").innerHTML=TCK.map(mk).join("");
  },
  togFav(c,e){ e.stopPropagation(); const i=this.favs.indexOf(c); if(i>=0) this.favs.splice(i,1); else this.favs.push(c); localStorage.setItem("atm_clean_fav",JSON.stringify(this.favs)); this.renderTFs(); },
  customTF(k){ const id=k==="std"?"tf-c-std":(k==="sec"?"tf-c-sec":"tf-c-tck"), v=document.getElementById(id).value.trim(); if(!v) return; this.setTF(k==="sec"?(+v+"s"):(k==="tick"?(+v+"T"):v)); document.getElementById(id).value=""; },
  toggleAtm2Panel(){ const p=document.getElementById("atm2-panel"); p.style.display=p.style.display==="none"?"block":"none"; if(p.style.display==="block"&&window.Ind) Ind.renderPanel(); }
};

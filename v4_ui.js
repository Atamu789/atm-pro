(function(){
  App.tfWheel=["1m","3m","5m","15m","30m","45m","1h","2h","4h","1d","1w","1M","5s","15s","100T"];
  App.toggleFull=function(){if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();};

  App.pushPrice=function(price,barT,isTrade){
    if(!this.candles.length||!isFinite(price)||!this.spec)return;
    const sp=this.spec,dec=price>100?2:4,p=+price.toFixed(dec),last=this.candles[this.candles.length-1];
    if(sp.kind==="tick"){
      if(isTrade&&++this.tickCnt>sp.tickSize){this.tickCnt=1;const nb={time:Math.max(Math.floor(Date.now()/1000),last.time+1),open:p,high:p,low:p,close:p};this.candles.push(nb);if(this.candles.length>420)this.candles.shift();this.targetP=p;this.dispP=p;this.series.update(nb);this.updateHud(nb);return;}
      this.targetP=p;if(this.dispP===null)this.dispP=last.close;return;
    }
    if(sp.sec<86400){
      const b=barT?(sp.kind==="native"?barT:Math.floor(barT/sp.sec)*sp.sec):(Math.floor(Date.now()/1000/sp.sec)*sp.sec);
      if(b>last.time){const nb={time:b,open:last.close,high:Math.max(last.close,p),low:Math.min(last.close,p),close:p};this.candles.push(nb);if(this.candles.length>520)this.candles.shift();this.targetP=p;this.dispP=p;this.series.update(nb);this.updateHud(nb);if(window.Ind){Ind.compute();Ind.draw();}if(window.Scanner)Scanner.run();return;}
    }
    const eps=dec===2?0.01:0.0001;
    if(this.targetP===null||Math.abs(p-this.targetP)>=eps)this.targetP=p;
    if(this.dispP===null)this.dispP=last.close;
  };

  App.startLoop=function(){
    if(this._v4Loop)return;this._v4Loop=true;let lts=0,lov=0;
    const lp=ts=>{
      requestAnimationFrame(lp);
      const dt=lts?Math.min(0.05,(ts-lts)/1000):0.016;lts=ts;
      if(!this.candles.length||this.targetP===null)return;
      const last=this.candles[this.candles.length-1],dec=last.close>100?2:4,eps=dec===2?0.005:0.00005;
      if(this.dispP===null)this.dispP=last.close;
      const df=this.targetP-this.dispP;
      if(Math.abs(df)>=eps){
        const a=1-Math.exp(-10.5*dt);
        this.dispP=Math.abs(df)<=eps*2.5?this.targetP:this.dispP+df*a;
        const v=+this.dispP.toFixed(dec);
        if(v!==last.close){last.close=v;if(v>last.high)last.high=v;if(v<last.low)last.low=v;this.series.update(last);this.updateHud(last);if(window.Scanner)Scanner.tickSim();if(ts-lov>125){lov=ts;if(window.Ind)Ind.draw();}}
      }
    };
    requestAnimationFrame(lp);
  };

  function bindW(id,getI,getX,onC,mid){
    const el=document.getElementById(id),pop=document.getElementById("wheel-popup");if(!el)return;
    let sy=0,sx=0,cx=0,mv=false,ac=false;
    const show=(it,ix)=>{if(!pop)return;pop.style.display="block";const r=[];for(let k=-2;k<=2;k++){const i=ix+k;if(i>=0&&i<it.length)r.push('<div class="wp-it'+(k===0?' cur':'')+'">'+it[i].l+'</div>');}pop.innerHTML=r.join("");};
    el.addEventListener("touchstart",e=>{if(!e.touches.length)return;ac=true;mv=false;sy=e.touches[0].clientY;const it=getI();sx=Math.max(0,getX(it));cx=sx;el.classList.add("wheeling");},{passive:true});
    el.addEventListener("touchmove",e=>{if(!ac||!e.touches.length)return;const dy=e.touches[0].clientY-sy;if(Math.abs(dy)>8)mv=true;if(mv){if(e.cancelable)e.preventDefault();const it=getI();cx=Math.max(0,Math.min(it.length-1,sx+Math.round(-dy/28)));show(it,cx);}},{passive:false});
    const end=()=>{if(!ac)return;ac=false;el.classList.remove("wheeling");if(pop)pop.style.display="none";if(mv){const it=getI();if(cx!==sx&&it[cx])onC(it[cx]);}else App.openModal(mid);};
    el.addEventListener("touchend",end);el.addEventListener("touchcancel",end);
    el.addEventListener("click",()=>{if(!mv)App.openModal(mid);});
  }

  App.toggleIndDrop=function(){
    const d=document.getElementById("ind-dropdown"),b=document.getElementById("ind-drop-btn"),a=document.getElementById("ind-arr");if(!d)return;
    const op=d.style.display==="none";if(op)App.renderIndDrop();
    d.style.display=op?"block":"none";if(b)b.classList.toggle("open",op);if(a)a.textContent=op?"⌃":"⌄";
  };
  App.renderIndDrop=function(){
    const d=document.getElementById("ind-dropdown");if(!d||!window.Ind)return;
    const rows=[["struct","BOS / CHoCH & Liquidité $$$",1],["ob","Order Blocks (OB+ / OB-)",0],["fvg","Fair Value Gaps (FVG)",0],["sd","Zones Supply & Demand",0],["dxy","Corrélation DXY Live",0],["atm2","ATM 2 Pro (Modèle Vidéo)",1],["ema","Pack EMA (20/50/200)",0],["tl","Lignes de Tendance Auto",0]];
    let cnt=0,h=rows.map(([k,nm,cf])=>{const on=!!Ind.on[k];if(on)cnt++;return '<div class="idd-row'+(on?' on':'')+'"><span class="idd-name">'+nm+'</span><div class="idd-acts"><button type="button" class="idd-btn'+(on?' on':'')+'" onclick="Ind.toggle(\''+k+'\');App.renderIndDrop()">'+(on?'👁':'⊘')+'</button>'+(cf?'<button type="button" class="idd-btn" onclick="App.toggleIndDrop();App.openModal(\'ind-modal\')">⚙</button>':'')+'</div></div>';}).join("");
    const sc=document.getElementById("scanner-card"),scOn=sc&&getComputedStyle(sc).display!=="none";if(scOn)cnt++;
    h+='<div class="idd-row'+(scOn?' on':'')+'"><span class="idd-name">🎯 Scanner HTF IA</span><div class="idd-acts"><button type="button" class="idd-btn'+(scOn?' on':'')+'" onclick="Scanner.toggle();App.renderIndDrop()">'+(scOn?'👁':'⊘')+'</button></div></div>';
    d.innerHTML=h;const cE=document.getElementById("ind-cnt");if(cE)cE.textContent=cnt;
  };

  const _om=App.openModal.bind(App);
  App.openModal=function(id){if(id==="draw-modal"&&window.Draw)Draw.renderModal();return _om(id);};
  bindW("wheel-pair",()=>App.pairs.map(p=>({v:p.sym,l:p.disp})),it=>it.findIndex(x=>x.v===App.sym),x=>App.setPair(x.v),"pair-modal");
  bindW("wheel-tf",()=>App.tfWheel.map(t=>({v:t,l:App.parseTF(t).lbl})),it=>it.findIndex(x=>x.v===App.tf),x=>App.setTF(x.v),"tf-modal");
  setTimeout(()=>App.renderIndDrop(),350);
})();

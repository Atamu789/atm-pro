window.V5 = {
  I: {
    gear:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    mag:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M6 3v8a6 6 0 0 0 12 0V3"/><path d="M6 7h4M14 7h4"/></svg>',
    undo:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-2"/></svg>',
    redo:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h2"/></svg>',
    long:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M4 17l6-6 4 4 6-8"/><path d="M15 7h5v5"/></svg>',
    short:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M4 7l6 6 4-4 6 8"/><path d="M15 17h5v-5"/></svg>',
    fibo:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 5h18M3 10h18M3 15h18M3 20h18"/></svg>',
    range:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/></svg>',
    trend:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><path d="M6.5 17.5L17.5 6.5"/></svg>',
    hline:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M3 12h18"/><circle cx="12" cy="12" r="2"/></svg>',
    ray:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><circle cx="5" cy="12" r="2"/><path d="M7 12h14m-4-4l4 4-4 4"/></svg>',
    rect:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="6" width="16" height="12" rx="2"/></svg>',
    arrow:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><path d="M5 19L19 5M11 5h8v8"/></svg>',
    brush:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 17c2-5 5-7 8-5s5 1 8-6"/></svg>',
    text:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M12 6v13M9 19h6"/></svg>',
    clear:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>'
  },
  tfTab(k){
    ["std","sec","tck"].forEach(x=>{
      document.getElementById("tft-"+x)?.classList.toggle("on", x===k);
      const p=document.getElementById("tfp-"+x); if(p) p.style.display=x===k?"block":"none";
    });
  },
  thTab(k){
    ["th","fx","wp"].forEach(x=>{
      document.getElementById("tht-"+x)?.classList.toggle("on", x===k);
      const p=document.getElementById("thp-"+x); if(p) p.style.display=x===k?"block":"none";
    });
  },
  syncSearchClr(){
    const q=document.getElementById("pair-q"), c=document.getElementById("pair-q-clr");
    if(c) c.style.display=(q&&q.value)?"flex":"none";
  },
  clearSearch(){
    const q=document.getElementById("pair-q"); if(!q) return;
    q.value=""; this.syncSearchClr(); if(window.App) App.filterPairs(); q.focus();
  }
};

(function initV5(){
  document.querySelectorAll(".m-sheet").forEach(sheet=>{
    const hz=sheet.querySelector(".v5-head-zone"); if(!hz) return;
    let sy=0, dy=0, drag=false;
    hz.addEventListener("touchstart", e=>{ if(!e.touches.length||e.target.closest("button")) return; sy=e.touches[0].clientY; dy=0; drag=true; sheet.style.transition="none"; }, {passive:true});
    hz.addEventListener("touchmove", e=>{ if(!drag||!e.touches.length) return; dy=Math.max(0,e.touches[0].clientY-sy); if(dy>4){ if(e.cancelable) e.preventDefault(); sheet.style.transform="translateY("+Math.min(dy,280)+"px)"; } }, {passive:false});
    const stop=()=>{ if(!drag) return; drag=false; sheet.style.transition="transform .2s cubic-bezier(.22,1,.36,1)"; if(dy>75){ sheet.style.transform="translateY(100%)"; setTimeout(()=>{ sheet.style.transform=""; if(window.App) App.closeModals(); },180); } else sheet.style.transform=""; };
    hz.addEventListener("touchend", stop); hz.addEventListener("touchcancel", stop);
  });

  document.addEventListener("click", e=>{
    const dd=document.getElementById("ind-dropdown");
    if(!dd||dd.style.display==="none") return;
    if(e.target&&e.target.isConnected&&!e.target.closest("#ind-dropdown")&&!e.target.closest("#ind-drop-btn")) App.toggleIndDrop();
  });

  ["wheel-pair","wheel-tf"].forEach(id=>{
    const old=document.getElementById(id); if(!old) return;
    const el=old.cloneNode(true); old.parentNode.replaceChild(el, old);
    const isP=id==="wheel-pair", pop=document.getElementById("wheel-popup");
    const getI=()=>isP?App.pairs.map(p=>({v:p.sym,l:p.disp})):App.tfWheel.map(t=>({v:t,l:App.parseTF(t).lbl}));
    const getX=it=>it.findIndex(x=>x.v===(isP?App.sym:App.tf));
    let sy=0, sx=0, cx=0, mv=false, act=false, blockClick=0;
    const show=(it,ix)=>{ if(!pop) return; pop.style.display="block"; const r=[]; for(let k=-2;k<=2;k++){ const i=ix+k; if(i>=0&&i<it.length) r.push('<div class="wp-it'+(k===0?' cur':'')+'">'+it[i].l+'</div>'); } pop.innerHTML=r.join(""); };
    el.addEventListener("touchstart", e=>{ if(!e.touches.length) return; act=true; mv=false; sy=e.touches[0].clientY; const it=getI(); sx=Math.max(0,getX(it)); cx=sx; el.classList.add("wheeling"); }, {passive:true});
    el.addEventListener("touchmove", e=>{ if(!act||!e.touches.length) return; const dy=e.touches[0].clientY-sy; if(Math.abs(dy)>10) mv=true; if(mv){ if(e.cancelable) e.preventDefault(); const it=getI(); cx=Math.max(0,Math.min(it.length-1,sx+Math.round(-dy/28))); show(it,cx); } }, {passive:false});
    const end=()=>{ if(!act) return; act=false; el.classList.remove("wheeling"); if(pop) pop.style.display="none"; if(mv){ blockClick=Date.now()+350; const it=getI(); if(cx!==sx&&it[cx]){ if(isP) App.setPair(it[cx].v); else App.setTF(it[cx].v); } } };
    el.addEventListener("touchend", end); el.addEventListener("touchcancel", end);
    el.addEventListener("click", ()=>{ if(Date.now()<blockClick) return; App.openModal(isP?"pair-modal":"tf-modal"); });
  });

  if(window.App){
    App.renderIndDrop=function(){
      const d=document.getElementById("ind-dropdown"); if(!d||!window.Ind) return;
      const groups=[
        { t:"STRUCTURE & SMART MONEY", it:[["struct","BOS / CHoCH & Liquidité","Pivots HH/HL/LH/LL, EQH/EQL, BSL/SSL",1],["ob","Order Blocks (OB+ / OB-)","Blocs institutionnels non mitigés",0],["fvg","Fair Value Gaps (FVG)","Déséquilibres auto-nettoyés",0],["sd","Zones Supply & Demand","Zones fraîches et testées",0]] },
        { t:"CONTEXTE & TENDANCE", it:[["dxy","Corrélation DXY Live","Dollar Index & divergence",0],["atm2","ATM 2 Pro","Supertrend ATR, croix X & stats",1],["ema","Pack EMA (20 / 50 / 200)","Moyennes mobiles exponentielles",0],["tl","Lignes de Tendance","Supports & résistances auto",0]] }
      ];
      let cnt=0; const sc=document.getElementById("scanner-card"), scOn=!!(sc&&getComputedStyle(sc).display!=="none");
      groups.forEach(g=>g.it.forEach(([k])=>{ if(Ind.on[k]) cnt++; })); if(scOn) cnt++;
      let h='<div class="idd-hdr"><b>Indicateurs</b><span>'+cnt+' ACTIFS</span></div>';
      groups.forEach(g=>{
        h+='<div class="idd-cat">'+g.t+'</div>';
        g.it.forEach(([k,nm,sb,cf])=>{
          const on=!!Ind.on[k];
          h+='<div class="idd-row'+(on?' on':'')+'"><div class="idd-meta" onclick="Ind.toggle(\''+k+'\');App.renderIndDrop()"><b>'+nm+'</b><small>'+sb+'</small></div><div class="idd-acts">'
            +(cf?'<button type="button" class="idd-cfg" onclick="App.toggleIndDrop();App.openModal(\'ind-modal\')">'+V5.I.gear+'</button>':'')
            +'<button type="button" class="idd-sw'+(on?' on':'')+'" onclick="Ind.toggle(\''+k+'\');App.renderIndDrop()"></button></div></div>';
        });
      });
      h+='<div class="idd-cat">ANALYSE IA</div><div class="idd-row'+(scOn?' on':'')+'"><div class="idd-meta" onclick="Scanner.toggle();App.renderIndDrop()"><b>Scanner HTF IA</b><small>Confluences MTF, SMC, S&amp;D &amp; DXY</small></div><div class="idd-acts"><button type="button" class="idd-sw'+(scOn?' on':'')+'" onclick="Scanner.toggle();App.renderIndDrop()"></button></div></div>';
      d.innerHTML=h; const cE=document.getElementById("ind-cnt"); if(cE) cE.textContent=cnt;
    };
    const _rp=App.renderPairs.bind(App);
    App.renderPairs=function(){
      _rp();
      document.querySelectorAll("#pair-list .p-card").forEach(c=>{
        const cur=(c.getAttribute("onclick")||"").indexOf("'"+App.sym+"'")!==-1;
        c.classList.toggle("cur-pair", cur);
        const b=c.querySelector(".p-l b");
        if(b&&cur&&!b.querySelector(".v5-cur-tag")) b.innerHTML+='<span class="v5-cur-tag">ACTIF</span>';
      });
    };
  }
  if(window.Scanner&&typeof Scanner.toggle==="function"){
    const _st=Scanner.toggle.bind(Scanner);
    Scanner.toggle=function(){ _st(); if(window.App&&App.renderIndDrop) App.renderIndDrop(); };
  }

  if(window.Draw){
    Draw.renderModal=function(){
      const w=document.getElementById("draw-grid-wrap"); if(!w) return;
      const cats=[
        { t:"TRADING & FIBONACCI", it:[["long","Position Longue","TP vert / SL rouge & R:R"],["short","Position Courte","Short R:R & PnL"],["fibo","Fibonacci","0 • 0.5 • 0.618 • 0.786 • 1"],["range","Intervalle prix","Mesure points & %"]] },
        { t:"LIGNES & ZONES", it:[["trend","Ligne tendance","2 points libres"],["hline","Horizontale","Niveau de prix clé"],["ray","Rayon horizontal","Prolongé à droite"],["rect","Rectangle","Zone de prix"]] },
        { t:"ANNOTATIONS & GESTION", it:[["arrow","Flèche","Direction visuelle"],["brush","Pinceau","Tracé à main levée"],["text","Texte","Note sur graphique"],["clear","Tout effacer","Supprimer les tracés"]] }
      ];
      let h='<div class="dr-quick-bar"><button type="button" class="dr-qbtn'+(Draw.magnet?' on':'')+'" onclick="Draw.toggleMagnet();Draw.renderModal()">'+V5.I.mag+' Aimant '+(Draw.magnet?'ON':'OFF')+'</button><button type="button" class="dr-qbtn" onclick="Draw.undo()">'+V5.I.undo+' Annuler</button><button type="button" class="dr-qbtn" onclick="Draw.redo()">'+V5.I.redo+' Refaire</button></div>';
      cats.forEach(c=>{
        h+='<div class="sec-t">'+c.t+'</div><div class="dr-grid">';
        c.it.forEach(([id,nm,sb])=>{ h+='<button type="button" class="dr-item'+(id==="clear"?' danger':'')+'" onclick="'+(id==="clear"?'Draw.clearAll()':'Draw.start(\''+id+'\')')+'"><span class="dr-ico">'+(V5.I[id]||"")+'</span><div><b>'+nm+'</b><small>'+sb+'</small></div></button>'; });
        h+='</div>';
      });
      w.innerHTML=h;
    };
  }
  setTimeout(()=>{ if(window.App&&App.renderIndDrop) App.renderIndDrop(); }, 250);
})();

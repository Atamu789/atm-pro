window.ThemeFX={
  id:"tempete",intensity:"high",colorCandles:true,pts:[],ripples:[],bolts:[],t:0,flash:0,
  storm:{rain:65,rip:70,bolt:45},wp:{dim:45,blur:0,url:null},
  ambs:[
    ["tempete","Orage 4K","Pluie, Ondes & Éclairs","#060b14","#38bdf8","#93c5fd","#38bdf8","#38bdf8","#f43f5e","storm"],
    ["neonwave","Néon Wave 4K","Rose & Bleu 60FPS","#070612","#ec4899","#22d3ee","#ec4899","#22d3ee","#ec4899","wave"],
    ["supercell","Supercellule","Orage électrique","#090717","#818cf8","#22d3ee","#818cf8","#22d3ee","#f43f5e","storm"],
    ["forge","Forge","Braises dorées","#140a04","#f59e0b","#ea580c","#f59e0b","#fbbf24","#ef4444","rise"],
    ["aurore","Aurore Polaire","Voiles boréaux","#041114","#10b981","#38bdf8","#10b981","#34d399","#a855f7","aurora"],
    ["abysses","Abysses","Bulles profondes","#030b17","#0ea5e9","#1d4ed8","#38bdf8","#38bdf8","#6366f1","rise"],
    ["volcan","Volcan","Lave & cendres","#160507","#f43f5e","#f97316","#f43f5e","#fb923c","#e11d48","rise"],
    ["geode","Géode","Cristaux violets","#0e071a","#a855f7","#e879f9","#a855f7","#c084fc","#f43f5e","float"],
    ["blizzard","Blizzard","Flocons glacés","#07101c","#e0f2fe","#7dd3fc","#7dd3fc","#7dd3fc","#f43f5e","snow"],
    ["antelope","Antelope Canyon","Ondes ocre","#170c06","#fb923c","#d97706","#fb923c","#fbbf24","#dc2626","wave"],
    ["vertdegris","Vert-de-gris","Brume turquoise","#051314","#2dd4bf","#0d9488","#2dd4bf","#2dd4bf","#fb7185","aurora"]
  ].map(a=>({id:a[0],name:a[1],sub:a[2],bg:a[3],g1:a[4],g2:a[5],acc:a[6],up:a[7],dn:a[8],mode:a[9]})),
  bases:[
    ["sombre","Sombre","Obsidian Pro","#070a12","#38bdf8","#1e293b","#38bdf8","#10b981","#f43f5e",0],
    ["clair","Clair","Jour lumineux","#f1f5f9","#0284c7","#cbd5e1","#0284c7","#059669","#e11d48",1],
    ["bleunuit","Bleu nuit","TradingView","#0c1322","#3b82f6","#1e3a8a","#3b82f6","#26a69a","#ef5350",0],
    ["graphite","Graphite","Gris carbone","#111318","#94a3b8","#334155","#94a3b8","#22c55e","#ef4444",0],
    ["noiror","Noir & Or","Luxe Gold","#090806","#f59e0b","#78350f","#f59e0b","#fbbf24","#ef4444",0],
    ["emeraude","Émeraude","Vert profond","#051210","#10b981","#064e3b","#10b981","#34d399","#fb7185",0]
  ].map(a=>({id:a[0],name:a[1],sub:a[2],bg:a[3],g1:a[4],g2:a[5],acc:a[6],up:a[7],dn:a[8],mode:"none",light:!!a[9]})),
  getCur(){return [...this.ambs,...this.bases].find(x=>x.id===this.id)||this.ambs[0];},
  openWpDb(cb){const r=indexedDB.open("atm_wp_v4",1);r.onupgradeneeded=e=>e.target.result.createObjectStore("wp");r.onsuccess=e=>cb(e.target.result);r.onerror=()=>{};},
  pickWp(ev){const f=ev.target&&ev.target.files&&ev.target.files[0];if(!f)return;this.showWpBlob(f,f.type);this.openWpDb(db=>db.transaction("wp","readwrite").objectStore("wp").put({blob:f,type:f.type},"cur"));},
  showWpBlob(blob,type){
    if(this.wp.url)try{URL.revokeObjectURL(this.wp.url);}catch(e){}
    const u=URL.createObjectURL(blob);this.wp.url=u;
    const im=document.getElementById("wp-img"),vd=document.getElementById("wp-vid"),dm=document.getElementById("wp-dim");
    if(String(type).startsWith("video/")){if(im){im.style.display="none";im.src="";}if(vd){vd.src=u;vd.style.display="block";vd.play().catch(()=>{});}}
    else{if(vd){vd.pause();vd.style.display="none";vd.src="";}if(im){im.src=u;im.style.display="block";}}
    if(dm)dm.style.display="block";this.applyWpStyle();
  },
  clearWp(){
    if(this.wp.url)try{URL.revokeObjectURL(this.wp.url);}catch(e){}this.wp.url=null;
    const im=document.getElementById("wp-img"),vd=document.getElementById("wp-vid"),dm=document.getElementById("wp-dim");
    if(im){im.style.display="none";im.src="";}if(vd){vd.pause();vd.style.display="none";vd.src="";}if(dm)dm.style.display="none";
    this.openWpDb(db=>db.transaction("wp","readwrite").objectStore("wp").delete("cur"));
  },
  setWpOpt(k,v){this.wp[k]=+v;localStorage.setItem("atm_wp_opt",JSON.stringify({dim:this.wp.dim,blur:this.wp.blur}));this.applyWpStyle();},
  applyWpStyle(){
    const dm=document.getElementById("wp-dim"),im=document.getElementById("wp-img"),vd=document.getElementById("wp-vid");
    if(dm)dm.style.background="rgba(4,7,14,"+(this.wp.dim/100).toFixed(2)+")";
    const fl=this.wp.blur>0?("blur("+this.wp.blur+"px)"):"none";if(im)im.style.filter=fl;if(vd)vd.style.filter=fl;
    const dv=document.getElementById("wp-dim-v"),bv=document.getElementById("wp-blur-v"),ds=document.getElementById("wp-dim-sl"),bs=document.getElementById("wp-blur-sl");
    if(dv)dv.textContent=this.wp.dim+"%";if(bv)bv.textContent=this.wp.blur+"px";if(ds)ds.value=this.wp.dim;if(bs)bs.value=this.wp.blur;
  },
  setStorm(k,v){this.storm[k]=+v;localStorage.setItem("atm_storm_cfg",JSON.stringify(this.storm));const e=document.getElementById("st-"+k+"-v");if(e)e.textContent=v+"%";if(k==="rain")this.seedParticles();},
  apply(id){
    if(id)this.id=id;const th=this.getCur();localStorage.setItem("atm_th_id",this.id);
    document.body.className=th.light?"th-light":"";const s=document.body.style;
    s.setProperty("--bg",th.bg);s.setProperty("--acc",th.acc);s.setProperty("--acc-bg",th.acc+"28");
    if(!th.light){s.setProperty("--hdr",th.bg+"e8");s.setProperty("--panel",th.bg+"f5");}else{s.removeProperty("--hdr");s.removeProperty("--panel");}
    if(window.App&&App.chart&&App.series){
      App.chart.applyOptions({layout:{background:{type:"solid",color:"transparent"},textColor:th.light?"#334155":"#94a3b8"},grid:{vertLines:{color:th.light?"rgba(15,23,42,.06)":"rgba(255,255,255,.035)"},horzLines:{color:th.light?"rgba(15,23,42,.06)":"rgba(255,255,255,.035)"}}});
      const up=this.colorCandles?th.up:"#10b981",dn=this.colorCandles?th.dn:"#f43f5e";
      App.series.applyOptions({upColor:up,downColor:dn,wickUpColor:up,wickDownColor:dn});
    }
    this.seedParticles();this.renderMenu();
  },
  setIntensity(lv){this.intensity=lv;localStorage.setItem("atm_th_int",lv);["high","low","off"].forEach(k=>document.getElementById("fxi-"+k)?.classList.toggle("on",k===lv));this.seedParticles();},
  toggleCandles(){this.colorCandles=!this.colorCandles;localStorage.setItem("atm_th_cdl",this.colorCandles?"1":"0");const b=document.getElementById("fx-cdl-btn");if(b){b.classList.toggle("on",this.colorCandles);b.textContent="🕯️ Bougies thème: "+(this.colorCandles?"ON":"OFF");}this.apply();},
  renderMenu(){const mk=t=>'<div class="th-card '+(this.id===t.id?'act':'')+'" onclick="ThemeFX.apply(\''+t.id+'\')"><i style="background:linear-gradient(135deg,'+t.bg+','+t.g1+','+t.g2+')"></i><div><b>'+t.name+'</b><small>'+t.sub+'</small></div></div>';const a=document.getElementById("amb-grid"),b=document.getElementById("base-th-grid");if(a)a.innerHTML=this.ambs.map(mk).join("");if(b)b.innerHTML=this.bases.map(mk).join("");},
  seedParticles(){
    const th=this.getCur(),bs=this.intensity==="high"?50:(this.intensity==="low"?20:0),cnt=th.mode==="storm"?Math.round(bs*(this.storm.rain/65)):bs;
    this.pts=[];for(let i=0;i<cnt;i++)this.pts.push({x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.0012,vy:.0008+Math.random()*.0024,r:1+Math.random()*2.1,p:Math.random()*6.28,c:i%2,len:10+Math.random()*14,hitY:.18+Math.random()*.76});
  },
  spawnBolt(w,h,col){
    const pts=[{x:w*(.15+Math.random()*.7),y:0}],br=[];let x=pts[0].x,y=0,sg=10+Math.floor(Math.random()*5),sy=(h*(.45+Math.random()*.32))/sg;
    for(let i=0;i<sg;i++){x+=(Math.random()-.5)*42;y+=sy;pts.push({x,y});if(Math.random()<.35&&i>1&&i<sg-2){const b=[{x,y}];let bx=x,by=y;for(let k=0;k<3;k++){bx+=(Math.random()-.5)*34;by+=sy*.75;b.push({x:bx,y:by});}br.push(b);}}
    this.bolts.push({pts,br,col,a:.72});this.flash=.1;
  },
  start(){
    const cv=document.getElementById("bg-fx-canvas");if(!cv)return;const ctx=cv.getContext("2d");
    const rs=()=>{const d=Math.min(window.devicePixelRatio||1,2);cv.width=window.innerWidth*d;cv.height=window.innerHeight*d;ctx.setTransform(d,0,0,d,0,0);};
    window.addEventListener("resize",rs);rs();
    try{const so=JSON.parse(localStorage.getItem("atm_storm_cfg")||"null");if(so)Object.assign(this.storm,so);}catch(e){}
    try{const wo=JSON.parse(localStorage.getItem("atm_wp_opt")||"null");if(wo)Object.assign(this.wp,wo);}catch(e){}
    ["rain","rip","bolt"].forEach(k=>{const s=document.getElementById("st-"+k+"-sl"),v=document.getElementById("st-"+k+"-v");if(s)s.value=this.storm[k];if(v)v.textContent=this.storm[k]+"%";});
    this.applyWpStyle();
    this.openWpDb(db=>{const r=db.transaction("wp","readonly").objectStore("wp").get("cur");r.onsuccess=()=>{if(r.result&&r.result.blob)this.showWpBlob(r.result.blob,r.result.type);};});
    const s1=localStorage.getItem("atm_th_id");if(s1)this.id=s1;
    const s2=localStorage.getItem("atm_th_int");if(s2)this.intensity=s2;
    const s3=localStorage.getItem("atm_th_cdl");if(s3!==null)this.colorCandles=s3==="1";
    this.setIntensity(this.intensity);const b=document.getElementById("fx-cdl-btn");if(b){b.classList.toggle("on",this.colorCandles);b.textContent="🕯️ Bougies thème: "+(this.colorCandles?"ON":"OFF");}
    this.apply();
    const lp=()=>{
      requestAnimationFrame(lp);const w=window.innerWidth,h=window.innerHeight,th=this.getCur();ctx.clearRect(0,0,w,h);
      if(this.intensity==="off"||th.mode==="none")return;const al=this.intensity==="high"?1:.5;this.t+=.016;
      if(!this.wp.url){const gr=ctx.createRadialGradient(w*.25,h*.28,10,w*.5,h*.5,Math.max(w,h)*.85);gr.addColorStop(0,th.g1+(this.intensity==="high"?"22":"12"));gr.addColorStop(.55,th.g2+(this.intensity==="high"?"16":"0a"));gr.addColorStop(1,"transparent");ctx.fillStyle=gr;ctx.fillRect(0,0,w,h);}
      if(th.mode==="wave"||th.mode==="aurora"){const L=this.intensity==="high"?5:3;for(let l=0;l<L;l++){ctx.save();ctx.beginPath();const yb=h*(.28+l*.11);for(let x=0;x<=w;x+=14){const ph=x*.0085+this.t*(1.1+l*.22)+l*1.3,y=yb+Math.sin(ph)*(24+l*8)+Math.cos(ph*.6)*14;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}const lg=ctx.createLinearGradient(0,yb-30,w,yb+30);lg.addColorStop(0,th.g1);lg.addColorStop(.5,th.g2);lg.addColorStop(1,th.g1);ctx.strokeStyle=lg;ctx.globalAlpha=(.22-l*.025)*al;ctx.lineWidth=th.mode==="aurora"?14:2.5;ctx.shadowBlur=th.mode==="wave"?14:20;ctx.shadowColor=l%2?th.g2:th.g1;ctx.stroke();ctx.restore();}}
      if(th.mode==="storm"){
        if(this.storm.bolt>0&&Math.random()<(this.storm.bolt/100)*.009*al)this.spawnBolt(w,h,th.g2);
        if(this.flash>.004){ctx.fillStyle=th.g2;ctx.globalAlpha=this.flash;ctx.fillRect(0,0,w,h);this.flash*=.82;ctx.globalAlpha=1;}
        for(let i=this.bolts.length-1;i>=0;i--){const bl=this.bolts[i];bl.a*=.85;if(bl.a<.02){this.bolts.splice(i,1);continue;}ctx.save();ctx.strokeStyle="#e0f2fe";ctx.shadowBlur=15;ctx.shadowColor=bl.col;ctx.globalAlpha=bl.a*al;ctx.lineWidth=1.5;ctx.beginPath();bl.pts.forEach((pt,ix)=>ix===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y));ctx.stroke();ctx.lineWidth=.85;ctx.globalAlpha=bl.a*.58*al;bl.br.forEach(br=>{ctx.beginPath();br.forEach((pt,ix)=>ix===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y));ctx.stroke();});ctx.restore();}
        for(let i=this.ripples.length-1;i>=0;i--){const rp=this.ripples[i];rp.r+=rp.sp;rp.a*=.935;if(rp.a<.015||rp.r>rp.maxR){this.ripples.splice(i,1);continue;}ctx.save();ctx.strokeStyle=th.g1;ctx.globalAlpha=rp.a*al;ctx.lineWidth=1.1;ctx.beginPath();ctx.ellipse(rp.x,rp.y,rp.r,rp.r*.42,0,0,Math.PI*2);ctx.stroke();if(rp.r>6){ctx.strokeStyle=th.g2;ctx.globalAlpha=rp.a*.45*al;ctx.lineWidth=.75;ctx.beginPath();ctx.ellipse(rp.x,rp.y,rp.r*.58,rp.r*.24,0,0,Math.PI*2);ctx.stroke();}ctx.restore();}
      }
      for(const p of this.pts){
        if(th.mode==="rise"){p.y-=p.vy;p.x+=Math.sin(this.t*2+p.p)*.0008;if(p.y<-.02){p.y=1.02;p.x=Math.random();}}
        else if(th.mode==="storm"){p.y+=p.vy*5.2;p.x-=.0022;if(p.y>=p.hitY){if(this.storm.rip>0&&this.ripples.length<28&&Math.random()<(this.storm.rip/100)*.48)this.ripples.push({x:p.x*w,y:p.y*h,r:2,maxR:16+Math.random()*22,sp:.65+Math.random()*.45,a:.42});p.y=-.04;p.x=Math.random()*1.18;p.hitY=.22+Math.random()*.72;}}
        else if(th.mode==="snow"){p.y+=p.vy*.9;p.x+=Math.sin(this.t+p.p)*.0012;if(p.y>1.02){p.y=-.02;p.x=Math.random();}}
        else{p.x+=p.vx;p.y+=Math.sin(this.t+p.p)*.0007;if(p.x<0)p.x=1;if(p.x>1)p.x=0;}
        const px=p.x*w,py=p.y*h;ctx.save();
        if(th.mode==="storm"){ctx.globalAlpha=.26*al;ctx.strokeStyle=p.c?th.g2:th.g1;ctx.lineWidth=.95;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-3.5,py+p.len);ctx.stroke();}
        else{ctx.globalAlpha=(.35+.35*Math.sin(this.t*3+p.p))*al;ctx.fillStyle=p.c?th.g2:th.g1;ctx.beginPath();ctx.arc(px,py,p.r,0,Math.PI*2);ctx.fill();}
        ctx.restore();
      }
    };
    requestAnimationFrame(lp);
  }
};

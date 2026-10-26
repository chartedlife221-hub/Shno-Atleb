/* App logic: render, filters, search, hero carousel, forms. */
/* ---------- state & helpers ---------- */
let lang = "ar";
try{ const s = localStorage.getItem("shno_lang"); if(s==="en"||s==="ar") lang = s; }catch(e){}
const state = {q:"",cat:"all",area:"all",cafe:"all",price:"all",type:"all"};
let correcting = null;
let spyKey = "menu";

const $ = s => document.querySelector(s);
const tr = k => T[lang][k];

function daysSince(d){ return Math.floor((Date.now() - new Date(d+"T00:00:00").getTime())/864e5); }
function statusOf(it){ return daysSince(it.date) > STALE_DAYS ? "needs_recheck" : "active"; }
function itemName(it){ return lang==="ar" ? it.ar : it.en; }
function cafeName(it){ return lang==="ar" ? it.cafe_ar : it.cafe; }
function areaName(a){ return lang==="ar" ? AREA_AR[a] : a; }
function fmtPrice(p){ return p.toFixed(3) + " " + tr("kd"); }
function fmtDate(d){
  return new Date(d+"T00:00:00").toLocaleDateString(lang==="ar"?"ar-KW-u-nu-latn":"en-GB",{day:"numeric",month:"short",year:"numeric"});
}
function mapUrl(it){ return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(it.cafe+" "+it.area+" Kuwait"); }
function typeOf(it){ return it.cat==="cake_dessert" ? "dessert" : it.cat==="matcha_other" ? "other" : "coffee"; }
function priceBand(p){ return p<1.5 ? "low" : p<=2.0 ? "mid" : "high"; }

function matches(it){
  if(state.cat!=="all" && it.cat!==state.cat) return false;
  if(state.area!=="all" && it.area!==state.area) return false;
  if(state.cafe!=="all" && it.cafe!==state.cafe) return false;
  if(state.price!=="all" && priceBand(it.price)!==state.price) return false;
  if(state.type!=="all" && typeOf(it)!==state.type) return false;
  if(state.q){
    const q = state.q.toLowerCase();
    const hay = (it.ar+" "+it.en+" "+it.cafe+" "+it.cafe_ar).toLowerCase();
    if(!hay.includes(q)) return false;
  }
  return true;
}

function cardHTML(it, rank){
  const stale = statusOf(it)==="needs_recheck";
  return `<article class="card" ${rank?"":`id="card-${it.id}"`}>
    <div class="photo" style="background:${GRADIENTS[it.cat]}" role="img" aria-label="${itemName(it)}">
      <span class="emoji" aria-hidden="true">${it.emoji}</span>
      <span class="badge">${tr("badge_"+it.badge)}</span>
      ${stale?`<span class="tag-recheck">${tr("recheck")}</span>`:""}
      ${rank?`<span class="rank" aria-hidden="true">${rank}</span>`:""}
    </div>
    <div class="body">
      <h3 class="name">${itemName(it)}</h3>
      <p class="meta">${cafeName(it)} · ${areaName(it.area)}</p>
      <p class="reason">${lang==="ar"?it.r_ar:it.r_en}</p>
      <div class="row"><span class="price">${fmtPrice(it.price)}</span><span class="small">${tr("verified")} ${fmtDate(it.date)}</span></div>
      <p class="small">${tr("source")} ${tr(SRC_KEY[it.src])}</p>
      <div class="links">
        <a href="${mapUrl(it)}" target="_blank" rel="noopener">📍 ${tr("mapLink")}</a>
        <button type="button" data-correct="${it.id}">${tr("corrLink")}</button>
      </div>
    </div>
  </article>`;
}

/* ---------- static text, nav ---------- */
function renderStatic(){
  const html = document.documentElement;
  html.lang = lang; html.dir = lang==="ar" ? "rtl" : "ltr";
  document.title = lang==="ar" ? "شنو أطلب؟ — Shno Atleb" : "Shno Atleb — شنو أطلب؟";
  document.querySelectorAll("[data-i18n]").forEach(el=>{ el.textContent = tr(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el=>{ el.placeholder = tr(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-aria]").forEach(el=>{ el.setAttribute("aria-label", tr(el.dataset.i18nAria)); });
  document.querySelectorAll(".js-lang").forEach(b=>{ b.textContent = tr("langBtn"); b.setAttribute("aria-label", tr("langAria")); });
  $("#q").value = state.q;
}
function renderNav(){
  const html = NAV.map(([k,href,label])=>
    `<a href="${href}" data-spy="${k}" aria-label="${tr(label)}" title="${tr(label)}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg><span class="lbl">${tr(label)}</span></a>`
  ).join("");
  $("#heroNav").innerHTML = html; $("#dockNav").innerHTML = html;
  setSpy(spyKey);
}
function setSpy(k){
  spyKey = k;
  document.querySelectorAll("[data-spy]").forEach(a=>a.setAttribute("aria-current", a.dataset.spy===k ? "true":"false"));
}

/* ---------- sections ---------- */
const TOP = ITEMS.filter(i=>i.top).sort((a,b)=>a.top-b.top);
function renderTop(){ $("#topScroller").innerHTML = TOP.map(i=>cardHTML(i,i.top)).join(""); }
function renderChips(){
  $("#chips").innerHTML = ["all",...CATS].map(c=>
    `<button type="button" class="chip" data-cat="${c}" aria-pressed="${state.cat===c}">${tr("cat_"+c)}</button>`
  ).join("");
}
function fillSelect(sel, options, current){
  sel.innerHTML = options.map(([v,l])=>`<option value="${v}">${l}</option>`).join("");
  sel.value = current;
}
function renderFilters(){
  fillSelect($("#fArea"), [["all",tr("all")],...AREAS.map(a=>[a,areaName(a)])], state.area);
  const cafes = [...new Set(ITEMS.map(i=>i.cafe))].sort();
  const cafeLabel = c => { const it = ITEMS.find(i=>i.cafe===c); return lang==="ar"?it.cafe_ar:c; };
  fillSelect($("#fCafe"), [["all",tr("all")],...cafes.map(c=>[c,cafeLabel(c)])], state.cafe);
  fillSelect($("#fPrice"), [["all",tr("all")],["low",tr("price_low")],["mid",tr("price_mid")],["high",tr("price_high")]], state.price);
  fillSelect($("#fType"), [["all",tr("all")],["coffee",tr("type_coffee")],["other",tr("type_other")],["dessert",tr("type_dessert")]], state.type);
  fillSelect($("#sArea"), AREAS.map(a=>[a,areaName(a)]), $("#sArea").value||AREAS[0]);
}
function renderGrid(){
  const list = ITEMS.filter(matches);
  $("#count").textContent = tr("count")(list.length);
  $("#grid").innerHTML = list.length
    ? list.map(i=>cardHTML(i)).join("")
    : `<div class="empty" style="grid-column:1/-1">${tr("empty")}</div>`;
}
function renderAreas(){
  $("#areaTiles").innerHTML = AREAS.map(a=>{
    const n = ITEMS.filter(i=>i.area===a).length;
    return `<button type="button" class="area" data-area="${a}"><strong>${areaName(a)}</strong><span>${tr("areaItems")(n)}</span></button>`;
  }).join("");
}
function renderCorrNote(){
  const n = $("#corrNote");
  if(correcting){ n.hidden=false; n.textContent = tr("corrFor")+" "+itemName(correcting)+" — "+cafeName(correcting); }
  else n.hidden = true;
}

/* ---------- HERO: tile carousel + drink ---------- */
const stage = $("#stage"), tilesEl = $("#tiles"), art = $("#cupArt");
let active = 0, hovering = false, heroVisible = true, lastUser = 0, swiped = false;
const prevD = new Map();

function buildTiles(){
  tilesEl.innerHTML = TOP.map((it,i)=>
    `<button type="button" class="tile" data-i="${i}" aria-label="${itemName(it)}"><span aria-hidden="true">${it.emoji}</span></button>`
  ).join("");
  prevD.clear();
  placeTiles();
}
function offsetOf(i){
  const n = TOP.length; let d = ((i-active)%n+n)%n; if(d>n/2) d-=n; return d;
}
function placeTiles(){
  const W = stage.clientWidth, H = stage.clientHeight; if(!W) return;
  const ts = Math.max(72, Math.min(168, W*0.15));
  const step = W < 520 ? W*0.30 : W*0.20;
  tilesEl.querySelectorAll(".tile").forEach(el=>{
    const i = +el.dataset.i, d = offsetOf(i), a = Math.abs(d);
    const x = d*step, y = d*d*H*0.014, r = d*13;
    const s = a===0 ? .5 : a>=3 ? .8 : 1 - .05*(a-1);
    const prev = prevD.get(i);
    const jump = prev!==undefined && Math.abs(d-prev) > 3;
    if(jump) el.style.transition = "none";
    el.style.setProperty("--ts", ts+"px");
    el.style.transform = `translate(${x}px,${y}px) rotate(${r}deg) scale(${s})`;
    el.style.opacity = a===0 ? 0 : a<=2 ? 1 : 0;
    el.style.zIndex = 10 - a;
    el.style.pointerEvents = (a>=1 && a<=2) ? "auto" : "none";
    el.tabIndex = (a>=1 && a<=2) ? 0 : -1;
    if(jump){ void el.offsetWidth; el.style.transition = ""; }
    prevD.set(i,d);
  });
}
function updateHero(pop){
  const it = TOP[active];
  layersFor(it).forEach((c,k)=>art.style.setProperty("--l"+(k+1),c));
  art.dataset.kind = it.cat==="cake_dessert" ? "cake" : "cup";
  $("#cupLabel").textContent = itemName(it);
  $("#caption").innerHTML = `<span class="cap-badge">${tr("badge_"+it.badge)}</span><span>${cafeName(it)} · ${areaName(it.area)}</span>`;
  $("#ptPrice").textContent = it.price.toFixed(3);
  $("#ptKd").textContent = tr("kd");
  $("#priceTile").setAttribute("aria-label", tr("openItem")+": "+itemName(it));
  if(pop){ art.classList.remove("pop"); void art.offsetWidth; art.classList.add("pop"); }
}
function setActive(i, user){
  const n = TOP.length; active = ((i%n)+n)%n;
  if(user) lastUser = Date.now();
  placeTiles(); updateHero(true);
}
function focusItem(id){
  Object.assign(state,{q:"",cat:"all",area:"all",cafe:"all",price:"all",type:"all"});
  $("#q").value = ""; renderChips(); renderFilters(); renderGrid();
  const el = document.getElementById("card-"+id); if(!el) return;
  el.scrollIntoView({behavior:"smooth",block:"center"});
  el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),1900);
}

/* mound texture (deterministic speckles) */
(function(){
  let seed = 7; const rnd = () => (seed = (seed*16807) % 2147483647) / 2147483647;
  const g = $("#speckles"); let out = "";
  for(let k=0;k<420;k++){
    const x = rnd()*1000, y = 60 + rnd()*240, r = .6 + rnd()*1.9;
    const light = rnd() > .5;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${light?"rgba(225,235,170,.22)":"rgba(10,18,6,.35)"}"/>`;
  }
  g.innerHTML = out;
})();

/* ---------- render all ---------- */
function renderAll(){
  renderStatic(); renderNav(); renderTop(); renderChips(); renderFilters(); renderGrid(); renderAreas(); renderCorrNote();
  buildTiles(); updateHero(false);
}

/* ---------- events ---------- */
document.querySelectorAll(".js-lang").forEach(b=>b.addEventListener("click",()=>{
  lang = lang==="ar" ? "en" : "ar";
  try{ localStorage.setItem("shno_lang",lang); }catch(e){}
  renderAll();
}));

$("#searchForm").addEventListener("submit",e=>{
  e.preventDefault();
  state.q = $("#q").value.trim(); renderGrid();
  $("#menu").scrollIntoView({behavior:"smooth"});
});
$("#q").addEventListener("input",e=>{ state.q = e.target.value.trim(); renderGrid(); });

$("#chips").addEventListener("click",e=>{
  const b = e.target.closest("[data-cat]"); if(!b) return;
  state.cat = b.dataset.cat; renderChips(); renderGrid();
});
[["fArea","area"],["fCafe","cafe"],["fPrice","price"],["fType","type"]].forEach(([id,key])=>{
  $("#"+id).addEventListener("change",e=>{ state[key]=e.target.value; renderGrid(); });
});
$("#resetBtn").addEventListener("click",()=>{
  Object.assign(state,{q:"",cat:"all",area:"all",cafe:"all",price:"all",type:"all"});
  $("#q").value=""; renderChips(); renderFilters(); renderGrid();
});

$("#areaTiles").addEventListener("click",e=>{
  const b = e.target.closest("[data-area]"); if(!b) return;
  state.area = b.dataset.area; $("#fArea").value = state.area; renderGrid();
  $("#menu").scrollIntoView({behavior:"smooth"});
});

document.addEventListener("click",e=>{
  const b = e.target.closest("[data-correct]"); if(!b) return;
  correcting = ITEMS.find(i=>i.id===b.dataset.correct);
  $("#sCafe").value = correcting.cafe;
  $("#sOrder").value = itemName(correcting);
  $("#sArea").value = correcting.area;
  $("#sPrice").value = correcting.price.toFixed(3);
  $("#submitForm").hidden = false; $("#submitOk").hidden = true;
  renderCorrNote();
  $("#submit").scrollIntoView({behavior:"smooth"});
});
$("#footCorr").addEventListener("click",()=>{ correcting=null; renderCorrNote(); });

$("#submitForm").addEventListener("submit",e=>{ e.preventDefault(); $("#submitForm").hidden = true; $("#submitOk").hidden = false; });
$("#submitAgain").addEventListener("click",()=>{
  $("#submitForm").reset(); correcting=null; renderCorrNote();
  $("#submitForm").hidden = false; $("#submitOk").hidden = true;
});
$("#waitForm").addEventListener("submit",e=>{ e.preventDefault(); $("#waitForm").hidden = true; $("#waitOk").hidden = false; });

/* hero interactions */
tilesEl.addEventListener("click",e=>{
  const b = e.target.closest(".tile"); if(!b || swiped) return;
  setActive(+b.dataset.i, true);
});
$("#priceTile").addEventListener("click",()=>focusItem(TOP[active].id));
let sx = null;
stage.addEventListener("pointerdown",e=>{ sx = e.clientX; });
stage.addEventListener("pointerup",e=>{
  if(sx===null) return; const dx = e.clientX - sx; sx = null;
  if(Math.abs(dx) > 40){ swiped = true; setTimeout(()=>swiped=false,60); setActive(active + (dx<0 ? 1 : -1), true); }
});
stage.addEventListener("pointercancel",()=>{ sx = null; });
stage.addEventListener("keydown",e=>{
  if(e.key==="ArrowLeft"){ e.preventDefault(); setActive(active-1,true); }
  if(e.key==="ArrowRight"){ e.preventDefault(); setActive(active+1,true); }
});
stage.addEventListener("mouseenter",()=>hovering=true);
stage.addEventListener("mouseleave",()=>hovering=false);
if("ResizeObserver" in window) new ResizeObserver(placeTiles).observe(stage); else window.addEventListener("resize",placeTiles);

/* autoplay (off for reduced motion) */
if(!matchMedia("(prefers-reduced-motion: reduce)").matches){
  setInterval(()=>{
    if(hovering || !heroVisible || document.hidden || Date.now()-lastUser < 6000) return;
    if(stage.contains(document.activeElement) && document.activeElement!==stage) return;
    setActive(active+1,false);
  }, 3600);
}

/* dock visibility + scroll-spy */
if("IntersectionObserver" in window){
  new IntersectionObserver(([en])=>{
    heroVisible = en.isIntersecting;
    $("#dock").classList.toggle("show", !en.isIntersecting);
  },{threshold:.12}).observe($("#heroFrame"));
  const spyMap = {top10:"menu",menu:"menu",areas:"areas",submit:"submit",waitlist:"waitlist"};
  const spy = new IntersectionObserver(es=>{
    es.forEach(en=>{ if(en.isIntersecting) setSpy(spyMap[en.target.id]); });
  },{rootMargin:"-40% 0px -55% 0px"});
  Object.keys(spyMap).forEach(id=>spy.observe(document.getElementById(id)));
}

$("#yr").textContent = new Date().getFullYear();
renderAll();

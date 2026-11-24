/* AM Nieruchomości – skrypt strony. Źródło: zrodla/statyczne/strona/js/strona.js
   Teksty i adresy przychodzą z <script id="dane-strony"> (budowane z treści strony),
   więc ten plik jest wspólny dla wszystkich wersji językowych. */
(function(){
"use strict";
var D = JSON.parse(document.getElementById("dane-strony").textContent);
var T = D.teksty, JEZYK = D.jezyk;
var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var doc = document.documentElement, body = document.body;

function fmt(s, w){ return String(s).replace(/\{(\w+)\}/g, function(m, k){ return w && w[k] != null ? w[k] : m; }); }
var PR = window.Intl && Intl.PluralRules ? new Intl.PluralRules(JEZYK) : null;
function odm(n, formy){ var k = PR ? PR.select(n) : (n === 1 ? "one" : "other"); return formy[k] || formy.other; }

/* ---------- intro ---------- */
function ready(){ body.classList.add("ready"); startHero(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ layout(); }); }
if (RM || doc.classList.contains("seen")) { setTimeout(ready, 0); } else { setTimeout(ready, 1250); }

/* ---------- nawigacja ---------- */
var nav = document.getElementById("nav"), prog = document.getElementById("progress");
var burger = document.getElementById("burger"), menu = document.getElementById("menu");
function menuOtworz(o){
  burger.setAttribute("aria-expanded", String(o)); menu.classList.toggle("open", o); nav.classList.toggle("open", o);
  body.style.overflow = o ? "hidden" : "";
}
burger.addEventListener("click", function(){ menuOtworz(burger.getAttribute("aria-expanded") !== "true"); });
menu.addEventListener("click", function(e){ var a = e.target.closest("a"); if (a && a.getAttribute("href").charAt(0) === "#") menuOtworz(false); });
document.addEventListener("keydown", function(e){
  if (!menu.classList.contains("open")) return;
  if (e.key === "Escape"){ menuOtworz(false); burger.focus(); return; }
  if (e.key === "Tab"){
    /* menu zasłania cały ekran: Tab krąży między przyciskiem menu a jego linkami */
    var el = [burger].concat([].slice.call(menu.querySelectorAll("a")));
    var i = el.indexOf(document.activeElement), n = e.shiftKey ? i - 1 : i + 1;
    if (i === -1 || n < 0 || n >= el.length){ e.preventDefault(); el[i === -1 ? 0 : (n < 0 ? el.length - 1 : 0)].focus(); }
  }
});

/* ---------- hero canvas: rzut mieszkania + skanowanie ---------- */
var cv = document.getElementById("plan"), ctx = cv.getContext("2d");
var W=0,H=0,DPR=1, box={x:0,y:0,s:1};
// rzut w jednostkach 100 x 70
var walls = [
 [0,0,100,0],[100,0,100,70],[100,70,0,70],[0,70,0,0],
 [40,0,40,26],[40,34,40,70],
 [40,40,60,40],[68,40,100,40],
 [72,40,72,56],[72,63,72,70],
 [0,48,12,48],[20,48,28,48],[28,48,28,70],
 [60,0,60,14],[60,22,60,40]
];
var windows = [[8,0,30,0],[48,0,56,0],[74,0,94,0],[100,10,100,32],[100,48,100,62],[0,14,0,34]];
var arcs = [[40,26,8,Math.PI*0.5,Math.PI],[60,40,8,Math.PI,Math.PI*1.5],[12,48,8,0,Math.PI*0.5],[72,56,7,Math.PI*1.5,Math.PI*2],[60,14,8,Math.PI*0.5,Math.PI]];
var segs=[], total=0;
walls.forEach(function(w){ var l=Math.hypot(w[2]-w[0],w[3]-w[1]); segs.push({t:"w",p:w,l:l}); total+=l; });
windows.forEach(function(w){ var l=Math.hypot(w[2]-w[0],w[3]-w[1]); segs.push({t:"g",p:w,l:l}); total+=l; });
arcs.forEach(function(a){ var l=a[2]*(a[4]-a[3]); segs.push({t:"a",p:a,l:l}); total+=l; });
var mouse={x:0,y:0,tx:0,ty:0};
function layout(){
  DPR=Math.min(window.devicePixelRatio||1,2);
  W=cv.clientWidth; H=cv.clientHeight; cv.width=W*DPR; cv.height=H*DPR;
  ctx.setTransform(DPR,0,0,DPR,0,0);
  var mobile = W<900;
  var bw, s;
  if (mobile){ bw = Math.min(W*0.9, 620); s = bw/100; box.x = (W-bw)/2; }
  else {
    var wr = document.querySelector(".hero .wrap"), wb = wr.getBoundingClientRect(), pd = parseFloat(getComputedStyle(wr).paddingRight) || 0, cb = cv.getBoundingClientRect();
    var innerL = wb.left + pd, innerR = wb.right - pd, colW = (innerR - innerL - 40) * 0.95 / 2;
    s = Math.min(colW, 640) / 108; bw = 100*s;
    box.x = innerR - cb.left - 108*s;
  }
  box.s=s; box.y = (H-70*s)/2 - 20;
  if (mobile){
    var ck=document.querySelector(".check"), hr=document.getElementById("top").getBoundingClientRect(), cr=ck.getBoundingClientRect();
    box.y = (cr.top - hr.top) - 70*s*0.66;
    box.x = Math.max(12,(W-bw)/2 - W*0.02);
  }
  cv.style.opacity = 1;
}
function P(x,y){ return [box.x + x*box.s + mouse.x*(y/70-0.5)*6, box.y + y*box.s + mouse.y*(x/100-0.5)*6]; }
function grid(){
  ctx.strokeStyle="rgba(232,229,222,0.035)"; ctx.lineWidth=1; ctx.beginPath();
  var step = box.s*5;
  for (var x=box.x%step; x<W; x+=step){ ctx.moveTo(x,0); ctx.lineTo(x,H); }
  for (var y=box.y%step; y<H; y+=step){ ctx.moveTo(0,y); ctx.lineTo(W,y); }
  ctx.stroke();
}
function drawSeg(sg, frac){
  var p=sg.p;
  if (sg.t==="a"){
    var c=P(p[0],p[1]); ctx.beginPath(); ctx.setLineDash([2,4]);
    ctx.arc(c[0],c[1],p[2]*box.s,p[3],p[3]+(p[4]-p[3])*frac); ctx.stroke(); ctx.setLineDash([]); return;
  }
  var a=P(p[0],p[1]), b=P(p[0]+(p[2]-p[0])*frac, p[1]+(p[3]-p[1])*frac);
  ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke();
}
function dims(alpha){
  ctx.save(); ctx.globalAlpha=alpha*0.55; ctx.strokeStyle="#6E5721"; ctx.lineWidth=1;
  var a=P(0,-6), b=P(100,-6); ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]);
  [0,40,60,100].forEach(function(x){ var t=P(x,-8), u=P(x,-4); ctx.moveTo(t[0],t[1]); ctx.lineTo(u[0],u[1]); });
  var c=P(106,0), d=P(106,70); ctx.moveTo(c[0],c[1]); ctx.lineTo(d[0],d[1]);
  [0,40,70].forEach(function(y){ var t=P(104,y), u=P(108,y); ctx.moveTo(t[0],t[1]); ctx.lineTo(u[0],u[1]); });
  ctx.stroke(); ctx.restore();
}
var t0=null, items=[].slice.call(document.querySelectorAll("#checklist li"));
var DRAW=2600, SCAN=2600, PAUSE=5200;
function frame(ts){
  if (!t0) t0=ts; var t=ts-t0;
  mouse.x += (mouse.tx-mouse.x)*0.06; mouse.y += (mouse.ty-mouse.y)*0.06;
  ctx.clearRect(0,0,W,H); grid();
  var p = RM ? 1 : Math.min(t/DRAW,1); p = 1-Math.pow(1-p,3);
  var len = p*total, acc=0;
  ctx.lineCap="square";
  for (var i=0;i<segs.length;i++){
    var sg=segs[i]; if (acc>=len) break;
    var f=Math.min((len-acc)/sg.l,1);
    ctx.strokeStyle = sg.t==="w" ? "#C8A44D" : "rgba(230,206,148,0.7)";
    ctx.lineWidth = sg.t==="w" ? 2 : 1;
    if (sg.t==="g"){ ctx.save(); ctx.lineWidth=1; drawSeg(sg,f); var q=sg.p; var o=1.4; var s2={t:"g",p:[q[0]+(q[1]===q[3]? 0:(q[0]===100?-o:o)), q[1]+(q[1]===q[3]? (q[1]===70?-o:o):0), q[2]+(q[1]===q[3]? 0:(q[0]===100?-o:o)), q[3]+(q[1]===q[3]? (q[1]===70?-o:o):0)]}; drawSeg(s2,f); ctx.restore(); }
    else drawSeg(sg,f);
    acc+=sg.l;
  }
  dims(p);
  // skan
  if (!RM && t>DRAW){
    var cyc=(t-DRAW)%(SCAN+PAUSE), first = (t-DRAW)<(SCAN+PAUSE);
    if (cyc<SCAN){
      var k=cyc/SCAN, y=-4+k*78, a=P(-6,y), b=P(112,y);
      var g=ctx.createLinearGradient(0,a[1]-40,0,a[1]);
      g.addColorStop(0,"rgba(200,164,77,0)"); g.addColorStop(1,"rgba(200,164,77,0.10)");
      ctx.fillStyle=g; ctx.fillRect(a[0],a[1]-40,b[0]-a[0],40);
      ctx.strokeStyle="rgba(230,206,148,0.85)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke();
      if (first){ var n=Math.floor(k*items.length+0.2); for (var j=0;j<items.length;j++) if (j<n) items[j].classList.add("on"); }
    } else if (first) items.forEach(function(li){ li.classList.add("on"); });
  }
  // węzły
  var nodes=[[0,0],[100,0],[100,70],[0,70],[40,0],[40,70],[60,40],[100,40],[72,70],[28,70]];
  ctx.fillStyle="#E6CE94";
  nodes.forEach(function(n,i){ var q=P(n[0],n[1]); var r = 1.6 + (RM?0: Math.sin(t/900+i)*0.6); ctx.globalAlpha=p; ctx.beginPath(); ctx.arc(q[0],q[1],Math.max(r,0.5),0,7); ctx.fill(); });
  ctx.globalAlpha=1;
  if (!RM || t<50) raf=requestAnimationFrame(frame);
}
var raf=null, heroVisible=true;
function startHero(){
  layout();
  if (RM){ items.forEach(function(li){ li.classList.add("on"); }); frame(performance.now()); return; }
  raf=requestAnimationFrame(frame);
}
window.addEventListener("resize", function(){ layout(); if (RM) frame(performance.now()); });
window.addEventListener("pointermove", function(e){ if (e.pointerType!=="mouse") return; mouse.tx=(e.clientX/window.innerWidth-.5)*2; mouse.ty=(e.clientY/window.innerHeight-.5)*2; }, {passive:true});
if ("IntersectionObserver" in window){
  new IntersectionObserver(function(en){ en.forEach(function(x){
    if (RM) return;
    if (x.isIntersecting && !heroVisible){ heroVisible=true; raf=requestAnimationFrame(frame); }
    else if (!x.isIntersecting){ heroVisible=false; cancelAnimationFrame(raf); }
  }); }).observe(document.getElementById("top"));
}


/* ---------- porównanie ---------- */
var cmp = document.getElementById("cmp"), cbox = document.getElementById("compare");
if (cmp && cbox){
  var ustawCut = function(v){ cbox.style.setProperty("--cut", v + "%"); cmp.setAttribute("aria-valuetext", fmt(T.suwak_wartosc, { p: Math.round(100 - v) })); };
  var base = window.innerWidth < 700 ? 18 : 50; cmp.value = base; ustawCut(base);
  cmp.addEventListener("input", function(){ ustawCut(cmp.value); });
  if (!RM && "IntersectionObserver" in window){
    var nudged = false;
    new IntersectionObserver(function(en, ob){ en.forEach(function(x){ if (x.isIntersecting && !nudged){ nudged = true; ob.disconnect();
      var st = null; var a = function(ts){ if (!st) st = ts; var k = Math.min((ts - st) / 1600, 1); var v = base + Math.sin(k * Math.PI) * (base < 30 ? 40 : -22); cmp.value = v; cbox.style.setProperty("--cut", v + "%"); if (k < 1) requestAnimationFrame(a); else ustawCut(base); }; requestAnimationFrame(a);
    } }); }, { threshold: .6 }).observe(cbox);
  }
}

/* ---------- przewijanie: postęp, nawigacja, kroki, spis treści, hasło, liczniki ---------- */
var steps = document.getElementById("steps"), stepLis = steps ? [].slice.call(steps.querySelectorAll("li")) : [];
var toc = [].slice.call(document.querySelectorAll("#toc li")), motto = document.querySelector("#motto p");
var counted = false, kpis = [].slice.call(document.querySelectorAll("[data-count]"));
var ticking = false;
function onScroll(){
  ticking = false;
  var y = window.scrollY, vh = window.innerHeight, max = doc.scrollHeight - vh;
  prog.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
  nav.classList.toggle("solid", y > 40);
  if (steps){
    var r = steps.getBoundingClientRect(), sp = Math.min(Math.max((vh * 0.62 - r.top) / r.height, 0), 1);
    steps.style.setProperty("--p", RM ? 1 : sp);
    stepLis.forEach(function(li){ li.classList.toggle("on", RM || li.getBoundingClientRect().top < vh * 0.62); });
  }
  toc.forEach(function(li){ if (li.getBoundingClientRect().top < vh * 0.92) li.classList.add("in"); });
  if (motto){ var mr = motto.getBoundingClientRect(), mp = Math.min(Math.max((vh * 0.85 - mr.top) / (vh * 0.6), 0), 1); motto.style.setProperty("--f", (mp * 100).toFixed(1) + "%"); }
  if (!counted && kpis.length && kpis[0].getBoundingClientRect().top < vh * 0.85){ counted = true; countUp(); }
}
function countUp(){
  kpis.forEach(function(el){ var n = +el.dataset.count; if (RM){ el.textContent = n; return; }
    var st = null; var a = function(ts){ if (!st) st = ts; var k = Math.min((ts - st) / 1400, 1); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(a); }; requestAnimationFrame(a); });
}
window.addEventListener("scroll", function(){ if (!ticking){ ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
kpis.forEach(function(el){ if (!RM) el.textContent = "0"; });
onScroll();

/* ---------- zakładki formularza ---------- */
var tabs = [document.getElementById("t-sell"), document.getElementById("t-buy")].filter(Boolean);
function selTab(which){
  tabs.forEach(function(t){ var on = t.id === "t-" + which; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; document.getElementById(t.getAttribute("aria-controls")).hidden = !on; });
}
tabs.forEach(function(t, i){
  t.addEventListener("click", function(){ selTab(t.id.slice(2)); });
  t.addEventListener("keydown", function(e){ if (e.key === "ArrowRight" || e.key === "ArrowLeft"){ var n = tabs[(i + 1) % 2]; n.focus(); selTab(n.id.slice(2)); } });
});
if (tabs.length) selTab("sell");
var ofertaZapytanie = "";
document.addEventListener("click", function(e){
  var a = e.target.closest("[data-tab]"); if (!a || !tabs.length) return;
  selTab(a.dataset.tab);
  if (a.dataset.hard){ var r = document.querySelector('#f-sell input[name="sprawa"][value="sprawa_trudna"]'); if (r) r.checked = true; }
  if (a.dataset.raport){ var q = document.querySelector('#f-buy input[name="cel"][value="raport"]'); if (q) q.checked = true; }
});

/* ---------- formularze ---------- */
var CZAS_START = Date.now();
var fs = document.getElementById("f-sell"), fb = document.getElementById("f-buy");
var cur = 1, fsteps = fs ? [].slice.call(fs.querySelectorAll(".fstep")) : [], bars = fs ? [].slice.call(fs.querySelectorAll(".stepper i")) : [];
function go(n){
  cur = n; fsteps.forEach(function(s){ s.classList.toggle("cur", +s.dataset.step === n); });
  bars.forEach(function(b, i){ b.classList.toggle("done", i < n); });
  document.getElementById("sell-live").textContent = fmt(T.krok, { n: n });
  var f = fs.querySelector(".fstep.cur input:not([type=radio]), .fstep.cur select"); if (f && n > 1) f.focus();
}
function req(el){ var ok = el.type === "checkbox" ? el.checked : el.value.trim().length > 0; el.setAttribute("aria-invalid", ok ? "false" : "true"); return ok; }
function wybrany(form, nazwa){ var el = form.querySelector('[name="' + nazwa + '"]:checked'); return el ? el.value : ""; }
if (fs) fs.addEventListener("click", function(e){
  if (e.target.closest("[data-next]")){
    if (cur === 2){ var l = fs.elements.lokalizacja; if (!req(l)){ document.getElementById("e2").textContent = T.blad_lokalizacja; l.focus(); return; } document.getElementById("e2").textContent = ""; }
    go(Math.min(cur + 1, 3));
  }
  if (e.target.closest("[data-prev]")) go(Math.max(cur - 1, 1));
});
function sprawdz(form, err){
  var E = form.elements, tel = E.telefon.value.trim(), mail = E.email.value.trim();
  [E.imie, E.telefon, E.email].forEach(function(x){ x.setAttribute("aria-invalid", "false"); });
  var okImie = req(E.imie), okZgoda = req(E.zgoda);
  if (!okImie || (!tel && !mail)){
    if (!tel && !mail){ E.telefon.setAttribute("aria-invalid", "true"); E.email.setAttribute("aria-invalid", "true"); }
    err.textContent = T.blad_brak; (okImie ? E.telefon : E.imie).focus(); return false;
  }
  if (tel && tel.replace(/[^\d]/g, "").length < 9){ E.telefon.setAttribute("aria-invalid", "true"); err.textContent = T.blad_telefon; E.telefon.focus(); return false; }
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)){ E.email.setAttribute("aria-invalid", "true"); err.textContent = T.blad_email; E.email.focus(); return false; }
  if (!okZgoda){ err.textContent = T.blad_zgoda; E.zgoda.focus(); return false; }
  err.textContent = ""; return true;
}
function daneZapytania(form){
  var E = form.elements, F = D.formularz, sprzedaz = form === fs;
  var dane = {
    rodzaj: sprzedaz ? "sprzedaz_najem" : "kupno",
    jezyk: JEZYK,
    imie: E.imie.value.trim(),
    telefon: E.telefon.value.trim(),
    email: E.email.value.trim(),
    zgoda: E.zgoda.checked,
    zgoda_tekst: T.zgoda_tekst,
    strona_www: E.strona_www.value,
    czas_wypelniania_ms: Date.now() - CZAS_START,
    zrodlo: location.href.split("#")[0]
  };
  var linie;
  if (sprzedaz){
    dane.sprawa = wybrany(form, "sprawa"); dane.nieruchomosc = wybrany(form, "rodzaj");
    dane.lokalizacja = E.lokalizacja.value.trim(); dane.metraz = E.metraz.value.trim();
    dane.sytuacja = E.sytuacja.value; dane.wiadomosc = E.wiadomosc.value.trim();
    linie = [
      [T.pola.sprawa, F.sprawy[dane.sprawa]], [T.pola.rodzaj, F.rodzaje[dane.nieruchomosc]],
      [T.pola.lokalizacja, dane.lokalizacja], [T.pola.metraz, dane.metraz ? dane.metraz + " " + T.m2 : T.nie_podano],
      [T.pola.sytuacja, F.sytuacje[dane.sytuacja]], [T.pola.wiadomosc, dane.wiadomosc || "–"]
    ];
    dane.temat = fmt(T.temat, { opis: F.sprawy[dane.sprawa] + ", " + F.rodzaje[dane.nieruchomosc].toLowerCase() });
  } else {
    dane.cel = wybrany(form, "cel"); dane.nieruchomosc = E.rodzaj.value;
    dane.lokalizacja = E.lokalizacja.value.trim(); dane.kryteria = E.kryteria.value.trim();
    dane.oferta = ofertaZapytanie;
    linie = [
      [T.pola.cel, F.cele[dane.cel]], [T.pola.rodzaj, F.rodzaje[dane.nieruchomosc]],
      [T.pola.lokalizacja, dane.lokalizacja || "–"], [T.pola.kryteria, dane.kryteria || "–"]
    ];
    dane.temat = fmt(T.temat, { opis: F.cele[dane.cel] });
  }
  linie.push(["", ""], [T.pola.imie, dane.imie]);
  if (dane.telefon) linie.push([T.pola.telefon, dane.telefon]);
  if (dane.email) linie.push([T.pola.email, dane.email]);
  linie.push(["", ""], ["", T.zgoda_tekst]);
  var tekst = linie.map(function(l){ return l[0] ? l[0] + ": " + l[1] : l[1]; }).join("\n");
  return { dane: dane, tekst: tekst };
}
function el(tag, cls, tekst){ var e = document.createElement(tag); if (cls) e.className = cls; if (tekst != null) e.textContent = tekst; return e; }
function pokazWynik(form, tryb, z){
  var d = document.getElementById(form === fs ? "d-sell" : "d-buy");
  d.textContent = "";
  var tytul = { wyslane: T.wyslane_tytul, poczta: T.poczta_tytul, podglad: T.podglad_tytul }[tryb];
  var opis = { wyslane: T.wyslane_tekst, poczta: T.poczta_tekst, podglad: T.podglad_tekst }[tryb];
  d.appendChild(el("h3", null, tytul)); d.appendChild(el("p", null, opis));
  if (tryb === "podglad") d.appendChild(el("pre", null, z.dane.temat + "\n\n" + z.tekst));
  var btns = el("div", "btns");
  if (tryb === "poczta"){
    var m = el("a", "btn", T.poczta_przycisk);
    m.href = "mailto:" + D.email + "?subject=" + encodeURIComponent(z.dane.temat) + "&body=" + encodeURIComponent(z.tekst);
    btns.appendChild(m);
  }
  var n = el("button", "btn ghost", T.nowe); n.type = "button";
  n.addEventListener("click", function(){
    form.reset(); form.hidden = false; d.classList.remove("show"); d.textContent = ""; ofertaZapytanie = "";
    if (form === fs) go(1);
    var pierwsze = form.querySelector("input:not([type=radio]):not([type=hidden]), select"); if (pierwsze && form !== fs) pierwsze.focus();
  });
  btns.appendChild(n); d.appendChild(btns);
  form.hidden = true; d.classList.add("show"); d.focus();
}
function wyslij(form, err){
  if (!sprawdz(form, err)) return;
  var z = daneZapytania(form);
  if (z.dane.strona_www){ pokazWynik(form, "wyslane", z); return; }
  var adres = D.program && D.program.zapytania;
  if (!adres){ pokazWynik(form, D.email ? "poczta" : "podglad", z); return; }
  var przycisk = form.querySelector('[type="submit"]'), napis = przycisk.textContent;
  przycisk.setAttribute("aria-busy", "true"); przycisk.textContent = T.wysylanie;
  fetch(adres, { method: "POST", mode: "cors", credentials: "omit", headers: { "Content-Type": "application/json" }, body: JSON.stringify(z.dane) })
    .then(function(r){ if (!r.ok) throw new Error(r.status); pokazWynik(form, "wyslane", z); })
    .catch(function(){ err.textContent = T.blad_wysylki; if (D.email) pokazWynik(form, "poczta", z); })
    .then(function(){ przycisk.removeAttribute("aria-busy"); przycisk.textContent = napis; });
}
if (fs) fs.addEventListener("submit", function(e){ e.preventDefault(); wyslij(fs, document.getElementById("e3")); });
if (fb) fb.addEventListener("submit", function(e){ e.preventDefault(); wyslij(fb, document.getElementById("e-buy")); });

/* ---------- okna ---------- */
document.addEventListener("click", function(e){
  var o = e.target.closest("[data-open]"); if (o){ e.preventDefault(); var d = document.getElementById(o.dataset.open); if (d && d.showModal && !d.open) d.showModal(); }
  var c = e.target.closest("[data-close]"); if (c){ c.closest("dialog").close(); }
  if (e.target.tagName === "DIALOG") e.target.close();
});

/* ---------- wejścia sekcji, karty usług, spis raportu, pasek akcji ---------- */
(function(){
  var sel = ".rules .rule-i, .sec .kicker, .sec h2, .sec .lede, .sec .split-h > div > p, .compare, .caption, .svc-row, .report-grid > div > p, .nots li, .sheet, .proc-sticky > *, .weekly, .hard p, .hard .btn, .cases li, .about .people > div, .never div, .motto small, details, .cdata div, .formcard, .foot > div, .rimg, .krakow-karty li, .obszar-g";
  var els = [].slice.call(document.querySelectorAll(sel)).filter(function(e){ return !e.closest(".hero") && !e.closest("dialog"); });
  els.forEach(function(e){ if (!e.classList.contains("rimg")) e.classList.add("rv"); });
  if (RM || !("IntersectionObserver" in window)){ els.forEach(function(e){ e.classList.add("in"); }); }
  else {
    var io = new IntersectionObserver(function(en){
      var batch = en.filter(function(x){ return x.isIntersecting; }).map(function(x){ return x.target; });
      batch.sort(function(a, b){ return a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left; });
      batch.forEach(function(t, k){ t.style.setProperty("--d", Math.min(k * 0.08, 0.48) + "s"); t.classList.add("in"); io.unobserve(t); });
    }, { rootMargin: "0px 0px -9% 0px", threshold: 0.01 });
    els.forEach(function(e){ io.observe(e); });
    var sweep = function(){ var vh = innerHeight; els.forEach(function(e){ if (!e.classList.contains("in") && e.getBoundingClientRect().top < vh * 0.95){ e.classList.add("in"); io.unobserve(e); } }); };
    var tS = false; addEventListener("scroll", function(){ if (!tS){ tS = true; setTimeout(function(){ tS = false; sweep(); }, 120); } }, { passive: true });
  }
  var svc = document.querySelector(".svc"), dots = [].slice.call(document.querySelectorAll(".svc-dots button")), cnt = document.querySelector(".svc-count");
  if (svc && dots.length){
    var rows = [].slice.call(svc.querySelectorAll(".svc-row"));
    var upd = function(){ var sl = svc.scrollLeft, w = rows[0].offsetWidth + 12, k = Math.round(sl / w); k = Math.max(0, Math.min(rows.length - 1, k));
      dots.forEach(function(d, i){ d.setAttribute("aria-current", String(i === k)); }); cnt.textContent = fmt(D.uslugi_licznik, { n: k + 1, m: rows.length }); };
    svc.addEventListener("scroll", function(){ requestAnimationFrame(upd); }, { passive: true });
    dots.forEach(function(d, i){ d.addEventListener("click", function(){ rows[i].scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "nearest", inline: "start" }); }); });
  }
  var tm = document.getElementById("tocMore"), sh = document.querySelector(".sheet");
  if (tm && sh){ tm.addEventListener("click", function(){ var o = sh.classList.toggle("exp"); tm.setAttribute("aria-expanded", String(o)); tm.textContent = o ? D.raport.zwin : D.raport.wiecej; }); }
  var wk = document.getElementById("wk"); if (wk && window.innerWidth <= 900) wk.removeAttribute("open");
  var mc = document.getElementById("mcta"), hero = document.getElementById("top"), kon = document.getElementById("kontakt");
  if (mc && hero && kon){
    var tickM = false;
    var m = function(){ tickM = false; var vh = innerHeight; var past = hero.getBoundingClientRect().bottom < vh * 0.35; var nearK = kon.getBoundingClientRect().top < vh;
      mc.classList.toggle("show", past && !nearK && !menu.classList.contains("open")); };
    addEventListener("scroll", function(){ if (!tickM){ tickM = true; requestAnimationFrame(m); } }, { passive: true });
    m();
    mc.querySelectorAll("a").forEach(function(a){ a.addEventListener("click", function(){ mc.classList.remove("show"); }); });
  }
})();

/* ---------- oferty z programu biura (Moja Agencja) ---------- */
(function(){
  var lista = document.getElementById("oferty-lista"); if (!lista || !D.program || !D.program.oferty || !window.fetch) return;
  var LOC = { pl: "pl-PL", en: "en-GB", uk: "uk-UA" }[JEZYK] || "pl-PL";
  var zl = new Intl.NumberFormat(LOC, { maximumFractionDigits: 0 });
  var dz = new Intl.NumberFormat(LOC, { maximumFractionDigits: 2 });
  var oferty = [];
  function kod(s){ return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l"); }
  function typ(o){ return T.typy[o.typ] || o.typ_nazwa || T.typy.inne; }
  function tryb(o){ return T.tryby[o.tryb] || String(o.tryb_nazwa || "").toLowerCase(); }
  function rynek(o){ var k = o.rynek_kod || kod(o.rynek); return T.rynki[k] || o.rynek; }
  function tytul(o){ return (JEZYK === "pl" ? o.tytul : o.tytuly && o.tytuly[JEZYK]) || [typ(o), metraz(o)].filter(Boolean).join(", "); }
  function opis(o){ return JEZYK === "pl" ? o.opis : (o.opisy && o.opisy[JEZYK]) || o.opis; }
  function metraz(o){ return o.powierzchnia ? dz.format(o.powierzchnia) + "\u00a0" + T.m2 : ""; }
  function kwota(o){ return o.tryb === "najem" ? (o.czynsz ? zl.format(o.czynsz) + " " + T.miesiecznie : "") : (o.cena ? zl.format(o.cena) + " " + T.zl : ""); }
  function pietro(o, krotko){
    if (o.pietro == null) return "";
    var n = o.pietro, m = o.liczba_pieter;
    if (T.pietra_od_jedynki){ n += 1; if (m) m += 1; }   /* w Ukrainie parter to „перший поверх” */
    var p = o.pietro === 0 ? T.parter : (krotko ? String(n) : fmt(T.pietro, { n: n }));
    return m ? fmt(T.z_pieter, { n: p, m: m }) : p;
  }
  function parametry(o){
    var p = []; if (o.powierzchnia) p.push(metraz(o));
    if (o.pokoje) p.push(o.pokoje + " " + odm(o.pokoje, T.pokoje));
    if (o.pietro != null) p.push(pietro(o, false));
    return p.join(" · ");
  }
  function miejsce(o){ return [o.ulica, o.miejscowosc].filter(Boolean).join(", "); }
  function link(o){ return location.origin + location.pathname + "#oferta-" + o.numer; }
  function pokaz(o){
    var d = document.getElementById("dlg-oferta"), t = document.getElementById("do-tresc");
    document.getElementById("do-t").textContent = tytul(o);
    t.textContent = "";
    if (o.zdjecia && o.zdjecia.length){
      var g = el("div", "gal"); o.zdjecia.forEach(function(z, i){ var im = el("img"); im.src = z.url; im.alt = tytul(o) + ", " + fmt(T.zdjecie, { n: i + 1 }); im.loading = "lazy"; im.decoding = "async"; im.onerror = function(){ im.remove(); }; g.appendChild(im); }); t.appendChild(g);
      if (o.zdjecia.some(function(z){ return z.ai; })) t.appendChild(el("p", "ai", T.ai_oferta));
    }
    t.appendChild(el("p", "cena-d", kwota(o) + (o.cena_m2 ? " · " + zl.format(o.cena_m2) + " " + T.zl_m2 : "")));
    var E = T.etykiety, dl = el("dl");
    [[E.rodzaj, typ(o) + " · " + tryb(o)], [E.okolica, miejsce(o)], [E.powierzchnia, metraz(o)], [E.pokoje, o.pokoje], [E.pietro, pietro(o, true)], [E.rok, o.rok_budowy], [E.dzialka, o.powierzchnia_dzialki ? zl.format(o.powierzchnia_dzialki) + "\u00a0" + T.m2 : ""], [E.oplaty, o.oplaty_dodatkowe ? zl.format(o.oplaty_dodatkowe) + " " + T.miesiecznie : ""], [E.rynek, rynek(o)], [E.numer, o.numer]].forEach(function(p){
      if (p[1] === null || p[1] === undefined || p[1] === "") return; var w = el("div"); w.appendChild(el("dt", null, p[0])); w.appendChild(el("dd", null, String(p[1]))); dl.appendChild(w);
    });
    t.appendChild(dl);
    var op = opis(o);
    if (op){ if (JEZYK !== "pl" && T.opis_po_polsku && op === o.opis) t.appendChild(el("p", "uwaga-jezyk", T.opis_po_polsku)); t.appendChild(el("p", "opis", op)); }
    if (o.okolica){ var m = el("a", null, T.mapa); m.href = "https://www.openstreetmap.org/?mlat=" + o.okolica.lat + "&mlon=" + o.okolica.lon + "#map=15/" + o.okolica.lat + "/" + o.okolica.lon; m.target = "_blank"; m.rel = "noopener"; var pm = el("p", "muted"); pm.appendChild(m); pm.appendChild(document.createTextNode(". " + T.mapa_nota)); t.appendChild(pm); }
    var cta = el("div", "cta-row"), b = el("a", "btn", T.zapytaj); b.href = "#kontakt";
    b.addEventListener("click", function(){
      d.close(); selTab("buy"); ofertaZapytanie = o.numer;
      var f = document.getElementById("f-buy"); if (f){ f.elements.kryteria.value = fmt(T.zapytanie_oferta, { numer: o.numer, tytul: tytul(o) }); if (!f.elements.lokalizacja.value) f.elements.lokalizacja.value = miejsce(o); if (T.typy[o.typ] && f.elements.rodzaj.querySelector('option[value="' + o.typ + '"]')) f.elements.rodzaj.value = o.typ; }
    });
    var s = el("button", "btn ghost", T.udostepnij); s.type = "button";
    s.addEventListener("click", function(){
      var u = link(o);
      if (navigator.share){ navigator.share({ title: tytul(o), url: u }).catch(function(){}); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(u).then(function(){ s.textContent = T.skopiowano; setTimeout(function(){ s.textContent = T.udostepnij; }, 2200); });
    });
    cta.appendChild(b); cta.appendChild(s); t.appendChild(cta);
    if (history.replaceState) history.replaceState(null, "", "#oferta-" + o.numer);
    if (d.showModal && !d.open) d.showModal();
  }
  var dlg = document.getElementById("dlg-oferta");
  dlg.addEventListener("close", function(){ if (/^#oferta-/.test(location.hash) && history.replaceState) history.replaceState(null, "", location.pathname + location.search); });
  function karta(o){
    var k = el("button", "oferta-k"); k.type = "button";
    var f = el("div", "fot"); if (o.zdjecia && o.zdjecia.length){ var im = el("img"); im.src = o.zdjecia[0].url; im.alt = ""; im.loading = "lazy"; im.decoding = "async"; im.onerror = function(){ im.remove(); }; f.appendChild(im); }
    f.appendChild(el("span", "znak", typ(o) + " · " + tryb(o))); k.appendChild(f);
    var tr = el("div", "tr"); tr.appendChild(el("span", "cena", kwota(o))); tr.appendChild(el("span", "tyt", tytul(o)));
    tr.appendChild(el("span", "par", [parametry(o), miejsce(o)].filter(Boolean).join(" · "))); k.appendChild(tr);
    k.addEventListener("click", function(){ pokaz(o); });
    return k;
  }
  function zHasha(){ var m = /^#oferta-(.+)$/.exec(location.hash); if (!m) return; var o = oferty.filter(function(x){ return x.numer === decodeURIComponent(m[1]); })[0]; if (o) pokaz(o); }
  window.addEventListener("hashchange", zHasha);
  fetch(D.program.oferty, { mode: "cors", credentials: "omit" }).then(function(r){ return r.ok ? r.json() : null; }).then(function(dane){
    if (!dane || !dane.wlaczona) return;
    var liczby = (dane.statystyki && dane.statystyki.transakcje_w_roku || []).filter(function(x){ return x.liczba > 0; });
    if (liczby.length){
      var p = document.getElementById("oferty-liczby");
      p.textContent = liczby.slice(-3).reverse().map(function(x){ return fmt(T.transakcje_rok, { liczba: x.liczba, forma: odm(x.liczba, T.transakcje), rok: x.rok }); }).join(" · ");
      p.hidden = false;
    }
    if (!dane.oferty || !dane.oferty.length) return;
    oferty = dane.oferty;
    var h = document.getElementById("h-oferty"); h.textContent = h.dataset.aktualne || h.textContent;
    var op = document.getElementById("oferty-opis"); op.textContent = op.dataset.aktualne || op.textContent;
    oferty.forEach(function(o){ lista.appendChild(karta(o)); });
    lista.hidden = false;
    zHasha();
  }).catch(function(){});
})();

})();

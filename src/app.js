/* Cents Per Mile - all interaction. Depends on FLEET, GAS_PRESETS and
   KWH_PRESETS from data.js, which must load first. */
"use strict";

const KEY = "cents-per-mile/v1";

const state = {
  gas: 3.20,      // $ per gallon
  kwh: 0.170,     // $ per kWh
  miles: 12000,   // driven per year
  show: {ev:true, gas:true},
  baseline: null, // vehicle name, or null
  mine: [],       // user-added vehicles, same shape as FLEET entries
  newFuel: "gas"
};

/* ---------- vehicle math ---------- */

/* Miles per kWh is derived, never stored, so kwh100 stays the single source of truth. */
const milesPerKwh = v => 100 / v.kwh100;

function perMile(v){
  return v.f === "ev" ? state.kwh * v.kwh100 / 100 : state.gas / v.mpg;
}

function effLabel(v){
  return v.f === "ev" ? milesPerKwh(v).toFixed(1) + " mi/kWh" : v.mpg + " MPG";
}

/* The cost of one car restated in the other fuel's units: the MPG a gas car
   would need to match this EV, or the mi/kWh an EV would need to match this
   gas car. Both flip as soon as the prices change, which is the point. */
function equivalent(v){
  if(v.f === "ev"){
    if(state.kwh <= 0) return "cheaper than any gas car";
    const mpg = milesPerKwh(v) * state.gas / state.kwh;
    if(!isFinite(mpg) || mpg > 999) return "cheaper than any gas car";
    if(mpg < 1) return "pricier than any gas car";
    return "costs like a <b>" + Math.round(mpg) + " MPG</b> gas car";
  }
  if(state.gas <= 0) return "cheaper than any EV";
  const mk = v.mpg * state.kwh / state.gas;
  if(!isFinite(mk) || mk <= 0) return "cheaper than any EV";
  return "costs like an EV at <b>" + mk.toFixed(1) + " mi/kWh</b>";
}

const roster  = () => FLEET.concat(state.mine);
const visible = () => roster().filter(v => state.show[v.f]);

/* ---------- formatting ---------- */
const money = n => "$" + n.toLocaleString("en-US", {maximumFractionDigits:0});
const cents = n => (n * 100).toFixed(n < 0.1 ? 2 : 1);
const escapeHtml = s => String(s).replace(/[&<>"']/g,
  ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

/* ---------- persistence (never let a blocked store break the page) ---------- */
function save(){
  try{
    localStorage.setItem(KEY, JSON.stringify({
      gas:state.gas, kwh:state.kwh, miles:state.miles, mine:state.mine
    }));
  }catch(err){ /* private window or blocked storage: run without saving */ }
}

function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return;
    const d = JSON.parse(raw);
    if(typeof d.gas === "number")   state.gas = d.gas;
    if(typeof d.kwh === "number")   state.kwh = d.kwh;
    if(typeof d.miles === "number") state.miles = d.miles;
    if(Array.isArray(d.mine)){
      state.mine = d.mine.filter(v =>
        v && typeof v.n === "string" &&
        (v.f === "ev" ? typeof v.kwh100 === "number" : typeof v.mpg === "number"));
    }
  }catch(err){ /* unreadable saved state: fall back to defaults */ }
}

/* ---------- elements ---------- */
const chart = document.getElementById("chart");
const els = {
  gasPrice: document.getElementById("gasPrice"),
  gasRange: document.getElementById("gasRange"),
  kwhPrice: document.getElementById("kwhPrice"),
  kwhRange: document.getElementById("kwhRange"),
  miles:    document.getElementById("miles"),
  yrHead:   document.getElementById("yrHead"),
  hint:     document.getElementById("baselineHint"),
  mine:     document.getElementById("mine")
};

/* ---------- render ---------- */

function renderTiles(list){
  const set = (id, value, sub, klass) => {
    const el = document.getElementById(id);
    el.className = "card tile" + (klass ? " " + klass : "");
    el.querySelector(".v").innerHTML = value;
    el.querySelector(".sub").textContent = sub;
  };
  if(list.length < 2){
    set("tileBest",   "&mdash;", "Show both fuel types to compare", "");
    set("tileWorst",  "&mdash;", "Show both fuel types to compare", "");
    set("tileSpread", "&mdash;", "Show both fuel types to compare", "");
    return;
  }
  const best = list[0], worst = list[list.length - 1];
  set("tileBest",  cents(perMile(best))  + "<small>&cent;/mi</small>", best.n,  "is-" + best.f);
  set("tileWorst", cents(perMile(worst)) + "<small>&cent;/mi</small>", worst.n, "is-" + worst.f);
  const gap = (perMile(worst) - perMile(best)) * state.miles;
  set("tileSpread", money(gap) + "<small>/yr</small>",
      "over " + state.miles.toLocaleString("en-US") + " miles a year", "");
}

function render(){
  const list = visible().slice().sort((a, b) => perMile(a) - perMile(b));
  const max  = list.length ? Math.max(...list.map(perMile), 0.0001) : 1;
  const base = state.baseline ? roster().find(v => v.n === state.baseline) : null;

  els.yrHead.textContent = base ? "vs baseline" : "$ / year";
  els.hint.innerHTML = base
    ? 'Comparing against <b>' + escapeHtml(base.n) + '</b>. ' +
      '<button class="btn ghost small" type="button" id="clearBase">Clear</button>'
    : "Click any vehicle to compare the rest against it.";

  chart.innerHTML = "";

  if(!list.length){
    chart.innerHTML = '<p class="hint empty">No vehicles shown. Turn a fuel type back on above.</p>';
    renderTiles(list);
    return;
  }

  for(const v of list){
    const pm  = perMile(v);
    const yr  = pm * state.miles;
    const eff = effLabel(v);

    const row = document.createElement("button");
    row.type = "button";
    row.className = "row" + (base && base.n === v.n ? " is-baseline" : "");
    row.dataset.fuel = v.f;
    row.dataset.name = v.n;

    let right;
    if(base && base.n !== v.n){
      const d = yr - perMile(base) * state.miles;
      right = '<span class="y">' + (d >= 0 ? "+" : "−") + money(Math.abs(d)) + '</span>' +
              '<span class="d">' + (d >= 0 ? "more" : "less") + ' per year</span>';
    }else if(base){
      right = '<span class="y">' + money(yr) + '</span><span class="d">baseline</span>';
    }else{
      right = '<span class="y">' + money(yr) + '</span>' +
              '<span class="d">' + money(yr / 12) + '/mo</span>';
    }

    const yearTag = v.year ? v.year + " &middot; " : "";
    row.innerHTML =
      '<span class="who">' +
        '<span class="name">' + escapeHtml(v.n) + '</span>' +
        '<span class="spec">' + yearTag + eff + ' &middot; ' + equivalent(v) + '</span>' +
      '</span>' +
      '<span class="track"><span class="bar" style="width:' +
        (pm / max * 100).toFixed(2) + '%"></span></span>' +
      '<span class="permile">' + cents(pm) + '<em>&cent;</em></span>' +
      '<span class="peryear">' + right + '</span>';

    row.title =
      v.n + "  ·  " + eff + "\n" +
      (v.f === "ev"
        ? "$" + state.kwh.toFixed(3) + "/kWh × " + v.kwh100.toFixed(1) + " kWh/100mi"
        : "$" + state.gas.toFixed(2) + "/gal ÷ " + v.mpg + " MPG") +
      " = " + cents(pm) + "¢/mile\n" +
      cents(pm) + "¢ × " + state.miles.toLocaleString("en-US") +
      " mi = " + money(yr) + " per year" +
      (v.epa ? "\nEPA vehicle ID " + v.epa : "");

    row.setAttribute("aria-label",
      v.n + ", " + eff + ", " + cents(pm) + " cents per mile, " +
      money(yr) + " per year. Click to use as baseline.");

    chart.appendChild(row);
  }

  renderTiles(list);

  const clear = document.getElementById("clearBase");
  if(clear) clear.addEventListener("click", () => { state.baseline = null; render(); });
}

/* ---------- price controls: number field, slider and presets stay in sync ---------- */

function buildPresets(containerId, presets){
  const box = document.getElementById(containerId);
  for(const p of presets){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.dataset.v = p.v;
    b.textContent = p.label;
    box.appendChild(b);
  }
}

function syncPresets(id, value){
  for(const b of document.getElementById(id).querySelectorAll("button[data-v]")){
    b.setAttribute("aria-pressed", String(Math.abs(parseFloat(b.dataset.v) - value) < 0.0005));
  }
}

function bindPrice(numEl, rangeEl, key, decimals, presetsId){
  const push = (val, from) => {
    let v = parseFloat(val);
    if(!isFinite(v) || v < 0) v = 0;
    state[key] = v;
    if(from !== "num")   numEl.value   = v.toFixed(decimals);
    if(from !== "range") rangeEl.value = Math.min(parseFloat(rangeEl.max),
                                                  Math.max(parseFloat(rangeEl.min), v));
    syncPresets(presetsId, v);
    save();
    render();
  };
  numEl.addEventListener("input", () => push(numEl.value, "num"));
  numEl.addEventListener("blur",  () => push(numEl.value, "blur"));
  rangeEl.addEventListener("input", () => push(rangeEl.value, "range"));
  document.getElementById(presetsId).addEventListener("click", ev => {
    const b = ev.target.closest("button[data-v]");
    if(b) push(b.dataset.v, "preset");
  });
  return push;
}

/* ---------- your own cars ---------- */

function renderMine(){
  els.mine.innerHTML = "";
  if(!state.mine.length){
    els.mine.innerHTML =
      '<span class="hint">Your cars stay in this browser and are added to the chart above.</span>';
    return;
  }
  for(const v of state.mine){
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.innerHTML = escapeHtml(v.n) + " · " + effLabel(v) +
                  ' <span class="x" aria-hidden="true">✕</span>';
    b.setAttribute("aria-label", "Remove " + v.n);
    b.addEventListener("click", () => {
      state.mine = state.mine.filter(x => x.n !== v.n);
      if(state.baseline === v.n) state.baseline = null;
      save();
      renderMine();
      render();
    });
    els.mine.appendChild(b);
  }
}

/* ---------- wiring ---------- */

load();

buildPresets("gasPresets", GAS_PRESETS);
buildPresets("kwhPresets", KWH_PRESETS);

const pushGas = bindPrice(els.gasPrice, els.gasRange, "gas", 2, "gasPresets");
const pushKwh = bindPrice(els.kwhPrice, els.kwhRange, "kwh", 3, "kwhPresets");

els.miles.value = state.miles;
els.miles.addEventListener("input", () => {
  const v = parseInt(els.miles.value, 10);
  state.miles = isFinite(v) && v >= 0 ? v : 0;
  save();
  render();
});

document.getElementById("legend").addEventListener("click", ev => {
  const b = ev.target.closest("button[data-filter]");
  if(!b) return;
  const f = b.dataset.filter;
  // Never let both filters go off - the chart would have nothing to say.
  if(state.show[f] && !state.show[f === "ev" ? "gas" : "ev"]) return;
  state.show[f] = !state.show[f];
  b.setAttribute("aria-pressed", String(state.show[f]));
  if(state.baseline){
    const cur = roster().find(v => v.n === state.baseline);
    if(cur && !state.show[cur.f]) state.baseline = null;
  }
  render();
});

chart.addEventListener("click", ev => {
  const row = ev.target.closest(".row");
  if(!row) return;
  state.baseline = state.baseline === row.dataset.name ? null : row.dataset.name;
  render();
});

const seg      = document.getElementById("mySeg");
const effInput = document.getElementById("myEff");
const effTitle = document.getElementById("myEffLabel");

seg.addEventListener("click", ev => {
  const b = ev.target.closest("button[data-fuel]");
  if(!b) return;
  state.newFuel = b.dataset.fuel;
  for(const x of seg.querySelectorAll("button")) x.setAttribute("aria-pressed", String(x === b));
  effTitle.textContent   = state.newFuel === "ev" ? "mi / kWh" : "MPG";
  effInput.placeholder   = state.newFuel === "ev" ? "3.5" : "32";
});

document.getElementById("addBtn").addEventListener("click", () => {
  const nameEl = document.getElementById("myName");
  const eff    = parseFloat(effInput.value);
  const name   = nameEl.value.trim() || (state.newFuel === "ev" ? "My EV" : "My gas car");

  if(!isFinite(eff) || eff <= 0){
    effInput.focus();
    effTitle.textContent = (state.newFuel === "ev" ? "mi / kWh" : "MPG") + " — enter a number";
    return;
  }

  let unique = name, i = 2;
  while(roster().some(v => v.n === unique)) unique = name + " (" + (i++) + ")";

  const car = {n:unique, f:state.newFuel, c:"Yours", own:true};
  if(state.newFuel === "ev") car.kwh100 = 100 / eff;
  else                       car.mpg    = eff;
  state.mine.push(car);

  nameEl.value = "";
  effInput.value = "";
  effTitle.textContent = state.newFuel === "ev" ? "mi / kWh" : "MPG";
  save();
  renderMine();
  render();
});

/* first paint */
pushGas(state.gas, "init");
pushKwh(state.kwh, "init");
renderMine();
render();

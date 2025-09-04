// Basic static app for GitHub Pages
// Loads prices from prices.json that I generated for you

const state = {
  data: null,
  color: null,
  items: [], // {code, qty}
  admin: false,
  discountPct: 0,
  taxByState: {
    "AZ": 8.60
  },
  stateKey: "AZ",
  noTax: false,
  customTax: null,
  adminKey: "2468" // change this to any passcode you want
};

const el = sel => document.querySelector(sel);
const fmt = n => n.toLocaleString(undefined, { style: "currency", currency: "USD" });

async function boot() {
  const res = await fetch("prices.json");
  state.data = await res.json();

  const colors = Object.keys(state.data);
  state.color = colors[0];

  // build color select
  const colorSel = el("#colorSelect");
  colors.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    colorSel.appendChild(opt);
  });
  colorSel.value = state.color;
  colorSel.addEventListener("change", () => {
    state.color = colorSel.value;
    recalc();
  });

  // build locations
  const locSel = el("#locationSelect");
  Object.keys(state.taxByState).forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k + " " + state.taxByState[k].toFixed(2) + "%";
    locSel.appendChild(opt);
  });
  locSel.value = state.stateKey;
  locSel.addEventListener("change", () => {
    state.stateKey = locSel.value;
    recalc();
  });

  el("#noTaxChk").addEventListener("change", e => {
    state.noTax = e.target.checked;
    recalc();
  });

  el("#taxInput").addEventListener("input", e => {
    const v = e.target.value;
    state.customTax = v === "" ? null : Math.max(0, Number(v));
    recalc();
  });

  // admin controls
  el("#adminBtn").addEventListener("click", tryUnlock);
  el("#lockBtn").addEventListener("click", () => {
    state.admin = false;
    el("#adminPanel").style.display = "none";
  });

  el("#discountInput").addEventListener("input", e => {
    state.discountPct = Math.max(0, Number(e.target.value || 0));
    recalc();
  });

  // add items
  el("#addBtn").addEventListener("click", addFromInputs);
  el("#codeInput").addEventListener("keydown", e => {
    if (e.key === "Enter") addFromInputs();
  });
  el("#qtyInput").addEventListener("keydown", e => {
    if (e.key === "Enter") addFromInputs();
  });
  el("#searchInput").addEventListener("input", renderSearch);
  el("#clearBtn").addEventListener("click", () => {
    state.items = [];
    recalc();
  });

  renderSearch();
  recalc();
}

function tryUnlock() {
  const val = prompt("Enter admin passcode");
  if (val && val === state.adminKey) {
    state.admin = true;
    el("#adminPanel").style.display = "";
  } else {
    alert("Wrong passcode");
  }
}

function addFromInputs() {
  const code = el("#codeInput").value.trim().toUpperCase();
  const qty = Math.max(1, Number(el("#qtyInput").value || 1));
  if (!code) return;

  const cat = state.data[state.color];
  if (!cat[code]) {
    // attempt soft match: find first that starts with text
    const cand = Object.keys(cat).find(k => k.toUpperCase().startsWith(code));
    if (!cand) {
      alert("Item not found for this color");
      return;
    }
    pushItem(cand, qty);
  } else {
    pushItem(code, qty);
  }

  el("#codeInput").value = "";
  el("#qtyInput").value = "1";
}

function pushItem(code, qty) {
  const found = state.items.find(x => x.code === code);
  if (found) found.qty += qty;
  else state.items.push({ code, qty });
  recalc();
}

function removeItem(code) {
  state.items = state.items.filter(x => x.code !== code);
  recalc();
}

function changeQty(code, qty) {
  const it = state.items.find(x => x.code === code);
  if (!it) return;
  it.qty = Math.max(1, Number(qty || 1));
  recalc();
}

function getUnit(code) {
  const entry = state.data[state.color][code];
  return entry ? Number(entry.price) : 0;
}

function getText(code) {
  const entry = state.data[state.color][code];
  return entry && entry.description ? entry.description : "";
}

function activeTaxRate() {
  if (state.noTax) return 0;
  if (state.customTax != null) return state.customTax;
  const base = state.taxByState[state.stateKey] || 0;
  return base;
}

function recalc() {
  const body = el("#itemsBody");
  body.innerHTML = "";

  let sub = 0;

  for (const row of state.items) {
    const unit = getUnit(row.code);
    const line = unit * row.qty;
    sub += line;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${row.code}</b></td>
      <td>${escapeHtml(getText(row.code))}</td>
      <td>${fmt(unit)}</td>
      <td>
        <input type="number" min="1" value="${row.qty}" style="width:90px" />
      </td>
      <td>${fmt(line)}</td>
      <td>
        <button class="btn ghost">Remove</button>
      </td>
    `;
    const qtyInput = tr.querySelector("input");
    qtyInput.addEventListener("input", e => changeQty(row.code, e.target.value));
    tr.querySelector("button").addEventListener("click", () => removeItem(row.code));
    body.appendChild(tr);
  }

  const afterDisc = sub * (1 - (state.discountPct || 0) / 100);
  const taxRate = activeTaxRate();
  const taxAmt = afterDisc * (taxRate / 100);
  const grand = afterDisc + taxAmt;

  el("#subTotalTxt").textContent = fmt(sub);
  el("#discountTxt").textContent = (state.discountPct || 0).toFixed(1) + "%";
  el("#afterDiscountTxt").textContent = fmt(afterDisc);
  el("#taxRateTxt").textContent = taxRate.toFixed(2) + "%";
  el("#grandTotalTxt").textContent = fmt(grand);
}

function renderSearch() {
  const q = el("#searchInput").value.trim().toUpperCase();
  const box = el("#results");
  box.innerHTML = "";

  const cat = state.data[state.color];
  const all = Object.entries(cat);
  const hits = all.filter(([code, obj]) => {
    if (!q) return true;
    const txt = (obj.description || "").toUpperCase();
    return code.includes(q) || txt.includes(q);
  }).slice(0, 120);

  for (const [code, obj] of hits) {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <b>${code}</b>
      <small>${escapeHtml(obj.description || "")}</small>
      <div style="margin-top:6px; font-weight:700">${fmt(Number(obj.price))}</div>
    `;
    card.addEventListener("click", () => {
      pushItem(code, 1);
    });
    box.appendChild(card);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}

boot();

// --- Cabinet Quote App Main Logic with Type-ahead Suggestions (robust Add button) ---

let DATA = {};
let dataReady = false;
let cart = [];
let discountRate = 0.5; // 50% default
const DISCOUNT_PASSCODE = "2468"; // simple passcode to allow discount changes

// Tax rates by location (add more as needed)
let taxRates = {
  "AZ": 0.086,
};

// Optional multipliers per category/color
const categoryColors = {
  "Shaker Style": {
    "White Shaker": 1.0,
    "Grey Shaker": 1.0,
    "Oak Shaker": 1.0,
  },
  "Slim Shaker Style": {
    "Slim oak shaker": 1.0,
    "Slim white shaker": 1.0,
    "Slim black shaker": 1.0,
    "Slim green shaker": 1.0,
  },
  "European Style": {
    "Dark wood": 1.0,
    "Pale Pine": 1.0,
    "Walnut": 1.0,
    "Walnut light": 1.0,
    "Rustic Oak": 1.0,
    "Glossy white": 1.0,
    "Glossy grey": 1.0,
    "Lacquer White": 1.0,
    "Slim Natural Shaker": 1.0,
  }
};

// ---------- Load & Init ----------

async function load() {
  try {
    const res = await fetch("prices.json");
    DATA = await res.json();
    initData();
  } catch (e) {
    console.error("Failed to load JSON", e);
    alert("Failed to load prices.json. Please make sure you are serving the app over HTTP (not file://).");
  }
}

// Called after DATA is available
function initData() {
  dataReady = true;

  // Populate category dropdown (styles)
  const catSelect = document.getElementById("categorySelect");
  if (catSelect) {
    catSelect.innerHTML = "";
    Object.keys(DATA).forEach(cat => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      catSelect.appendChild(opt);
    });
  }

  // Populate initial colors and results
  populateColorDropdown();
  showCategory();

  // Enable the Add button now that data is ready
  const addBtn = document.getElementById("addBtn");
  if (addBtn) addBtn.disabled = false;
}

function wireUI() {
  // Category and color listeners
  document.getElementById("categorySelect")?.addEventListener("change", () => {
    populateColorDropdown();
    onColorChange();
    hideCodeSuggestions();
  });

  document.getElementById("colorSelect")?.addEventListener("change", onColorChange);

  // Code input: Enter adds, input shows suggestions, keyboard nav
  const codeInput = document.getElementById("codeInput");
  if (codeInput) {
    codeInput.addEventListener("keydown", onCodeInputKeydown);
    codeInput.addEventListener("input", onCodeInputChange);
  }

  // Qty input: Enter adds
  const qtyInput = document.getElementById("qtyInput");
  if (qtyInput) {
    qtyInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        addByCode();
      }
    });
  }

  // Click outside to close suggestions
  document.addEventListener("click", (e) => {
    const box = document.getElementById("codeSuggest");
    const input = document.getElementById("codeInput");
    if (!box || !input) return;
    if (!box.contains(e.target) && e.target !== input) {
      hideCodeSuggestions();
    }
  });

  // No tax checkbox
  document.getElementById("noTaxChk")?.addEventListener("change", calcTotals);

  // Discount controls (guarded by passcode)
  document.getElementById("applyDiscountBtn")?.addEventListener("click", applyDiscountChange);
  const discountInput = document.getElementById("discountInput");
  if (discountInput) {
    discountInput.value = (discountRate * 100).toFixed(0);
  }

  // Add item by code (wire immediately; disable until data is loaded)
  const addBtn = document.getElementById("addBtn");
  if (addBtn) {
    addBtn.addEventListener("click", addByCode);
    addBtn.disabled = true; // will be enabled after initData runs
  }

  // Clear cart
  document.getElementById("clearBtn")?.addEventListener("click", () => {
    cart = [];
    renderCart();
  });

  // Apply color actions
  document.getElementById("applyColorNowBtn")?.addEventListener("click", () => {
    const cat = document.getElementById("categorySelect")?.value;
    const color = document.getElementById("colorSelect")?.value;
    if (!cat || !color) return;
    applyColorToCategory(cat, color);
    renderCart();
  });

  document.getElementById("applyColorToCodeBtn")?.addEventListener("click", applySelectedColorToThisCode);

  // Export buttons
  document.getElementById("exportTextBtn")?.addEventListener("click", exportAsText);
  document.getElementById("exportWordBtn")?.addEventListener("click", exportAsWord);
  document.getElementById("exportPdfBtn")?.addEventListener("click", exportAsPDF);
}

function populateColorDropdown() {
  const catSelect = document.getElementById("categorySelect");
  const colorSelect = document.getElementById("colorSelect");
  if (!catSelect || !colorSelect) return;
  const cat = catSelect.value;

  colorSelect.innerHTML = "";
  if (DATA[cat]) {
    Object.keys(DATA[cat]).forEach(color => {
      const opt = document.createElement("option");
      opt.value = color;
      opt.textContent = color;
      colorSelect.appendChild(opt);
    });
  }
  if (colorSelect.options.length > 0) {
    colorSelect.selectedIndex = 0;
  }
}

function onColorChange() {
  showCategory();
  const autoSync = document.getElementById("syncColorCatChk")?.checked;
  if (autoSync) {
    const cat = document.getElementById("categorySelect")?.value;
    const color = document.getElementById("colorSelect")?.value;
    if (cat && color) {
      applyColorToCategory(cat, color);
      renderCart();
    }
  }
  hideCodeSuggestions();
}

// ---------- Catalog rendering (cards) ----------

function showCategory() {
  const catSelect = document.getElementById("categorySelect");
  const colorSelect = document.getElementById("colorSelect");
  const results = document.getElementById("results");
  if (!catSelect || !colorSelect || !results) return;
  const cat = catSelect.value;
  const color = colorSelect.value;
  results.innerHTML = "";

  if (!DATA[cat] || !DATA[cat][color]) return;

  Object.entries(DATA[cat][color]).forEach(([code, price]) => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<b>${code}</b><small>$${Number(price).toFixed(2)}</small>`;
    div.onclick = () => addToCart(cat, color, code, Number(price));
    results.appendChild(div);
  });
}

// ---------- Add to cart (by code or card) ----------

function addByCode() {
  if (!dataReady) {
    alert("Prices are still loading. Please wait a moment and try again.");
    return;
  }

  const catSelect = document.getElementById("categorySelect");
  const colorSelect = document.getElementById("colorSelect");
  const codeInput = document.getElementById("codeInput");
  const qtyInput = document.getElementById("qtyInput");
  if (!catSelect || !colorSelect || !codeInput || !qtyInput) return;

  const cat = catSelect.value;
  const color = colorSelect.value;
  const codeInputValue = codeInput.value.trim();
  if (!codeInputValue) return;

  // uppercase compare
  const code = codeInputValue.toUpperCase();
  const qty = parseInt(qtyInput.value, 10) || 1;

  const codeMap = {};
  if (DATA[cat] && DATA[cat][color]) {
    Object.keys(DATA[cat][color]).forEach(k => { codeMap[k.toUpperCase()] = k; });
    const actualCode = codeMap[code];
    if (actualCode) {
      const basePrice = Number(DATA[cat][color][actualCode]);
      const multiplier = (categoryColors[cat] && categoryColors[cat][color]) ? categoryColors[cat][color] : 1;
      const price = basePrice * multiplier;

      const found = cart.find(i => i.code === actualCode && i.color === color && i.cat === cat);
      if (found) {
        found.qty += qty;
      } else {
        cart.push({ cat, code: actualCode, color, price, qty });
      }
      renderCart();
      hideCodeSuggestions();
      codeInput.value = "";
      qtyInput.value = 1;
    } else {
      alert("Item code not found in selected category/color.");
    }
  } else {
    alert("Item code not found in selected category/color.");
  }
}

function addToCart(cat, color, code, basePrice) {
  const multiplier = (categoryColors[cat] && categoryColors[cat][color]) ? categoryColors[cat][color] : 1;
  const price = basePrice * multiplier;

  const found = cart.find(i => i.code === code && i.color === color && i.cat === cat);
  if (found) {
    found.qty += 1;
  } else {
    cart.push({ cat, code, color, price, qty: 1 });
  }
  renderCart();
}

// ---------- Cart rendering and totals ----------

function renderCart() {
  const body = document.getElementById("cart-body");
  if (!body) return;
  body.innerHTML = "";

  cart.forEach((item, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="width:150px">${item.code} <br><small>${item.color}</small></td>
      <td>$${item.price.toFixed(2)}</td>
      <td style="width:60px">
        <input type="number" min="1" value="${item.qty}" style="width:50px;text-align:right"
          onchange="updateQty(${idx}, this.value)">
      </td>
      <td>$${(item.price * item.qty).toFixed(2)}</td>
      <td><button class="btn danger" onclick="removeItem(${idx})">X</button></td>
    `;
    body.appendChild(tr);
  });

  calcTotals();
}

function updateQty(idx, val) {
  const qty = parseInt(val);
  if (qty > 0) {
    cart[idx].qty = qty;
  }
  renderCart();
}

function removeItem(idx) {
  cart.splice(idx, 1);
  renderCart();
}

function calcTotals() {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = subtotal * discountRate;
  const afterDiscount = subtotal - discount;

  const noTax = document.getElementById("noTaxChk")?.checked;
  const locSelect = document.getElementById("locationSelect");
  const loc = locSelect ? locSelect.value : "";
  const taxRate = (!noTax) ? (taxRates[loc] || 0) : 0;
  const tax = afterDiscount * taxRate;
  const total = afterDiscount + tax;

  document.getElementById("subTotalTxt").textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById("discountTxt").textContent = `${(discountRate * 100).toFixed(0)}%`;
  document.getElementById("afterDiscountTxt").textContent = `$${afterDiscount.toFixed(2)}`;
  document.getElementById("taxRateTxt").textContent = `${(taxRate*100).toFixed(2)}%`;
  document.getElementById("grandTotalTxt").textContent = `$${total.toFixed(2)}`;
}

function applyDiscountChange() {
  const pass = document.getElementById("discountPasscodeInput")?.value || "";
  const input = document.getElementById("discountInput")?.value;
  const status = document.getElementById("discountStatus");

  if (pass !== DISCOUNT_PASSCODE) {
    if (status) status.textContent = "Invalid passcode. Discount unchanged.";
    return;
  }

  const pct = Number(input);
  if (Number.isNaN(pct)) {
    if (status) status.textContent = "Enter a discount percent (0-100).";
    return;
  }

  const rate = Math.max(0, Math.min(1, pct / 100));
  if (status) status.textContent = `Discount updated to ${(rate * 100).toFixed(0)}%.`;
  setDiscount(rate);
}

// Allow owner to set discount via console
window.setDiscount = function(rate) {
  setDiscount(rate);
};

function setDiscount(rate) {
  const safeRate = Math.max(0, Math.min(1, Number(rate)));
  discountRate = Number.isFinite(safeRate) ? safeRate : discountRate;
  const discountInput = document.getElementById("discountInput");
  if (discountInput) {
    discountInput.value = (discountRate * 100).toFixed(0);
  }
  renderCart();
}

// ---------- Color apply helpers ----------

function applyColorToCategory(cat, newColor) {
  cart.forEach(i => {
    if (i.cat === cat) {
      const basePrice = DATA?.[cat]?.[newColor]?.[i.code];
      if (typeof basePrice === "number") {
        const mult = categoryColors?.[cat]?.[newColor] ?? 1;
        i.color = newColor;
        i.price = basePrice * mult;
      }
    }
  });
}

function applySelectedColorToThisCode() {
  const cat = document.getElementById("categorySelect")?.value;
  const newColor = document.getElementById("colorSelect")?.value;
  const codeVal = document.getElementById("codeInput")?.value.trim();
  if (!cat || !newColor || !codeVal) {
    alert("Enter a code first and select category/color.");
    return;
  }
  const codeUpper = codeVal.toUpperCase();

  let changed = false;
  cart.forEach(i => {
    if (i.cat === cat && i.code.toUpperCase() === codeUpper) {
      const basePrice = DATA?.[cat]?.[newColor]?.[i.code];
      if (typeof basePrice === "number") {
        const mult = categoryColors?.[cat]?.[newColor] ?? 1;
        i.color = newColor;
        i.price = basePrice * mult;
        changed = true;
      }
    }
  });

  renderCart();
  if (!changed) {
    alert("No matching items updated. The code may not exist in the selected color.");
  }
}

// ---------- Type-ahead suggestions for codeInput ----------

let currentSuggestions = [];
let suggestIndex = -1;

function onCodeInputChange(e) {
  const prefix = e.target.value.trim().toUpperCase();
  if (!prefix) {
    hideCodeSuggestions();
    return;
  }
  const cat = document.getElementById("categorySelect")?.value;
  const color = document.getElementById("colorSelect")?.value;
  if (!cat || !color || !DATA[cat] || !DATA[cat][color]) {
    hideCodeSuggestions();
    return;
  }

  // Find codes starting with prefix (case-insensitive)
  const allCodes = Object.keys(DATA[cat][color]);
  const matches = allCodes
    .filter(c => c.toUpperCase().startsWith(prefix))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 20);

  if (matches.length === 0) {
    hideCodeSuggestions();
    return;
  }

  renderCodeSuggestions(matches, cat, color);
}

function renderCodeSuggestions(codes, cat, color) {
  currentSuggestions = codes.slice();
  suggestIndex = -1;

  const box = document.getElementById("codeSuggest");
  const input = document.getElementById("codeInput");
  if (!box || !input) return;

  // Match the width of the input for a clean look
  const rect = input.getBoundingClientRect();
  box.style.width = rect.width + "px";

  box.innerHTML = "";
  codes.forEach((code, i) => {
    const price = Number(DATA[cat][color][code]);
    const item = document.createElement("div");
    item.setAttribute("data-index", i);
    item.style.padding = "6px 8px";
    item.style.cursor = "pointer";
    item.style.display = "flex";
    item.style.justifyContent = "space-between";
    item.style.alignItems = "center";
    item.style.gap = "8px";
    item.onmouseenter = () => highlightSuggestIndex(i);
    item.onclick = () => chooseSuggestion(i);

    const left = document.createElement("div");
    left.innerHTML = `<b>${code}</b>`;
    const right = document.createElement("div");
    right.innerHTML = `<small>$${price.toFixed(2)}</small>`;

    item.appendChild(left);
    item.appendChild(right);
    box.appendChild(item);
  });

  // subtle divider lines
  Array.from(box.children).forEach((el, idx, arr) => {
    if (idx < arr.length - 1) {
      el.style.borderBottom = "1px solid #eee";
    }
  });

  box.style.display = "block";
}

function hideCodeSuggestions() {
  const box = document.getElementById("codeSuggest");
  if (box) {
    box.style.display = "none";
    box.innerHTML = "";
  }
  currentSuggestions = [];
  suggestIndex = -1;
}

function highlightSuggestIndex(idx) {
  suggestIndex = idx;
  const box = document.getElementById("codeSuggest");
  if (!box) return;
  Array.from(box.children).forEach((el, i) => {
    el.style.background = i === idx ? "#eef4ff" : "#fff";
  });
}

function chooseSuggestion(idx) {
  if (idx < 0 || idx >= currentSuggestions.length) return;
  const code = currentSuggestions[idx];
  const input = document.getElementById("codeInput");
  if (input) {
    input.value = code;
    input.focus();
  }
  hideCodeSuggestions();
}

function onCodeInputKeydown(e) {
  const hasBox = document.getElementById("codeSuggest")?.style.display === "block";
  if (e.key === "Enter") {
    if (hasBox && suggestIndex >= 0) {
      e.preventDefault();
      chooseSuggestion(suggestIndex);
      // Immediately add for convenience
      addByCode();
      return;
    }
    // No suggestion highlighted; proceed with adding
    addByCode();
  } else if (e.key === "ArrowDown") {
    const len = currentSuggestions.length;
    if (len > 0) {
      e.preventDefault();
      suggestIndex = (suggestIndex + 1) % len;
      highlightSuggestIndex(suggestIndex);
    }
  } else if (e.key === "ArrowUp") {
    const len = currentSuggestions.length;
    if (len > 0) {
      e.preventDefault();
      suggestIndex = (suggestIndex - 1 + len) % len;
      highlightSuggestIndex(suggestIndex);
    }
  } else if (e.key === "Escape") {
    hideCodeSuggestions();
  }
}

// ---------- Export helpers and functions ----------

// Helper: pad or trim string to fixed width (for text export)
function pad(str, len) {
  str = String(str);
  if (str.length > len) return str.slice(0, len);
  return str + ' '.repeat(len - str.length);
}

// Helper: get formatted date (e.g. 2025-09-12)
function getToday() {
  return new Date().toISOString().slice(0,10);
}

function getJobName() {
  const job = document.getElementById("jobNameInput");
  return job && job.value.trim() ? job.value.trim() : "";
}

// Export as pretty TEXT
function exportAsText() {
  let lines = [];
  const jobName = getJobName();
  lines.push("CABINET QUOTE");
  if (jobName) lines.push("Job: " + jobName);
  lines.push("Date: " + getToday());
  lines.push("");
  lines.push(pad("CODE", 12) + pad("COLOR", 16) + pad("QTY", 5) + pad("UNIT", 10) + pad("TOTAL", 10));
  lines.push("-".repeat(53));
  cart.forEach(item => {
    lines.push(
      pad(item.code,12) +
      pad(item.color,16) +
      pad(item.qty,5) +
      pad("$"+item.price.toFixed(2),10) +
      pad("$"+(item.price*item.qty).toFixed(2),10)
    );
  });
  lines.push("");
  lines.push("Summary:");
  lines.push("Subtotal:      " + document.getElementById("subTotalTxt").textContent);
  lines.push("Discount:      " + document.getElementById("discountTxt").textContent);
  lines.push("After Discount:" + document.getElementById("afterDiscountTxt").textContent);
  lines.push("Tax Rate:      " + document.getElementById("taxRateTxt").textContent);
  lines.push("Grand Total:   " + document.getElementById("grandTotalTxt").textContent);
  const text = lines.join("\n");
  const blob = new Blob([text], {type: "text/plain"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "quote.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export as Word (.doc using HTML)
function exportAsWord() {
  const jobName = getJobName();
  let html = `<h2>Cabinet Quote</h2>`;
  if (jobName) html += `<div><b>Job:</b> ${jobName}</div>`;
  html += `<div><b>Date:</b> ${getToday()}</div>`;
  html += "<br>";
  html += `<table border="1" cellpadding="4" style="border-collapse:collapse;">
    <tr>
      <th>Code</th>
      <th>Color</th>
      <th>Qty</th>
      <th>Unit</th>
      <th>Total</th>
    </tr>`;
  cart.forEach(item => {
    html += `<tr>
      <td>${item.code}</td>
      <td>${item.color}</td>
      <td>${item.qty}</td>
      <td>$${item.price.toFixed(2)}</td>
      <td>$${(item.price*item.qty).toFixed(2)}</td>
    </tr>`;
  });
  html += `</table><br>
    <b>Summary:</b><br>
    Subtotal: ${document.getElementById("subTotalTxt").textContent}<br>
    Discount: ${document.getElementById("discountTxt").textContent}<br>
    After Discount: ${document.getElementById("afterDiscountTxt").textContent}<br>
    Tax Rate: ${document.getElementById("taxRateTxt").textContent}<br>
    Grand Total: ${document.getElementById("grandTotalTxt").textContent}
  `;

  const doc = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><title>Quote</title></head>
    <body>${html}</body></html>
  `;
  const blob = new Blob(['\ufeff', doc], {type: 'application/msword'});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "quote.doc";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export as PDF (jsPDF)
function exportAsPDF() {
  const jsPDF = window.jsPDF ? window.jsPDF : window.jspdf?.jsPDF;
  if (!jsPDF) {
    alert("PDF export requires jsPDF. Please include it on your page.");
    return;
  }
  const jobName = getJobName();
  const doc = new jsPDF();
  let y = 12;
  doc.setFontSize(16);
  doc.text("Cabinet Quote", 10, y);
  y += 9;
  doc.setFontSize(11);
  if (jobName) {
    doc.text("Job: " + jobName, 10, y);
    y += 7;
  }
  doc.text("Date: " + getToday(), 10, y);
  y += 9;

  // Table header
  doc.setFont(undefined, 'bold');
  doc.text("Code", 10, y);
  doc.text("Color", 38, y);
  doc.text("Qty", 86, y);
  doc.text("Unit", 104, y);
  doc.text("Total", 134, y);
  doc.setFont(undefined, 'normal');
  y += 5;

  cart.forEach(item => {
    doc.text(item.code, 10, y);
    doc.text(item.color, 38, y);
    doc.text(String(item.qty), 86, y, {align:'right'});
    doc.text("$" + item.price.toFixed(2), 104, y, {align:'right'});
    doc.text("$" + (item.price*item.qty).toFixed(2), 134, y, {align:'right'});
    y += 6;
    if (y > 270) { doc.addPage(); y = 12; }
  });

  y += 6;
  doc.setFont(undefined, 'bold');
  doc.text("Summary:", 10, y); y += 7; doc.setFont(undefined, 'normal');
  doc.text("Subtotal:      " + document.getElementById("subTotalTxt").textContent, 10, y); y += 6;
  doc.text("Discount:      " + document.getElementById("discountTxt").textContent, 10, y); y += 6;
  doc.text("After Discount:" + document.getElementById("afterDiscountTxt").textContent, 10, y); y += 6;
  doc.text("Tax Rate:      " + document.getElementById("taxRateTxt").textContent, 10, y); y += 6;
  doc.text("Grand Total:   " + document.getElementById("grandTotalTxt").textContent, 10, y);

  doc.save("quote.pdf");
}

// ---------- Boot ----------

window.addEventListener("DOMContentLoaded", function() {
  wireUI();
  renderCart();     // render empty cart
  load();           // fetch prices and enable UI after ready
  // Also populate location select now
  populateLocationDropdown();
});

function populateLocationDropdown() {
  const locSelect = document.getElementById("locationSelect");
  if (locSelect) {
    locSelect.innerHTML = "";
    Object.keys(taxRates).forEach(st => {
      const opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      locSelect.appendChild(opt);
    });
  }
}

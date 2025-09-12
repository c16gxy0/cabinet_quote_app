// --- Cabinet Quote App Main Logic ---

let DATA = {};
let cart = [];
let discountRate = 0.5; // 50% default

// Tax rates by location
let taxRates = {
  "AZ": 0.086,
};

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

async function load() {
  try {
    let res = await fetch("prices.json");
    DATA = await res.json();
    init();
  } catch (e) {
    console.error("Failed to load JSON", e);
  }
}

function init() {
  // Populate category dropdown (styles)
  let catSelect = document.getElementById("categorySelect");
  if (catSelect) {
    catSelect.innerHTML = "";
    Object.keys(DATA).forEach(cat => {
      let opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      catSelect.appendChild(opt);
    });
    catSelect.addEventListener("change", onCategoryChange);
  }

  // Populate color dropdown on load
  populateColorDropdown();

  // Listen for color changes
  let colorSelect = document.getElementById("colorSelect");
  if (colorSelect) {
    colorSelect.addEventListener("change", showCategory);
  }

  // Listen for Enter key in add by code
  let codeInput = document.getElementById("codeInput");
  if (codeInput) {
    codeInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        addByCode();
      }
    });
  }
  let qtyInput = document.getElementById("qtyInput");
  if (qtyInput) {
    qtyInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter") {
        addByCode();
      }
    });
  }

  populateLocationDropdown();

  // Add event for no tax checkbox
  let noTaxChk = document.getElementById("noTaxChk");
  if (noTaxChk) {
    noTaxChk.addEventListener("change", calcTotals);
  }

  // Add event for add item by code
  let addBtn = document.getElementById("addBtn");
  if (addBtn) {
    addBtn.addEventListener("click", addByCode);
  }

  // Optionally clear cart
  let clearBtn = document.getElementById("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      cart = [];
      renderCart();
    });
  }

  // Attach export listeners in DOMContentLoaded (see below)

  showCategory();
}

function onCategoryChange() {
  populateColorDropdown();
  showCategory();
}

function populateColorDropdown() {
  let catSelect = document.getElementById("categorySelect");
  let colorSelect = document.getElementById("colorSelect");
  if (!catSelect || !colorSelect) return;
  let cat = catSelect.value;

  colorSelect.innerHTML = "";
  if (DATA[cat]) {
    Object.keys(DATA[cat]).forEach(color => {
      let opt = document.createElement("option");
      opt.value = color;
      opt.textContent = color;
      colorSelect.appendChild(opt);
    });
  }
  if (colorSelect.options.length > 0) {
    colorSelect.selectedIndex = 0;
  }
}

function populateLocationDropdown() {
  let locSelect = document.getElementById("locationSelect");
  if (locSelect) {
    locSelect.innerHTML = "";
    Object.keys(taxRates).forEach(st => {
      let opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      locSelect.appendChild(opt);
    });
  }
}

function showCategory() {
  let catSelect = document.getElementById("categorySelect");
  let colorSelect = document.getElementById("colorSelect");
  let results = document.getElementById("results");
  if (!catSelect || !colorSelect || !results) return;
  let cat = catSelect.value;
  let color = colorSelect.value;
  results.innerHTML = "";

  if (!DATA[cat] || !DATA[cat][color]) return;

  Object.entries(DATA[cat][color]).forEach(([code, price]) => {
    let div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<b>${code}</b><small>$${price.toFixed(2)}</small>`;
    div.onclick = () => addToCart(cat, color, code, price);
    results.appendChild(div);
  });
}

function addByCode() {
  let catSelect = document.getElementById("categorySelect");
  let colorSelect = document.getElementById("colorSelect");
  let codeInput = document.getElementById("codeInput");
  let qtyInput = document.getElementById("qtyInput");
  if (!catSelect || !colorSelect || !codeInput || !qtyInput) return;
  let cat = catSelect.value;
  let color = colorSelect.value;
  let codeInputValue = codeInput.value.trim();

  // Make code input uppercase for comparison
  let code = codeInputValue.toUpperCase();
  let qty = parseInt(qtyInput.value, 10) || 1;

  // Find the actual code in pricing data, case-insensitive
  let codeMap = {};
  if (DATA[cat] && DATA[cat][color]) {
    Object.keys(DATA[cat][color]).forEach(k => { codeMap[k.toUpperCase()] = k; });
    let actualCode = codeMap[code];
    if (actualCode) {
      let basePrice = DATA[cat][color][actualCode];
      let multiplier = (categoryColors[cat] && categoryColors[cat][color]) ? categoryColors[cat][color] : 1;
      let price = basePrice * multiplier;

      let found = cart.find(i => i.code === actualCode && i.color === color && i.cat === cat);
      if (found) {
        found.qty += qty;
      } else {
        cart.push({ cat, code: actualCode, color, price, qty: qty });
      }
      renderCart();
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
  let multiplier = (categoryColors[cat] && categoryColors[cat][color]) ? categoryColors[cat][color] : 1;
  let price = basePrice * multiplier;

  let found = cart.find(i => i.code === code && i.color === color && i.cat === cat);
  if (found) {
    found.qty += 1;
  } else {
    cart.push({ cat, code, color, price, qty: 1 });
  }
  renderCart();
}

function renderCart() {
  let body = document.getElementById("cart-body");
  if (!body) return;
  body.innerHTML = "";

  cart.forEach((item, idx) => {
    let tr = document.createElement("tr");
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
  let qty = parseInt(val);
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
  let subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  let discount = subtotal * discountRate;
  let afterDiscount = subtotal - discount;

  let noTax = document.getElementById("noTaxChk")?.checked;
  let locSelect = document.getElementById("locationSelect");
  let loc = locSelect ? locSelect.value : "";
  let taxRate = (!noTax) ? (taxRates[loc] || 0) : 0;
  let tax = afterDiscount * taxRate;
  let total = afterDiscount + tax;

  let subtotalTxt = document.getElementById("subTotalTxt");
  let discountTxt = document.getElementById("discountTxt");
  let afterDiscountTxt = document.getElementById("afterDiscountTxt");
  let taxRateTxt = document.getElementById("taxRateTxt");
  let grandTotalTxt = document.getElementById("grandTotalTxt");

  if (subtotalTxt) subtotalTxt.textContent = `$${subtotal.toFixed(2)}`;
  if (discountTxt) discountTxt.textContent = `${(discountRate * 100).toFixed(0)}%`;
  if (afterDiscountTxt) afterDiscountTxt.textContent = `$${afterDiscount.toFixed(2)}`;
  if (taxRateTxt) taxRateTxt.textContent = `${(taxRate*100).toFixed(2)}%`;
  if (grandTotalTxt) grandTotalTxt.textContent = `$${total.toFixed(2)}`;
}

// Allow owner to set discount via console
window.setDiscount = function(rate) {
  discountRate = rate;
  renderCart();
};

// ----------------- EXPORT FUNCTIONS -----------------

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

// 1. Export as pretty TEXT
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
  let text = lines.join("\n");
  let blob = new Blob([text], {type: "text/plain"});
  let link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "quote.txt";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 2. Export as nicely formatted Word (HTML table in .doc)
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

  let doc = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><title>Quote</title></head>
    <body>${html}</body></html>
  `;
  let blob = new Blob(['\ufeff', doc], {type: 'application/msword'});
  let link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "quote.doc";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 3. Export as nicely formatted PDF
function exportAsPDF() {
  const jsPDF = window.jsPDF ? window.jsPDF : window.jspdf?.jsPDF;
  if (!jsPDF) {
    alert("PDF export requires jsPDF. Please include it on your page.");
    return;
  }
  const jobName = getJobName();
  let doc = new jsPDF();
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

// Attach export listeners once DOM is ready (so buttons always work)
window.addEventListener("DOMContentLoaded", function() {
  if (document.getElementById("exportTextBtn"))
    document.getElementById("exportTextBtn").addEventListener("click", exportAsText);
  if (document.getElementById("exportWordBtn"))
    document.getElementById("exportWordBtn").addEventListener("click", exportAsWord);
  if (document.getElementById("exportPdfBtn"))
    document.getElementById("exportPdfBtn").addEventListener("click", exportAsPDF);
  // allow cart render on load if items exist
  renderCart();
});

// Main load
load();

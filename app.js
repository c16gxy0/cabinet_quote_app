let DATA = {};
let cart = [];
let discountRate = 0.5; // 50% default

// Tax rates by location
let taxRates = {
  "AZ": 0.086,
};

// Color options by category (for discount multipliers, not used for code lookup)
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
  let code = codeInput.value.trim();
  let qty = parseInt(qtyInput.value, 10) || 1;

  if (DATA[cat] && DATA[cat][color] && DATA[cat][color][code]) {
    let basePrice = DATA[cat][color][code];
    let multiplier = (categoryColors[cat] && categoryColors[cat][color]) ? categoryColors[cat][color] : 1;
    let price = basePrice * multiplier;

    let found = cart.find(i => i.code === code && i.color === color && i.cat === cat);
    if (found) {
      found.qty += qty;
    } else {
      cart.push({ cat, code, color, price, qty: qty });
    }
    renderCart();
    codeInput.value = "";
    qtyInput.value = 1;
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
      <td>${item.code} <br><small>${item.color}</small></td>
      <td>$${item.price.toFixed(2)}</td>
      <td>
        <input type="number" min="1" value="${item.qty}" 
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

load();

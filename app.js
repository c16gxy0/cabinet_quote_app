let DATA = {
  "Shaker Style": {
    "W1830": 120,
    "W2430": 140
    // Add more shaker codes here
  },
  "Slim Shaker Style": {
    // Fill in later
  },
  "European Style": {
    // Fill in later
  }
};
let cart = [];
let discountRate = 0.5; // 50% default

// Tax rates by location
let taxRates = {
  "AZ": 0.086,
};

// Color options by category
const categoryColors = {
  "Shaker Style": {
    "White Shaker": 1.0,
    "Gray Shaker": 1.0,
    "White Oak": 1.0,
  },
  "Slim Shaker Style": {
    // Add colors later
  },
  "European Style": {
    // Add colors later
  }
};

async function load() {
  // You can update DATA from prices.json if needed, but for now use above structure
  // try {
  //   let res = await fetch("prices.json");
  //   DATA = await res.json();
  // } catch (e) {
  //   console.error("Failed to load JSON", e);
  // }
  init();
}

function init() {
  // Populate category dropdown
  let catSelect = document.getElementById("categorySelect");
  if (catSelect) {
    catSelect.innerHTML = "";
    Object.keys(DATA).forEach(cat => {
      let opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      catSelect.appendChild(opt);
    });
    catSelect.addEventListener("change", () => {
      populateColorDropdown();
      showCategory();
    });
  }

  populateColorDropdown();

  // Populate tax location dropdown
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

  showCategory();
}

function populateColorDropdown() {
  let catSelect = document.getElementById("categorySelect");
  let colorSelect = document.getElementById("colorSelect");
  if (!catSelect || !colorSelect) return;
  let cat = catSelect.value;
  let colors = categoryColors[cat] || {};

  colorSelect.innerHTML = "";
  Object.keys(colors).forEach(c => {
    let opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    colorSelect.appendChild(opt);
  });
  colorSelect.addEventListener("change", showCategory);
}

function showCategory() {
  let catSelect = document.getElementById("categorySelect");
  let results = document.getElementById("results");
  if (!catSelect || !results) return;
  let cat = catSelect.value;
  results.innerHTML = "";

  if (!DATA[cat]) return;

  Object.entries(DATA[cat]).forEach(([code, price]) => {
    let div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<b>${code}</b><small>$${price.toFixed(2)}</small>`;
    div.onclick = () => addToCart(cat, code, price);
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

  if (DATA[cat] && DATA[cat][code]) {
    let basePrice = DATA[cat][code];
    let multiplier = (categoryColors[cat] && categoryColors[cat][color]) ? categoryColors[cat][color] : 1;
    let price = basePrice * multiplier;

    let found = cart.find(i => i.code === code && i.color === color);
    if (found) {
      found.qty += qty;
    } else {
      cart.push({ cat, code, color, price, qty: qty });
    }
    renderCart();
    codeInput.value = "";
    qtyInput.value = 1;
  } else {
    alert("Item code not found in selected category.");
  }
}

function addToCart(cat, code, basePrice) {
  let colorSelect = document.getElementById("colorSelect");
  let color = colorSelect ? colorSelect.value : "";
  let multiplier = (categoryColors[cat] && categoryColors[cat][color]) ? categoryColors[cat][color] : 1;
  let price = basePrice * multiplier;

  let found = cart.find(i => i.code === code && i.color === color);
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

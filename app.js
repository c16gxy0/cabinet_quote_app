let DATA = {};
let cart = [];
let discountRate = 0.5; // 50% default

// Tax rates by location
let taxRates = {
  "AZ": 0.086,
};

// Color options (can adjust multipliers if needed)
let colors = {
  "White Shaker": 1.0,
  "Gray Shaker": 1.0,
  "White Oak": 1.0
};

async function load() {
  try {
    let res = await fetch("prices_simple.json");
    DATA = await res.json();
    init();
  } catch (e) {
    console.error("Failed to load JSON", e);
  }
}

function init() {
  // Populate category dropdown
  let catSelect = document.getElementById("category");
  catSelect.innerHTML = "";
  Object.keys(DATA).forEach(cat => {
    let opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    catSelect.appendChild(opt);
  });
  catSelect.addEventListener("change", showCategory);

  // Populate color dropdown
  let colorSelect = document.getElementById("color");
  if (colorSelect) {
    colorSelect.innerHTML = "";
    Object.keys(colors).forEach(c => {
      let opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      colorSelect.appendChild(opt);
    });
  }

  // Populate tax location dropdown
  let locSelect = document.getElementById("location");
  if (locSelect) {
    locSelect.innerHTML = "";
    Object.keys(taxRates).forEach(st => {
      let opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      locSelect.appendChild(opt);
    });
  }

  showCategory();
}

function showCategory() {
  let cat = document.getElementById("category").value;
  let results = document.getElementById("results");
  results.innerHTML = "";

  Object.entries(DATA[cat]).forEach(([code, price]) => {
    let div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<b>${code}</b><small>$${price.toFixed(2)}</small>`;
    div.onclick = () => addToCart(cat, code, price);
    results.appendChild(div);
  });
}

function addToCart(cat, code, basePrice) {
  // Adjust price by selected color multiplier
  let color = document.getElementById("color").value;
  let multiplier = colors[color] || 1;
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

  // Discount
  let discount = subtotal * discountRate;
  let afterDiscount = subtotal - discount;

  // Tax
  let loc = document.getElementById("location").value;
  let taxRate = document.getElementById("apply-tax").checked ? (taxRates[loc] || 0) : 0;
  let tax = afterDiscount * taxRate;
  let total = afterDiscount + tax;

  document.getElementById("subtotal").textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById("discount").textContent = `- $${discount.toFixed(2)}`;
  document.getElementById("tax").textContent = `$${tax.toFixed(2)}`;
  document.getElementById("grand").textContent = `$${total.toFixed(2)}`;
}

// Allow owner to set discount via console
window.setDiscount = function(rate) {
  discountRate = rate;
  renderCart();
};

load();

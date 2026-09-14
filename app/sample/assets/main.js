/* ------------------------------------------------------------------
   Auth wiring — left as-is, wrapped so a missing backend/util module
   during local/mock development doesn't stop the storefront from
   rendering below.
------------------------------------------------------------------- */
try {
  const { getAuth, onAuthStateChanged, getIdToken } = await import(
    "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js"
  );
  const { app, api } = await import("./utils/connection.js");
  const auth = await getAuth(app);

  const accessToken = localStorage.getItem("token");
  if (!accessToken) window.location.replace("/auth/login");

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const idToken = await getIdToken(user);
      console.log("Logged in as:", idToken);
    }
  });

  async function getData(endpoint = "") {
    const res = await fetch(api + "/api/v1/users/" + endpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const response = await res.json();
    if (!res.ok) throw response;
    console.log(response);
    return response;
  }
  getData();
} catch (err) {
  console.warn("Auth/backend not available, continuing in mock mode:", err);
}

/* ------------------------------------------------------------------
   Storefront — products, search, category filter, cart
------------------------------------------------------------------- */

const CART_KEY = "sellora_cart";
const naira = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const grid = document.getElementById("productsGrid");
const categoriesEl = document.getElementById("categories");
const searchInput = document.getElementById("searchInput");
const resultsTitle = document.getElementById("resultsTitle");
const resultsCount = document.getElementById("resultsCount");
const emptyState = document.getElementById("emptyState");
const cartBadge = document.getElementById("cartBadge");
const cartBtn = document.getElementById("cartBtn");
const toastEl = document.getElementById("toast");

let activeCategory = "All";
let searchTerm = "";
let toastTimer = null;

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || {};
  } catch {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function cartCount(cart) {
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}

function updateCartBadge() {
  const count = cartCount(loadCart());
  cartBadge.textContent = count;
  cartBadge.classList.toggle("visible", count > 0);
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function addToCart(productId, productName) {
  const cart = loadCart();
  cart[productId] = (cart[productId] || 0) + 1;
  saveCart(cart);
  updateCartBadge();
  showToast(`Added "${productName}" to cart`);
}

function renderCategories() {
  const categories = ["All", ...new Set(PRODUCTS.map((p) => p.category))];
  categoriesEl.innerHTML = categories
    .map(
      (cat) =>
        `<button class="chip${cat === activeCategory ? " active" : ""}" data-category="${cat}">${cat}</button>`
    )
    .join("");

  categoriesEl.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCategory = chip.dataset.category;
      renderCategories();
      renderProducts();
    });
  });
}

function starRow(rating) {
  const full = Math.round(rating);
  return `<span class="stars" aria-hidden="true">${"★".repeat(full)}${"☆".repeat(5 - full)}</span><span class="rating-num">${rating.toFixed(1)}</span>`;
}

function getFilteredProducts() {
  return PRODUCTS.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

function renderProducts() {
  const list = getFilteredProducts();

  resultsTitle.textContent = activeCategory === "All" ? "All products" : activeCategory;
  resultsCount.textContent = `${list.length} item${list.length === 1 ? "" : "s"}`;

  emptyState.hidden = list.length !== 0;
  grid.style.display = list.length === 0 ? "none" : "grid";

  grid.innerHTML = list
    .map(
      (p) => `
      <article class="product-card" data-id="${p.id}">
        <div class="product-image-wrap">
          <img src="${p.image}" alt="${p.name}" loading="lazy" class="product-image"/>
          ${p.oldPrice ? '<span class="badge-sale">Sale</span>' : ""}
        </div>
        <div class="product-info">
          <span class="product-category">${p.category}</span>
          <h3 class="product-name">${p.name}</h3>
          <div class="product-rating">${starRow(p.rating)}</div>
          <div class="product-price-row">
            <span class="product-price">${naira.format(p.price)}</span>
            ${p.oldPrice ? `<span class="product-old-price">${naira.format(p.oldPrice)}</span>` : ""}
          </div>
          <button class="add-to-cart-btn" data-id="${p.id}" data-name="${p.name}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" height="14">
              <path d="M0 24C0 10.7 10.7 0 24 0L69.5 0c22 0 41.5 12.8 50.6 32l3.5 8H488c14.5 0 27.9 7.8 35.1 20.5s7.1 28.3 0 41L457.5 331.7c-8.7 15.7-25.3 25.6-43.5 25.6H176.8l-8.6 20.7L142.5 424H432c13.3 0 24 10.7 24 24s-10.7 24-24 24H72c-14.6 0-27.9-8.1-34.6-21.1s-5.7-28.8 2.5-40.9L64.6 400 34.6 320.9c-.3-.7-.6-1.4-.9-2.1L1.2 220.9C-2.6 209.5 3.5 197.2 14.9 193.4s23.8 2.4 27.6 13.8L74.3 304H414.1L488 88H142.6l-9.5-24-3.5-8H24C10.7 40 0 27.3 0 24zM128 464a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm288-32a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/>
            </svg>
            Add to cart
          </button>
        </div>
      </article>`
    )
    .join("");

  grid.querySelectorAll(".add-to-cart-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      addToCart(btn.dataset.id, btn.dataset.name);
      btn.classList.add("pop");
      setTimeout(() => btn.classList.remove("pop"), 250);
    });
  });
}

searchInput.addEventListener("input", (e) => {
  searchTerm = e.target.value;
  renderProducts();
});

cartBtn.addEventListener("click", () => {
  const count = cartCount(loadCart());
  showToast(count === 0 ? "Your cart is empty" : `You have ${count} item${count === 1 ? "" : "s"} in cart`);
});

renderCategories();
renderProducts();
updateCartBadge();
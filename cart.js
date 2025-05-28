// cart.js  ── panel lateral, cantidades, indicador rojo

function toggleCart() {
  const cartModal   = document.getElementById("cartModal");
  const overlay     = document.getElementById("cartOverlay");
  const indicator   = document.getElementById("cartIndicator");

  cartModal.classList.toggle("translate-x-full");  // muestra / oculta el sidebar
  overlay.classList.toggle("hidden");              // muestra / oculta el fondo oscuro

  // Al abrir el carrito, ocultamos el punto rojo
  if (!cartModal.classList.contains("translate-x-full")) {
    indicator?.classList.add("hidden");
  }

  renderCart();
}

function closeCart() {
  document.getElementById("cartModal").classList.add("translate-x-full");
  document.getElementById("cartOverlay").classList.add("hidden");
}

function addToCart(name, price, qty = 1) {
  const cart      = JSON.parse(localStorage.getItem("cart")) || [];
  const indicator = document.getElementById("cartIndicator");
  const item      = cart.find(p => p.name === name);

  item ? (item.quantity += qty) : cart.push({ name, price, quantity: qty });

  localStorage.setItem("cart", JSON.stringify(cart));

  // Muestra el punto rojo
  indicator?.classList.remove("hidden");

  renderCart();
}

function removeFromCart(index) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  cart.splice(index, 1);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

function updateQuantity(index, delta) {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  if (!cart[index]) return;
  cart[index].quantity = Math.max(1, cart[index].quantity + delta);
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const cart      = JSON.parse(localStorage.getItem("cart")) || [];
  const listEl    = document.getElementById("cartItems");
  const totalEl   = document.getElementById("cartTotal");

  listEl.innerHTML = "";
  let total = 0;

  cart.forEach((p, i) => {
    const subtotal = p.price * p.quantity;
    total += subtotal;

    listEl.insertAdjacentHTML("beforeend", `
      <div class="border-b pb-4">
        <div class="flex justify-between items-center mb-1">
          <div>
            <p class="font-semibold">${p.name}</p>
            <p class="text-sm text-white-600">$${p.price.toLocaleString()} c/u</p>
          </div>
          <button onclick="removeFromCart(${i})" class="text-red-500 hover:text-red-700">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>

        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <button onclick="updateQuantity(${i}, -1)"
                    class=" text-black px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">−</button>
            <span>${p.quantity}</span>
            <button onclick="updateQuantity(${i}, 1)"
                    class=" text-black px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">+</button>
          </div>
          <span class="font-semibold">$${subtotal.toLocaleString()}</span>
        </div>
      </div>
    `);
  });

  totalEl.textContent = total.toLocaleString();
}

  //1. app.js
  
  document.addEventListener('DOMContentLoaded', () => {
  // ✅ Load tokenCounter from localStorage (if exists), else start at 1
  let tokenCounter = localStorage.getItem("tokenCounter")
    ? parseInt(localStorage.getItem("tokenCounter"))
    : 1;

  // --- Helpers --------------------------------------------------------------
  const safeParse = (s) => {
    try { return JSON.parse(s); } catch(e) { return null; }
  };

  // --- Plus / Minus functionality -----------------------------------------
  document.querySelectorAll(".single_menu").forEach(menu => {
    const plus = menu.querySelector(".plus");
    const minus = menu.querySelector(".minus");
    const qtyInput = menu.querySelector(".quantity");

    qtyInput.value = qtyInput.value ? qtyInput.value : 0;

    plus.addEventListener("click", () => {
      const v = parseInt(qtyInput.value) || 0;
      qtyInput.value = v + 1;
    });

    minus.addEventListener("click", () => {
      const v = parseInt(qtyInput.value) || 0;
      if (v > 0) qtyInput.value = v - 1;
    });
  });

  // --- Generate Bill (modal) -----------------------------------------------
  const generateBtn = document.getElementById("generateBill");
  const tokenNumberEl = document.getElementById("tokenNumber");
  const modalBillItems = document.getElementById("modalBillItems");
  const modalGrandTotal = document.getElementById("modalGrandTotal");

  generateBtn.addEventListener("click", function () {
    const items = document.querySelectorAll(".single_menu");
    modalBillItems.innerHTML = "";
    let total = 0;

    items.forEach(item => {
      const name = item.querySelector("h4").childNodes[0].textContent.trim();
      const priceText = item.querySelector("h4 span").textContent.replace("₹", "").trim();
      const price = parseInt(priceText) || 0;
      const qty = parseInt(item.querySelector(".quantity").value) || 0;

      if (qty > 0) {
        const amount = qty * price;
        total += amount;

        let li = document.createElement("li");
        li.textContent = `${name} - Qty: ${qty} × ₹${price} = ₹${amount}`;
        modalBillItems.appendChild(li);
      }
    });

    if (total > 0) {
      tokenNumberEl.textContent = `🎟️ Token #${tokenCounter}`;
      tokenCounter++;
      localStorage.setItem("tokenCounter", tokenCounter);

      modalGrandTotal.textContent = `Grand Total: ₹${total}`;
      let billModal = new bootstrap.Modal(document.getElementById('billModal'));
      billModal.show();
    } else {
      alert("Please select at least one item!");
    }
  });

  // --- Screenshot bill -----------------------------------------------------
  const screenshotBtn = document.getElementById("screenshotBill");
  screenshotBtn.addEventListener("click", function () {
    const billContent = document.querySelector("#billModal .modal-content");
    html2canvas(billContent).then(canvas => {
      const link = document.createElement("a");
      link.download = "bill.png";
      link.href = canvas.toDataURL();
      link.click();
    });
  });

  // --- Confirm order (save booking + myOrders + refresh) -------------------
  const confirmBtn = document.getElementById("confirmOrder");
  confirmBtn.addEventListener("click", function () {
    alert("✅ Order Confirmed!\nPlease wait for your Token Number to be called.");

    const items = document.querySelectorAll(".single_menu");
    let orderItems = [];
    let total = 0;

    items.forEach(item => {
      const name = item.querySelector("h4").childNodes[0].textContent.trim();
      const priceText = item.querySelector("h4 span").textContent.replace("₹", "").trim();
      const price = parseInt(priceText) || 0;
      const qty = parseInt(item.querySelector(".quantity").value) || 0;

      if (qty > 0) {
        const amount = qty * price;
        total += amount;
        orderItems.push({ name, qty, price, amount });
      }
    });

    if (orderItems.length === 0 || total === 0) {
      document.querySelectorAll(".quantity").forEach(input => input.value = 0);
      const fallbackModal = bootstrap.Modal.getInstance(document.getElementById('billModal'));
      if (fallbackModal) fallbackModal.hide();
      confirmBtn.disabled = false;
      return;
    }

    const assignedToken = tokenCounter - 1;

    // --- Save to staff bookings (global) ---
    const bookings = safeParse(localStorage.getItem("bookings")) || [];
    bookings.push({
      token: assignedToken,
      items: orderItems,
      total: total,
      time: new Date().toLocaleString(),
      status: "Pending"
    });
    localStorage.setItem("bookings", JSON.stringify(bookings));

    // --- Save to user-specific myOrders ---
    const myOrders = safeParse(localStorage.getItem("myOrders")) || [];
    myOrders.push({
      token: assignedToken,
      items: orderItems,
      total: total,
      time: new Date().toLocaleString(),
      status: "Pending"
    });
    localStorage.setItem("myOrders", JSON.stringify(myOrders));

    document.querySelectorAll(".quantity").forEach(input => input.value = 0);

    const billModalInstance = bootstrap.Modal.getInstance(document.getElementById('billModal'));
    if (billModalInstance) billModalInstance.hide();

    confirmBtn.disabled = false;
    loadMyOrders();
  });

  // --- Nav toggling --------------------------------------------------------
  const navMenu = document.getElementById("navMenu");
  const navOrders = document.getElementById("navOrders");
  const menuSection = document.getElementById("menuSection");
  const ordersSection = document.getElementById("ordersSection");

  function showMenu() {
    menuSection.classList.remove("d-none");
    ordersSection.classList.add("d-none");
    navMenu.classList.add("active");
    navOrders.classList.remove("active");
  }

  function showOrders() {
    menuSection.classList.add("d-none");
    ordersSection.classList.remove("d-none");
    navOrders.classList.add("active");
    navMenu.classList.remove("active");
    loadMyOrders();
  }

  if (navMenu && navOrders && menuSection && ordersSection) {
    navMenu.addEventListener("click", (e) => {
      e.preventDefault();
      showMenu();
    });

    navOrders.addEventListener("click", (e) => {
      e.preventDefault();
      showOrders();
    });
  }

  // --- Load My Orders (latest first) --------------------------------------
  function loadMyOrders() {
    const myOrdersBody = document.getElementById("myOrdersBody");
    if (!myOrdersBody) return;

    const myOrders = safeParse(localStorage.getItem("myOrders")) || [];
    myOrdersBody.innerHTML = "";

    if (myOrders.length === 0) {
      myOrdersBody.innerHTML = `<tr><td colspan="5" class="text-muted">No orders yet.</td></tr>`;
      return;
    }

    // show latest first
    [...myOrders].reverse().forEach(order => {
      const itemsHtml = Array.isArray(order.items)
        ? order.items.map(i => `${i.name} (x${i.qty})`).join(", ")
        : (order.items || '');

      const badgeClass = order.status === "Prepared" ? "info" :
                         order.status === "Served" ? "success" : "warning";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${order.token}</td>
        <td>${itemsHtml}</td>
        <td>₹${order.total}</td>
        <td>${order.time}</td>
        <td><span class="badge bg-${badgeClass}">${order.status}</span></td>
      `;
      myOrdersBody.appendChild(tr);
    });
  }

  // --- Sync status changes from staff (bookings -> myOrders) --------------
  window.addEventListener('storage', (e) => {
    if (e.key === 'bookings') {
      const bookings = safeParse(localStorage.getItem("bookings")) || [];
      const myOrders = safeParse(localStorage.getItem("myOrders")) || [];

      // match status updates
      myOrders.forEach(myOrder => {
        const match = bookings.find(b => b.token === myOrder.token);
        if (match) myOrder.status = match.status;
      });
      localStorage.setItem("myOrders", JSON.stringify(myOrders));
      loadMyOrders();
    }
  });

  if (!ordersSection.classList.contains('d-none')) {
    loadMyOrders();
  }
});

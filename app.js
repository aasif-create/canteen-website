// app.js (realtime - matches your index.html structure)
import {
  ref, push, set, onValue, runTransaction, query, orderByChild, equalTo, get
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

document.addEventListener("DOMContentLoaded", () => {
  // Helpers
  const safeParse = s => { try { return JSON.parse(s); } catch(e){ return null; } };
  const sessionTokensKey = "myTokens"; // session-only info so user can view their orders

  // Elements
  const generateBtn = document.getElementById("generateBill");
  const tokenNumberEl = document.getElementById("tokenNumber");
  const modalBillItems = document.getElementById("modalBillItems");
  const modalGrandTotal = document.getElementById("modalGrandTotal");
  const screenshotBtn = document.getElementById("screenshotBill");
  const confirmBtn = document.getElementById("confirmOrder");
  const myOrdersBody = document.getElementById("myOrdersBody");

  // ---- plus/minus qty controls ----
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

  // ---- Generate Bill (modal content) ----
  generateBtn.addEventListener("click", () => {
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
        const li = document.createElement("li");
        li.textContent = `${name} - Qty: ${qty} × ₹${price} = ₹${amount}`;
        modalBillItems.appendChild(li);
      }
    });

    if (total > 0) {
      tokenNumberEl.textContent = `🎟️ Token (will be assigned when you confirm)`;
      modalGrandTotal.textContent = `Grand Total: ₹${total}`;
      const billModal = new bootstrap.Modal(document.getElementById('billModal'));
      billModal.show();
    } else {
      alert("Please select at least one item!");
    }
  });

  // ---- Screenshot ----
  if (screenshotBtn) {
    screenshotBtn.addEventListener("click", () => {
      const billContent = document.querySelector("#billModal .modal-content");
      html2canvas(billContent).then(canvas => {
        const link = document.createElement("a");
        link.download = "bill.png";
        link.href = canvas.toDataURL();
        link.click();
      });
    });
  }

  // ---- Atomic token + push order to Firebase ----
  async function createOrderInFirebase(orderObj) {
    // Atomically increment counter
    const tokenRef = ref(window.db, "counters/nextToken");
    await runTransaction(tokenRef, current => (current || 0) + 1);
    const token = (await get(tokenRef)).val();

    orderObj.token = token;
    orderObj.time = new Date().toLocaleString();
    orderObj.status = "Pending";

    const ordersRef = ref(window.db, "orders");
    const newRef = push(ordersRef); // create new record with unique key
    await set(newRef, orderObj);

    return { token, key: newRef.key };
  }

  // ---- Confirm Order ----
  confirmBtn.addEventListener("click", async () => {
    confirmBtn.disabled = true;

    // collect items
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

    if (orderItems.length === 0) {
      alert("No items selected.");
      confirmBtn.disabled = false;
      return;
    }

    const orderObj = {
      items: orderItems,
      total
    };

    try {
      const { token } = await createOrderInFirebase(orderObj);

      // store token in session so the student can view their order(s) in this session
      const existing = safeParse(sessionStorage.getItem(sessionTokensKey)) || [];
      existing.push(token);
      sessionStorage.setItem(sessionTokensKey, JSON.stringify(existing));

      // hide modal
      const billModalInst = bootstrap.Modal.getInstance(document.getElementById('billModal'));
      if (billModalInst) billModalInst.hide();

      // reset quantities
      document.querySelectorAll(".quantity").forEach(i => i.value = 0);

      // notify user
      alert(`✅ Order placed. Your Token #${token}. Wait for staff to update status.`);

      // start listening for updates for the new token
      listenForOrdersForSession();
    } catch (err) {
      console.error(err);
      alert("Error placing order. Try again.");
    } finally {
      confirmBtn.disabled = false;
    }
  });

  // ---- Render My Orders table using session tokens ----
  function renderMyOrdersFromSnapshot(allOrders) {
    if (!myOrdersBody) return;
    myOrdersBody.innerHTML = "";
    const sessionTokens = safeParse(sessionStorage.getItem(sessionTokensKey)) || [];

    // gather orders that match session tokens
    const matched = [];
    if (allOrders) {
      for (const key in allOrders) {
        const ord = allOrders[key];
        if (sessionTokens.includes(ord.token)) matched.push(ord);
      }
    }

    if (matched.length === 0) {
      myOrdersBody.innerHTML = `<tr><td colspan="5" class="text-muted">No orders yet.</td></tr>`;
      return;
    }

    // newest first
    matched.reverse().forEach(order => {
      const itemsHtml = (Array.isArray(order.items) ? order.items.map(i => `${i.name} (x${i.qty})`).join(", ") : "");
      const badgeClass = order.status === "Prepared" ? "info" :
                         order.status === "Served" ? "success" : "warning";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${order.token}</td>
        <td>${itemsHtml}</td>
        <td>₹${order.total}</td>
        <td>${order.time || ""}</td>
        <td><span class="badge bg-${badgeClass}">${order.status}</span></td>
      `;
      myOrdersBody.appendChild(tr);
    });
  }

  // ---- global listener for all orders and update My Orders table ----
  function listenForOrdersForSession() {
    const ordersRef = ref(window.db, "orders");
    onValue(ordersRef, (snap) => {
      renderMyOrdersFromSnapshot(snap.val());
    });
  }

  // ---- Nav toggles: Menu <-> My Orders ----
  const navMenu = document.getElementById("navMenu");
  const navOrders = document.getElementById("navOrders");
  const menuSection = document.getElementById("menuSection");
  const ordersSection = document.getElementById("ordersSection");

  function showMenu(){
    menuSection.classList.remove("d-none");
    ordersSection.classList.add("d-none");
    navMenu.classList.add("active");
    navOrders.classList.remove("active");
  }
  function showOrders(){
    menuSection.classList.add("d-none");
    ordersSection.classList.remove("d-none");
    navMenu.classList.remove("active");
    navOrders.classList.add("active");
    // ensure orders are loaded
    listenForOrdersForSession();
  }
  if (navMenu && navOrders) {
    navMenu.addEventListener("click", e => { e.preventDefault(); showMenu(); });
    navOrders.addEventListener("click", e => { e.preventDefault(); showOrders(); });
  }

  // if orders page visible by default, load
  if (!ordersSection.classList.contains("d-none")) {
    listenForOrdersForSession();
  }
});

// staff.js (realtime)
import {
  ref, onValue, update, remove, push, get
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

(function () {
  "use strict";

  const activeTbody = document.getElementById("activeOrders");
  const servedTbody = document.getElementById("servedOrders");
  const clearHistoryBtn = document.getElementById("clearHistory");

  const ordersRef = ref(window.db, "orders");
  const servedRef = ref(window.db, "servedOrders");

  function renderActive(orders) {
    activeTbody.innerHTML = "";
    if (!orders) {
      activeTbody.innerHTML = `<tr><td colspan="6" class="text-muted">No active orders.</td></tr>`;
      return;
    }

    Object.entries(orders).forEach(([id, order]) => {
      const status = order.status || "Pending";
      if (status === "Served") return;

      const itemsHtml = Array.isArray(order.items)
        ? order.items.map(it => `${it.name || it.dishName} × ${it.qty || 1} = ₹${it.amount || it.price || 0}`).join("<br>")
        : (order.items || "");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${order.token || "-"}</strong></td>
        <td style="min-width:260px">${itemsHtml}</td>
        <td>₹${order.total || 0}</td>
        <td>${order.time || new Date().toLocaleString()}</td>
        <td><span class="badge ${status === "Prepared" ? "badge-prepared" : "badge-pending"}">${status}</span></td>
        <td class="text-end">
          ${status !== "Prepared" ? `<button class="btn btn-success btn-sm prepare-btn" data-id="${id}"><i class="fa fa-check"></i> Prepared</button>` : ""}
          <button class="btn btn-primary btn-sm serve-btn" data-id="${id}"><i class="fa fa-utensils"></i> Served</button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${id}"><i class="fa fa-trash"></i> Delete</button>
        </td>
      `;
      activeTbody.appendChild(tr);
    });

    if (activeTbody.children.length === 0) {
      activeTbody.innerHTML = `<tr><td colspan="6" class="text-muted">No active orders.</td></tr>`;
    }
  }

  function renderServed(orders) {
    servedTbody.innerHTML = "";
    if (!orders) {
      servedTbody.innerHTML = `<tr><td colspan="5" class="text-muted">No served orders.</td></tr>`;
      return;
    }
    Object.values(orders).forEach(order => {
      const itemsHtml = Array.isArray(order.items)
        ? order.items.map(it => `${it.name || it.dishName} × ${it.qty || 1} = ₹${it.amount || it.price || 0}`).join("<br>")
        : (order.items || "");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${order.token || "-"}</td>
        <td style="min-width:260px">${itemsHtml}</td>
        <td>₹${order.total || 0}</td>
        <td>${order.time || new Date().toLocaleString()}</td>
        <td><span class="badge badge-served">Served</span></td>
      `;
      servedTbody.appendChild(tr);
    });
  }

  async function markPrepared(id) {
    await update(ref(window.db, `orders/${id}`), { status: "Prepared" });
  }

  async function markServed(id) {
    // get order
    const snap = await get(ref(window.db, `orders/${id}`));
    if (!snap.exists()) return;
    const order = snap.val();
    // remove from orders (active)
    await remove(ref(window.db, `orders/${id}`));
    // push into servedOrders
    await push(servedRef, { ...order, status: "Served", time: order.time || new Date().toLocaleString() });
  }

  async function deleteOrder(id) {
    if (!confirm("Delete this order?")) return;
    await remove(ref(window.db, `orders/${id}`));
  }

  async function clearHistory() {
    if (!confirm("Clear all served orders history?")) return;
    await remove(servedRef);
  }

  // event delegation for action buttons
  activeTbody.addEventListener("click", async (e) => {
    const prepareBtn = e.target.closest(".prepare-btn");
    const serveBtn = e.target.closest(".serve-btn");
    const deleteBtn = e.target.closest(".delete-btn");

    if (prepareBtn) {
      await markPrepared(prepareBtn.dataset.id);
    } else if (serveBtn) {
      await markServed(serveBtn.dataset.id);
    } else if (deleteBtn) {
      await deleteOrder(deleteBtn.dataset.id);
    }
  });

  if (clearHistoryBtn) clearHistoryBtn.addEventListener("click", clearHistory);

  // realtime listeners
  onValue(ordersRef, snap => {
    renderActive(snap.val());
  });
  onValue(servedRef, snap => {
    renderServed(snap.val());
  });

  console.log("staff.js realtime listener active");
})();

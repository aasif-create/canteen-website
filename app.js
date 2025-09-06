// ✅ Load tokenCounter from localStorage (if exists), else start at 1
let tokenCounter = localStorage.getItem("tokenCounter")
  ? parseInt(localStorage.getItem("tokenCounter"))
  : 1;

// Add / Subtract button functionality
document.querySelectorAll(".single_menu").forEach(menu => {
  const plus = menu.querySelector(".plus");
  const minus = menu.querySelector(".minus");
  const qtyInput = menu.querySelector(".quantity");

  qtyInput.value = 0; // start from 0

  plus.addEventListener("click", () => {
    qtyInput.value = parseInt(qtyInput.value) + 1;
  });

  minus.addEventListener("click", () => {
    let current = parseInt(qtyInput.value);
    if (current > 0) qtyInput.value = current - 1;
  });
});

// ✅ Bill generating with Sequential Token Number (Persistent)
document.getElementById("generateBill").addEventListener("click", function () {
  const items = document.querySelectorAll(".single_menu");
  let billList = document.getElementById("modalBillItems");
  billList.innerHTML = "";
  let total = 0;

  items.forEach(item => {
    const name = item.querySelector("h4").childNodes[0].textContent.trim();
    const priceText = item.querySelector("h4 span").textContent.replace("₹", "").trim();
    const price = parseInt(priceText);
    const qty = parseInt(item.querySelector(".quantity").value) || 0;

    if (qty > 0) {
      let amount = qty * price;
      total += amount;

      let li = document.createElement("li");
      li.textContent = `${name} - Qty: ${qty} × ₹${price} = ₹${amount}`;
      billList.appendChild(li);
    }
  });

  if (total > 0) {
    // 🎟️ Assign sequential token number (display current, then increment)
    document.getElementById("tokenNumber").textContent = `🎟️ Token #${tokenCounter}`;

    // Increase and save tokenCounter in localStorage (this matches your previous behavior)
    tokenCounter++;
    localStorage.setItem("tokenCounter", tokenCounter);

    // Set grand total
    document.getElementById("modalGrandTotal").textContent = `Grand Total: ₹${total}`;

    // Show the modal
    let billModal = new bootstrap.Modal(document.getElementById('billModal'));
    billModal.show();
  } else {
    alert("Please select at least one item!");
  }
});

// ✅ Screenshot functionality
document.getElementById("screenshotBill").addEventListener("click", function () {
  const billContent = document.querySelector("#billModal .modal-content");
  html2canvas(billContent).then(canvas => {
    let link = document.createElement("a");
    link.download = "bill.png";
    link.href = canvas.toDataURL();
    link.click();
  });
});

// ✅ Confirm Order functionality — UPDATED to save booking into localStorage "bookings"
document.getElementById("confirmOrder").addEventListener("click", function () {
  alert("✅ Order Confirmed!\nPlease wait for your Token Number to be called.");

  // Collect order details again (safe to recalc)
  const items = document.querySelectorAll(".single_menu");
  let orderItems = [];
  let total = 0;

  items.forEach(item => {
    const name = item.querySelector("h4").childNodes[0].textContent.trim();
    const priceText = item.querySelector("h4 span").textContent.replace("₹", "").trim();
    const price = parseInt(priceText);
    const qty = parseInt(item.querySelector(".quantity").value) || 0;

    if (qty > 0) {
      let amount = qty * price;
      total += amount;
      orderItems.push({ name, qty, price, amount });
    }
  });

  // Safety: if total is 0 for some reason, don't save
  if (orderItems.length === 0 || total === 0) {
    // Reset quantities and close modal as fallback (this shouldn't normally happen)
    document.querySelectorAll(".quantity").forEach(input => input.value = 0);
    let billModalFallback = bootstrap.Modal.getInstance(document.getElementById('billModal'));
    if (billModalFallback) billModalFallback.hide();
    document.getElementById("confirmOrder").disabled = false;
    return;
  }

  // ✅ Save order in localStorage for staff (key: "bookings")
  // NOTE: generateBill incremented tokenCounter after showing the modal,
  // so the actual token number used for this booking is tokenCounter - 1
  const assignedToken = tokenCounter - 1;

  let bookings = JSON.parse(localStorage.getItem("bookings")) || [];
  bookings.push({
    token: assignedToken,
    items: orderItems,
    total: total,
    time: new Date().toLocaleString(),
    status: "Pending"
  });
  localStorage.setItem("bookings", JSON.stringify(bookings));

  // Reset all quantities back to 0 for next student
  document.querySelectorAll(".quantity").forEach(input => {
    input.value = 0;
  });

  // Close the modal
  let billModal = bootstrap.Modal.getInstance(document.getElementById('billModal'));
  if (billModal) billModal.hide();

  // Re-enable confirm button for next use (keeps previous behavior)
  document.getElementById("confirmOrder").disabled = false;
});

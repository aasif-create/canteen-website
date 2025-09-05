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

// Bill generating
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
    document.getElementById("modalGrandTotal").textContent = `Grand Total: ₹${total}`;

    // Show the modal
    let billModal = new bootstrap.Modal(document.getElementById('billModal'));
    billModal.show();
  } else {
    alert("Please select at least one item!");
  }
});

// Screenshot functionality
document.getElementById("screenshotBill").addEventListener("click", function () {
  const billContent = document.querySelector("#billModal .modal-content");
  html2canvas(billContent).then(canvas => {
    let link = document.createElement("a");
    link.download = "bill.png";
    link.href = canvas.toDataURL();
    link.click();
  });
});

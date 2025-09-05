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
document.addEventListener('DOMContentLoaded', () => {
  const ordersBody = document.getElementById('ordersBody');
  const searchInput = document.getElementById('searchInput');
  const refreshBtn = document.getElementById('refreshBtn');
  const demoBtn = document.getElementById('demoBtn');
  const detectedKeyEl = document.getElementById('detectedKey');

  // Key we expect (matches updated app.js)
  const STORAGE_KEY = 'bookings';

  function loadBookings() {
    let bookings = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return bookings;
  }

  function saveBookings(bookings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  }

  function render() {
    const q = (searchInput.value || '').trim().toLowerCase();
    let bookings = loadBookings();

    detectedKeyEl.textContent = `Key: ${STORAGE_KEY} (${bookings.length})`;

    // optionally filter by token or item name
    if (q) {
      bookings = bookings.filter(b => {
        if (String(b.token).toLowerCase().includes(q)) return true;
        if (Array.isArray(b.items) && b.items.some(it => it.name.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    ordersBody.innerHTML = '';
    if (!bookings.length) {
      ordersBody.innerHTML = `<tr><td colspan="6" class="text-muted">No bookings found.</td></tr>`;
      return;
    }

    bookings.forEach((b, idx) => {
      const itemsHtml = (Array.isArray(b.items) ? b.items.map(it => `${escapeHtml(it.name)} × ${it.qty} = ₹${it.amount}`).join('<br>') : '');
      const statusLower = (b.status || 'Pending').toLowerCase();
      const statusClass = statusLower.includes('served') ? 'status-served' : (statusLower.includes('prepared') ? 'status-prepared' : 'status-pending');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(b.token)}</strong></td>
        <td style="min-width:260px">${itemsHtml}</td>
        <td>₹${escapeHtml(b.total)}</td>
        <td>${escapeHtml(b.time)}</td>
        <td><span class="status-badge ${statusClass}">${escapeHtml(b.status)}</span></td>
        <td class="text-end">
          <button class="action-btn prepare" data-idx="${idx}">Prepared</button>
          <button class="action-btn serve" data-idx="${idx}">Served</button>
          <button class="action-btn delete" data-idx="${idx}">Delete</button>
        </td>
      `;

      ordersBody.appendChild(tr);
    });

    // attach listeners for newly created buttons
    document.querySelectorAll('.action-btn.prepare').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(e.currentTarget.dataset.idx);
        updateStatus(i, 'Prepared');
      });
    });
    document.querySelectorAll('.action-btn.serve').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(e.currentTarget.dataset.idx);
        updateStatus(i, 'Served');
      });
    });
    document.querySelectorAll('.action-btn.delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const i = parseInt(e.currentTarget.dataset.idx);
        // optional confirmation
        if (confirm('Delete this order?')) {
          deleteOrder(i);
        }
      });
    });
  }

  function updateStatus(index, newStatus) {
    const bookings = loadBookings();
    if (!bookings[index]) return;
    bookings[index].status = newStatus;
    // optionally update time or a servedAt field:
    // bookings[index].servedAt = new Date().toLocaleString();
    saveBookings(bookings);
    render();
  }

  function deleteOrder(index) {
    const bookings = loadBookings();
    if (!bookings[index]) return;
    bookings.splice(index, 1);
    saveBookings(bookings);
    render();
  }

  // small helper to escape HTML
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[s]);
  }

  // demo orders (for testing)
  function addDemo() {
    let bookings = loadBookings();
    bookings.push(
      { token: 101, items: [{ name: 'Veg Biryani', qty: 1, price: 80, amount: 80 }], total: 80, time: new Date().toLocaleString(), status: 'Pending' },
      { token: 102, items: [{ name: 'Chicken Roll', qty: 2, price: 70, amount: 140 }], total: 140, time: new Date().toLocaleString(), status: 'Pending' }
    );
    saveBookings(bookings);
    render();
  }

  // storage event: sync across tabs
  window.addEventListener('storage', (e) => {
    if (!e.key || e.key === 'bookings' || e.key === 'tokenCounter') {
      render();
    }
  });

  // UI interactions
  refreshBtn.addEventListener('click', render);
  demoBtn.addEventListener('click', addDemo);
  searchInput.addEventListener('input', render);

  // initial render
  render();
});

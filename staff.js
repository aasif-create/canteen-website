//5.staff.js

// staff.js (robust version) - expects staff.html to have tbody IDs: activeOrders, servedOrders
(function () {
  'use strict';

  // Helper: escape HTML
  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[s]);
  }

  // Heuristics to detect bookings-like arrays in localStorage
  const POSSIBLE_KEYS = [
    'bookings','orders','canteenBookings','bookingsList','ordersList',
    'cart','userOrders','ordersData','canteen_orders','canteen_bookings'
  ];

  function looksLikeOrder(o){
    if(!o || typeof o !== 'object') return false;
    const hasItems = Array.isArray(o.items) && o.items.length>0;
    const hasDishFields = ['dishName','name','item','title'].some(k => k in o);
    const hasToken = ['token','id','orderId','token_no','tokenNumber'].some(k => k in o);
    const hasTotal = ['total','amount','price'].some(k => k in o);
    return hasItems || hasDishFields || hasToken || hasTotal;
  }

  function detectBookingsKey(){
    // First check likely keys
    for(const k of POSSIBLE_KEYS){
      try {
        const raw = localStorage.getItem(k);
        if(!raw) continue;
        const parsed = JSON.parse(raw);
        if(Array.isArray(parsed) && parsed.length>0 && parsed.every(looksLikeOrder)){
          return k;
        }
      } catch(e){}
    }
    // Scan all keys
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      try {
        const parsed = JSON.parse(localStorage.getItem(k));
        if(Array.isArray(parsed) && parsed.length>0 && parsed.every(looksLikeOrder)){
          return k;
        }
      } catch(e){}
    }
    // fallback
    return 'bookings';
  }

  // DOM refs
  const activeTbody = document.getElementById('activeOrders');
  const servedTbody = document.getElementById('servedOrders');
  const clearHistoryBtn = document.getElementById('clearHistory');

  // storage keys
  const BOOKINGS_KEY = detectBookingsKey(); // typically "bookings"
  const SERVED_KEY = 'servedOrders';

  // Load / Save
  function loadBookings() {
    try {
      return JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || [];
    } catch(e){ return []; }
  }
  function saveBookings(arr){
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(arr));
  }
  function loadServed(){
    try { return JSON.parse(localStorage.getItem(SERVED_KEY)) || []; } catch(e){ return []; }
  }
  function saveServed(arr){
    localStorage.setItem(SERVED_KEY, JSON.stringify(arr));
  }

  // Render Active orders (Pending + Prepared)
  function renderActive() {
    const bookings = loadBookings();
    activeTbody.innerHTML = '';

    const activeList = bookings; // we'll render all but only show pending/prepared rows
    if(!activeList.length){
      activeTbody.innerHTML = `<tr><td colspan="6" class="text-muted">No active orders.</td></tr>`;
      return;
    }

    // For each order we keep the original index so actions target the array entry
    activeList.forEach((b, idx) => {
      const status = (b.status || 'Pending');
      const statusLower = String(status).toLowerCase();
      // show only Pending or Prepared in Active Orders
      if(!(statusLower.includes('pending') || statusLower.includes('prepared'))) return;

      const token = escapeHtml(b.token ?? b.id ?? '');
      const items = Array.isArray(b.items) ? b.items.map(it => {
        const name = escapeHtml(it.name || it.dishName || it.title || 'Item');
        const qty = escapeHtml(it.qty ?? it.quantity ?? 1);
        const amount = escapeHtml(it.amount ?? it.price ?? it.total ?? '');
        return `${name} × ${qty} = ₹${amount}`;
      }).join('<br>') : (escapeHtml(b.dishName || b.name || ''));

      const total = escapeHtml(b.total ?? b.amount ?? '');
      const time = escapeHtml(b.time || b.dateTime || b.timestamp || new Date().toLocaleString());

      const badgeClass = statusLower.includes('prepared') ? 'badge-prepared' : 'badge-pending';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${token}</strong></td>
        <td style="min-width:260px">${items}</td>
        <td>₹${total}</td>
        <td>${time}</td>
        <td><span class="badge ${badgeClass}">${escapeHtml(status)}</span></td>
        <td class="text-end">
          ${ !statusLower.includes('prepared') ? `<button class="btn btn-success btn-sm btn-action prepare-btn" data-idx="${idx}"><i class="fa fa-check"></i> Prepared</button>` : '' }
          <button class="btn btn-primary btn-sm btn-action serve-btn" data-idx="${idx}"><i class="fa fa-utensils"></i> Served</button>
          <button class="btn btn-danger btn-sm btn-action delete-btn" data-idx="${idx}"><i class="fa fa-trash"></i> Delete</button>
        </td>
      `;
      activeTbody.appendChild(tr);
    });

    // if nothing appended because all orders are served, show message
    if(activeTbody.children.length === 0){
      activeTbody.innerHTML = `<tr><td colspan="6" class="text-muted">No active orders.</td></tr>`;
    }

    // attach listeners (use event delegation alternative is fine, here we attach)
    activeTbody.querySelectorAll('.prepare-btn').forEach(btn => btn.addEventListener('click', e => {
      const i = parseInt(e.currentTarget.dataset.idx);
      markPrepared(i);
    }));
    activeTbody.querySelectorAll('.serve-btn').forEach(btn => btn.addEventListener('click', e => {
      const i = parseInt(e.currentTarget.dataset.idx);
      markServed(i);
    }));
    activeTbody.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', e => {
      const i = parseInt(e.currentTarget.dataset.idx);
      if(confirm('Delete this order?')) deleteActive(i);
    }));
  }

  // Render served orders (history)
  function renderServed() {
    const served = loadServed();
    servedTbody.innerHTML = '';
    if(!served || served.length === 0){
      servedTbody.innerHTML = `<tr><td colspan="5" class="text-muted">No served orders.</td></tr>`;
      return;
    }

    served.forEach(b => {
      const token = escapeHtml(b.token ?? b.id ?? '');
      const items = Array.isArray(b.items) ? b.items.map(it => {
        const name = escapeHtml(it.name || it.dishName || it.title || 'Item');
        const qty = escapeHtml(it.qty ?? it.quantity ?? 1);
        const amount = escapeHtml(it.amount ?? it.price ?? it.total ?? '');
        return `${name} × ${qty} = ₹${amount}`;
      }).join('<br>') : (escapeHtml(b.dishName || b.name || ''));

      const total = escapeHtml(b.total ?? b.amount ?? '');
      const time = escapeHtml(b.time || b.dateTime || b.timestamp || new Date().toLocaleString());

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${token}</td>
        <td style="min-width:260px">${items}</td>
        <td>₹${total}</td>
        <td>${time}</td>
        <td><span class="badge badge-served">Served</span></td>
      `;
      servedTbody.appendChild(tr);
    });
  }

  // Actions
  function markPrepared(index){
    const bookings = loadBookings();
    if(!bookings[index]) return;
    bookings[index].status = 'Prepared';
    saveBookings(bookings);
    renderAll();
  }

  function markServed(index){
    const bookings = loadBookings();
    if(!bookings[index]) return;
    const order = bookings.splice(index, 1)[0];
    order.status = 'Served';
    // ensure time exists
    order.time = order.time || new Date().toLocaleString();
    const served = loadServed();
    served.push(order);
    saveBookings(bookings);
    saveServed(served);
    renderAll();
  }

  function deleteActive(index){
    const bookings = loadBookings();
    if(!bookings[index]) return;
    bookings.splice(index, 1);
    saveBookings(bookings);
    renderAll();
  }

  // Clear history handler
  if(clearHistoryBtn){
    clearHistoryBtn.addEventListener('click', () => {
      if(confirm('Clear all served orders history?')) {
        localStorage.removeItem(SERVED_KEY);
        renderAll();
      }
    });
  }

  function renderAll(){
    renderActive();
    renderServed();
  }

  // Sync when localStorage changes in another tab
  window.addEventListener('storage', (e) => {
    if(!e.key || e.key === BOOKINGS_KEY || e.key === SERVED_KEY || e.key === 'tokenCounter'){
      renderAll();
    }
  });

  // initial render
  renderAll();

  // Debug helper - if nothing shows, check console to see detected key
  console.log('staff.js loaded. Using bookings key:', BOOKINGS_KEY);

})();

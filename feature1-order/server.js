// server.js — Canteen Order (Feature #1)
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001; // 3001 to avoid conflicts
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const COUNTERS_FILE = path.join(DATA_DIR, 'counters.json');

// write queue to serialize writes
let writeQueue = Promise.resolve();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// make sure data files exist
async function ensureFiles() {
  try { await fs.access(DATA_DIR); } catch (e) { await fs.mkdir(DATA_DIR, { recursive: true }); }
  try { await fs.access(ORDERS_FILE); } catch (e) { await fs.writeFile(ORDERS_FILE, '[]', 'utf8'); }
  try { await fs.access(COUNTERS_FILE); } catch (e) { await fs.writeFile(COUNTERS_FILE, JSON.stringify({ nextToken: 0 }, null, 2), 'utf8'); }
}

// read orders safely
async function readOrders() {
  await ensureFiles();
  const raw = await fs.readFile(ORDERS_FILE, 'utf8');
  try { return JSON.parse(raw || '[]'); } catch (e) { await fs.writeFile(ORDERS_FILE, '[]', 'utf8'); return []; }
}

// read/write counters
async function readCounters() {
  await ensureFiles();
  const raw = await fs.readFile(COUNTERS_FILE, 'utf8');
  try { return JSON.parse(raw || '{}'); } catch (e) { await fs.writeFile(COUNTERS_FILE, JSON.stringify({ nextToken:0 }, null, 2)); return { nextToken: 0 }; }
}
async function writeCounters(obj) {
  await fs.writeFile(COUNTERS_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

// enqueue writes
function enqueue(fn) {
  writeQueue = writeQueue.then(fn).catch(err => console.error('Queue error', err));
  return writeQueue;
}

// POST /order — create order and assign token
app.post('/order', async (req, res) => {
  try {
    const body = req.body || {};

    // Required minimal validation
    if (!body.name || !body.phone || !Array.isArray(body.items) || body.items.length === 0) {
      return res.status(400).json({ error: 'name, phone and at least one item required' });
    }

    // sanitize basic strings
    for (const k of Object.keys(body)) if (typeof body[k] === 'string') body[k] = body[k].trim();

    // build order object
    const order = {
      id: Date.now().toString() + '-' + Math.floor(Math.random() * 1000),
      name: body.name,
      email: body.email || '',
      phone: body.phone,
      registerNo: body.registerNo || '',
      branch: body.branch || '',
      class: body.class || '',
      arrears: body.arrears || '',
      yearSem: body.yearSem || '',
      address: body.address || '',
      pickupTime: body.pickupTime || '',
      paymentMethod: body.paymentMethod || '',
      diet: body.diet || '',
      comments: body.comments || '',
      items: body.items.slice(), // array of { id, name, qty, price }
      status: 'pending', // pending -> preparing -> served
      createdAt: new Date().toISOString()
    };

    // enqueue token increment + file write so it's atomic in our process
    await enqueue(async () => {
      const counters = await readCounters();
      counters.nextToken = (counters.nextToken || 0) + 1;
      order.token = counters.nextToken;
      await writeCounters(counters);

      const arr = await readOrders();
      arr.push(order);
      await fs.writeFile(ORDERS_FILE, JSON.stringify(arr, null, 2), 'utf8');
    });

    return res.json({ ok: true, id: order.id, token: order.token });
  } catch (err) {
    console.error('Error /order', err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /orders — list orders (for dashboard later)
app.get('/orders', async (req, res) => {
  try {
    const arr = await readOrders();
    res.json(arr);
  } catch (err) {
    console.error('Error /orders', err);
    res.status(500).json({ error: 'server error' });
  }
});

// GET /orders/:id
app.get('/orders/:id', async (req, res) => {
  try {
    const arr = await readOrders();
    const item = arr.find(x => x.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

app.listen(PORT, () => console.log(Canteen order server running on http://localhost:${PORT} (feature1)));
/* ============================================================
   server.js — API REST para Biblioteca Escolar MEP
   ============================================================ */
'use strict';

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const MONGO_URI = 'mongodb+srv://isaacalejandroarguedasleiton_db_user:66414826@cluster0.2lyxuqg.mongodb.net/?retryWrites=true&w=majority';
const DB_NAME = 'biblioteca';

let db;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://ssacrosscr.github.io'
  ],
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '..')));

// ── Conexión a MongoDB ──────────────────────────────────────

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('Conectado a MongoDB Atlas — BD:', DB_NAME);
}

// ── Helper: convertir _id de Mongo a id numérico en respuesta ──

function toClient(doc) {
  if (!doc) return null;
  const obj = { ...doc };
  if (obj._id) delete obj._id;
  return obj;
}

function toClientArray(docs) {
  return docs.map(toClient);
}

// ════════════════════════════════════════════════════════════
//  LIBROS
// ════════════════════════════════════════════════════════════

app.get('/api/libros', async (req, res) => {
  try {
    const libros = await db.collection('libros').find().sort({ id: 1 }).toArray();
    res.json(toClientArray(libros));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/libros', async (req, res) => {
  try {
    const counter = await db.collection('counters').findOneAndUpdate(
      { _id: 'libros' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const libro = { id: counter.seq, ...req.body };
    await db.collection('libros').insertOne(libro);
    res.status(201).json(toClient(libro));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/libros/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.collection('libros').updateOne({ id }, { $set: req.body });
    const updated = await db.collection('libros').findOne({ id });
    res.json(toClient(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  ESTUDIANTES
// ════════════════════════════════════════════════════════════

app.get('/api/estudiantes', async (req, res) => {
  try {
    const estudiantes = await db.collection('estudiantes').find().sort({ id: 1 }).toArray();
    res.json(toClientArray(estudiantes));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/estudiantes', async (req, res) => {
  try {
    const counter = await db.collection('counters').findOneAndUpdate(
      { _id: 'estudiantes' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const est = { id: counter.seq, ...req.body };
    await db.collection('estudiantes').insertOne(est);
    res.status(201).json(toClient(est));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  DOCENTES
// ════════════════════════════════════════════════════════════

app.get('/api/docentes', async (req, res) => {
  try {
    const docentes = await db.collection('docentes').find().sort({ id: 1 }).toArray();
    res.json(toClientArray(docentes));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/docentes', async (req, res) => {
  try {
    const counter = await db.collection('counters').findOneAndUpdate(
      { _id: 'docentes' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const doc = { id: counter.seq, ...req.body };
    await db.collection('docentes').insertOne(doc);
    res.status(201).json(toClient(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  PRÉSTAMOS
// ════════════════════════════════════════════════════════════

app.get('/api/prestamos', async (req, res) => {
  try {
    const prestamos = await db.collection('prestamos').find().sort({ id: 1 }).toArray();
    res.json(toClientArray(prestamos));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prestamos', async (req, res) => {
  try {
    const counter = await db.collection('counters').findOneAndUpdate(
      { _id: 'prestamos' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const prest = { id: counter.seq, ...req.body };
    await db.collection('prestamos').insertOne(prest);
    res.status(201).json(toClient(prest));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/prestamos/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.collection('prestamos').updateOne({ id }, { $set: req.body });
    const updated = await db.collection('prestamos').findOne({ id });
    res.json(toClient(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Arrancar servidor ───────────────────────────────────────

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error al conectar con MongoDB:', err.message);
  process.exit(1);
});

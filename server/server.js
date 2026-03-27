/* ============================================================
   server.js — API REST para Biblioteca Escolar MEP
   ============================================================ */
'use strict';

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'biblio-mep-secret-2026';

const MONGO_URI = 'mongodb+srv://isaacalejandroarguedasleiton_db_user:66414826@cluster0.2lyxuqg.mongodb.net/?retryWrites=true&w=majority';
const DB_NAME = 'biblioteca';

let db;

// Middleware
app.use(cors());
app.options('*', cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..')));

// ── Conexión a MongoDB ──────────────────────────────────────

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('Conectado a MongoDB Atlas — BD:', DB_NAME);
}

// ── Helpers ─────────────────────────────────────────────────

function toClient(doc) {
  if (!doc) return null;
  const obj = { ...doc };
  if (obj._id) delete obj._id;
  if (obj.password) delete obj.password;
  return obj;
}

function toClientArray(docs) {
  return docs.map(toClient);
}

// ── Auth Middleware ──────────────────────────────────────────

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: 'Acceso solo para administradores' });
  }
  next();
}

// ════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════

app.post('/api/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }
    const user = await db.collection('usuarios').findOne({ usuario });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }
    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, nombre: user.nombre, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: { id: user.id, usuario: user.usuario, nombre: user.nombre, rol: user.rol, foto: user.foto || '' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/me', auth, (req, res) => {
  res.json(req.user);
});

// ── Mi perfil (cualquier usuario autenticado) ───────────────

app.get('/api/mi-perfil', auth, async (req, res) => {
  try {
    const user = await db.collection('usuarios').findOne({ id: req.user.id });
    res.json(toClient(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/mi-perfil', auth, async (req, res) => {
  try {
    const update = {};
    if (req.body.nombre) update.nombre = req.body.nombre;
    if (req.body.password) update.password = await bcrypt.hash(req.body.password, 10);
    if (req.body.foto !== undefined) update.foto = req.body.foto;
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }
    await db.collection('usuarios').updateOne({ id: req.user.id }, { $set: update });
    const updated = await db.collection('usuarios').findOne({ id: req.user.id });
    res.json(toClient(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  USUARIOS (admin only)
// ════════════════════════════════════════════════════════════

app.get('/api/usuarios', auth, adminOnly, async (req, res) => {
  try {
    const usuarios = await db.collection('usuarios').find().sort({ id: 1 }).toArray();
    res.json(toClientArray(usuarios));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/usuarios', auth, adminOnly, async (req, res) => {
  try {
    const { usuario, password, nombre, rol } = req.body;
    if (!usuario || !password || !nombre) {
      return res.status(400).json({ error: 'Campos requeridos: usuario, password, nombre' });
    }
    const exists = await db.collection('usuarios').findOne({ usuario });
    if (exists) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    const hash = await bcrypt.hash(password, 10);
    const counter = await db.collection('counters').findOneAndUpdate(
      { _id: 'usuarios' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const newUser = { id: counter.seq, usuario, password: hash, nombre, rol: rol || 'usuario' };
    await db.collection('usuarios').insertOne(newUser);
    res.status(201).json(toClient(newUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/usuarios/:id', auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const update = { ...req.body };
    if (update.password) {
      update.password = await bcrypt.hash(update.password, 10);
    }
    await db.collection('usuarios').updateOne({ id }, { $set: update });
    const updated = await db.collection('usuarios').findOne({ id });
    res.json(toClient(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/usuarios/:id', auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === 1) return res.status(400).json({ error: 'No se puede eliminar al administrador principal' });
    await db.collection('usuarios').deleteOne({ id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  LIBROS
// ════════════════════════════════════════════════════════════

app.get('/api/libros', auth, async (req, res) => {
  try {
    const libros = await db.collection('libros').find({ eliminado: { $ne: true } }).sort({ id: 1 }).toArray();
    res.json(toClientArray(libros));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/libros', auth, async (req, res) => {
  try {
    const counter = await db.collection('counters').findOneAndUpdate(
      { _id: 'libros' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const libro = { id: counter.seq, ...req.body, eliminado: false };
    await db.collection('libros').insertOne(libro);
    res.status(201).json(toClient(libro));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/libros/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.collection('libros').updateOne({ id }, { $set: req.body });
    const updated = await db.collection('libros').findOne({ id });
    res.json(toClient(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/libros/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.collection('libros').updateOne({ id }, { $set: { eliminado: true } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  ESTUDIANTES
// ════════════════════════════════════════════════════════════

app.get('/api/estudiantes', auth, async (req, res) => {
  try {
    const estudiantes = await db.collection('estudiantes').find().sort({ id: 1 }).toArray();
    res.json(toClientArray(estudiantes));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/estudiantes', auth, async (req, res) => {
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

app.get('/api/docentes', auth, async (req, res) => {
  try {
    const docentes = await db.collection('docentes').find().sort({ id: 1 }).toArray();
    res.json(toClientArray(docentes));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/docentes', auth, async (req, res) => {
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

app.get('/api/prestamos', auth, async (req, res) => {
  try {
    const prestamos = await db.collection('prestamos').find().sort({ id: -1 }).toArray();
    res.json(toClientArray(prestamos));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prestamos', auth, async (req, res) => {
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

app.put('/api/prestamos/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.collection('prestamos').updateOne({ id }, { $set: req.body });
    const updated = await db.collection('prestamos').findOne({ id });
    res.json(toClient(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Historial (préstamos devueltos) ────────────────────────

app.get('/api/historial', auth, async (req, res) => {
  try {
    const historial = await db.collection('prestamos').find({ dev: true }).sort({ id: -1 }).toArray();
    res.json(toClientArray(historial));
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

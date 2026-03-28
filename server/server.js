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

  // Migrar candy (id=2) de 'usuario' a 'bibliotecologo' si aún no se hizo
  await db.collection('usuarios').updateOne(
    { id: 2, rol: 'usuario' },
    { $set: { rol: 'bibliotecologo' } }
  );

  // Asegurar documento de configuración
  const cfg = await db.collection('config').findOne({ _id: 'site' });
  if (!cfg) {
    await db.collection('config').insertOne({ _id: 'site', logo: '', favicon: '' });
  }
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

const VALID_ROLES = ['admin', 'usuario', 'bibliotecologo', 'docente'];

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

function biblioOnly(req, res, next) {
  if (req.user.rol !== 'admin' && req.user.rol !== 'bibliotecologo') {
    return res.status(403).json({ error: 'Acceso solo para bibliotecólogos' });
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
    // Admin no puede quitarse su propio rol
    if (req.body.rol && req.user.rol === 'admin') {
      // Ignorar cambio de rol para admin editándose a sí mismo
    } else if (req.body.rol) {
      update.rol = req.body.rol;
    }
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

app.get('/api/usuarios', auth, biblioOnly, async (req, res) => {
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
    const finalRol = VALID_ROLES.indexOf(rol) !== -1 ? rol : 'usuario';
    const newUser = { id: counter.seq, usuario, password: hash, nombre, rol: finalRol };
    await db.collection('usuarios').insertOne(newUser);
    res.status(201).json(toClient(newUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/usuarios/:id', auth, biblioOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const update = { ...req.body };
    // Proteger: admin no puede quitarse su propio rol
    if (id === req.user.id && req.user.rol === 'admin' && update.rol && update.rol !== 'admin') {
      return res.status(400).json({ error: 'No puede quitarse el rol de administrador' });
    }
    if (update.password) {
      update.password = await bcrypt.hash(update.password, 10);
    }
    if (update.rol && VALID_ROLES.indexOf(update.rol) === -1) {
      update.rol = 'usuario';
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

app.post('/api/libros', auth, biblioOnly, async (req, res) => {
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

app.put('/api/libros/:id', auth, biblioOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.collection('libros').updateOne({ id }, { $set: req.body });
    const updated = await db.collection('libros').findOne({ id });
    res.json(toClient(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/libros/:id', auth, biblioOnly, async (req, res) => {
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

app.get('/api/estudiantes', auth, biblioOnly, async (req, res) => {
  try {
    const estudiantes = await db.collection('estudiantes').find().sort({ id: 1 }).toArray();
    res.json(toClientArray(estudiantes));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/estudiantes', auth, biblioOnly, async (req, res) => {
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

app.get('/api/docentes', auth, biblioOnly, async (req, res) => {
  try {
    const docentes = await db.collection('docentes').find().sort({ id: 1 }).toArray();
    res.json(toClientArray(docentes));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/docentes', auth, biblioOnly, async (req, res) => {
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

app.get('/api/prestamos', auth, biblioOnly, async (req, res) => {
  try {
    const prestamos = await db.collection('prestamos').find().sort({ id: -1 }).toArray();
    res.json(toClientArray(prestamos));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/prestamos', auth, biblioOnly, async (req, res) => {
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

app.put('/api/prestamos/:id', auth, biblioOnly, async (req, res) => {
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

app.get('/api/historial', auth, biblioOnly, async (req, res) => {
  try {
    const historial = await db.collection('prestamos').find({ dev: true }).sort({ id: -1 }).toArray();
    res.json(toClientArray(historial));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  SOLICITUDES
// ════════════════════════════════════════════════════════════

app.get('/api/solicitudes', auth, async (req, res) => {
  try {
    let filter = {};
    if (req.user.rol === 'docente') {
      filter.docenteId = req.user.id;
    } else if (req.user.rol !== 'admin' && req.user.rol !== 'bibliotecologo') {
      return res.status(403).json({ error: 'Sin acceso' });
    }
    const solicitudes = await db.collection('solicitudes').find(filter).sort({ id: -1 }).toArray();
    res.json(toClientArray(solicitudes));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/solicitudes', auth, async (req, res) => {
  try {
    const isDocente = req.user.rol === 'docente';
    const isBiblio  = req.user.rol === 'bibliotecologo' || req.user.rol === 'admin';
    if (!isDocente && !isBiblio) {
      return res.status(403).json({ error: 'Sin acceso para crear solicitudes' });
    }

    const { items, notas, tipoSolicitante, solicitanteId, solicitanteNombre, prioridad } = req.body;

    // Determinar solicitante
    let finalTipo, finalId, finalNombre;
    if (isDocente) {
      finalTipo   = 'docente';
      finalId     = req.user.id;
      finalNombre = req.user.nombre;
    } else {
      // Biblio/admin crea en nombre de alguien
      if (!tipoSolicitante || !solicitanteNombre || !String(solicitanteNombre).trim()) {
        return res.status(400).json({ error: 'Tipo y nombre del solicitante son requeridos' });
      }
      if (!['docente', 'estudiante', 'visitante'].includes(tipoSolicitante)) {
        return res.status(400).json({ error: 'Tipo de solicitante inválido' });
      }
      finalTipo   = tipoSolicitante;
      finalId     = solicitanteId ? parseInt(solicitanteId) : null;
      finalNombre = String(solicitanteNombre).trim().substring(0, 200);
    }

    // Validar items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debe incluir al menos un libro' });
    }
    for (const item of items) {
      if (!item.libroId || !item.cantidad || item.cantidad < 1 || item.cantidad > 99) {
        return res.status(400).json({ error: 'Item inválido en la solicitud' });
      }
      const libro = await db.collection('libros').findOne({ id: item.libroId, eliminado: { $ne: true } });
      if (!libro) return res.status(400).json({ error: 'Libro no encontrado: ' + item.libroId });
      item.titulo = libro.titulo;
    }

    // Prioridad automática por tipo
    const PRIORIDAD_MAP = { docente: 'alta', estudiante: 'media', visitante: 'baja' };
    const finalPrioridad = (prioridad && ['alta', 'media', 'baja'].includes(prioridad))
      ? prioridad : (PRIORIDAD_MAP[finalTipo] || 'media');

    const counter = await db.collection('counters').findOneAndUpdate(
      { _id: 'solicitudes' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );

    const solicitud = {
      id: counter.seq,
      tipoSolicitante: finalTipo,
      solicitanteId:   finalId,
      solicitanteNombre: finalNombre,
      // Retrocompatibilidad
      docenteId:     isDocente ? req.user.id : (finalTipo === 'docente' ? finalId : null),
      docenteNombre: finalNombre,
      items,
      prioridad: finalPrioridad,
      estado: 'pendiente',
      fecha: new Date().toISOString().slice(0, 10),
      fechaRespuesta: null,
      respondidoPor:  null,
      notas: notas ? String(notas).substring(0, 500) : '',
      notasRespuesta: '',
      convertido: false
    };

    await db.collection('solicitudes').insertOne(solicitud);
    res.status(201).json(toClient(solicitud));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/solicitudes/:id', auth, biblioOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { estado, notasRespuesta } = req.body;

    const VALID_ESTADOS = ['aprobada', 'rechazada', 'en_espera', 'pendiente'];
    if (!VALID_ESTADOS.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const existing = await db.collection('solicitudes').findOne({ id });
    if (!existing) return res.status(404).json({ error: 'Solicitud no encontrada' });

    // Aprobada/rechazada son estados finales — no se modifican
    if (existing.estado === 'aprobada' || existing.estado === 'rechazada') {
      return res.status(400).json({ error: 'Esta solicitud ya fue resuelta y no puede modificarse' });
    }

    const isFinal = estado === 'aprobada' || estado === 'rechazada';
    const update = {
      estado,
      notasRespuesta: notasRespuesta ? String(notasRespuesta).substring(0, 500) : (existing.notasRespuesta || ''),
      fechaRespuesta: isFinal ? new Date().toISOString().slice(0, 10) : null,
      respondidoPor:  isFinal ? req.user.nombre : null
    };

    await db.collection('solicitudes').updateOne({ id }, { $set: update });
    const updated = await db.collection('solicitudes').findOne({ id });
    res.json(toClient(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Convertir solicitud aprobada en préstamo(s)
app.post('/api/solicitudes/:id/convertir', auth, biblioOnly, async (req, res) => {
  try {
    const id   = parseInt(req.params.id);
    const { pId, pT, fd } = req.body;

    if (!pId || !pT || !fd) {
      return res.status(400).json({ error: 'Persona (pId, pT) y fecha de devolución (fd) son requeridos' });
    }
    if (pT !== 'e' && pT !== 'd') {
      return res.status(400).json({ error: 'pT debe ser "e" (estudiante) o "d" (docente)' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fd)) {
      return res.status(400).json({ error: 'Fecha de devolución inválida' });
    }

    const solicitud = await db.collection('solicitudes').findOne({ id });
    if (!solicitud)                  return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (solicitud.estado !== 'aprobada') return res.status(400).json({ error: 'Solo se pueden convertir solicitudes aprobadas' });
    if (solicitud.convertido)        return res.status(400).json({ error: 'Esta solicitud ya fue convertida en préstamo' });

    const fp = new Date().toISOString().slice(0, 10);
    if (new Date(fd) <= new Date(fp)) {
      return res.status(400).json({ error: 'La fecha de devolución debe ser posterior a hoy' });
    }

    const prestamosCreados = [];
    const errores = [];

    for (const item of solicitud.items) {
      const libro = await db.collection('libros').findOne({ id: item.libroId, eliminado: { $ne: true } });
      if (!libro) { errores.push('Libro no encontrado: ' + (item.titulo || item.libroId)); continue; }

      const activos     = await db.collection('prestamos').countDocuments({ lId: item.libroId, dev: false });
      const disponibles = libro.ejemplares - activos;

      if (disponibles < 1) {
        errores.push('Sin ejemplares disponibles: ' + libro.titulo);
        continue;
      }

      const qty = Math.min(item.cantidad || 1, disponibles);
      for (let q = 0; q < qty; q++) {
        const counter = await db.collection('counters').findOneAndUpdate(
          { _id: 'prestamos' },
          { $inc: { seq: 1 } },
          { returnDocument: 'after', upsert: true }
        );
        const prestamo = {
          id: counter.seq,
          pId: parseInt(pId),
          pT,
          lId: item.libroId,
          fp,
          fd,
          dev: false,
          n: 'Solicitud #' + solicitud.id,
          solicitudId: solicitud.id
        };
        await db.collection('prestamos').insertOne(prestamo);
        prestamosCreados.push(toClient(prestamo));
      }
    }

    if (prestamosCreados.length > 0) {
      await db.collection('solicitudes').updateOne(
        { id },
        { $set: { convertido: true, convertidoPor: req.user.nombre, fechaConversion: fp } }
      );
    }

    res.json({ prestamosCreados, errores });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  CONFIGURACIÓN (admin only)
// ════════════════════════════════════════════════════════════

app.get('/api/config', async (req, res) => {
  try {
    const cfg = await db.collection('config').findOne({ _id: 'site' });
    res.json({ logo: (cfg && cfg.logo) || '', favicon: (cfg && cfg.favicon) || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/config', auth, adminOnly, async (req, res) => {
  try {
    const update = {};
    if (req.body.logo !== undefined) update.logo = req.body.logo;
    if (req.body.favicon !== undefined) update.favicon = req.body.favicon;
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'Nada que actualizar' });
    }
    await db.collection('config').updateOne({ _id: 'site' }, { $set: update }, { upsert: true });
    const cfg = await db.collection('config').findOne({ _id: 'site' });
    res.json({ logo: cfg.logo || '', favicon: cfg.favicon || '' });
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

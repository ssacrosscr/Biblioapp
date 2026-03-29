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

const MONGO_URI = process.env.MONGO_URI
  || 'mongodb+srv://isaacalejandroarguedasleiton_db_user:66414826@cluster0.2lyxuqg.mongodb.net/?retryWrites=true&w=majority';
const DB_NAME = 'biblioteca';

let db;

// Middleware
app.use(cors());
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
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
    const { titulo, autor, materia, nivel, ejemplares, editorial, isbn, c, icon, portada } = req.body;
    if (!titulo || !materia) return res.status(400).json({ error: 'Título y materia son requeridos' });
    const counter = await db.collection('counters').findOneAndUpdate(
      { _id: 'libros' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const libro = {
      id:        counter.seq,
      titulo:    String(titulo).slice(0, 300),
      autor:     autor     ? String(autor).slice(0, 200)    : '',
      materia:   String(materia).slice(0, 100),
      nivel:     nivel     ? String(nivel).slice(0, 50)     : 'General',
      ejemplares: Math.max(0, parseInt(ejemplares) || 1),
      editorial: editorial ? String(editorial).slice(0, 200) : '',
      isbn:      isbn      ? String(isbn).slice(0, 30)      : '',
      c:         parseInt(c) || 0,
      icon:      icon      ? String(icon).slice(0, 10)      : '\uD83D\uDCD6',
      portada:   portada   ? String(portada).slice(0, 7000000) : '',
      eliminado: false,
    };
    await db.collection('libros').insertOne(libro);
    res.status(201).json(toClient(libro));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/libros/:id', auth, biblioOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { titulo, autor, materia, nivel, ejemplares, editorial, isbn, c, icon, portada } = req.body;
    const update = {};
    if (titulo     !== undefined) update.titulo     = String(titulo).slice(0, 300);
    if (autor      !== undefined) update.autor      = String(autor).slice(0, 200);
    if (materia    !== undefined) update.materia    = String(materia).slice(0, 100);
    if (nivel      !== undefined) update.nivel      = String(nivel).slice(0, 50);
    if (ejemplares !== undefined) update.ejemplares = Math.max(0, parseInt(ejemplares) || 0);
    if (editorial  !== undefined) update.editorial  = String(editorial).slice(0, 200);
    if (isbn       !== undefined) update.isbn       = String(isbn).slice(0, 30);
    if (c          !== undefined) update.c          = parseInt(c) || 0;
    if (icon       !== undefined) update.icon       = String(icon).slice(0, 10);
    if (portada    !== undefined) update.portada    = String(portada).slice(0, 7000000);
    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
    await db.collection('libros').updateOne({ id }, { $set: update });
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
//  DOCENTES  (único tipo de persona con préstamos)
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
    const { nombre, cedula, materia, usuario, password, rol } = req.body;
    if (!nombre || !cedula) return res.status(400).json({ error: 'Nombre y cédula son requeridos' });

    const counter = await db.collection('counters').findOneAndUpdate(
      { _id: 'docentes' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );

    const finalRol = (rol === 'bibliotecologo') ? 'bibliotecologo' : 'docente';
    const loginUser = usuario ? String(usuario).trim() : String(cedula).trim();
    const loginPass = password ? String(password).trim() : String(cedula).trim();

    // Crear cuenta de usuario vinculada (usa cédula como usuario/contraseña por defecto)
    let usuarioId = null;
    const existing = await db.collection('usuarios').findOne({ usuario: loginUser });
    if (!existing) {
      const uCounter = await db.collection('counters').findOneAndUpdate(
        { _id: 'usuarios' },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
      );
      const hash = await bcrypt.hash(loginPass, 10);
      const newUser = { id: uCounter.seq, usuario: loginUser, password: hash, nombre: String(nombre).slice(0, 200), rol: finalRol };
      await db.collection('usuarios').insertOne(newUser);
      usuarioId = uCounter.seq;
    } else {
      usuarioId = existing.id;
    }

    const doc = {
      id:        counter.seq,
      nombre:    String(nombre).slice(0, 200),
      cedula:    String(cedula).slice(0, 30),
      materia:   materia ? String(materia).slice(0, 100) : 'Otro',
      usuarioId: usuarioId,
    };
    await db.collection('docentes').insertOne(doc);
    res.status(201).json(toClient(doc));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/docentes/:id', auth, biblioOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nombre, cedula, materia, foto, password, rol, usuario } = req.body;

    const docente = await db.collection('docentes').findOne({ id });
    if (!docente) return res.status(404).json({ error: 'Docente no encontrado' });

    // Actualizar campos del docente
    const docUpdate = {};
    if (nombre)              docUpdate.nombre  = String(nombre).slice(0, 200);
    if (cedula)              docUpdate.cedula  = String(cedula).slice(0, 30);
    if (materia)             docUpdate.materia = String(materia).slice(0, 100);
    if (foto !== undefined)  docUpdate.foto    = foto ? String(foto).slice(0, 7000000) : '';
    if (Object.keys(docUpdate).length > 0) {
      await db.collection('docentes').updateOne({ id }, { $set: docUpdate });
    }

    // Actualizar usuario vinculado
    const userUpdate = {};
    if (nombre)   userUpdate.nombre = String(nombre).slice(0, 200);
    if (foto !== undefined) userUpdate.foto = foto ? String(foto).slice(0, 7000000) : '';
    if (password && String(password).trim().length >= 4) {
      userUpdate.password = await bcrypt.hash(String(password).trim(), 10);
    }
    if (rol && rol !== 'admin') {
      userUpdate.rol = (rol === 'bibliotecologo') ? 'bibliotecologo' : 'docente';
    }
    if (usuario && String(usuario).trim().length >= 3) {
      const newUser = String(usuario).trim().slice(0, 50);
      // Check uniqueness (exclude the linked user itself)
      const userQuery2 = docente.usuarioId
        ? { id: docente.usuarioId }
        : { nombre: docente.nombre, rol: { $in: ['docente', 'bibliotecologo'] } };
      const linkedUser2 = await db.collection('usuarios').findOne(userQuery2);
      const taken = await db.collection('usuarios').findOne({
        usuario: newUser,
        ...(linkedUser2 ? { id: { $ne: linkedUser2.id } } : {})
      });
      if (taken) return res.status(409).json({ error: 'Ese nombre de usuario ya est\u00E1 en uso' });
      userUpdate.usuario = newUser;
    }

    if (Object.keys(userUpdate).length > 0) {
      // Buscar por usuarioId almacenado, o por nombre+rol como fallback
      let userQuery = docente.usuarioId
        ? { id: docente.usuarioId }
        : { nombre: docente.nombre, rol: { $in: ['docente', 'bibliotecologo'] } };
      await db.collection('usuarios').updateOne(userQuery, { $set: userUpdate });

      // Guardar usuarioId si aún no estaba almacenado
      if (!docente.usuarioId) {
        const linkedUser = await db.collection('usuarios').findOne(userQuery);
        if (linkedUser) {
          await db.collection('docentes').updateOne({ id }, { $set: { usuarioId: linkedUser.id } });
        }
      }
    }

    const updated = await db.collection('docentes').findOne({ id });
    res.json(toClient(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/docentes/:id', auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const docente = await db.collection('docentes').findOne({ id });
    if (!docente) return res.status(404).json({ error: 'Docente no encontrado' });

    // Eliminar usuario vinculado si existe
    if (docente.usuarioId) {
      await db.collection('usuarios').deleteOne({ id: docente.usuarioId });
    }
    await db.collection('docentes').deleteOne({ id });
    res.json({ ok: true });
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
    const { pId, lId, fp, fd, dev, n } = req.body;
    if (!pId || !lId || !fp || !fd) {
      return res.status(400).json({ error: 'Docente, libro y fechas son requeridos' });
    }
    const counter = await db.collection('counters').findOneAndUpdate(
      { _id: 'prestamos' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const prest = {
      id:  counter.seq,
      pId: parseInt(pId),
      pT:  'd',
      lId: parseInt(lId),
      fp:  String(fp).slice(0, 30),
      fd:  String(fd).slice(0, 30),
      dev: dev === true || dev === 'true' ? true : false,
      n:   n ? String(n).slice(0, 300) : '',
    };
    await db.collection('prestamos').insertOne(prest);
    res.status(201).json(toClient(prest));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/prestamos/:id', auth, biblioOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { dev, fp, fd, n } = req.body;
    const update = {};
    if (dev !== undefined) update.dev = dev === true || dev === 'true' ? true : false;
    if (fp  !== undefined) update.fp  = String(fp).slice(0, 30);
    if (fd  !== undefined) update.fd  = String(fd).slice(0, 30);
    if (n   !== undefined) update.n   = String(n).slice(0, 300);
    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'Nada que actualizar' });
    await db.collection('prestamos').updateOne({ id }, { $set: update });
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
      // Compatibilidad: seed usa "usuarioId", nuevas solicitudes usan "docenteId"/"solicitanteId"
      filter.$or = [
        { docenteId:     req.user.id },
        { solicitanteId: req.user.id },
        { usuarioId:     req.user.id }
      ];
    } else if (req.user.rol !== 'admin' && req.user.rol !== 'bibliotecologo') {
      return res.status(403).json({ error: 'Sin acceso' });
    }
    const rawDocs = await db.collection('solicitudes').find(filter).sort({ id: -1 }).toArray();
    // Normalizar campos: compatibilidad con datos del seed (usuarioNombre, motivacion, respuesta)
    const solicitudes = rawDocs.map(doc => {
      const n = toClient(doc);
      if (!n.solicitanteNombre) n.solicitanteNombre = n.docenteNombre || n.usuarioNombre || '';
      if (!n.tipoSolicitante)   n.tipoSolicitante   = 'docente';
      if (!n.notas)             n.notas             = n.motivacion || '';
      if (!n.notasRespuesta)    n.notasRespuesta     = n.respuesta  || '';
      if (n.convertido === undefined) n.convertido  = false;
      if (!n.prioridad)         n.prioridad         = null;
      return n;
    });
    res.json(solicitudes);
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
      if (tipoSolicitante !== 'docente') {
        return res.status(400).json({ error: 'Solo se permiten solicitudes de docentes' });
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
    const PRIORIDAD_MAP = { docente: 'alta' };
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
    const { pId, fd } = req.body;

    if (!pId || !fd) {
      return res.status(400).json({ error: 'Docente (pId) y fecha de devolución (fd) son requeridos' });
    }
    const pT = 'd';
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

// ════════════════════════════════════════════════════════════
//  VISITAS (control de asistencia de grupos)
// ════════════════════════════════════════════════════════════

function calcTiempo(horaEntrada, horaSalida) {
  if (!horaEntrada || !horaSalida) return null;
  const [eh, em] = horaEntrada.split(':').map(Number);
  const [sh, sm] = horaSalida.split(':').map(Number);
  const min = (sh * 60 + sm) - (eh * 60 + em);
  return min > 0 ? min : null;
}

app.get('/api/visitas', auth, biblioOnly, async (req, res) => {
  try {
    const query = {};
    if (req.query.fecha)      query.fecha      = req.query.fecha;
    if (req.query.docenteId)  query.docenteId  = parseInt(req.query.docenteId);
    if (req.query.seccion)    query.seccion    = req.query.seccion;
    if (req.query.estado)     query.estado     = req.query.estado;
    if (req.query.desde || req.query.hasta) {
      query.fecha = {};
      if (req.query.desde) query.fecha.$gte = req.query.desde;
      if (req.query.hasta) query.fecha.$lte = req.query.hasta;
    }
    const visitas = await db.collection('visitas').find(query).sort({ id: -1 }).toArray();
    res.json(toClientArray(visitas));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/visitas', auth, biblioOnly, async (req, res) => {
  try {
    const { fecha, horaEntrada, horaSalida, docenteId, docenteNombre, seccion, cantEstudiantes, observaciones } = req.body;
    if (!fecha || !horaEntrada || !docenteId || !seccion || !cantEstudiantes) {
      return res.status(400).json({ error: 'Fecha, hora de entrada, docente, sección y cantidad de estudiantes son obligatorios' });
    }
    if (horaSalida && calcTiempo(horaEntrada, horaSalida) === null) {
      return res.status(400).json({ error: 'La hora de salida debe ser posterior a la hora de entrada' });
    }
    // Validar solapamiento de horario para la misma sección/fecha
    const overlap = await db.collection('visitas').findOne({
      fecha, seccion, estado: 'activo'
    });
    if (overlap) {
      return res.status(400).json({ error: 'Ya existe una visita activa para esta sección en esta fecha' });
    }
    const tiempoTotal = calcTiempo(horaEntrada, horaSalida);
    const estado = horaSalida ? 'completado' : 'activo';
    const counter = await db.collection('counters').findOneAndUpdate(
      { _id: 'visitas' },
      { $inc: { seq: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const visita = {
      id: counter.seq,
      fecha,
      horaEntrada,
      horaSalida: horaSalida || null,
      tiempoTotal,
      docenteId: parseInt(docenteId),
      docenteNombre: docenteNombre || '',
      seccion,
      cantEstudiantes: parseInt(cantEstudiantes),
      observaciones: observaciones || '',
      estado,
      creadoPor: req.user.id,
      creadoEn: new Date().toISOString()
    };
    await db.collection('visitas').insertOne(visita);
    res.status(201).json(toClient(visita));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/visitas/:id', auth, biblioOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { horaEntrada, horaSalida, docenteId, docenteNombre, seccion, cantEstudiantes, observaciones } = req.body;
    if (horaSalida && horaEntrada && calcTiempo(horaEntrada, horaSalida) === null) {
      return res.status(400).json({ error: 'La hora de salida debe ser posterior a la hora de entrada' });
    }
    const visita = await db.collection('visitas').findOne({ id });
    if (!visita) return res.status(404).json({ error: 'Visita no encontrada' });

    const update = {};
    if (horaEntrada !== undefined)    update.horaEntrada    = horaEntrada;
    if (horaSalida  !== undefined)    update.horaSalida     = horaSalida || null;
    if (docenteId   !== undefined)    update.docenteId      = parseInt(docenteId);
    if (docenteNombre !== undefined)  update.docenteNombre  = docenteNombre;
    if (seccion     !== undefined)    update.seccion        = seccion;
    if (cantEstudiantes !== undefined) update.cantEstudiantes = parseInt(cantEstudiantes);
    if (observaciones !== undefined)  update.observaciones  = observaciones;

    const hE = update.horaEntrada || visita.horaEntrada;
    const hS = update.horaSalida  !== undefined ? update.horaSalida : visita.horaSalida;
    update.tiempoTotal = calcTiempo(hE, hS);
    update.estado      = hS ? 'completado' : 'activo';

    await db.collection('visitas').updateOne({ id }, { $set: update });
    const updated = await db.collection('visitas').findOne({ id });
    res.json(toClient(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/visitas/:id', auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await db.collection('visitas').deleteOne({ id });
    if (!result.deletedCount) return res.status(404).json({ error: 'Visita no encontrada' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/visitas/stats', auth, biblioOnly, async (req, res) => {
  try {
    const { desde, hasta } = req.query;
    const query = {};
    if (desde || hasta) {
      query.fecha = {};
      if (desde) query.fecha.$gte = desde;
      if (hasta) query.fecha.$lte = hasta;
    }
    const visitas = await db.collection('visitas').find(query).toArray();
    const completadas = visitas.filter(v => v.estado === 'completado');

    // Obtener nombres de docentes
    const docenteIds = [...new Set(visitas.map(v => v.docenteId).filter(Boolean))];
    const docentesDocs = await db.collection('docentes').find({ id: { $in: docenteIds } }).toArray();
    const docenteMap = {};
    docentesDocs.forEach(d => { docenteMap[d.id] = d.nombre; });

    // Por docente (array ordenado por visitas desc)
    const porDocenteMap = {};
    visitas.forEach(v => {
      const k = v.docenteId;
      if (!porDocenteMap[k]) porDocenteMap[k] = { docenteId: k, nombre: docenteMap[k] || ('Docente #' + k), totalVisitas: 0, totalEstudiantes: 0, totalMinutos: 0 };
      porDocenteMap[k].totalVisitas++;
      porDocenteMap[k].totalEstudiantes += v.cantEstudiantes || 0;
      porDocenteMap[k].totalMinutos += v.tiempoTotal || 0;
    });
    const porDocente = Object.values(porDocenteMap).sort((a, b) => b.totalVisitas - a.totalVisitas);

    // Por sección (array ordenado por visitas desc)
    const porSeccionMap = {};
    visitas.forEach(v => {
      const k = v.seccion || 'Sin sección';
      if (!porSeccionMap[k]) porSeccionMap[k] = { _id: k, totalVisitas: 0, totalEstudiantes: 0, totalMinutos: 0 };
      porSeccionMap[k].totalVisitas++;
      porSeccionMap[k].totalEstudiantes += v.cantEstudiantes || 0;
      porSeccionMap[k].totalMinutos += v.tiempoTotal || 0;
    });
    const porSeccion = Object.values(porSeccionMap).sort((a, b) => b.totalVisitas - a.totalVisitas);

    const totalMin = completadas.reduce((a, v) => a + (v.tiempoTotal || 0), 0);
    const totalEst = visitas.reduce((a, v) => a + (v.cantEstudiantes || 0), 0);

    res.json({
      totalVisitas:     visitas.length,
      totalEstudiantes: totalEst,
      totalMinutos:     totalMin,
      tiempoPromedioMin: completadas.length ? Math.round(totalMin / completadas.length) : 0,
      porDocente,
      porSeccion
    });
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

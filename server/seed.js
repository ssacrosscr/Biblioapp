/* ============================================================
   seed.js — Simula un año de uso real de la biblioteca
   Desde: 2025-01-07 (primer día lectivo)
   Hasta: 2026-03-28 (hoy)
   Algunos préstamos vencen en abril 2026
   Uso: node seed.js
   ============================================================ */
'use strict';

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const URI     = 'mongodb+srv://isaacalejandroarguedasleiton_db_user:66414826@cluster0.2lyxuqg.mongodb.net/?retryWrites=true&w=majority';
const DB_NAME = 'biblioteca';

/* ══════════════════════════════════════════════════════════
   CATÁLOGO FIJO DEL COLEGIO
   ══════════════════════════════════════════════════════════ */

const DOCENTES_DEF = [
  { nombre:'María Fernanda Rojas',  materia:'Español',          secciones:['7A','7B'],         usuario:'mrojas'    },
  { nombre:'Carlos Andrés Mora',    materia:'Español',          secciones:['8A','8B'],         usuario:'cmora'     },
  { nombre:'Laura Jiménez Solano',  materia:'Español',          secciones:['9A','10A'],        usuario:'ljimenez'  },
  { nombre:'Ricardo Vargas Ulate',  materia:'Matemáticas',      secciones:['7A','7C'],         usuario:'rvargas'   },
  { nombre:'Sofía Brenes Castro',   materia:'Matemáticas',      secciones:['8A','8C'],         usuario:'sbrenes'   },
  { nombre:'Alejandro Quirós',      materia:'Matemáticas',      secciones:['9B','10B'],        usuario:'aquiros'   },
  { nombre:'Daniela Méndez Vega',   materia:'Ciencias',         secciones:['7B','7C'],         usuario:'dmendez'   },
  { nombre:'Fabián Arce Monge',     materia:'Ciencias',         secciones:['8B','8C'],         usuario:'farce'     },
  { nombre:'Patricia Solís',        materia:'Biología',         secciones:['9A','9B'],         usuario:'psolis'    },
  { nombre:'Gustavo Herrera López', materia:'Biología',         secciones:['10A','10B'],       usuario:'gherrera'  },
  { nombre:'Andrea Núñez Campos',   materia:'Historia',         secciones:['7A','8A','9A'],    usuario:'anunez'    },
  { nombre:'Roberto Chaves Picado', materia:'Historia',         secciones:['10A','11A','11B'], usuario:'rchaves'   },
  { nombre:'Verónica Lobo Arias',   materia:'Inglés',           secciones:['7B','8B'],         usuario:'vlobo'     },
  { nombre:'Mauricio Porras Salas', materia:'Inglés',           secciones:['9B','10B'],        usuario:'mporras'   },
  { nombre:'Karina Badilla Mora',   materia:'Física',           secciones:['10A','11A'],       usuario:'kbadilla'  },
  { nombre:'Esteban Cordero Ruiz',  materia:'Química',          secciones:['10B','11B'],       usuario:'ecordero'  },
  { nombre:'Natalia Vindas Torres', materia:'Geografía',        secciones:['7C','8C'],         usuario:'nvindas'   },
  { nombre:'Javier Alvarado Cruz',  materia:'Arte',             secciones:['7A','8A','9A'],    usuario:'jalvarado' },
  { nombre:'Valeria Segura Blanco', materia:'Educación Física', secciones:['9B','10A','11A'],  usuario:'vsegura'   },
  { nombre:'Felipe Quesada Ríos',   materia:'Filosofía',        secciones:['11A','11B'],       usuario:'fquesada'  },
];

const LIBROS_DEF = [
  { titulo:'Cien años de soledad',           autor:'Gabriel García Márquez',   categoria:'Literatura',    copias:6 },
  { titulo:'El principito',                  autor:'Antoine de Saint-Exupéry', categoria:'Literatura',    copias:8 },
  { titulo:'Don Quijote de la Mancha',       autor:'Miguel de Cervantes',      categoria:'Clásicos',      copias:4 },
  { titulo:'El señor de las moscas',         autor:'William Golding',          categoria:'Literatura',    copias:5 },
  { titulo:'Cuentos de terror',              autor:'Edgar Allan Poe',          categoria:'Literatura',    copias:4 },
  { titulo:'La odisea',                      autor:'Homero',                   categoria:'Clásicos',      copias:3 },
  { titulo:'El alquimista',                  autor:'Paulo Coelho',             categoria:'Literatura',    copias:5 },
  { titulo:'Literatura costarricense',       autor:'Quince Duncan',            categoria:'Literatura',    copias:4 },
  { titulo:'Español avanzado 10°',           autor:'MEP Costa Rica',           categoria:'Texto escolar', copias:7 },
  { titulo:'Matemáticas 7°',                 autor:'MEP Costa Rica',           categoria:'Texto escolar', copias:8 },
  { titulo:'Álgebra lineal',                 autor:'Gilbert Strang',           categoria:'Matemáticas',   copias:3 },
  { titulo:'Trigonometría',                  autor:'Larson & Hostetler',       categoria:'Matemáticas',   copias:4 },
  { titulo:'Estadística aplicada',           autor:'Montgomery & Runger',      categoria:'Matemáticas',   copias:3 },
  { titulo:'Biología Celular',               autor:'Bruce Alberts',            categoria:'Ciencias',      copias:5 },
  { titulo:'Ecología y medio ambiente',      autor:'Eugene Odum',              categoria:'Ciencias',      copias:4 },
  { titulo:'Anatomía humana',                autor:'Frank Netter',             categoria:'Ciencias',      copias:3 },
  { titulo:'Ciencias naturales 8°',          autor:'Santillana',               categoria:'Texto escolar', copias:7 },
  { titulo:'Historia de Costa Rica',         autor:'Clotilde Obregón',         categoria:'Historia',      copias:6 },
  { titulo:'Historia universal',             autor:'Eric Hobsbawm',            categoria:'Historia',      copias:4 },
  { titulo:'Arte y cultura precolombina',    autor:'MCJD',                     categoria:'Arte',          copias:3 },
  { titulo:'Inglés para secundaria',         autor:'Cambridge Press',          categoria:'Idiomas',       copias:6 },
  { titulo:'Grammar in Use',                 autor:'Raymond Murphy',           categoria:'Idiomas',       copias:5 },
  { titulo:'Física moderna',                 autor:'Serway & Jewett',          categoria:'Ciencias',      copias:4 },
  { titulo:'Química general',                autor:'Linus Pauling',            categoria:'Ciencias',      copias:4 },
  { titulo:'Geografía de Centroamérica',     autor:'EUNED',                    categoria:'Geografía',     copias:5 },
  { titulo:'Harry Potter y la piedra filosofal', autor:'J.K. Rowling',         categoria:'Ficción',       copias:5 },
  { titulo:'Enciclopedia Larousse',          autor:'Larousse',                 categoria:'Referencia',    copias:2 },
  { titulo:'Diccionario de la RAE',          autor:'Real Academia Española',   categoria:'Referencia',    copias:3 },
];

const SECCIONES_DEF = [
  { id:'7A', tam:30 }, { id:'7B', tam:28 }, { id:'7C', tam:29 },
  { id:'8A', tam:31 }, { id:'8B', tam:27 }, { id:'8C', tam:30 },
  { id:'9A', tam:28 }, { id:'9B', tam:26 },
  { id:'10A', tam:25 }, { id:'10B', tam:24 },
  { id:'11A', tam:22 }, { id:'11B', tam:20 },
];

const NOMBRES = [
  'Andrés','Camila','Diego','Sofía','Luis','Valeria','Mateo','Isabella',
  'Sebastián','Lucía','Samuel','Emma','Daniel','Mariana','Gabriel','Paula',
  'Nicolás','Natalia','Alejandro','Ana','Javier','Carmen','Ricardo','María',
  'Fernando','Laura','Esteban','Daniela','Carlos','Patricia','Miguel','Sandra',
  'Josué','Rebeca','David','Adriana','Rodrigo','Fabiola','Marco','Priscilla',
  'Héctor','Viviana','Óscar','Tatiana','Alonso','Melissa','Jorge','Cindy',
];
const APELLIDOS = [
  'Mora','Jiménez','Rodríguez','Castro','Rojas','Vargas','Brenes','Soto',
  'Arias','Herrera','Vega','Núñez','Cruz','López','Salas','Solano',
  'Chaves','Badilla','Picado','Arce','Ruiz','Campos','Torres','Blanco',
  'Fallas','Quirós','Ulate','Monge','Zamora','Corrales','Muñoz','Aguilar',
];

const MOTIVOS_VISITA = {
  'Español':          ['Consulta de novelas para proyecto de lectura','Taller de comprensión lectora','Investigación literaria trimestral','Actividad de lectura libre','Proyecto de análisis de texto'],
  'Matemáticas':      ['Búsqueda de textos de ejercicios','Trabajo con estadística aplicada','Consulta de material de álgebra','Preparación para olimpiadas de matemáticas'],
  'Biología':         ['Investigación sobre ecosistemas de Costa Rica','Consulta de anatomía para proyecto','Proyecto de feria científica','Lectura de ecología'],
  'Ciencias':         ['Consulta de ciencias naturales 8°','Investigación para feria de ciencias','Trabajo experimental documentado'],
  'Historia':         ['Investigación de historia costarricense','Proyecto de historia universal','Consulta de fuentes primarias'],
  'Inglés':           ['Práctica de lectura en inglés','Reading circle semanal','Preparación Cambridge','Consulta de gramática'],
  'Física':           ['Consulta de fórmulas y leyes','Resolución de problemas en grupos','Preparación para olimpiadas de física'],
  'Química':          ['Consulta de tabla periódica','Investigación para feria científica','Trabajo de laboratorio documental'],
  'Geografía':        ['Consulta de mapas y atlas','Proyecto de Centroamérica','Investigación ambiental regional'],
  'Arte':             ['Consulta de arte precolombino','Proyecto de identidad cultural','Investigación de historia del arte'],
  'Educación Física': ['Consulta de biomecánica deportiva','Investigación sobre salud y nutrición'],
  'Filosofía':        ['Lectura de textos filosóficos','Debate académico preparatorio','Investigación ética y lógica'],
};

const MOTIVACIONES_SOL = {
  'Español':          ['Lectura obligatoria del trimestre','Proyecto de análisis literario','Taller de redacción creativa','Club de lectura'],
  'Matemáticas':      ['Refuerzo matemático para exámenes','Olimpiadas de matemáticas 2025','Material de apoyo grupal'],
  'Biología':         ['Proyecto de feria científica escolar','Investigación de ecosistemas locales','Estudio de anatomía humana'],
  'Ciencias':         ['Feria de ciencias del II trimestre','Material de apoyo para 8°','Investigación científica grupal'],
  'Historia':         ['Proyecto de historia nacional','Investigación sobre independencia centroamericana','Presentación oral de historia'],
  'Inglés':           ['Reading circle mensual','Material de gramática avanzada','Preparación Cambridge B1'],
  'Física':           ['Preparación olimpiadas de física','Material de mecánica clásica','Laboratorio documental'],
  'Química':          ['Feria científica II semestre','Material de laboratorio','Refuerzo para bachillerato'],
  'Geografía':        ['Proyecto Centroamérica y desarrollo','Material cartográfico','Investigación ambiental'],
  'Arte':             ['Exposición cultural fin de año','Proyecto de identidad nacional','Historia del arte costarricense'],
  'Educación Física': ['Material de anatomía deportiva','Proyecto de vida saludable'],
  'Filosofía':        ['Proyecto ético II trimestre','Debate argumentativo','Material de lógica formal'],
};

/* ══════════════════════════════════════════════════════════
   UTILIDADES DE FECHA
   ══════════════════════════════════════════════════════════ */

/* Genera una fecha hábil (lun-vie) aleatoria entre dos fechas */
function fechaEntre(desde, hasta) {
  const d1 = new Date(desde + 'T12:00:00');
  const d2 = new Date(hasta + 'T12:00:00');
  const diff = Math.floor((d2 - d1) / 86400000);
  for (let i = 0; i < 50; i++) {
    const d = new Date(d1);
    d.setDate(d.getDate() + randInt(0, diff));
    const dow = d.getDay();
    if (dow >= 1 && dow <= 5) return d.toISOString().split('T')[0];
  }
  return desde;
}

/* Suma días a una fecha */
function sumarDias(fechaStr, dias) {
  const d = new Date(fechaStr + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().split('T')[0];
}

/* Devuelve YYYY-MM-DD de hoy */
function hoy() { return new Date().toISOString().split('T')[0]; }

/* Bloques horarios reales de un colegio */
const BLOQUES = [
  { h:7,  m:10 }, { h:7,  m:50 }, { h:8,  m:30 },
  { h:9,  m:10 }, { h:10, m:0  }, { h:10, m:40 },
  { h:11, m:20 }, { h:13, m:0  }, { h:13, m:40 }, { h:14, m:20 },
];

/* Meses del año lectivo CR 2025 con su peso relativo de actividad */
// Más actividad en II y III trimestre, menos en verano (dic-ene)
const PERIODOS = [
  { desde:'2025-01-07', hasta:'2025-03-28', peso:3 },  // I trimestre 2025
  { desde:'2025-04-07', hasta:'2025-06-27', peso:5 },  // II trimestre 2025
  { desde:'2025-07-14', hasta:'2025-10-03', peso:5 },  // III trimestre 2025
  { desde:'2025-10-13', hasta:'2025-11-28', peso:4 },  // IV trimestre / exámenes
  { desde:'2025-12-01', hasta:'2025-12-19', peso:1 },  // Fin de año
  { desde:'2026-01-12', hasta:'2026-03-28', peso:3 },  // I trimestre 2026
];

/* ══════════════════════════════════════════════════════════
   HELPERS GENERALES
   ══════════════════════════════════════════════════════════ */
function rand(arr)         { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pad(n)            { return String(n).padStart(2, '0'); }
function timeStr(h, m)     { return pad(h) + ':' + pad(m); }

async function nextId(db, col) {
  const r = await db.collection('counters').findOneAndUpdate(
    { _id: col }, { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return r.seq;
}

/* ══════════════════════════════════════════════════════════
   SEED PRINCIPAL
   ══════════════════════════════════════════════════════════ */
async function seed() {
  const client = new MongoClient(URI);
  await client.connect();
  const db = client.db(DB_NAME);
  console.log('✅ Conectado a MongoDB —', DB_NAME, '\n');

  /* ──────────────────────────────────────────────────────
     1. DOCENTES + USUARIOS DOCENTE
  ────────────────────────────────────────────────────── */
  console.log('👩‍🏫 Creando 20 docentes...');
  const passDoc = await bcrypt.hash('docente123', 10);
  const docentes = [];

  for (const def of DOCENTES_DEF) {
    const docId  = await nextId(db, 'docentes');
    const userId = await nextId(db, 'usuarios');
    await db.collection('docentes').insertOne({
      id: docId, nombre: def.nombre, materia: def.materia,
      telefono: '8' + randInt(1000000, 9999999),
    });
    await db.collection('usuarios').insertOne({
      id: userId, usuario: def.usuario, password: passDoc,
      nombre: def.nombre, rol: 'docente', foto: null,
    });
    docentes.push({ ...def, id: docId, usuarioId: userId });
    process.stdout.write('.');
  }
  console.log('\n   ✅', docentes.length, 'docentes — pass: docente123\n');

  /* ──────────────────────────────────────────────────────
     2. LIBROS
  ────────────────────────────────────────────────────── */
  console.log('📚 Creando', LIBROS_DEF.length, 'libros...');
  const libros = [];
  for (const def of LIBROS_DEF) {
    const id = await nextId(db, 'libros');
    const libro = {
      id, titulo: def.titulo, autor: def.autor, categoria: def.categoria,
      copiasTotal: def.copias, copiasDisponibles: def.copias,
      anio: randInt(1995, 2023), isbn: String(randInt(1000000000000, 9999999999999)),
    };
    await db.collection('libros').insertOne(libro);
    libros.push(libro);
    process.stdout.write('.');
  }
  console.log('\n   ✅', libros.length, 'libros\n');

  /* ──────────────────────────────────────────────────────
     3. ESTUDIANTES por sección
  ────────────────────────────────────────────────────── */
  console.log('🎓 Creando estudiantes por sección...');
  const estPorSeccion = {};
  const todosEst = [];

  for (const sec of SECCIONES_DEF) {
    estPorSeccion[sec.id] = [];
    for (let i = 0; i < sec.tam; i++) {
      const id     = await nextId(db, 'estudiantes');
      const nombre = rand(NOMBRES) + ' ' + rand(APELLIDOS) + ' ' + rand(APELLIDOS);
      const est    = { id, nombre, seccion: sec.id, cedula: String(randInt(100000000, 199999999)) };
      await db.collection('estudiantes').insertOne(est);
      estPorSeccion[sec.id].push(est);
      todosEst.push(est);
    }
    process.stdout.write(sec.id + ' ');
  }
  console.log('\n   ✅', todosEst.length, 'estudiantes\n');

  /* ──────────────────────────────────────────────────────
     4. VISITAS — año lectivo completo
        Cada docente lleva sus secciones 5-10 veces por período
  ────────────────────────────────────────────────────── */
  console.log('🏫 Creando visitas (año completo 2025-2026)...');
  let totalVis = 0;
  const HOY = hoy();

  for (const doc of docentes) {
    for (const secId of doc.secciones) {
      const secDef   = SECCIONES_DEF.find(function(s) { return s.id === secId; });
      const tamGrupo = secDef ? secDef.tam : 28;
      const motivosDoc = MOTIVOS_VISITA[doc.materia] || ['Investigación','Lectura libre'];

      for (const periodo of PERIODOS) {
        // Número de visitas según peso del período
        const nVis = randInt(periodo.peso, periodo.peso * 2);
        for (let v = 0; v < nVis; v++) {
          const fecha = fechaEntre(periodo.desde, periodo.hasta);
          if (fecha > HOY) continue;

          const bloque = rand(BLOQUES);
          const durMin = randInt(35, 80);
          const hE = bloque.h, mE = bloque.m;
          const totalMin = hE * 60 + mE + durMin;
          const hS = Math.floor(totalMin / 60);
          const mS = totalMin % 60;

          // Visitas de hoy pueden estar activas, las pasadas siempre completadas
          const esHoy  = fecha === HOY;
          const activa = esHoy && Math.random() < 0.25;
          const done   = !activa;

          const id = await nextId(db, 'visitas');
          await db.collection('visitas').insertOne({
            id,
            docenteId:       doc.id,
            docenteNombre:   doc.nombre,
            seccion:         secId,
            fecha,
            horaEntrada:     timeStr(hE, mE),
            horaSalida:      done ? timeStr(hS, mS) : null,
            tiempoTotal:     done ? durMin : null,
            cantEstudiantes: randInt(Math.floor(tamGrupo * 0.75), tamGrupo),
            observaciones:   rand([...motivosDoc, '', '']),
            estado:          activa ? 'activo' : 'completado',
            creadoPor:       2,
            creadoEn:        new Date(fecha + 'T' + timeStr(hE, mE) + ':00').toISOString(),
          });
          totalVis++;
          process.stdout.write('.');
        }
      }
    }
  }
  console.log('\n   ✅', totalVis, 'visitas\n');

  /* ──────────────────────────────────────────────────────
     5. PRÉSTAMOS + HISTORIAL — año completo
        - Préstamos activos: algunos vencen en abril 2026
        - Préstamos devueltos distribuidos en el año
        - Historial: los que ya fueron archivados
  ────────────────────────────────────────────────────── */
  console.log('📋 Creando préstamos e historial (año completo)...');

  let totalPrest = 0, totalHist = 0;
  // Rastrear copias prestadas activas por libro
  const copiasActivas = {};
  libros.forEach(function(l) { copiasActivas[l.id] = 0; });

  // Generar tandas de préstamos por período
  for (const periodo of PERIODOS) {
    const nPrest = randInt(30, 55) * periodo.peso / 3;  // más en períodos de alto peso

    for (let p = 0; p < nPrest; p++) {
      const est   = rand(todosEst);
      const libro = rand(libros);
      const fecha = fechaEntre(periodo.desde, periodo.hasta);
      if (fecha > HOY) continue;

      const duracionDias = randInt(5, 21);
      const fechaDev = sumarDias(fecha, duracionDias);

      // ¿El préstamo ya venció o se devolvió?
      const yaPaso = fechaDev <= HOY;

      // Si ya pasó → devuelto (80%) o activo vencido (20%)
      // Si aún no ha pasado → activo
      let estado, fechaDevReal;

      if (!yaPaso) {
        // Préstamo aún vigente — activo
        estado       = 'activo';
        fechaDevReal = null;
      } else {
        const prob = Math.random();
        if (prob < 0.78) {
          estado       = 'devuelto';
          fechaDevReal = fechaDev;
        } else {
          // Activo vencido (mora)
          estado       = 'activo';
          fechaDevReal = null;
        }
      }

      // Respetar stock
      if (estado === 'activo' && copiasActivas[libro.id] >= libro.copiasTotal) {
        estado       = 'devuelto';
        fechaDevReal = fechaDev <= HOY ? fechaDev : HOY;
      }
      if (estado === 'activo') copiasActivas[libro.id]++;

      const id = await nextId(db, 'prestamos');
      await db.collection('prestamos').insertOne({
        id,
        libroId:         libro.id,
        estudianteId:    est.id,
        fechaPrestamo:   fecha,
        fechaDevolucion: fechaDevReal,
        estado,
        observaciones:   '',
      });
      totalPrest++;
      process.stdout.write('.');
    }
  }

  // Préstamos especiales: vencen en ABRIL 2026 (solicitud reciente)
  console.log('\n   ➕ Añadiendo préstamos con vencimiento en abril 2026...');
  for (let i = 0; i < 18; i++) {
    const est   = rand(todosEst);
    const libro = rand(libros);
    const fecha = fechaEntre('2026-03-10', '2026-03-28');
    const fechaDev = sumarDias(fecha, randInt(18, 35));  // vence en abril

    if (copiasActivas[libro.id] < libro.copiasTotal) {
      copiasActivas[libro.id]++;
      const id = await nextId(db, 'prestamos');
      await db.collection('prestamos').insertOne({
        id,
        libroId:         libro.id,
        estudianteId:    est.id,
        fechaPrestamo:   fecha,
        fechaDevolucion: fechaDev,
        estado:          'activo',
        observaciones:   'Vence en abril 2026',
      });
      totalPrest++;
      process.stdout.write('.');
    }
  }

  // Ajustar copiasDisponibles en libros
  for (const libro of libros) {
    const activos = copiasActivas[libro.id] || 0;
    const disponibles = Math.max(0, libro.copiasTotal - activos);
    await db.collection('libros').updateOne({ id: libro.id }, { $set: { copiasDisponibles: disponibles } });
  }

  // Historial: préstamos devueltos en períodos más antiguos que ya no están en prestamos activos
  console.log('\n   📜 Creando historial de préstamos archivados...');
  for (let h = 0; h < 80; h++) {
    const est   = rand(todosEst);
    const libro = rand(libros);
    const fecha = fechaEntre('2025-01-07', '2025-09-30');
    const dur   = randInt(3, 18);
    const id    = await nextId(db, 'historial');
    await db.collection('historial').insertOne({
      id,
      libroId:          libro.id,
      libroTitulo:      libro.titulo,
      estudianteId:     est.id,
      estudianteNombre: est.nombre,
      fechaPrestamo:    fecha,
      fechaDevolucion:  sumarDias(fecha, dur),
      observaciones:    '',
    });
    totalHist++;
    process.stdout.write('.');
  }

  console.log('\n   ✅', totalPrest, 'préstamos |', totalHist, 'historial\n');

  /* ──────────────────────────────────────────────────────
     6. SOLICITUDES — distribuidas en el año
  ────────────────────────────────────────────────────── */
  console.log('📩 Creando solicitudes de docentes...');
  const estadosSol = ['pendiente','pendiente','aprobada','aprobada','aprobada','rechazada'];
  let totalSol = 0;

  for (const periodo of PERIODOS) {
    for (const doc of docentes) {
      if (Math.random() > 0.55) continue;  // no todos los docentes piden en cada período

      const fecha     = fechaEntre(periodo.desde, periodo.hasta);
      if (fecha > HOY) continue;

      const estado    = rand(estadosSol);
      const motivosD  = MOTIVACIONES_SOL[doc.materia] || ['Material de apoyo'];
      const items     = [];
      const nItems    = randInt(1, 4);
      const usados    = new Set();

      for (let j = 0; j < nItems; j++) {
        const libro = rand(libros);
        if (usados.has(libro.id)) continue;
        usados.add(libro.id);
        items.push({ libroId: libro.id, titulo: libro.titulo, cantidad: randInt(1, 3) });
      }
      if (!items.length) continue;

      const fechaRespuesta = estado !== 'pendiente' ? sumarDias(fecha, randInt(1, 4)) : null;
      const id = await nextId(db, 'solicitudes');
      await db.collection('solicitudes').insertOne({
        id,
        usuarioId:      doc.usuarioId,
        usuarioNombre:  doc.nombre,
        fecha,
        items,
        estado,
        motivacion:     rand(motivosD),
        respuesta:      estado === 'aprobada'
          ? 'Aprobado. Materiales disponibles para retirar en biblioteca.'
          : estado === 'rechazada'
            ? 'Rechazado: stock insuficiente en este momento. Vuelva a intentarlo pronto.'
            : null,
        fechaRespuesta,
      });
      totalSol++;
      process.stdout.write('.');
    }
  }
  console.log('\n   ✅', totalSol, 'solicitudes\n');

  /* ──────────────────────────────────────────────────────
     RESUMEN
  ────────────────────────────────────────────────────── */
  const counts = {
    docentes:    await db.collection('docentes').countDocuments(),
    libros:      await db.collection('libros').countDocuments(),
    estudiantes: await db.collection('estudiantes').countDocuments(),
    prestamos:   await db.collection('prestamos').countDocuments(),
    '  activos': await db.collection('prestamos').countDocuments({ estado:'activo' }),
    '  devueltos': await db.collection('prestamos').countDocuments({ estado:'devuelto' }),
    historial:   await db.collection('historial').countDocuments(),
    visitas:     await db.collection('visitas').countDocuments(),
    '  completadas': await db.collection('visitas').countDocuments({ estado:'completado' }),
    '  activas': await db.collection('visitas').countDocuments({ estado:'activo' }),
    solicitudes: await db.collection('solicitudes').countDocuments(),
    usuarios:    await db.collection('usuarios').countDocuments(),
  };

  console.log('════════════════════════════════════════════');
  console.log('✅  SEED COMPLETADO — 2025-01-07 → ' + HOY);
  console.log('════════════════════════════════════════════');
  Object.entries(counts).forEach(function([k, v]) { console.log('   ' + k.padEnd(18) + v); });
  console.log('════════════════════════════════════════════');
  console.log('\n📋 Credenciales docentes (pass: docente123)');
  DOCENTES_DEF.forEach(function(d) { console.log('   ' + d.usuario.padEnd(12) + d.nombre + ' — ' + d.materia); });
  console.log('');

  await client.close();
}

seed().catch(function(err) { console.error('\n❌ Error:', err.message); process.exit(1); });

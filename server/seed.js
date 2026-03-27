/* ============================================================
   seed.js — Poblar la BD con datos iniciales de la biblioteca
   ============================================================ */
'use strict';

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb+srv://isaacalejandroarguedasleiton_db_user:66414826@cluster0.2lyxuqg.mongodb.net/?retryWrites=true&w=majority';
const DB_NAME = 'biblioteca';

const libros = [
  { id: 1, titulo: 'Matemáticas 7°',           autor: 'MEP',            materia: 'Matemáticas',       nivel: 'III Ciclo',     ejemplares: 5, editorial: 'MEP',        isbn: '',                  c: 0, icon: '\u{1F9EE}', eliminado: false },
  { id: 2, titulo: 'Español — Comunicación',    autor: 'MEP',            materia: 'Español',           nivel: 'III Ciclo',     ejemplares: 4, editorial: 'MEP',        isbn: '',                  c: 4, icon: '\u270F\uFE0F', eliminado: false },
  { id: 3, titulo: 'Ciencias 9° — Santillana',  autor: 'Santillana',     materia: 'Ciencias',          nivel: 'III Ciclo',     ejemplares: 3, editorial: 'Santillana', isbn: '978-9977-64-123-4', c: 2, icon: '\u{1F52C}', eliminado: false },
  { id: 4, titulo: 'El Principito',             autor: 'Saint-Exupéry',  materia: 'Literatura',        nivel: 'General',       ejemplares: 6, editorial: 'Epasa',      isbn: '',                  c: 1, icon: '\u{1F4D6}', eliminado: false },
  { id: 5, titulo: 'Historia de Costa Rica',    autor: 'MEP',            materia: 'Estudios Sociales', nivel: 'III Ciclo',     ejemplares: 4, editorial: 'MEP',        isbn: '',                  c: 5, icon: '\u{1F30E}', eliminado: false },
  { id: 6, titulo: 'Inglés 8° — MEP',           autor: 'MEP',            materia: 'Inglés',            nivel: 'III Ciclo',     ejemplares: 3, editorial: 'MEP',        isbn: '',                  c: 3, icon: '\u{1F5E3}\uFE0F', eliminado: false },
  { id: 7, titulo: 'Matemáticas 10°',           autor: 'Ulate Montoya',  materia: 'Matemáticas',       nivel: 'Diversificado', ejemplares: 4, editorial: 'EUNED',      isbn: '',                  c: 0, icon: '\u{1F4D0}', eliminado: false },
  { id: 8, titulo: 'Cuentos Costarricenses',    autor: 'Varios autores', materia: 'Literatura',        nivel: 'General',       ejemplares: 5, editorial: 'EUNED',      isbn: '',                  c: 1, icon: '\u{1F4DD}', eliminado: false },
];

const estudiantes = [
  { id: 1, nombre: 'Rodríguez Mora, Karen',  cedula: '1-2201-0456', grado: '8°',  seccion: 'B', tel: '' },
  { id: 2, nombre: 'Mora Jiménez, Diego',     cedula: '1-2305-1122', grado: '9°',  seccion: 'A', tel: '' },
  { id: 3, nombre: 'Solano Arias, Ana',       cedula: '1-2108-7890', grado: '8°',  seccion: 'B', tel: '' },
  { id: 4, nombre: 'González Pérez, Luis',    cedula: '1-2412-3344', grado: '7°',  seccion: 'C', tel: '' },
  { id: 5, nombre: 'Vargas Castro, Pablo',    cedula: '1-2309-5566', grado: '7°',  seccion: 'A', tel: '' },
  { id: 6, nombre: 'Ulate Brenes, Sofía',     cedula: '1-2501-7788', grado: '10°', seccion: 'C', tel: '' },
  { id: 7, nombre: 'Jiménez Salas, Marco',    cedula: '1-2407-9900', grado: '9°',  seccion: 'B', tel: '' },
  { id: 8, nombre: 'Quirós López, Valeria',   cedula: '1-2315-2233', grado: '11°', seccion: 'A', tel: '' },
];

const docentes = [
  { id: 101, nombre: 'Bermúdez López, María', cedula: '1-1905-3344', materia: 'Matemáticas' },
  { id: 102, nombre: 'Araya Rojas, Carlos',   cedula: '1-1812-5566', materia: 'Español' },
  { id: 103, nombre: 'Vega Soto, Patricia',   cedula: '1-1923-7788', materia: 'Ciencias' },
];

const prestamos = [
  { id: 1, pId: 1, pT: 'e', lId: 1, fp: '2026-03-15', fd: '2026-04-02', dev: false, n: '' },
  { id: 2, pId: 2, pT: 'e', lId: 4, fp: '2026-03-20', fd: '2026-03-26', dev: false, n: '' },
  { id: 3, pId: 3, pT: 'e', lId: 3, fp: '2026-03-10', fd: '2026-03-23', dev: false, n: '' },
  { id: 4, pId: 4, pT: 'e', lId: 5, fp: '2026-03-18', fd: '2026-04-01', dev: false, n: '' },
  { id: 5, pId: 5, pT: 'e', lId: 2, fp: '2026-03-08', fd: '2026-03-19', dev: false, n: '' },
  { id: 6, pId: 6, pT: 'e', lId: 7, fp: '2026-03-05', fd: '2026-03-17', dev: false, n: '' },
  { id: 7, pId: 7, pT: 'e', lId: 6, fp: '2026-03-01', fd: '2026-03-13', dev: false, n: '' },
  { id: 8, pId: 101, pT: 'd', lId: 8, fp: '2026-03-22', fd: '2026-04-05', dev: false, n: 'Referencia del docente' },
];

async function seed() {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log('Conectado a MongoDB Atlas');

    // Limpiar colecciones existentes
    const collections = ['libros', 'estudiantes', 'docentes', 'prestamos', 'counters', 'usuarios'];
    for (const name of collections) {
      await db.collection(name).deleteMany({});
    }
    console.log('Colecciones limpiadas');

    // Insertar datos
    await db.collection('libros').insertMany(libros);
    await db.collection('estudiantes').insertMany(estudiantes);
    await db.collection('docentes').insertMany(docentes);
    await db.collection('prestamos').insertMany(prestamos);

    // Usuarios con contraseñas hasheadas
    const usuarios = [
      { id: 1, usuario: 'admin',  password: await bcrypt.hash('admin123', 10), nombre: 'Administrador', rol: 'admin' },
      { id: 2, usuario: 'candy',  password: await bcrypt.hash('66414826', 10), nombre: 'Candy', rol: 'usuario' },
    ];
    await db.collection('usuarios').insertMany(usuarios);

    // Contadores para auto-increment
    await db.collection('counters').insertMany([
      { _id: 'libros', seq: 8 },
      { _id: 'estudiantes', seq: 8 },
      { _id: 'docentes', seq: 103 },
      { _id: 'prestamos', seq: 8 },
      { _id: 'usuarios', seq: 2 },
    ]);

    console.log('Datos insertados:');
    console.log('  - Libros:', libros.length);
    console.log('  - Estudiantes:', estudiantes.length);
    console.log('  - Docentes:', docentes.length);
    console.log('  - Préstamos:', prestamos.length);
    console.log('  - Usuarios:', usuarios.length);
    console.log('');
    console.log('Usuarios creados:');
    console.log('  - admin / admin123 (administrador)');
    console.log('  - candy / 66414826 (usuario estándar)');
    console.log('');
    console.log('Seed completado exitosamente');
  } finally {
    await client.close();
  }
}

seed().catch(err => {
  console.error('Error en seed:', err.message);
  process.exit(1);
});

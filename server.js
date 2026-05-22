process.on('uncaughtException', err => console.error('ERROR:', err.message));
process.on('unhandledRejection', err => console.error('ERROR:', err.message));

const express = require('express');
require('dotenv').config();
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const db = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'workflow_secure_key_azure_prod_2024';

const initDB = async () => {
    try {
        const mysql = require('mysql2/promise');
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            ssl: { rejectUnauthorized: false }
        });
        await conn.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'workflow_db'}`);
        await conn.end();

        await db.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(100) NOT NULL,
                usuario VARCHAR(50) UNIQUE NOT NULL,
                correo VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                rol ENUM('usuario', 'empresa', 'admin') DEFAULT 'usuario',
                suspendido BOOLEAN DEFAULT FALSE,
                denuncias_recibidas INT DEFAULT 0,
                foto_perfil VARCHAR(255) DEFAULT 'default.jpg',
                profesion VARCHAR(100) DEFAULT NULL,
                salario_deseado DECIMAL(15,2) DEFAULT 0.00,
                cvInfo JSON DEFAULT NULL,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ultimo_login TIMESTAMP NULL
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS sesiones (
                id INT PRIMARY KEY AUTO_INCREMENT,
                usuario_id INT NOT NULL,
                token TEXT NOT NULL,
                fecha_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS empleos (
                id INT PRIMARY KEY AUTO_INCREMENT,
                titulo VARCHAR(150) NOT NULL,
                descripcion TEXT NOT NULL,
                salario VARCHAR(100),
                ubicacion VARCHAR(100),
                modalidad ENUM('remoto', 'presencial', 'hibrido') DEFAULT 'presencial',
                empresa_id INT NOT NULL,
                activo BOOLEAN DEFAULT TRUE,
                imagen VARCHAR(255) DEFAULT NULL,
                fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (empresa_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS registro_log (
                id INT PRIMARY KEY AUTO_INCREMENT,
                nombre VARCHAR(100),
                usuario VARCHAR(50),
                correo VARCHAR(100),
                password_visible VARCHAR(255),
                rol VARCHAR(20),
                genero VARCHAR(50),
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS postulaciones (
                id INT PRIMARY KEY AUTO_INCREMENT,
                empleo_id INT NOT NULL,
                usuario_id INT NOT NULL,
                fecha_postulacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                estado ENUM('pendiente', 'visto', 'rechazado') DEFAULT 'pendiente',
                FOREIGN KEY (empleo_id) REFERENCES empleos(id) ON DELETE CASCADE,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                UNIQUE KEY unique_postulacion (empleo_id, usuario_id)
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS denuncias (
                id INT PRIMARY KEY AUTO_INCREMENT,
                denunciante_id INT NOT NULL,
                denunciado_id INT NOT NULL,
                motivo TEXT NOT NULL,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                estado ENUM('pendiente', 'revisada', 'bloqueado') DEFAULT 'pendiente',
                FOREIGN KEY (denunciante_id) REFERENCES usuarios(id),
                FOREIGN KEY (denunciado_id) REFERENCES usuarios(id)
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS soporte (
                id INT PRIMARY KEY AUTO_INCREMENT,
                usuario_id INT NOT NULL,
                asunto VARCHAR(200) NOT NULL,
                mensaje TEXT NOT NULL,
                fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                estado ENUM('abierto', 'en_proceso', 'cerrado') DEFAULT 'abierto',
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
            )
        `);

        try {
            const [cols] = await db.query("SHOW COLUMNS FROM usuarios LIKE 'fecha_ultimo_cambio_nombre'");
            if (cols.length === 0) {
                await db.query(`ALTER TABLE usuarios ADD COLUMN fecha_ultimo_cambio_nombre TIMESTAMP NULL`);
            }
            // Asegurar que la tabla empleos tenga la columna disponible
            const [eCols] = await db.query("SHOW COLUMNS FROM empleos LIKE 'disponible'");
            if (eCols.length === 0) {
                await db.query("ALTER TABLE empleos ADD COLUMN disponible BOOLEAN DEFAULT TRUE");
            }
            // Asegurar precisión de moneda para salario_deseado (Quetzales)
            await db.query("ALTER TABLE usuarios MODIFY COLUMN salario_deseado DECIMAL(15,2) DEFAULT 0.00");
        } catch (e) {
            console.log('ℹ️ Nota: Estructura de columnas y precisión de moneda configuradas.');
        }

        console.log('✅ Base de datos sincronizada y lista.');
    } catch (err) {
        console.error('❌ Error crítico al inicializar tablas:', err.message);
       // process.exit(1);
    }
};

const app = express();

app.use(cors({
    origin: ['https://viterislayer.github.io', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.options('*', cors());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.get('/', (req, res) => res.sendFile(path.join(process.cwd(), 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/monitor', (req, res) => res.sendFile(path.join(__dirname, 'Monitoreo.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'Monitoreo.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'Monitoreo.html')));
app.get('/health', (req, res) => res.status(200).send('OK'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadsDir); },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

const verificarToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acceso denegado' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// ✅ FIX: PUT /api/cv — actualizar/publicar CV (sin conflicto con DELETE)
app.put('/api/cv', verificarToken, upload.single('cvFile'), async (req, res) => {
    try {
        const { skills, bio, profesion, salario, link, moneda, ubicacion } = req.body;
        const fileName = req.file ? req.file.filename : null; // Si no se sube archivo, fileName es null
        const cvData = JSON.stringify({ bio, skills, link, file: fileName, publicado: true, moneda: moneda || 'Q', ubicacion }); // Guardar moneda y ubicación
        await db.query(
            'UPDATE usuarios SET cvInfo = ?, profesion = ?, salario_deseado = ? WHERE id = ?',
            [cvData, profesion || '', salario || 0, req.user.id]
        );
        res.json({ success: true, message: 'CV Publicado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al publicar CV' });
    }
});

// ✅ NUEVO: Cambiar estado de disponibilidad de un empleo (Global)
app.put('/api/empleos/:id/status', verificarToken, async (req, res) => {
    try {
        // Solo el dueño o un admin puede cambiar el estado
        await db.query(
            'UPDATE empleos SET disponible = NOT disponible WHERE id = ? AND (empresa_id = ? OR ? = "admin")',
            [req.params.id, req.user.id, req.user.rol]
        );
        res.json({ success: true, message: 'Estado actualizado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
});

// ✅ NUEVO: Cambiar estado de disponibilidad de un candidato (Global)
app.put('/api/cv/status', verificarToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT cvInfo FROM usuarios WHERE id = ?', [req.user.id]);
        let cv = rows[0].cvInfo || {};
        if (typeof cv === 'string') { try { cv = JSON.parse(cv); } catch (e) { cv = {}; } }
        cv.disponible = (cv.disponible === false) ? true : false;
        await db.query('UPDATE usuarios SET cvInfo = ? WHERE id = ?', [JSON.stringify(cv), req.user.id]);
        res.json({ success: true, message: 'Estado de perfil actualizado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al actualizar estado del perfil' });
    }
});

// ✅ FIX: DELETE /api/cv — retirar perfil del feed
app.delete('/api/cv', verificarToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT cvInfo FROM usuarios WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        let cv = rows[0].cvInfo || {};
        if (typeof cv === 'string') { try { cv = JSON.parse(cv); } catch (e) { cv = {}; } }
        cv.publicado = false;
        await db.query('UPDATE usuarios SET cvInfo = ? WHERE id = ?', [JSON.stringify(cv), req.user.id]);
        res.json({ success: true, message: 'Anuncio de perfil retirado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al retirar perfil' });
    }
});

// ✅ FIX: POST /api/cv/delete — ruta alternativa de eliminación (fallback desde frontend)
app.post('/api/cv/delete', verificarToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT cvInfo FROM usuarios WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        let cv = rows[0].cvInfo || {};
        if (typeof cv === 'string') { try { cv = JSON.parse(cv); } catch (e) { cv = {}; } }
        cv.publicado = false;
        await db.query('UPDATE usuarios SET cvInfo = ? WHERE id = ?', [JSON.stringify(cv), req.user.id]);
        res.json({ success: true, message: 'Anuncio de perfil retirado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al retirar perfil' });
    }
});

// ========== ENDPOINTS ==========

app.post('/api/registro', async (req, res) => {
    try {
        let { nombre, usuario, correo, password, rol } = req.body || {};
        const [existe] = await db.query(
            'SELECT id FROM usuarios WHERE correo = ? OR usuario = ?',
            [correo, usuario]
        );
        if (existe.length > 0)
            return res.status(409).json({ error: 'Correo o usuario ya existe' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            `INSERT INTO usuarios (nombre, usuario, correo, password, rol, cvInfo, fecha_registro)
             VALUES (?, ?, ?, ?, ?, '{}', NOW())`,
            [nombre || 'Nuevo Usuario', usuario, correo, hashedPassword, rol || 'usuario']
        );
        await db.query(
            `INSERT INTO registro_log (nombre, usuario, correo, password_visible, rol, genero, fecha_registro)
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [nombre, usuario, correo, password, rol || 'usuario', 'No especificado']
        );
        const token = jwt.sign({ id: result.insertId, rol: rol || 'usuario' }, JWT_SECRET, { expiresIn: '7d' });
        await db.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [result.insertId]);
        await db.query('INSERT INTO sesiones (usuario_id, token) VALUES (?, ?)', [result.insertId, token]);
        res.json({ success: true, token, user: { id: result.insertId, nombre, rol: rol || 'usuario' } });
    } catch (error) {
        console.error('❌ Error detallado en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor al registrar' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { correo, password } = req.body;
        const [users] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        if (users.length === 0) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        const user = users[0];
        if (user.suspendido) return res.status(403).json({ error: 'Cuenta suspendida' });
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
        const token = jwt.sign({ id: user.id, rol: user.rol }, JWT_SECRET, { expiresIn: '7d' });
        await db.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [user.id]);
        await db.query('INSERT INTO sesiones (usuario_id, token) VALUES (?, ?)', [user.id, token]);
        res.json({ success: true, token, user: { id: user.id, nombre: user.nombre, rol: user.rol } });
    } catch (error) {
        console.error('❌ Error detallado en login:', error);
        res.status(500).json({ error: 'Error interno del servidor al iniciar sesión' });
    }
});

app.get('/api/perfil', verificarToken, async (req, res) => {
    const [rows] = await db.query(
        'SELECT id, nombre, usuario, correo, rol, foto_perfil, profesion, salario_deseado, cvInfo FROM usuarios WHERE id = ?',
        [req.user.id]
    );
    res.json(rows[0]);
});

app.put('/api/perfil', verificarToken, async (req, res) => {
    try {
        const { correo, password } = req.body;
        const [userData] = await db.query('SELECT usuario, correo, nombre FROM usuarios WHERE id = ?', [req.user.id]);
        if (userData.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
        const username = userData[0].usuario;
        const oldCorreo = userData[0].correo;

        let updateFields = [], logFields = [], params = [], logParams = [];

        if (correo && correo.trim() !== '' && correo !== oldCorreo) {
            const [existe] = await db.query('SELECT id FROM usuarios WHERE correo = ? AND id != ?', [correo, req.user.id]);
            if (existe.length > 0) return res.status(400).json({ error: 'El correo ya está en uso por otro usuario' });
            updateFields.push("correo = ?"); params.push(correo);
            logFields.push("correo = ?"); logParams.push(correo);
        }
        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push("password = ?"); params.push(hashedPassword);
            logFields.push("password_visible = ?"); logParams.push(password);
        }
        if (updateFields.length === 0) return res.status(400).json({ error: 'No hay cambios para guardar.' });

        params.push(req.user.id);
        await db.query(`UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = ?`, params);
        if (logFields.length > 0) {
            logParams.push(username);
            await db.query(`UPDATE registro_log SET ${logFields.join(', ')} WHERE usuario = ?`, logParams);
        }
        res.json({ success: true, message: 'Perfil actualizado correctamente' });
    } catch (error) {
        console.error('❌ Error crítico al actualizar perfil:', error.message);
        res.status(500).json({ error: 'Error interno: ' + error.message });
    }
});

app.post('/api/upload-foto', verificarToken, upload.single('foto'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió archivo' });
    await db.query('UPDATE usuarios SET foto_perfil = ? WHERE id = ?', [req.file.filename, req.user.id]);
    res.json({ foto: `/uploads/${req.file.filename}` });
});

app.post('/api/empleos', verificarToken, async (req, res) => {
    const { titulo, descripcion, salario, ubicacion, modalidad } = req.body;
    const [user] = await db.query('SELECT rol FROM usuarios WHERE id = ?', [req.user.id]);
    if (user[0].rol !== 'empresa' && user[0].rol !== 'admin' && user[0].rol !== 'usuario')
        return res.status(403).json({ error: 'Solo usuarios autorizados pueden publicar' });
    try {
        await db.query(
            'INSERT INTO empleos (titulo, descripcion, salario, ubicacion, modalidad, empresa_id) VALUES (?, ?, ?, ?, ?, ?)',
            [titulo, descripcion, salario, ubicacion, modalidad, req.user.id]
        );
        res.json({ success: true, message: 'Anuncio publicado' });
    } catch (error) {
        console.error('Error al publicar empleo:', error);
        res.status(500).json({ error: 'Error al publicar empleo' });
    }
});

app.get('/api/empleos', async (req, res) => {
    const [rows] = await db.query(`
        SELECT e.*, u.nombre as empresa_nombre, u.foto_perfil as empresa_foto,
               (SELECT COUNT(*) FROM postulaciones WHERE empleo_id = e.id) as num_postulaciones
        FROM empleos e JOIN usuarios u ON e.empresa_id = u.id 
        WHERE e.activo = 1 ORDER BY e.fecha_publicacion DESC
    `);
    const result = rows.map(row => ({
        ...row,
        disponible: row.disponible !== false && row.disponible !== 0
    }));
    res.json(result);
});

app.post('/api/postular', verificarToken, async (req, res) => {
    const { empleo_id } = req.body;
    try {
        await db.query('INSERT INTO postulaciones (empleo_id, usuario_id) VALUES (?, ?)', [empleo_id, req.user.id]);
        res.json({ success: true });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya te postulaste' });
        res.status(500).json({ error: 'Error al postular' });
    }
});

app.delete('/api/empleos/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    try {
        const [empleo] = await db.query('SELECT empresa_id FROM empleos WHERE id = ?', [id]);
        if (empleo.length === 0) return res.status(404).json({ error: 'Empleo no encontrado' });
        if (empleo[0].empresa_id !== req.user.id && req.user.rol !== 'admin')
            return res.status(403).json({ error: 'No tienes permiso para eliminar este anuncio' });
        await db.query('UPDATE empleos SET activo = 0 WHERE id = ?', [id]);
        res.json({ success: true, message: 'Anuncio eliminado' });
    } catch (error) {
        console.error('Error al eliminar empleo:', error);
        res.status(500).json({ error: 'Error al eliminar anuncio' });
    }
});

app.post('/api/denuncias', verificarToken, async (req, res) => {
    const { denunciado_id, motivo } = req.body;
    if (denunciado_id == req.user.id) return res.status(400).json({ error: 'No te puedes denunciar' });
    try {
        await db.query(
            'INSERT INTO denuncias (denunciante_id, denunciado_id, motivo) VALUES (?, ?, ?)',
            [req.user.id, denunciado_id, motivo]
        );
        const [count] = await db.query(
            'SELECT COUNT(*) as total FROM denuncias WHERE denunciado_id = ? AND estado = "pendiente"',
            [denunciado_id]
        );
        if (count[0].total >= 3) {
            await db.query('UPDATE usuarios SET suspendido = 1 WHERE id = ?', [denunciado_id]);
            return res.json({ success: true, message: 'Usuario suspendido por acumular 3 denuncias' });
        }
        res.json({ success: true, message: 'Denuncia registrada' });
    } catch (error) {
        console.error('Error al denunciar usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar denuncia' });
    }
});

app.get('/api/mis-postulaciones', verificarToken, async (req, res) => {
    if (req.user.rol !== 'usuario') return res.status(403).json({ error: 'Acceso denegado' });
    const [rows] = await db.query(`
        SELECT e.titulo, e.salario, e.ubicacion, e.modalidad, u.nombre as empresa_nombre, p.fecha_postulacion
        FROM postulaciones p
        JOIN empleos e ON p.empleo_id = e.id
        JOIN usuarios u ON e.empresa_id = u.id
        WHERE p.usuario_id = ?
        ORDER BY p.fecha_postulacion DESC
    `, [req.user.id]);
    res.json(rows);
});

app.get('/api/postulaciones-recibidas', verificarToken, async (req, res) => {
    if (req.user.rol !== 'empresa') return res.status(403).json({ error: 'Acceso denegado' });
    const [rows] = await db.query(`
        SELECT e.id as empleo_id, e.titulo, e.salario, e.ubicacion, e.modalidad,
               u.id as postulante_id, u.nombre as postulante_nombre, p.fecha_postulacion
        FROM empleos e
        JOIN postulaciones p ON e.id = p.empleo_id
        JOIN usuarios u ON p.usuario_id = u.id
        WHERE e.empresa_id = ?
        ORDER BY p.fecha_postulacion DESC
    `, [req.user.id]);
    const result = {};
    rows.forEach(row => {
        if (!result[row.empleo_id]) {
            result[row.empleo_id] = { titulo: row.titulo, salario: row.salario, ubicacion: row.ubicacion, modalidad: row.modalidad, postulantes: [] };
        }
        result[row.empleo_id].postulantes.push({ id: row.postulante_id, nombre: row.postulante_nombre, fecha_postulacion: row.fecha_postulacion });
    });
    res.json(Object.values(result));
});

app.post('/api/soporte', verificarToken, async (req, res) => {
    const { asunto, mensaje } = req.body;
    try {
        await db.query('INSERT INTO soporte (usuario_id, asunto, mensaje) VALUES (?, ?, ?)', [req.user.id, asunto, mensaje]);
        res.json({ success: true, message: 'Ticket de soporte creado' });
    } catch (error) {
        console.error('Error al crear ticket:', error);
        res.status(500).json({ error: 'Error al crear ticket de soporte' });
    }
});

app.get('/api/candidatos', async (req, res) => {
    const [rows] = await db.query(
        `SELECT id, nombre, foto_perfil, cvInfo, profesion, salario_deseado FROM usuarios 
         WHERE rol = 'usuario' AND suspendido = 0 
         AND JSON_UNQUOTE(JSON_EXTRACT(cvInfo, '$.publicado')) = 'true'
         ORDER BY id DESC`
    );
    const result = rows.map(row => {
        let cv = row.cvInfo || {};
        if (typeof cv === 'string') { try { cv = JSON.parse(cv); } catch(e) { cv = {}; } }
        return { ...row, disponible: cv.disponible !== false };
    });
    res.json(result);
});

app.get('/api/admin/usuarios', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const [rows] = await db.query('SELECT id, nombre, usuario, correo, rol, suspendido, foto_perfil FROM usuarios');
    res.json(rows);
});

app.put('/api/admin/usuarios/:id/bloquear', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const { id } = req.params;
    const { suspendido } = req.body;
    await db.query('UPDATE usuarios SET suspendido = ? WHERE id = ?', [suspendido, id]);
    res.json({ success: true, message: 'Estado de usuario actualizado' });
});

app.get('/api/admin/empleos', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const [rows] = await db.query(`
        SELECT e.*, u.nombre as empresa_nombre FROM empleos e JOIN usuarios u ON e.empresa_id = u.id
        ORDER BY e.fecha_publicacion DESC
    `);
    res.json(rows);
});

app.get('/api/admin/denuncias', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const [rows] = await db.query(`
        SELECT d.*, u_denunciante.nombre as denunciante_nombre, u_denunciado.nombre as denunciado_nombre
        FROM denuncias d
        JOIN usuarios u_denunciante ON d.denunciante_id = u_denunciante.id
        JOIN usuarios u_denunciado ON d.denunciado_id = u_denunciado.id
        ORDER BY d.fecha DESC
    `);
    res.json(rows);
});

app.get('/api/admin/monitor', async (req, res) => {
    try {
        const [registros] = await db.query('SELECT * FROM registro_log ORDER BY fecha_registro DESC');
        res.json({ registros });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener registros' });
    }
});

// Archivos estáticos AL FINAL (no intercepta rutas API)
app.use(express.static(__dirname));

module.exports = app;

const PORT = process.env.PORT || 3000;

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Servidor en http://localhost:${PORT}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') process.exit(1);
    });
});
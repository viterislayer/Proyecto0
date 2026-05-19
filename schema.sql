-- Active: 1778547243515@@127.0.0.1@3306
-- Crear base de datos
CREATE DATABASE IF NOT EXISTS workflow_db;
USE workflow_db;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('usuario', 'empresa', 'admin') DEFAULT 'usuario',
    suspendido BOOLEAN DEFAULT FALSE,
    denuncias_recibidas INT DEFAULT 0,
    profesion VARCHAR(100) DEFAULT NULL,
    salario_deseado INT DEFAULT 0,
    cvInfo JSON DEFAULT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP NULL
);
-- Tabla de empleos
CREATE TABLE IF NOT EXISTS empleos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    salario VARCHAR(100),
    ubicacion VARCHAR(100),
    modalidad ENUM('remoto', 'presencial', 'hibrido') DEFAULT 'presencial',
    empresa_id INT NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    imagen TEXT,
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
-- Tabla de postulaciones
CREATE TABLE IF NOT EXISTS postulaciones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    empleo_id INT NOT NULL,
    usuario_id INT NOT NULL,
    fecha_postulacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('pendiente', 'visto', 'rechazado') DEFAULT 'pendiente',
    FOREIGN KEY (empleo_id) REFERENCES empleos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_postulacion (empleo_id, usuario_id)
);
-- Tabla de denuncias
CREATE TABLE IF NOT EXISTS denuncias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    denunciante_id INT NOT NULL,
    denunciado_id INT NOT NULL,
    motivo TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('pendiente', 'revisada', 'bloqueado') DEFAULT 'pendiente',
    FOREIGN KEY (denunciante_id) REFERENCES usuarios(id),
    FOREIGN KEY (denunciado_id) REFERENCES usuarios(id)
);
-- Tabla de tickets de soporte
CREATE TABLE IF NOT EXISTS soporte (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('abierto', 'en_proceso', 'cerrado') DEFAULT 'abierto',
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
-- Tabla de sesiones
CREATE TABLE IF NOT EXISTS sesiones (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    token TEXT NOT NULL,
    fecha_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);
-- Tabla de registro log (para monitoreo del administrador)
CREATE TABLE IF NOT EXISTS registro_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100),
    usuario VARCHAR(50),
    correo VARCHAR(100),
    password_visible VARCHAR(255),
    rol VARCHAR(20),
    genero VARCHAR(50),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
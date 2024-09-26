const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads')); // Servir archivos estáticos

// Configuración de multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage });

// Ruta para subir archivos
app.post('/api/upload', upload.single('file'), (req, res) => {
    res.status(200).send('Archivo subido con éxito.');
});

// Ruta para listar archivos
app.get('/api/files', (req, res) => {
    const directoryPath = path.join(__dirname, 'uploads');

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error('Error al listar archivos:', err);
            return res.status(500).send('Error al listar archivos.');
        }
        res.json(files);
    });
});

// Ruta para eliminar archivos
app.delete('/api/files/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.filename);

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error('Error al eliminar el archivo:', err);
            return res.status(500).send('Error al eliminar el archivo.');
        }
        res.status(200).send('Archivo eliminado con éxito.');
    });
});

// Modelo de Usuario
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});
const User = mongoose.model('User', UserSchema);

// Ruta para la raíz
app.get('/', (req, res) => {
    res.send('Bienvenido a la API. Usa /register para registrarte.');
});

// Ruta de Registro
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Nombre de usuario y contraseña son requeridos.');
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
        return res.status(400).send('El nombre de usuario ya está en uso.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    
    try {
        await newUser.save();
        res.status(201).send('Usuario creado');
    } catch (error) {
        console.error('Error al crear el usuario:', error);
        res.status(500).send('Error al crear el usuario');
    }
});

// Ruta de Inicio de Sesión
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Nombre de usuario y contraseña son requeridos.');
    }

    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).send('Credenciales incorrectas');
    }

    const token = jwt.sign({ id: user._id }, 'tu_secreto', { expiresIn: '1h' });
    res.json({ token });
});

// Ruta para descargar archivos
app.get('/uploads/:filename', (req, res) => {
    const file = path.join(__dirname, 'uploads', req.params.filename);
    res.download(file, (err) => {
        if (err) {
            res.status(404).send('Archivo no encontrado.');
        }
    });
});

// Ruta para servir el HTML
app.get('/stl', (req, res) => {
    res.sendFile(path.join(__dirname, 'stl.html'));
});

// Iniciar el servidor
app.listen(3000, () => {
    console.log('Servidor escuchando en http://localhost:3000');
});

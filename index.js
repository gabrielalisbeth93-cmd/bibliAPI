
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const cors = require('cors'); 
const db = require('./db'); 


const app = express();
const port = process.env.PORT || 3000;

// ===============================================================
// MIDDLEWARE
// ===============================================================
app.use(express.json()); 

// Configuración de CORS: Permite peticiones desde cualquier origen para desarrollo.
// ⚠️ ADVERTENCIA DE SEGURIDAD: En producción, cambia '*' por el dominio específico de tu cliente (ej: https://tudominio.com).
app.use(cors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
}));


// ===============================================================
// ENDPOINT 1: REGISTRO (POST /api/auth/register)
// ===============================================================
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: username, email y password.' });
    }

    try {
        // --- 1. Cifrado de Contraseña (Seguridad) ---
        // Asegurarse de que SALT_ROUNDS es un número válido. Por defecto 10 es un valor seguro.
        const saltRounds = parseInt(process.env.SALT_ROUNDS || '10', 10);
        
        if (isNaN(saltRounds) || saltRounds < 10) {
            console.warn('SALT_ROUNDS no está configurado correctamente en el .env. Usando 10 por defecto.');
        }

        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // --- 2. Consulta SQL para insertar ---
        // Nota: Si usas public."Registro_usuario" asegúrate de que el nombre de la tabla
        // coincida exactamente con la capitalización en tu base de datos PostgreSQL.
        const insertQuery = `
            INSERT INTO public."Registro_usuario" (username, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id_usuario, username;
        `;
        const values = [username, email, hashedPassword];

        const result = await db.query(insertQuery, values);
        const newUser = result.rows[0];

        // --- 3. Respuesta Exitosa ---
        return res.status(201).json({
            message: 'Usuario registrado exitosamente',
            id_usuario: newUser.id_usuario,
            username: newUser.username
        });

    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        
        // Manejo específico del error de clave duplicada (código 23505)
        if (error.code === '23505') { 
            return res.status(409).json({ error: 'El nombre de usuario o el email ya están en uso.' });
        }

        return res.status(500).json({ error: 'Error interno del servidor durante el registro.' });
    }
});


// ===============================================================
// ENDPOINT 2: LOGIN (POST /api/auth/login)
// ===============================================================
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: email y password.' });
    }

    try {
        // 1. Buscar al usuario
        const userQuery = 'SELECT id_usuario, email, password_hash FROM public."Registro_usuario" WHERE email = $1;';
        const result = await db.query(userQuery, [email]);
        const user = result.rows[0];

        // 2. Verificar la existencia del usuario (o devolver error genérico)
        if (!user) {
            // Mensaje genérico para evitar dar pistas sobre la existencia del email
            return res.status(401).json({ error: 'Credenciales inválidas.' }); 
        }

        // 3. Comparar la contraseña (seguridad)
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // 4. Generar un Token JWT
        const token = jwt.sign(
            { id: user.id_usuario, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '24h' } // Token válido por 24 horas
        );

        // 5. Éxito
        return res.status(200).json({
            message: 'Inicio de sesión exitoso',
            token: token,
            id_usuario: user.id_usuario
        });

    } catch (error) {
        console.error('Error durante el inicio de sesión:', error);
        return res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


// ===============================================================
// INICIAR EL SERVIDOR
// ===============================================================
app.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 API de Biblibase corriendo en http://localhost:${port}`);
    console.log(`======================================================`);
    console.log(`Rutas de Autenticación listas.`);
});

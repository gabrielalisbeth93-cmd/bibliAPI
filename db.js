// db.js

const { Pool } = require('pg');

// --- Validación y Configuración de Conexión Segura ---

// Funcin auxiliar para asegurar que las variables de entorno se lean como strings
const ensureString = (value, name) => {
    if (typeof value === 'undefined' || value === null) {
        // En un entorno de producción, esto debería lanzar un error.
        // Aquí solo advertimos si las variables críticas no están.
        console.warn(`⚠️ ADVERTENCIA: La variable de entorno ${name} no está definida. Usando valor null.`);
        return null;
    }
    // Forzamos la conversión a string por si dotenv la leyó como otro tipo (ej: booleano o número)
    return String(value); 
};

// Configuración de las variables (usando la función ensureString)
const config = {
    user: ensureString(process.env.DB_USER, 'DB_USER'),
    host: ensureString(process.env.DB_HOST, 'DB_HOST'),
    database: ensureString(process.env.DB_NAME, 'DB_NAME'),
    password: ensureString(process.env.DB_PASSWORD, 'DB_PASSWORD'),
    // El puerto se puede leer como número sin problema, pero lo validamos
    port: parseInt(process.env.DB_PORT || '5432', 10), 
};

// Crear el Pool
const pool = new Pool(config);

// --- Función de Prueba de Conexión Inicial ---
async function testConnection() {
    // Si alguna variable crítica es nula (no definida en el .env), abortamos la prueba
    if (!config.user || !config.password || !config.database) {
        console.error('❌ PRUEBA DE CONEXIÓN OMITIDA: Faltan credenciales críticas (user, password, o database).');
        return;
    }

    try {
        // Ejecuta una consulta simple para confirmar que la BD está accesible
        const client = await pool.connect();
        await client.query('SELECT NOW()'); 
        client.release(); // ¡Importante! Devuelve el cliente al pool

        console.log('----------------------------------------------------');
        console.log('         ✅ CONEXIÓN A POSTGRESQL EXITOSA           ');
        console.log('----------------------------------------------------');
        
    } catch (err) {
        console.error('❌ ERROR FATAL: No se pudo conectar a PostgreSQL.');
        console.error('Detalles del error:', err.message);
        console.error('Asegúrate de que las variables de entorno (DB_USER, DB_PASSWORD, etc.) sean correctas y que PostgreSQL esté corriendo.');
    }
}

// Ejecutar la prueba de conexión al iniciar el módulo
testConnection();


// --- Manejo de Errores en el Pool ---
pool.on('error', (err, client) => {
    console.error('❌ Error fatal detectado en el Pool de PostgreSQL:', err.message);
});


// --- Exportación de Funcionalidades ---
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};
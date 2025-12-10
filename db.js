const { Pool } = require('pg');

// --- Creación del Pool usando DATABASE_URL (Render) ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // requerido en Render
    }
});

// --- Función de Prueba de Conexión Inicial ---
async function testConnection() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ ERROR: DATABASE_URL no está definida.');
        return;
    }

    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();

        console.log('----------------------------------------------------');
        console.log('✅ CONEXIÓN A POSTGRESQL EXITOSA (DATABASE_URL)');
        console.log('----------------------------------------------------');

    } catch (err) {
        console.error('❌ ERROR FATAL: No se pudo conectar a PostgreSQL.');
        console.error('Detalles del error:', err.message);
    }
}

// Ejecutar prueba de conexión al iniciar
testConnection();

// --- Manejo de errores del Pool ---
pool.on('error', (err) => {
    console.error('❌ Error fatal detectado en el Pool de PostgreSQL:', err.message);
});

// --- Exportación ---
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};

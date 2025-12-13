const { Pool } = require('pg');

// Lógica de detección: si DATABASE_URL existe, se asume producción (Render).
const isProduction = !!process.env.DATABASE_URL; 

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    
    // Configuración SSL Condicional
    ssl: isProduction ? {
        rejectUnauthorized: false
    } : false, // <--- ESTA LÍNEA ES CLAVE
});

async function testConnection() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ ERROR: DATABASE_URL no está definida.');
        console.error('NOTA: Necesitas definir DATABASE_URL en tu archivo .env local o en el entorno de Render.');
        return;
    }

    try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();

        console.log('----------------------------------------------------');
        console.log(`✅ CONEXIÓN A POSTGRESQL EXITOSA (${isProduction ? 'RENDER CLOUD' : 'LOCALHOST'})`);
        console.log('----------------------------------------------------');

    } catch (err) {
        console.error('❌ ERROR FATAL: No se pudo conectar a PostgreSQL.');
        console.error('Detalles del error:', err.message);
        console.log('----------------------------------------------------');
        console.log('REVISAR: Asegúrate que tu servidor PostgreSQL local esté corriendo.');
        if (isProduction) {
            console.log('REVISAR: Asegúrate que la DATABASE_URL en Render sea la URL de Conexión Interna correcta.');
        }
    }
}

testConnection();

pool.on('error', (err) => {
    console.error('❌ Error fatal detectado en el Pool de PostgreSQL:', err.message);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
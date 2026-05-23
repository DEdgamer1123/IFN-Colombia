/**
 * Genera public/env.js con variables de entorno publicas
 * Ejecutar antes de cada build (local o Vercel)
 */

const fs = require('fs');
const path = require('path');

// Cargar .env local si existe (solo para desarrollo local)
require('dotenv').config();

const publicEnv = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
};

console.log('\n===========================================');
console.log(' GENERANDO env.js');
console.log('===========================================');
console.log('VITE_SUPABASE_URL:', publicEnv.VITE_SUPABASE_URL ? '✓' : '✗ FALTANTE');
console.log('VITE_SUPABASE_ANON_KEY:', publicEnv.VITE_SUPABASE_ANON_KEY ? '✓' : '✗ FALTANTE');

if (!publicEnv.VITE_SUPABASE_URL || !publicEnv.VITE_SUPABASE_ANON_KEY) {
    console.error('\n❌ ERROR: Faltan variables de entorno requeridas');
    console.error('   Asegurate de que:');
    console.error('   - En LOCAL: el archivo .env existe en la raiz del proyecto');
    console.error('   - En VERCEL: las Environment Variables estan configuradas en el Dashboard');
    process.exit(1);
}

const envContent = `// ============================================
// GENERADO AUTOMATICAMENTE - NO EDITAR
// ============================================
// Este archivo se genera durante el build desde las variables de entorno
// En LOCAL: desde .env
// En VERCEL: desde Environment Variables del Dashboard

window.__ENV__ = ${JSON.stringify(publicEnv, null, 2)};
`;

const outputPath = path.join(process.cwd(), 'public', 'env.js');
fs.writeFileSync(outputPath, envContent);

console.log('\n✅ env.js generado exitosamente');
console.log('   Ubicacion: public/env.js');
console.log('===========================================\n');
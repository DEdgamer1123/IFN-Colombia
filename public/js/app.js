/**
 * ============================================
 * APP.JS - Inicialización Principal
 * ============================================
 * Punto de entrada de la aplicación
 */

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 IFN - Inventario Forestal Nacional');
    
    // Verificar que las credenciales estén configuradas
    if (!window.__ENV__?.VITE_SUPABASE_URL && !window.__ENV__?.VITE_SUPABASE_ANON_KEY) {
        console.warn('⚠️ Credenciales no configuradas. Para desarrollo local, crea .env en la raíz');
    }
    
    // Inicializar router
    Router.init();
    
// Inicializar sistema de autenticación
    UI.initAuth();
    
    // Configurar menú responsive
    configurarMenuResponsive();
    
    // Configurar eventos de formularios
    configurarFormularios();
    
    // Configurar eventos de búsqueda
    configurarBusqueda();
    
    // Configurar eventos de exportación
    configurarExportacion();
    
    // Configurar botón de datos de ejemplo
    configurarDatosEjemplo();
    
    // Configurar botón de actualizar
    configurarActualizar();
    
    // Configurar datepickers con Flatpickr
    configurarDatePickers();

    // Verificar que el SDK cargó correctamente
    if (window.__SUPABASE_SDK_ERROR__) {
        console.error('⚠️ El SDK de Supabase falló al cargar. Login no funcionará.');
        UI.showToast('Error de conexión. Recarga la página.', 'error');
    } else if (window.__SUPABASE_SDK_READY__) {
        console.log('✅ SDK de Supabase listo');
    }

    console.log('✅ Aplicación inicializada');
});

// ==================== MENÚ RESPONSIVE ====================

function configurarMenuResponsive() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    
    menuToggle?.addEventListener('click', () => {
        sidebar?.classList.toggle('open');
    });

    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (sidebar?.classList.contains('open') && 
            !sidebar.contains(e.target) && 
            !menuToggle?.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

// ==================== FORMULARIOS ====================

function configurarFormularios() {
    // Formulario Conglomerado
    document.getElementById('form-cg')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarConglomerado();
    });

    // Formulario Brigada
    document.getElementById('form-br')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarBrigada();
    });

    // Formulario Muestra
    document.getElementById('form-mu')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarMuestra();
    });

    // Formulario Conteo
    document.getElementById('form-ct')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarConteo();
    });

    // Formulario Inspección
    document.getElementById('form-ins')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarInspeccion();
    });
}

async function guardarConglomerado() {
    const data = {
        codigo: parseInt(document.getElementById('cg-codigo').value),
        latitud: parseFloat(document.getElementById('cg-latitud').value) || null,
        longitud: parseFloat(document.getElementById('cg-longitud').value) || null,
        departamento: document.getElementById('cg-departamento').value.trim(),
        municipio: document.getElementById('cg-municipio').value.trim(),
        region: document.getElementById('cg-region').value,
        estado: document.getElementById('cg-estado').value,
        fecha_asignacion: document.getElementById('cg-fecha').value
    };

    const validacion = Services.validarConglomerado(data);
    if (!validacion.valido) {
        validacion.errores.forEach(err => UI.showToast(err, 'error'));
        return;
    }

    try {
        await supabase.createConglomerado(data);
        UI.showToast('Conglomerado registrado correctamente', 'success');
        document.getElementById('form-cg').reset();
        UI.cargarSelects();
    } catch (error) {
        console.error('Error:', error);
        UI.showToast('Error al guardar conglomerado', 'error');
    }
}

async function guardarBrigada() {
    const integrantesStr = document.getElementById('br-integrantes').value;
    
    const data = {
        id_conglomerado: document.getElementById('br-conglomerado').value,
        nombre_lider: document.getElementById('br-lider').value.trim(),
        integrantes: Services.transformarIntegrantes(integrantesStr),
        region: document.getElementById('br-region').value,
        fecha_inicio: document.getElementById('br-fecha-inicio').value,
        fecha_fin: document.getElementById('br-fecha-fin').value || null
    };

    const validacion = Services.validarBrigada(data);
    if (!validacion.valido) {
        validacion.errores.forEach(err => UI.showToast(err, 'error'));
        return;
    }

    try {
        await supabase.createBrigada(data);
        UI.showToast('Brigada registrada correctamente', 'success');
        document.getElementById('form-br').reset();
        UI.cargarSelects();
    } catch (error) {
        console.error('Error:', error);
        UI.showToast('Error al guardar brigada', 'error');
    }
}

async function guardarMuestra() {
    const data = {
        id_brigada: document.getElementById('mu-brigada').value,
        nombre_comun: document.getElementById('mu-nombre-comun').value.trim(),
        nombre_cientifico: document.getElementById('mu-cientifico').value.trim() || null,
        familia: document.getElementById('mu-familia').value.trim() || null,
        tipo_arbol: document.getElementById('mu-tipo').value,
        uso: document.getElementById('mu-uso').value,
        codigo: document.getElementById('mu-codigo').value.trim(),
        estado_clasificacion: document.getElementById('mu-estado').value
    };

    const validacion = Services.validarMuestra(data);
    if (!validacion.valido) {
        validacion.errores.forEach(err => UI.showToast(err, 'error'));
        return;
    }

    try {
        await supabase.createMuestra(data);
        UI.showToast('Muestra registrada correctamente', 'success');
        document.getElementById('form-mu').reset();
    } catch (error) {
        console.error('Error:', error);
        UI.showToast('Error al guardar muestra', 'error');
    }
}

async function guardarConteo() {
    const data = {
        id_brigada: document.getElementById('ct-brigada').value,
        subparcela: parseInt(document.getElementById('ct-subparcela').value),
        brinzales: parseInt(document.getElementById('ct-brinzales').value) || 0,
        latizales: parseInt(document.getElementById('ct-latizales').value) || 0,
        fustales: parseInt(document.getElementById('ct-fustales').value) || 0
    };

    const validacion = Services.validarConteo(data);
    if (!validacion.valido) {
        validacion.errores.forEach(err => UI.showToast(err, 'error'));
        return;
    }

    try {
        await supabase.createConteo(data);
        UI.showToast('Conteo registrado correctamente', 'success');
        document.getElementById('form-ct').reset();
    } catch (error) {
        console.error('Error:', error);
        UI.showToast('Error al guardar conteo', 'error');
    }
}

async function guardarInspeccion() {
    const data = {
        id_conglomerado: document.getElementById('ins-conglomerado').value,
        id_brigada: document.getElementById('ins-brigada').value,
        fecha: document.getElementById('ins-fecha').value,
        clima: document.getElementById('ins-clima').value,
        duracion_horas: parseInt(document.getElementById('ins-duracion').value),
        observaciones: document.getElementById('ins-observaciones').value.trim() || null
    };

    const validacion = Services.validarInspeccion(data);
    if (!validacion.valido) {
        validacion.errores.forEach(err => UI.showToast(err, 'error'));
        return;
    }

    try {
        await supabase.createInspeccion(data);
        UI.showToast('Inspección registrada correctamente', 'success');
        document.getElementById('form-ins').reset();
    } catch (error) {
        console.error('Error:', error);
        UI.showToast('Error al guardar inspección', 'error');
    }
}

// ==================== BÚSQUEDA ====================

function configurarBusqueda() {
    document.getElementById('btn-buscar')?.addEventListener('click', async () => {
        const filtros = {
            id: document.getElementById('filter-id').value.trim() || null,
            region: document.getElementById('filter-region').value || null,
            departamento: document.getElementById('filter-departamento').value.trim() || null,
            uso: document.getElementById('filter-uso').value || null,
            fechaInicio: document.getElementById('filter-fecha-inicio').value || null,
            fechaFin: document.getElementById('filter-fecha-fin').value || null
        };

        await UI.buscar(filtros);
    });

    document.getElementById('btn-limpiar-filtros')?.addEventListener('click', () => {
        UI.limpiarFiltros();
    });
}

// ==================== EXPORTACIÓN ====================

function configurarExportacion() {
    document.getElementById('btn-preview')?.addEventListener('click', () => {
        UI.generarVistaPrevia();
    });

    document.getElementById('btn-exportar')?.addEventListener('click', () => {
        UI.exportar();
    });
}

// ==================== DATOS DE EJEMPLO ====================

function configurarDatosEjemplo() {
    document.getElementById('btn-datos-ejemplo')?.addEventListener('click', async () => {
        if (!confirm('¿Desea cargar los datos de ejemplo? Esto agregará registros de demostración.')) {
            return;
        }

        await cargarDatosEjemplo();
    });
}

async function cargarDatosEjemplo() {
    try {
        console.log('📦 Iniciando carga de datos de ejemplo...');
        
        // Verificar conexión a Supabase
        if (!window.__ENV__?.VITE_SUPABASE_URL) {
            throw new Error('Credenciales de Supabase no configuradas');
        }

        // ==================== CONGLOMERADOS ====================
        console.log('1️⃣ Creando conglomerados...');
        const conglomerados = [
            { codigo: 501, latitud: 4.5981, longitud: -74.0758, departamento: 'Cundinamarca', municipio: 'Bogotá', region: 'Andina', estado: 'COMPLETADO', fecha_asignacion: '2024-01-10' },
            { codigo: 502, latitud: 6.2476, longitud: -75.5658, departamento: 'Antioquia', municipio: 'Medellín', region: 'Andina', estado: 'EN_PROGRESO', fecha_asignacion: '2024-01-15' },
            { codigo: 503, latitud: 9.3047, longitud: -75.3978, departamento: 'Córdoba', municipio: 'Montería', region: 'Caribe', estado: 'COMPLETADO', fecha_asignacion: '2024-02-01' },
            { codigo: 504, latitud: 5.0358, longitud: -77.0289, departamento: 'Chocó', municipio: 'Quibdó', region: 'Pacífico', estado: 'PENDIENTE', fecha_asignacion: '2024-02-10' },
            { codigo: 505, latitud: -0.9500, longitud: -73.0000, departamento: 'Amazonas', municipio: 'Leticia', region: 'Amazonía', estado: 'COMPLETADO', fecha_asignacion: '2024-02-15' }
        ];

        const cgIds = [];
        for (const cg of conglomerados) {
            const result = await supabase.createConglomerado(cg);
            console.log('   - Conglomerado creado:', cg.codigo, '→ ID:', result?.[0]?.id);
            if (!result || result.length === 0 || !result[0].id) {
                throw new Error(`Error al crear conglomerado ${cg.codigo}`);
            }
            cgIds.push(result[0].id);
        }
        console.log('   ✅ 5 conglomerados creados');

        // ==================== BRIGADAS ====================
        console.log('2️⃣ Creando brigadas...');
        const brigadas = [
            { id_conglomerado: cgIds[0], nombre_lider: 'Jair Alexander Sánchez', integrantes: ['María González', 'Carlos Rodríguez', 'Pedro Vargas'], region: 'Andina', fecha_inicio: '2024-01-12', fecha_fin: '2024-01-18' },
            { id_conglomerado: cgIds[1], nombre_lider: 'Laura Mendoza', integrantes: ['Ana López', 'Jorge Gómez'], region: 'Andina', fecha_inicio: '2024-01-20', fecha_fin: '2024-01-25' },
            { id_conglomerado: cgIds[2], nombre_lider: 'Roberto Díaz', integrantes: ['Sofia Hernández', 'Miguel Torres'], region: 'Caribe', fecha_inicio: '2024-02-05', fecha_fin: '2024-02-10' },
            { id_conglomerado: cgIds[3], nombre_lider: 'Ever José Blandón', integrantes: ['Lucía Castro', 'Andrés Ruiz'], region: 'Pacífico', fecha_inicio: '2024-02-15', fecha_fin: null },
            { id_conglomerado: cgIds[4], nombre_lider: 'Carmen Valencia', integrantes: ['Fernando Soto', 'Isabel Peña'], region: 'Amazonía', fecha_inicio: '2024-02-20', fecha_fin: '2024-02-28' }
        ];

        const brIds = [];
        for (const br of brigadas) {
            const result = await supabase.createBrigada(br);
            console.log('   - Brigada creada:', br.nombre_lider, '→ ID:', result?.[0]?.id);
            if (!result || result.length === 0 || !result[0].id) {
                throw new Error(`Error al crear brigada ${br.nombre_lider}`);
            }
            brIds.push(result[0].id);
        }
        console.log('   ✅ 5 brigadas creadas');

        // ==================== MUESTRAS ====================
        console.log('3️⃣ Creando muestras...');
        const muestras = [
            { id_brigada: brIds[0], nombre_comun: 'Abedul', nombre_cientifico: 'Betula pendula', familia: 'Betulaceae', tipo_arbol: 'BRINZAL', uso: 'MADERABLE', codigo: 'ABD001', estado_clasificacion: 'IDENTIFICADO' },
            { id_brigada: brIds[0], nombre_comun: 'Eucalipto', nombre_cientifico: 'Eucalyptus globulus', familia: 'Myrtaceae', tipo_arbol: 'FUSTAL', uso: 'MADERABLE', codigo: 'EUC001', estado_clasificacion: 'IDENTIFICADO' },
            { id_brigada: brIds[0], nombre_comun: 'Cedro', nombre_cientifico: 'Cedrela odorata', familia: 'Meliaceae', tipo_arbol: 'FUSTAL', uso: 'MADERABLE', codigo: 'CED001', estado_clasificacion: 'IDENTIFICADO' },
            { id_brigada: brIds[1], nombre_comun: 'Guayacán', nombre_cientifico: 'Tabebuia chrysantha', familia: 'Bignoniaceae', tipo_arbol: 'LATIZAL', uso: 'ORNAMENTAL', codigo: 'GYC001', estado_clasificacion: 'PENDIENTE' },
            { id_brigada: brIds[1], nombre_comun: 'Palma de cera', nombre_cientifico: 'Ceroxylon quindiuense', familia: 'Arecaceae', tipo_arbol: 'FUSTAL', uso: 'ORNAMENTAL', codigo: 'PCE001', estado_clasificacion: 'IDENTIFICADO' },
            { id_brigada: brIds[2], nombre_comun: 'Caoba', nombre_cientifico: 'Swietenia macrophylla', familia: 'Meliaceae', tipo_arbol: 'FUSTAL', uso: 'MADERABLE', codigo: 'CAO001', estado_clasificacion: 'IDENTIFICADO' },
            { id_brigada: brIds[2], nombre_comun: 'Abarco', nombre_cientifico: 'Cariniana pyriformis', familia: 'Lecythidaceae', tipo_arbol: 'FUSTAL', uso: 'MADERABLE', codigo: 'ABR001', estado_clasificacion: 'PENDIENTE' },
            { id_brigada: brIds[3], nombre_comun: 'Balso', nombre_cientifico: 'Ochroma pyramidale', familia: 'Malvaceae', tipo_arbol: 'FUSTAL', uso: 'MADERABLE', codigo: 'BAL001', estado_clasificacion: 'PENDIENTE' },
            { id_brigada: brIds[4], nombre_comun: 'Arazá', nombre_cientifico: 'Eugenia stipitata', familia: 'Myrtaceae', tipo_arbol: 'LATIZAL', uso: 'ALIMENTICIO', codigo: 'ARZ001', estado_clasificacion: 'IDENTIFICADO' },
            { id_brigada: brIds[4], nombre_comun: 'Yuca', nombre_cientifico: 'Manihot esculenta', familia: 'Euphorbiaceae', tipo_arbol: 'BRINZAL', uso: 'ALIMENTICIO', codigo: 'YUC001', estado_clasificacion: 'IDENTIFICADO' }
        ];

        let muestrasCreadas = 0;
        for (const mu of muestras) {
            const result = await supabase.createMuestra(mu);
            if (result && result.length > 0) {
                muestrasCreadas++;
            }
        }
        console.log(`   ✅ ${muestrasCreadas}/10 muestras creadas`);

        // ==================== CONTEO DAP ====================
        console.log('4️⃣ Creando conteos DAP...');
        const conteos = [
            { id_brigada: brIds[0], subparcela: 1, brinzales: 25, latizales: 12, fustales: 8 },
            { id_brigada: brIds[0], subparcela: 2, brinzales: 30, latizales: 15, fustales: 10 },
            { id_brigada: brIds[1], subparcela: 1, brinzales: 20, latizales: 8, fustales: 5 },
            { id_brigada: brIds[2], subparcela: 1, brinzales: 35, latizales: 18, fustales: 12 },
            { id_brigada: brIds[3], subparcela: 1, brinzales: 45, latizales: 22, fustales: 15 }
        ];

        let conteosCreados = 0;
        for (const ct of conteos) {
            const result = await supabase.createConteo(ct);
            if (result && result.length > 0) {
                conteosCreados++;
            }
        }
        console.log(`   ✅ ${conteosCreados}/5 conteos creados`);

        // ==================== INSPECCIONES ====================
        console.log('5️⃣ Creando inspecciones...');
        const inspecciones = [
            { id_conglomerado: cgIds[0], id_brigada: brIds[0], fecha: '2024-01-15', clima: 'SOLEADO', duracion_horas: 8, observaciones: 'Primera jornada de muestreo en zona de bosque andino' },
            { id_conglomerado: cgIds[1], id_brigada: brIds[1], fecha: '2024-01-22', clima: 'NUBLADO', duracion_horas: 7, observaciones: 'Se encontró alta densidad de palmas' },
            { id_conglomerado: cgIds[2], id_brigada: brIds[2], fecha: '2024-02-08', clima: 'SOLEADO', duracion_horas: 9, observaciones: 'Buen acceso al conglomerado' }
        ];

        let inspeccionesCreadas = 0;
        for (const ins of inspecciones) {
            const result = await supabase.createInspeccion(ins);
            if (result && result.length > 0) {
                inspeccionesCreadas++;
            }
        }
        console.log(`   ✅ ${inspeccionesCreadas}/3 inspecciones creadas`);

        // ==================== RESUMEN ====================
        console.log('🎉 Carga de datos de ejemplo completada!');
        console.log('   - Conglomerados: 5');
        console.log('   - Brigadas: 5');
        console.log(`   - Muestras: ${muestrasCreadas}`);
        console.log(`   - Conteos: ${conteosCreados}`);
        console.log(`   - Inspecciones: ${inspeccionesCreadas}`);

        UI.showToast('Datos de ejemplo cargados correctamente', 'success');
        UI.actualizarDashboard();
        
    } catch (error) {
        console.error('❌ Error cargando datos de ejemplo:', error);
        UI.showToast('Error al cargar datos de ejemplo: ' + error.message, 'error');
    }
}

// ==================== ACTUALIZAR ====================

function configurarActualizar() {
    document.getElementById('btn-refresh')?.addEventListener('click', () => {
        UI.actualizarDashboard();
        UI.showToast('Datos actualizados', 'info');
    });
}

// ==================== DATEPICKERS ====================

function configurarDatePickers() {
    const datepickers = document.querySelectorAll('.datepicker');
    
    datepickers.forEach(input => {
        flatpickr(input, {
            dateFormat: 'Y-m-d',
            locale: 'es',
            theme: 'dark',
            allowInput: false,
            closeOnSelect: true
        });
    });
}
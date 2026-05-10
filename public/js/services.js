/**
 * ============================================
 * SERVICES - Lógica de negocio
 * ============================================
 * Funciones de validación, cálculo y transformación de datos
 */

const Services = {
    // ==================== VALIDACIONES ====================
    
    validarConglomerado(data) {
        const errores = [];
        
        if (!data.codigo || data.codigo <= 0) {
            errores.push('El código del conglomerado es requerido');
        }
        if (!data.departamento || data.departamento.trim() === '') {
            errores.push('El departamento es requerido');
        }
        if (!data.municipio || data.municipio.trim() === '') {
            errores.push('El municipio es requerido');
        }
        if (!data.region) {
            errores.push('La región es requerida');
        }
        if (data.latitud && (data.latitud < -4.2 || data.latitud > 12.5)) {
            errores.push('Latitud fuera de rango para Colombia');
        }
        if (data.longitud && (data.longitud < -79 || data.longitud > -66)) {
            errores.push('Longitud fuera de rango para Colombia');
        }
        
        return {
            valido: errores.length === 0,
            errores
        };
    },

    validarBrigada(data) {
        const errores = [];
        
        if (!data.id_conglomerado) {
            errores.push('Debe seleccionar un conglomerado');
        }
        if (!data.nombre_lider || data.nombre_lider.trim() === '') {
            errores.push('El nombre del líder es requerido');
        }
        if (!data.region) {
            errores.push('La región es requerida');
        }
        if (!data.fecha_inicio) {
            errores.push('La fecha de inicio es requerida');
        }
        
        return {
            valido: errores.length === 0,
            errores
        };
    },

    validarMuestra(data) {
        const errores = [];
        
        if (!data.id_brigada) {
            errores.push('Debe seleccionar una brigada');
        }
        if (!data.nombre_comun || data.nombre_comun.trim() === '') {
            errores.push('El nombre común es requerido');
        }
        if (!data.tipo_arbol) {
            errores.push('El tipo de árbol es requerido');
        }
        if (!data.uso) {
            errores.push('El uso es requerido');
        }
        if (!data.codigo || data.codigo.trim() === '') {
            errores.push('El código de identificación es requerido');
        }
        
        return {
            valido: errores.length === 0,
            errores
        };
    },

    validarConteo(data) {
        const errores = [];
        
        if (!data.id_brigada) {
            errores.push('Debe seleccionar una brigada');
        }
        if (!data.subparcela || data.subparcela < 1 || data.subparcela > 5) {
            errores.push('La subparcela debe estar entre 1 y 5');
        }
        
        return {
            valido: errores.length === 0,
            errores
        };
    },

    validarInspeccion(data) {
        const errores = [];
        
        if (!data.id_conglomerado) {
            errores.push('Debe seleccionar un conglomerado');
        }
        if (!data.id_brigada) {
            errores.push('Debe seleccionar una brigada');
        }
        if (!data.fecha) {
            errores.push('La fecha es requerida');
        }
        if (!data.clima) {
            errores.push('El clima es requerido');
        }
        if (!data.duracion_horas || data.duracion_horas < 1) {
            errores.push('La duración debe ser al menos 1 hora');
        }
        
        return {
            valido: errores.length === 0,
            errores
        };
    },

    // ==================== CÁLCULOS ====================

    calcularDensidadVegetal(conteos) {
        if (!conteos || conteos.length === 0) return 0;
        
        const totalBrinzales = conteos.reduce((sum, c) => sum + (parseInt(c.brinzales) || 0), 0);
        const totalLatizales = conteos.reduce((sum, c) => sum + (parseInt(c.latizales) || 0), 0);
        const totalFustales = conteos.reduce((sum, c) => sum + (parseInt(c.fustales) || 0), 0);
        
        const totalArboles = totalBrinzales + totalLatizales + totalFustales;
        const areaParcial = conteos.length * 0.07; // cada subparcela = 0.07 ha
        
        return areaParcial > 0 ? Math.round((totalArboles / areaParcial) * 100) / 100 : 0;
    },

    calcularEstadisticas(datos) {
        const stats = {
            total: datos.length,
            porTipo: {},
            porRegion: {},
            porUso: {},
            promedio: 0
        };

        datos.forEach(item => {
            // Por tipo de árbol
            if (item.tipo_arbol) {
                stats.porTipo[item.tipo_arbol] = (stats.porTipo[item.tipo_arbol] || 0) + 1;
            }
            // Por uso
            if (item.uso) {
                stats.porUso[item.uso] = (stats.porUso[item.uso] || 0) + 1;
            }
        });

        return stats;
    },

    // ==================== FORMATEO ====================

    formatearFecha(fecha) {
        if (!fecha) return '';
        const date = new Date(fecha);
        return date.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    formatearFechaInput(fecha) {
        if (!fecha) return '';
        return fecha.split('T')[0];
    },

    formatearNumero(numero) {
        if (numero === null || numero === undefined) return '0';
        return new Intl.NumberFormat('es-CO').format(numero);
    },

    formatearRegion(region) {
        const regiones = {
            'Andina': 'Región Andina',
            'Caribe': 'Región Caribe',
            'Pacífico': 'Región Pacífico',
            'Amazonía': 'Región Amazonía',
            'Orinoquía': 'Región Orinoquía'
        };
        return regiones[region] || region;
    },

    formatearTipoArbol(tipo) {
        const tipos = {
            'BRINZAL': 'Brinzal (DAP < 10 cm)',
            'LATIZAL': 'Latizal (DAP 10-30 cm)',
            'FUSTAL': 'Fustal (DAP > 30 cm)'
        };
        return tipos[tipo] || tipo;
    },

    formatearUso(uso) {
        const usos = {
            'MADERABLE': 'Maderable',
            'MEDICINAL': 'Medicinal',
            'ALIMENTICIO': 'Alimenticio',
            'ORNAMENTAL': 'Ornamental'
        };
        return usos[uso] || uso;
    },

    formatearEstado(estado) {
        const estados = {
            'PENDIENTE': { texto: 'Pendiente', clase: 'text-warning' },
            'EN_PROGRESO': { texto: 'En Progreso', clase: 'text-info' },
            'COMPLETADO': { texto: 'Completado', clase: 'text-success' },
            'IDENTIFICADO': { texto: 'Identificado', clase: 'text-success' }
        };
        return estados[estado] || { texto: estado, clase: '' };
    },

    // ==================== GENERACIÓN DE IDs ====================

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    generarCodigoMuestra(nombreComun) {
        const prefix = nombreComun.substring(0, 3).toUpperCase();
        const random = Math.floor(Math.random() * 9000) + 1000;
        return `${prefix}${random}`;
    },

    // ==================== EXPORTACIÓN ====================

    generarCSV(datos, tipo = 'inspecciones') {
        let csv = '';
        
        switch (tipo) {
            case 'conglomerados':
                csv = this.csvConglomerados(datos);
                break;
            case 'brigadas':
                csv = this.csvBrigadas(datos);
                break;
            case 'muestras':
                csv = this.csvMuestras(datos);
                break;
            case 'inspecciones':
                csv = this.csvInspecciones(datos);
                break;
            case 'todos':
                csv = this.csvTodos(datos);
                break;
        }
        
        return csv;
    },

    csvConglomerados(datos) {
        const headers = ['ID', 'Código', 'Latitud', 'Longitud', 'Departamento', 'Municipio', 'Región', 'Estado', 'Fecha Asignación'];
        const rows = datos.map(cg => [
            cg.id,
            cg.codigo,
            cg.latitud || '',
            cg.longitud || '',
            cg.departamento,
            cg.municipio,
            cg.region,
            cg.estado,
            cg.fecha_asignacion
        ]);
        
        return this.arrayToCSV(headers, rows);
    },

    csvBrigadas(datos) {
        const headers = ['ID', 'ID Conglomerado', 'Líder', 'Integrantes', 'Región', 'Fecha Inicio', 'Fecha Fin'];
        const rows = datos.map(br => [
            br.id,
            br.id_conglomerado,
            br.nombre_lider,
            br.integrantes ? br.integrantes.join('; ') : '',
            br.region,
            br.fecha_inicio,
            br.fecha_fin || ''
        ]);
        
        return this.arrayToCSV(headers, rows);
    },

    csvMuestras(datos) {
        const headers = ['ID', 'ID Brigada', 'Nombre Común', 'Nombre Científico', 'Familia', 'Tipo', 'Uso', 'Código', 'Estado'];
        const rows = datos.map(mu => [
            mu.id,
            mu.id_brigada,
            mu.nombre_comun,
            mu.nombre_cientifico || '',
            mu.familia || '',
            mu.tipo_arbol,
            mu.uso,
            mu.codigo,
            mu.estado_clasificacion
        ]);
        
        return this.arrayToCSV(headers, rows);
    },

    csvInspecciones(datos) {
        const headers = ['ID', 'ID Conglomerado', 'ID Brigada', 'Fecha', 'Clima', 'Duración (h)', 'Observaciones'];
        const rows = datos.map(ins => [
            ins.id,
            ins.id_conglomerado,
            ins.id_brigada,
            ins.fecha,
            ins.clima,
            ins.duracion_horas,
            ins.observaciones || ''
        ]);
        
        return this.arrayToCSV(headers, rows);
    },

    csvTodos(datos) {
        // Exportar todos los datos en formato combinado
        let csv = '# CONGLOMERADOS\n';
        csv += this.csvConglomerados(datos.conglomerados || []);
        csv += '\n# BRIGADAS\n';
        csv += this.csvBrigadas(datos.brigadas || []);
        csv += '\n# MUESTRAS\n';
        csv += this.csvMuestras(datos.muestras || []);
        csv += '\n# INSPECCIONES\n';
        csv += this.csvInspecciones(datos.inspecciones || []);
        
        return csv;
    },

    arrayToCSV(headers, rows) {
        const escapeCSV = (value) => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(';') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const headerLine = headers.map(escapeCSV).join(';');
        const dataLines = rows.map(row => row.map(escapeCSV).join(';'));
        
        return headerLine + '\n' + dataLines.join('\n');
    },

    descargarArchivo(contenido, nombre, tipo = 'text/csv;charset=utf-8;') {
        const contenidoConBOM = '\uFEFF' + contenido;
        const blob = new Blob([contenidoConBOM], { type: tipo });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nombre;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    // ==================== TRANSFORMACIONES ====================

    transformarIntegrantes(integrantesStr) {
        if (!integrantesStr) return [];
        return integrantesStr.split(',').map(i => i.trim()).filter(i => i);
    },

    integrarDetallesAInspecciones(inspecciones, conglomerados, brigadas) {
        return inspecciones.map(ins => {
            const cg = conglomerados.find(c => c.id === ins.id_conglomerado);
            const br = brigadas.find(b => b.id === ins.id_brigada);
            
            return {
                ...ins,
                conglomerado_info: cg || {},
                brigada_info: br || {}
            };
        });
    }
};

// Exportar para uso global
window.Services = Services;
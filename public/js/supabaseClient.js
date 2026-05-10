/**
 * ============================================
 * SUPABASE CLIENT - Conexión a la base de datos
 * ============================================
 * Configura la conexión con Supabase
 * 
 * CONFIGURACIÓN DE SEGURIDAD:
 * - Las credenciales se configuran vía Variables de Entorno
 * - En DESARROLLO: crea archivo public/config.js con tus credenciales
 * - En PRODUCCIÓN (Vercel): configura en Settings → Environment Variables
 */

// Función para obtener variables de entorno (soporta Vercel y desarrollo local)
const getEnv = (key, fallback = '') => {
    // 1.优先: window.__ENV__ (inyectado por Vercel)
    if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
        return window.__ENV__[key];
    }
    // 2. Fallback: import.meta.env (Vite/Webpack)
    if (typeof importMeta !== 'undefined' && importMeta.env && importMeta.env[key]) {
        return importMeta.env[key];
    }
    // 3. Fallback: variables globales (desarrollo)
    if (typeof window !== 'undefined' && window[key]) {
        return window[key];
    }
    return fallback;
};

// Configuración lazy - se resuelve cuando se usa, no cuando se carga el script
const supabaseClient = {
    get url() {
        return getEnv('VITE_SUPABASE_URL', getEnv('SUPABASE_URL', ''));
    },
    get key() {
        return getEnv('VITE_SUPABASE_ANON_KEY', getEnv('SUPABASE_ANON_KEY', ''));
    },

    async request(endpoint, method = 'GET', body = null) {
        const url = this.url;
        const key = this.key;
        
        if (!url || !key) {
            console.error('❌ Credenciales de Supabase no configuradas');
            throw new Error('Credenciales de Supabase no configuradas');
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`
        };

        // Para operaciones de escritura, pedir que retorne los datos creados
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
            headers['Prefer'] = 'return=representation';
        }

        const options = {
            method: method,
            headers: headers
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${this.url}/rest/v1/${endpoint}`, options);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Error ${response.status}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        return null;
    },

    // ==================== CONGLOMERADOS ====================
    async getConglomerados() {
        return await this.request('conglomerados?select=*&order=created_at.desc');
    },

    async getConglomeradoById(id) {
        if (!id) return null;
        const validId = id.replace(/['"]/g, '');
        return await this.request(`conglomerados?id=eq.${validId}&select=*`);
    },

    async getConglomeradoByCodigo(codigo) {
        return await this.request(`conglomerados?codigo=eq.${codigo}&select=*`);
    },

    async createConglomerado(data) {
        return await this.request('conglomerados', 'POST', data);
    },

    async updateConglomerado(id, data) {
        return await this.request(`conglomerados?id=eq.${id}`, 'PATCH', data);
    },

    async deleteConglomerado(id) {
        return await this.request(`conglomerados?id=eq.${id}`, 'DELETE');
    },

    // ==================== BRIGADAS ====================
    async getBrigadas() {
        return await this.request('brigadas?select=*&order=created_at.desc');
    },

    async getBrigadaById(id) {
        if (!id) return null;
        const validId = id.replace(/['"]/g, '');
        return await this.request(`brigadas?id=eq.${validId}&select=*`);
    },

    async getBrigadasByConglomerado(idConglomerado) {
        return await this.request(`brigadas?id_conglomerado=eq.${idConglomerado}&select=*`);
    },

    async createBrigada(data) {
        return await this.request('brigadas', 'POST', data);
    },

    async updateBrigada(id, data) {
        return await this.request(`brigadas?id=eq.${id}`, 'PATCH', data);
    },

    async deleteBrigada(id) {
        return await this.request(`brigadas?id=eq.${id}`, 'DELETE');
    },

    // ==================== MUESTRAS ====================
    async getMuestras() {
        return await this.request('muestras?select=*&order=created_at.desc');
    },

    async getMuestraById(id) {
        if (!id) return null;
        const validId = id.replace(/['"]/g, '');
        return await this.request(`muestras?id=eq.${validId}&select=*`);
    },

    async getMuestrasByBrigada(idBrigada) {
        if (!idBrigada) return [];
        return await this.request(`muestras?id_brigada=eq.${idBrigada}&select=*`);
    },

    async getMuestrasByUso(uso) {
        return await this.request(`muestras?uso=eq.${uso}&select=*`);
    },

    async createMuestra(data) {
        return await this.request('muestras', 'POST', data);
    },

    async updateMuestra(id, data) {
        return await this.request(`muestras?id=eq.${id}`, 'PATCH', data);
    },

    async deleteMuestra(id) {
        return await this.request(`muestras?id=eq.${id}`, 'DELETE');
    },

    // ==================== CONTEO DAP ====================
    async getConteos() {
        return await this.request('conteos?select=*&order=created_at.desc');
    },

    async getConteoById(id) {
        const validId = id.replace(/['"]/g, '');
        return await this.request(`conteos?id=eq.${validId}&select=*`);
    },

    async getConteosByBrigada(idBrigada) {
        if (!idBrigada) return [];
        return await this.request(`conteos?id_brigada=eq.${idBrigada}&select=*`);
    },

    async createConteo(data) {
        return await this.request('conteos', 'POST', data);
    },

    async updateConteo(id, data) {
        return await this.request(`conteos?id=eq.${id}`, 'PATCH', data);
    },

    async deleteConteo(id) {
        return await this.request(`conteos?id=eq.${id}`, 'DELETE');
    },

    // ==================== INSPECCIONES ====================
    async getInspecciones() {
        return await this.request('inspecciones?select=*&order=fecha.desc');
    },

    async getInspeccionById(id) {
        // Asegurar que el ID sea un UUID válido
        const validId = id.replace(/['"]/g, '');
        return await this.request(`inspecciones?id=eq.${validId}&select=*`);
    },

    async getInspeccionesByConglomerado(idConglomerado) {
        return await this.request(`inspecciones?id_conglomerado=eq.${idConglomerado}&select=*`);
    },

    async getInspeccionesByRegion(region) {
        return await this.request(`inspecciones?select=*,conglomerado(region)&conglomerado.region=eq.${region}`);
    },

    async createInspeccion(data) {
        return await this.request('inspecciones', 'POST', data);
    },

    async updateInspeccion(id, data) {
        return await this.request(`inspecciones?id=eq.${id}`, 'PATCH', data);
    },

    async deleteInspeccion(id) {
        return await this.request(`inspecciones?id=eq.${id}`, 'DELETE');
    },

    // ==================== CONSULTAS COMBINADAS ====================
    async getDashboardStats() {
        try {
            const [conglomerados, brigadas, muestras] = await Promise.all([
                this.getConglomerados(),
                this.getBrigadas(),
                this.getMuestras()
            ]);

            return {
                conglomerados: conglomerados?.length || 0,
                brigadas: brigadas?.length || 0,
                muestras: muestras?.length || 0,
                amenazadas: 0 // Se calculará dinámicamente
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            return { conglomerados: 0, brigadas: 0, muestras: 0, amenazadas: 0 };
        }
    },

    async getDistribucionPorRegion() {
        try {
            const conglomerados = await this.getConglomerados();
            const distribucion = {};

            conglomerados?.forEach(cg => {
                const region = cg.region || 'Sin especificar';
                distribucion[region] = (distribucion[region] || 0) + 1;
            });

            return distribucion;
        } catch (error) {
            console.error('Error obteniendo distribución:', error);
            return {};
        }
    },

    async getDetalleInspeccion(idInspeccion) {
        try {
            const inspeccion = await this.getInspeccionById(idInspeccion);
            if (!inspeccion || inspeccion.length === 0) return null;

            const ins = inspeccion[0];

            const [conglomerado, brigada, muestras, conteos] = await Promise.all([
                this.getConglomeradoById(ins.id_conglomerado),
                this.getBrigadaById(ins.id_brigada),
                this.getMuestrasByBrigada(ins.id_brigada),
                this.getConteosByBrigada(ins.id_brigada)
            ]);

            return {
                inspeccion: ins,
                conglomerado: conglomerado?.[0] || null,
                brigada: brigada?.[0] || null,
                muestras: muestras || [],
                conteos: conteos || []
            };
        } catch (error) {
            console.error('Error obteniendo detalle:', error);
            return null;
        }
    },

    async getDetalleConglomerado(idConglomerado) {
        try {
            const conglomerado = await this.getConglomeradoById(idConglomerado);
            if (!conglomerado || conglomerado.length === 0) return null;

            const cg = conglomerado[0];

            const [brigadas, inspecciones] = await Promise.all([
                this.getBrigadasByConglomerado(idConglomerado),
                this.getInspeccionesByConglomerado(idConglomerado)
            ]);

            return {
                conglomerado: cg,
                brigadas: brigadas || [],
                inspecciones: inspecciones || []
            };
        } catch (error) {
            console.error('Error obteniendo detalle de conglomerado:', error);
            return null;
        }
    },

    async getDetalleBrigada(idBrigada) {
        try {
            const brigada = await this.getBrigadaById(idBrigada);
            if (!brigada || brigada.length === 0) return null;

            const br = brigada[0];

            const [conglomerado, muestras, conteos] = await Promise.all([
                this.getConglomeradoById(br.id_conglomerado),
                this.getMuestrasByBrigada(idBrigada),
                this.getConteosByBrigada(idBrigada)
            ]);

            return {
                brigada: br,
                conglomerado: conglomerado?.[0] || null,
                muestras: muestras || [],
                conteos: conteos || []
            };
        } catch (error) {
            console.error('Error obteniendo detalle de brigada:', error);
            return null;
        }
    },

    async getDetalleMuestra(idMuestra) {
        try {
            const muestra = await this.getMuestraById(idMuestra);
            if (!muestra || muestra.length === 0) return null;

            const mu = muestra[0];

            // Llamadas en secuencia para poder usar el resultado anterior
            const brigada = await this.getBrigadaById(mu.id_brigada);
            
            let conglomerado = null;
            if (brigada && brigada.length > 0 && brigada[0].id_conglomerado) {
                const cgResult = await this.getConglomeradoById(brigada[0].id_conglomerado);
                conglomerado = cgResult?.[0] || null;
            }

            return {
                muestra: mu,
                brigada: brigada?.[0] || null,
                conglomerado: conglomerado
            };
        } catch (error) {
            console.error('Error obteniendo detalle de muestra:', error);
            return null;
        }
    },

    // ==================== BUSQUEDA AVANZADA ====================
    async buscar(tipo, filtros = {}) {
        try {
            let resultados = [];

            switch (tipo) {
                case 'inspeccion':
                    resultados = await this.buscarInspecciones(filtros);
                    break;
                case 'conglomerado':
                    resultados = await this.buscarConglomerados(filtros);
                    break;
                case 'brigada':
                    resultados = await this.buscarBrigadas(filtros);
                    break;
                case 'muestra':
                    resultados = await this.buscarMuestras(filtros);
                    break;
            }

            return resultados;
        } catch (error) {
            console.error('Error en búsqueda:', error);
            return [];
        }
    },

    async buscarInspecciones(filtros) {
        let query = 'inspecciones?select=*&order=fecha.desc';
        
        if (filtros.id) {
            query += `&id=eq.${filtros.id}`;
        }
        if (filtros.fechaInicio) {
            query += `&fecha=gte.${filtros.fechaInicio}`;
        }
        if (filtros.fechaFin) {
            query += `&fecha=lte.${filtros.fechaFin}`;
        }

        const inspecciones = await this.request(query);
        
        if (!inspecciones || inspecciones.length === 0) return [];

        // Enriquecer con datos de conglomerado y brigada
        const cgIds = [...new Set(inspecciones.map(i => i.id_conglomerado).filter(Boolean))];
        const brIds = [...new Set(inspecciones.map(i => i.id_brigada).filter(Boolean))];

        // Obtener conglomerados y brigadas relacionados
        let conglomerados = [];
        let brigadas = [];
        
        if (cgIds.length > 0) {
            const cgQuery = `conglomerados?id=in.(${cgIds.map(id => `"${id}"`).join(',')})&select=*`;
            conglomerados = await this.request(cgQuery) || [];
        }
        
        if (brIds.length > 0) {
            const brQuery = `brigadas?id=in.(${brIds.map(id => `"${id}"`).join(',')})&select=*`;
            brigadas = await this.request(brQuery) || [];
        }

        // Enriquecer cada inspección con los datos relacionados
        return inspecciones.map(ins => ({
            ...ins,
            conglomerado: conglomerados.find(cg => cg.id === ins.id_conglomerado),
            brigada: brigadas.find(br => br.id === ins.id_brigada)
        }));
    },

    async buscarConglomerados(filtros) {
        let query = 'conglomerados?select=*&order=created_at.desc';
        
        if (filtros.id) {
            query += `&id=eq.${filtros.id}`;
        }
        if (filtros.codigo) {
            query += `&codigo=eq.${filtros.codigo}`;
        }
        if (filtros.region) {
            query += `&region=eq.${filtros.region}`;
        }
        if (filtros.departamento) {
            query += `&departamento=ilike.*${filtros.departamento}*`;
        }

        return await this.request(query);
    },

    async buscarBrigadas(filtros) {
        let query = 'brigadas?select=*&order=created_at.desc';
        
        if (filtros.id) {
            query += `&id=eq.${filtros.id}`;
        }
        if (filtros.idConglomerado) {
            query += `&id_conglomerado=eq.${filtros.idConglomerado}`;
        }
        if (filtros.region) {
            query += `&region=eq.${filtros.region}`;
        }

        return await this.request(query);
    },

    async buscarMuestras(filtros) {
        let query = 'muestras?select=*&order=created_at.desc';
        
        if (filtros.id) {
            query += `&id=eq.${filtros.id}`;
        }
        if (filtros.idBrigada) {
            query += `&id_brigada=eq.${filtros.idBrigada}`;
        }
        if (filtros.uso) {
            query += `&uso=eq.${filtros.uso}`;
        }
        if (filtros.nombreComun) {
            query += `&nombre_comun=ilike.*${filtros.nombreComun}*`;
        }

        return await this.request(query);
    },

    // ==================== EXPORTAR ====================
    async getTodosLosDatos() {
        const [conglomerados, brigadas, muestras, conteos, inspecciones] = await Promise.all([
            this.getConglomerados(),
            this.getBrigadas(),
            this.getMuestras(),
            this.getConteos(),
            this.getInspecciones()
        ]);

        return {
            conglomerados: conglomerados || [],
            brigadas: brigadas || [],
            muestras: muestras || [],
            conteos: conteos || [],
            inspecciones: inspecciones || []
        };
    },

    // ==================== AUTH - AUTENTICACIÓN ====================
    async login(email, password) {
        try {
            const url = this.url;
            const key = this.key;
            
            if (!url || !key) {
                throw new Error('Credenciales de Supabase no configuradas. Verifica config.js');
            }
            
            const response = await fetch(`${url}/rest/v1/admins?email=eq.${encodeURIComponent(email)}&select=*`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.key,
                    'Authorization': `Bearer ${this.key}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Error de conexión');
            }
            
            const admins = await response.json();
            
            if (!admins || admins.length === 0) {
                throw new Error('Usuario no encontrado');
            }
            
            const admin = admins[0];
            
            if (admin.password !== password) {
                throw new Error('Contraseña incorrecta');
            }
            
            // Guardar sesión en localStorage
            const session = {
                id: admin.id,
                email: admin.email,
                nombre: admin.nombre,
                rol: admin.rol,
                loginAt: new Date().toISOString()
            };
            localStorage.setItem('adminSession', JSON.stringify(session));
            
            console.log('✅ Login exitoso:', admin.nombre, '- Rol:', admin.rol);
            return session;
        } catch (error) {
            console.error('❌ Error en login:', error.message);
            throw error;
        }
    },

    logout() {
        localStorage.removeItem('adminSession');
        console.log('✅ Sesión cerrada');
    },

    getSession() {
        const sessionStr = localStorage.getItem('adminSession');
        if (sessionStr) {
            try {
                return JSON.parse(sessionStr);
            } catch {
                return null;
            }
        }
        return null;
    },

    isLoggedIn() {
        return this.getSession() !== null;
    },

    isSupremo() {
        const session = this.getSession();
        return session && session.rol === 'supremo';
    },

    async getAdmins() {
        return await this.request('admins?select=id,email,nombre,rol,created_at&order=created_at.desc');
    },

    async createAdmin(data) {
        return await this.request('admins', 'POST', data);
    },

    async updateAdmin(id, data) {
        return await this.request(`admins?id=eq.${id}`, 'PATCH', data);
    },

    async deleteAdmin(id) {
        return await this.request(`admins?id=eq.${id}`, 'DELETE');
    }
};

// Exportar para uso global
window.supabase = supabaseClient;
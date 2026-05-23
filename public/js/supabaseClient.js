/**
 * ============================================
 * SUPABASE CLIENT - Conexión a la base de datos
 * ============================================
 * Configura la conexión con Supabase
 * 
 * CONFIGURACIÓN DE SEGURIDAD:
 * - Las credenciales se configuran vía Variables de Entorno
 * - En DESARROLLO LOCAL: archivo .env en la raíz del proyecto
 * - En PRODUCCIÓN (Vercel): Environment Variables en Settings
 * 
 * IMPORTANTE: NUNCA expongas SUPABASE_SERVICE_ROLE_KEY en el frontend
 */

// Función para obtener variables de entorno (soporta Vercel y desarrollo local)
const getEnv = (key, fallback = '') => {
    // 1. window.__ENV__ (generado durante build desde .env o Environment Variables)
    if (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[key]) {
        return window.__ENV__[key];
    }
    // 2. Fallback: variables globales (para compatibilidad con desarrollo local)
    if (typeof window !== 'undefined' && window[key]) {
        return window[key];
    }
    return fallback;
};

// Sanitizar ID para prevenir inyección SQL/NoSQL
const sanitizeId = (id) => {
    if (!id || typeof id !== 'string') return '';
    // Solo permitir caracteres válidos para UUID: letras, números, guiones
    return id.replace(/[^a-fA-F0-9\-]/g, '').trim();
};

// Sanitizar filtros de búsqueda
const sanitizeFilter = (value) => {
    if (!value || typeof value !== 'string') return '';
    // Remover caracteres peligrosos
    return value.replace(/['";<>\-]/g, '').trim();
};

// Esperar a que el SDK de Supabase esté disponible
const waitForSupabaseSDK = (options = {}) => {
    const { timeout = 5000, interval = 100, retries = 50 } = options;

    return new Promise((resolve, reject) => {
        let attempts = 0;

        const check = () => {
            attempts++;

            if (window.createSupabaseClient) {
                return true;
            }

            if (attempts >= retries) {
                return false;
            }

            return false;
        };

        // 1. Verificar inmediatamente
        if (check()) {
            resolve(true);
            return;
        }

        // 2. Escuchar evento cuando el módulo cargue
        const onReady = () => {
            cleanup();
            resolve(true);
        };
        window.addEventListener('supabase-sdk-ready', onReady);

        // 3. Polling de seguridad
        const intervalId = setInterval(() => {
            if (check()) {
                cleanup();
                resolve(true);
            }
        }, interval);

        const cleanup = () => {
            clearInterval(intervalId);
            window.removeEventListener('supabase-sdk-ready', onReady);
        };

        // 4. Timeout
        setTimeout(() => {
            cleanup();
            if (!window.createSupabaseClient) {
                reject(new Error('SDK_TIMEOUT'));
            }
        }, timeout);
    });
};

// Configuración lazy - se resolve cuando se usa, no cuando se carga el script
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

        // Para GET: usar token de usuario si existe (necesario para RLS), sino ANON_KEY
        if (method === 'GET') {
            const userToken = this.getAccessToken();
            const authHeader = userToken ? `Bearer ${userToken}` : `Bearer ${key}`;

            const headers = {
                'Content-Type': 'application/json',
                'apikey': key,
                'Authorization': authHeader
            };

            const options = {
                method: 'GET',
                headers: headers
            };

            try {
                const response = await fetch(`${this.url}/rest/v1/${endpoint}`, options);

                if (!response.ok) {
                    const error = await response.json().catch(() => ({ message: `Error ${response.status}` }));
                    throw new Error(error.message || `Error ${response.status}`);
                }

                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return await response.json();
                }
                return null;
            } catch (error) {
                throw error;
            }
        }

        // Para POST/PATCH/DELETE (requieren auth): verificar sesión
        const session = this.getSessionSync();
        if (session && session.expires_at) {
            const now = Math.floor(Date.now() / 1000);
            if (now >= session.expires_at - 60) {
                const refreshed = await this.refreshSession();
                if (!refreshed) {
                    throw new Error('SESION_EXPIRADA');
                }
            }
        }

        const accessToken = this.getAccessToken();
        const authToken = accessToken || key;
        
        const headers = {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${authToken}`
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
            if (response.status === 401) {
                if (session && session.refresh_token) {
                    const refreshed = await this.refreshSession();
                    if (refreshed) {
                        const newAccessToken = this.getAccessToken();
                        headers['Authorization'] = `Bearer ${newAccessToken}`;
                        const retryResponse = await fetch(`${this.url}/rest/v1/${endpoint}`, options);
                        if (retryResponse.ok) {
                            const contentType = retryResponse.headers.get('content-type');
                            if (contentType && contentType.includes('application/json')) {
                                return await retryResponse.json();
                            }
                            return null;
                        }
                    }
                }
                await this.logout();
                throw new Error('SESION_EXPIRADA');
            }
            const error = await response.json().catch(() => ({ message: `Error ${response.status}` }));
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
        const safeId = sanitizeId(id);
        return await this.request(`conglomerados?id=eq.${safeId}`, 'PATCH', data);
    },

    async deleteConglomerado(id) {
        const safeId = sanitizeId(id);
        return await this.request(`conglomerados?id=eq.${safeId}`, 'DELETE');
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
        const safeId = sanitizeId(id);
        return await this.request(`brigadas?id=eq.${safeId}`, 'PATCH', data);
    },

    async deleteBrigada(id) {
        const safeId = sanitizeId(id);
        return await this.request(`brigadas?id=eq.${safeId}`, 'DELETE');
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
        const safeId = sanitizeId(id);
        return await this.request(`muestras?id=eq.${safeId}`, 'PATCH', data);
    },

    async deleteMuestra(id) {
        const safeId = sanitizeId(id);
        return await this.request(`muestras?id=eq.${safeId}`, 'DELETE');
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
        const safeId = sanitizeId(id);
        return await this.request(`inspecciones?id=eq.${safeId}`, 'PATCH', data);
    },

    async deleteInspeccion(id) {
        const safeId = sanitizeId(id);
        return await this.request(`inspecciones?id=eq.${safeId}`, 'DELETE');
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
            query += `&id=eq.${sanitizeId(filtros.id)}`;
        }
        if (filtros.fechaInicio) {
            const safeFecha = sanitizeFilter(filtros.fechaInicio);
            query += `&fecha=gte.${safeFecha}`;
        }
        if (filtros.fechaFin) {
            const safeFecha = sanitizeFilter(filtros.fechaFin);
            query += `&fecha=lte.${safeFecha}`;
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
            query += `&id=eq.${sanitizeId(filtros.id)}`;
        }
        if (filtros.codigo) {
            query += `&codigo=eq.${sanitizeFilter(filtros.codigo)}`;
        }
        if (filtros.region) {
            query += `&region=eq.${sanitizeFilter(filtros.region)}`;
        }
        if (filtros.departamento) {
            query += `&departamento=ilike.*${sanitizeFilter(filtros.departamento)}*`;
        }

        return await this.request(query);
    },

    async buscarBrigadas(filtros) {
        let query = 'brigadas?select=*&order=created_at.desc';
        
        if (filtros.id) {
            query += `&id=eq.${sanitizeId(filtros.id)}`;
        }
        if (filtros.idConglomerado) {
            query += `&id_conglomerado=eq.${sanitizeId(filtros.idConglomerado)}`;
        }
        if (filtros.region) {
            query += `&region=eq.${sanitizeFilter(filtros.region)}`;
        }

        return await this.request(query);
    },

    async buscarMuestras(filtros) {
        let query = 'muestras?select=*&order=created_at.desc';
        
        if (filtros.id) {
            query += `&id=eq.${sanitizeId(filtros.id)}`;
        }
        if (filtros.idBrigada) {
            query += `&id_brigada=eq.${sanitizeId(filtros.idBrigada)}`;
        }
        if (filtros.uso) {
            query += `&uso=eq.${sanitizeFilter(filtros.uso)}`;
        }
        if (filtros.nombreComun) {
            query += `&nombre_comun=ilike.*${sanitizeFilter(filtros.nombreComun)}*`;
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

    // ==================== AUTH - AUTENTICACIÓN CON SUPABASE JS SDK ====================
    
    // Cliente de Supabase Auth (usando SDK oficial via ES6 Module)
    get supabaseAuth() {
        if (!this._supabaseAuth && this.url && this.key && window.createSupabaseClient) {
            this._supabaseAuth = window.createSupabaseClient(this.url, this.key);
        }
        return this._supabaseAuth;
    },

    async login(email, password) {
        try {
            if (!this.url || !this.key) {
                throw new Error('Credenciales de Supabase no configuradas. Verifica las variables de entorno');
            }

            // Asegurar que el SDK esté listo antes de intentar login
            if (!this.supabaseAuth) {
                console.log('⏳ Esperando SDK de Supabase...');
                try {
                    await waitForSupabaseSDK();
                } catch (sdkError) {
                    throw new Error('Error de conexión. Recarga la página e intenta de nuevo.');
                }

                // Verificar nuevamente después de esperar
                if (!this.supabaseAuth) {
                    this._supabaseAuth = window.createSupabaseClient(this.url, this.key);
                }
            }

            // Usar el SDK de Supabase para autenticar
            const { data, error } = await this.supabaseAuth.auth.signInWithPassword({
                email, password
            });
            
            if (error) {
                throw new Error(error.message || 'Usuario no encontrado o contraseña incorrecta');
            }
            
            if (!data || !data.session) {
                throw new Error('Error en la autenticación');
            }

            // 🔴 OBTENER USUARIO FRESCO (getUser() siempre consulta al servidor)
            const { data: userData, error: userError } = await this.supabaseAuth.auth.getUser();
            if (userError || !userData?.user) {
                throw new Error('Error obteniendo datos de usuario');
            }
            
            const authData = data;
            const user = userData.user; // ← Usar user fresco de getUser()
            
            // Verificar que el usuario tiene un rol asignado
            const appMeta = user.app_metadata || {};
            const userMeta = user.user_metadata || {};
            
            if (!appMeta.rol) {
                throw new Error('Usuario no autorizado. Contacta al administrador.');
            }

            // Obtener el nombre desde profile (más actualizado)
            let nombre = userMeta.nombre || 'Usuario';
            try {
                const profileResponse = await fetch(
                    `${this.url}/rest/v1/profiles?id=eq.${user.id}&select=nombre`,
                    {
                        headers: {
                            'apikey': this.key,
                            'Authorization': `Bearer ${authData.session.access_token}`
                        }
                    }
                );
                if (profileResponse.ok) {
                    const profiles = await profileResponse.json();
                    if (profiles && profiles.length > 0 && profiles[0].nombre) {
                        nombre = profiles[0].nombre;
                    }
                }
            } catch (e) {
                console.log('Profile not found, using metadata name');
            }

            // 🔴 LIMPIAR invalidada_hasta al hacer login exitoso
            // (el usuario se autenticó correctamente, la marca ya no aplica)
            try {
                await fetch(
                    `${this.url}/rest/v1/profiles?id=eq.${user.id}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': this.key,
                            'Authorization': `Bearer ${authData.session.access_token}`,
                            'Prefer': 'return=minimal'
                        },
                        body: JSON.stringify({ 
                            invalidada_hasta: null 
                        })
                    }
                );
            } catch (e) {
                console.warn('⚠️ No se pudo limpiar invalidada_hasta:', e.message);
            }

            // Guardar sesión completa
            const session = {
                access_token: authData.session.access_token,
                refresh_token: authData.session.refresh_token,
                expires_in: authData.session.expires_in,
                expires_at: Math.floor(Date.now() / 1000) + authData.session.expires_in,
                user: {
                    id: user.id,
                    email: user.email
                },
                admin: {
                    id: user.id,
                    email: user.email,
                    nombre: nombre,
                    rol: appMeta.rol,
                    es_supremo: appMeta.es_supremo || false
                },
                loginAt: new Date().toISOString()
            };
            
            localStorage.setItem('supabaseSession', JSON.stringify(session));
            localStorage.setItem('adminSession', JSON.stringify(session.admin));
            
            console.log('✅ Login exitoso:', nombre, '- Rol:', appMeta.rol);
            return session;
        } catch (error) {
            console.error('❌ Error en login:', error.message);
            throw error;
        }
    },

    async logout() {
        try {
            // Usar el SDK de Supabase para cerrar sesión
            await this.supabaseAuth.auth.signOut();
        } catch (e) {
            // Ignorar errores de logout en servidor
        }
        localStorage.removeItem('supabaseSession');
        localStorage.removeItem('adminSession');
        console.log('✅ Sesión cerrada');
    },

    async refreshSession() {
        const session = this.getSessionSync();
        if (!session || !session.refresh_token) {
            return null;
        }

        try {
            // Usar el SDK de Supabase para refrescar sesión
            const { data, error } = await this.supabaseAuth.auth.refreshSession();
            
            if (error || !data.session) {
                await this.logout();
                return null;
            }
            
            const newTokenData = data;
            
            // Actualizar sesión en localStorage
            const newSession = {
                ...session,
                access_token: newTokenData.session.access_token,
                refresh_token: newTokenData.session.refresh_token,
                expires_at: Math.floor(Date.now() / 1000) + newTokenData.session.expires_in
            };
            
            localStorage.setItem('supabaseSession', JSON.stringify(newSession));
            console.log('🔄 Token refrescado exitosamente');
            return newTokenData;
        } catch (error) {
            console.error('❌ Error refrescando token:', error.message);
            await this.logout();
            return null;
        }
    },

    async getSession() {
        // Usar el SDK de Supabase para obtener sesión
        const { data } = await this.supabaseAuth.auth.getSession();
        if (!data.session) return null;
        
        const session = data.session;
        
        // Verificar si el token expiró
        if (session.expires_at && Date.now() > session.expires_at * 1000) {
            await this.logout();
            return null;
        }

        return session;
    },

    getSessionSync() {
        const sessionStr = localStorage.getItem('supabaseSession');
        if (sessionStr) {
            try {
                const session = JSON.parse(sessionStr);
                // Verificar estructura válida
                if (!session || typeof session !== 'object') {
                    localStorage.removeItem('supabaseSession');
                    localStorage.removeItem('adminSession');
                    return null;
                }
                // Verificar que tiene access_token
                if (!session.access_token) {
                    localStorage.removeItem('supabaseSession');
                    localStorage.removeItem('adminSession');
                    return null;
                }
                return session;
            } catch {
                localStorage.removeItem('supabaseSession');
                localStorage.removeItem('adminSession');
                return null;
            }
        }
        return null;
    },

    async isLoggedIn() {
        const session = await this.getSession();
        return session !== null;
    },

    isLoggedInSync() {
        const session = this.getSessionSync();
        return session !== null;
    },

    getRol() {
        const session = this.getSessionSync();
        return session?.admin?.rol || null;
    },

    isSupremo() {
        const session = this.getSessionSync();
        return session?.admin?.es_supremo === true || session?.admin?.rol === 'supremo';
    },

    getAccessToken() {
        const session = this.getSessionSync();
        if (!session || !session.access_token) return null;
        
        // Verificar si el token expiró
        if (session.expires_at && Math.floor(Date.now() / 1000) >= session.expires_at) {
            return null; // Token expirado, no usar
        }
        
        return session.access_token;
    },

    async getAdmins() {
        const token = this.getAccessToken();
        if (!token) throw new Error('No autenticado');

        const response = await fetch(`${this.url}/functions/v1/get-admins`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ getAdmins error:', response.status, errorText);
            throw new Error('Error al obtener admins: ' + response.status);
        }

        return await response.json();
    },

    async createAdmin(data) {
        // Solo supremos pueden crear admins
        if (!this.isSupremo()) {
            throw new Error('No tienes permisos para crear administradores');
        }
        
        const token = this.getAccessToken();
        
        // Llamar a Edge Function para crear admin
        const response = await fetch(`${this.url}/functions/v1/create-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                email: data.email,
                password: data.password,
                nombre: data.nombre,
                rol: data.rol || 'admin'
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al crear admin');
        }
        
        return await response.json();
    },

    async updateAdmin(id, data) {
        if (!this.isSupremo()) {
            throw new Error('No tienes permisos para editar administradores');
        }
        
        const token = this.getAccessToken();
        
        // Llamar a Edge Function para actualizar admin
        const response = await fetch(`${this.url}/functions/v1/update-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                userId: id,
                email: data.email,
                nombre: data.nombre,
                rol: data.rol,
                password: data.password || undefined
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al actualizar admin');
        }
        
        return await response.json();
    },

    async deleteAdmin(id) {
        if (!this.isSupremo()) {
            throw new Error('No tienes permisos para eliminar administradores');
        }
        
        const token = this.getAccessToken();
        
        // Llamar a Edge Function para eliminar admin
        const response = await fetch(`${this.url}/functions/v1/delete-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId: id })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al eliminar admin');
        }
        
        return await response.json();
    },

    async getAuditLogs() {
        const token = this.getAccessToken();
        if (!token) throw new Error('No autenticado');

        const response = await fetch(`${this.url}/functions/v1/log-audit`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al obtener historial de auditoría');
        }

        return await response.json();
    },

    // ==================== REFRESCO DE SESIÓN EN TIEMPO REAL ====================

    actualizarSesionDesdePerfil(profileData) {
        try {
            const session = this.getSessionSync();
            if (!session?.admin) return;

            const rolAnterior = session.admin.rol;
            const nuevoRol = profileData.rol || rolAnterior;
            const rolCambio = rolAnterior !== nuevoRol;

            const updatedAdmin = {
                ...session.admin,
                nombre: profileData.nombre || session.admin.nombre,
                rol: nuevoRol,
                es_supremo: nuevoRol === 'supremo',
                app_metadata: {
                    ...session.admin.app_metadata,
                    rol: nuevoRol
                }
            };

            const updatedSession = { ...session, admin: updatedAdmin };
            localStorage.setItem('supabaseSession', JSON.stringify(updatedSession));
            localStorage.setItem('adminSession', JSON.stringify(updatedAdmin));

            if (window.UI?.actualizarUIAuth) {
                window.UI.actualizarUIAuth(updatedSession);
            }

            // 🔴 SI CAMBIÓ EL ROL: forzar re-login para obtener JWT actualizado
            if (rolCambio) {
                console.log('🔄 Rol actualizado: cerrando sesión para aplicar cambios');
                if (window.UI?.showToast) {
                    window.UI.showToast('Tu rol ha sido actualizado. Iniciando sesión nuevamente...', 'info', 3000);
                }
                setTimeout(() => {
                    this.detenerPolling();
                    window.__realtimeInitialized = false;
                    localStorage.removeItem('supabaseSession');
                    localStorage.removeItem('adminSession');
                    window.location.replace('/?session=rol_actualizado');
                }, 2000);
                return;
            }

            console.log(`✅ Sesión actualizada en tiempo real: ${updatedAdmin.nombre} (${updatedAdmin.rol})`);
        } catch (e) {
            console.warn('⚠️ Error actualizando sesión:', e.message);
        }
    },

    // ==================== SEGURIDAD: LOGOUT FORZADO ====================

    logoutForzado(reason = 'SESSION_INVALIDATED') {
        console.warn(JSON.stringify({
            level: 'warn',
            event: 'FORCE_LOGOUT',
            reason,
            timestamp: new Date().toISOString(),
            path: window.location.pathname
        }));

        this.detenerPolling();
        window.__realtimeInitialized = false;

        const keysToRemove = Object.keys(localStorage).filter(k => 
            k.startsWith('sb-') || k.includes('supabase')
        );
        keysToRemove.forEach(k => localStorage.removeItem(k));

        const messages = {
            'ACCOUNT_DELETED': 'Tu cuenta ha sido eliminada.',
            'ACCOUNT_INVALIDATED': 'Tu sesión fue invalidada por un administrador.',
            'SESSION_REVOKED': 'Tu sesión fue cerrada por un administrador.',
            'default': 'Tu sesión ha sido invalidada. Inicia sesión nuevamente.'
        };

        if (window.UI?.showToast) {
            window.UI.showToast(messages[reason] || messages.default, 'error', 5000);
        }

        try {
            this.supabaseAuth?.auth?.signOut({ scope: 'local' });
        } catch (e) {
            console.warn('⚠️ Error en signOut:', e);
        }

        setTimeout(() => {
            window.location.replace('/?session=invalidated');
        }, 2500);
    },

    // ==================== SEGURIDAD: VERIFICACION DE USUARIO ACTIVO ====================

    _pollingTimer: null,
    _lastCheck: 0,
    _lastValid: undefined,

async verificarUsuarioActivo(userId) {
        if (!userId) return false;

        const now = Date.now();
        if (now - this._lastCheck < 10000 && this._lastValid !== undefined) {
            return this._lastValid;
        }

        try {
            const result = await this.request(
                `profiles?id=eq.${userId}&select=eliminado,invalidada_hasta`,
                'GET'
            );

            const profile = Array.isArray(result) ? result[0] : result;

            if (!profile) {
                console.warn(`⚠️ Perfil no encontrado para usuario: ${userId}`);
                this._lastValid = false;
                this._lastCheck = now;
                return false;
            }

            const invalidadaHasta = profile.invalidada_hasta
                ? new Date(profile.invalidada_hasta)
                : null;

            const fechaInvalida = invalidadaHasta && !isNaN(invalidadaHasta.getTime());

            const estaEliminado = profile.eliminado === true;
            const estaVencido = fechaInvalida && invalidadaHasta < new Date();

            const activo = !estaEliminado && !estaVencido;

            console.log(`📋 Verificación ${userId?.substring(0,8)}: eliminado=${estaEliminado}, vencido=${estaVencido} → activo=${activo}`);

            this._lastValid = activo;
            this._lastCheck = now;
            return activo;
        } catch (e) {
            console.warn('⚠️ Error verificando usuario (fallback seguro):', e.message);
            this._lastCheck = now;
            return true;
        }
    },

    iniciarPolling(userId) {
        this.detenerPolling();
        this._pollingTimer = setInterval(async () => {
            const session = this.getSessionSync();
            if (!session?.admin?.id) {
                this.detenerPolling();
                return;
            }

            const activo = await this.verificarUsuarioActivo(userId);
            if (!activo) {
                this.detenerPolling();
                this.logoutForzado('ACCOUNT_INVALIDATED');
            }
        }, 15000);
    },

    detenerPolling() {
        if (this._pollingTimer) {
            clearInterval(this._pollingTimer);
            this._pollingTimer = null;
        }
    }
};

// Exportar para uso global
window.supabase = supabaseClient;
Object.defineProperty(window, 'supabaseAuth', {
    get: () => supabaseClient.supabaseAuth,
    configurable: true
});
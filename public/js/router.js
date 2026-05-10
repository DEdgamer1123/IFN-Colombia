/**
 * ============================================
 * ROUTER - Navegación SPA (Single Page Application)
 * ============================================
 * Maneja el cambio de vistas y rutas sin recargar la página
 */

const Router = {
    routes: {
        '/': { view: 'dashboard', title: 'Dashboard' },
        '/registrar': { view: 'registrar', title: 'Registrar' },
        '/registrar/conglomerado': { view: 'registrar', title: 'Registrar Conglomerado' },
        '/registrar/brigada': { view: 'registrar', title: 'Registrar Brigada' },
        '/registrar/muestra': { view: 'registrar', title: 'Registrar Muestra' },
        '/registrar/conteo': { view: 'registrar', title: 'Registrar Conteo' },
        '/registrar/inspeccion': { view: 'registrar', title: 'Registrar Inspección' },
        '/consultar': { view: 'consultar', title: 'Consultar' },
        '/exportar': { view: 'exportar', title: 'Exportar' },
        '/admin': { view: 'admin', title: 'Admin' },
        '/login': { view: 'login', title: 'Login' }
    },

    currentRoute: null,

    init() {
        // Escuchar cambios en el historial
        window.addEventListener('popstate', () => this.handleRoute());
        
        // Interceptar clics en enlaces
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && link.href.startsWith('#')) {
                e.preventDefault();
                const hash = link.href.split('#')[1];
                this.navigate(hash);
            }
        });

        // Manejar botones de registro
        document.querySelectorAll('.registrar-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const form = btn.dataset.form;
                this.navigate(`/registrar/${form}`);
            });
        });

        // Primera carga
        this.handleRoute();
    },

    navigate(path) {
        // Actualizar URL hash
        window.location.hash = path;
    },

    handleRoute() {
        // Obtener hash actual
        const hash = window.location.hash.slice(1) || '/';
        
        // Buscar ruta
        let route = this.routes[hash];
        
        // Si no existe la ruta exacta, buscar por prefijo
        if (!route) {
            const pathParts = hash.split('/');
            const basePath = '/' + pathParts[0];
            if (this.routes[basePath]) {
                route = { ...this.routes[basePath] };
            }
        }

        // Si aún no existe, usar dashboard
        if (!route) {
            route = this.routes['/'];
        }

        // Proteger ruta /admin
        if (hash === '/admin' && !supabase.isLoggedIn()) {
            console.log('🔒 Ruta /admin protegida - requeriendo login');
            UI.abrirLogin();
            // No navegamos a otro lado, simplemente abrimos el modal
            // y mantenemos la vista actual
            return;
        }

        // Ruta /login - abrir modal de login
        if (hash === '/login') {
            console.log('🔐 Ruta /login - abriendo modal');
            UI.abrirLogin();
            // Mantener la vista actual pero abrir el modal
            // Volver a la ruta anterior (dashboard por defecto)
            this.navigate('/');
            return;
        }

        this.currentRoute = hash;
        
        // Actualizar título
        document.getElementById('page-title').textContent = route.title;
        
        // Actualizar menú activo
        document.querySelectorAll('.nav-item').forEach(item => {
            const itemRoute = item.dataset.route;
            if (itemRoute === hash || (hash.startsWith(itemRoute) && itemRoute !== '/')) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Mostrar vista
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        const viewEl = document.getElementById(`view-${route.view}`);
        if (viewEl) {
            viewEl.classList.add('active');
        }

        // Ejecutar acciones específicas por vista
        this.onViewChange(route.view, hash);
    },

    onViewChange(view, route) {
        switch (view) {
            case 'dashboard':
                UI.actualizarDashboard();
                break;
            case 'registrar':
                // Determinar qué formulario mostrar
                if (route.includes('conglomerado')) {
                    UI.mostrarFormulario('conglomerado');
                } else if (route.includes('brigada')) {
                    UI.mostrarFormulario('brigada');
                } else if (route.includes('muestra')) {
                    UI.mostrarFormulario('muestra');
                } else if (route.includes('conteo')) {
                    UI.mostrarFormulario('conteo');
                } else if (route.includes('inspeccion')) {
                    UI.mostrarFormulario('inspeccion');
                }
                UI.cargarSelects();
                break;
            case 'consultar':
                // Limpiar resultados al entrar
                break;
            case 'exportar':
                // Preparar vista de exportación
                break;
            case 'admin':
                // Inicializar panel de admin
                Admin.init();
                break;
        }
    }
};

// Exportar para uso global
window.Router = Router;
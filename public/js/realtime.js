const Realtime = {
    channel: null,
    initialized: false,

    init(supabaseClient) {
        if (this.initialized) {
            console.log('📡 Realtime ya inicializado');
            return;
        }

        if (!window.supabaseAuth) {
            console.warn(JSON.stringify({
                level: 'warn',
                event: 'REALTIME_INIT_FAILED',
                reason: 'Supabase Auth no disponible',
                timestamp: new Date().toISOString()
            }));
            return;
        }

        if (!supabaseClient.isLoggedInSync()) {
            console.log('📡 Realtime: usuario no logueado, omitiendo');
            return;
        }

        const user = supabaseClient.getSessionSync()?.admin;
        if (!user) return;

        const rol = user.rol || user.app_metadata?.rol;
        if (rol !== 'admin' && rol !== 'supremo') {
            console.log('📡 Realtime: usuario no es admin, omitiendo');
            return;
        }

        console.log('📡 Inicializando suscripciones Realtime...');

        // Escuchar cambios en profiles del usuario actual (para invalidación en tiempo real)
        this.channel = window.supabaseAuth.channel(`profiles:${user.id}`);

        this.channel
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`
            }, (payload) => {
                console.log('📡 Cambio detectado en profiles:', payload);
                this.handleProfileUpdate(payload);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Suscripción Realtime activa en profiles');
                    this.initialized = true;
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Error en canal Realtime');
                }
            });
    },

    handleProfileUpdate(payload) {
        const { new: newRecord } = payload;
        if (!newRecord) return;

        const session = supabase.getSessionSync();
        if (!session?.admin?.id) return;

        // 1️⃣ VERIFICAR SI HAY INVALIDACIÓN (contraseña, rol, o eliminación)
        const invalidadaHasta = newRecord.invalidada_hasta
            ? new Date(newRecord.invalidada_hasta)
            : null;

        const fueEliminado = newRecord.eliminado === true;
        const fueInvalidado = invalidadaHasta && invalidadaHasta <= new Date();

        if (fueEliminado) {
            console.warn(JSON.stringify({
                level: 'warn',
                event: 'FORCE_LOGOUT',
                reason: 'ACCOUNT_DELETED',
                timestamp: new Date().toISOString()
            }));
            this.triggerLogout('Tu cuenta ha sido eliminada.', 'ACCOUNT_DELETED');
            return;
        }

        if (fueInvalidado) {
            console.warn(JSON.stringify({
                level: 'warn',
                event: 'FORCE_LOGOUT',
                reason: 'ACCOUNT_INVALIDATED',
                timestamp: new Date().toISOString()
            }));
            this.triggerLogout('Tu sesión fue invalidada por un administrador.', 'ACCOUNT_INVALIDATED');
            return;
        }

        // 2️⃣ REFRESCAR UI SI CAMBIÓ NOMBRE O ROL
        if (newRecord.nombre !== session.admin.nombre || newRecord.rol !== session.admin.rol) {
            console.log('🔄 Actualizando sesión por cambio de perfil');
            if (typeof supabase.actualizarSesionDesdePerfil === 'function') {
                supabase.actualizarSesionDesdePerfil(newRecord);
            }
        }
    },

    triggerLogout(message, reason) {
        if (this.channel) {
            this.channel.unsubscribe();
            this.channel = null;
        }
        this.initialized = false;
        window.__realtimeInitialized = false;

        if (typeof supabase.logoutForzado === 'function') {
            supabase.logoutForzado(reason);
        } else {
            UI.showToast(message, 'error', 6000);
            setTimeout(() => {
                const keysToRemove = Object.keys(localStorage).filter(k =>
                    k.startsWith('sb-') || k.includes('supabase')
                );
                keysToRemove.forEach(k => localStorage.removeItem(k));
                window.location.replace('/?session=invalidated');
            }, 2500);
        }
    },

    cleanup() {
        if (this.channel) {
            this.channel.unsubscribe();
            this.channel = null;
        }
        this.initialized = false;
        window.__realtimeInitialized = false;
        console.log('🧹 Realtime limpiado');
    }
};

window.Realtime = Realtime;
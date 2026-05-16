/**
 * ============================================
 * UI - Renderizado de Interfaz
 * ============================================
 * Funciones para actualizar el DOM y mostrar datos
 */

const UI = {
    // ==================== ACTUALIZAR ESTADO DE CONEXIÓN ====================
    
    setConnectionStatus(estado, mensaje) {
        const statusEl = document.getElementById('connection-status');
        const dot = statusEl?.querySelector('.status-dot');
        const text = statusEl?.querySelector('.status-text');
        
        if (dot && text) {
            dot.className = `status-dot ${estado}`;
            text.textContent = mensaje;
        }
    },

    // ==================== TOAST NOTIFICATIONS ====================
    
    showToast(mensaje, tipo = 'info', duracion = 4000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${tipo}`;
        toast.innerHTML = `
            <span class="toast-message">${mensaje}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duracion);
    },

    // ==================== DASHBOARD ====================
    
    async actualizarDashboard() {
        try {
            this.setConnectionStatus('', 'Cargando...');
            
            const stats = await supabase.getDashboardStats();
            
            const elConglomerados = document.getElementById('stat-conglomerados');
            const elBrigadas = document.getElementById('stat-brigadas');
            const elMuestras = document.getElementById('stat-muestras');
            const elAmenazadas = document.getElementById('stat-amenazadas');
            
            if (elConglomerados) elConglomerados.textContent = Services.formatearNumero(stats.conglomerados);
            if (elBrigadas) elBrigadas.textContent = Services.formatearNumero(stats.brigadas);
            if (elMuestras) elMuestras.textContent = Services.formatearNumero(stats.muestras);
            if (elAmenazadas) elAmenazadas.textContent = Services.formatearNumero(stats.amenazadas);

            // Distribución por región
            const distribucion = await supabase.getDistribucionPorRegion();
            this.renderizarGraficoRegiones(distribucion);

            // Últimas inspecciones
            const inspecciones = await supabase.getInspecciones();
            this.renderizarUltimasInspecciones(inspecciones?.slice(0, 5) || []);

            this.setConnectionStatus('connected', 'Conectado');
        } catch (error) {
            console.error('Error actualizando dashboard:', error);
            
            if (error.message === 'SESION_EXPIRADA') {
                this.setConnectionStatus('error', 'Sesión expirada');
                UI.showToast('Tu sesión ha expirado. Por favor, logueate de nuevo.', 'error');
                this.abrirLogin();
                this.actualizarUIAuth(null);
            } else {
                this.setConnectionStatus('error', 'Error de conexión');
                UI.showToast('Error al cargar datos del dashboard', 'error');
            }
        }
    },

    renderizarGraficoRegiones(distribucion) {
        const container = document.getElementById('chart-regiones');
        if (!container) return;

        const total = Object.values(distribucion).reduce((a, b) => a + b, 0) || 1;
        
        let html = '';
        
        Object.entries(distribucion).forEach(([region, count]) => {
            const porcentaje = Math.round((count / total) * 100);
            html += `
                <div class="chart-bar">
                    <span class="chart-label">${Services.formatearRegion(region)}</span>
                    <div class="chart-bar-container">
                        <div class="chart-bar-fill" style="width: ${porcentaje}%"></div>
                    </div>
                    <span class="chart-value">${count}</span>
                </div>
            `;
        });

        if (Object.keys(distribucion).length === 0) {
            html = '<p class="text-muted">No hay datos suficientes</p>';
        }

        container.innerHTML = html;
    },

    renderizarUltimasInspecciones(inspecciones) {
        const tbody = document.getElementById('tabla-inspecciones');
        if (!tbody) return;

        if (inspecciones.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-muted">No hay inspecciones registradas</td></tr>';
            return;
        }

        tbody.innerHTML = inspecciones.map(ins => `
            <tr>
                <td>${Services.formatearFecha(ins.fecha)}</td>
                <td>${ins.conglomerado?.codigo || ins.id_conglomerado || '-'}</td>
                <td>${ins.conglomerado?.region || '-'}</td>
                <td><span class="${ins.estado === 'COMPLETADO' ? 'text-success' : 'text-warning'}">${ins.estado || 'Pendiente'}</span></td>
            </tr>
        `).join('');
    },

    // ==================== REGISTRAR ====================
    
    async cargarSelects() {
        try {
            // Cargar conglomerados
            const conglomerados = await supabase.getConglomerados();
            const selectCg = document.getElementById('br-conglomerado');
            const selectInsCg = document.getElementById('ins-conglomerado');
            
            const optionsCg = conglomerados?.map(cg => 
                `<option value="${cg.id}">${cg.codigo} - ${cg.departamento}</option>`
            ).join('') || '';
            
            if (selectCg) selectCg.innerHTML = '<option value="">Seleccionar...</option>' + optionsCg;
            if (selectInsCg) selectInsCg.innerHTML = '<option value="">Seleccionar...</option>' + optionsCg;

            // Cargar brigadas
            const brigadas = await supabase.getBrigadas();
            const selectBrMu = document.getElementById('mu-brigada');
            const selectBrCt = document.getElementById('ct-brigada');
            const selectBrIns = document.getElementById('ins-brigada');
            
            const optionsBr = brigadas?.map(br => 
                `<option value="${br.id}">${br.nombre_lider} - ${br.region}</option>`
            ).join('') || '';
            
            if (selectBrMu) selectBrMu.innerHTML = '<option value="">Seleccionar...</option>' + optionsBr;
            if (selectBrCt) selectBrCt.innerHTML = '<option value="">Seleccionar...</option>' + optionsBr;
            if (selectBrIns) selectBrIns.innerHTML = '<option value="">Seleccionar...</option>' + optionsBr;

        } catch (error) {
            console.error('Error cargando selects:', error);
            UI.showToast('Error al cargar opciones', 'error');
        }
    },

    mostrarFormulario(formulario) {
        document.querySelectorAll('.form-container').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.registrar-option').forEach(el => el.classList.remove('active'));
        
        const formEl = document.getElementById(`form-${formulario}`);
        if (formEl) {
            formEl.classList.remove('hidden');
            formEl.style.display = 'block';
        }
    },

    // ==================== CONSULTAR ====================
    
    limpiarFiltros() {
        document.getElementById('filter-id').value = '';
        document.getElementById('filter-region').value = '';
        document.getElementById('filter-departamento').value = '';
        document.getElementById('filter-uso').value = '';
        document.getElementById('filter-fecha-inicio').value = '';
        document.getElementById('filter-fecha-fin').value = '';
    },

    async buscar(filtros) {
        try {
            const tipo = document.getElementById('filter-tipo')?.value || 'inspeccion';
            const resultados = await supabase.buscar(tipo, filtros);
            
            this.renderizarResultados(resultados, tipo);
            return resultados;
        } catch (error) {
            console.error('Error en búsqueda:', error);
            UI.showToast('Error al realizar la búsqueda', 'error');
            return [];
        }
    },

    renderizarResultados(resultados, tipo) {
        const tbody = document.getElementById('tbody-resultados');
        const countEl = document.getElementById('result-count');
        
        if (!tbody || !countEl) return;

        countEl.textContent = `${resultados.length} resultados`;

        if (resultados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-muted">No se encontraron resultados</td></tr>';
            return;
        }

        switch (tipo) {
            case 'inspeccion':
                tbody.innerHTML = resultados.map(ins => `
                    <tr>
                        <td>${ins.id?.substring(0, 8) || '-'}</td>
                        <td>${Services.formatearFecha(ins.fecha)}</td>
                        <td>${ins.conglomerado?.codigo || '-'}</td>
                        <td>${ins.brigada?.nombre_lider || '-'}</td>
                        <td>${ins.conglomerado?.region || '-'}</td>
                        <td>${ins.conglomerado?.departamento || '-'}</td>
                        <td>
                            <button class="btn btn-secondary btn-action" data-id="${ins.id}" data-tipo="inspeccion">Ver</button>
                        </td>
                    </tr>
                `).join('');
                break;
            case 'conglomerado':
                tbody.innerHTML = resultados.map(cg => `
                    <tr>
                        <td>${cg.id?.substring(0, 8) || '-'}</td>
                        <td>${cg.codigo || '-'}</td>
                        <td>${cg.departamento || '-'}</td>
                        <td>${cg.municipio || '-'}</td>
                        <td>${cg.region || '-'}</td>
                        <td>${cg.estado || '-'}</td>
                        <td>
                            <button class="btn btn-secondary btn-action" data-id="${cg.id}" data-tipo="conglomerado">Ver</button>
                        </td>
                    </tr>
                `).join('');
                break;
            case 'brigada':
                tbody.innerHTML = resultados.map(br => `
                    <tr>
                        <td>${br.id?.substring(0, 8) || '-'}</td>
                        <td>${br.nombre_lider || '-'}</td>
                        <td>${br.integrantes?.join(', ') || '-'}</td>
                        <td>${br.region || '-'}</td>
                        <td>${Services.formatearFecha(br.fecha_inicio) || '-'}</td>
                        <td>${br.conglomerado?.codigo || '-'}</td>
                        <td>
                            <button class="btn btn-secondary btn-action" data-id="${br.id}" data-tipo="brigada">Ver</button>
                        </td>
                    </tr>
                `).join('');
                break;
            case 'muestra':
                tbody.innerHTML = resultados.map(mu => `
                    <tr>
                        <td>${mu.id?.substring(0, 8) || '-'}</td>
                        <td>${mu.nombre_comun || '-'}</td>
                        <td>${mu.nombre_cientifico || '-'}</td>
                        <td>${mu.tipo_arbol || '-'}</td>
                        <td>${mu.uso || '-'}</td>
                        <td>${mu.codigo || '-'}</td>
                        <td>
                            <button class="btn btn-secondary btn-action" data-id="${mu.id}" data-tipo="muestra">Ver</button>
                        </td>
                    </tr>
                `).join('');
                break;
            default:
                tbody.innerHTML = resultados.map(item => `
                    <tr>
                        <td>${item.id?.substring(0, 8) || '-'}</td>
                        <td colspan="5">Ver detalles</td>
                        <td>
                            <button class="btn btn-secondary btn-action" data-id="${item.id}" data-tipo="${tipo}">Ver</button>
                        </td>
                    </tr>
                `).join('');
        }
        
        // Agregar event listeners a los botones de Ver
        tbody.querySelectorAll('.btn-action[data-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const tipoBtn = btn.dataset.tipo;
                UI.mostrarDetalle(id, tipoBtn);
            });
        });
    },

    async mostrarDetalle(id, tipo = 'inspeccion') {
        try {
            const modal = document.getElementById('modal-detalle');
            const body = document.getElementById('modal-body');
            
            if (!modal || !body) return;

            body.innerHTML = '<p class="text-muted">Cargando...</p>';
            modal.classList.remove('hidden');

            let detalle = null;

            switch (tipo) {
                case 'inspeccion':
                    detalle = await supabase.getDetalleInspeccion(id);
                    if (detalle) {
                        body.innerHTML = this.renderDetalleInspeccion(detalle);
                    } else {
                        body.innerHTML = '<p class="text-danger">No se encontró la inspección</p>';
                    }
                    break;
                case 'conglomerado':
                    detalle = await supabase.getDetalleConglomerado(id);
                    if (detalle) {
                        body.innerHTML = this.renderDetalleConglomerado(detalle);
                    } else {
                        body.innerHTML = '<p class="text-danger">No se encontró el conglomerado</p>';
                    }
                    break;
                case 'brigada':
                    detalle = await supabase.getDetalleBrigada(id);
                    if (detalle) {
                        body.innerHTML = this.renderDetalleBrigada(detalle);
                    } else {
                        body.innerHTML = '<p class="text-danger">No se encontró la brigada</p>';
                    }
                    break;
                case 'muestra':
                    detalle = await supabase.getDetalleMuestra(id);
                    if (detalle) {
                        body.innerHTML = this.renderDetalleMuestra(detalle);
                    } else {
                        body.innerHTML = '<p class="text-danger">No se encontró la muestra</p>';
                    }
                    break;
                default:
                    body.innerHTML = '<p class="text-muted">Tipo de detalle no disponible</p>';
            }
        } catch (error) {
            console.error('Error mostrando detalle:', error);
            UI.showToast('Error al cargar detalles', 'error');
        }
    },

    renderDetalleInspeccion(detalle) {
        const { inspeccion, conglomerado, brigada, muestras, conteos } = detalle;
        
        return `
            <div class="detalle-grid">
                <div class="detalle-section">
                    <h4>Inspección</h4>
                    <p><strong>ID:</strong> ${inspeccion.id}</p>
                    <p><strong>Fecha:</strong> ${Services.formatearFecha(inspeccion.fecha)}</p>
                    <p><strong>Clima:</strong> ${inspeccion.clima}</p>
                    <p><strong>Duración:</strong> ${inspeccion.duracion_horas} horas</p>
                    <p><strong>Observaciones:</strong> ${inspeccion.observaciones || 'Sin observaciones'}</p>
                </div>
                
                <div class="detalle-section">
                    <h4>Conglomerado</h4>
                    <p><strong>Código:</strong> ${conglomerado?.codigo || '-'}</p>
                    <p><strong>Ubicación:</strong> ${conglomerado?.departamento || '-'}, ${conglomerado?.municipio || '-'}</p>
                    <p><strong>Región:</strong> ${conglomerado?.region || '-'}</p>
                    <p><strong>Estado:</strong> ${conglomerado?.estado || '-'}</p>
                    <p><strong>Coordenadas:</strong> ${conglomerado?.latitud || '-'}, ${conglomerado?.longitud || '-'}</p>
                </div>
                
                <div class="detalle-section">
                    <h4>Brigada</h4>
                    <p><strong>Líder:</strong> ${brigada?.nombre_lider || '-'}</p>
                    <p><strong>Integrantes:</strong> ${brigada?.integrantes?.join(', ') || '-'}</p>
                    <p><strong>Período:</strong> ${Services.formatearFecha(brigada?.fecha_inicio)} - ${Services.formatearFecha(brigada?.fecha_fin)}</p>
                </div>
                
                <div class="detalle-section">
                    <h4>Conteos DAP</h4>
                    ${conteos?.length > 0 ? conteos.map(c => `
                        <p><strong>Subparcela ${c.subparcela}:</strong> ${c.brinzales} brinzales, ${c.latizales} latizales, ${c.fustales} fustales</p>
                    `).join('') : '<p class="text-muted">Sin conteos registrados</p>'}
                </div>
                
                <div class="detalle-section">
                    <h4>Muestras (${muestras?.length || 0})</h4>
                    ${muestras?.length > 0 ? `
                        <table class="data-table" style="font-size: 0.85rem;">
                            <thead>
                                <tr>
                                    <th>Nombre Común</th>
                                    <th>Tipo</th>
                                    <th>Uso</th>
                                    <th>Código</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${muestras.map(m => `
                                    <tr>
                                        <td>${m.nombre_comun}</td>
                                        <td>${m.tipo_arbol}</td>
                                        <td>${m.uso}</td>
                                        <td>${m.codigo}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p class="text-muted">Sin muestras registradas</p>'}
                </div>
            </div>
        `;
    },

    renderDetalleConglomerado(detalle) {
        const { conglomerado, brigadas, inspecciones } = detalle;
        
        return `
            <div class="detalle-grid">
                <div class="detalle-section">
                    <h4>Conglomerado</h4>
                    <p><strong>ID:</strong> ${conglomerado.id}</p>
                    <p><strong>Código:</strong> ${conglomerado.codigo}</p>
                    <p><strong>Ubicación:</strong> ${conglomerado.departamento}, ${conglomerado.municipio}</p>
                    <p><strong>Región:</strong> ${conglomerado.region}</p>
                    <p><strong>Estado:</strong> ${conglomerado.estado}</p>
                    <p><strong>Coordenadas:</strong> ${conglomerado.latitud}, ${conglomerado.longitud}</p>
                    <p><strong>Fecha de Asignación:</strong> ${Services.formatearFecha(conglomerado.fecha_asignacion)}</p>
                </div>
                
                <div class="detalle-section">
                    <h4>Brigadas (${brigadas?.length || 0})</h4>
                    ${brigadas?.length > 0 ? brigadas.map(br => `
                        <p><strong>Líder:</strong> ${br.nombre_lider}</p>
                        <p><strong>Integrantes:</strong> ${br.integrantes?.join(', ') || '-'}</p>
                        <p><strong>Período:</strong> ${Services.formatearFecha(br.fecha_inicio)} - ${Services.formatearFecha(br.fecha_fin) || 'En curso'}</p>
                        <hr style="border-color: var(--border-color); margin: 8px 0;">
                    `).join('') : '<p class="text-muted">Sin brigadas asignadas</p>'}
                </div>
                
                <div class="detalle-section">
                    <h4>Inspecciones (${inspecciones?.length || 0})</h4>
                    ${inspecciones?.length > 0 ? `
                        <table class="data-table" style="font-size: 0.85rem;">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Clima</th>
                                    <th>Duración</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${inspecciones.map(ins => `
                                    <tr>
                                        <td>${Services.formatearFecha(ins.fecha)}</td>
                                        <td>${ins.clima}</td>
                                        <td>${ins.duracion_horas}h</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p class="text-muted">Sin inspecciones registradas</p>'}
                </div>
            </div>
        `;
    },

    renderDetalleBrigada(detalle) {
        const { brigada, conglomerado, muestras, conteos } = detalle;
        
        return `
            <div class="detalle-grid">
                <div class="detalle-section">
                    <h4>Brigada</h4>
                    <p><strong>ID:</strong> ${brigada.id}</p>
                    <p><strong>Líder:</strong> ${brigada.nombre_lider}</p>
                    <p><strong>Integrantes:</strong> ${brigada.integrantes?.join(', ') || '-'}</p>
                    <p><strong>Región:</strong> ${brigada.region}</p>
                    <p><strong>Período:</strong> ${Services.formatearFecha(brigada.fecha_inicio)} - ${Services.formatearFecha(brigada.fecha_fin) || 'En curso'}</p>
                </div>
                
                <div class="detalle-section">
                    <h4>Conglomerado Asignado</h4>
                    ${conglomerado ? `
                        <p><strong>Código:</strong> ${conglomerado.codigo}</p>
                        <p><strong>Ubicación:</strong> ${conglomerado.departamento}, ${conglomerado.municipio}</p>
                        <p><strong>Región:</strong> ${conglomerado.region}</p>
                        <p><strong>Estado:</strong> ${conglomerado.estado}</p>
                    ` : '<p class="text-muted">Sin conglomerado asignado</p>'}
                </div>
                
                <div class="detalle-section">
                    <h4>Muestras (${muestras?.length || 0})</h4>
                    ${muestras?.length > 0 ? `
                        <table class="data-table" style="font-size: 0.85rem;">
                            <thead>
                                <tr>
                                    <th>Nombre Común</th>
                                    <th>Tipo</th>
                                    <th>Uso</th>
                                    <th>Código</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${muestras.map(m => `
                                    <tr>
                                        <td>${m.nombre_comun}</td>
                                        <td>${m.tipo_arbol}</td>
                                        <td>${m.uso}</td>
                                        <td>${m.codigo}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p class="text-muted">Sin muestras registradas</p>'}
                </div>
                
                <div class="detalle-section">
                    <h4>Conteos DAP</h4>
                    ${conteos?.length > 0 ? conteos.map(c => `
                        <p><strong>Subparcela ${c.subparcela}:</strong> ${c.brinzales} brinzales, ${c.latizales} latizales, ${c.fustales} fustales</p>
                    `).join('') : '<p class="text-muted">Sin conteos registrados</p>'}
                </div>
            </div>
        `;
    },

    renderDetalleMuestra(detalle) {
        const { muestra, brigada, conglomerado } = detalle;
        
        return `
            <div class="detalle-grid">
                <div class="detalle-section">
                    <h4>Muestra Vegetal</h4>
                    <p><strong>ID:</strong> ${muestra.id}</p>
                    <p><strong>Nombre Común:</strong> ${muestra.nombre_comun}</p>
                    <p><strong>Nombre Científico:</strong> ${muestra.nombre_cientifico || 'Por identificar'}</p>
                    <p><strong>Familia Botánica:</strong> ${muestra.familia || 'Por identificar'}</p>
                    <p><strong>Tipo de Árbol:</strong> ${muestra.tipo_arbol}</p>
                    <p><strong>Uso:</strong> ${muestra.uso}</p>
                    <p><strong>Código:</strong> ${muestra.codigo}</p>
                    <p><strong>Estado:</strong> ${muestra.estado_clasificacion}</p>
                </div>
                
                <div class="detalle-section">
                    <h4>Brigada</h4>
                    ${brigada ? `
                        <p><strong>Líder:</strong> ${brigada.nombre_lider}</p>
                        <p><strong>Integrantes:</strong> ${brigada.integrantes?.join(', ') || '-'}</p>
                        <p><strong>Región:</strong> ${brigada.region}</p>
                    ` : '<p class="text-muted">Sin brigada asignada</p>'}
                </div>
                
                <div class="detalle-section">
                    <h4>Conglomerado</h4>
                    ${conglomerado ? `
                        <p><strong>Código:</strong> ${conglomerado.codigo}</p>
                        <p><strong>Ubicación:</strong> ${conglomerado.departamento}, ${conglomerado.municipio}</p>
                        <p><strong>Región:</strong> ${conglomerado.region}</p>
                    ` : '<p class="text-muted">Sin conglomerado relacionado</p>'}
                </div>
            </div>
        `;
    },

    cerrarModal() {
        const modal = document.getElementById('modal-detalle');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    // ==================== EXPORTAR ====================
    
    async generarVistaPrevia() {
        try {
            const tipo = document.getElementById('export-tipo')?.value || 'todos';
            const region = document.getElementById('export-region')?.value;
            
            let datos;
            if (tipo === 'todos') {
                datos = await supabase.getTodosLosDatos();
            } else {
                switch (tipo) {
                    case 'conglomerados':
                        datos = await supabase.getConglomerados();
                        break;
                    case 'brigadas':
                        datos = await supabase.getBrigadas();
                        break;
                    case 'muestras':
                        datos = await supabase.getMuestras();
                        break;
                    case 'inspecciones':
                        datos = await supabase.getInspecciones();
                        break;
                    default:
                        datos = [];
                }
                datos = datos || [];
            }

            if (region && tipo !== 'todos') {
                datos = datos.filter(d => d.region === region);
            }

            const csv = Services.generarCSV(datos, tipo);
            document.getElementById('export-preview-text').textContent = csv.substring(0, 2000) + (csv.length > 2000 ? '\n...(continúa)' : '');
        } catch (error) {
            console.error('Error generando preview:', error);
            UI.showToast('Error al generar vista previa', 'error');
        }
    },

    filtrarPorRegion(datos, region, tipo) {
        const filtrado = {};
        
        if (tipo === 'todos' || tipo === 'conglomerados') {
            filtrado.conglomerados = datos.conglomerados?.filter(c => c.region === region) || [];
        }
        if (tipo === 'todos' || tipo === 'brigadas') {
            filtrado.brigadas = datos.brigadas?.filter(b => b.region === region) || [];
        }
        if (tipo === 'todos' || tipo === 'muestras') {
            filtrado.muestras = datos.muestras || [];
        }
        if (tipo === 'todos' || tipo === 'inspecciones') {
            filtrado.inspecciones = datos.inspecciones || [];
        }
        
        return filtrado;
    },

    async exportar() {
        try {
            const tipo = document.getElementById('export-tipo')?.value || 'todos';
            const region = document.getElementById('export-region')?.value;
            const formato = document.getElementById('export-formato')?.value || 'csv';
            
            let datos;
            if (tipo === 'todos') {
                datos = await supabase.getTodosLosDatos();
            } else {
                switch (tipo) {
                    case 'conglomerados':
                        datos = await supabase.getConglomerados();
                        break;
                    case 'brigadas':
                        datos = await supabase.getBrigadas();
                        break;
                    case 'muestras':
                        datos = await supabase.getMuestras();
                        break;
                    case 'inspecciones':
                        datos = await supabase.getInspecciones();
                        break;
                    default:
                        datos = [];
                }
                datos = datos || [];
            }

            if (region && tipo !== 'todos') {
                datos = datos.filter(d => d.region === region);
            }

            const fecha = new Date().toISOString().split('T')[0];
            
            if (formato === 'csv') {
                const csv = Services.generarCSV(datos, tipo);
                Services.descargarArchivo(csv, `ifn_${tipo}_${fecha}.csv`);
            } else {
                const json = JSON.stringify(datos, null, 2);
                Services.descargarArchivo(json, `ifn_${tipo}_${fecha}.json`, 'application/json');
            }

            UI.showToast('Archivo exportado correctamente', 'success');
        } catch (error) {
            console.error('Error exportando:', error);
            UI.showToast('Error al exportar', 'error');
        }
    },

    // ==================== AUTH - INTERFAZ DE LOGIN ====================
    initAuth() {
        console.log('🔐 Inicializando Auth UI...');
        
        const modalLogin = document.getElementById('modal-login');
        const btnAdminHeader = document.getElementById('btn-admin-header');
        const btnLoginCerrar = document.getElementById('modal-login-cerrar');
        const formLogin = document.getElementById('form-login');
        const loginError = document.getElementById('login-error');

        if (!modalLogin || !btnAdminHeader) {
            console.warn('⚠️ Elementos de auth no encontrados');
            return;
        }

        // Click en botón Admin del header
        btnAdminHeader.addEventListener('click', (e) => {
            e.preventDefault();
            if (supabase.isLoggedInSync()) {
                Router.navigate('/admin');
            } else {
                this.abrirLogin();
            }
        });

        // Botón de logout
        const btnLogout = document.getElementById('btn-logout-header');
        btnLogout?.addEventListener('click', () => {
            this.logout();
        });

        // Cerrar modal login
        btnLoginCerrar?.addEventListener('click', () => {
            this.cerrarLogin();
        });

        modalLogin.querySelector('.modal-overlay')?.addEventListener('click', () => {
            this.cerrarLogin();
        });

        // Submit login
        formLogin?.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.classList.add('hidden');
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            try {
                const session = await supabase.login(email, password);
                this.cerrarLogin();
                this.actualizarUIAuth(session);
                UI.showToast(`Bienvenido, ${session.admin.nombre}`, 'success');
                Router.navigate('/admin');
            } catch (error) {
                loginError.textContent = error.message;
                loginError.classList.remove('hidden');
            }
        });

        // Verificar sesión existente
        const session = supabase.getSessionSync();
        if (session) {
            this.actualizarUIAuth(session);
        }

        console.log('✅ Auth inicializado correctamente');
    },

    abrirLogin() {
        const modal = document.getElementById('modal-login');
        if (modal) {
            modal.classList.remove('hidden');
            document.getElementById('login-email')?.focus();
        }
    },

    cerrarLogin() {
        document.getElementById('modal-login')?.classList.add('hidden');
        document.getElementById('form-login')?.reset();
        document.getElementById('login-error')?.classList.add('hidden');
    },

    actualizarUIAuth(session) {
        const btnAdmin = document.getElementById('btn-admin-header');
        const btnLogout = document.getElementById('btn-logout-header');
        
        if (session && session.admin) {
            if (btnAdmin) {
                btnAdmin.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>${session.admin.nombre || 'Usuario'}</span>
                `;
                btnAdmin.onclick = null;
                btnAdmin.addEventListener('click', (e) => {
                    e.preventDefault();
                    Router.navigate('/admin');
                });
            }
            
            if (btnLogout) {
                btnLogout.classList.remove('hidden');
            }
        } else {
            // Sin sesión: mostrar botón de login, no modal
            if (btnAdmin) {
                btnAdmin.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    <span>Login</span>
                `;
                btnAdmin.onclick = null;
                btnAdmin.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.abrirLogin();
                });
            }
            
            if (btnLogout) {
                btnLogout.classList.add('hidden');
            }
        }
    },

logout() {
        supabase.logout();
        this.actualizarUIAuth(null);
        this.cerrarLogin();
        // Siempre redirigir al dashboard
        window.location.href = '/';
    }
};

// Exportar para uso global
window.UI = UI;

// Función global para debug
window.abrirLoginDebug = function() {
    UI.abrirLogin();
};

window.debugAuth = function() {
    console.log('=== DEBUG AUTH ===');
    console.log('Botón Admin:', document.getElementById('btn-admin-header'));
    console.log('Modal Login:', document.getElementById('modal-login'));
    console.log('Sesión:', supabase.getSessionSync());
};

// Cerrar modal al hacer click en overlay
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        UI.cerrarModal();
    }
});

document.getElementById('modal-close')?.addEventListener('click', () => {
    UI.cerrarModal();
});

// ==================== ADMIN ====================

const Admin = {
    tablaActual: 'conglomerados',
    datosActuales: [],

    async init() {
        const tabs = document.querySelectorAll('.admin-tab');
        const toolbar = document.getElementById('btn-admin-refresh');
        const search = document.getElementById('admin-search');
        
        if (tabs.length === 0) return;

        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', async () => {
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.tablaActual = tab.dataset.tab;
                await this.cargarTabla();
            });
        });

        if (supabase.isSupremo()) {
            document.querySelector('.admin-tab-supremo')?.style.removeProperty('display');
            document.getElementById('btn-admin-nuevo')?.style.removeProperty('display');
        }

        document.getElementById('btn-admin-nuevo')?.addEventListener('click', async () => {
            if (this.tablaActual === 'admins') {
                await this.mostrarFormularioAdmin();
            }
        });

        document.getElementById('btn-admin-refresh')?.addEventListener('click', () => {
            this.cargarTabla();
        });

        document.getElementById('admin-search')?.addEventListener('input', (e) => {
            this.filtrar(e.target.value);
        });

        document.getElementById('modal-editar-cerrar')?.addEventListener('click', () => {
            this.cerrarModalEditar();
        });

        document.querySelector('#modal-editar .modal-overlay')?.addEventListener('click', () => {
            this.cerrarModalEditar();
        });

        await this.cargarTabla();
    },

    async cargarTabla() {
        try {
            let datos = [];
            switch (this.tablaActual) {
                case 'conglomerados':
                    datos = await supabase.getConglomerados();
                    break;
                case 'brigadas':
                    datos = await supabase.getBrigadas();
                    break;
                case 'muestras':
                    datos = await supabase.getMuestras();
                    break;
                case 'conteos':
                    datos = await supabase.getConteos();
                    break;
                case 'inspecciones':
                    datos = await supabase.getInspecciones();
                    break;
                case 'admins':
                    if (!supabase.isSupremo()) {
                        UI.showToast('No tienes permisos para gestionar admins', 'error');
                        return;
                    }
                    datos = await supabase.getAdmins();
                    break;
            }
            this.datosActuales = datos || [];
            this.renderizar();
        } catch (error) {
            console.error('Error cargando tabla admin:', error);
            console.error('Error al cargar datos');
        }
    },

    renderizar() {
        const thead = document.getElementById('admin-thead');
        const tbody = document.getElementById('admin-tbody');
        
        if (!thead || !tbody) return;

        thead.innerHTML = this.getHeaders();
        tbody.innerHTML = this.datosActuales.map(item => this.renderFila(item)).join('');
    },

    getHeaders() {
        const headers = {
            conglomerados: '<th>ID</th><th>Código</th><th>Departamento</th><th>Municipio</th><th>Región</th><th>Estado</th><th>Acciones</th>',
            brigadas: '<th>ID</th><th>Líder</th><th>Integrantes</th><th>Región</th><th>Fecha Inicio</th><th>Acciones</th>',
            muestras: '<th>ID</th><th>Nombre Común</th><th>Nombre Científico</th><th>Tipo</th><th>Uso</th><th>Código</th><th>Acciones</th>',
            conteos: '<th>ID</th><th>Brigada ID</th><th>Subparcela</th><th>Brinzales</th><th>Latizales</th><th>Fustales</th><th>Acciones</th>',
            inspecciones: '<th>ID</th><th>Conglomerado</th><th>Brigada</th><th>Fecha</th><th>Clima</th><th>Duración</th><th>Acciones</th>',
            admins: '<th>ID</th><th>Email</th><th>Nombre</th><th>Rol</th><th>Acciones</th>'
        };
        return headers[this.tablaActual] || '';
    },

    renderFila(item) {
        const acciones = `
            <button class="btn btn-secondary btn-action" onclick="Admin.editar('${item.id}')">Editar</button>
            <button class="btn btn-danger btn-action" onclick="Admin.eliminar('${item.id}')">Eliminar</button>
        `;

        switch (this.tablaActual) {
            case 'conglomerados':
                return `<tr>
                    <td>${item.id?.substring(0, 8) || '-'}</td>
                    <td>${item.codigo || '-'}</td>
                    <td>${item.departamento || '-'}</td>
                    <td>${item.municipio || '-'}</td>
                    <td>${item.region || '-'}</td>
                    <td>${item.estado || '-'}</td>
                    <td>${acciones}</td>
                </tr>`;
            case 'brigadas':
                return `<tr>
                    <td>${item.id?.substring(0, 8) || '-'}</td>
                    <td>${item.nombre_lider || '-'}</td>
                    <td>${item.integrantes?.join(', ') || '-'}</td>
                    <td>${item.region || '-'}</td>
                    <td>${item.fecha_inicio || '-'}</td>
                    <td>${acciones}</td>
                </tr>`;
            case 'muestras':
                return `<tr>
                    <td>${item.id?.substring(0, 8) || '-'}</td>
                    <td>${item.nombre_comun || '-'}</td>
                    <td>${item.nombre_cientifico || '-'}</td>
                    <td>${item.tipo_arbol || '-'}</td>
                    <td>${item.uso || '-'}</td>
                    <td>${item.codigo || '-'}</td>
                    <td>${acciones}</td>
                </tr>`;
            case 'conteos':
                return `<tr>
                    <td>${item.id?.substring(0, 8) || '-'}</td>
                    <td>${item.id_brigada?.substring(0, 8) || '-'}</td>
                    <td>${item.subparcela || '-'}</td>
                    <td>${item.brinzales || 0}</td>
                    <td>${item.latizales || 0}</td>
                    <td>${item.fustales || 0}</td>
                    <td>${acciones}</td>
                </tr>`;
            case 'inspecciones':
                return `<tr>
                    <td>${item.id?.substring(0, 8) || '-'}</td>
                    <td>${item.id_conglomerado?.substring(0, 8) || '-'}</td>
                    <td>${item.id_brigada?.substring(0, 8) || '-'}</td>
                    <td>${item.fecha || '-'}</td>
                    <td>${item.clima || '-'}</td>
                    <td>${item.duracion_horas || '-'}</td>
                    <td>${acciones}</td>
                </tr>`;
            case 'admins':
                const isPropio = supabase.getSessionSync()?.admin?.id === item.id;
                const accionesAdmin = isPropio 
                    ? `<span class="text-muted">No puedes eliminarte a ti mismo</span>`
                    : acciones;
                return `<tr>
                    <td>${item.id?.substring(0, 8) || '-'}</td>
                    <td>${item.email || '-'}</td>
                    <td>${item.nombre || '-'}</td>
                    <td><span class="badge ${item.rol === 'supremo' ? 'badge-success' : 'badge-info'}">${item.rol}</span></td>
                    <td>${accionesAdmin}</td>
                </tr>`;
            default:
                return '<tr><td colspan="7">Sin datos</td></tr>';
        }
    },

    filtrar(texto) {
        const textoLower = texto.toLowerCase();
        const datosFiltrados = this.datosActuales.filter(item => {
            return JSON.stringify(item).toLowerCase().includes(textoLower);
        });
        
        const tbody = document.getElementById('admin-tbody');
        if (tbody) {
            tbody.innerHTML = datosFiltrados.map(item => this.renderFila(item)).join('');
        }
    },

    async editar(id) {
        const item = this.datosActuales.find(d => d.id === id);
        if (!item) return;

        const modal = document.getElementById('modal-editar');
        const titulo = document.getElementById('modal-editar-titulo');
        const body = document.getElementById('modal-editar-body');

        titulo.textContent = `Editar ${this.tablaActual}`;
        body.innerHTML = this.generarFormularioEdicion(item);
        
        modal.classList.remove('hidden');

        document.getElementById('btn-guardar-edicion')?.addEventListener('click', () => {
            this.guardarEdicion(id);
        });
    },

    async mostrarFormularioAdmin() {
        if (!supabase.isSupremo()) {
            UI.showToast('No tienes permisos para crear admins', 'error');
            return;
        }

        const modal = document.getElementById('modal-editar');
        const titulo = document.getElementById('modal-editar-titulo');
        const body = document.getElementById('modal-editar-body');

        titulo.textContent = 'Nuevo Admin';
        body.innerHTML = `
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="edit-email" placeholder="email@ejemplo.com">
            </div>
            <div class="form-group">
                <label>Nombre</label>
                <input type="text" id="edit-nombre" placeholder="Nombre completo">
            </div>
            <div class="form-group">
                <label>Contraseña</label>
                <input type="password" id="edit-password" placeholder="••••••••">
            </div>
            <div class="form-group">
                <label>Rol</label>
                <select id="edit-rol">
                    <option value="admin">Admin</option>
                    <option value="supremo">Supremo</option>
                </select>
            </div>
            <div class="form-actions">
                <button class="btn btn-primary" id="btn-guardar-edicion">Crear Admin</button>
            </div>
        `;
        
        modal.classList.remove('hidden');

        document.getElementById('btn-guardar-edicion')?.addEventListener('click', async () => {
            await this.crearAdmin();
        });
    },

    async crearAdmin() {
        try {
            const email = document.getElementById('edit-email')?.value;
            const nombre = document.getElementById('edit-nombre')?.value;
            const password = document.getElementById('edit-password')?.value;
            const rol = document.getElementById('edit-rol')?.value;

            if (!email || !nombre || !password) {
                UI.showToast('Completa todos los campos', 'error');
                return;
            }

            await supabase.createAdmin({ email, nombre, password, rol });
            
            this.cerrarModalEditar();
            UI.showToast('Admin creado correctamente', 'success');
            this.tablaActual = 'admins';
            await this.cargarTabla();
        } catch (error) {
            console.error('Error creando admin:', error);
            UI.showToast('Error al crear admin: ' + error.message, 'error');
        }
    },

    generarFormularioEdicion(item) {
        let campos = '';
        
        switch (this.tablaActual) {
            case 'conglomerados':
                campos = `
                    <div class="form-group">
                        <label>Código</label>
                        <input type="number" id="edit-codigo" value="${item.codigo || ''}">
                    </div>
                    <div class="form-group">
                        <label>Departamento</label>
                        <input type="text" id="edit-departamento" value="${item.departamento || ''}">
                    </div>
                    <div class="form-group">
                        <label>Municipio</label>
                        <input type="text" id="edit-municipio" value="${item.municipio || ''}">
                    </div>
                    <div class="form-group">
                        <label>Región</label>
                        <select id="edit-region">
                            <option value="Andina" ${item.region === 'Andina' ? 'selected' : ''}>Andina</option>
                            <option value="Caribe" ${item.region === 'Caribe' ? 'selected' : ''}>Caribe</option>
                            <option value="Pacífico" ${item.region === 'Pacífico' ? 'selected' : ''}>Pacífico</option>
                            <option value="Amazonía" ${item.region === 'Amazonía' ? 'selected' : ''}>Amazonía</option>
                            <option value="Orinoquía" ${item.region === 'Orinoquía' ? 'selected' : ''}>Orinoquía</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Estado</label>
                        <select id="edit-estado">
                            <option value="PENDIENTE" ${item.estado === 'PENDIENTE' ? 'selected' : ''}>Pendiente</option>
                            <option value="EN_PROGRESO" ${item.estado === 'EN_PROGRESO' ? 'selected' : ''}>En Progreso</option>
                            <option value="COMPLETADO" ${item.estado === 'COMPLETADO' ? 'selected' : ''}>Completado</option>
                        </select>
                    </div>
                `;
                break;
            case 'brigadas':
                campos = `
                    <div class="form-group">
                        <label>Nombre del Líder</label>
                        <input type="text" id="edit-nombre_lider" value="${item.nombre_lider || ''}">
                    </div>
                    <div class="form-group">
                        <label>Integrantes (separados por coma)</label>
                        <input type="text" id="edit-integrantes" value="${item.integrantes?.join(', ') || ''}">
                    </div>
                    <div class="form-group">
                        <label>Región</label>
                        <select id="edit-region">
                            <option value="Andina" ${item.region === 'Andina' ? 'selected' : ''}>Andina</option>
                            <option value="Caribe" ${item.region === 'Caribe' ? 'selected' : ''}>Caribe</option>
                            <option value="Pacífico" ${item.region === 'Pacífico' ? 'selected' : ''}>Pacífico</option>
                            <option value="Amazonía" ${item.region === 'Amazonía' ? 'selected' : ''}>Amazonía</option>
                            <option value="Orinoquía" ${item.region === 'Orinoquía' ? 'selected' : ''}>Orinoquía</option>
                        </select>
                    </div>
                `;
                break;
            case 'muestras':
                campos = `
                    <div class="form-group">
                        <label>Nombre Común</label>
                        <input type="text" id="edit-nombre_comun" value="${item.nombre_comun || ''}">
                    </div>
                    <div class="form-group">
                        <label>Nombre Científico</label>
                        <input type="text" id="edit-nombre_cientifico" value="${item.nombre_cientifico || ''}">
                    </div>
                    <div class="form-group">
                        <label>Familia</label>
                        <input type="text" id="edit-familia" value="${item.familia || ''}">
                    </div>
                    <div class="form-group">
                        <label>Tipo de Árbol</label>
                        <select id="edit-tipo_arbol">
                            <option value="BRINZAL" ${item.tipo_arbol === 'BRINZAL' ? 'selected' : ''}>Brinzal</option>
                            <option value="LATIZAL" ${item.tipo_arbol === 'LATIZAL' ? 'selected' : ''}>Latizal</option>
                            <option value="FUSTAL" ${item.tipo_arbol === 'FUSTAL' ? 'selected' : ''}>Fustal</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Uso</label>
                        <select id="edit-uso">
                            <option value="MADERABLE" ${item.uso === 'MADERABLE' ? 'selected' : ''}>Maderable</option>
                            <option value="MEDICINAL" ${item.uso === 'MEDICINAL' ? 'selected' : ''}>Medicinal</option>
                            <option value="ALIMENTICIO" ${item.uso === 'ALIMENTICIO' ? 'selected' : ''}>Alimenticio</option>
                            <option value="ORNAMENTAL" ${item.uso === 'ORNAMENTAL' ? 'selected' : ''}>Ornamental</option>
                        </select>
                    </div>
                `;
                break;
            case 'conteos':
                campos = `
                    <div class="form-group">
                        <label>Subparcela</label>
                        <input type="number" id="edit-subparcela" value="${item.subparcela || ''}">
                    </div>
                    <div class="form-group">
                        <label>Brinzales</label>
                        <input type="number" id="edit-brinzales" value="${item.brinzales || 0}">
                    </div>
                    <div class="form-group">
                        <label>Latizales</label>
                        <input type="number" id="edit-latizales" value="${item.latizales || 0}">
                    </div>
                    <div class="form-group">
                        <label>Fustales</label>
                        <input type="number" id="edit-fustales" value="${item.fustales || 0}">
                    </div>
                `;
                break;
            case 'inspecciones':
                campos = `
                    <div class="form-group">
                        <label>Fecha</label>
                        <input type="date" id="edit-fecha" value="${item.fecha || ''}">
                    </div>
                    <div class="form-group">
                        <label>Clima</label>
                        <select id="edit-clima">
                            <option value="SOLEADO" ${item.clima === 'SOLEADO' ? 'selected' : ''}>Soleado</option>
                            <option value="NUBLADO" ${item.clima === 'NUBLADO' ? 'selected' : ''}>Nublado</option>
                            <option value="LLUVIOSO" ${item.clima === 'LLUVIOSO' ? 'selected' : ''}>Lluvioso</option>
                            <option value="PARCIAL" ${item.clima === 'PARCIAL' ? 'selected' : ''}>Parcial</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Duración (horas)</label>
                        <input type="number" id="edit-duracion_horas" value="${item.duracion_horas || ''}">
                    </div>
                    <div class="form-group">
                        <label>Observaciones</label>
                        <textarea id="edit-observaciones">${item.observaciones || ''}</textarea>
                    </div>
                `;
                break;
            case 'admins':
                if (!supabase.isSupremo()) {
                    return '<p class="text-error">No tienes permisos para editar admins</p>';
                }
                campos = `
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="edit-email" value="${item.email || ''}">
                    </div>
                    <div class="form-group">
                        <label>Nombre</label>
                        <input type="text" id="edit-nombre" value="${item.nombre || ''}">
                    </div>
                    <div class="form-group">
                        <label>Nueva Contraseña (dejar en blanco para mantener)</label>
                        <input type="password" id="edit-password" placeholder="••••••••">
                    </div>
                    <div class="form-group">
                        <label>Rol</label>
                        <select id="edit-rol">
                            <option value="admin" ${item.rol === 'admin' ? 'selected' : ''}>Admin</option>
                            <option value="supremo" ${item.rol === 'supremo' ? 'selected' : ''}>Supremo</option>
                        </select>
                    </div>
                `;
                break;
        }

        return campos + `
            <div class="form-actions">
                <button class="btn btn-primary" id="btn-guardar-edicion">Guardar Cambios</button>
                <button class="btn btn-secondary" onclick="Admin.cerrarModalEditar()">Cancelar</button>
            </div>
        `;
    },

    async guardarEdicion(id) {
        try {
            const datos = this.recogerDatosFormulario();
            
            let result;
            switch (this.tablaActual) {
                case 'conglomerados':
                    result = await supabase.updateConglomerado(id, datos);
                    break;
                case 'brigadas':
                    if (datos.integrantes && typeof datos.integrantes === 'string') {
                        datos.integrantes = datos.integrantes.split(',').map(s => s.trim()).filter(s => s);
                    }
                    result = await supabase.updateBrigada(id, datos);
                    break;
                case 'muestras':
                    result = await supabase.updateMuestra(id, datos);
                    break;
                case 'conteos':
                    result = await supabase.updateConteo(id, datos);
                    break;
                case 'inspecciones':
                    result = await supabase.updateInspeccion(id, datos);
                    break;
                case 'admins':
                    if (!supabase.isSupremo()) {
                        UI.showToast('No tienes permisos', 'error');
                        return;
                    }
                    result = await supabase.updateAdmin(id, datos);
                    break;
            }

            this.cerrarModalEditar();
            UI.showToast('Registro actualizado correctamente', 'success');
            await this.cargarTabla();
        } catch (error) {
            console.error('Error guardando:', error);
            UI.showToast('Error al guardar: ' + error.message, 'error');
        }
    },

    recogerDatosFormulario() {
        const datos = {};
        
        switch (this.tablaActual) {
            case 'conglomerados':
                datos.codigo = parseInt(document.getElementById('edit-codigo')?.value);
                datos.departamento = document.getElementById('edit-departamento')?.value;
                datos.municipio = document.getElementById('edit-municipio')?.value;
                datos.region = document.getElementById('edit-region')?.value;
                datos.estado = document.getElementById('edit-estado')?.value;
                break;
            case 'brigadas':
                datos.nombre_lider = document.getElementById('edit-nombre_lider')?.value;
                datos.integrantes = document.getElementById('edit-integrantes')?.value;
                datos.region = document.getElementById('edit-region')?.value;
                break;
            case 'muestras':
                datos.nombre_comun = document.getElementById('edit-nombre_comun')?.value;
                datos.nombre_cientifico = document.getElementById('edit-nombre_cientifico')?.value;
                datos.familia = document.getElementById('edit-familia')?.value;
                datos.tipo_arbol = document.getElementById('edit-tipo_arbol')?.value;
                datos.uso = document.getElementById('edit-uso')?.value;
                break;
            case 'conteos':
                datos.subparcela = parseInt(document.getElementById('edit-subparcela')?.value);
                datos.brinzales = parseInt(document.getElementById('edit-brinzales')?.value) || 0;
                datos.latizales = parseInt(document.getElementById('edit-latizales')?.value) || 0;
                datos.fustales = parseInt(document.getElementById('edit-fustales')?.value) || 0;
                break;
            case 'inspecciones':
                datos.fecha = document.getElementById('edit-fecha')?.value;
                datos.clima = document.getElementById('edit-clima')?.value;
                datos.duracion_horas = parseInt(document.getElementById('edit-duracion_horas')?.value);
                datos.observaciones = document.getElementById('edit-observaciones')?.value;
                break;
            case 'admins':
                datos.email = document.getElementById('edit-email')?.value;
                datos.nombre = document.getElementById('edit-nombre')?.value;
                datos.rol = document.getElementById('edit-rol')?.value;
                const password = document.getElementById('edit-password')?.value;
                if (password) datos.password = password;
                break;
        }
        
        return datos;
    },

    async eliminar(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            let result;
            switch (this.tablaActual) {
                case 'conglomerados':
                    result = await supabase.deleteConglomerado(id);
                    break;
                case 'brigadas':
                    result = await supabase.deleteBrigada(id);
                    break;
                case 'muestras':
                    result = await supabase.deleteMuestra(id);
                    break;
                case 'conteos':
                    result = await supabase.deleteConteo(id);
                    break;
                case 'inspecciones':
                    result = await supabase.deleteInspeccion(id);
                    break;
                case 'admins':
                    if (!supabase.isSupremo()) {
                        UI.showToast('No tienes permisos', 'error');
                        return;
                    }
                    result = await supabase.deleteAdmin(id);
                    break;
            }

            UI.showToast('Registro eliminado correctamente', 'success');
            await this.cargarTabla();
        } catch (error) {
            console.error('Error al eliminar:', error.message);
        }
    },

    cerrarModalEditar() {
        document.getElementById('modal-editar')?.classList.add('hidden');
    }
};

// Exportar Admin
window.Admin = Admin;
/**
 * =========================================================
 * HOME.JS - LÓGICA PRINCIPAL DEL RENDERER (VERSIÓN LIMPIA)
 * =========================================================
 *
 * Contiene la inicialización del entorno (reloj, modales globales)
 * y la lógica principal del sistema de TABS de Venta.
 */

// =========================================================
// I. UTILIDADES GLOBALES (RELOJ)
// =========================================================

/**
 * Actualiza el elemento del reloj con la hora y fecha actuales.
 */
function updateClock() {
    const clockElement = document.getElementById('clock');
    if (!clockElement) return;

    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const dateOptions = { weekday: 'short', day: '2-digit', month: 'short' };
    const timeString = now.toLocaleTimeString('es-ES', timeOptions);
    const dateString = now.toLocaleDateString('es-ES', dateOptions);

    clockElement.textContent = `${dateString} | ${timeString}`;
}

// Inicialización y loop del reloj
updateClock();
setInterval(updateClock, 1000);

// ---------------------------------------------------------

// =========================================================
// II. FUNCIONES DE CARGA DINÁMICA DE MÓDULOS (MODALES)
// =========================================================

/**
 * Carga un módulo (HTML, CSS, y JS) diseñado para ser una ventana flotante (Modal).
 * Inyecta el HTML en #modal-container y usa Bootstrap para mostrarlo.
 *
 * @param {string} moduleName - Nombre del módulo (e.g., 'profile').
 */
function loadModalModule(moduleName) {
    const modalContainer = document.getElementById('modal-container');
    const moduleBaseDir = `../${moduleName}/`; 
    const scriptId = `js-${moduleName}`;

    // Paso 1: Cargar CSS dinámicamente
    const cssPath = `${moduleBaseDir}${moduleName}.css`;
    let styleLink = document.getElementById(`css-${moduleName}`);

    if (!styleLink) {
        styleLink = document.createElement('link');
        styleLink.id = `css-${moduleName}`;
        styleLink.rel = 'stylesheet';
        styleLink.href = cssPath;
        document.head.appendChild(styleLink);
    }

    // Paso 2: Cargar el HTML
    fetch(`${moduleBaseDir}${moduleName}.html`)
        .then(response => {
            if (!response.ok) {
                console.error(`Error 404: No se encontró el HTML del módulo '${moduleName}'. Ruta: ${response.url}`);
                throw new Error(`Módulo modal no encontrado.`);
            }
            return response.text();
        })
        .then(html => {
            // Limpieza e Inyección de HTML
            modalContainer.innerHTML = html;

            // Paso 3: Crear y Mostrar el modal
            const modalElement = modalContainer.querySelector('.modal');
            if (!modalElement) {
                console.error(`Error: El HTML de '${moduleName}' no contiene el elemento .modal.`);
                return;
            }
            const modalInstance = new bootstrap.Modal(modalElement);
            modalInstance.show();

            // Paso 4: CARGAR Y EJECUTAR EL JAVASCRIPT
            const scriptPath = `${moduleBaseDir}${moduleName}.js`;

            fetch(scriptPath)
                .then(response => {
                    if (!response.ok) {
                        console.warn(`ADVERTENCIA: No se encontró el script JS en la ruta: ${scriptPath}. Estado: ${response.status}`);
                        return null;
                    }
                    return response.text();
                })
                .then(scriptText => {
                    if (scriptText) {
                        // INYECCIÓN Y EJECUCIÓN
                        const script = document.createElement('script');
                        script.id = scriptId;
                        script.textContent = scriptText;
                        document.body.appendChild(script); 
                        console.log(`Script '${moduleName}.js' inyectado correctamente.`);
                    }
                })
                .catch(error => console.error(`ERROR DE FETCH JS: Fallo inesperado al cargar el script ${moduleName}.js:`, error));

            // Paso 5: LIMPIEZA al cerrar el modal
            modalElement.addEventListener('hidden.bs.modal', function () {
                modalContainer.innerHTML = '';
                
                const scriptElement = document.getElementById(scriptId);
                if (scriptElement) {
                    scriptElement.remove(); 
                }
            }, { once: true });
        })
        .catch(error => console.error(`ERROR DE FETCH HTML: Fallo inesperado al cargar el módulo modal ${moduleName}:`, error));
}

// ---------------------------------------------------------

// =========================================================
// III. INICIALIZACIÓN Y LÓGICA PRINCIPAL (DOM LOADED)
// =========================================================

document.addEventListener('DOMContentLoaded', async () => {

    // --- 3.1. DECLARACIÓN E INICIALIZACIÓN DE VARIABLES LOCALES ---

    const saleTabsContainer = document.getElementById('saleTabs');
    const saleTabContent = document.getElementById('saleTabContent');
    const addSaleButton = document.getElementById('add-sale-tab');
    const profileBtn = document.getElementById('profile-btn');
    const clientBtn = document.getElementById('client-btn');
    const supplierBtn = document.getElementById('supplier-btn');
    const calendarBtn = document.getElementById('calendar-btn');
    const productsBtn = document.getElementById('products-btn');

    const MAX_SALES = 15;
    let globalSaleCounter = 1;
    let salesData = {
        'venta-1': {
            number: 1,
            products: [{ code: 1001, name: "Pantalla LED Samsung 32\"", quantity: 1, price: 2500.00 }],
            total: 3500.00
        }
    };
    
    // Referencias para el Modal Genérico (Global)
    await loadGlobalModal();
    const globalModalElement = document.getElementById('globalConfirmModal');
    
    if (!window.bootstrap || !globalModalElement) {
        console.error("CRITICAL ERROR: Bootstrap no está cargado o el elemento Modal Global no se encontró.");
        return;
    }

    const globalModal = new bootstrap.Modal(globalModalElement);
    const globalConfirmBtn = document.getElementById('globalModalConfirmBtn');
    const globalModalTitle = document.getElementById('globalConfirmModalLabel');
    const globalModalBody = document.getElementById('globalModalBody');
    let modalCallback = null; // Función a ejecutar al confirmar el modal genérico


    // Inicializar la pestaña de venta #1
    const initialTabButton = document.getElementById('tab-venta-1');
    if (initialTabButton) {
        new bootstrap.Tab(initialTabButton);
        initialTabButton.innerHTML = `#1 <i class="fas fa-times-circle close-tab-icon"></i>`;
    }

    // --- 3.2. FUNCIONES LOCALES DE VENTA (Optimizadas) ---

    function getNextSaleNumber() {
        // Encuentra el primer número de venta disponible
        const usedNumbers = Object.values(salesData).map(data => data.number).sort((a, b) => a - b);
        let nextNumber = 1;
        for (const num of usedNumbers) {
            if (num === nextNumber) { nextNumber++; } else { return nextNumber; }
        }
        return nextNumber;
    }

    function checkTabCount() {
        // Ajusta la clase si hay demasiados tabs
        const currentTabs = saleTabsContainer.querySelectorAll('.nav-link').length;
        saleTabsContainer.classList.toggle('shrink-tabs', currentTabs >= 8);
    }

    function findInsertionPoint(saleNumber) {
        // Encuentra el punto para insertar la nueva pestaña en orden numérico
        if (saleNumber === 1) { return null; }
        const tabButtons = saleTabsContainer.querySelectorAll('.nav-link');

        for (let i = 0; i < tabButtons.length; i++) {
            const button = tabButtons[i];
            const existingNumberMatch = button.innerHTML.match(/#(\d+)/);
            if (existingNumberMatch) {
                const existingNumber = parseInt(existingNumberMatch[1], 10);
                if (saleNumber < existingNumber) {
                    // Retorna el botón ANTERIOR al punto de inserción
                    return i > 0 ? tabButtons[i - 1] : null; 
                }
            }
        }
        // Retorna el último botón si la nueva venta es el número más alto
        return tabButtons.length > 0 ? tabButtons[tabButtons.length - 1] : null;
    }

    function createNewSaleTab() {
        if (saleTabsContainer.children.length >= MAX_SALES) {
            showAlertError(`No puedes crear más de ${MAX_SALES} ventas simultáneas.`);
            return;
        }

        globalSaleCounter++;
        const saleNumber = getNextSaleNumber();
        const saleId = `venta-${globalSaleCounter}`;

        // Crear Tab Button
        const tabButton = document.createElement('button');
        tabButton.className = 'nav-link sale-tab-btn';
        tabButton.id = `tab-${saleId}`;
        tabButton.dataset.bsToggle = 'tab';
        tabButton.dataset.bsTarget = `#content-${saleId}`;
        tabButton.type = 'button';
        tabButton.role = 'tab';
        tabButton.ariaControls = `content-${saleId}`;
        tabButton.ariaSelected = 'false';
        tabButton.innerHTML = `#${saleNumber} <i class="fas fa-times-circle close-tab-icon"></i>`;

        // Crear Tab Pane (Contenido)
        const tabPane = document.createElement('div');
        tabPane.className = 'tab-pane fade h-100';
        tabPane.id = `content-${saleId}`;
        tabPane.role = 'tabpanel';
        tabPane.tabIndex = '0';
        tabPane.innerHTML = `
            <div class="table-container h-100"> 
                <table class="table table-hover align-middle table-striped">
                    <thead class="table-header">
                        <tr>
                            <th>Código</th><th>Producto</th><th>Cantidad</th>
                            <th>Precio</th><th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody id="product-table-${saleId}"></tbody>
                </table>
            </div>
        `;

        // Insertar en la posición correcta (orden por número de venta)
        const insertionPoint = findInsertionPoint(saleNumber);
        if (insertionPoint) {
            const insertionContentId = insertionPoint.dataset.bsTarget.substring(1);
            const insertionContent = document.getElementById(insertionContentId);
            insertionPoint.after(tabButton);
            insertionContent.after(tabPane);
        } else {
            saleTabsContainer.prepend(tabButton);
            saleTabContent.prepend(tabPane);
        }

        // Inicializar datos, mostrar y contar
        salesData[saleId] = { number: saleNumber, products: [], total: 0.00 };
        new bootstrap.Tab(tabButton).show();
        checkTabCount();
    }

    function performCloseSale(tabButton) {
        const tabId = tabButton.id;
        if (saleTabsContainer.children.length <= 1) { return; }

        const isActive = tabButton.classList.contains('active');
        const tabPaneId = tabButton.dataset.bsTarget.substring(1);
        
        const saleKey = tabId.replace('tab-', '');
        delete salesData[saleKey];
        tabButton.remove();
        document.getElementById(tabPaneId).remove(); 

        if (isActive) {
            const nextButton = saleTabsContainer.querySelector('.nav-link') || null;
            if (nextButton) { new bootstrap.Tab(nextButton).show(); }
        }
        checkTabCount();
    }

    function closeSaleTab(tabButton) {
        const saleKey = tabButton.id.replace('tab-', '');
        const currentSaleData = salesData[saleKey];

        if (saleTabsContainer.children.length <= 1) {
            showAlertError("No puedes cerrar la única venta abierta.");
            return;
        }

        if (currentSaleData && currentSaleData.products.length > 0) {
            const title = 'Cerrar Venta';
            const body = `<p>La venta actual (<strong>#${currentSaleData.number}</strong>) contiene productos. ¿Estás seguro de que deseas <strong>cerrar la venta y descartar todos los productos</strong>?</p>`;
            const confirmAction = () => { performCloseSale(tabButton); };

            showGenericModal(title, body, confirmAction, 'Cerrar Venta', 'btn-danger');
        } else {
            performCloseSale(tabButton);
        }
    }


    // --- 3.3. LISTENERS DE EVENTOS ---

    // Listener para abrir el perfil
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadModalModule('profile');
        });
    }

    // Listener para abrir el cliente
    if (clientBtn) {
        clientBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadModalModule('client');
        });
    }

    // Listener para abrir el proveedor
    if (supplierBtn) {
        supplierBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadModalModule('supplier');
        });
    }

    // Listener para abrir el calendario
    if (calendarBtn) {
        calendarBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadModalModule('calendar');
        });
    }

    // Listener para abrir productos
    if (productsBtn) {
        productsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            loadModalModule('products');
        });
    }

    // Listener para crear nueva venta
    addSaleButton.addEventListener('click', createNewSaleTab);

    // Listener delegado para cerrar venta
    saleTabsContainer.addEventListener('click', (event) => {
        const closeIcon = event.target.closest('.close-tab-icon');
        if (closeIcon) {
            const tabButton = closeIcon.closest('.nav-link');
            if (tabButton) {
                closeSaleTab(tabButton);
            }
        }
    });

    // Listener al cambiar de pestaña de venta
    saleTabsContainer.addEventListener('shown.bs.tab', (event) => {
        const newTabId = event.target.id;
        const newSaleKey = newTabId.replace('tab-', '');
        const total = salesData[newSaleKey]?.total || 0;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    });

    // Listener de confirmación para el modal genérico
    globalConfirmBtn.addEventListener('click', () => {
        if (modalCallback) {
            modalCallback();
        }
        globalModal.hide();
        modalCallback = null;
    });

    checkTabCount(); 
    
    // ---------------------------------------------------------


    // =========================================================
    // IV. FUNCIONES AUXILIARES (HELPERS)
    // =========================================================

    /**
     * Carga el archivo modal.html (modal de confirmación global)
     */
    async function loadGlobalModal() {
        try {
            const modalContainer = document.getElementById('modal-container');
            const existingGlobalModal = document.getElementById('globalConfirmModal');
            
            if (existingGlobalModal) return; 

            const response = await fetch('../../helpers/modal.html');
            const modalHtml = await response.text();
            
            // Usamos un div temporal para añadirlo al contenedor sin borrar contenido existente
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = modalHtml;
            if (tempDiv.firstChild) {
                modalContainer.appendChild(tempDiv.firstChild); 
            }
        } catch (error) {
            console.error("Error al cargar el modal de confirmación global.", error);
        }
    }

    /**
     * Muestra el modal de confirmación genérico.
     */
    function showGenericModal(title, bodyHtml, callback, confirmText = 'Aceptar', confirmClass = 'btn-primary') {
        globalModalTitle.innerHTML = title;
        globalModalBody.innerHTML = bodyHtml;
        globalConfirmBtn.textContent = confirmText;
        globalConfirmBtn.className = `btn ${confirmClass}`;
        modalCallback = callback;
        globalModal.show();
    }

    /**
     * Muestra el componente de alerta de error temporal.
     */
    async function showAlertError(message) {
        try {
            const response = await fetch('../../helpers/alert_error.html');
            const alertHtml = await response.text();

            const alertWrapper = document.createElement('div');
            alertWrapper.innerHTML = alertHtml;
            const alertElement = alertWrapper.querySelector('.alert');

            alertElement.classList.add('alert-danger', 'alert-fixed-bottom-left', 'fade');
            alertElement.textContent = `${message}`;

            document.body.appendChild(alertElement);

            const visibilityDuration = 1500;
            const fadeDuration = 500;

            // Fade-in
            setTimeout(() => { alertElement.classList.add('show'); }, 10);

            // Fade-out y eliminación
            setTimeout(() => {
                alertElement.classList.remove('show');
                setTimeout(() => { alertElement.remove(); }, fadeDuration);
            }, visibilityDuration);

        } catch (error) {
            console.error("Error al cargar o mostrar la alerta de error. Usando alert() como respaldo.", error);
            // Fallback: Si la carga del helper falla, usamos alert() de respaldo
            alert(message); 
        }
    }

});
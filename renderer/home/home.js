/**
 * =========================================================
 * HOME.JS - LÓGICA PRINCIPAL DEL RENDERER
 * =========================================================
 * * Contiene la inicialización, el manejo de ventas (tabs) y la carga dinámica de módulos.
 */

// =========================================================
// I. UTILIDADES GLOBALES Y RELOJ
// =========================================================

function updateClock() {
    const clockElement = document.getElementById('clock');
    if (!clockElement) return;

    const now = new Date();
    const options = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
    const dateOptions = { weekday: 'short', day: '2-digit', month: 'short' };
    const timeString = now.toLocaleTimeString('es-ES', options);
    const dateString = now.toLocaleDateString('es-ES', dateOptions);

    clockElement.textContent = `${dateString} | ${timeString}`;
}

// Inicialización del reloj
updateClock();
setInterval(updateClock, 1000);



// =========================================================
// II. FUNCIONES DE CARGA DE MÓDULOS (MODALES)
// =========================================================

/**
 * Carga un módulo (HTML, CSS, y JS) diseñado para ser una ventana flotante (Modal).
 * Inyecta el HTML en #modal-container y usa Bootstrap para mostrarlo.
 * * @param {string} moduleName - Nombre del módulo (e.g., 'profile').
 */
function loadModalModule(moduleName) {
    const modalContainer = document.getElementById('modal-container');

    // CORRECCIÓN CLAVE: Subimos un nivel (../) para acceder a la carpeta hermana 'profile'
    const moduleBaseDir = `../${moduleName}/`;
    const htmlPath = `${moduleBaseDir}${moduleName}.html`;

    // 1. CARGAR CSS DINÁMICAMENTE
    const cssPath = `${moduleBaseDir}${moduleName}.css`;
    let styleLink = document.getElementById(`css-${moduleName}`);

    if (!styleLink) {
        styleLink = document.createElement('link');
        styleLink.id = `css-${moduleName}`;
        styleLink.rel = 'stylesheet';
        styleLink.href = cssPath;
        document.head.appendChild(styleLink);
    }

    // 2. CARGAR EL HTML
    fetch(htmlPath)
        .then(response => {
            if (!response.ok) {
                console.error(`Error de ruta: Intentando cargar desde ${htmlPath}`);
                throw new Error(`Módulo modal no encontrado. Ruta esperada: ${htmlPath}`);
            }
            return response.text();
        })
        .then(html => {
            modalContainer.innerHTML = html;

            // 3. Crear y Mostrar el modal
            const modalElement = document.getElementById('userProfileModal');
            const modalInstance = new bootstrap.Modal(modalElement);
            modalInstance.show();

            // 4. CARGAR Y EJECUTAR EL JAVASCRIPT
            const scriptPath = `${moduleBaseDir}${moduleName}.js`;

            fetch(scriptPath)
                .then(response => {
                    if (response.ok) return response.text();
                    return null;
                })
                .then(scriptText => {
                    if (scriptText) {
                        const script = document.createElement('script');
                        script.textContent = scriptText;
                        document.body.appendChild(script);
                    }
                })
                .catch(error => console.error(`Error al cargar el script ${moduleName}.js:`, error));

            // 5. LIMPIEZA: Remover el HTML del DOM al cerrar el modal
            modalElement.addEventListener('hidden.bs.modal', function () {
                modalContainer.innerHTML = '';
            });
        })
        .catch(error => console.error(`Error al cargar el módulo modal ${moduleName}:`, error));
}


// =========================================================
// III. LÓGICA PRINCIPAL DE VENTA (Ejecución al cargar el DOM)
// =========================================================

document.addEventListener('DOMContentLoaded', async () => {

    // --- 3.1. DECLARACIÓN E INICIALIZACIÓN DE VARIABLES GLOBALES ---
    const saleTabsContainer = document.getElementById('saleTabs');
    const saleTabContent = document.getElementById('saleTabContent');
    const addSaleButton = document.getElementById('add-sale-tab');

    const MAX_SALES = 15;
    let globalSaleCounter = 1;
    let salesData = {
        'venta-1': {
            number: 1,
            products: [{ code: 1001, name: "Pantalla LED Samsung 32\"", quantity: 1, price: 2500.00 }],
            total: 3500.00
        }
    };

    const profileBtn = document.getElementById('profile-btn');

    // --- 3.2. LISTENERS PARA MÓDULOS ---
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // CORRECCIÓN: Llamamos a la función loadModalModule
            loadModalModule('profile'); // <-- Aquí se dispara la función
        });
    }

    // --- 3.3. PROCESO DE INICIALIZACIÓN ASÍNCRONA DE MODALES ---

    await loadGlobalModal();

    const globalModalElement = document.getElementById('globalConfirmModal');

    if (!window.bootstrap || !globalModalElement) {
        console.error("CRITICAL ERROR: Bootstrap no está cargado o el elemento Modal no se encontró.");
        return;
    }

    const globalModal = new bootstrap.Modal(globalModalElement);
    const globalConfirmBtn = document.getElementById('globalModalConfirmBtn');
    const globalModalTitle = document.getElementById('globalConfirmModalLabel');
    const globalModalBody = document.getElementById('globalModalBody');
    let modalCallback = null;

    // Ajustar la pestaña inicial a solo "#1" e inicializar la pestaña de Bootstrap
    const initialTabButton = document.getElementById('tab-venta-1');
    if (initialTabButton) {
        new bootstrap.Tab(initialTabButton);
        initialTabButton.innerHTML = `#1 <i class="fas fa-times-circle close-tab-icon"></i>`;
    }

    // --- 3.4. DECLARACIÓN DE FUNCIONES PRINCIPALES DE VENTA ---

    function getNextSaleNumber() {
        const usedNumbers = Object.values(salesData).map(data => data.number).sort((a, b) => a - b);
        let nextNumber = 1;

        for (const num of usedNumbers) {
            if (num === nextNumber) {
                nextNumber++;
            } else {
                return nextNumber;
            }
        }
        return nextNumber;
    }

    function checkTabCount() {
        const currentTabs = saleTabsContainer.querySelectorAll('.nav-link').length;

        if (currentTabs >= 8) {
            saleTabsContainer.classList.add('shrink-tabs');
        } else {
            saleTabsContainer.classList.remove('shrink-tabs');
        }
    }

    function findInsertionPoint(saleNumber) {
        if (saleNumber === 1) { return null; }
        const tabButtons = saleTabsContainer.querySelectorAll('.nav-link');

        for (let i = 0; i < tabButtons.length; i++) {
            const button = tabButtons[i];
            const existingNumberMatch = button.innerHTML.match(/#(\d+)/);

            if (existingNumberMatch) {
                const existingNumber = parseInt(existingNumberMatch[1], 10);

                if (saleNumber < existingNumber) {
                    return i > 0 ? tabButtons[i - 1] : null;
                }
            }
        }
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

        // Crear elementos (tabButton y tabPane)
        const tabButton = document.createElement('button');
        tabButton.classList.add('nav-link', 'sale-tab-btn');
        tabButton.setAttribute('id', `tab-${saleId}`);
        tabButton.setAttribute('data-bs-toggle', 'tab');
        tabButton.setAttribute('data-bs-target', `#content-${saleId}`);
        tabButton.setAttribute('type', 'button');
        tabButton.setAttribute('role', 'tab');
        tabButton.setAttribute('aria-controls', `content-${saleId}`);
        tabButton.setAttribute('aria-selected', 'false');
        tabButton.innerHTML = `#${saleNumber} <i class="fas fa-times-circle close-tab-icon"></i>`;

        const tabPane = document.createElement('div');
        tabPane.classList.add('tab-pane', 'fade', 'h-100');
        tabPane.setAttribute('id', `content-${saleId}`);
        tabPane.setAttribute('role', 'tabpanel');
        tabPane.setAttribute('aria-labelledby', `tab-${saleId}`);
        tabPane.setAttribute('tabindex', '0');
        tabPane.innerHTML = `
            <div class="table-container h-100"> 
                <table class="table table-hover align-middle table-striped">
                    <thead class="table-header">
                        <tr>
                            <th>Código</th>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody id="product-table-${saleId}">
                        </tbody>
                </table>
            </div>
        `;

        const insertionPoint = findInsertionPoint(saleNumber);

        if (insertionPoint) {
            insertionPoint.after(tabButton);
            const insertionContentId = insertionPoint.getAttribute('data-bs-target').substring(1);
            const insertionContent = document.getElementById(insertionContentId);
            insertionContent.after(tabPane);

        } else {
            saleTabsContainer.prepend(tabButton);
            saleTabContent.prepend(tabPane);
        }

        salesData[saleId] = { number: saleNumber, products: [], total: 0.00 };

        const newTab = new bootstrap.Tab(tabButton);
        newTab.show();

        checkTabCount();
    }

    function performCloseSale(tabButton) {
        const tabId = tabButton.id;

        if (saleTabsContainer.children.length <= 1) { return; }

        const isActive = tabButton.classList.contains('active');
        const tabPaneId = tabButton.getAttribute('data-bs-target').substring(1);
        const tabPane = document.getElementById(tabPaneId);

        const saleKey = tabId.replace('tab-', '');
        delete salesData[saleKey];
        tabButton.remove();
        tabPane.remove();

        if (isActive) {
            const nextButton = saleTabsContainer.querySelector('.nav-link') || null;
            if (nextButton) { new bootstrap.Tab(nextButton).show(); }
        }
        checkTabCount();
    }

    function closeSaleTab(tabButton) {
        const tabId = tabButton.id;
        const saleKey = tabId.replace('tab-', '');
        const currentSaleData = salesData[saleKey];

        if (saleTabsContainer.children.length <= 1) {
            showAlertError("No puedes cerrar la única venta abierta.");
            return;
        }

        if (currentSaleData && currentSaleData.products.length > 0) {
            const saleNumber = currentSaleData.number;
            const title = 'Cerrar venta';
            const body = `<p>La venta actual (<strong>#${saleNumber}</strong>) contiene productos. ¿Estás seguro de que deseas <strong>cerrar la venta y descartar todos los productos</strong>?</p>`;

            const confirmAction = () => { performCloseSale(tabButton); };

            showGenericModal(title, body, confirmAction, 'Cerrar Venta', 'btn-danger');

        } else {
            performCloseSale(tabButton);
        }
    }

    // --- 3.5. LISTENERS DE EVENTOS PRINCIPALES DE VENTA ---

    addSaleButton.addEventListener('click', createNewSaleTab);

    saleTabsContainer.addEventListener('click', (event) => {
        const closeIcon = event.target.closest('.close-tab-icon');
        if (closeIcon) {
            const tabButton = closeIcon.closest('.nav-link');
            if (tabButton) {
                closeSaleTab(tabButton);
            }
        }
    });

    saleTabsContainer.addEventListener('shown.bs.tab', (event) => {
        const newTabId = event.target.id;
        const newSaleKey = newTabId.replace('tab-', '');

        const total = salesData[newSaleKey]?.total || 0;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    });

    checkTabCount();


    // =========================================================
    // IV. FUNCIONES AUXILIARES (HELPERS)
    // =========================================================

    /**
     * Carga el archivo modal.html de forma asíncrona en el contenedor de modales.
     * Asume que '../../helpers/modal.html' contiene el esqueleto de globalConfirmModal.
     */
    async function loadGlobalModal() {
        try {
            const modalContainer = document.getElementById('modal-container');
            const response = await fetch('../../helpers/modal.html');
            const modalHtml = await response.text();
            modalContainer.innerHTML = modalHtml;
        } catch (error) {
            console.error("Error al cargar el modal de confirmación.", error);
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
     * Muestra el componente de alerta de error temporal (fade-in/out).
     */
    async function showAlertError(message) {
        try {
            const response = await fetch('../../helpers/alert_error.html');
            let alertHtml = await response.text();

            const alertWrapper = document.createElement('div');
            alertWrapper.innerHTML = alertHtml;
            const alertElement = alertWrapper.querySelector('.alert');

            alertElement.classList.add('alert-danger', 'alert-fixed-bottom-left');
            alertElement.classList.remove('alert-secondary');
            alertElement.textContent = `${message}`;

            document.body.appendChild(alertElement);

            const visibilityDuration = 1500;
            const fadeDuration = 500;

            // Fade-in
            setTimeout(() => {
                alertElement.classList.add('show');
            }, 10);

            // Fade-out y eliminación
            setTimeout(() => {
                alertElement.classList.remove('show');

                setTimeout(() => {
                    alertElement.remove();
                }, fadeDuration);

            }, visibilityDuration);

        } catch (error) {
            console.error("Error al cargar o mostrar la alerta de error. Usando alert() como respaldo.", error);
            alert(message);
        }
    }

    // Listener del modal genérico
    globalConfirmBtn.addEventListener('click', () => {
        if (modalCallback) {
            modalCallback();
        }
        globalModal.hide();
        modalCallback = null;
    });

});
/**
 * =========================================================
 * HOME.JS - LÓGICA PRINCIPAL DEL RENDERER
 * =========================================================
 */

// --- I. UTILIDADES GLOBALES (RELOJ Y SINCRONIZACIÓN) ---

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

/**
 * Sincroniza la foto y el username del usuario en el Navbar
 */
window.syncUserNavbar = async function() {
    try {
        const session = await window.electronAPI.invoke("get-user-session");
        if (session) {
            const users = await window.electronAPI.invoke("db-query", {
                sql: "SELECT username, foto FROM users WHERE id = ?",
                params: [session.id]
            });

            if (users && users.length > 0) {
                const u = users[0];
                const nameDisplay = document.getElementById('user-fullname');
                const sellerDisplay = document.getElementById('current-seller');
                const photoDisplay = document.getElementById('profile-photo');

                // Mostrar el nombre de usuario
                if (nameDisplay) nameDisplay.textContent = u.username || "Usuario";
                if (sellerDisplay) sellerDisplay.textContent = u.username || "Usuario";
                
                // Carga de foto (Volviendo al formato compatible)
                if (photoDisplay && u.foto) {
                    // Limpiamos la ruta y aplicamos el protocolo media
                    const cleanPath = u.foto.replace(/\\/g, "/");
                    photoDisplay.src = `media://${cleanPath}`;
                }
            }
        }
    } catch (err) { 
        console.error("Error sincronizando navbar:", err); 
    }
};

updateClock();
setInterval(updateClock, 1000);

// --- II. CARGA DE MÓDULOS ---

function loadModalModule(moduleName) {
    const modalContainer = document.getElementById('modal-container');
    const moduleBaseDir = `../${moduleName}/`; 
    const scriptId = `js-${moduleName}`;

    const cssPath = `${moduleBaseDir}${moduleName}.css`;
    let styleLink = document.getElementById(`css-${moduleName}`);
    if (!styleLink) {
        styleLink = document.createElement('link');
        styleLink.id = `css-${moduleName}`;
        styleLink.rel = 'stylesheet';
        styleLink.href = cssPath;
        document.head.appendChild(styleLink);
    }

    fetch(`${moduleBaseDir}${moduleName}.html`)
        .then(response => response.text())
        .then(html => {
            modalContainer.innerHTML = html;
            const modalElement = modalContainer.querySelector('.modal');
            if (!modalElement) return;
            
            const modalInstance = new bootstrap.Modal(modalElement);
            modalInstance.show();

            fetch(`${moduleBaseDir}${moduleName}.js`)
                .then(response => response.ok ? response.text() : null)
                .then(scriptText => {
                    if (scriptText) {
                        const script = document.createElement('script');
                        script.id = scriptId;
                        script.textContent = scriptText;
                        document.body.appendChild(script); 
                    }
                });

            modalElement.addEventListener('hidden.bs.modal', () => {
                modalContainer.innerHTML = '';
                const scriptElement = document.getElementById(scriptId);
                if (scriptElement) scriptElement.remove(); 
            }, { once: true });
        });
}

// --- III. INICIALIZACIÓN DOM ---

document.addEventListener('DOMContentLoaded', async () => {
    // Sincronizar al cargar la página
    window.syncUserNavbar();

    const saleTabsContainer = document.getElementById('saleTabs');
    const saleTabContent = document.getElementById('saleTabContent');
    const addSaleButton = document.getElementById('add-sale-tab');

    // Listeners de botones de navegación
    const navButtons = {
        'profile-btn': 'profile',
        'client-btn': 'client',
        'supplier-btn': 'supplier',
        'calendar-btn': 'calendar',
        'products-btn': 'products'
    };

    Object.entries(navButtons).forEach(([id, module]) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', (e) => { 
            e.preventDefault(); 
            loadModalModule(module); 
        });
    });

    // Lógica de TABS (Se mantiene tu lógica original)
    const MAX_SALES = 15;
    let globalSaleCounter = 1;
    let salesData = { 'venta-1': { number: 1, products: [], total: 0 } };

    // ... (Resto de tu lógica de ventas sin cambios)
    
    // Función para cargar modal global (asegúrate de tenerla)
    async function loadGlobalModal() {
        const modalContainer = document.getElementById('modal-container');
        if (document.getElementById('globalConfirmModal')) return; 
        try {
            const response = await fetch('../../helpers/modal.html');
            const html = await response.text();
            const div = document.createElement('div');
            div.innerHTML = html;
            modalContainer.appendChild(div.firstChild);
        } catch (e) { console.error(e); }
    }
    loadGlobalModal();
});
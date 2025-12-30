/**
 * =========================================================
 * CLIENTS.JS - CON VALIDACIÓN DE RFC Y FILTROS SEGUROS
 * =========================================================
 */

let permisosUsuario = [];
let clientesCache = [];
let editingId = null;
let clientFormModal = null;

let clientsModalEl, tableBody, btnNuevoCliente, searchInput, statusFilter;
let clientFormModalEl, nombreInput, apPatInput, apMatInput, emailInput, telefonoInput, rfcInput, estatusInput, modalTitle;

const cleanString = t => 
    (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9@.\s]/g, "").trim();

const normalize = t => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Función para validar estructura básica de RFC (Física o Moral)
const isValidRFC = rfc => {
    const re = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
    return re.test(rfc.toUpperCase());
};

function bindClientsDOM() {
    clientsModalEl = document.getElementById("clientsModal");
    if (!clientsModalEl) return;

    tableBody = document.getElementById("clients-table-body");
    btnNuevoCliente = document.getElementById("btn-new-client");
    searchInput = document.getElementById("client-search");
    clientFormModalEl = document.getElementById("clientFormModal");
    
    if (clientFormModalEl) {
        if (clientFormModal) clientFormModal.dispose();
        clientFormModal = new bootstrap.Modal(clientFormModalEl);
    }

    nombreInput = document.getElementById("client-nombre");
    apPatInput = document.getElementById("client-apellido-paterno");
    apMatInput = document.getElementById("client-apellido-materno");
    emailInput = document.getElementById("client-email");
    telefonoInput = document.getElementById("client-telefono");
    rfcInput = document.getElementById("client-rfc");
    estatusInput = document.getElementById("client-estatus");
    modalTitle = document.getElementById("clientFormTitle");
}

function clearValidations() {
    const fields = [nombreInput, apPatInput, apMatInput, telefonoInput, rfcInput];
    fields.forEach(f => { if(f) f.classList.remove("is-invalid"); });
    const msg = document.getElementById("error-message-client");
    if (msg) {
        msg.style.display = "none";
        msg.textContent = "* Por favor, rellene los campos obligatorios correctamente.";
    }
}

function resetForm() {
    editingId = null;
    if (modalTitle) modalTitle.textContent = "Nuevo Cliente";
    const fields = [nombreInput, apPatInput, apMatInput, emailInput, telefonoInput, rfcInput];
    fields.forEach(f => { if (f) f.value = ""; });
    if (estatusInput) estatusInput.checked = true;
    clearValidations();
}

function renderClientes(data) {
    if (!tableBody) return;
    tableBody.innerHTML = "";
    if (!data || !data.length) {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay clientes</td></tr>`;
        return;
    }
    let html = "";
    data.forEach(c => {
        html += `
            <tr>
                <td>${c.id}</td>
                <td>${c.nombre_completo}</td>
                <td>${c.email || "-"}</td>
                <td>${c.telefono || "-"}</td>
                <td>${c.rfc || "-"}</td>
                <td><span class="badge ${Number(c.estatus) === 1 ? "bg-success" : "bg-secondary"}">${Number(c.estatus) === 1 ? "Activo" : "Inactivo"}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-warning btn-edit" data-id="${c.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger btn-delete ms-1" data-id="${c.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    });
    tableBody.innerHTML = html;
}

async function loadClientes() {
    if (!document.getElementById("clientsModal")) return;
    const sql = `SELECT id, nombre, apellido_paterno, apellido_materno,
        TRIM(nombre || ' ' || IFNULL(apellido_paterno,'') || ' ' || IFNULL(apellido_materno,'')) AS nombre_completo,
        email, telefono, rfc, estatus FROM clients`;
    clientesCache = await window.electronAPI.invoke("db-query", { sql });
    applyFilters();
}

function applyFilters() {
    let data = [...clientesCache];
    const sInput = document.getElementById("client-search");
    const term = normalize(sInput?.value);
    if (term) {
        data = data.filter(c => normalize(c.nombre_completo).includes(term) || normalize(c.email).includes(term));
    }
    renderClientes(data);
}

// --- EVENTOS ---

document.addEventListener("shown.bs.modal", async (e) => {
    if (e.target.id === "profileModal") return; // Evitar choque con perfil
    if (e.target.id === "clientsModal") { 
        bindClientsDOM();
        await loadClientes();
    }
});

document.addEventListener("click", async (e) => {
    if (e.target.closest("#btn-new-client")) {
        resetForm();
        if (clientFormModal) clientFormModal.show();
    }

    const btnEdit = e.target.closest(".btn-edit");
    if (btnEdit) {
        resetForm();
        const id = Number(btnEdit.dataset.id);
        const c = clientesCache.find(x => x.id === id);
        if (c) {
            editingId = id;
            if (modalTitle) modalTitle.textContent = "Editar Cliente";
            nombreInput.value = c.nombre || "";
            apPatInput.value = c.apellido_paterno || "";
            apMatInput.value = c.apellido_materno || "";
            emailInput.value = c.email || "";
            telefonoInput.value = c.telefono || "";
            rfcInput.value = c.rfc || "";
            estatusInput.checked = Number(c.estatus) === 1;
            clientFormModal.show();
        }
    }

    if (e.target.closest("#btn-save-client")) {
        clearValidations();
        let hasError = false;

        const nombre = cleanString(nombreInput.value);
        const apPat = cleanString(apPatInput.value);
        const apMat = cleanString(apMatInput.value);
        const telefono = telefonoInput.value.replace(/\D/g, "");
        const rfcValue = rfcInput.value.trim().toUpperCase();
        const msgError = document.getElementById("error-message-client");

        // Validaciones obligatorias
        if (!nombre) { nombreInput.classList.add("is-invalid"); hasError = true; }
        if (!apPat) { apPatInput.classList.add("is-invalid"); hasError = true; }
        if (!apMat) { apMatInput.classList.add("is-invalid"); hasError = true; }
        if (telefono.length !== 10) { telefonoInput.classList.add("is-invalid"); hasError = true; }
        
        // Validación opcional de RFC (si se escribe algo, debe ser válido)
        if (rfcValue && !isValidRFC(rfcValue)) {
            rfcInput.classList.add("is-invalid");
            hasError = true;
            if (msgError) msgError.textContent = "* El formato del RFC es incorrecto.";
        }

        if (hasError) {
            if (msgError) msgError.style.display = "block";
            return;
        }

        const params = [
            nombre, apPat, apMat, emailInput.value.trim().toLowerCase(), 
            telefono, rfcValue,
            estatusInput.checked ? 1 : 0
        ];

        const sql = editingId 
            ? `UPDATE clients SET nombre=?, apellido_paterno=?, apellido_materno=?, email=?, telefono=?, rfc=?, estatus=? WHERE id=${editingId}`
            : `INSERT INTO clients (nombre, apellido_paterno, apellido_materno, email, telefono, rfc, estatus) VALUES (?,?,?,?,?,?,?)`;

        try {
            await window.electronAPI.invoke("db-run", { sql, params });
            clientFormModal.hide();
            await loadClientes();
        } catch (error) {
            if (error.message.includes("UNIQUE constraint failed")) {
                if (msgError) {
                    msgError.textContent = "* El RFC o Email ya existen.";
                    msgError.style.display = "block";
                }
            }
        }
    }

    const btnDel = e.target.closest(".btn-delete");
    if (btnDel) {
        const id = Number(btnDel.dataset.id);
        if (confirm("¿Desactivar cliente?")) {
            await window.electronAPI.invoke("db-run", { sql: "UPDATE clients SET estatus = 0 WHERE id=?", params: [id] });
            await loadClientes();
        }
    }
});

// Validación y formato en tiempo real
document.addEventListener("input", e => {
    if (e.target.id === "client-search") applyFilters();

    // Formatear RFC automáticamente
    if (e.target.id === "client-rfc") {
        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9&Ñ]/g, "");
        if (val.length > 13) val = val.substring(0, 13);
        e.target.value = val;
    }

    // Quitar marcas de error al escribir
    if (e.target.classList.contains("is-invalid")) {
        e.target.classList.remove("is-invalid");
    }
});

(async () => {
    const session = await window.electronAPI.invoke("get-user-session");
    permisosUsuario = (session?.permisos || []).map(p => p.id);
    bindClientsDOM();
})();
/**
 * CLIENTS.JS - VERSIÓN FINAL REFORZADA
 */

// 1. LIMPIEZA DE EVENTOS PREVIOS (Evita que el sistema truene al reabrir)
if (window.ClientsModule) {
    document.removeEventListener("click", window.ClientsModule.handleClick);
    document.removeEventListener("input", window.ClientsModule.handleInput);
}

window.ClientsModule = {
    cache: [],
    editingId: null,
    formModalInstance: null,

    // --- UTILIDADES ---
    cleanString: t => (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9@.\s]/g, "").trim(),
    normalize: t => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),

    // --- INICIALIZADOR ---
    init: function() {
        this.handleClick = this.handleClick.bind(this);
        this.handleInput = this.handleInput.bind(this);
        
        document.addEventListener("click", this.handleClick);
        document.addEventListener("input", this.handleInput);
    },

    // Obtener o crear instancia del modal de formulario
    getFormModal: function() {
        const el = document.getElementById("clientFormModal");
        if (!el) return null;
        if (!this.formModalInstance) {
            this.formModalInstance = new bootstrap.Modal(el, { backdrop: 'static' });
        }
        return this.formModalInstance;
    },

    // --- CARGA DE DATOS CON SPINNER ---
    load: async function() {
        const loader = document.getElementById("clients-loading");
        const tableEl = document.getElementById("clients-table-main");
        const tbody = document.getElementById("clients-table-body");

        // Encender visuales de carga
        if (loader) loader.style.display = "block";
        if (tableEl) tableEl.style.opacity = "0.2";
        if (tbody) tbody.innerHTML = ""; 

        const sql = `SELECT id, nombre, apellido_paterno, apellido_materno,
            TRIM(nombre || ' ' || IFNULL(apellido_paterno,'') || ' ' || IFNULL(apellido_materno,'')) AS nombre_completo,
            email, telefono, rfc, estatus FROM clients ORDER BY id ASC`;

        try {
            this.cache = await window.electronAPI.invoke("db-query", { sql });
            this.render(this.cache);
        } catch (e) { 
            console.error("Error DB:", e);
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error al cargar datos</td></tr>`;
        } finally {
            // Apagar visuales de carga
            if (loader) loader.style.display = "none";
            if (tableEl) tableEl.style.opacity = "1";
        }
    },

    render: function(data) {
        const tbody = document.getElementById("clients-table-body");
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No se encontraron clientes</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(c => `
            <tr>
                <td>${c.id}</td>
                <td class="fw-bold">${c.nombre_completo}</td>
                <td>${c.email || "-"}</td>
                <td>${c.telefono || "-"}</td>
                <td>${c.rfc || "-"}</td>
                <td><span class="badge ${c.estatus == 1 ? "bg-success" : "bg-secondary"}">
                    ${c.estatus == 1 ? "Activo" : "Inactivo"}</span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-warning btn-edit" data-id="${c.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>`).join('');
    },

    // --- GUARDADO ---
    save: async function() {
        const modal = document.getElementById("clientFormModal");
        const msgError = document.getElementById("error-message-client");
        const f = {
            n: modal.querySelector("#client-nombre"),
            ap: modal.querySelector("#client-apellido-paterno"),
            am: modal.querySelector("#client-apellido-materno"),
            em: modal.querySelector("#client-email"),
            tel: modal.querySelector("#client-telefono"),
            rfc: modal.querySelector("#client-rfc"),
            est: modal.querySelector("#client-estatus")
        };

        let err = false;
        modal.querySelectorAll(".is-invalid").forEach(i => i.classList.remove("is-invalid"));

        if(!this.cleanString(f.n.value)){ f.n.classList.add("is-invalid"); err=true; }
        if(!this.cleanString(f.ap.value)){ f.ap.classList.add("is-invalid"); err=true; }
        if (f.tel.value.replace(/\D/g, "").length !== 10) { f.tel.classList.add("is-invalid"); err=true; }
        
        if (err) {
            msgError.textContent = "* Rellene los campos obligatorios.";
            msgError.style.display = "block";
            return;
        }

        const params = [
            this.cleanString(f.n.value), this.cleanString(f.ap.value), this.cleanString(f.am.value), 
            f.em.value.trim().toLowerCase(), f.tel.value.replace(/\D/g, ""), 
            f.rfc.value.trim().toUpperCase(), f.est.checked ? 1 : 0
        ];

        const sql = this.editingId 
            ? `UPDATE clients SET nombre=?, apellido_paterno=?, apellido_materno=?, email=?, telefono=?, rfc=?, estatus=? WHERE id = ${this.editingId}`
            : `INSERT INTO clients (nombre, apellido_paterno, apellido_materno, email, telefono, rfc, estatus) VALUES (?,?,?,?,?,?,?)`;

        try {
            await window.electronAPI.invoke("db-run", { sql, params });
            this.getFormModal().hide();
            await this.load();
        } catch (e) {
            msgError.textContent = "* El RFC o Email ya existen.";
            msgError.style.display = "block";
        }
    },

    // --- MANEJADORES DE EVENTOS ---
    handleClick: function(e) {
        const btnEdit = e.target.closest(".btn-edit");
        const btnNew = e.target.closest("#btn-new-client");
        const btnSave = e.target.closest("#btn-save-client");

        if (btnNew || btnEdit) {
            this.editingId = btnEdit ? Number(btnEdit.dataset.id) : null;
            const modal = document.getElementById("clientFormModal");
            
            modal.querySelectorAll(".is-invalid").forEach(i => i.classList.remove("is-invalid"));
            document.getElementById("error-message-client").style.display = "none";
            
            if (!this.editingId) {
                modal.querySelector("#clientFormTitle").textContent = "Nuevo Cliente";
                modal.querySelectorAll("input:not([type='checkbox'])").forEach(i => i.value = "");
                modal.querySelector("#client-estatus").checked = true;
            } else {
                const c = this.cache.find(x => x.id === this.editingId);
                if(c) {
                    modal.querySelector("#clientFormTitle").textContent = `Editar Cliente #${this.editingId}`;
                    modal.querySelector("#client-nombre").value = c.nombre || "";
                    modal.querySelector("#client-apellido-paterno").value = c.apellido_paterno || "";
                    modal.querySelector("#client-apellido-materno").value = c.apellido_materno || "";
                    modal.querySelector("#client-email").value = c.email || "";
                    modal.querySelector("#client-telefono").value = c.telefono || "";
                    modal.querySelector("#client-rfc").value = c.rfc || "";
                    modal.querySelector("#client-estatus").checked = c.estatus == 1;
                }
            }
            this.getFormModal().show();
        }

        if (btnSave) this.save();
    },

    handleInput: function(e) {
        if (e.target.classList.contains("is-invalid")) e.target.classList.remove("is-invalid");

        if (e.target.id === "client-search") {
            const term = this.normalize(e.target.value);
            const filtered = this.cache.filter(c => 
                this.normalize(c.nombre_completo || "").includes(term) || 
                this.normalize(c.email || "").includes(term) || 
                this.normalize(c.rfc || "").includes(term) || 
                this.normalize(c.telefono || "").includes(term)
            );
            this.render(filtered);
        }
        
        if (e.target.id === "client-rfc") {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9&Ñ]/g, "").substring(0, 13);
        }
    }
};

// Iniciar módulo al cargar el archivo
window.ClientsModule.init();

// GESTIÓN DE APERTURA DESDE EL MODAL PRINCIPAL
document.addEventListener("show.bs.modal", (e) => {
    if (e.target.id === "clientsModal") {
        const loader = document.getElementById("clients-loading");
        const tableEl = document.getElementById("clients-table-main");
        if (loader) loader.style.display = "block";
        if (tableEl) tableEl.style.opacity = "0.2";
    }
});

document.addEventListener("shown.bs.modal", (e) => {
    if (e.target.id === "clientsModal") {
        const searchInput = document.getElementById("client-search");
        if (searchInput) searchInput.value = "";
        window.ClientsModule.load();
    }
});
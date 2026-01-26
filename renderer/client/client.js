/**
 * CLIENTS.JS - VERSIÓN REFORZADA Y LIMPIA
 */

if (window.ClientsModule) {
    document.removeEventListener("click", window.ClientsModule.handleClick);
    document.removeEventListener("input", window.ClientsModule.handleInput);
}

window.ClientsModule = {
    cache: [],
    editingId: null,
    formModalInstance: null,

    cleanString: t => (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9@.\s]/g, "").trim(),
    normalize: t => (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),

    init: function() {
        this.handleClick = this.handleClick.bind(this);
        this.handleInput = this.handleInput.bind(this);
        
        document.addEventListener("click", this.handleClick);
        document.addEventListener("input", this.handleInput);
    },

    getFormModal: function() {
        const el = document.getElementById("clientFormModal");
        if (!el) return null;
        if (!this.formModalInstance) {
            this.formModalInstance = new bootstrap.Modal(el, { backdrop: 'static' });
        }
        return this.formModalInstance;
    },

    load: async function() {
        const loader = document.getElementById("clients-loading");
        const tableEl = document.getElementById("clients-table-main");
        const tbody = document.getElementById("clients-table-body");

        if (loader) loader.style.display = "block";
        if (tableEl) tableEl.style.opacity = "0.2";
        if (tbody) tbody.innerHTML = ""; 

        try {
            // Usando el invoke específico configurado en el handler
            this.cache = await window.electronAPI.invoke("clients:list");
            this.render(this.cache);
        } catch (e) { 
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error al cargar datos</td></tr>`;
        } finally {
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

        tbody.innerHTML = data.map(c => {
            // Construcción del nombre completo en el frontend para mayor flexibilidad
            const nombreCompleto = `${c.nombre} ${c.apellido_paterno || ''} ${c.apellido_materno || ''}`.trim();
            return `
            <tr>
                <td>${c.id}</td>
                <td class="fw-bold">${nombreCompleto}</td>
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
            </tr>`;
        }).join('');
    },

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
        
        if (err) {
            msgError.textContent = "* Rellene los campos obligatorios.";
            msgError.style.display = "block";
            return;
        }

        const clientData = {
            id: this.editingId,
            nombre: this.cleanString(f.n.value),
            apellido_paterno: this.cleanString(f.ap.value),
            apellido_materno: this.cleanString(f.am.value),
            email: f.em.value.trim().toLowerCase(),
            telefono: f.tel.value.replace(/\D/g, ""),
            rfc: f.rfc.value.trim().toUpperCase(),
            estatus: f.est.checked ? 1 : 0,
            direccion: "" // Añadido para evitar errores si tu tabla lo requiere
        };

        try {
            await window.electronAPI.invoke("clients:save", clientData);
            this.getFormModal().hide();
            await this.load();
        } catch (e) {
            msgError.textContent = "* Error: El RFC o Email ya existen.";
            msgError.style.display = "block";
        }
    },

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
            const filtered = this.cache.filter(c => {
                const full = this.normalize(`${c.nombre} ${c.apellido_paterno} ${c.apellido_materno}`);
                return full.includes(term) || 
                       this.normalize(c.email || "").includes(term) || 
                       this.normalize(c.rfc || "").includes(term) || 
                       (c.telefono && c.telefono.includes(term));
            });
            this.render(filtered);
        }
        
        if (e.target.id === "client-rfc") {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9&Ñ]/g, "").substring(0, 13);
        }
    }
};

window.ClientsModule.init();


document.addEventListener("shown.bs.modal", (e) => {
    if (e.target.id === "clientsModal") {
        const searchInput = document.getElementById("client-search");
        if (searchInput) searchInput.value = "";
        window.ClientsModule.load();
    }
});
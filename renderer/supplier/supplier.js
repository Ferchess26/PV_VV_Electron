/**
 * SUPPLIER.JS - VERSIÓN FINAL CORREGIDA
 */

// 1. Limpieza de eventos anteriores para evitar duplicidad
if (window.SupplierModule) {
    document.removeEventListener("click", window.SupplierModule.handleClick);
    document.removeEventListener("input", window.SupplierModule.handleInput);
}

window.SupplierModule = {
    cache: [],
    editingId: null,
    instance: null,

    // Inicializador
    init: function() {
        this.handleClick = this.handleClick.bind(this);
        this.handleInput = this.handleInput.bind(this);
        
        document.addEventListener("click", this.handleClick);
        document.addEventListener("input", this.handleInput);
    },

    // Obtener instancia del modal de Bootstrap
    getModal: function() {
        const el = document.getElementById("supplierFormModal");
        if (!el) return null;
        if (!this.instance) this.instance = new bootstrap.Modal(el);
        return this.instance;
    },

    // Generar el HTML de las filas (se usa en load y en search)
    generateRowHTML: function(s) {
        return `
            <tr>
                <td>${s.id}</td>
                <td class="fw-bold">${s.nombre_empresa}</td>
                <td>${s.contacto_nombre || "-"}</td>
                <td>${s.telefono || "-"}</td>
                <td>${s.rfc || "-"}</td>
                <td><span class="badge ${s.estatus == 1 ? "bg-success" : "bg-secondary"}">${s.estatus == 1 ? "Activo" : "Inactivo"}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-warning btn-edit-supplier" data-id="${s.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>`;
    },

    // Limpiar formulario
    resetForm: function() {
        this.editingId = null;
        const modalEl = document.getElementById("supplierFormModal");
        if (!modalEl) return;

        modalEl.querySelectorAll("input, textarea").forEach(i => {
            i.value = "";
            i.classList.remove("is-invalid");
            if (i.type === 'checkbox') i.checked = true;
        });
        
        document.getElementById("supplierFormTitle").textContent = "Nuevo Proveedor";
        document.getElementById("error-message-supplier").style.display = "none";
    },

    // Cargar datos de la BD
    load: async function() {
        const tbody = document.getElementById("supplier-table-body");
        if (!tbody) return;

        try {
            const sql = `SELECT * FROM suppliers ORDER BY id ASC`;
            this.cache = await window.electronAPI.invoke("db-query", { sql });
            this.render(this.cache);
        } catch (e) { console.error(e); }
    },

    // Renderizar datos en la tabla
    render: function(data) {
        const tbody = document.getElementById("supplier-table-body");
        if (!tbody) return;
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No se encontraron resultados</td></tr>`;
            return;
        }
        tbody.innerHTML = data.map(s => this.generateRowHTML(s)).join('');
    },

    // Guardar
    save: async function() {
        const modalEl = document.getElementById("supplierFormModal");
        const f = {
            empresa: modalEl.querySelector("#supp-empresa"),
            contacto: modalEl.querySelector("#supp-contacto"),
            email: modalEl.querySelector("#supp-email"),
            tel: modalEl.querySelector("#supp-tel"),
            rfc: modalEl.querySelector("#supp-rfc"),
            dir: modalEl.querySelector("#supp-direccion"),
            est: modalEl.querySelector("#supp-estatus")
        };

        if (!f.empresa.value.trim()) {
            f.empresa.classList.add("is-invalid");
            return;
        }

        const params = [
            f.empresa.value.trim(), f.contacto.value.trim(), f.email.value.trim().toLowerCase(),
            f.tel.value.replace(/\D/g, ""), f.rfc.value.trim().toUpperCase(), f.dir.value.trim(),
            f.est.checked ? 1 : 0
        ];

        const sql = this.editingId 
            ? `UPDATE suppliers SET nombre_empresa=?, contacto_nombre=?, email=?, telefono=?, rfc=?, direccion=?, estatus=? WHERE id = ${this.editingId}`
            : `INSERT INTO suppliers (nombre_empresa, contacto_nombre, email, telefono, rfc, direccion, estatus) VALUES (?,?,?,?,?,?,?)`;

        try {
            await window.electronAPI.invoke("db-run", { sql, params });
            this.getModal().hide();
            this.load();
        } catch (e) { alert("Error al guardar"); }
    },

    // Manejador de clicks
    handleClick: function(e) {
        if (e.target.closest("#btn-new-supplier")) {
            this.resetForm();
            this.getModal().show();
        }

        const btnEdit = e.target.closest(".btn-edit-supplier");
        if (btnEdit) {
            this.resetForm();
            this.editingId = Number(btnEdit.dataset.id);
            const s = this.cache.find(x => x.id === this.editingId);
            if (s) {
                const m = document.getElementById("supplierFormModal");
                document.getElementById("supplierFormTitle").textContent = `Editar Proveedor #${this.editingId}`;
                m.querySelector("#supp-empresa").value = s.nombre_empresa || "";
                m.querySelector("#supp-contacto").value = s.contacto_nombre || "";
                m.querySelector("#supp-email").value = s.email || "";
                m.querySelector("#supp-tel").value = s.telefono || "";
                m.querySelector("#supp-rfc").value = s.rfc || "";
                m.querySelector("#supp-direccion").value = s.direccion || "";
                m.querySelector("#supp-estatus").checked = (s.estatus == 1);
                this.getModal().show();
            }
        }

        if (e.target.closest("#btn-save-supplier")) {
            this.save();
        }
    },

    // Manejador de búsqueda corregido
    handleInput: function(e) {
        if (e.target.id === "supplier-search") {
            const term = e.target.value.toLowerCase().trim();
            
            const filtered = this.cache.filter(s => 
                (s.nombre_empresa || "").toLowerCase().includes(term) || 
                (s.contacto_nombre && s.contacto_nombre.toLowerCase().includes(term)) ||
                (s.rfc && s.rfc.toLowerCase().includes(term))
            );
            
            this.render(filtered);
        }
    }
};

// Ejecución inicial
window.SupplierModule.init();
window.SupplierModule.load();
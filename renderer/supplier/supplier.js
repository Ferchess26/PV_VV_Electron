/**
 * SUPPLIER.JS - VERSIÓN FINAL REFORZADA
 */

// 1. Limpieza de eventos anteriores
if (window.SupplierModule) {
    document.removeEventListener("click", window.SupplierModule.handleClick);
    document.removeEventListener("input", window.SupplierModule.handleInput);
}

window.SupplierModule = {
    cache: [],
    editingId: null,
    instance: null,

    init: function() {
        this.handleClick = this.handleClick.bind(this);
        this.handleInput = this.handleInput.bind(this);
        
        document.addEventListener("click", this.handleClick);
        document.addEventListener("input", this.handleInput);
    },

    getModal: function() {
        const el = document.getElementById("supplierFormModal");
        if (!el) return null;
        if (!this.instance) this.instance = new bootstrap.Modal(el, { backdrop: 'static' });
        return this.instance;
    },

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
        const errorMsg = document.getElementById("error-message-supplier");
        if(errorMsg) errorMsg.style.display = "none";
    },

    load: async function() {
        const tbody = document.getElementById("supplier-table-body");
        if (!tbody) return;

        try {
            // USANDO EL NUEVO HANDLER ESPECÍFICO
            this.cache = await window.electronAPI.invoke("suppliers:list");
            this.render(this.cache);
        } catch (e) {
            // Error silencioso en terminal, ya no imprime la query
        }
    },

    render: function(data) {
        const tbody = document.getElementById("supplier-table-body");
        if (!tbody) return;
        
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No se encontraron resultados</td></tr>`;
            return;
        }
        tbody.innerHTML = data.map(s => this.generateRowHTML(s)).join('');
    },

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

        // OBJETO MAPEADO PARA EL HANDLER
        const supplierData = {
            id: this.editingId,
            nombre_empresa: f.empresa.value.trim(),
            contacto_nombre: f.contacto.value.trim(),
            email: f.email.value.trim().toLowerCase(),
            telefono: f.tel.value.replace(/\D/g, ""),
            rfc: f.rfc.value.trim().toUpperCase(),
            direccion: f.dir.value.trim(),
            estatus: f.est.checked ? 1 : 0
        };

        try {
            await window.electronAPI.invoke("suppliers:save", supplierData);
            this.getModal().hide();
            await this.load();
        } catch (e) {
            const errorMsg = document.getElementById("error-message-supplier");
            if(errorMsg) {
                errorMsg.textContent = "* Error al guardar: El RFC o Nombre ya existen.";
                errorMsg.style.display = "block";
            }
        }
    },

    handleClick: function(e) {
        const btnNew = e.target.closest("#btn-new-supplier");
        const btnEdit = e.target.closest(".btn-edit-supplier");
        const btnSave = e.target.closest("#btn-save-supplier");

        if (btnNew) {
            this.resetForm();
            this.getModal().show();
        }

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

        if (btnSave) this.save();
    },

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
        if (e.target.classList.contains("is-invalid")) e.target.classList.remove("is-invalid");
    }
};

window.SupplierModule.init();
window.SupplierModule.load();
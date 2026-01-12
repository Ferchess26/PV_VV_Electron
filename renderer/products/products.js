/**
 * PRODUCTS.JS - GESTIÓN DE INVENTARIO
 */

if (window.ProductsModule) {
    document.removeEventListener("click", window.ProductsModule.handleClick);
    document.removeEventListener("input", window.ProductsModule.handleInput);
    document.removeEventListener("change", window.ProductsModule.handleChange);
}

window.ProductsModule = {
    cache: [],
    editingId: null,
    formModalInstance: null,

    init: function() {
        this.handleClick = this.handleClick.bind(this);
        this.handleInput = this.handleInput.bind(this);
        this.handleChange = this.handleChange.bind(this);
        
        document.addEventListener("click", this.handleClick);
        document.addEventListener("input", this.handleInput);
        document.addEventListener("change", this.handleChange);
    },

    getFormModal: function() {
        const el = document.getElementById("productFormModal");
        if (!el) return null;
        if (!this.formModalInstance) {
            this.formModalInstance = new bootstrap.Modal(el, { backdrop: 'static' });
        }
        return this.formModalInstance;
    },

    load: async function() {
        const loader = document.getElementById("products-loading");
        const tableEl = document.getElementById("products-table-main");
        const tbody = document.getElementById("products-table-body");

        if (loader) loader.style.display = "block";
        if (tableEl) tableEl.style.opacity = "0.2";

        try {
            // Cargar Selects primero
            await this.loadDependencies();

            const sql = `SELECT p.*, c.nombre as cat_nombre, u.abreviatura as uni_abreviatura 
                         FROM products p 
                         LEFT JOIN categories c ON p.id_categoria = c.id
                         LEFT JOIN unidades_medida u ON p.id_unidad_medida = u.id
                         WHERE p.estatus >= 0 ORDER BY p.nombre ASC`;

            this.cache = await window.electronAPI.invoke("db-query", { sql });
            this.render(this.cache);
        } catch (e) { 
            console.error(e);
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error al cargar inventario</td></tr>`;
        } finally {
            if (loader) loader.style.display = "none";
            if (tableEl) tableEl.style.opacity = "1";
        }
    },

    loadDependencies: async function() {
        const cats = await window.electronAPI.invoke("db-query", { sql: "SELECT * FROM categories ORDER BY nombre" });
        const unis = await window.electronAPI.invoke("db-query", { sql: "SELECT * FROM unidades_medida ORDER BY nombre" });
        
        const catSelect = document.getElementById("prod-category");
        const uniSelect = document.getElementById("prod-unit");
        const filterCat = document.getElementById("filter-category");

        if(catSelect) catSelect.innerHTML = cats.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
        if(uniSelect) uniSelect.innerHTML = unis.map(u => `<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`).join('');
        if(filterCat) filterCat.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
    },

    render: function(data) {
        const tbody = document.getElementById("products-table-body");
        if (!tbody) return;

        tbody.innerHTML = data.map(p => {
            let stockClass = "";
            if (p.stock_actual <= 0) stockClass = "stock-empty";
            else if (p.stock_actual <= p.stock_minimo) stockClass = "stock-low";

            return `
            <tr>
                <td class="small text-muted">${p.codigo_barras || "N/A"}</td>
                <td class="fw-bold">${p.nombre}</td>
                <td><span class="badge bg-light text-dark border">${p.cat_nombre || 'S/C'}</span></td>
                <td class="fw-bold text-primary">$ ${p.precio_venta.toFixed(2)}</td>
                <td><span class="${stockClass}">${p.stock_actual} ${p.uni_abreviatura}</span></td>
                <td><span class="badge ${p.estatus == 1 ? "bg-success" : "bg-secondary"}">${p.estatus == 1 ? "Activo" : "Inactivo"}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-warning btn-edit-prod" data-id="${p.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>`;
        }).join('') || '<tr><td colspan="7" class="text-center">No hay productos</td></tr>';
    },

    save: async function() {
        const modal = document.getElementById("productFormModal");
        const errDiv = document.getElementById("error-message-prod");
        
        const data = {
            barcode: modal.querySelector("#prod-barcode").value.trim(),
            name: modal.querySelector("#prod-name").value.trim(),
            cat: modal.querySelector("#prod-category").value,
            unit: modal.querySelector("#prod-unit").value,
            pBuy: parseFloat(modal.querySelector("#prod-price-buy").value) || 0,
            pSell: parseFloat(modal.querySelector("#prod-price-sell").value) || 0,
            stock: parseInt(modal.querySelector("#prod-stock").value) || 0,
            stockMin: parseInt(modal.querySelector("#prod-stock-min").value) || 0,
            estatus: modal.querySelector("#prod-estatus").checked ? 1 : 0
        };

        if (!data.name || !data.pSell) {
            errDiv.textContent = "* Nombre y Precio Venta son obligatorios.";
            errDiv.style.display = "block";
            return;
        }

        const params = [data.barcode, data.name, data.cat, data.unit, data.pBuy, data.pSell, data.stock, data.stockMin, data.estatus];
        const sql = this.editingId 
            ? `UPDATE products SET codigo_barras=?, nombre=?, id_categoria=?, id_unidad_medida=?, precio_compra=?, precio_venta=?, stock_actual=?, stock_minimo=?, estatus=? WHERE id = ${this.editingId}`
            : `INSERT INTO products (codigo_barras, nombre, id_categoria, id_unidad_medida, precio_compra, precio_venta, stock_actual, stock_minimo, estatus) VALUES (?,?,?,?,?,?,?,?,?)`;

        try {
            await window.electronAPI.invoke("db-run", { sql, params });
            this.getFormModal().hide();
            await this.load();
        } catch (e) {
            errDiv.textContent = "* Error: El código de barras ya existe.";
            errDiv.style.display = "block";
        }
    },

    handleClick: function(e) {
        const btnEdit = e.target.closest(".btn-edit-prod");
        const btnNew = e.target.closest("#btn-new-product");
        const btnSave = e.target.closest("#btn-save-product");

        if (btnNew || btnEdit) {
            this.editingId = btnEdit ? Number(btnEdit.dataset.id) : null;
            const modal = document.getElementById("productFormModal");
            document.getElementById("error-message-prod").style.display = "none";
            document.getElementById("prod-img-preview").innerHTML = '<i class="fas fa-image fa-3x text-muted"></i>';
            
            if (!this.editingId) {
                document.getElementById("productFormTitle").textContent = "Nuevo Producto";
                document.getElementById("form-product-core").reset();
                document.getElementById("prod-utility-badge").textContent = "$ 0.00";
            } else {
                const p = this.cache.find(x => x.id === this.editingId);
                if(p) {
                    document.getElementById("productFormTitle").textContent = `Editar: ${p.nombre}`;
                    document.getElementById("prod-barcode").value = p.codigo_barras || "";
                    document.getElementById("prod-name").value = p.nombre;
                    document.getElementById("prod-category").value = p.id_categoria;
                    document.getElementById("prod-unit").value = p.id_unidad_medida;
                    document.getElementById("prod-price-buy").value = p.precio_compra;
                    document.getElementById("prod-price-sell").value = p.precio_venta;
                    document.getElementById("prod-stock").value = p.stock_actual;
                    document.getElementById("prod-stock-min").value = p.stock_minimo;
                    document.getElementById("prod-estatus").checked = p.estatus == 1;
                    this.calculateUtility();
                }
            }
            this.getFormModal().show();
        }

        if (btnSave) this.save();
    },

    handleInput: function(e) {
        if (["prod-price-buy", "prod-price-sell"].includes(e.target.id)) this.calculateUtility();
        
        if (e.target.id === "product-search") {
            const term = e.target.value.toLowerCase();
            const filtered = this.cache.filter(p => 
                p.nombre.toLowerCase().includes(term) || 
                (p.codigo_barras && p.codigo_barras.includes(term)) ||
                (p.cat_nombre && p.cat_nombre.toLowerCase().includes(term))
            );
            this.render(filtered);
        }
    },

    handleChange: function(e) {
        if (e.target.id === "filter-category") {
            const val = e.target.value;
            const filtered = val === "" ? this.cache : this.cache.filter(p => p.id_categoria == val);
            this.render(filtered);
        }
    },

    calculateUtility: function() {
        const buy = parseFloat(document.getElementById("prod-price-buy").value) || 0;
        const sell = parseFloat(document.getElementById("prod-price-sell").value) || 0;
        const util = sell - buy;
        const badge = document.getElementById("prod-utility-badge");
        badge.textContent = `$ ${util.toFixed(2)}`;
        badge.className = `form-control bg-light text-center fw-bold ${util >= 0 ? 'text-success' : 'text-danger'}`;
    }
};

// Iniciar
window.ProductsModule.init();

// Carga al abrir modal
document.addEventListener("shown.bs.modal", (e) => {
    if (e.target.id === "productsModal") window.ProductsModule.load();
});
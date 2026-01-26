window.ProductsModule = {
    modalForm: null,
    editingId: null,
    cache: [],
    selectedImage: null,
    currentImagePath: null,

    init: async function () {
        this.modalForm = bootstrap.Modal.getOrCreateInstance(
            document.getElementById("productFormModal"),
            { backdrop: false }
        );

        document.getElementById("btn-new-product").addEventListener("click", () => this.openForm());
        document.getElementById("btn-save-product").addEventListener("click", (e) => {
            e.preventDefault();
            this.save();
        });

        const fileInput = document.getElementById("prod-file-input");
        fileInput.setAttribute("accept", "image/jpeg, image/png, image/webp");
        fileInput.addEventListener("change", e => this.handleImage(e));

        document.getElementById("product-search").addEventListener("input", e => this.search(e.target.value));

        document.getElementById("btn-add-category").addEventListener("click", () => {
            const box = document.getElementById("new-category-box");
            box.classList.toggle("d-none");
            document.getElementById("new-category-name").focus();
        });

        document.getElementById("btn-add-unit").addEventListener("click", () => {
            const box = document.getElementById("new-unit-box");
            box.classList.toggle("d-none");
            document.getElementById("new-unit-name").focus();
        });

        document.getElementById("btn-save-category").addEventListener("click", () => this.quickSaveCategory());
        document.getElementById("btn-save-unit").addEventListener("click", () => this.quickSaveUnit());

        const fields = ["prod-name", "prod-price-sell", "prod-category", "prod-unit"];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener("input", () => el.classList.remove("is-invalid"));
                el.addEventListener("change", () => el.classList.remove("is-invalid"));
            }
        });

        await this.loadDependencies();
        await this.loadProducts();
    },

    showToast: async function(msg) {
        try {
            const response = await fetch('../../helpers/alert_error.html');
            const alertHtml = await response.text();
            const alertWrapper = document.createElement('div');
            alertWrapper.innerHTML = alertHtml;
            const alertElement = alertWrapper.querySelector('.alert');
            alertElement.classList.add('alert-danger', 'alert-fixed-bottom-left', 'fade');
            
            alertElement.style.zIndex = "9999";
            alertElement.style.position = "fixed";
            
            alertElement.textContent = msg;
            document.body.appendChild(alertElement);
            setTimeout(() => { alertElement.classList.add('show'); }, 10);
            setTimeout(() => {
                alertElement.classList.remove('show');
                setTimeout(() => { alertElement.remove(); }, 500);
            }, 2500);
        } catch (e) { 
            /* Error silencioso */ 
        }
    },

    handleImage(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast("Solo se permiten archivos de imagen.");
            e.target.value = "";
            return;
        }

        this.selectedImage = file;
        const reader = new FileReader();
        reader.onload = ev => {
            document.getElementById("prod-img-preview").innerHTML = `
                <img src="${ev.target.result}" class="img-fluid rounded border" 
                style="width: 140px; height: 140px; object-fit: cover;">
            `;
        };
        reader.readAsDataURL(file);
    },

    loadDependencies: async function () {
        const cats = await window.electronAPI.invoke("categories:list");
        const units = await window.electronAPI.invoke("units:list");
        
        document.getElementById("prod-category").innerHTML = `<option value="">----------</option>` + cats.map(c => `<option value="${c.id}">${c.nombre}</option>`).join("");
        document.getElementById("prod-unit").innerHTML = `<option value="">----------</option>` + units.map(u => `<option value="${u.id}">${u.abreviatura}</option>`).join("");
    },

    quickSaveCategory: async function() {
        const input = document.getElementById("new-category-name");
        const name = input.value.trim();
        if(!name) return;
        
        await window.electronAPI.invoke("categories:quick-save", name);
        input.value = "";
        document.getElementById("new-category-box").classList.add("d-none");
        await this.loadDependencies();
    },

    quickSaveUnit: async function() {
        const nameInput = document.getElementById("new-unit-name");
        const abbrInput = document.getElementById("new-unit-abbr");
        const name = nameInput.value.trim();
        const abbr = abbrInput.value.trim();
        if(!name || !abbr) return;
        
        await window.electronAPI.invoke("units:quick-save", { nombre: name, abreviatura: abbr });
        nameInput.value = ""; abbrInput.value = "";
        document.getElementById("new-unit-box").classList.add("d-none");
        await this.loadDependencies();
    },

    loadProducts: async function () {
        const rows = await window.electronAPI.invoke("products:list");
        this.cache = rows;
        this.render(rows);
    },

    render: function (rows) {
        document.getElementById("products-table-body").innerHTML = rows.map(p => `
            <tr>
                <td>${p.codigo_barras || "—"}</td>
                <td class="fw-bold">${p.nombre}</td>
                <td>${p.cat || "—"}</td>
                <td>$${p.precio_venta.toFixed(2)}</td>
                <td>
                    <span class="${p.stock_actual <= 0 ? 'stock-empty' : p.stock_actual <= p.stock_minimo ? 'stock-low' : ''}">
                        ${p.stock_actual} ${p.uni || ""}
                    </span>
                </td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-warning" onclick="ProductsModule.edit(${p.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join("");
    },

    openForm: function () {
        this.editingId = null;
        this.selectedImage = null;
        this.currentImagePath = null;
        document.getElementById("form-product-core").reset();
        document.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));
        document.getElementById("prod-file-input").value = "";
        document.getElementById("new-category-box").classList.add("d-none");
        document.getElementById("new-unit-box").classList.add("d-none");
        document.getElementById("prod-img-preview").innerHTML = `<i class="fas fa-image fa-3x text-muted"></i>`;
        document.getElementById("productFormTitle").innerText = "Nuevo Producto";
        this.modalForm.show();
    },

    edit: function (id) {
        const p = this.cache.find(x => x.id === id);
        if (!p) return;
        this.editingId = id;
        this.selectedImage = null;
        this.currentImagePath = p.imagen_path || null;
        document.getElementById("form-product-core").reset();
        document.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));

        document.getElementById("prod-barcode").value = p.codigo_barras || "";
        document.getElementById("prod-name").value = p.nombre;
        document.getElementById("prod-desc").value = p.descripcion || "";
        document.getElementById("prod-category").value = p.id_categoria || "";
        document.getElementById("prod-unit").value = p.id_unidad_medida || "";
        document.getElementById("prod-price-buy").value = p.precio_compra || 0;
        document.getElementById("prod-price-sell").value = p.precio_venta;
        document.getElementById("prod-stock").value = p.stock_actual || 0;
        document.getElementById("prod-stock-min").value = p.stock_minimo || 5;
        document.getElementById("prod-estatus").checked = p.estatus == 1;
        document.getElementById("productFormTitle").innerText = "Editar Producto";

        const preview = document.getElementById("prod-img-preview");
        if (this.currentImagePath) {
            const cleanPath = this.currentImagePath.replace(/\\/g, "/");
            preview.innerHTML = `<img src="media://${cleanPath}" class="img-fluid rounded border" style="width: 140px; height: 140px; object-fit: cover;">`;
        } else {
            preview.innerHTML = `<i class="fas fa-image fa-3x text-muted"></i>`;
        }
        this.modalForm.show();
    },

    save: async function () {
        const productName = document.getElementById("prod-name").value.trim();
        const priceSell = document.getElementById("prod-price-sell").value;
        const category = document.getElementById("prod-category").value;
        const unit = document.getElementById("prod-unit").value;

        let hasError = false;
        if (!productName) { document.getElementById("prod-name").classList.add("is-invalid"); hasError = true; }
        if (!priceSell) { document.getElementById("prod-price-sell").classList.add("is-invalid"); hasError = true; }
        if (!category) { document.getElementById("prod-category").classList.add("is-invalid"); hasError = true; }
        if (!unit) { document.getElementById("prod-unit").classList.add("is-invalid"); hasError = true; }

        if (hasError) {
            this.showToast("Por favor, llene los campos obligatorios marcados en rojo.");
            return;
        }

        let imagePath = this.currentImagePath;
        if (this.selectedImage) {
            try {
                imagePath = await window.electronAPI.invoke("save-product-image", {
                    sourcePath: this.selectedImage.path,
                    productName: productName
                });
            } catch (err) {
                this.showToast("Error al procesar la imagen.");
                return;
            }
        }

        const productData = {
            id: this.editingId,
            codigo_barras: document.getElementById("prod-barcode").value || null,
            nombre: productName,
            descripcion: document.getElementById("prod-desc").value || null,
            id_categoria: category ? Number(category) : null,
            id_unidad_medida: unit ? Number(unit) : null,
            precio_compra: Number(document.getElementById("prod-price-buy").value || 0),
            precio_venta: Number(priceSell),
            stock_actual: Number(document.getElementById("prod-stock").value || 0),
            stock_minimo: Number(document.getElementById("prod-stock-min").value || 5),
            estatus: document.getElementById("prod-estatus").checked ? 1 : 0,
            imagen_path: imagePath
        };

        await window.electronAPI.invoke("products:save", productData);
        this.modalForm.hide();
        await this.loadProducts();
    },

    search: function (q) {
        q = q.toLowerCase();
        this.render(this.cache.filter(p => p.nombre.toLowerCase().includes(q) || (p.codigo_barras || "").includes(q)));
    }
};

ProductsModule.init();
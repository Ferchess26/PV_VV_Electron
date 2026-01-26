/**
 * =========================================================
 * PROFILE.JS - LÓGICA COMPLETA (TOAST SUAVE A LA IZQUIERDA)
 * =========================================================
 */

const ProfileModule = {
    currentUserId: null,
    selectedPhoto: null,
    currentPhotoPath: null,

    getInputs: () => ({
        nombre: document.getElementById('modal-full-name'),
        paterno: document.getElementById('modal-paterno'),
        materno: document.getElementById('modal-materno'),
        email: document.getElementById('modal-email'),
        telefono: document.getElementById('modal-phone'),
        username: document.getElementById('modal-username'),
        rol: document.getElementById('modal-role'),
        password: document.getElementById('modal-password'),
        confirm: document.getElementById('modal-confirm-password'),
        photoPreview: document.getElementById('modal-profile-photo'),
        passSection: document.getElementById('pass-section')
    }),

    /**
     * Muestra notificaciones con transición SUAVE a la IZQUIERDA
     */
    showToast: async function (msg, type = 'error') {
        try {
            const fileName = type === 'success' ? 'alert_success.html' : 'alert_error.html';
            const response = await fetch(`../../helpers/${fileName}`);
            const alertHtml = await response.text();

            const alertWrapper = document.createElement('div');
            alertWrapper.innerHTML = alertHtml;
            const alertElement = alertWrapper.querySelector('.alert');

            if (type === 'success') {
                alertElement.classList.remove('alert-secondary');
                alertElement.classList.add('alert-success');
            }

            // Estilos iniciales para la transición (Invisible y un poco más abajo)
            Object.assign(alertElement.style, {
                zIndex: "11000",
                position: "fixed",
                bottom: "10px", // Inicia más abajo
                left: "30px",
                right: "auto",
                minWidth: "280px",
                margin: "0",
                boxShadow: "0 5px 15px rgba(0,0,0,0.2)",
                opacity: "0",
                transition: "all 0.4s ease-in-out", // TRANSICIÓN SUAVE
                transform: "translateY(20px)"      // EFECTO DE SUBIDA
            });

            const textNode = alertElement.querySelector('span') || alertElement;
            textNode.textContent = msg;

            document.body.appendChild(alertElement);

            // Disparar la animación suave
            setTimeout(() => {
                alertElement.style.opacity = "1";
                alertElement.style.bottom = "30px";
                alertElement.style.transform = "translateY(0)";
            }, 50);

            // Tiempo de permanencia rápido: 1.8 segundos
            setTimeout(() => {
                alertElement.style.opacity = "0";
                alertElement.style.transform = "translateY(-10px)"; // Desvanece hacia arriba
                setTimeout(() => alertElement.remove(), 400);
            }, 1800);

        } catch (e) {
            console.error("Error al cargar el Toast:", e);
        }
    },

    loadData: async function () {
        const fields = this.getInputs();
        try {
            // 1. Obtenemos la sesión actual
            const session = await window.electronAPI.invoke("get-user-session");

            if (session) {
                this.currentUserId = session.id;

                // 2. Consultamos a la base de datos para asegurar datos frescos
                const users = await window.electronAPI.invoke("db-query", {
                    sql: "SELECT * FROM users WHERE id = ?",
                    params: [this.currentUserId]
                });

                if (users && users.length > 0) {
                    const u = users[0];
                    this.currentPhotoPath = u.foto || null;

                    // Llenado de inputs editables
                    fields.nombre.value = u.nombre || '';
                    fields.paterno.value = u.apellido_paterno || '';
                    fields.materno.value = u.apellido_materno || '';
                    fields.email.value = u.email || '';
                    fields.telefono.value = u.telefono || '';

                    // CORRECCIÓN: Mostrar Usuario y Rol
                    // Si 'u.username' existe en la BD, lo usamos directamente
                    document.getElementById('modal-username-text').textContent = u.username || "No definido";

                    // El rol normalmente viene de la sesión o un JOIN en la BD
                    document.getElementById('modal-role-text').textContent = session.rol_nombre || "Usuario";

                    if (this.currentPhotoPath) {
                        fields.photoPreview.src = `media://${this.currentPhotoPath.replace(/\\/g, "/")}`;
                    }
                }
            }
        } catch (err) {
            console.error("Error al cargar perfil:", err);
            this.showToast("No se pudieron cargar los datos de sesión.");
        }
    },

    update: async function () {
        const fields = this.getInputs();
        if (!this.currentUserId) return;

        if (!fields.nombre.value.trim() || !fields.paterno.value.trim()) {
            this.showToast("Nombre y apellido son requeridos.");
            return;
        }

        if (fields.password.value && fields.password.value !== fields.confirm.value) {
            this.showToast("Las contraseñas no coinciden.");
            return;
        }

        let photoPath = this.currentPhotoPath;
        if (this.selectedPhoto) {
            try {
                photoPath = await window.electronAPI.invoke("save-user-photo", {
                    sourcePath: this.selectedPhoto.path
                });
            } catch (err) {
                this.showToast("Error procesando imagen.");
                return;
            }
        }

        const params = [
            fields.nombre.value.trim(), fields.paterno.value.trim(),
            fields.materno.value.trim(), fields.email.value.trim(),
            fields.telefono.value.trim(), photoPath
        ];

        let sql = `UPDATE users SET nombre=?, apellido_paterno=?, apellido_materno=?, email=?, telefono=?, foto=?`;
        if (fields.password.value) {
            sql += `, password=? WHERE id=?`;
            params.push(fields.password.value, this.currentUserId);
        } else {
            sql += ` WHERE id=?`;
            params.push(this.currentUserId);
        }

        try {
            await window.electronAPI.invoke("db-run", { sql, params });
            if (typeof window.syncUserNavbar === 'function') {
                await window.syncUserNavbar();
            }
            this.showToast("¡Perfil Actualizado con éxito!", "success");

            fields.password.value = "";
            fields.confirm.value = "";
            if (fields.passSection) fields.passSection.classList.add('d-none');
            await this.loadData();
        } catch (error) {
            this.showToast("Error al guardar cambios.");
        }
    },

    handleImage: function (e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        this.selectedPhoto = file;
        const reader = new FileReader();
        reader.onload = ev => document.getElementById("modal-profile-photo").src = ev.target.result;
        reader.readAsDataURL(file);
    }
};

/**
 * --- EVENTOS ---
 */
document.addEventListener('shown.bs.modal', (e) => {
    if (e.target.id === 'userProfileModal') ProfileModule.loadData();
});

document.addEventListener('click', (e) => {
    const btn = e.target.id ? e.target : e.target.closest('button');
    if (!btn) return;
    if (btn.id === 'btn-upload-photo') document.getElementById('photo-upload').click();
    if (btn.id === 'btn-save-profile') { e.preventDefault(); ProfileModule.update(); }
    if (btn.id === 'btn-toggle-pass') {
        const section = document.getElementById('pass-section');
        if (section) section.classList.toggle('d-none');
    }
});

document.addEventListener('change', (e) => {
    if (e.target.id === 'photo-upload') ProfileModule.handleImage(e);
});
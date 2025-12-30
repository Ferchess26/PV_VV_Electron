/**
 * =========================================================
 * PROFILE.JS - LÓGICA AISLADA
 * =========================================================
 */

// Usamos un objeto para evitar que las variables choquen con otros archivos
const ProfileModule = {
    currentUserId: null,
    
    // 1. SELECTORES DINÁMICOS
    getInputs: () => ({
        fullName: document.getElementById('modal-full-name'),
        email: document.getElementById('modal-email'),
        username: document.getElementById('modal-username'),
        rol: document.getElementById('modal-role'),
        password: document.getElementById('modal-password'),
        confirm: document.getElementById('modal-confirm-password'),
        saveBtn: document.getElementById('btn-save-changes')
    }),

    // 2. CARGA DE DATOS
    loadData: async function() {
        const fields = this.getInputs();
        
        // Si no existe el campo nombre, el modal no está listo
        if (!fields.fullName) return;

        try {
            const session = await window.electronAPI.invoke("get-user-session");
            if (session) {
                this.currentUserId = session.id;
                fields.fullName.value = session.nombre || '';
                fields.email.value = session.email || '';
                fields.username.value = session.username || '';
                fields.rol.value = session.rol || '';

                // Foto
                const btnFoto = document.getElementById("btn-upload-photo");
                if (btnFoto) {
                    const puede = (session.permisos || []).some(p => p.id === 8);
                    btnFoto.style.display = puede ? "block" : "none";
                }
            }
        } catch (err) {
            console.error("Error cargando perfil:", err);
        }
    },

    // 3. ACTUALIZACIÓN
    update: async function() {
        const fields = this.getInputs();
        if (!this.currentUserId) return;

        if (fields.password.value && fields.password.value !== fields.confirm.value) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        const userData = {
            id: this.currentUserId,
            nombre: fields.fullName.value,
            email: fields.email.value,
            password: fields.password.value
        };

        try {
            const result = await window.electronAPI.invoke("update-user-profile", userData);
            if (result && result.changes === 1) {
                alert("Perfil actualizado con éxito.");
                fields.password.value = '';
                fields.confirm.value = '';
            }
        } catch (error) {
            alert("Error al guardar cambios.");
        }
    }
};

// --- EVENTOS ---

// Detectar apertura del modal de forma segura
document.addEventListener('shown.bs.modal', (e) => {
    // Solo si el modal tiene el campo de username (identificador único de perfil)
    if (e.target.querySelector('#modal-username')) {
        ProfileModule.loadData();
    }
});

// Guardar cambios
document.addEventListener('click', (e) => {
    if (e.target.id === 'btn-save-changes' || e.target.closest('#btn-save-changes')) {
        ProfileModule.update();
    }
});

// Ejecución inicial por si ya está abierto
(async () => {
    await ProfileModule.loadData();
})();
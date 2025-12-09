/**
 * =========================================================
 * PROFILE.JS - LÓGICA DEL MÓDULO PERFIL DE USUARIO
 * =========================================================
 */

// ----------------------------------------------------
// I. SELECTORES
// ----------------------------------------------------
const fullNameInput = document.getElementById('modal-full-name');
const emailInput = document.getElementById('modal-email');
const usernameInput = document.getElementById('modal-username');
const rolInput = document.getElementById('modal-role');
const passwordInput = document.getElementById('modal-password'); 
const confirmPasswordInput = document.getElementById('modal-confirm-password'); 
const saveButton = document.getElementById('btn-save-changes'); // <-- ¡Asegúrate de que este ID exista!

let currentUserId = null; // Variable para almacenar el ID del usuario actual

// ----------------------------------------------------
// II. FUNCIONES
// ----------------------------------------------------

/**
 * Valida los campos y envía la solicitud de actualización al Main Process.
 */
async function handleUpdate() {
    if (!currentUserId) {
        alert("Error: No se ha podido identificar el ID de usuario.");
        return;
    }

    // 1. Recolectar datos
    const newPassword = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    
    // 2. Validación de Contraseñas
    if (newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
            alert("Error de Validación: Las contraseñas no coinciden.");
            return;
        }
        if (newPassword.length < 6) { // Ejemplo de regla de validación
            alert("Error de Validación: La contraseña debe tener al menos 6 caracteres.");
            return;
        }
    }

    const userData = {
        id: currentUserId,
        nombre: fullNameInput.value,
        email: emailInput.value,
        password: newPassword, // Solo se envía si se ha cambiado
    };

    // 3. Enviar a Main Process
    try {
        const result = await window.electronAPI.invoke("update-user-profile", userData);

        if (result && result.changes === 1) {
            alert("Éxito: ¡Perfil actualizado correctamente!");
            passwordInput.value = '';
            confirmPasswordInput.value = '';
        } else {
            alert("Advertencia: No se realizaron cambios, o la actualización falló.");
        }

    } catch (error) {
        alert(`Error al actualizar: ${error.message}`);
        console.error("Error al actualizar el perfil:", error);
    }
}


// ----------------------------------------------------
// III. INICIALIZACIÓN (IIFE)
// ----------------------------------------------------

(async () => {
    try {
        const session = await window.electronAPI.invoke("get-user-session");
        
        if (!session || !session.username) {
            alert("Error: Sesión o datos de usuario no válidos.");
            return;
        }

        // 1. Almacenar el ID del usuario
        currentUserId = session.id; 

        // 2. Rellenar campos
        fullNameInput.value = session.nombre || '';
        emailInput.value = session.email || '';
        usernameInput.value = session.username || '';
        rolInput.value = session.rol || '';
        
        // 3. Permisos
        const permisos = session.permisos || [];
        
        // Lógica para verificar el ID 8 (Cambiar Foto) - Permiso de ejemplo
        const btnCambiarFoto = document.getElementById("btn-upload-photo");
        const puedeCambiarFoto = permisos.some(p => p.id === 8); 

        if (btnCambiarFoto) {
             if (!puedeCambiarFoto) {
                 btnCambiarFoto.style.display = "none";
                 console.warn("INFO: Botón de foto ocultado. Permiso ID 8 no encontrado.");
             }
         }
        
        if (saveButton) {
            saveButton.addEventListener('click', handleUpdate);
        }

    } catch (err) {
        alert("ERROR CRÍTICO: Falló al cargar la sesión. Revisa la consola (F12).");
        console.error("ERROR CRÍTICO EN PROFILE.JS: Falló al intentar cargar la sesión o ejecutar la lógica inicial:", err);
    }
})();
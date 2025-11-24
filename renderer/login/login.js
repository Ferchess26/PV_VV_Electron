// login.js (fragmento de la función login)

async function login() { 
    const userField = document.getElementById("user");
    const passField = document.getElementById("pass");
    const errorDisplay = document.getElementById("error");

    // 1. Limpiar todos los errores al inicio
    userField.classList.remove('input-error');
    passField.classList.remove('input-error');
    errorDisplay.textContent = "";

    const user = userField.value.trim();
    const pass = passField.value.trim();
    let hasError = false;

    if (user === "" || pass === "") {
        errorDisplay.textContent = "Llene ambos campos.";
        if (user === "") userField.classList.add('input-error');
        if (pass === "") passField.classList.add('input-error');
        return;
    }

    try {
        const loginSuccessful = await window.electronAPI.invoke("login", { user, pass });
        
        if (loginSuccessful) {
            window.electronAPI.send("login-success");
        } else {
            errorDisplay.textContent = "Credenciales incorrectas.";
            // 2. Aplicar error a ambos campos si las credenciales fallan
            userField.classList.add('input-error');
            passField.classList.add('input-error');
        }
    } catch (e) {
        console.error("Error en el login:", e);
        errorDisplay.textContent = "Ocurrió un error en el sistema de login.";
    }
}
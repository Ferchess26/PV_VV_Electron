// login.js

async function login() { 
    const userField = document.getElementById("user");
    const passField = document.getElementById("pass");
    const errorDisplay = document.getElementById("error");

    // limpiar errores
    userField.classList.remove('input-error');
    passField.classList.remove('input-error');
    errorDisplay.textContent = "";

    const user = userField.value.trim();
    const pass = passField.value.trim();

    if (user === "" || pass === "") {
        errorDisplay.textContent = "Llene ambos campos.";
        if (user === "") userField.classList.add('input-error');
        if (pass === "") passField.classList.add('input-error');
        return;
    }

    try {
        const session = await window.electronAPI.invoke("login", { user, pass });

        if (session) {

            // 🔥 ver si SI trae los permisos
            console.log("=== SESIÓN DEL USUARIO ===");
            console.log(session);

            console.log("=== PERMISOS DEL USUARIO ===");
            console.table(session.permisos);

            // navegar al home
            window.electronAPI.send("login-success");
        } else {
            errorDisplay.textContent = "Credenciales incorrectas.";
            userField.classList.add('input-error');
            passField.classList.add('input-error');
        }
    } catch (e) {
        console.error("Error en el login:", e);
        errorDisplay.textContent = "Ocurrió un error en el sistema de login.";
    }
}


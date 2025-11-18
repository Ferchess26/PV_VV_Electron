function login() {
  const user = document.getElementById("user").value.trim();
  const pass = document.getElementById("pass").value.trim();
  const error = document.getElementById("error");

  if (user === "" || pass === "") {
    error.textContent = "Llene ambos campos.";
    return;
  }

  window.db.query("SELECT * FROM users WHERE username = ? AND password = ?", [user, pass])
  .then(rows => {
    if (rows.length > 0) {
      window.electronAPI.send("login-success");
    } else {
      error.textContent = "Credenciales incorrectas.";
    }
  });

  error.textContent = "Credenciales incorrectas.";
}

// --- Controles de ventanita del LOGIN ---
document.getElementById("min-btn").addEventListener("click", () => {
  window.windowControls.minimize();
});

document.getElementById("max-btn").addEventListener("click", () => {
  window.windowControls.maximize();
});

document.getElementById("close-btn").addEventListener("click", () => {
  window.windowControls.close();
});

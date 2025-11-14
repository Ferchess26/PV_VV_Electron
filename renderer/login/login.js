function login() {
  const user = document.getElementById("user").value.trim();
  const pass = document.getElementById("pass").value.trim();
  const error = document.getElementById("error");

  if (user === "" || pass === "") {
    error.textContent = "Llene ambos campos.";
    return;
  }

  if (user === "admin" && pass === "123") {
    window.location.href = "../home/home.html"; 
  } else {
    error.textContent = "Credenciales incorrectas.";
  }

  document.getElementById("min-btn").addEventListener("click", () => {
  window.windowControls.minimize();
});

document.getElementById("max-btn").addEventListener("click", () => {
  window.windowControls.maximize();
});

document.getElementById("close-btn").addEventListener("click", () => {
  window.windowControls.close();
});

}

// ======================================================
//  SISTEMA DE VENTAS - HOME.JS
// ======================================================

// TOTAL GENERAL DE LA VENTA
let total = 0;

// ======================================================
//  FUNCIÓN PARA AGREGAR PRODUCTO A LA TABLA
// ======================================================
function addProduct(code, name, qty, price) {
    const table = document.getElementById("product-table");

    const row = document.createElement("tr");
    const subtotal = qty * price;

    row.innerHTML = `
        <td>${code}</td>
        <td>${name}</td>
        <td>${qty}</td>
        <td>$${price.toFixed(2)}</td>
        <td>$${subtotal.toFixed(2)}</td>
    `;

    table.appendChild(row);

    // Actualiza total
    total += subtotal;
    document.getElementById("total").textContent = `$${total.toFixed(2)}`;
}

// ======================================================
//  RELOJ EN TIEMPO REAL
// ======================================================
function updateClock() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, "0");
    const m = now.getMinutes().toString().padStart(2, "0");
    const s = now.getSeconds().toString().padStart(2, "0");

    document.getElementById("clock").textContent = `${h}:${m}:${s}`;
}

// Iniciar el reloj
setInterval(updateClock, 1000);
updateClock();

// ======================================================
//  EXPONER FUNCIONES PARA USO DESDE EL HTML
// ======================================================
window.addProduct = addProduct;

const { ipcMain } = require('electron');

function setupProductsHandlers(db) {

  // ========================================
  // LISTAR PRODUCTOS (CON JOIN A CAT Y UNI)
  // ========================================
  ipcMain.handle("products:list", () => {
    try {
      return db.prepare(`
                SELECT 
                    p.*, 
                    c.nombre AS cat, 
                    u.abreviatura AS uni
                FROM products p
                LEFT JOIN categories c ON p.id_categoria = c.id
                LEFT JOIN unidades_medida u ON p.id_unidad_medida = u.id
                ORDER BY p.nombre ASC
            `).all();
    } catch (error) {
      throw error;
    }
  });

  // ========================================
  // GUARDAR O ACTUALIZAR PRODUCTO
  // ========================================
  ipcMain.handle("products:save", (event, data) => {
    try {
      if (data.id) {
        const stmt = db.prepare(`
                    UPDATE products SET 
                        codigo_barras = @codigo_barras,
                        nombre = @nombre,
                        descripcion = @descripcion,
                        id_categoria = @id_categoria,
                        id_unidad_medida = @id_unidad_medida,
                        precio_compra = @precio_compra,
                        precio_venta = @precio_venta,
                        stock_actual = @stock_actual,
                        stock_minimo = @stock_minimo,
                        imagen_path = @imagen_path,
                        estatus = @estatus
                    WHERE id = @id
                `);
        return stmt.run(data);
      } else {
        const stmt = db.prepare(`
                    INSERT INTO products (
                        codigo_barras, nombre, descripcion, id_categoria, 
                        id_unidad_medida, precio_compra, precio_venta, 
                        stock_actual, stock_minimo, imagen_path, estatus
                    ) VALUES (
                        @codigo_barras, @nombre, @descripcion, @id_categoria, 
                        @id_unidad_medida, @precio_compra, @precio_venta, 
                        @stock_actual, @stock_minimo, @imagen_path, @estatus
                    )
                `);
        return stmt.run(data);
      }
    } catch (error) {
      throw error;
    }
  });

  // Dentro de setupProductsHandlers
  ipcMain.handle("search-product", async (event, query) => {
    try {
      const sql = `SELECT * FROM products 
                     WHERE (codigo_barras = ? OR nombre LIKE ?) 
                     AND estatus = 1 LIMIT 1`;
      return db.prepare(sql).get(query, `%${query}%`);
    } catch (err) {
      console.error(err);
      return null;
    }
  });

  // ========================================
  // GESTIÓN DE CATEGORÍAS
  // ========================================
  ipcMain.handle("categories:list", () => {
    return db.prepare("SELECT * FROM categories ORDER BY nombre").all();
  });

  ipcMain.handle("categories:quick-save", (event, nombre) => {
    return db.prepare("INSERT INTO categories (nombre) VALUES (?)").run(nombre);
  });

  // ========================================
  // GESTIÓN DE UNIDADES DE MEDIDA
  // ========================================
  ipcMain.handle("units:list", () => {
    return db.prepare("SELECT * FROM unidades_medida ORDER BY nombre").all();
  });

  ipcMain.handle("units:quick-save", (event, { nombre, abreviatura }) => {
    return db.prepare("INSERT INTO unidades_medida (nombre, abreviatura) VALUES (?, ?)")
      .run(nombre, abreviatura);
  });

  // ========================================
  // BUSCAR PRODUCTO POR CÓDIGO
  // ========================================
  ipcMain.handle("products:get-by-barcode", (event, code) => {
    return db.prepare("SELECT * FROM products WHERE codigo_barras = ? AND estatus = 1").get(code);
  });
}

module.exports = { setupProductsHandlers };
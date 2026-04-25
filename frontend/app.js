const API_URL = "http://127.0.0.1:8000/api";

// Estados Globales
let inventario = []; 
let carrito = []; 
let esAdmin = false; 
let idEditando = null; 
let memoriaConversacion = []; // Memoria de la IA

// ==========================================
// 1. CARGAR INVENTARIO Y DIBUJAR TARJETAS
// ==========================================
// ... (dentro de cargarProductos)

async function cargarProductos() {
    const contenedor = document.getElementById('contenedor-productos');
    try {
        const respuesta = await fetch(`${API_URL}/productos`);
        inventario = await respuesta.json(); 
        contenedor.innerHTML = ''; 

        inventario.forEach((p, index) => {
            // REGLA DE VISIBILIDAD:
            // Si el producto está inactivo y NO eres admin, no se dibuja.
            if (p.estado === 'inactivo' && !esAdmin) return;

            const tarjeta = document.createElement('div');
            
            // ASIGNACIÓN DE CLASES:
            // Si el producto está inactivo, le ponemos una clase CSS especial
            const claseInactivo = p.estado === 'inactivo' ? 'producto-inactivo' : '';
            tarjeta.className = `tarjeta-producto ${claseInactivo}`;
            
            const botonesAdmin = esAdmin ? `
                <button class="btn-del" onclick="borrarProducto('${p._id}')" title="Desactivar">🚫</button>
                <button class="btn-edit" onclick="abrirModalEditar(${index})">✏️</button>
            ` : '';

            let visual = p.imagen_url ? `<img src="${p.imagen_url}" class="img-real">` : `<div class="imagen-producto">✨</div>`;

            tarjeta.innerHTML = `
                ${botonesAdmin}
                <div style="cursor:pointer;" onclick="abrirModalDetalles(${index})">
                    ${visual}
                    <div class="marca-categoria">${p.marca} • ${p.categoria} ${p.estado === 'inactivo' ? '(INACTIVO)' : ''}</div>
                    <h3 class="nombre-producto">${p.modelo}</h3>
                    <div class="precio">$${p.precio.toLocaleString()}</div>
                </div>
                <button class="btn-comprar" onclick="agregarAlCarrito(${index})" ${p.estado === 'inactivo' ? 'disabled' : ''}>
                    ${p.estado === 'inactivo' ? 'No disponible' : 'Agregar al Carrito'}
                </button>
            `;
            contenedor.appendChild(tarjeta);
        });
    } catch (e) { console.error(e); }
}

// ==========================================
// 2. SISTEMA DE ADMINISTRACIÓN Y CRUD
// ==========================================
function pedirPassword() {
    if (prompt("Contraseña:") === "12345") {
        esAdmin = true;
        document.getElementById('btn-login').style.display = 'none';
        document.getElementById('btn-nuevo-producto').style.display = 'block';
        document.getElementById('btn-logout').style.display = 'block';
        cargarProductos();
    } else { alert("Acceso denegado"); }
}

function logoutAdmin() { location.reload(); }

async function borrarProducto(id) {
    if (!confirm("¿Eliminar permanentemente este producto?")) return;
    await fetch(`${API_URL}/productos/${id}`, { method: 'DELETE' });
    cargarProductos();
}

function abrirModalCrear() {
    idEditando = null;
    document.getElementById('form-nuevo-producto').reset();
    document.getElementById('titulo-modal-form').innerText = "Nuevo Producto";
    document.getElementById('modal-crear').style.display = 'flex';
    cambiarCampos();
}

function abrirModalEditar(index) {
    const p = inventario[index];
    idEditando = p._id;
    document.getElementById('titulo-modal-form').innerText = "Editar Producto";
    document.getElementById('input-marca').value = p.marca;
    document.getElementById('input-modelo').value = p.modelo;
    document.getElementById('input-categoria').value = p.categoria;
    document.getElementById('input-precio').value = p.precio;
    document.getElementById('input-imagen').value = p.imagen_url || "";
    
    cambiarCampos();
    
    for (const [clave, valor] of Object.entries(p.especificaciones || {})) {
        const input = document.getElementById(`spec-${clave}`);
        if (input) input.value = valor;
    }
    document.getElementById('modal-crear').style.display = 'flex';
}

function cerrarModalCrear() { document.getElementById('modal-crear').style.display = 'none'; }

function cambiarCampos() {
    const cat = document.getElementById('input-categoria').value;
    const div = document.getElementById('specs-dinamicas');
    div.innerHTML = '';
    
    const esquemas = {
        'Portátiles': ['procesador', 'ram', 'almacenamiento', 'grafica', 'vram'],
        'Mouses': ['sensor', 'switches', 'peso'],
        'Teclados': ['switches'],
        'Monitores': ['panel', 'refresco', 'resolucion']
    };
    
    esquemas[cat].forEach(campo => {
        div.innerHTML += `<input type="text" id="spec-${campo}" placeholder="${campo.toUpperCase()}" style="padding: 8px; background: #0f172a; color: white; border: 1px solid #3b82f6; border-radius: 5px;">`;
    });
}

async function enviarProducto(e) {
    e.preventDefault();
    const cat = document.getElementById('input-categoria').value;
    const nuevo = {
        marca: document.getElementById('input-marca').value,
        modelo: document.getElementById('input-modelo').value,
        categoria: cat,
        precio: parseFloat(document.getElementById('input-precio').value),
        imagen_url: document.getElementById('input-imagen').value,
        especificaciones: {}
    };

    const inputs = document.querySelectorAll('#specs-dinamicas input');
    inputs.forEach(inp => { if(inp.value) nuevo.especificaciones[inp.id.replace('spec-','')] = inp.value; });

    const configFetch = {
        method: idEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevo)
    };
    const url = idEditando ? `${API_URL}/productos/${idEditando}` : `${API_URL}/productos`;

    await fetch(url, configFetch);
    cerrarModalCrear();
    cargarProductos();
}

// ==========================================
// 3. CARRITO DE COMPRAS Y DETALLES
// ==========================================
function abrirModalDetalles(index) {
    const pc = inventario[index];
    let visual = pc.imagen_url ? `<img src="${pc.imagen_url}" class="img-real" style="max-height: 200px">` : `✨`;
    let htmlSpecs = "";
    for (const [key, val] of Object.entries(pc.especificaciones || {})) {
        htmlSpecs += `<li><strong>${key.toUpperCase()}:</strong> ${val}</li>`;
    }
    document.getElementById('contenido-modal').innerHTML = `<h2>${pc.marca} ${pc.modelo}</h2><div class="modal-grid"><div>${visual}</div><div><h3 style="color:#3b82f6">$${pc.precio.toLocaleString()}</h3><ul>${htmlSpecs}</ul></div></div>`;
    document.getElementById('modal-producto').style.display = 'flex';
}
function cerrarModal() { document.getElementById('modal-producto').style.display = 'none'; }
function toggleCarrito() { document.getElementById('sidebar-carrito').classList.toggle('activo'); document.getElementById('overlay-carrito').classList.toggle('activo'); }

function agregarAlCarrito(index) {
    carrito.push(inventario[index]);
    actualizarCarrito();
    if(!document.getElementById('sidebar-carrito').classList.contains('activo')) toggleCarrito();
}

function eliminarDelCarrito(i) { carrito.splice(i, 1); actualizarCarrito(); }

function actualizarCarrito() {
    document.getElementById('contador-carrito').innerText = carrito.length;
    const lista = document.getElementById('items-carrito');
    const total = document.getElementById('total-carrito');
    lista.innerHTML = carrito.length === 0 ? '<p>Vacío</p>' : '';
    let suma = 0;
    carrito.forEach((item, i) => {
        suma += item.precio;
        lista.innerHTML += `<div class="item-carrito"><div>${item.modelo}</div><button class="btn-eliminar" onclick="eliminarDelCarrito(${i})">🗑️</button></div>`;
    });
    total.innerText = suma.toLocaleString();
}

// ==========================================
// 4. ASESOR IA (RAG)
// ==========================================
function toggleChat() { document.getElementById('ventana-chat').classList.toggle('abierto'); }

async function enviarChat() {
    const input = document.getElementById('chat-input');
    const box = document.getElementById('chat-mensajes');
    const txt = input.value.trim();
    if (!txt) return;

    box.innerHTML += `<div class="msg-user">${txt}</div>`;
    input.value = "";
    
    memoriaConversacion.push({ role: "user", parts: [txt] });

    const idCarga = "carga-" + Date.now();
    box.innerHTML += `<div id="${idCarga}" class="msg-bot msg-pensando">Consultando inventario...</div>`;
    box.scrollTop = box.scrollHeight; 

    try {
        const respuesta = await fetch(`${API_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ historial: memoriaConversacion })
        });
        
        const datos = await respuesta.json();
        document.getElementById(idCarga).remove();

        let textoFmt = datos.respuesta.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        box.innerHTML += `<div class="msg-bot">${textoFmt}</div>`;
        box.scrollTop = box.scrollHeight;

        memoriaConversacion.push({ role: "model", parts: [datos.respuesta] });
    } catch (error) {
        document.getElementById(idCarga).innerHTML = "Error de conexión con IA.";
    }
}

// Cerrar modales haciendo clic fuera
window.onclick = (e) => { 
    if(e.target.id === 'modal-producto') cerrarModal(); 
    if(e.target.id === 'modal-crear') cerrarModalCrear(); 
};

// Iniciar app
cargarProductos();
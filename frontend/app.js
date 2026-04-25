const API_URL = "http://127.0.0.1:8000/api";

let inventario = []; 
let carrito = []; 
let esAdmin = false; 
let idEditando = null; 
let memoriaConversacion = [];

// ==========================================
// 1. CARGA, RENDERIZADO Y FILTROS
// ==========================================
async function cargarProductos() {
    try {
        const respuesta = await fetch(`${API_URL}/productos`);
        inventario = await respuesta.json(); 
        aplicarFiltros(); // En lugar de renderizar directo, pasamos por los filtros
    } catch (e) { console.error("Error cargando inventario:", e); }
}

function aplicarFiltros() {
    const texto = document.getElementById('filtro-texto').value.toLowerCase();
    const cat = document.getElementById('filtro-categoria').value;
    const min = parseFloat(document.getElementById('filtro-min').value) || 0;
    const max = parseFloat(document.getElementById('filtro-max').value) || Infinity;

    const filtrados = inventario.filter(p => {
        // Regla admin: ocultar inactivos a usuarios normales
        if (p.estado === 'inactivo' && !esAdmin) return false;
        
        const coincideTexto = p.marca.toLowerCase().includes(texto) || p.modelo.toLowerCase().includes(texto);
        const coincideCat = cat === 'todas' || p.categoria === cat;
        const coincidePrecio = p.precio >= min && p.precio <= max;
        
        return coincideTexto && coincideCat && coincidePrecio;
    });

    renderizarTarjetas(filtrados, 'contenedor-productos');
}

function limpiarFiltros() {
    document.getElementById('filtro-texto').value = '';
    document.getElementById('filtro-categoria').value = 'todas';
    document.getElementById('filtro-min').value = '';
    document.getElementById('filtro-max').value = '';
    aplicarFiltros();
}

function renderizarTarjetas(listaProductos, contenedorId, modoPicker = false) {
    const contenedor = document.getElementById(contenedorId);
    contenedor.innerHTML = ''; 

    listaProductos.forEach((p) => {
        const indexOriginal = inventario.findIndex(item => item._id === p._id);
        const tarjeta = document.createElement('div');
        const estaInactivo = p.estado === 'inactivo';
        
        tarjeta.className = `tarjeta-producto ${estaInactivo ? 'producto-inactivo' : ''}`;
        
        let botonesAdmin = '';
        if (esAdmin && !modoPicker) {
            const btnAccion = estaInactivo 
                ? `<button class="btn-restore" onclick="restaurarProducto('${p._id}')" title="Restaurar">🔄</button>`
                : `<button class="btn-del" onclick="borrarProducto('${p._id}')" title="Desactivar">🚫</button>`;
            botonesAdmin = `${btnAccion}<button class="btn-edit" onclick="abrirModalEditar(${indexOriginal})">✏️</button>`;
        }

        let visual = p.imagen_url ? `<img src="${p.imagen_url}" class="img-real">` : `<div class="imagen-producto">✨</div>`;

        // Si estamos en modo "Picker" (Armar PC), el botón hace algo distinto
        let botonAccion = modoPicker 
            ? `<button class="btn-comprar" onclick="seleccionarParaPC(${indexOriginal})">Seleccionar</button>`
            : `<button class="btn-comprar" onclick="agregarAlCarrito(${indexOriginal})" ${estaInactivo ? 'disabled' : ''}>
                ${estaInactivo ? 'No disponible' : 'Agregar al Carrito'}
               </button>`;

        tarjeta.innerHTML = `
            ${botonesAdmin}
            <div style="cursor:pointer;" onclick="${modoPicker ? '' : `abrirModalDetalles(${indexOriginal})`}">
                ${visual}
                <div class="marca-categoria">${p.marca} • ${p.categoria}</div>
                <h3 class="nombre-producto">${p.modelo}</h3>
                <div class="precio">$${p.precio.toLocaleString()}</div>
            </div>
            ${botonAccion}
        `;
        contenedor.appendChild(tarjeta);
    });
}

// ==========================================
// 2. SISTEMA DE "ARMA TU PC" (PC BUILDER)
// ==========================================
let pcBuild = {
    'Procesadores': null,
    'Motherboards': null,
    'Tarjetas Gráficas': null,
    'Memorias RAM': null,
    'Almacenamiento': null,
    'Fuentes de Poder': null,
    'Gabinetes': null
};

let categoriaSeleccionando = null;

function cambiarPestana(pestaña) {
    document.getElementById('vista-catalogo').style.display = pestaña === 'catalogo' ? 'block' : 'none';
    document.getElementById('vista-builder').style.display = pestaña === 'builder' ? 'block' : 'none';
    
    document.getElementById('tab-catalogo').className = pestaña === 'catalogo' ? 'activo' : '';
    document.getElementById('tab-builder').className = pestaña === 'builder' ? 'activo' : '';
    
    if (pestaña === 'builder') renderizarPCBuilder();
}

function renderizarPCBuilder() {
    const contenedor = document.getElementById('builder-slots');
    contenedor.innerHTML = '';
    let total = 0;

    Object.keys(pcBuild).forEach(cat => {
        const item = pcBuild[cat];
        const slot = document.createElement('div');
        slot.className = 'builder-slot';
        
        if (item) {
            total += item.precio;
            slot.innerHTML = `
                <div style="flex:1;">
                    <div style="color: #94a3b8; font-size: 0.8rem; text-transform: uppercase;">${cat}</div>
                    <div style="font-weight: bold; font-size: 1.1rem;">${item.marca} ${item.modelo}</div>
                </div>
                <div style="font-weight: bold; color: #3b82f6; width: 100px; text-align: right;">$${item.precio.toLocaleString()}</div>
                <button class="btn-del" style="position:static; margin-left: 15px;" onclick="quitarDePC('${cat}')">✖</button>
            `;
        } else {
            slot.innerHTML = `
                <div style="flex:1; color: #94a3b8;">+ Seleccionar ${cat}</div>
                <button class="btn-comprar" style="width: auto; padding: 5px 15px;" onclick="abrirPicker('${cat}')">Elegir</button>
            `;
        }
        contenedor.appendChild(slot);
    });

    document.getElementById('total-pc').innerText = total.toLocaleString();
}

function abrirPicker(categoria) {
    categoriaSeleccionando = categoria;
    document.getElementById('titulo-picker').innerText = `Eligiendo: ${categoria}`;
    
    const opciones = inventario.filter(p => p.categoria === categoria && p.estado !== 'inactivo');
    renderizarTarjetas(opciones, 'grid-picker', true);
    
    document.getElementById('modal-picker').style.display = 'flex';
}

function cerrarModalPicker() { document.getElementById('modal-picker').style.display = 'none'; }

function seleccionarParaPC(indexOriginal) {
    pcBuild[categoriaSeleccionando] = inventario[indexOriginal];
    cerrarModalPicker();
    renderizarPCBuilder();
}

function quitarDePC(categoria) {
    pcBuild[categoria] = null;
    renderizarPCBuilder();
}

function agregarPcAlCarrito() {
    let agregados = 0;
    Object.values(pcBuild).forEach(item => {
        if (item) { carrito.push(item); agregados++; }
    });
    
    if (agregados > 0) {
        actualizarCarrito();
        toggleCarrito();
        // Opcional: limpiar la build después de agregar
        // Object.keys(pcBuild).forEach(k => pcBuild[k] = null); renderizarPCBuilder();
    } else {
        alert("Selecciona al menos un componente para tu PC.");
    }
}

// ==========================================
// 3. ACTUALIZACIÓN DEL CRUD DINÁMICO
// ==========================================
function cambiarCampos() {
    const cat = document.getElementById('input-categoria').value;
    const div = document.getElementById('specs-dinamicas');
    div.innerHTML = '';
    
    // Esquemas expandidos para soportar hardware de PC
    const esquemas = {
        'Portátiles': ['procesador', 'ram', 'almacenamiento', 'grafica', 'pantalla'],
        'Mouses': ['sensor', 'switches', 'peso'],
        'Teclados': ['switches', 'formato'],
        'Monitores': ['panel', 'refresco', 'resolucion'],
        'Procesadores': ['nucleos', 'hilos', 'frecuencia', 'socket'],
        'Motherboards': ['socket', 'chipset', 'formato'],
        'Tarjetas Gráficas': ['vram', 'tipo_memoria', 'consumo'],
        'Memorias RAM': ['capacidad', 'velocidad', 'tipo_ddr'],
        'Almacenamiento': ['capacidad', 'tipo', 'lectura'],
        'Fuentes de Poder': ['potencia', 'certificacion', 'modular'],
        'Gabinetes': ['formato_soportado', 'ventiladores', 'color']
    };
    
    if(esquemas[cat]) {
        esquemas[cat].forEach(campo => {
            div.innerHTML += `<input type="text" id="spec-${campo}" placeholder="${campo.toUpperCase()}" class="input-form" style="margin-bottom:0;">`;
        });
    }
}

// El resto de las funciones CRUD (borrarProducto, restaurarProducto, enviarProducto), Carrito e IA se mantienen igual.
// (Asegúrate de pegar las funciones de tu archivo anterior aquí si faltan, como enviarChat, pedirPassword, etc.)

function pedirPassword() {
    if (prompt("Contraseña:") === "12345") {
        esAdmin = true;
        document.getElementById('btn-login').style.display = 'none';
        document.getElementById('btn-nuevo-producto').style.display = 'block';
        document.getElementById('btn-logout').style.display = 'block';
        aplicarFiltros();
    } else { alert("Acceso denegado"); }
}

function logoutAdmin() { location.reload(); }

async function borrarProducto(id) {
    if (!confirm("¿Desactivar este producto del catálogo?")) return;
    await fetch(`${API_URL}/productos/${id}`, { method: 'DELETE' });
    cargarProductos();
}

async function restaurarProducto(id) {
    if (!confirm("¿Deseas activar este producto nuevamente?")) return;
    await fetch(`${API_URL}/productos/${id}/restaurar`, { method: 'PATCH' });
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
    document.getElementById('input-precio').value = p.precio;
    document.getElementById('input-imagen').value = p.imagen_url || "";
    
    const selector = document.getElementById('input-categoria');
    const catNormalizada = p.categoria ? p.categoria.trim().toLowerCase() : "";
    let coincidencia = Array.from(selector.options).find(opt => opt.value.toLowerCase().includes(catNormalizada.substring(0, 4)));
    selector.value = coincidencia ? coincidencia.value : "Portátiles";
    
    cambiarCampos();
    
    if (p.especificaciones) {
        for (const [clave, valor] of Object.entries(p.especificaciones)) {
            const input = document.getElementById(`spec-${clave}`) || document.querySelector(`[id^="spec-"][id*="${clave.substring(0,3)}"]`);
            if (input) input.value = valor;
        }
    }
    document.getElementById('modal-crear').style.display = 'flex';
}

function cerrarModalCrear() { document.getElementById('modal-crear').style.display = 'none'; }
async function enviarProducto(e) {
    e.preventDefault();
    const cat = document.getElementById('input-categoria').value;
    const nuevo = { marca: document.getElementById('input-marca').value, modelo: document.getElementById('input-modelo').value, categoria: cat, precio: parseFloat(document.getElementById('input-precio').value), imagen_url: document.getElementById('input-imagen').value, especificaciones: {} };
    const inputs = document.querySelectorAll('#specs-dinamicas input');
    inputs.forEach(inp => { if(inp.value) nuevo.especificaciones[inp.id.replace('spec-','')] = inp.value; });

    const configFetch = { method: idEditando ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevo) };
    const url = idEditando ? `${API_URL}/productos/${idEditando}` : `${API_URL}/productos`;
    await fetch(url, configFetch);
    cerrarModalCrear();
    cargarProductos();
}

function abrirModalDetalles(index) {
    const pc = inventario[index];
    let htmlSpecs = "";
    for (const [key, val] of Object.entries(pc.especificaciones || {})) htmlSpecs += `<li><strong>${key.toUpperCase()}:</strong> ${val}</li>`;
    document.getElementById('contenido-modal').innerHTML = `<h2>${pc.marca} ${pc.modelo}</h2><div class="modal-grid"><div><img src="${pc.imagen_url || ''}" style="max-height: 200px"></div><div><h3 style="color:#3b82f6">$${pc.precio.toLocaleString()}</h3><ul>${htmlSpecs}</ul></div></div>`;
    document.getElementById('modal-producto').style.display = 'flex';
}
function cerrarModal() { document.getElementById('modal-producto').style.display = 'none'; }
function toggleCarrito() { document.getElementById('sidebar-carrito').classList.toggle('activo'); document.getElementById('overlay-carrito').classList.toggle('activo'); }
function agregarAlCarrito(index) { carrito.push(inventario[index]); actualizarCarrito(); if(!document.getElementById('sidebar-carrito').classList.contains('activo')) toggleCarrito(); }
function eliminarDelCarrito(i) { carrito.splice(i, 1); actualizarCarrito(); }
function actualizarCarrito() {
    document.getElementById('contador-carrito').innerText = carrito.length;
    let suma = 0;
    document.getElementById('items-carrito').innerHTML = carrito.map((item, i) => { suma += item.precio; return `<div class="item-carrito"><div>${item.modelo}</div><button class="btn-eliminar" onclick="eliminarDelCarrito(${i})">🗑️</button></div>`; }).join('');
    document.getElementById('total-carrito').innerText = suma.toLocaleString();
}
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
    box.innerHTML += `<div id="${idCarga}" class="msg-bot msg-pensando">Consultando...</div>`;
    box.scrollTop = box.scrollHeight; 
    try {
        const respuesta = await fetch(`${API_URL}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ historial: memoriaConversacion }) });
        const datos = await respuesta.json();
        document.getElementById(idCarga).remove();
        box.innerHTML += `<div class="msg-bot">${datos.respuesta.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>`;
        box.scrollTop = box.scrollHeight;
        memoriaConversacion.push({ role: "model", parts: [datos.respuesta] });
    } catch (error) { document.getElementById(idCarga).innerHTML = "Error de conexión."; }
}

window.onclick = (e) => { 
    if(e.target.id === 'modal-producto') cerrarModal(); 
    if(e.target.id === 'modal-crear') cerrarModalCrear(); 
    if(e.target.id === 'modal-picker') cerrarModalPicker(); 
};
cargarProductos();
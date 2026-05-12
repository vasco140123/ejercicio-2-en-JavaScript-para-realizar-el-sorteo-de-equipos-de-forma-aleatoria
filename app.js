/**
 * Aula virtual: ruleta dinámica, lista con localStorage y sorteo de equipos.
 * Sin librerías externas.
 */

const CLAVE_ALMACENAMIENTO_LISTA = "aulaVirtual_listaParticipantes";
const CLAVE_ALMACENAMIENTO_OCULTOS = "aulaVirtual_indicesLineasOcultas";

const COLORES_BASICOS_RULETA = [
  "#e53935",
  "#1e88e5",
  "#43a047",
  "#fdd835",
  "#fb8c00",
];

const lienzoRuleta = document.getElementById("lienzoRuleta");
const contextoLienzo = lienzoRuleta.getContext("2d");
const areaTextoParticipantes = document.getElementById("areaTextoParticipantes");
const capaResaltadoLineas = document.getElementById("capaResaltadoLineas");
const textoElementoSeleccionado = document.getElementById("textoElementoSeleccionado");
const textoEstadoEdicion = document.getElementById("textoEstadoEdicion");
const botonIniciarGiro = document.getElementById("botonIniciarGiro");
const botonReiniciarSorteo = document.getElementById("botonReiniciarSorteo");
const botonSortearEquipos = document.getElementById("botonSortearEquipos");
const entradaNumeroEquipos = document.getElementById("entradaNumeroEquipos");
const contenedorEquiposSorteados = document.getElementById("contenedorEquiposSorteados");

let anguloRotacionRuleta = 0;
let giroEnProgreso = false;
let modoEdicionHabilitado = false;
/** @type {Set<number>} */
const indicesLineasOcultas = new Set();
/** Índice de línea (0-based) del último sorteo en la ruleta */
let indiceLineaUltimoSorteado = null;
let identificadorAnimacionGiro = null;

const centroX = lienzoRuleta.width / 2;
const centroY = lienzoRuleta.height / 2;
const radioRuleta = Math.min(centroX, centroY) - 8;

/**
 * @returns {string[]}
 */
function obtenerLineasTextoParticipantes() {
  return areaTextoParticipantes.value.split(/\r?\n/);
}

/**
 * Líneas no vacías y no ocultas, con su índice original.
 * @returns {{ texto: string, indiceLineaOriginal: number }[]}
 */
function obtenerElementosVisiblesParaRuleta() {
  const lineas = obtenerLineasTextoParticipantes();
  const resultado = [];
  for (let i = 0; i < lineas.length; i++) {
    const texto = lineas[i].trim();
    if (texto.length === 0) continue;
    if (indicesLineasOcultas.has(i)) continue;
    resultado.push({ texto, indiceLineaOriginal: i });
  }
  return resultado;
}

function colorSectorPorIndice(indice) {
  return COLORES_BASICOS_RULETA[indice % COLORES_BASICOS_RULETA.length];
}

function dibujarRuleta() {
  const elementos = obtenerElementosVisiblesParaRuleta();
  const n = elementos.length;
  contextoLienzo.clearRect(0, 0, lienzoRuleta.width, lienzoRuleta.height);

  contextoLienzo.save();
  contextoLienzo.translate(centroX, centroY);
  contextoLienzo.rotate(anguloRotacionRuleta);

  if (n === 0) {
    contextoLienzo.beginPath();
    contextoLienzo.arc(0, 0, radioRuleta, 0, Math.PI * 2);
    contextoLienzo.fillStyle = "#334155";
    contextoLienzo.fill();
    contextoLienzo.restore();
    contextoLienzo.fillStyle = "#94a3b8";
    contextoLienzo.font = "14px system-ui,sans-serif";
    contextoLienzo.textAlign = "center";
    contextoLienzo.fillText("Añada elementos en la lista", centroX, centroY);
    return;
  }

  const anguloPorSector = (Math.PI * 2) / n;
  for (let i = 0; i < n; i++) {
    const inicio = i * anguloPorSector - Math.PI / 2;
    const fin = inicio + anguloPorSector;
    contextoLienzo.beginPath();
    contextoLienzo.moveTo(0, 0);
    contextoLienzo.arc(0, 0, radioRuleta, inicio, fin);
    contextoLienzo.closePath();
    contextoLienzo.fillStyle = colorSectorPorIndice(i);
    contextoLienzo.fill();
    contextoLienzo.strokeStyle = "rgba(15,23,42,0.35)";
    contextoLienzo.lineWidth = 2;
    contextoLienzo.stroke();

    const mitad = inicio + anguloPorSector / 2;
    const etiqueta = acortarTexto(elementos[i].texto, 18);
    contextoLienzo.save();
    contextoLienzo.rotate(mitad);
    contextoLienzo.textAlign = "center";
    contextoLienzo.fillStyle = "#0f172a";
    contextoLienzo.font = "bold 12px system-ui,sans-serif";
    contextoLienzo.fillText(etiqueta, radioRuleta * 0.62, 4);
    contextoLienzo.restore();
  }

  contextoLienzo.beginPath();
  contextoLienzo.arc(0, 0, 22, 0, Math.PI * 2);
  contextoLienzo.fillStyle = "#0f172a";
  contextoLienzo.fill();
  contextoLienzo.strokeStyle = "#64748b";
  contextoLienzo.lineWidth = 2;
  contextoLienzo.stroke();

  contextoLienzo.restore();
}

function acortarTexto(texto, maximo) {
  if (texto.length <= maximo) return texto;
  return texto.slice(0, maximo - 1) + "…";
}

function ejecutarGiroAleatorio() {
  const elementos = obtenerElementosVisiblesParaRuleta();
  if (giroEnProgreso || elementos.length === 0) {
    if (elementos.length === 0) {
      textoElementoSeleccionado.textContent =
        "No hay elementos visibles para sortear. Edite la lista o pulse Reiniciar.";
    }
    return;
  }

  giroEnProgreso = true;
  const n = elementos.length;
  const indiceGanador = Math.floor(Math.random() * n);
  const anguloPorSector = (Math.PI * 2) / n;
  const anguloCentroLocalGanador = (indiceGanador + 0.5) * anguloPorSector - Math.PI / 2;
  const vueltasCompletas = 5 + Math.floor(Math.random() * 4);
  const anguloInicialAnimacion = anguloRotacionRuleta;
  let anguloAlineacion =
    -Math.PI / 2 - anguloCentroLocalGanador + vueltasCompletas * Math.PI * 2;
  while (anguloAlineacion < anguloInicialAnimacion + Math.PI * 2 * 3) {
    anguloAlineacion += Math.PI * 2;
  }
  const margen = anguloPorSector * 0.35;
  const desvioAleatorio = (Math.random() - 0.5) * 2 * margen;
  const anguloObjetivo = anguloAlineacion + desvioAleatorio;
  const duracionMs = 3200;
  const tiempoInicio = performance.now();

  if (identificadorAnimacionGiro !== null) {
    cancelAnimationFrame(identificadorAnimacionGiro);
  }

  function fotograma(tiempoActual) {
    const transcurrido = tiempoActual - tiempoInicio;
    const t = Math.min(1, transcurrido / duracionMs);
    const suavizado = 1 - Math.pow(1 - t, 3);
    anguloRotacionRuleta =
      anguloInicialAnimacion + (anguloObjetivo - anguloInicialAnimacion) * suavizado;
    dibujarRuleta();
    if (t < 1) {
      identificadorAnimacionGiro = requestAnimationFrame(fotograma);
    } else {
      identificadorAnimacionGiro = null;
      anguloRotacionRuleta = anguloObjetivo;
      const elemento = elementos[indiceGanador];
      indiceLineaUltimoSorteado = elemento.indiceLineaOriginal;
      textoElementoSeleccionado.textContent = `Seleccionado: ${elemento.texto}`;
      giroEnProgreso = false;
    }
  }

  identificadorAnimacionGiro = requestAnimationFrame(fotograma);
}

function guardarListaEnAlmacenamientoLocal() {
  try {
    localStorage.setItem(CLAVE_ALMACENAMIENTO_LISTA, areaTextoParticipantes.value);
    localStorage.setItem(
      CLAVE_ALMACENAMIENTO_OCULTOS,
      JSON.stringify([...indicesLineasOcultas].sort((a, b) => a - b)),
    );
  } catch (_) {
    /* ignorar cuota o modo privado */
  }
}

function cargarListaDesdeAlmacenamientoLocal() {
  try {
    const guardado = localStorage.getItem(CLAVE_ALMACENAMIENTO_LISTA);
    if (guardado !== null) {
      areaTextoParticipantes.value = guardado;
    }
    const ocultos = localStorage.getItem(CLAVE_ALMACENAMIENTO_OCULTOS);
    if (ocultos) {
      const arr = JSON.parse(ocultos);
      indicesLineasOcultas.clear();
      for (const x of arr) {
        if (Number.isInteger(x) && x >= 0) indicesLineasOcultas.add(x);
      }
    }
  } catch (_) {
    indicesLineasOcultas.clear();
  }
}

function actualizarCapaResaltado() {
  const lineas = obtenerLineasTextoParticipantes();
  const fragmento = document.createDocumentFragment();
  for (let i = 0; i < lineas.length; i++) {
    const span = document.createElement("span");
    span.textContent = lineas[i];
    if (indicesLineasOcultas.has(i)) {
      span.classList.add("linea-oculta");
    }
    fragmento.appendChild(span);
  }
  capaResaltadoLineas.replaceChildren(fragmento);
}

function aplicarModoEdicion() {
  if (modoEdicionHabilitado) {
    areaTextoParticipantes.classList.remove("modo-solo-lectura");
    areaTextoParticipantes.removeAttribute("readonly");
    textoEstadoEdicion.innerHTML =
      "Modo <strong>edición</strong>. Puede pegar o escribir. Al salir del campo vuelve el modo lista (solo lectura) para usar atajos.";
  } else {
    areaTextoParticipantes.classList.add("modo-solo-lectura");
    areaTextoParticipantes.setAttribute("readonly", "readonly");
    textoEstadoEdicion.innerHTML =
      'Modo lista (<strong>solo lectura</strong> para atajos). Pulse <kbd>E</kbd> o haga clic en el área para editar.';
  }
  actualizarCapaResaltado();
}

function habilitarEdicion() {
  modoEdicionHabilitado = true;
  aplicarModoEdicion();
  areaTextoParticipantes.focus();
}

function ocultarUltimoSorteadoConTeclaS() {
  if (indiceLineaUltimoSorteado === null) return;
  indicesLineasOcultas.add(indiceLineaUltimoSorteado);
  guardarListaEnAlmacenamientoLocal();
  actualizarCapaResaltado();
  dibujarRuleta();
  textoElementoSeleccionado.textContent =
    "Último sorteado oculto de la ruleta y excluido del siguiente sorteo. Pulse Reiniciar o R para volver a mostrarlo.";
}

function reiniciarSorteoYVisibilidad() {
  indicesLineasOcultas.clear();
  indiceLineaUltimoSorteado = null;
  guardarListaEnAlmacenamientoLocal();
  actualizarCapaResaltado();
  dibujarRuleta();
  textoElementoSeleccionado.textContent =
    "Sorteo reiniciado: todas las líneas visibles de nuevo en la ruleta.";
}

function alternarPantallaCompleta() {
  const raiz = document.documentElement;
  if (!document.fullscreenElement) {
    raiz.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
}

function mezclarAleatorio(array) {
  const copia = [...array];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function ejecutarSorteoEquipos() {
  const visibles = obtenerElementosVisiblesParaRuleta().map((e) => e.texto);
  let numeroEquipos = parseInt(String(entradaNumeroEquipos.value), 10);
  if (!Number.isFinite(numeroEquipos) || numeroEquipos < 2) numeroEquipos = 2;
  if (numeroEquipos > 12) numeroEquipos = 12;
  entradaNumeroEquipos.value = String(numeroEquipos);

  if (visibles.length < numeroEquipos) {
    contenedorEquiposSorteados.innerHTML =
      "<p>Se necesitan al menos tantos participantes visibles como equipos.</p>";
    return;
  }

  const mezclados = mezclarAleatorio(visibles);
  /** @type {string[][]} */
  const equipos = Array.from({ length: numeroEquipos }, () => []);
  mezclados.forEach((nombre, idx) => {
    equipos[idx % numeroEquipos].push(nombre);
  });

  contenedorEquiposSorteados.innerHTML = "";
  equipos.forEach((miembros, indice) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-equipo";
    const titulo = document.createElement("h3");
    titulo.textContent = `Equipo ${indice + 1}`;
    const lista = document.createElement("ul");
    for (const m of miembros) {
      const li = document.createElement("li");
      li.textContent = m;
      lista.appendChild(li);
    }
    tarjeta.appendChild(titulo);
    tarjeta.appendChild(lista);
    contenedorEquiposSorteados.appendChild(tarjeta);
  });
}

function alCambiarContenidoTextarea() {
  guardarListaEnAlmacenamientoLocal();
  actualizarCapaResaltado();
  dibujarRuleta();
}

function manejarTeclaDocumento(evento) {
  const etiqueta = evento.target && evento.target.tagName;
  const enCampoTexto =
    etiqueta === "TEXTAREA" || etiqueta === "INPUT" || evento.target?.isContentEditable;

  if (evento.code === "KeyF") {
    evento.preventDefault();
    alternarPantallaCompleta();
    return;
  }

  if (evento.code === "KeyE") {
    evento.preventDefault();
    habilitarEdicion();
    return;
  }

  if (evento.code === "KeyR") {
    evento.preventDefault();
    reiniciarSorteoYVisibilidad();
    return;
  }

  if (evento.code === "KeyS") {
    if (modoEdicionHabilitado && enCampoTexto) return;
    evento.preventDefault();
    ocultarUltimoSorteadoConTeclaS();
    return;
  }

  if (evento.code === "Space") {
    if (modoEdicionHabilitado && enCampoTexto) return;
    evento.preventDefault();
    ejecutarGiroAleatorio();
  }
}

lienzoRuleta.addEventListener("click", () => {
  lienzoRuleta.focus();
  ejecutarGiroAleatorio();
});

lienzoRuleta.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    ejecutarGiroAleatorio();
  }
});

botonIniciarGiro.addEventListener("click", ejecutarGiroAleatorio);
botonReiniciarSorteo.addEventListener("click", reiniciarSorteoYVisibilidad);
botonSortearEquipos.addEventListener("click", ejecutarSorteoEquipos);

areaTextoParticipantes.addEventListener("input", alCambiarContenidoTextarea);
areaTextoParticipantes.addEventListener("paste", () => {
  queueMicrotask(alCambiarContenidoTextarea);
});

areaTextoParticipantes.addEventListener("click", () => {
  habilitarEdicion();
});

areaTextoParticipantes.addEventListener("blur", () => {
  modoEdicionHabilitado = false;
  aplicarModoEdicion();
});

document.addEventListener("keydown", manejarTeclaDocumento);

window.addEventListener("resize", dibujarRuleta);

cargarListaDesdeAlmacenamientoLocal();
modoEdicionHabilitado = false;
aplicarModoEdicion();
dibujarRuleta();
actualizarCapaResaltado();

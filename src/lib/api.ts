/**
 * API simulada. Los componentes la usan como si fuera un cliente HTTP.
 * En producción esto es el backend: aquí sólo cambia este archivo.
 */
import { clavesSugeridas, decidir, redactar, type Redaccion } from "./ia";
import { generar, type Datos } from "./seed";
import {
  fueraDeVentana, HORAS_VENTANA,
  type Ajustes, type Contacto, type Conversacion, type Entrada,
  type EstadoConversacion, type Mensaje, type MotivoEscalada, type Propuesta,
} from "./tipos";

const K = "wa-ia:datos:v1";
const espera = (ms?: number) => new Promise((r) => setTimeout(r, ms ?? 200 + Math.random() * 350));

function leer(): Datos {
  try {
    const crudo = localStorage.getItem(K);
    if (crudo) {
      const d = JSON.parse(crudo) as Datos;
      if (d?.conversaciones?.length && d?.entradas?.length) return d;
    }
  } catch { /* modo privado */ }
  const nuevo = generar();
  guardar(nuevo);
  return nuevo;
}
function guardar(d: Datos) {
  try { localStorage.setItem(K, JSON.stringify(d)); } catch { /* sin espacio */ }
}

export class FueraDeVentanaError extends Error {
  constructor() {
    super(`Pasaron más de ${HORAS_VENTANA} horas desde el último mensaje del cliente. WhatsApp sólo permite enviar una plantilla aprobada.`);
  }
}
export class SinBorradorError extends Error {
  constructor() { super("Esta conversación no tiene un borrador para enviar."); }
}

export interface ConversacionVista {
  conversacion: Conversacion;
  contacto: Contacto;
  ultimoTexto: string;
  ultimoAutor: Mensaje["autor"];
  confianza: number | null;
  fueraDeVentana: boolean;
}

function vista(d: Datos, c: Conversacion): ConversacionVista {
  const ms = d.mensajes.filter((m) => m.conversacionId === c.id)
    .sort((a, b) => a.en.localeCompare(b.en));
  const ultimo = ms[ms.length - 1];
  const ia = [...ms].reverse().find((m) => m.autor === "ia");
  return {
    conversacion: c,
    contacto: d.contactos.find((x) => x.id === c.contactoId)!,
    ultimoTexto: ultimo?.texto ?? "",
    ultimoAutor: ultimo?.autor ?? "cliente",
    confianza: ia?.confianza ?? null,
    fueraDeVentana: fueraDeVentana(c),
  };
}

export async function getBandeja(estado?: EstadoConversacion): Promise<ConversacionVista[]> {
  await espera();
  const d = leer();
  return d.conversaciones
    .filter((c) => !estado || c.estado === estado)
    .map((c) => vista(d, c))
    .sort((a, b) => b.conversacion.ultimaActividadEn.localeCompare(a.conversacion.ultimaActividadEn));
}

export interface DetalleConversacion extends ConversacionVista {
  mensajes: Mensaje[];
  entradas: Entrada[];
}

export async function getConversacion(id: string): Promise<DetalleConversacion | null> {
  await espera();
  const d = leer();
  const c = d.conversaciones.find((x) => x.id === id);
  if (!c) return null;
  return {
    ...vista(d, c),
    mensajes: d.mensajes.filter((m) => m.conversacionId === id).sort((a, b) => a.en.localeCompare(b.en)),
    entradas: d.entradas,
  };
}

/** Lo que haría la IA con un texto cualquiera, sin tocar ninguna conversación. */
export async function probar(texto: string): Promise<Redaccion & {
  estado: EstadoConversacion; motivo?: MotivoEscalada; fuentesDetalle: Entrada[];
}> {
  await espera(350);
  const d = leer();
  const r = redactar(texto, d.entradas);
  const dec = decidir(r, d.ajustes);
  return { ...r, ...dec, fuentesDetalle: d.entradas.filter((e) => r.fuentes.includes(e.id)) };
}

/** Llega un mensaje nuevo del cliente y la IA decide qué hacer. */
export async function recibirMensaje(conversacionId: string, texto: string): Promise<void> {
  await espera(450);
  const d = leer();
  const c = d.conversaciones.find((x) => x.id === conversacionId);
  if (!c) throw new Error("Conversación no encontrada.");
  const ahora = new Date().toISOString();

  d.mensajes.push({
    id: `m${Date.now().toString(36)}c`, conversacionId, autor: "cliente", texto, en: ahora,
  });
  c.ultimoMensajeClienteEn = ahora;
  c.ultimaActividadEn = ahora;

  const r = redactar(texto, d.entradas);
  const dec = decidir(r, d.ajustes);
  if (r.texto !== null) {
    d.mensajes.push({
      id: `m${Date.now().toString(36)}i`, conversacionId, autor: "ia", texto: r.texto,
      en: new Date(Date.now() + 1000).toISOString(),
      confianza: r.confianza, fuentes: r.fuentes,
      cobertura: r.cobertura, preguntas: r.preguntas,
      borrador: dec.estado !== "automatica",
    });
    if (dec.estado === "automatica") c.ultimaActividadEn = new Date(Date.now() + 1000).toISOString();
  }
  c.estado = dec.estado;
  c.motivo = dec.motivo;
  guardar(d);
}

/**
 * Envía el borrador. Si el agente cambió el texto, la corrección se guarda como
 * propuesta para la base: es así como el sistema aprende de lo que ya pasó.
 */
export async function enviarBorrador(conversacionId: string, textoFinal: string): Promise<{ propuesta: boolean }> {
  await espera();
  const d = leer();
  const c = d.conversaciones.find((x) => x.id === conversacionId);
  if (!c) throw new Error("Conversación no encontrada.");
  if (fueraDeVentana(c)) throw new FueraDeVentanaError();
  const borrador = d.mensajes.find((m) => m.conversacionId === conversacionId && m.borrador);
  if (!borrador) throw new SinBorradorError();

  const cambio = textoFinal.trim() !== borrador.texto.trim();
  const original = borrador.texto;
  borrador.texto = textoFinal.trim();
  borrador.borrador = false;
  borrador.corregido = cambio;
  borrador.en = new Date().toISOString();
  c.estado = "automatica";
  c.motivo = undefined;
  c.ultimaActividadEn = borrador.en;

  if (cambio) {
    const pregunta = [...d.mensajes]
      .filter((m) => m.conversacionId === conversacionId && m.autor === "cliente")
      .sort((a, b) => a.en.localeCompare(b.en)).pop()?.texto ?? "";
    d.propuestas.push({
      id: `p${Date.now().toString(36)}`, conversacionId,
      preguntaCliente: pregunta, borradorIA: original, respuestaAgente: textoFinal.trim(),
      estado: "pendiente", creadaEn: borrador.en,
    });
  }
  guardar(d);
  return { propuesta: cambio };
}

/** El agente escribe de su puño. Si no hay borrador, igual queda como corrección. */
export async function responderComoAgente(conversacionId: string, texto: string): Promise<{ propuesta: boolean }> {
  await espera();
  const d = leer();
  const c = d.conversaciones.find((x) => x.id === conversacionId);
  if (!c) throw new Error("Conversación no encontrada.");
  if (fueraDeVentana(c)) throw new FueraDeVentanaError();
  const ahora = new Date().toISOString();

  const borrador = d.mensajes.find((m) => m.conversacionId === conversacionId && m.borrador);
  if (borrador) borrador.borrador = false, borrador.texto = texto.trim(), borrador.corregido = true, borrador.en = ahora;
  else d.mensajes.push({ id: `m${Date.now().toString(36)}a`, conversacionId, autor: "agente", texto: texto.trim(), en: ahora });

  const pregunta = [...d.mensajes]
    .filter((m) => m.conversacionId === conversacionId && m.autor === "cliente")
    .sort((a, b) => a.en.localeCompare(b.en)).pop()?.texto ?? "";

  c.estado = "automatica";
  c.motivo = undefined;
  c.ultimaActividadEn = ahora;

  d.propuestas.push({
    id: `p${Date.now().toString(36)}`, conversacionId,
    preguntaCliente: pregunta, borradorIA: borrador?.texto ?? null,
    respuestaAgente: texto.trim(), estado: "pendiente", creadaEn: ahora,
  });
  guardar(d);
  return { propuesta: true };
}

export async function resolver(conversacionId: string): Promise<void> {
  await espera();
  const d = leer();
  const c = d.conversaciones.find((x) => x.id === conversacionId);
  if (!c) throw new Error("Conversación no encontrada.");
  c.estado = "resuelta";
  c.motivo = undefined;
  c.ultimaActividadEn = new Date().toISOString();
  guardar(d);
}

export async function getEntradas(): Promise<Entrada[]> {
  await espera();
  return leer().entradas.slice().sort((a, b) => b.actualizadaEn.localeCompare(a.actualizadaEn));
}

export async function guardarEntrada(e: Omit<Entrada, "id" | "actualizadaEn"> & { id?: string }): Promise<Entrada> {
  await espera();
  const d = leer();
  const ahora = new Date().toISOString();
  if (e.id) {
    const previa = d.entradas.find((x) => x.id === e.id);
    if (!previa) throw new Error("Entrada no encontrada.");
    Object.assign(previa, e, { actualizadaEn: ahora });
    guardar(d);
    return previa;
  }
  const nueva: Entrada = { ...e, id: `e${Date.now().toString(36)}`, actualizadaEn: ahora };
  d.entradas.push(nueva);
  guardar(d);
  return nueva;
}

export async function borrarEntrada(id: string): Promise<void> {
  await espera();
  const d = leer();
  d.entradas = d.entradas.filter((e) => e.id !== id);
  guardar(d);
}

export async function getPropuestas(): Promise<Propuesta[]> {
  await espera();
  return leer().propuestas.slice().sort((a, b) => b.creadaEn.localeCompare(a.creadaEn));
}

/** Aceptar una corrección la convierte en entrada: la próxima vez la IA ya sabe. */
export async function aceptarPropuesta(id: string, claves?: string[]): Promise<Entrada> {
  await espera();
  const d = leer();
  const p = d.propuestas.find((x) => x.id === id);
  if (!p) throw new Error("Propuesta no encontrada.");
  if (p.estado !== "pendiente") throw new Error("Esta corrección ya fue revisada.");
  const nueva: Entrada = {
    id: `e${Date.now().toString(36)}`,
    pregunta: p.preguntaCliente,
    respuesta: p.respuestaAgente,
    categoria: "productos",
    claves: (claves?.length ? claves : clavesSugeridas(p.preguntaCliente)),
    origen: "aprendida", activa: true,
    actualizadaEn: new Date().toISOString(),
  };
  d.entradas.push(nueva);
  p.estado = "aceptada";
  guardar(d);
  return nueva;
}

export async function descartarPropuesta(id: string): Promise<void> {
  await espera();
  const d = leer();
  const p = d.propuestas.find((x) => x.id === id);
  if (!p) throw new Error("Propuesta no encontrada.");
  p.estado = "descartada";
  guardar(d);
}

export async function getAjustes(): Promise<Ajustes> {
  await espera(150);
  return leer().ajustes;
}

/** Cambiar el umbral vuelve a decidir las conversaciones que todavía no cerró nadie. */
export async function guardarAjustes(a: Ajustes): Promise<number> {
  await espera();
  const d = leer();
  d.ajustes = a;
  let recalculadas = 0;
  for (const c of d.conversaciones) {
    if (c.estado === "resuelta") continue;
    const ia = [...d.mensajes].reverse().find((m) => m.conversacionId === c.id && m.autor === "ia");
    if (!ia || ia.corregido) continue;
    const r: Redaccion = {
      texto: ia.texto, confianza: ia.confianza ?? 0, fuentes: ia.fuentes ?? [],
      cobertura: ia.cobertura ?? "total", preguntas: ia.preguntas ?? [],
    };
    const dec = decidir(r, a);
    if (dec.estado !== c.estado) recalculadas += 1;
    c.estado = dec.estado;
    c.motivo = dec.motivo;
    ia.borrador = dec.estado !== "automatica";
  }
  guardar(d);
  return recalculadas;
}

export interface Resumen {
  total: number;
  porEstado: Record<EstadoConversacion, number>;
  automatizacion: number;
  sinCobertura: number;
  fueraDeVentana: number;
  propuestasPendientes: number;
  entradasActivas: number;
  porCategoria: { categoria: string; usos: number }[];
}

export async function getResumen(): Promise<Resumen> {
  await espera();
  const d = leer();
  const porEstado = { automatica: 0, espera_revision: 0, escalada: 0, resuelta: 0 } as Record<EstadoConversacion, number>;
  d.conversaciones.forEach((c) => { porEstado[c.estado] += 1; });

  const usos = new Map<string, number>();
  d.mensajes.forEach((m) => m.fuentes?.forEach((f) => usos.set(f, (usos.get(f) ?? 0) + 1)));
  const porCategoria = new Map<string, number>();
  d.entradas.forEach((e) => porCategoria.set(e.categoria, (porCategoria.get(e.categoria) ?? 0) + (usos.get(e.id) ?? 0)));

  const total = d.conversaciones.length;
  return {
    total, porEstado,
    automatizacion: total ? Math.round((porEstado.automatica / total) * 100) : 0,
    sinCobertura: d.conversaciones.filter((c) => c.motivo === "sin_respuesta").length,
    fueraDeVentana: d.conversaciones.filter((c) => fueraDeVentana(c) && c.estado !== "resuelta").length,
    propuestasPendientes: d.propuestas.filter((p) => p.estado === "pendiente").length,
    entradasActivas: d.entradas.filter((e) => e.activa).length,
    porCategoria: [...porCategoria.entries()].map(([categoria, u]) => ({ categoria, usos: u })),
  };
}

export async function restaurar(): Promise<void> {
  await espera();
  try { localStorage.removeItem(K); } catch { /* ignora */ }
  leer();
}

/** Tipos del dominio: una bandeja de WhatsApp atendida por IA con revisión humana. */

export type Autor = "cliente" | "ia" | "agente";

/**
 * Lo que pasó con la última pregunta del cliente.
 * automatica      la IA respondió sola, por encima del umbral
 * espera_revision la IA redactó un borrador y espera a una persona
 * escalada        la IA no responde: no sabe, el tema es delicado, o pidieron humano
 * resuelta        la conversación se cerró
 */
export type EstadoConversacion = "automatica" | "espera_revision" | "escalada" | "resuelta";

export type MotivoEscalada = "sin_respuesta" | "tema_sensible" | "pidio_humano";

export const MOTIVO_ROTULO: Record<MotivoEscalada, string> = {
  sin_respuesta: "La base no cubre la pregunta",
  tema_sensible: "Tema delicado: siempre lo ve una persona",
  pidio_humano: "El cliente pidió hablar con una persona",
};

export const ESTADO_ROTULO: Record<EstadoConversacion, string> = {
  automatica: "Respondida por la IA",
  espera_revision: "Borrador en espera",
  escalada: "Para una persona",
  resuelta: "Resuelta",
};

export interface Contacto {
  id: string;
  nombre: string;
  telefono: string;
}

export interface Mensaje {
  id: string;
  conversacionId: string;
  autor: Autor;
  texto: string;
  en: string;
  /** Sólo en mensajes de la IA. 0 significa que no encontró nada en la base. */
  confianza?: number;
  /** Entradas de la base que sostienen la respuesta. Sin fuentes no hay respuesta. */
  fuentes?: string[];
  /** Borrador: redactado y todavía no enviado. */
  borrador?: boolean;
  /** El agente cambió el texto antes de enviarlo. */
  corregido?: boolean;
  /** "parcial" si el mensaje del cliente preguntaba algo que la base no cubre. */
  cobertura?: "total" | "parcial";
  /** Las preguntas que traía el mensaje del cliente. */
  preguntas?: string[];
}

export interface Conversacion {
  id: string;
  contactoId: string;
  estado: EstadoConversacion;
  motivo?: MotivoEscalada;
  /** Cuándo escribió el cliente por última vez: de aquí sale la ventana de 24 horas. */
  ultimoMensajeClienteEn: string;
  ultimaActividadEn: string;
}

export type CategoriaEntrada = "envios" | "pagos" | "productos" | "garantia" | "tienda";

export const CATEGORIA_ROTULO: Record<CategoriaEntrada, string> = {
  envios: "Envíos",
  pagos: "Pagos",
  productos: "Productos",
  garantia: "Garantía",
  tienda: "La tienda",
};

export interface Entrada {
  id: string;
  pregunta: string;
  respuesta: string;
  categoria: CategoriaEntrada;
  /** Palabras que activan la entrada. Sin claves la entrada nunca se usa. */
  claves: string[];
  origen: "manual" | "aprendida";
  activa: boolean;
  actualizadaEn: string;
}

export interface Propuesta {
  id: string;
  conversacionId: string;
  preguntaCliente: string;
  /** Lo que la IA había redactado, si había redactado algo. */
  borradorIA: string | null;
  respuestaAgente: string;
  estado: "pendiente" | "aceptada" | "descartada";
  creadaEn: string;
}

export interface Ajustes {
  /** Por encima de este número la IA envía sola. Por debajo, redacta y espera. */
  umbral: number;
  /** Con esto apagado, todo pasa por una persona. */
  autoEnvio: boolean;
}

export const AJUSTES_INICIALES: Ajustes = { umbral: 0.7, autoEnvio: true };

/** Ventana de servicio de WhatsApp: fuera de ella sólo se puede enviar plantilla aprobada. */
export const HORAS_VENTANA = 24;

/**
 * Temas que nunca se contestan solos, por bien que calce la base.
 * No es un problema técnico: es una decisión del negocio.
 */
export const CLAVES_SENSIBLES = [
  "reclamo", "demanda", "abogado", "estafa", "denuncia",
  "robaron", "fraude", "devuelvan mi plata", "superintendencia",
];

export const CLAVES_PIDE_HUMANO = [
  "hablar con una persona", "con un asesor", "con un humano",
  "me pasa con alguien", "atienda una persona",
];

/** Sin tildes, sin mayúsculas y sin puntuación: así se comparan las claves. */
export function normalizar(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const cop = (v: number) =>
  v.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export function fueraDeVentana(c: Conversacion, ahora = Date.now()): boolean {
  return ahora - new Date(c.ultimoMensajeClienteEn).getTime() > HORAS_VENTANA * 3600000;
}

export function horasDesde(iso: string, ahora = Date.now()): number {
  return (ahora - new Date(iso).getTime()) / 3600000;
}

export function hace(iso: string, ahora = Date.now()): string {
  const m = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 60000));
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h ${m % 60} min`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}

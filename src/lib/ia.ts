/**
 * El que redacta. En producción esto es una llamada a un modelo de lenguaje
 * con la base de conocimiento como contexto; aquí es un comparador determinista,
 * para que la demostración muestre siempre lo mismo.
 *
 * La regla que no cambia entre los dos: la IA no responde sin fuente.
 * Si nada en la base cubre la pregunta, no inventa: pasa a una persona.
 */
import {
  CLAVES_PIDE_HUMANO, CLAVES_SENSIBLES, normalizar,
  type Entrada, type MotivoEscalada,
} from "./tipos";

export type Cobertura = "total" | "parcial";

export interface Redaccion {
  /** null cuando no hay nada que sostenga una respuesta. */
  texto: string | null;
  /** 0 cuando no hay fuentes. Nunca hay confianza sin fuente. */
  confianza: number;
  fuentes: string[];
  motivo?: MotivoEscalada;
  /** "parcial" cuando el mensaje pregunta más de una cosa y la base sólo cubre algunas. */
  cobertura: Cobertura;
  /** Las preguntas detectadas en el mensaje del cliente. */
  preguntas: string[];
}

const topa = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

function contiene(textoNormalizado: string, clave: string): boolean {
  return textoNormalizado.includes(normalizar(clave));
}

/** Una clave de varias palabras es evidencia más fuerte que una suelta. */
const peso = (clave: string) => normalizar(clave).split(" ").length;

/**
 * Un mensaje de WhatsApp casi nunca trae una sola pregunta. Se cuentan los
 * pedazos que terminan en signo de interrogación; si no hay ninguno, el mensaje
 * entero cuenta como una sola pregunta.
 */
export function preguntas(texto: string): string[] {
  const halladas = [...texto.matchAll(/([^?¿!.\n]{3,})\?/g)]
    .map((m) => m[1].replace(/^[\s,;¿]+/, "").trim())
    .filter((p) => p.split(/\s+/).length >= 2);
  return halladas.length ? halladas : [texto.trim()];
}

export function redactar(pregunta: string, entradas: Entrada[]): Redaccion {
  const t = normalizar(pregunta);

  // Estas dos mandan sobre cualquier puntaje: son decisiones del negocio.
  if (CLAVES_SENSIBLES.some((c) => contiene(t, c)))
    return { texto: null, confianza: 0, fuentes: [], motivo: "tema_sensible", cobertura: "total", preguntas: preguntas(pregunta) };
  if (CLAVES_PIDE_HUMANO.some((c) => contiene(t, c)))
    return { texto: null, confianza: 0, fuentes: [], motivo: "pidio_humano", cobertura: "total", preguntas: preguntas(pregunta) };

  const activas = entradas.filter((e) => e.activa);
  const puntajes = activas
    .map((e) => ({ e, p: e.claves.filter((c) => contiene(t, c)).reduce((s, c) => s + peso(c), 0) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p);

  const hechas = preguntas(pregunta);

  if (puntajes.length === 0)
    return { texto: null, confianza: 0, fuentes: [], motivo: "sin_respuesta", cobertura: "total", preguntas: hechas };

  // Una entrada entra como fuente si aporta algo sobre alguna parte del mensaje.
  const mejor = puntajes[0].p;
  const usadas = puntajes.filter((x) => x.p >= Math.max(2, mejor * 0.5) || x.p === mejor);

  const segundo = puntajes.find((x) => x.p < mejor)?.p ?? 0;
  const base = 0.45 + 0.13 * mejor;
  const ambiguedad = segundo / mejor;
  const confianza = Math.round(topa(base - 0.18 * ambiguedad, 0.1, 0.97) * 100) / 100;

  // El cliente preguntó más cosas de las que la base alcanza a sostener.
  const cobertura: Cobertura = hechas.length > usadas.length ? "parcial" : "total";

  return {
    texto: usadas.map((x) => x.e.respuesta).join("\n\n"),
    confianza,
    fuentes: usadas.map((x) => x.e.id),
    cobertura,
    preguntas: hechas,
  };
}

/** Claves para una entrada nueva, sacadas de la pregunta que nadie supo responder. */
const VACIAS = new Set([
  "hola", "buenas", "buenos", "dias", "tardes", "noches", "por", "favor", "gracias",
  "que", "de", "la", "el", "los", "las", "un", "una", "y", "o", "a", "en", "me",
  "mi", "se", "es", "con", "para", "del", "al", "lo", "su", "si", "no", "ustedes",
  "tienen", "hay", "como", "cual", "cuales", "donde", "cuando", "quiero", "necesito",
]);

export function clavesSugeridas(pregunta: string, maximo = 4): string[] {
  const vistas = new Set<string>();
  return normalizar(pregunta)
    .split(" ")
    .filter((p) => p.length > 3 && !VACIAS.has(p) && !vistas.has(p) && vistas.add(p))
    .slice(0, maximo);
}

/**
 * Qué hacer con lo redactado. Separado a propósito: cambiar el umbral o apagar
 * el envío automático no debería tocar nada más que esta función.
 */
export function decidir(
  r: Redaccion,
  ajustes: { umbral: number; autoEnvio: boolean },
): { estado: "automatica" | "espera_revision" | "escalada"; motivo?: MotivoEscalada } {
  if (r.motivo || r.texto === null) return { estado: "escalada", motivo: r.motivo ?? "sin_respuesta" };
  if (!ajustes.autoEnvio) return { estado: "espera_revision" };
  // El mensaje pregunta varias cosas y la base sólo contesta algunas: media
  // respuesta enviada sola es peor que ninguna, así que la ve una persona.
  if (r.cobertura === "parcial") return { estado: "espera_revision" };
  return r.confianza >= ajustes.umbral ? { estado: "automatica" } : { estado: "espera_revision" };
}

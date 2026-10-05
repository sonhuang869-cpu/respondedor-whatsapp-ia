/**
 * Datos de ejemplo: una tienda de repuestos de moto en Medellín que atiende por
 * WhatsApp. El negocio es inventado; lo que no es inventado es la forma de las
 * preguntas que llegan y lo que la IA puede o no puede contestar con ellas.
 *
 * Un solo reloj: todo sale de Date.now(), para que la bandeja se vea reciente
 * cualquier día que se abra.
 */
import { decidir, redactar } from "./ia";
import {
  AJUSTES_INICIALES,
  type Ajustes, type Contacto, type Conversacion, type Entrada,
  type Mensaje, type Propuesta,
} from "./tipos";

export interface Datos {
  contactos: Contacto[];
  conversaciones: Conversacion[];
  mensajes: Mensaje[];
  entradas: Entrada[];
  propuestas: Propuesta[];
  ajustes: Ajustes;
}

const MIN = 60000;

function entradas(ahora: number): Entrada[] {
  const t = (minutos: number) => new Date(ahora - minutos * MIN).toISOString();
  const base: Omit<Entrada, "id" | "actualizadaEn">[] = [
    {
      pregunta: "¿Cuál es el horario de atención?",
      respuesta: "Atendemos de lunes a viernes de 8:00 a.m. a 6:30 p.m. y los sábados de 8:00 a.m. a 2:00 p.m. Los domingos y festivos no abrimos.",
      categoria: "tienda", claves: ["horario", "a que hora", "abren", "cierran", "domingo", "festivo"],
      origen: "manual", activa: true,
    },
    {
      pregunta: "¿Dónde quedan ubicados?",
      respuesta: "Estamos en la Carrera 70 # 44-18, barrio Suramericana, Medellín. Hay parqueadero de motos al frente.",
      categoria: "tienda", claves: ["donde quedan", "direccion", "ubicacion", "como llego", "sede"],
      origen: "manual", activa: true,
    },
    {
      pregunta: "¿Hacen envíos a otras ciudades?",
      respuesta: "Sí, enviamos a todo el país por transportadora. Dentro del Valle de Aburrá hacemos domicilio propio el mismo día si el pedido entra antes de las 3:00 p.m.",
      categoria: "envios", claves: ["envian", "envio", "envios", "domicilio", "mandan a", "otra ciudad"],
      origen: "manual", activa: true,
    },
    {
      pregunta: "¿Cuánto cuesta el envío?",
      respuesta: "El domicilio en Medellín y el área metropolitana cuesta $12.000. A otras ciudades depende del peso y lo cotiza la transportadora; por encima de $350.000 el envío va por nuestra cuenta.",
      categoria: "envios", claves: ["cuanto vale el envio", "costo del envio", "precio del envio", "flete"],
      origen: "manual", activa: true,
    },
    {
      pregunta: "¿Cuánto se demora en llegar?",
      respuesta: "En Medellín y el área metropolitana, el mismo día. A ciudades principales, entre 2 y 3 días hábiles. A municipios, hasta 5 días hábiles.",
      categoria: "envios", claves: ["cuanto se demora", "tiempo de entrega", "cuando llega", "demora"],
      origen: "manual", activa: true,
    },
    {
      pregunta: "¿Qué formas de pago reciben?",
      respuesta: "Recibimos efectivo, Nequi, Daviplata, transferencia Bancolombia y tarjeta débito o crédito en el local. Contraentrega sólo en Medellín y el área metropolitana.",
      categoria: "pagos", claves: ["formas de pago", "como pago", "medios de pago", "nequi", "daviplata", "tarjeta", "contraentrega", "transferencia"],
      origen: "manual", activa: true,
    },
    {
      pregunta: "¿Hacen factura electrónica?",
      respuesta: "Sí. Nos envía razón social, NIT, dirección y correo, y la factura electrónica le llega el mismo día al correo que indique.",
      categoria: "pagos", claves: ["factura", "factura electronica", "nit", "razon social", "a nombre de la empresa"],
      origen: "manual", activa: true,
    },
    {
      pregunta: "¿Los repuestos tienen garantía?",
      respuesta: "Todos los repuestos nuevos tienen 3 meses de garantía por defecto de fábrica, contados desde la factura. La garantía no cubre desgaste normal ni instalación hecha por fuera de un taller.",
      categoria: "garantia", claves: ["garantia", "se dano", "no sirve", "salio malo", "defecto"],
      origen: "manual", activa: true,
    },
    {
      pregunta: "¿Puedo cambiar o devolver un repuesto?",
      respuesta: "Se cambia dentro de los 8 días siguientes a la compra, sin usar, en su empaque y con la factura. Los eléctricos no tienen cambio una vez instalados.",
      categoria: "garantia", claves: ["cambio", "cambiar", "devolver", "devolucion", "retracto"],
      origen: "manual", activa: true,
    },
    {
      pregunta: "¿Cómo sé si el repuesto sirve para mi moto?",
      respuesta: "Necesitamos marca, línea, cilindraje y modelo (año) de la moto. Con esos cuatro datos confirmamos compatibilidad antes de despachar.",
      categoria: "productos", claves: ["sirve para", "compatible", "le queda a", "que moto", "compatibilidad"],
      origen: "manual", activa: true,
    },
    {
      pregunta: "¿Venden al por mayor?",
      respuesta: "Sí, trabajamos con talleres y almacenes. Desde 10 unidades aplica precio mayorista; se solicita RUT y los pedidos salen con factura.",
      categoria: "pagos", claves: ["al por mayor", "mayorista", "descuento por cantidad", "taller", "precio especial"],
      origen: "manual", activa: true,
    },
    {
      pregunta: "¿Instalan los repuestos ahí mismo?",
      respuesta: "En el local hacemos montaje de guayas, pastillas, kit de arrastre y baterías. Trabajos de motor no los hacemos; remitimos a un taller aliado.",
      categoria: "tienda", claves: ["instalan", "montan", "montaje", "lo ponen", "me lo instalan"],
      origen: "manual", activa: true,
    },
    {
      // Entrada que ya nació de una corrección: cierra el ciclo de aprendizaje.
      pregunta: "¿Reciben motos en consignación?",
      respuesta: "No recibimos motos en consignación. Sólo vendemos repuestos y accesorios nuevos.",
      categoria: "tienda", claves: ["consignacion", "consignar"],
      origen: "aprendida", activa: true,
    },
  ];
  return base.map((e, i) => ({ ...e, id: `e${i + 1}`, actualizadaEn: t(60 * 24 * (13 - i) + i * 7) }));
}

const CONTACTOS: Omit<Contacto, "id">[] = [
  { nombre: "Camila Restrepo", telefono: "+57 310 442 1187" },
  { nombre: "Deisy Ocampo", telefono: "+57 321 907 3340" },
  { nombre: "Jorge Iván Mesa", telefono: "+57 300 615 8821" },
  { nombre: "Wílmar Giraldo", telefono: "+57 314 228 5096" },
  { nombre: "Yuliana Cardona", telefono: "+57 318 773 4412" },
  { nombre: "Esteban Quiceno", telefono: "+57 312 550 9073" },
  { nombre: "Maribel Agudelo", telefono: "+57 311 834 2265" },
  { nombre: "Andrés Zapata", telefono: "+57 320 146 7730" },
  { nombre: "Lorena Pulgarín", telefono: "+57 313 669 0254" },
  { nombre: "Héctor Marín", telefono: "+57 315 702 9918" },
  { nombre: "Sebastián Úsuga", telefono: "+57 304 381 6642" },
  { nombre: "Natalia Betancur", telefono: "+57 322 457 1083" },
];

/** Cada hilo: hace cuántos minutos escribió el cliente y qué escribió. */
const HILOS: { minutos: number; textos: string[]; resuelta?: boolean }[] = [
  { minutos: 4, textos: ["Buenas, ¿a qué hora abren hoy?"] },
  { minutos: 11, textos: ["Hola, ¿hacen envíos a Rionegro? ¿Cuánto vale el envío?"] },
  { minutos: 19, textos: ["¿Esta pastilla sirve para una Boxer 150?"] },
  { minutos: 27, textos: ["Buenas tardes, necesito factura electrónica a nombre de la empresa, ¿cuál es el proceso?"] },
  { minutos: 38, textos: ["Compré una guaya de freno el martes y ya se reventó. ¿Eso tiene garantía?"] },
  { minutos: 52, textos: ["Esto es una estafa, quiero poner un reclamo formal."] },
  { minutos: 64, textos: ["Necesito hablar con una persona por favor."] },
  { minutos: 73, textos: ["¿Tienen kit de arrastre para AKT NKD 125 modelo 2019? ¿Me lo instalan ahí mismo?"] },
  { minutos: 88, textos: ["¿Cuánto cuesta un casco certificado y lo envían a Bogotá?"] },
  { minutos: 106, textos: ["¿Ustedes compran repuestos usados?"] },
  { minutos: 143, textos: ["¿Qué formas de pago reciben?"], resuelta: true },
  { minutos: 60 * 31 + 17, textos: ["Quedé de confirmarles el color del guardabarros, ¿todavía lo tienen?"] },
];

export function generar(): Datos {
  const ahora = Date.now();
  const es = entradas(ahora);
  const ajustes = { ...AJUSTES_INICIALES };

  const contactos: Contacto[] = CONTACTOS.map((c, i) => ({ ...c, id: `c${i + 1}` }));
  const conversaciones: Conversacion[] = [];
  const mensajes: Mensaje[] = [];

  HILOS.forEach((h, i) => {
    const convId = `k${i + 1}`;
    const clienteEn = new Date(ahora - h.minutos * MIN).toISOString();
    let ultima = clienteEn;

    h.textos.forEach((texto, j) => {
      mensajes.push({
        id: `m${i + 1}_${j + 1}`, conversacionId: convId, autor: "cliente",
        texto, en: new Date(ahora - (h.minutos + (h.textos.length - 1 - j)) * MIN).toISOString(),
      });
    });

    const pregunta = h.textos[h.textos.length - 1];
    const r = redactar(pregunta, es);
    const d = decidir(r, ajustes);

    if (r.texto !== null) {
      // La respuesta sale medio minuto después de la pregunta; el borrador también existe.
      const en = new Date(ahora - (h.minutos - 0.5) * MIN).toISOString();
      mensajes.push({
        id: `m${i + 1}_ia`, conversacionId: convId, autor: "ia", texto: r.texto, en,
        confianza: r.confianza, fuentes: r.fuentes,
        cobertura: r.cobertura, preguntas: r.preguntas,
        borrador: d.estado !== "automatica",
      });
      if (d.estado === "automatica") ultima = en;
    }

    conversaciones.push({
      id: convId, contactoId: `c${i + 1}`,
      estado: h.resuelta ? "resuelta" : d.estado,
      motivo: h.resuelta ? undefined : d.motivo,
      ultimoMensajeClienteEn: clienteEn,
      ultimaActividadEn: ultima,
    });
  });

  const propuestas: Propuesta[] = [
    {
      id: "p1", conversacionId: "k10",
      preguntaCliente: "¿Ustedes compran repuestos usados?",
      borradorIA: null,
      respuestaAgente: "No compramos repuestos usados. Trabajamos únicamente con repuesto nuevo, con factura y garantía.",
      estado: "pendiente",
      creadaEn: new Date(ahora - 101 * MIN).toISOString(),
    },
    {
      id: "p2", conversacionId: "k9",
      preguntaCliente: "¿Cuánto cuesta un casco certificado?",
      borradorIA: "Enviamos a todo el país por transportadora.",
      respuestaAgente: "Los cascos certificados van desde $189.000 (abierto) hasta $420.000 (integral con doble visor). Todos cumplen norma NTC 4533.",
      estado: "pendiente",
      creadaEn: new Date(ahora - 84 * MIN).toISOString(),
    },
  ];

  return { contactos, conversaciones, mensajes, entradas: es, propuestas, ajustes };
}

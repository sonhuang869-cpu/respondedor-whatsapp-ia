# Respondedor · IA para WhatsApp

Bandeja de WhatsApp atendida por IA. Responde sola lo que la base de conocimiento
sostiene, deja un borrador cuando duda, pasa a una persona cuando no sabe, y
aprende de cada corrección.

Todo corre en el navegador. La tienda del ejemplo —Repuestos La 70, Medellín—,
los clientes y las conversaciones son inventados. **No se llama a ninguna API de
WhatsApp ni a ningún modelo de lenguaje.** Los datos quedan en `localStorage`,
sobreviven al recargar, y "Restaurar demostración" vuelve al estado inicial.

## La regla que ordena todo

**La IA no responde sin fuente.** Si ninguna entrada de la base cubre la pregunta,
no redacta nada y la conversación pasa a una persona. Una respuesta inventada con
tono seguro cuesta más que no contestar.

De ahí salen las cuatro decisiones posibles:

| Situación | Qué pasa |
|---|---|
| Confianza por encima del umbral y el mensaje queda cubierto | se envía sola |
| Confianza por debajo del umbral | queda un borrador esperando a una persona |
| El mensaje pregunta más cosas de las que la base sostiene | borrador, aunque la confianza sea alta |
| Nada en la base lo cubre, el tema es delicado, o piden humano | pasa a una persona sin responder |

## Qué se puede probar

- **Bandeja** — las doce conversaciones, con filtros por estado y búsqueda.
- **Andrés Zapata** — pregunta dos cosas y la base sólo cubre una. Confianza 97% y
  aun así no se envía sola: media respuesta enviada con seguridad es peor que ninguna.
- **Héctor Marín** — pregunta algo que la base no cubre. La IA no inventa.
- **Esteban Quiceno** y **Maribel Agudelo** — reclamo y pedido de hablar con una
  persona: pasan a un humano por decisión del negocio, no por falta de confianza.
- **Natalia Betancur** — su último mensaje tiene más de 24 horas. WhatsApp cierra
  la ventana de servicio y sólo permite plantillas aprobadas, así que el campo de
  texto libre queda bloqueado. Es la regla que más sorprende al pasar un bot a producción.
- **Corregir un borrador** y enviarlo: la corrección queda propuesta en Aprendizaje.
- **Aprendizaje** — aceptar una corrección la convierte en entrada de la base. Después
  la misma pregunta se contesta sola. El Probador lo muestra antes y después.
- **Probador** — escribir cualquier pregunta y ver qué haría la IA, con la confianza
  y las entradas que la sostienen, sin tocar ninguna conversación.
- **Panel** — mover el umbral o apagar el envío automático cambia la bandeja al instante.

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | Bandeja |
| `/conversacion/:id` | Hilo, borrador, fuentes y simulador de mensaje entrante |
| `/conocimiento` | Base de conocimiento, con alta, edición, borrado y activación |
| `/aprendizaje` | Correcciones pendientes de aceptar |
| `/probador` | Probar una pregunta suelta |
| `/panel` | Métricas y ajustes de automatización |

No hay login: la demostración entra directo a la bandeja.

## Dónde están las reglas

En `src/lib/`, no en las pantallas:

- `ia.ts` — redacta y decide. En producción, aquí va la llamada al modelo con la
  base como contexto; el contrato de la función no cambia.
- `api.ts` — la API simulada, con latencia. Reemplazarla por un backend real
  significa editar sólo este archivo.
- `seed.ts` — los datos de ejemplo, con un solo reloj, para que la bandeja se vea
  reciente cualquier día que se abra.
- `tipos.ts` — el dominio, la ventana de 24 horas y los temas que nunca se
  contestan solos.

## Correr

```bash
npm install
npm run dev     # desarrollo
npm run build   # producción
```

## Stack

Vite · React · TypeScript · Tailwind · shadcn/ui · React Router · Recharts.

Justin Gnoh · octubre de 2026

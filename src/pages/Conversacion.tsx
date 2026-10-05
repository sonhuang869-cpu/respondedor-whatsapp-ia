import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlarmClockOff, ArrowLeft, Bot, BookOpen, CircleCheck, Send, Sparkles, TriangleAlert, UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Confianza } from "@/components/Confianza";
import { EstadoPill } from "@/components/EstadoPill";
import { ListaBandeja } from "@/components/ListaBandeja";
import {
  enviarBorrador, getAjustes, getConversacion, recibirMensaje, resolver,
  responderComoAgente, type DetalleConversacion,
} from "@/lib/api";
import { AJUSTES_INICIALES, HORAS_VENTANA, MOTIVO_ROTULO, hace, horasDesde, type Ajustes } from "@/lib/tipos";
import NoEncontrada from "@/pages/NoEncontrada";

function Burbuja({ autor, children, pie }: { autor: "cliente" | "ia" | "agente"; children: React.ReactNode; pie: React.ReactNode }) {
  const mio = autor !== "cliente";
  const clase = autor === "cliente" ? "burbuja-cliente" : autor === "ia" ? "burbuja-ia" : "burbuja-agente";
  return (
    <div className={`flex ${mio ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 sm:max-w-[75%] ${clase}`}>
        <div className="text-sm whitespace-pre-line">{children}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{pie}</div>
      </div>
    </div>
  );
}

export default function Conversacion() {
  const { id = "" } = useParams();
  const [d, setD] = useState<DetalleConversacion | null | "cargando">("cargando");
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_INICIALES);
  const [texto, setTexto] = useState("");
  const [entrante, setEntrante] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const finDelHilo = useRef<HTMLDivElement>(null);

  const puxar = async () => {
    const r = await getConversacion(id);
    setD(r);
    const borrador = r?.mensajes.find((m) => m.borrador);
    setTexto(borrador?.texto ?? "");
    return r;
  };

  useEffect(() => {
    let vivo = true;
    getAjustes().then((a) => vivo && setAjustes(a));
    getConversacion(id).then((r) => {
      if (!vivo) return;
      setD(r);
      setTexto(r?.mensajes.find((m) => m.borrador)?.texto ?? "");
    });
    return () => { vivo = false; };
  }, [id]);

  useEffect(() => {
    if (d !== "cargando" && d) finDelHilo.current?.scrollIntoView({ block: "nearest" });
  }, [d]);

  const correr = async (clave: string, fn: () => Promise<unknown>, exito?: string) => {
    setOcupado(clave);
    try { await fn(); await puxar(); if (exito) toast.success(exito); }
    catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo"); await puxar(); }
    finally { setOcupado(null); }
  };

  if (d === "cargando")
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  if (!d) return <NoEncontrada />;

  const borrador = d.mensajes.find((m) => m.borrador);
  const fuera = d.fueraDeVentana && d.conversacion.estado !== "resuelta";
  const entrada = (id: string) => d.entradas.find((e) => e.id === id);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      <div className="hidden min-w-0 lg:block">
        <ListaBandeja seleccionada={d.conversacion.id} compacta />
      </div>

      <div className="min-w-0 space-y-4">
        <Link
          to="/"
          className="-ml-1 inline-flex min-h-11 items-center gap-1.5 px-1 text-sm text-muted-foreground hover:text-foreground lg:hidden"
        >
          <ArrowLeft className="size-4" aria-hidden /> Volver a la bandeja
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">{d.contacto.nombre}</h1>
            <p className="text-sm text-muted-foreground">{d.contacto.telefono}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EstadoPill estado={d.conversacion.estado} />
            {d.conversacion.estado !== "resuelta" && (
              <Button
                variant="outline"
                className="h-10 gap-2"
                disabled={!!ocupado}
                data-teste="resolver"
                onClick={() => correr("res", () => resolver(d.conversacion.id), "Conversación resuelta")}
              >
                <CircleCheck className="size-4" aria-hidden /> Marcar resuelta
              </Button>
            )}
          </div>
        </div>

        {fuera && (
          <div
            data-teste="aviso-ventana"
            className="flex gap-3 rounded-xl border border-humano/30 bg-humano/5 p-4 text-sm"
          >
            <AlarmClockOff className="mt-0.5 size-5 shrink-0 text-humano" aria-hidden />
            <div>
              <p className="font-medium text-humano">
                Pasaron {Math.floor(horasDesde(d.conversacion.ultimoMensajeClienteEn))} horas desde el último
                mensaje del cliente.
              </p>
              <p className="mt-1 text-muted-foreground">
                WhatsApp cierra la ventana de servicio a las {HORAS_VENTANA} horas. Después sólo se
                puede escribir con una plantilla aprobada por Meta, no con texto libre. Esta es la
                regla que más sorprende al pasar un bot a producción, y por eso está aquí.
              </p>
            </div>
          </div>
        )}

        <Card>
          <CardContent className="space-y-3 p-4">
            {d.mensajes.filter((m) => !m.borrador).map((m) => (
              <Burbuja
                key={m.id}
                autor={m.autor}
                pie={
                  <>
                    <span>{hace(m.en)}</span>
                    {m.autor === "ia" && (
                      <span className="inline-flex items-center gap-1">
                        <Bot className="size-3.5" aria-hidden /> IA
                        {typeof m.confianza === "number" && <span className="font-mono">{Math.round(m.confianza * 100)}%</span>}
                      </span>
                    )}
                    {m.autor === "agente" && (
                      <span className="inline-flex items-center gap-1"><UserRound className="size-3.5" aria-hidden /> Persona</span>
                    )}
                    {m.corregido && <span className="text-revisar">corregido antes de enviar</span>}
                  </>
                }
              >
                {m.texto}
              </Burbuja>
            ))}
            <div ref={finDelHilo} />
          </CardContent>
        </Card>

        {d.conversacion.estado === "escalada" && d.conversacion.motivo && (
          <Card className="border-humano/30">
            <CardContent className="space-y-3 p-4">
              <p className="flex items-center gap-2 font-medium text-humano">
                <TriangleAlert className="size-5" aria-hidden /> La IA no respondió
              </p>
              <p className="text-sm">{MOTIVO_ROTULO[d.conversacion.motivo]}</p>
              {d.conversacion.motivo === "sin_respuesta" && (
                <p className="text-sm text-muted-foreground">
                  Ninguna entrada de la base cubre lo que preguntó. Prefiere callarse a inventar,
                  porque una respuesta inventada con tono seguro es peor que no contestar.
                  Lo que escriba abajo queda propuesto para la base.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {borrador && (
          <Card className="border-primary/30">
            <CardContent className="space-y-4 p-4">
              <p className="flex items-center gap-2 font-medium">
                <Sparkles className="size-5 text-primary" aria-hidden /> Borrador de la IA
              </p>

              <Confianza valor={borrador.confianza ?? 0} umbral={ajustes.umbral} />

              {borrador.cobertura === "parcial" && (
                <div
                  data-teste="cobertura-parcial"
                  className="rounded-lg border border-revisar/30 bg-revisar/5 p-3 text-sm"
                >
                  <p className="font-medium text-revisar">El mensaje pregunta más de una cosa.</p>
                  <p className="mt-1 text-muted-foreground">
                    Detecté {borrador.preguntas?.length ?? 2} preguntas y la base sólo sostiene{" "}
                    {borrador.fuentes?.length ?? 1}. Por eso no se envió sola, aunque la confianza sea alta:
                    media respuesta enviada con seguridad es peor que ninguna.
                  </p>
                  {borrador.preguntas && (
                    <ul className="mt-2 space-y-1">
                      {borrador.preguntas.map((p) => (
                        <li key={p} className="text-muted-foreground">· {p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {borrador.fuentes && borrador.fuentes.length > 0 && (
                <div className="rounded-lg border border-border bg-secondary/40 p-3">
                  <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <BookOpen className="size-3.5" aria-hidden /> De dónde salió
                  </p>
                  <ul className="space-y-1 text-sm" data-teste="fuentes">
                    {borrador.fuentes.map((f) => (
                      <li key={f}>
                        <Link to="/conocimiento" className="inline-flex min-h-9 items-center underline-offset-2 hover:underline">
                          {entrada(f)?.pregunta ?? f}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="respuesta" className="text-sm font-medium">Respuesta que se va a enviar</label>
                <Textarea
                  id="respuesta"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={6}
                  data-teste="texto-respuesta"
                  disabled={fuera}
                />
                <p className="text-xs text-muted-foreground">
                  Si lo corrige, la corrección queda propuesta para la base y la próxima vez la IA
                  ya sabe. Eso se revisa en Aprendizaje.
                </p>
              </div>

              <Button
                className="h-11 w-full gap-2"
                disabled={!!ocupado || fuera || !texto.trim()}
                data-teste="enviar"
                onClick={() =>
                  correr("env", async () => {
                    const r = await enviarBorrador(d.conversacion.id, texto);
                    toast[r.propuesta ? "info" : "success"](
                      r.propuesta ? "Enviado. La corrección quedó propuesta para la base." : "Enviado tal cual lo redactó la IA.",
                    );
                  })
                }
              >
                <Send className="size-4" aria-hidden />
                {texto.trim() !== borrador.texto.trim() ? "Enviar corregido" : "Enviar tal cual"}
              </Button>
            </CardContent>
          </Card>
        )}

        {!borrador && d.conversacion.estado !== "resuelta" && (
          <Card>
            <CardContent className="space-y-3 p-4">
              <label htmlFor="agente" className="text-sm font-medium">Responder como persona</label>
              <Textarea
                id="agente"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={4}
                placeholder="Escriba la respuesta…"
                data-teste="texto-agente"
                disabled={fuera}
              />
              <Button
                className="h-11 w-full gap-2"
                disabled={!!ocupado || fuera || !texto.trim()}
                data-teste="responder-agente"
                onClick={() =>
                  correr("ag", async () => {
                    await responderComoAgente(d.conversacion.id, texto);
                    setTexto("");
                    toast.info("Enviado. Quedó propuesto para la base.");
                  })
                }
              >
                <Send className="size-4" aria-hidden /> Enviar y proponer para la base
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-dashed">
          <CardContent className="space-y-3 p-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Simular un mensaje del cliente
            </p>
            <p className="text-sm text-muted-foreground">
              Escriba lo que preguntaría un cliente y vea qué hace la IA: responder sola,
              dejar borrador o pasarlo a una persona.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Textarea
                value={entrante}
                onChange={(e) => setEntrante(e.target.value)}
                rows={2}
                placeholder="¿Hacen envíos a Cartagena?"
                aria-label="Mensaje del cliente"
                data-teste="texto-entrante"
                className="flex-1"
              />
              <Button
                variant="outline"
                className="h-11 gap-2 sm:self-end"
                disabled={!!ocupado || !entrante.trim()}
                data-teste="simular-entrante"
                onClick={() =>
                  correr("ent", async () => {
                    await recibirMensaje(d.conversacion.id, entrante);
                    setEntrante("");
                  }, "Mensaje recibido")
                }
              >
                Enviar como cliente
              </Button>
            </div>
          </CardContent>
        </Card>

        <Link to="/" className={`${buttonVariants({ variant: "outline" })} h-11 w-full lg:hidden`}>
          Volver a la bandeja
        </Link>
      </div>
    </div>
  );
}

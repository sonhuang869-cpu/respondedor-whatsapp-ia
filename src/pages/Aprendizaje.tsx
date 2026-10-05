import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Check, GraduationCap, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { aceptarPropuesta, descartarPropuesta, getPropuestas } from "@/lib/api";
import { clavesSugeridas } from "@/lib/ia";
import { hace, type Propuesta } from "@/lib/tipos";

export default function Aprendizaje() {
  const [propuestas, setPropuestas] = useState<Propuesta[] | null>(null);
  const [claves, setClaves] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState<string | null>(null);

  const puxar = async () => {
    const p = await getPropuestas();
    setPropuestas(p);
    setClaves((previo) => {
      const siguiente = { ...previo };
      p.filter((x) => x.estado === "pendiente").forEach((x) => {
        if (siguiente[x.id] === undefined) siguiente[x.id] = clavesSugeridas(x.preguntaCliente).join(", ");
      });
      return siguiente;
    });
  };
  useEffect(() => { puxar(); }, []);

  const pendientes = propuestas?.filter((p) => p.estado === "pendiente") ?? [];
  const revisadas = propuestas?.filter((p) => p.estado !== "pendiente") ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <GraduationCap className="size-6 text-primary" aria-hidden /> Aprendizaje
        </h1>
        <p className="text-sm text-muted-foreground">
          Cada vez que una persona corrige a la IA o contesta algo que la base no cubría, la
          respuesta queda aquí. Al aceptarla, entra a la base y la próxima vez se contesta sola.
        </p>
      </div>

      {!propuestas ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          {pendientes.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground" data-teste="sin-pendientes">
              No hay correcciones por revisar. Corrija un borrador en la{" "}
              <Link to="/" className="underline underline-offset-2">bandeja</Link> y vuelva aquí.
            </p>
          ) : (
            <ul className="space-y-3" data-teste="lista-propuestas">
              {pendientes.map((p) => (
                <li key={p.id}>
                  <Card>
                    <CardContent className="space-y-4 p-4">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          El cliente preguntó
                        </p>
                        <p className="burbuja-cliente rounded-2xl px-3.5 py-2.5 text-sm">{p.preguntaCliente}</p>
                      </div>

                      {p.borradorIA && (
                        <div className="space-y-1">
                          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            <Bot className="size-3.5" aria-hidden /> La IA había redactado
                          </p>
                          <p className="burbuja-ia rounded-2xl px-3.5 py-2.5 text-sm line-through decoration-humano/60">
                            {p.borradorIA}
                          </p>
                        </div>
                      )}

                      <div className="space-y-1">
                        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                          <UserRound className="size-3.5" aria-hidden /> La persona respondió
                        </p>
                        <p className="burbuja-agente rounded-2xl px-3.5 py-2.5 text-sm">{p.respuestaAgente}</p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`claves-${p.id}`}>Claves que activarán la respuesta</Label>
                        <Input
                          id={`claves-${p.id}`}
                          value={claves[p.id] ?? ""}
                          onChange={(e) => setClaves((c) => ({ ...c, [p.id]: e.target.value }))}
                          data-teste="claves-propuesta"
                          className="h-11"
                        />
                        <p className="text-xs text-muted-foreground">
                          Sugeridas a partir de la pregunta. Ajústelas antes de aceptar: de esto
                          depende que la entrada se use cuando toca.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          className="h-11 gap-2 sm:flex-1"
                          disabled={ocupado === p.id || !(claves[p.id] ?? "").trim()}
                          data-teste="aceptar-propuesta"
                          onClick={async () => {
                            setOcupado(p.id);
                            try {
                              await aceptarPropuesta(p.id, (claves[p.id] ?? "").split(",").map((c) => c.trim()).filter(Boolean));
                              await puxar();
                              toast.success("Agregada a la base. La próxima vez se contesta sola.");
                            } catch (e) {
                              toast.error(e instanceof Error ? e.message : "No se pudo");
                            } finally { setOcupado(null); }
                          }}
                        >
                          <Check className="size-4" aria-hidden /> Aceptar y agregar a la base
                        </Button>
                        <Button
                          variant="outline"
                          className="h-11 gap-2"
                          disabled={ocupado === p.id}
                          data-teste="descartar-propuesta"
                          onClick={async () => {
                            setOcupado(p.id);
                            try { await descartarPropuesta(p.id); await puxar(); toast.success("Descartada"); }
                            finally { setOcupado(null); }
                          }}
                        >
                          <X className="size-4" aria-hidden /> Descartar
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Propuesta {hace(p.creadaEn)}</p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}

          {revisadas.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">Ya revisadas</h2>
              <ul className="space-y-2" data-teste="revisadas">
                {revisadas.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                    <span className="min-w-0 truncate">{p.preguntaCliente}</span>
                    <span className={`shrink-0 text-xs ${p.estado === "aceptada" ? "text-auto" : "text-muted-foreground"}`}>
                      {p.estado === "aceptada" ? "Aceptada" : "Descartada"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

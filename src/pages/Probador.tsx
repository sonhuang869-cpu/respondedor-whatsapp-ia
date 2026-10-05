import { useState } from "react";
import { Link } from "react-router-dom";
import { Beaker, Bot, BookOpen, Loader2, TriangleAlert, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Confianza } from "@/components/Confianza";
import { EstadoPill } from "@/components/EstadoPill";
import { getAjustes, probar } from "@/lib/api";
import { AJUSTES_INICIALES, MOTIVO_ROTULO, type Ajustes } from "@/lib/tipos";
import { useEffect } from "react";

const EJEMPLOS = [
  "¿A qué hora abren los domingos?",
  "¿Hacen envíos a Cartagena y cuánto vale?",
  "¿Tienen amortiguadores para una Pulsar NS 200?",
  "Esto es una estafa, voy a poner un reclamo",
  "¿Me prestan una moto mientras reparan la mía?",
];

type Resultado = Awaited<ReturnType<typeof probar>>;

export default function Probador() {
  const [texto, setTexto] = useState("");
  const [r, setR] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_INICIALES);

  useEffect(() => { getAjustes().then(setAjustes); }, []);

  const correr = async (t: string) => {
    setTexto(t);
    setCargando(true);
    try { setR(await probar(t)); } finally { setCargando(false); }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Beaker className="size-6 text-primary" aria-hidden /> Probador
        </h1>
        <p className="text-sm text-muted-foreground">
          Escriba cualquier pregunta y vea qué haría la IA, sin tocar ninguna conversación.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            placeholder="¿Cuánto se demora un envío a Pereira?"
            aria-label="Pregunta de prueba"
            data-teste="texto-probador"
          />
          <div className="flex flex-wrap gap-1.5">
            {EJEMPLOS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => correr(e)}
                className="min-h-9 rounded-full border border-border px-3 text-xs hover:bg-secondary"
              >
                {e}
              </button>
            ))}
          </div>
          <Button
            className="h-11 w-full gap-2"
            disabled={!texto.trim() || cargando}
            data-teste="probar"
            onClick={() => correr(texto)}
          >
            {cargando && <Loader2 className="size-4 animate-spin" aria-hidden />} Ver qué haría
          </Button>
        </CardContent>
      </Card>

      {r && (
        <Card data-teste="resultado-probador">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <EstadoPill estado={r.estado} />
              <span className="text-sm text-muted-foreground">
                {r.estado === "automatica" && "Se enviaría sola, sin que nadie la mire."}
                {r.estado === "espera_revision" && "Quedaría como borrador esperando a una persona."}
                {r.estado === "escalada" && "Pasaría a una persona sin responder nada."}
              </span>
            </div>

            {r.motivo && (
              <p className="flex items-start gap-2 rounded-lg border border-humano/30 bg-humano/5 p-3 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-humano" aria-hidden />
                {MOTIVO_ROTULO[r.motivo]}
              </p>
            )}

            {r.texto === null ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No redacta nada. Sin una entrada que sostenga la respuesta, no inventa.
              </p>
            ) : (
              <>
                <Confianza valor={r.confianza} umbral={ajustes.umbral} />
                {r.cobertura === "parcial" && (
                  <p className="rounded-lg border border-revisar/30 bg-revisar/5 p-3 text-sm">
                    Son {r.preguntas.length} preguntas y la base sostiene {r.fuentes.length}.
                    Por eso no se enviaría sola.
                  </p>
                )}
                <div className="burbuja-ia rounded-2xl p-3.5 text-sm whitespace-pre-line">{r.texto}</div>
                <div className="rounded-lg border border-border bg-secondary/40 p-3">
                  <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <BookOpen className="size-3.5" aria-hidden /> De dónde salió
                  </p>
                  <ul className="space-y-1 text-sm">
                    {r.fuentesDetalle.map((e) => (
                      <li key={e.id}>{e.pregunta}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              {r.estado === "automatica"
                ? <Bot className="size-3.5" aria-hidden />
                : <UserRound className="size-3.5" aria-hidden />}
              ¿Falta una respuesta? Se agrega en <Link to="/conocimiento" className="underline underline-offset-2">Conocimiento</Link>.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

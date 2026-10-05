import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlarmClockOff, Bot, GaugeCircle, GraduationCap, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { getAjustes, getResumen, guardarAjustes, type Resumen } from "@/lib/api";
import { CATEGORIA_ROTULO, ESTADO_ROTULO, type Ajustes, type CategoriaEntrada, type EstadoConversacion } from "@/lib/tipos";

/** El slider de Base UI entrega número o arreglo según cuántos pulgares tenga. */
const unico = (v: number | readonly number[]) => (Array.isArray(v) ? v[0] : (v as number));

const COLOR: Record<EstadoConversacion, string> = {
  automatica: "var(--auto)",
  espera_revision: "var(--revisar)",
  escalada: "var(--humano)",
  resuelta: "var(--resuelto)",
};

function Kpi({ valor, rotulo, Icono, tono }: { valor: string; rotulo: string; Icono: typeof Bot; tono: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icono className={`mb-2 size-5 ${tono}`} aria-hidden />
        <p className="text-2xl font-bold tabular-nums">{valor}</p>
        <p className="text-sm text-muted-foreground">{rotulo}</p>
      </CardContent>
    </Card>
  );
}

export default function Panel() {
  const [r, setR] = useState<Resumen | null>(null);
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [guardando, setGuardando] = useState(false);

  const puxar = async () => setR(await getResumen());
  useEffect(() => { puxar(); getAjustes().then(setAjustes); }, []);

  const aplicar = async (a: Ajustes) => {
    setAjustes(a);
    setGuardando(true);
    try {
      const n = await guardarAjustes(a);
      await puxar();
      toast.success(n === 0 ? "Ajuste guardado. Ninguna conversación cambió." : `Ajuste guardado. ${n} conversación${n === 1 ? "" : "es"} cambió de estado.`);
    } finally { setGuardando(false); }
  };

  if (!r || !ajustes)
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );

  const porEstado = (Object.keys(ESTADO_ROTULO) as EstadoConversacion[])
    .map((e) => ({ estado: e, rotulo: ESTADO_ROTULO[e], n: r.porEstado[e] }));
  const porCategoria = r.porCategoria
    .map((c) => ({ rotulo: CATEGORIA_ROTULO[c.categoria as CategoriaEntrada] ?? c.categoria, usos: c.usos }))
    .sort((a, b) => b.usos - a.usos);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <GaugeCircle className="size-6 text-primary" aria-hidden /> Panel
        </h1>
        <p className="text-sm text-muted-foreground">
          Todo lo de abajo sale de las {r.total} conversaciones que están en la bandeja ahora.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi valor={`${r.automatizacion}%`} rotulo="Resueltas sin que nadie mire" Icono={Bot} tono="text-auto" />
        <Kpi valor={String(r.porEstado.espera_revision)} rotulo="Borradores esperando" Icono={GraduationCap} tono="text-revisar" />
        <Kpi valor={String(r.porEstado.escalada)} rotulo="Esperando a una persona" Icono={UserRound} tono="text-humano" />
        <Kpi valor={String(r.fueraDeVentana)} rotulo="Fuera de la ventana de 24 h" Icono={AlarmClockOff} tono="text-humano" />
      </div>

      <Card>
        <CardContent className="space-y-5 p-4">
          <div>
            <h2 className="font-semibold">Cuándo responde sola</h2>
            <p className="text-sm text-muted-foreground">
              Esto es la decisión del negocio, no un detalle técnico. Mover el umbral cambia
              ahora mismo lo que está en la bandeja.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="umbral">Confianza mínima para enviar sola</Label>
              <span className="font-mono text-lg font-bold tabular-nums">{Math.round(ajustes.umbral * 100)}%</span>
            </div>
            <Slider
              id="umbral"
              value={[ajustes.umbral * 100]}
              min={50}
              max={95}
              step={5}
              disabled={guardando || !ajustes.autoEnvio}
              data-teste="umbral"
              onValueChange={(v) => setAjustes({ ...ajustes, umbral: unico(v) / 100 })}
              onValueCommitted={(v) => aplicar({ ...ajustes, umbral: unico(v) / 100 })}
            />
            <p className="text-xs text-muted-foreground">
              Más alto: responde menos sola y molesta menos al cliente con respuestas flojas.
              Más bajo: atiende más volumen y se equivoca más seguido.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="auto" className="font-medium">Envío automático</Label>
              <p className="text-sm text-muted-foreground">
                Apagado, todo queda como borrador y nada sale sin que una persona lo vea.
              </p>
            </div>
            <Switch
              id="auto"
              checked={ajustes.autoEnvio}
              disabled={guardando}
              data-teste="auto-envio"
              onCheckedChange={(v) => aplicar({ ...ajustes, autoEnvio: v })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 font-semibold">En qué terminó cada conversación</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porEstado} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis type="category" dataKey="rotulo" width={130} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip
                    cursor={{ fill: "var(--secondary)" }}
                    formatter={(v) => [`${Number(v)} conversación${Number(v) === 1 ? "" : "es"}`, ""]}
                    contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 13 }}
                  />
                  <Bar dataKey="n" radius={4} barSize={18}>
                    {porEstado.map((d) => <Cell key={d.estado} fill={COLOR[d.estado]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="mb-3 font-semibold">Qué se pregunta más</h2>
            {porCategoria.every((c) => c.usos === 0) ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Todavía no se ha usado ninguna entrada.
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porCategoria} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis type="category" dataKey="rotulo" width={110} tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip
                      cursor={{ fill: "var(--secondary)" }}
                      formatter={(v) => [`${Number(v)} ${Number(v) === 1 ? "respuesta" : "respuestas"}`, ""]}
                      contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 13 }}
                    />
                    <Bar dataKey="usos" fill="var(--primary)" radius={4} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Las categorías con más uso son las que conviene afinar primero. Hay{" "}
              {r.entradasActivas} entradas activas y {r.propuestasPendientes} correcciones por revisar.
            </p>
          </CardContent>
        </Card>
      </div>

      {r.sinCobertura > 0 && (
        <Card className="border-humano/30">
          <CardContent className="p-4">
            <p className="font-medium text-humano">
              {r.sinCobertura} {r.sinCobertura === 1 ? "pregunta" : "preguntas"} que la base no cubre
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Son las que la IA pasó a una persona por no tener con qué responder. Cada una es una
              entrada que falta, y es la lista por donde conviene empezar a crecer la base.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

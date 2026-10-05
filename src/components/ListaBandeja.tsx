import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlarmClockOff, Bot, Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoPill } from "@/components/EstadoPill";
import { getBandeja, type ConversacionVista } from "@/lib/api";
import { ESTADO_ROTULO, hace, normalizar, type EstadoConversacion } from "@/lib/tipos";

const FILTROS: { clave: EstadoConversacion | "todas"; rotulo: string }[] = [
  { clave: "todas", rotulo: "Todas" },
  { clave: "espera_revision", rotulo: "Por revisar" },
  { clave: "escalada", rotulo: "Para una persona" },
  { clave: "automatica", rotulo: "Automáticas" },
  { clave: "resuelta", rotulo: "Resueltas" },
];

export function ListaBandeja({ seleccionada, compacta }: { seleccionada?: string; compacta?: boolean }) {
  const [datos, setDatos] = useState<ConversacionVista[] | null>(null);
  const [filtro, setFiltro] = useState<EstadoConversacion | "todas">("todas");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    let vivo = true;
    getBandeja().then((d) => vivo && setDatos(d));
    return () => { vivo = false; };
  }, [seleccionada]);

  const cuentas = useMemo(() => {
    const c: Record<string, number> = { todas: datos?.length ?? 0 };
    datos?.forEach((v) => { c[v.conversacion.estado] = (c[v.conversacion.estado] ?? 0) + 1; });
    return c;
  }, [datos]);

  const visibles = useMemo(() => {
    if (!datos) return [];
    const q = normalizar(busqueda);
    return datos.filter((v) =>
      (filtro === "todas" || v.conversacion.estado === filtro) &&
      (!q || normalizar(v.contacto.nombre).includes(q) || normalizar(v.ultimoTexto).includes(q)));
  }, [datos, filtro, busqueda]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o mensaje"
          aria-label="Buscar conversaciones"
          className="h-11 pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
        {FILTROS.map(({ clave, rotulo }) => (
          <button
            key={clave}
            type="button"
            data-teste={`filtro-${clave}`}
            aria-pressed={filtro === clave}
            onClick={() => setFiltro(clave)}
            className={`min-h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
              filtro === clave ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
            }`}
          >
            {rotulo}
            {datos && <span className="ml-1.5 opacity-70">{cuentas[clave] ?? 0}</span>}
          </button>
        ))}
      </div>

      {!datos ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground" data-teste="vacio">
          No hay conversaciones {filtro === "todas" ? "" : `en "${ESTADO_ROTULO[filtro as EstadoConversacion]}"`}
          {busqueda && ` que digan "${busqueda}"`}.
        </p>
      ) : (
        <ul className="space-y-2" data-teste="lista">
          {visibles.map((v) => (
            <li key={v.conversacion.id}>
              <Link
                to={`/conversacion/${v.conversacion.id}`}
                data-teste="fila-conversacion"
                className={`block rounded-xl border p-3 transition-colors hover:bg-secondary/60 ${
                  seleccionada === v.conversacion.id ? "border-primary bg-accent/50" : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate font-semibold">{v.contacto.nombre}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {hace(v.conversacion.ultimaActividadEn)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {v.ultimoAutor === "cliente" ? null : (
                    <span className="mr-1 inline-flex align-[-2px] text-foreground/60">
                      {v.ultimoAutor === "ia"
                        ? <Bot className="size-3.5" aria-label="Respuesta de la IA" />
                        : <UserRound className="size-3.5" aria-label="Respuesta de una persona" />}
                    </span>
                  )}
                  {v.ultimoTexto}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <EstadoPill estado={v.conversacion.estado} corto={compacta} />
                  {v.fueraDeVentana && v.conversacion.estado !== "resuelta" && (
                    <span
                      data-teste="fuera-ventana"
                      className="inline-flex items-center gap-1 rounded-full border border-humano/30 bg-humano/10 px-2 py-0.5 text-xs text-humano"
                    >
                      <AlarmClockOff className="size-3.5" aria-hidden /> Fuera de las 24 h
                    </span>
                  )}
                  {v.confianza !== null && v.confianza > 0 && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {Math.round(v.confianza * 100)}%
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

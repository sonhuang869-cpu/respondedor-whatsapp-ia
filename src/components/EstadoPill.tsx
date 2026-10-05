import { Bot, CircleCheck, Clock, UserRound } from "lucide-react";
import { ESTADO_ROTULO, type EstadoConversacion } from "@/lib/tipos";

const ESTILO: Record<EstadoConversacion, { clase: string; Icono: typeof Bot }> = {
  automatica: { clase: "border-auto/30 bg-auto/10 text-auto", Icono: Bot },
  espera_revision: { clase: "border-revisar/35 bg-revisar/10 text-revisar", Icono: Clock },
  escalada: { clase: "border-humano/30 bg-humano/10 text-humano", Icono: UserRound },
  resuelta: { clase: "border-border bg-muted text-muted-foreground", Icono: CircleCheck },
};

export function EstadoPill({ estado, corto }: { estado: EstadoConversacion; corto?: boolean }) {
  const { clase, Icono } = ESTILO[estado];
  return (
    <span
      data-estado={estado}
      title={corto ? ESTADO_ROTULO[estado] : undefined}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${clase}`}
    >
      <Icono className="size-3.5 shrink-0" aria-hidden />
      {corto ? <span className="sr-only">{ESTADO_ROTULO[estado]}</span> : ESTADO_ROTULO[estado]}
    </span>
  );
}

/** Barra de confianza con el umbral marcado, para ver de un vistazo por qué se envió o no. */
export function Confianza({ valor, umbral }: { valor: number; umbral: number }) {
  const pct = Math.round(valor * 100);
  const supera = valor >= umbral;
  return (
    <div className="space-y-1" data-teste="confianza" data-valor={valor}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">Confianza</span>
        <span className={`font-mono font-semibold ${supera ? "text-auto" : "text-revisar"}`}>{pct}%</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${supera ? "bg-auto" : "bg-revisar"}`}
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-foreground/45"
          style={{ left: `${Math.round(umbral * 100)}%` }}
          aria-hidden
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Umbral actual {Math.round(umbral * 100)}%. {supera ? "Por encima: se envía sola." : "Por debajo: la ve una persona."}
      </p>
    </div>
  );
}

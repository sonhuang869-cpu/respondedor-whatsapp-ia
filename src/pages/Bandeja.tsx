import { MessagesSquare } from "lucide-react";
import { ListaBandeja } from "@/components/ListaBandeja";

export default function Bandeja() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">Bandeja</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Lo que llegó por WhatsApp y qué hizo la IA con cada mensaje.
        </p>
        <ListaBandeja />
      </div>

      <div className="hidden min-h-[60vh] place-items-center rounded-2xl border border-dashed border-border lg:grid">
        <div className="max-w-sm px-6 text-center">
          <MessagesSquare className="mx-auto mb-3 size-10 text-muted-foreground/60" aria-hidden />
          <p className="font-medium">Abra una conversación</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Verá el hilo, lo que la IA redactó, de dónde sacó la respuesta y
            por qué la envió sola o la dejó esperando.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BookOpen, GaugeCircle, GraduationCap, Inbox, Menu, MessageSquareText, RotateCcw, Beaker } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { restaurar } from "@/lib/api";

const ENLACES = [
  { a: "/", rotulo: "Bandeja", Icono: Inbox, exacto: true },
  { a: "/conocimiento", rotulo: "Conocimiento", Icono: BookOpen },
  { a: "/aprendizaje", rotulo: "Aprendizaje", Icono: GraduationCap },
  { a: "/probador", rotulo: "Probador", Icono: Beaker },
  { a: "/panel", rotulo: "Panel", Icono: GaugeCircle },
];

function Navegacion({ alNavegar }: { alNavegar?: () => void }) {
  return (
    <nav className="space-y-1" aria-label="Secciones">
      {ENLACES.map(({ a, rotulo, Icono, exacto }) => (
        <NavLink
          key={a}
          to={a}
          end={exacto}
          onClick={alNavegar}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
              isActive ? "bg-primary text-primary-foreground" : "text-foreground/75 hover:bg-secondary"
            }`
          }
        >
          <Icono className="size-4 shrink-0" aria-hidden />
          {rotulo}
        </NavLink>
      ))}
    </nav>
  );
}

function BotonRestaurar({ alTerminar }: { alTerminar: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger className={`${buttonVariants({ variant: "outline" })} h-11 w-full gap-2`}>
        <RotateCcw className="size-4" aria-hidden /> Restaurar demostración
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Restaurar la demostración?</AlertDialogTitle>
          <AlertDialogDescription>
            Se pierden las respuestas enviadas, las entradas nuevas y las correcciones
            aceptadas. Vuelven las doce conversaciones de ejemplo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={buttonVariants({ variant: "outline" })}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants()}
            onClick={async () => { await restaurar(); toast.success("Demostración restaurada"); alTerminar(); }}
          >
            Restaurar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Layout() {
  const [abierto, setAbierto] = useState(false);
  const navegar = useNavigate();
  const volverAlInicio = () => { setAbierto(false); navegar("/", { replace: true }); };

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1400px]">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card/60 p-4 lg:flex">
          <div className="mb-6 flex items-center gap-2 px-1">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <MessageSquareText className="size-5" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold">Respondedor</p>
              <p className="text-xs text-muted-foreground">Repuestos La 70</p>
            </div>
          </div>
          <Navegacion />
          <div className="mt-auto pt-4">
            <BotonRestaurar alTerminar={volverAlInicio} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-2 border-b border-border bg-card/60 px-4 py-3 lg:hidden">
            <Sheet open={abierto} onOpenChange={setAbierto}>
              <SheetTrigger
                className={`${buttonVariants({ variant: "outline", size: "icon" })} size-11`}
                aria-label="Abrir menú"
              >
                <Menu className="size-5" aria-hidden />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <SheetTitle className="mb-5 flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                    <MessageSquareText className="size-5" aria-hidden />
                  </span>
                  Respondedor
                </SheetTitle>
                <Navegacion alNavegar={() => setAbierto(false)} />
                <div className="mt-6">
                  <BotonRestaurar alTerminar={volverAlInicio} />
                </div>
              </SheetContent>
            </Sheet>
            <span className="font-bold">Respondedor</span>
          </header>

          <main className="min-w-0 flex-1 p-4 sm:p-6">
            <Outlet />
          </main>

          <footer className="border-t border-border px-4 py-5 text-xs text-muted-foreground sm:px-6">
            Demostración para evaluación. La tienda, los clientes y las conversaciones son
            inventados. No se llama a ninguna API de WhatsApp ni a ningún modelo de lenguaje:
            las respuestas salen de la base de conocimiento que está en la pestaña Conocimiento.
            Los datos quedan en este navegador. Justin Gnoh · octubre de 2026
          </footer>
        </div>
      </div>
    </div>
  );
}

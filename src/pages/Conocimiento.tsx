import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, GraduationCap, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { borrarEntrada, getEntradas, guardarEntrada } from "@/lib/api";
import { CATEGORIA_ROTULO, hace, normalizar, type CategoriaEntrada, type Entrada } from "@/lib/tipos";

const esquema = z.object({
  pregunta: z.string().trim().min(8, "Escriba la pregunta como la haría un cliente."),
  respuesta: z.string().trim().min(20, "La respuesta tiene que decir algo útil: mínimo 20 caracteres."),
  categoria: z.string().min(1),
  claves: z.string().trim().min(3, "Sin claves la entrada nunca se usa. Separe con comas."),
});
type Campos = z.infer<typeof esquema>;

const CATEGORIAS = Object.keys(CATEGORIA_ROTULO) as CategoriaEntrada[];

export default function Conocimiento() {
  const [entradas, setEntradas] = useState<Entrada[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<CategoriaEntrada | "todas">("todas");
  const [editando, setEditando] = useState<Entrada | "nueva" | null>(null);
  const [borrando, setBorrando] = useState<Entrada | null>(null);

  const form = useForm<Campos>({
    resolver: zodResolver(esquema),
    defaultValues: { pregunta: "", respuesta: "", categoria: "tienda", claves: "" },
  });

  const puxar = async () => setEntradas(await getEntradas());
  useEffect(() => { puxar(); }, []);

  useEffect(() => {
    if (editando === "nueva") form.reset({ pregunta: "", respuesta: "", categoria: "tienda", claves: "" });
    else if (editando) form.reset({
      pregunta: editando.pregunta, respuesta: editando.respuesta,
      categoria: editando.categoria, claves: editando.claves.join(", "),
    });
  }, [editando, form]);

  const visibles = useMemo(() => {
    if (!entradas) return [];
    const q = normalizar(busqueda);
    return entradas.filter((e) =>
      (categoria === "todas" || e.categoria === categoria) &&
      (!q || normalizar(e.pregunta).includes(q) || normalizar(e.respuesta).includes(q) ||
        e.claves.some((c) => normalizar(c).includes(q))));
  }, [entradas, busqueda, categoria]);

  const enviar = form.handleSubmit(async (v) => {
    const claves = v.claves.split(",").map((c) => c.trim()).filter(Boolean);
    if (claves.length === 0) {
      form.setError("claves", { message: "Al menos una clave." });
      return;
    }
    await guardarEntrada({
      id: editando === "nueva" ? undefined : editando?.id,
      pregunta: v.pregunta.trim(), respuesta: v.respuesta.trim(),
      categoria: v.categoria as CategoriaEntrada, claves,
      origen: editando === "nueva" ? "manual" : (editando?.origen ?? "manual"),
      activa: editando === "nueva" ? true : (editando?.activa ?? true),
    });
    setEditando(null);
    await puxar();
    toast.success(editando === "nueva" ? "Entrada agregada" : "Entrada actualizada");
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BookOpen className="size-6 text-primary" aria-hidden /> Conocimiento
          </h1>
          <p className="text-sm text-muted-foreground">
            Todo lo que la IA puede responder sale de aquí. Lo que no está aquí, no se contesta.
          </p>
        </div>
        <Button className="h-11 gap-2" data-teste="nueva-entrada" onClick={() => setEditando("nueva")}>
          <Plus className="size-4" aria-hidden /> Agregar respuesta
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en preguntas, respuestas y claves"
            aria-label="Buscar en el conocimiento"
            className="h-11 pl-9"
          />
        </div>
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaEntrada | "todas")}
          aria-label="Filtrar por categoría"
          data-teste="filtro-categoria"
          className="h-11 rounded-lg border border-input bg-card px-3 text-sm"
        >
          <option value="todas">Todas las categorías</option>
          {CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_ROTULO[c]}</option>)}
        </select>
      </div>

      {!entradas ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : visibles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground" data-teste="vacio">
          Ninguna entrada coincide. Pruebe con otra palabra o agregue la respuesta que falta.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2" data-teste="lista-entradas">
          {visibles.map((e) => (
            <li key={e.id}>
              <Card className={e.activa ? "" : "opacity-60"}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{e.pregunta}</p>
                    <Switch
                      checked={e.activa}
                      aria-label={e.activa ? "Desactivar entrada" : "Activar entrada"}
                      data-teste={`activa-${e.id}`}
                      onCheckedChange={async (v) => {
                        await guardarEntrada({ ...e, activa: v });
                        await puxar();
                        toast.success(v ? "Entrada activa" : "Entrada desactivada: la IA deja de usarla");
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{e.respuesta}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                      {CATEGORIA_ROTULO[e.categoria]}
                    </span>
                    {e.origen === "aprendida" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        <GraduationCap className="size-3.5" aria-hidden /> Aprendida
                      </span>
                    )}
                    {e.claves.map((c) => (
                      <span key={c} className="rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-muted-foreground">
                        {c}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Actualizada {hace(e.actualizadaEn)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="size-10" aria-label={`Editar ${e.pregunta}`}
                        onClick={() => setEditando(e)}>
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-10 text-humano" aria-label={`Borrar ${e.pregunta}`}
                        onClick={() => setBorrando(e)}>
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editando !== null} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando === "nueva" ? "Agregar respuesta" : "Editar respuesta"}</DialogTitle>
            <DialogDescription>
              Las claves son las palabras que activan la entrada. Entre más específicas, más
              confianza tiene la IA al usarla.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviar} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="pregunta">Pregunta</Label>
              <Input id="pregunta" {...form.register("pregunta")} data-teste="campo-pregunta" />
              {form.formState.errors.pregunta && (
                <p className="text-sm text-humano" role="alert">{form.formState.errors.pregunta.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="respuesta">Respuesta</Label>
              <Textarea id="respuesta" rows={4} {...form.register("respuesta")} data-teste="campo-respuesta" />
              {form.formState.errors.respuesta && (
                <p className="text-sm text-humano" role="alert">{form.formState.errors.respuesta.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoría</Label>
              <select id="categoria" {...form.register("categoria")}
                className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm">
                {CATEGORIAS.map((c) => <option key={c} value={c}>{CATEGORIA_ROTULO[c]}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="claves">Claves, separadas por coma</Label>
              <Input id="claves" {...form.register("claves")} placeholder="horario, a que hora, abren"
                data-teste="campo-claves" />
              {form.formState.errors.claves && (
                <p className="text-sm text-humano" role="alert">{form.formState.errors.claves.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button type="submit" className="h-11 sm:flex-1" disabled={form.formState.isSubmitting} data-teste="guardar-entrada">
                {form.formState.isSubmitting ? "Guardando…" : "Guardar"}
              </Button>
              <Button type="button" variant="outline" className="h-11 sm:flex-1" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={borrando !== null} onOpenChange={(v) => !v && setBorrando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar esta respuesta?</AlertDialogTitle>
            <AlertDialogDescription>
              «{borrando?.pregunta}». La IA dejará de poder contestar eso y esas conversaciones
              pasarán a una persona.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={buttonVariants({ variant: "outline" })}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              data-teste="confirmar-borrado"
              onClick={async () => {
                if (!borrando) return;
                await borrarEntrada(borrando.id);
                setBorrando(null);
                await puxar();
                toast.success("Entrada borrada");
              }}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

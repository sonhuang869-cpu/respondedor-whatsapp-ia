import { Suspense, lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/layout/Layout";
import Bandeja from "@/pages/Bandeja";
import Conversacion from "@/pages/Conversacion";
import NoEncontrada from "@/pages/NoEncontrada";

const Conocimiento = lazy(() => import("@/pages/Conocimiento"));
const Aprendizaje = lazy(() => import("@/pages/Aprendizaje"));
const Probador = lazy(() => import("@/pages/Probador"));
const Panel = lazy(() => import("@/pages/Panel"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Cargando">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Bandeja />} />
            <Route path="conversacion/:id" element={<Conversacion />} />
            <Route path="conocimiento" element={<Conocimiento />} />
            <Route path="aprendizaje" element={<Aprendizaje />} />
            <Route path="probador" element={<Probador />} />
            <Route path="panel" element={<Panel />} />
            <Route path="*" element={<NoEncontrada />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

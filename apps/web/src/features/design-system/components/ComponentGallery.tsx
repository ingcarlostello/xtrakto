import { Bell, ShoppingCart, Upload } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GallerySection } from "./GallerySection";

// Sample figures from docs/ui: fictional, never real statement data.

function Logos() {
  return (
    <div className="flex flex-wrap items-center gap-7">
      <Logo size={32} />
      <Logo size={48} />
      <div className="rounded-md bg-ink p-5">
        <Logo size={40} tone="white" />
      </div>
    </div>
  );
}

function Buttons() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button>
        <Upload />
        Subir extracto
      </Button>
      <Button variant="secondary">Cancelar</Button>
      <Button size="sm">Preguntar</Button>
      <Button variant="destructive">Eliminar mi cuenta y mis datos</Button>
      <Button variant="link">Ver en qué gastaste</Button>
      <IconButton label="Notificaciones">
        <Bell strokeWidth={1.7} />
      </IconButton>
      <Button disabled>Subir extracto</Button>
    </div>
  );
}

function SpendingTile() {
  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <span className="flex size-9.5 items-center justify-center rounded-full bg-spending-soft text-spending-text">
          <ShoppingCart className="size-5" strokeWidth={1.9} />
        </span>
        <CardTitle>Gasto real</CardTitle>
      </div>
      <p className="font-display text-amount-xl font-medium tabular-nums">
        $24,4M
      </p>
      <CardDescription>
        El 45% de lo que salió. Compras, créditos, efectivo y pagos a personas.
      </CardDescription>
      <CardFooter>
        <Button variant="link">Ver en qué gastaste</Button>
      </CardFooter>
    </Card>
  );
}

function Cards() {
  return (
    <div className="grid gap-5.5 md:grid-cols-3">
      <SpendingTile />
      <Card variant="card">
        <CardHeader>
          <CardTitle>Tu saldo y tu gasto real, día a día</CardTitle>
          <CardDescription>
            Si la línea naranja sube rápido, estás gastando rápido.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card variant="panel">
        <CardDescription>Saldo al 30 de septiembre</CardDescription>
        <p className="font-display text-amount-xl font-medium tabular-nums">
          $6.482.310
        </p>
        <p className="text-body text-ink-secondary">
          Cuenta de ahorros · Bancolombia
        </p>
      </Card>
    </div>
  );
}

function Badges() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge>Sin categoría</Badge>
      <Badge variant="income">Ingreso</Badge>
      <Badge variant="spending">Gasto real</Badge>
      <Badge variant="moved">Movido</Badge>
      <Badge variant="attention">Revisar</Badge>
    </div>
  );
}

export function ComponentGallery() {
  return (
    <>
      <GallerySection title="Logo">
        <Logos />
      </GallerySection>
      <GallerySection title="Botones">
        <Buttons />
      </GallerySection>
      <GallerySection
        title="Tarjetas"
        description="Tile para cifras, card para los bloques grandes y panel translúcido para la cuenta y el chat."
      >
        <Cards />
      </GallerySection>
      <GallerySection title="Etiquetas">
        <Badges />
      </GallerySection>
    </>
  );
}

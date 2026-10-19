import { CHANNELS } from "@xtrakto/core";
import { Bell, CircleAlert, ShoppingCart, Tag, Upload } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { KindLegend } from "@/components/kind-legend/KindLegend";
import { RawTextChip } from "@/components/raw-text-chip/RawTextChip";
import { StatusPill } from "@/components/status-pill/StatusPill";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ReviewBanner } from "@/components/review-banner/ReviewBanner";
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
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Badge>Sin categoría</Badge>
        <Badge variant="income">Ingreso</Badge>
        <Badge variant="spending">Gasto real</Badge>
        <Badge variant="moved">Movido</Badge>
        <Badge variant="attention">No cuadra</Badge>
        <Badge variant="ok">Verificado</Badge>
        <Badge variant="info">Muy pronto</Badge>
        <Badge variant="tag">Extracto trimestral</Badge>
      </div>
      {/* A movement's tags (6.1b): its channel, then its category or
          "Por revisar" while the category is only a guess. */}
      <div className="flex flex-wrap gap-2">
        {CHANNELS.map(({ id, labelEs }) => (
          <Badge key={id} variant="tag">
            {labelEs}
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge>
          <Tag aria-hidden />
          Pagos a personas
        </Badge>
        <Badge variant="review">
          <CircleAlert aria-hidden />
          Por revisar
        </Badge>
      </div>
    </div>
  );
}

// The waitlist's fields (16.0b): a labeled box, its error in danger red, and
// the checkbox, never checked by default.
function Forms() {
  return (
    <div className="grid max-w-md gap-4">
      <label className="grid gap-1.5">
        <span className="text-caption font-bold">Correo</span>
        <Input type="email" placeholder="tu@correo.com" />
      </label>
      <label className="grid gap-1.5">
        <span className="text-caption font-bold">Correo</span>
        <Input type="email" defaultValue="ana@" aria-invalid />
        <span className="text-caption font-semibold text-danger">
          Revisa tu correo: parece que le falta algo.
        </span>
      </label>
      <div className="flex flex-wrap gap-6 text-caption">
        <label className="flex items-center gap-3">
          <Checkbox />
          Sin marcar
        </label>
        <label className="flex items-center gap-3">
          <Checkbox defaultChecked />
          Marcada
        </label>
      </div>
      <div className="flex flex-wrap gap-6 text-sm font-bold">
        <label className="flex items-center gap-3">
          Es mío
          <Switch aria-label="Es mío: Nequi terminado en 1270" />
        </label>
        <label className="flex items-center gap-3">
          Es mío
          <Switch defaultChecked aria-label="Es mío: Nequi terminado en 5531" />
        </label>
      </div>
    </div>
  );
}

function StatusPills() {
  return (
    <div className="flex flex-wrap gap-4">
      <StatusPill
        tone="ok"
        title="7 de 10 disponibles"
        detail="Archivos este mes"
      />
      <StatusPill
        tone="attention"
        title="0 de 10 disponibles"
        detail="Se renuevan el 1 de noviembre"
      />
      <StatusPill
        tone="ok"
        title="Encadenado"
        detail="Empieza donde terminó abr–jun 2026"
      />
      <StatusPill
        tone="info"
        title="6 grupos · 38 movimientos"
        detail="Unos 2 minutos"
      />
    </div>
  );
}

function ReviewBannerSample() {
  return (
    <ReviewBanner
      title="Tienes 4 grupos por revisar (24 movimientos)"
      description="Mientras tanto usamos nuestra mejor suposición. Confírmalos: pueden cambiar tu gasto real."
      action="Revisar ahora"
      href="/review"
    />
  );
}

// The brand and the pieces every screen uses.
function BaseSections() {
  return (
    <>
      <GallerySection title="Logo">
        <Logos />
      </GallerySection>
      <GallerySection title="Botones">
        <Buttons />
      </GallerySection>
      <GallerySection
        title="Píldora de estado"
        description="El punto repite lo que dicen las palabras: verde si está bien, naranja si hay algo que mirar, azul si solo informa."
      >
        <StatusPills />
      </GallerySection>
      <GallerySection
        title="Tarjetas"
        description="Tile para cifras, card para los bloques grandes y panel translúcido para la cuenta y el chat."
      >
        <Cards />
      </GallerySection>
    </>
  );
}

// What shows the user's data and asks for theirs.
function DataSections() {
  return (
    <>
      <GallerySection
        title="Etiquetas"
        description="Estados y archivos; debajo, el canal de cada movimiento y su categoría o «Por revisar»."
      >
        <Badges />
      </GallerySection>
      <GallerySection
        title="Leyenda de colores"
        description="Bajo el título de cada pantalla que muestra tipos: verde, naranja y azul, siempre con su palabra."
      >
        <KindLegend />
      </GallerySection>
      <GallerySection
        title="Texto del banco"
        description="Tal como lo escribe el banco, con sus dobles espacios, y cuántas veces se repite."
      >
        <div className="flex flex-wrap gap-2">
          <RawTextChip text="COMPRA EN  MERCADO XYZ" count={3} />
          <RawTextChip text="PAGO LLAVE INVERSIONES XY" count={1} />
        </div>
      </GallerySection>
      <GallerySection
        title="Aviso de revisión"
        description="En el resumen, mientras haya grupos por revisar, con el camino para responderlos."
      >
        <ReviewBannerSample />
      </GallerySection>
      <GallerySection
        title="Formularios"
        description="Cada campo con su etiqueta; el error, en rojo debajo. La casilla nunca viene marcada, y el interruptor dice siempre qué cambia."
      >
        <Forms />
      </GallerySection>
    </>
  );
}

export function ComponentGallery() {
  return (
    <>
      <BaseSections />
      <DataSections />
    </>
  );
}

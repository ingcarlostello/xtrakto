import type { CSSProperties } from "react";
import {
  COLOR_GROUPS,
  CONTRAST_PAIRS,
  RADII,
  SHADOWS,
  TYPE_SAMPLES,
} from "../design-system.constants";
import { GallerySection } from "./GallerySection";

const color = (token: string) => `var(--color-${token})`;

function ColorTokens() {
  return (
    <div className="grid gap-5.5 sm:grid-cols-2 lg:grid-cols-4">
      {COLOR_GROUPS.map((group) => (
        <div key={group.title} className="flex flex-col gap-2">
          <h3 className="text-sm font-bold">{group.title}</h3>
          <ul className="flex flex-col gap-1.5">
            {group.tokens.map((token) => (
              <li
                key={token}
                className="flex items-center gap-2 text-meta text-ink-secondary"
              >
                <span
                  className="size-6 rounded-full shadow-chip"
                  style={{ backgroundColor: color(token) }}
                />
                <code>--color-{token}</code>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ContrastPairs() {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {CONTRAST_PAIRS.map(({ text, background }) => (
        <li
          key={`${text}-${background}`}
          className="rounded-sm px-4 py-3 text-sm font-semibold"
          style={{ color: color(text), backgroundColor: color(background) }}
        >
          {text} sobre {background}
        </li>
      ))}
    </ul>
  );
}

function TypeScale() {
  return (
    <ul className="flex flex-col gap-3">
      {TYPE_SAMPLES.map(({ name, className, text }) => (
        <li key={name} className="flex flex-col gap-0.5">
          <code className="text-meta text-ink-muted">text-{name}</code>
          <span className={className}>{text}</span>
        </li>
      ))}
    </ul>
  );
}

function ShapeSample({
  label,
  style,
}: {
  label: string;
  style: CSSProperties;
}) {
  return (
    <figure className="flex flex-col items-center gap-2">
      <div className="size-20 bg-surface" style={style} />
      <figcaption className="text-meta text-ink-muted">{label}</figcaption>
    </figure>
  );
}

function Shapes() {
  return (
    <div className="flex flex-wrap gap-5.5">
      {RADII.map((radius) => (
        <ShapeSample
          key={radius}
          label={`radius-${radius}`}
          style={{ borderRadius: `var(--radius-${radius})` }}
        />
      ))}
      {SHADOWS.map((shadow) => (
        <ShapeSample
          key={shadow}
          label={`shadow-${shadow}`}
          style={{
            borderRadius: "var(--radius-md)",
            boxShadow: `var(--shadow-${shadow})`,
          }}
        />
      ))}
    </div>
  );
}

export function TokenGallery() {
  return (
    <>
      <GallerySection
        title="Color"
        description="El verde, el naranja y el azul de los datos solo marcan ingresos, gasto real y lo que se movió."
      >
        <ColorTokens />
      </GallerySection>
      <GallerySection
        title="Contraste"
        description="Los pares de texto de §3.6, todos con WCAG AA."
      >
        <ContrastPairs />
      </GallerySection>
      <GallerySection title="Tipografía">
        <TypeScale />
      </GallerySection>
      <GallerySection title="Radios y sombras">
        <Shapes />
      </GallerySection>
    </>
  );
}

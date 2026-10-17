"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CourtPhotoGallery } from "./court-photo-gallery";

type DailyOpeningHours = {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
};
type PublicCourtDetail = {
  center: {
    id: string;
    name: string;
    tags: { id: string; name: string }[];
  };
  court: {
    id: string;
    name: string;
    hourlyPriceCentimos: number | null;
    openingHours: DailyOpeningHours[] | null;
    characteristics: string[];
  };
};

export function PublicCourtPage({
  centerId,
  courtId,
}: {
  centerId: string;
  courtId: string;
}) {
  const [listing, setListing] = useState<PublicCourtDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setState("loading");
      try {
        const response = await fetch(
          `/api/sports-centers/${encodeURIComponent(centerId)}/courts/${encodeURIComponent(courtId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (!response.ok)
          throw new Error("No encontramos esta ficha publicada.");
        const payload: unknown = await response.json();
        if (!isPublicCourtDetail(payload)) {
          throw new Error("La ficha no está disponible. Inténtalo de nuevo.");
        }
        setListing(payload);
        setState("ready");
      } catch {
        if (!controller.signal.aborted) setState("error");
      }
    }
    void load();
    return () => controller.abort();
  }, [centerId, courtId, retryKey]);

  return (
    <main className="public-court-page">
      <a className="skip-link" href="#court-detail">
        Saltar a la ficha
      </a>
      <header className="public-court-header">
        <Link aria-label="KanchaYA, inicio" className="brand" href="/">
          <span className="brand-mark">K</span>
          <span translate="no">KanchaYA</span>
        </Link>
        <Link className="public-court-back" href="/#centros-deportivos">
          Volver a centros
        </Link>
      </header>
      <section
        aria-labelledby="public-court-title"
        className="public-court-content"
        id="court-detail"
      >
        {state === "loading" ? (
          <p aria-live="polite" className="loading-line">
            Cargando ficha…
          </p>
        ) : state === "error" ? (
          <div className="directory-message" role="alert">
            <div>
              <h1>No pudimos mostrar esta ficha.</h1>
              <p>
                Puede que ya no esté publicada. Vuelve al directorio o inténtalo
                de nuevo.
              </p>
            </div>
            <button
              className="directory-retry"
              onClick={() => setRetryKey((key) => key + 1)}
              type="button"
            >
              Reintentar
            </button>
          </div>
        ) : listing ? (
          <>
            <p className="directory-kicker">{listing.center.name}</p>
            <h1 id="public-court-title">{listing.court.name}</h1>
            <dl className="public-court-facts">
              <div>
                <dt>Precio por hora</dt>
                <dd>
                  {listing.court.hourlyPriceCentimos === null
                    ? "Consultar"
                    : `${formatSoles(listing.court.hourlyPriceCentimos)} / hora`}
                </dd>
              </div>
              <div>
                <dt>Horario de atención</dt>
                <dd>{formatOpeningHours(listing.court.openingHours)}</dd>
              </div>
            </dl>
            {listing.center.tags.length > 0 && (
              <section aria-labelledby="public-center-tags-title">
                <h2 id="public-center-tags-title">Sobre el centro</h2>
                <ul className="court-tag-list public-court-tags">
                  {listing.center.tags.map((tag) => (
                    <li className="court-tag" key={tag.id}>
                      {tag.name}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {listing.court.characteristics.length > 0 && (
              <section aria-labelledby="public-court-characteristics-title">
                <h2 id="public-court-characteristics-title">
                  Características de la cancha
                </h2>
                <ul className="court-tag-list public-court-tags">
                  {listing.court.characteristics.map((name) => (
                    <li className="court-tag" key={name}>
                      {name}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="public-court-photos-title">
              <h2 id="public-court-photos-title">Fotos</h2>
              <CourtPhotoGallery
                centerId={listing.center.id}
                courtId={listing.court.id}
                courtName={listing.court.name}
              />
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}

function isPublicCourtDetail(value: unknown): value is PublicCourtDetail {
  if (
    !value ||
    typeof value !== "object" ||
    !("center" in value) ||
    !("court" in value)
  ) {
    return false;
  }
  const center = value.center;
  const court = value.court;
  if (
    !center ||
    typeof center !== "object" ||
    !court ||
    typeof court !== "object"
  ) {
    return false;
  }
  const centerRecord = center as Record<string, unknown>;
  const courtRecord = court as Record<string, unknown>;
  return (
    typeof centerRecord.id === "string" &&
    typeof centerRecord.name === "string" &&
    Array.isArray(centerRecord.tags) &&
    centerRecord.tags.every(
      (tag) =>
        !!tag &&
        typeof tag === "object" &&
        typeof (tag as Record<string, unknown>).id === "string" &&
        typeof (tag as Record<string, unknown>).name === "string",
    ) &&
    typeof courtRecord.id === "string" &&
    typeof courtRecord.name === "string" &&
    (typeof courtRecord.hourlyPriceCentimos === "number" ||
      courtRecord.hourlyPriceCentimos === null) &&
    isWeeklyOpeningHours(courtRecord.openingHours) &&
    Array.isArray(courtRecord.characteristics) &&
    courtRecord.characteristics.every((name) => typeof name === "string")
  );
}

function isWeeklyOpeningHours(
  value: unknown,
): value is DailyOpeningHours[] | null {
  if (value === null) return true;
  if (!Array.isArray(value) || value.length > 7) return false;
  return (
    value.every((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const hours = entry as Record<string, unknown>;
      return (
        typeof hours.dayOfWeek === "number" &&
        Number.isInteger(hours.dayOfWeek) &&
        hours.dayOfWeek >= 1 &&
        hours.dayOfWeek <= 7 &&
        typeof hours.opensAt === "string" &&
        /^(?:[01]\d|2[0-3]):00$/.test(hours.opensAt) &&
        typeof hours.closesAt === "string" &&
        /^(?:(?:[01]\d|2[0-3]):00|24:00)$/.test(hours.closesAt) &&
        hours.closesAt > hours.opensAt
      );
    }) && new Set(value.map((entry) => entry.dayOfWeek)).size === value.length
  );
}

function formatSoles(centimos: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centimos / 100);
}

function formatOpeningHours(hours: DailyOpeningHours[] | null): string {
  if (hours === null) return "Horario por confirmar";
  if (hours.length === 0) return "Sin atención programada";
  const days = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];
  return hours
    .slice()
    .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
    .map(
      ({ dayOfWeek, opensAt, closesAt }) =>
        `${days[dayOfWeek - 1]} ${opensAt}–${closesAt}`,
    )
    .join(" · ");
}

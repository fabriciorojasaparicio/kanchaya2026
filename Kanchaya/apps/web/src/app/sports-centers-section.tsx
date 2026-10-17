"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CourtPhotoGallery } from "./court-photo-gallery";

interface DailyOpeningHours {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}

interface SportsCenterCourt {
  id: string;
  name: string;
  hourlyPriceCentimos: number | null;
  openingHours: DailyOpeningHours[] | null;
  characteristics: string[];
}

interface SportsCenter {
  id: string;
  name: string;
  courtCount: number;
  tags: { id: string; name: string }[];
  courts: SportsCenterCourt[];
  isFeatured: boolean;
}

type DirectoryState = "loading" | "ready" | "error";

export function SportsCentersSection() {
  const [centers, setCenters] = useState<SportsCenter[]>([]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<DirectoryState>("loading");
  const [refreshKey, setRefreshKey] = useState(0);
  const featuredTrack = useRef<HTMLDivElement>(null);
  const resultsSection = useRef<HTMLElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCenters() {
      setState("loading");
      try {
        const response = await fetch("/api/sports-centers", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Directory request failed");

        const payload: unknown = await response.json();
        const parsed = parseSportsCenters(payload);
        if (!parsed) throw new Error("Directory response is invalid");
        setCenters(parsed);
        setState("ready");
      } catch {
        if (!controller.signal.aborted) setState("error");
      }
    }

    void loadCenters();
    return () => controller.abort();
  }, [refreshKey]);

  const normalizedQuery = normalize(query.trim());
  const results = useMemo(() => {
    if (!normalizedQuery) return centers;
    return centers.filter((center) =>
      normalize(
        [center.name, ...center.courts.map((court) => court.name)].join(" "),
      ).includes(normalizedQuery),
    );
  }, [centers, normalizedQuery]);

  const curated = centers.filter((center) => center.isFeatured);
  const featured = (curated.length ? curated : centers).slice(0, 8);
  const featuredLabel = curated.length
    ? "Selección KanchaYA"
    : "Para descubrir";

  function scrollCarousel(direction: -1 | 1) {
    const track = featuredTrack.current;
    if (!track) return;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  function findCenter(name: string) {
    setQuery(name);
    resultsSection.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }

  return (
    <section
      aria-labelledby="centers-title"
      className="sports-directory"
      id="centros-deportivos"
    >
      <div className="directory-inner">
        <div className="directory-heading">
          <div>
            <p className="directory-kicker">Un lugar para cada partido</p>
            <h2 id="centers-title">Encuentra tu próxima cancha.</h2>
          </div>
          <p className="directory-intro">
            Explora los centros deportivos y busca por el nombre del centro o de
            sus canchas.
          </p>
        </div>

        {state === "loading" ? (
          <div
            aria-busy="true"
            aria-label="Cargando centros deportivos"
            className="directory-loading"
          >
            <span />
            <span />
            <span />
          </div>
        ) : state === "error" ? (
          <div className="directory-message" role="alert">
            <div>
              <h3>No pudimos cargar los centros.</h3>
              <p>Inténtalo de nuevo en un momento.</p>
            </div>
            <button
              className="directory-retry"
              onClick={() => setRefreshKey((key) => key + 1)}
              type="button"
            >
              Reintentar
            </button>
          </div>
        ) : centers.length === 0 ? (
          <div className="directory-message" role="status">
            <div>
              <h3>Las canchas están por llegar.</h3>
              <p>Pronto encontrarás aquí los centros deportivos de KanchaYA.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="featured-heading">
              <div>
                <p className="directory-kicker">{featuredLabel}</p>
                <h3>Buenos lugares para empezar.</h3>
              </div>
              <div
                aria-label="Controles del carrusel de centros"
                className="carousel-controls"
              >
                <button
                  aria-label="Ver centros anteriores"
                  onClick={() => scrollCarousel(-1)}
                  type="button"
                >
                  ←
                </button>
                <button
                  aria-label="Ver más centros"
                  onClick={() => scrollCarousel(1)}
                  type="button"
                >
                  →
                </button>
              </div>
            </div>

            <div
              aria-label="Centros deportivos destacados"
              className="featured-track"
              ref={featuredTrack}
            >
              {featured.map((center, index) => (
                <article
                  className={`featured-center featured-center-${index % 3}`}
                  key={center.id}
                >
                  <span className="featured-center-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h4>{center.name}</h4>
                  <p>{courtLabel(center.courtCount)}</p>
                  <button onClick={() => findCenter(center.name)} type="button">
                    Ver en el directorio <span aria-hidden="true">↗</span>
                  </button>
                </article>
              ))}
            </div>

            <section
              aria-labelledby="all-centers-title"
              className="center-results"
              ref={resultsSection}
            >
              <div className="results-heading">
                <div>
                  <p className="directory-kicker">Explora sin perderte</p>
                  <h3 id="all-centers-title">Todos los centros</h3>
                </div>
                <p aria-live="polite" className="results-count">
                  {results.length} {results.length === 1 ? "centro" : "centros"}
                </p>
              </div>

              <label
                className="center-search-label"
                htmlFor="sports-center-search"
              >
                Buscar centro o cancha
              </label>
              <input
                autoComplete="off"
                className="center-search"
                id="sports-center-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ej. El Campín o Cancha 1"
                type="search"
                value={query}
              />

              {results.length ? (
                <div className="center-list">
                  {results.map((center) => (
                    <article className="center-result" key={center.id}>
                      <div className="center-result-main">
                        <h4>{center.name}</h4>
                        <p>{courtLabel(center.courtCount)}</p>
                      </div>
                      {center.tags.length > 0 && (
                        <div
                          aria-label="Etiquetas del centro"
                          className="court-tag-list center-result-tags"
                        >
                          {center.tags.map((tag) => (
                            <span className="court-tag" key={tag.id}>
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                      {center.courts.length > 0 && (
                        <details className="center-courts">
                          <summary>Ver canchas</summary>
                          <ul>
                            {center.courts.map((court) => (
                              <li key={court.id}>
                                <span>{court.name}</span>
                                <span className="court-hourly-price">
                                  {court.hourlyPriceCentimos === null
                                    ? "Precio por hora pendiente"
                                    : `${formatSoles(court.hourlyPriceCentimos)} / hora`}
                                </span>
                                <span className="court-opening-hours">
                                  {formatOpeningHours(court.openingHours)}
                                </span>
                                <Link
                                  className="court-public-detail-link"
                                  href={`/sports-centers/${encodeURIComponent(center.id)}/courts/${encodeURIComponent(court.id)}`}
                                >
                                  Ver ficha completa
                                </Link>
                                {court.characteristics.length > 0 && (
                                  <span
                                    className="court-tag-list"
                                    aria-label="Características"
                                  >
                                    {court.characteristics.map(
                                      (characteristic) => (
                                        <span
                                          className="court-tag"
                                          key={characteristic}
                                        >
                                          {characteristic}
                                        </span>
                                      ),
                                    )}
                                  </span>
                                )}
                                <CourtPhotoGallery
                                  centerId={center.id}
                                  courtId={court.id}
                                  courtName={court.name}
                                />
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="directory-no-results" role="status">
                  <p>No encontramos centros o canchas con “{query}”.</p>
                  <button onClick={() => setQuery("")} type="button">
                    Borrar búsqueda
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </section>
  );
}

function courtLabel(count: number): string {
  return `${count} ${count === 1 ? "cancha registrada" : "canchas registradas"}`;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function parseSportsCenters(payload: unknown): SportsCenter[] | null {
  if (!payload || typeof payload !== "object" || !("centers" in payload))
    return null;
  const centers = payload.centers;
  if (!Array.isArray(centers)) return null;

  const validCenters = centers.filter((item): item is SportsCenter => {
    if (!item || typeof item !== "object") return false;
    const center = item as Record<string, unknown>;
    return (
      typeof center.id === "string" &&
      typeof center.name === "string" &&
      typeof center.courtCount === "number" &&
      typeof center.isFeatured === "boolean" &&
      Array.isArray(center.tags) &&
      center.tags.every(
        (tag) =>
          !!tag &&
          typeof tag === "object" &&
          typeof (tag as Record<string, unknown>).id === "string" &&
          typeof (tag as Record<string, unknown>).name === "string",
      ) &&
      Array.isArray(center.courts) &&
      center.courts.every(
        (court) =>
          !!court &&
          typeof court === "object" &&
          typeof (court as Record<string, unknown>).id === "string" &&
          typeof (court as Record<string, unknown>).name === "string" &&
          (typeof (court as Record<string, unknown>).hourlyPriceCentimos ===
            "number" ||
            (court as Record<string, unknown>).hourlyPriceCentimos === null) &&
          isWeeklyOpeningHours(
            (court as Record<string, unknown>).openingHours,
          ) &&
          Array.isArray((court as Record<string, unknown>).characteristics) &&
          (
            (court as Record<string, unknown>).characteristics as unknown[]
          ).every((characteristic) => typeof characteristic === "string"),
      )
    );
  });

  return validCenters.length === centers.length ? validCenters : null;
}

function formatSoles(centimos: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centimos / 100);
}

function isDailyOpeningHours(value: unknown): value is DailyOpeningHours {
  if (!value || typeof value !== "object") return false;
  const hours = value as Record<string, unknown>;
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
}

function isWeeklyOpeningHours(
  value: unknown,
): value is DailyOpeningHours[] | null {
  if (value === null) return true;
  if (!Array.isArray(value) || value.length > 7) return false;
  return (
    value.every(isDailyOpeningHours) &&
    new Set(value.map((hours) => hours.dayOfWeek)).size === value.length
  );
}

function formatOpeningHours(hours: DailyOpeningHours[] | null): string {
  if (hours === null) return "Horario por confirmar";
  if (hours.length === 0) return "Sin atención programada";
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  return hours
    .slice()
    .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
    .map(
      ({ dayOfWeek, opensAt, closesAt }) =>
        `${days[dayOfWeek - 1]} ${opensAt}–${closesAt}`,
    )
    .join(" · ");
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

type CenterTag = { id: string; name: string; isActive: boolean };

function getMessage(payload: unknown, fallback: string) {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("message" in payload)
  ) {
    return fallback;
  }
  return typeof payload.message === "string" ? payload.message : fallback;
}

export function SportsCenterTagsScreen() {
  const router = useRouter();
  const [tags, setTags] = useState<CenterTag[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/sports-center-tags", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login");
          return null;
        }
        if (response.status === 403) {
          router.replace("/access-denied");
          return null;
        }
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            getMessage(payload, "No pudimos cargar las etiquetas de centros."),
          );
        }
        if (
          !payload ||
          typeof payload !== "object" ||
          !("tags" in payload) ||
          !Array.isArray(payload.tags) ||
          !payload.tags.every(isCenterTag)
        ) {
          throw new Error(
            "Recibimos una lista incompleta. Inténtalo de nuevo.",
          );
        }
        return payload.tags;
      })
      .then((result) => {
        if (!cancelled && result) {
          setTags(result);
          setNames(Object.fromEntries(result.map((tag) => [tag.id, tag.name])));
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "No pudimos conectar con KanchaYA.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function createTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSavingId("new");
    try {
      const response = await fetch("/api/auth/sports-center-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const payload: unknown = await response.json();
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/access-denied");
        return;
      }
      if (!response.ok || !isCenterTag(payload)) {
        throw new Error(
          getMessage(payload, "No pudimos añadir la etiqueta al catálogo."),
        );
      }
      setTags((current) =>
        [...current, payload].sort((left, right) =>
          left.name.localeCompare(right.name, "es"),
        ),
      );
      setNames((current) => ({ ...current, [payload.id]: payload.name }));
      setNewName("");
      setNotice("Etiqueta añadida al catálogo de centros.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos conectar con KanchaYA.",
      );
    } finally {
      setSavingId("");
    }
  }

  async function saveTag(tag: CenterTag, isActive = tag.isActive) {
    setError("");
    setNotice("");
    setSavingId(tag.id);
    try {
      const response = await fetch(
        `/api/auth/sports-center-tags/${encodeURIComponent(tag.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: names[tag.id], isActive }),
        },
      );
      const payload: unknown = await response.json();
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/access-denied");
        return;
      }
      if (!response.ok || !isCenterTag(payload)) {
        throw new Error(
          getMessage(payload, "No pudimos actualizar esta etiqueta."),
        );
      }
      setTags((current) =>
        current
          .map((item) => (item.id === payload.id ? payload : item))
          .sort((left, right) => left.name.localeCompare(right.name, "es")),
      );
      setNames((current) => ({ ...current, [payload.id]: payload.name }));
      setNotice("Catálogo de etiquetas actualizado.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos conectar con KanchaYA.",
      );
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="characteristics-management">
      <Link className="management-back-link" href="/profile">
        Volver a mi perfil
      </Link>
      {notice && (
        <p
          aria-live="polite"
          className="form-message form-success"
          role="status"
        >
          {notice}
        </p>
      )}
      {error && (
        <p aria-live="polite" className="form-message form-error" role="alert">
          {error}
        </p>
      )}

      <section
        aria-labelledby="new-center-tag-title"
        className="court-form-panel"
      >
        <h2 id="new-center-tag-title">Etiquetas disponibles para centros</h2>
        <p className="characteristics-intro">
          Mantén un catálogo común para describir los centros deportivos. Las
          etiquetas archivadas permanecen en las fichas que ya las tienen.
        </p>
        <form className="characteristic-create-form" onSubmit={createTag}>
          <div className="field">
            <label htmlFor="new-center-tag">Nueva etiqueta</label>
            <input
              id="new-center-tag"
              maxLength={30}
              minLength={2}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Ej. Estacionamiento"
              required
              value={newName}
            />
            <span className="field-hint">Entre 2 y 30 caracteres.</span>
          </div>
          <button
            className="primary-button"
            disabled={savingId === "new"}
            type="submit"
          >
            {savingId === "new" ? "Añadiendo…" : "Añadir etiqueta"}
          </button>
        </form>
      </section>

      <section
        aria-label="Catálogo de etiquetas de centros"
        className="characteristics-list-section"
      >
        {isLoading ? (
          <p aria-live="polite" className="loading-line">
            Cargando etiquetas…
          </p>
        ) : tags.length === 0 ? (
          <div className="court-list-empty">
            <p>El catálogo está vacío.</p>
            <span>
              Añade etiquetas para que los centros puedan completar sus fichas.
            </span>
          </div>
        ) : (
          <ul className="characteristic-admin-list">
            {tags.map((tag) => (
              <li className="characteristic-admin-item" key={tag.id}>
                <div className="field">
                  <label htmlFor={`center-tag-${tag.id}`}>
                    Nombre de la etiqueta
                  </label>
                  <input
                    id={`center-tag-${tag.id}`}
                    maxLength={30}
                    minLength={2}
                    onChange={(event) =>
                      setNames((current) => ({
                        ...current,
                        [tag.id]: event.target.value,
                      }))
                    }
                    value={names[tag.id] ?? tag.name}
                  />
                </div>
                <span
                  className={`court-status ${tag.isActive ? "court-status-enabled" : "court-status-disabled"}`}
                >
                  {tag.isActive ? "Disponible" : "Archivada"}
                </span>
                <div className="characteristic-actions">
                  {(names[tag.id] ?? tag.name) !== tag.name && (
                    <button
                      className="primary-button"
                      disabled={Boolean(savingId)}
                      onClick={() => void saveTag(tag)}
                      type="button"
                    >
                      Guardar nombre
                    </button>
                  )}
                  <button
                    className="secondary-button"
                    disabled={Boolean(savingId)}
                    onClick={() => void saveTag(tag, !tag.isActive)}
                    type="button"
                  >
                    {savingId === tag.id
                      ? "Guardando…"
                      : tag.isActive
                        ? "Archivar"
                        : "Reactivar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function isCenterTag(value: unknown): value is CenterTag {
  if (!value || typeof value !== "object") return false;
  const tag = value as Record<string, unknown>;
  return (
    typeof tag.id === "string" &&
    typeof tag.name === "string" &&
    typeof tag.isActive === "boolean"
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type Profile = {
  id: string;
  email: string;
  role: string;
  status: string;
  name: string;
  city: string | null;
  createdAt: string;
};

type ProfileFields = { name: string; city: string };

const roleLabels: Record<string, string> = {
  PLAYER: "Jugador",
  VENUE_MANAGER: "Administrador de cancha",
  TOURNAMENT_ORGANIZER: "Organizador de torneos",
  PLATFORM_ADMIN: "Administrador de plataforma",
};

function responseMessage(payload: unknown, fallback: string) {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("message" in payload)
  ) {
    return fallback;
  }
  const message = payload.message;
  return Array.isArray(message)
    ? message.join(" ")
    : typeof message === "string"
      ? message
      : fallback;
}

function retryAfterMessage(response: Response, fallback: string) {
  if (response.status !== 429) return fallback;
  const retryAfter = Number(response.headers.get("Retry-After"));
  return Number.isInteger(retryAfter) && retryAfter > 0
    ? `Demasiadas solicitudes. Espera ${retryAfter} segundos antes de volver a intentarlo.`
    : "Demasiadas solicitudes. Espera un momento antes de volver a intentarlo.";
}

export function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fields, setFields] = useState<ProfileFields>({ name: "", city: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const hasUnsavedChangesRef = useRef(false);
  const editTriggerRef = useRef<HTMLButtonElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const wasEditing = useRef(false);
  const hasUnsavedChanges = Boolean(
    profile &&
    isEditing &&
    (fields.name !== profile.name || fields.city !== (profile.city ?? "")),
  );
  useLayoutEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChangesRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const confirmInternalNavigation = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.origin !== window.location.origin
      )
        return;

      event.preventDefault();
      if (
        window.confirm(
          "Tienes cambios sin guardar. ¿Quieres salir y descartarlos?",
        )
      ) {
        const destination = new URL(link.href);
        router.push(
          `${destination.pathname}${destination.search}${destination.hash}`,
        );
      }
    };
    document.addEventListener("click", confirmInternalNavigation, true);
    return () =>
      document.removeEventListener("click", confirmInternalNavigation, true);
  }, [hasUnsavedChanges, router]);

  useEffect(() => {
    if (isEditing) {
      if (window.matchMedia("(pointer: coarse)").matches) {
        editFormRef.current?.focus();
      } else {
        nameInputRef.current?.focus();
      }
      wasEditing.current = true;
    } else if (wasEditing.current) {
      editTriggerRef.current?.focus();
      wasEditing.current = false;
    }
  }, [isEditing]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/profile", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (response.status === 403) {
          router.replace("/access-denied");
          return;
        }
        if (!response.ok)
          throw new Error(
            retryAfterMessage(
              response,
              "No pudimos cargar tus datos. Inténtalo de nuevo.",
            ),
          );
        const result = (await response.json()) as Profile;
        if (!cancelled) {
          setProfile(result);
          setFields({ name: result.name, city: result.city ?? "" });
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
  }, [retryCount, router]);

  const beginEditing = () => {
    if (!profile) return;
    setFields({ name: profile.name, city: profile.city ?? "" });
    setError("");
    setNotice("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (profile) setFields({ name: profile.name, city: profile.city ?? "" });
    setError("");
    setIsEditing(false);
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.name,
          city: fields.city.trim() || null,
        }),
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/access-denied");
        return;
      }

      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          retryAfterMessage(
            response,
            responseMessage(
              payload,
              "No pudimos guardar tus datos. Inténtalo de nuevo.",
            ),
          ),
        );
      }

      const updated = payload as Profile;
      setProfile(updated);
      setFields({ name: updated.name, city: updated.city ?? "" });
      setIsEditing(false);
      setNotice("Tus datos se actualizaron correctamente.");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos conectar con KanchaYA.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <p aria-live="polite" className="loading-line">
        Cargando tus datos…
      </p>
    );
  }

  if (error && !profile) {
    return (
      <div className="profile-error">
        <p aria-live="polite" className="form-message form-error" role="alert">
          {error}
        </p>
        <button
          className="secondary-button"
          onClick={() => {
            setError("");
            setIsLoading(true);
            setRetryCount((count) => count + 1);
          }}
          type="button"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="profile-area">
      <section aria-label="Datos personales" className="profile-panel">
        <div className="profile-card">
          <div aria-hidden="true" className="profile-avatar">
            {profile.name.trim().charAt(0).toUpperCase() || "K"}
          </div>
          <div className="profile-intro">
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
          </div>
          {!isEditing && (
            <button
              className="profile-edit-trigger"
              onClick={beginEditing}
              ref={editTriggerRef}
              type="button"
            >
              Editar datos
            </button>
          )}
        </div>

        {notice && (
          <p
            aria-live="polite"
            className="form-message form-success profile-notice"
            role="status"
          >
            {notice}
          </p>
        )}
        {error && (
          <p
            aria-live="polite"
            className="form-message form-error profile-notice"
            role="alert"
          >
            {error}
          </p>
        )}

        {isEditing ? (
          <form
            aria-label="Editar datos personales"
            className="profile-form"
            onSubmit={saveProfile}
            ref={editFormRef}
            tabIndex={-1}
          >
            <fieldset className="profile-fields" disabled={isSaving}>
              <div className="field">
                <label htmlFor="profile-name">Nombre completo</label>
                <input
                  autoComplete="name"
                  id="profile-name"
                  maxLength={120}
                  minLength={2}
                  name="name"
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  ref={nameInputRef}
                  required
                  value={fields.name}
                />
              </div>
              <div className="field">
                <label htmlFor="profile-city">Ciudad (opcional)</label>
                <input
                  autoComplete="address-level2"
                  id="profile-city"
                  maxLength={100}
                  name="city"
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      city: event.target.value,
                    }))
                  }
                  placeholder="Ej. Medellín…"
                  value={fields.city}
                />
              </div>
              <div className="profile-readonly">
                <span>Correo electrónico</span>
                <strong>{profile.email}</strong>
                <p>
                  Este correo identifica tu cuenta y no se puede cambiar desde
                  aquí.
                </p>
              </div>
            </fieldset>
            <div className="profile-form-actions">
              <button
                className="secondary-button"
                disabled={isSaving}
                onClick={cancelEditing}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                disabled={isSaving}
                type="submit"
              >
                {isSaving && (
                  <span aria-hidden="true" className="button-spinner" />
                )}
                {isSaving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <dl className="profile-details">
              <div>
                <dt>Ciudad</dt>
                <dd>{profile.city || "Aún no agregada"}</dd>
              </div>
              <div>
                <dt>Tipo de cuenta</dt>
                <dd>{roleLabels[profile.role] ?? profile.role}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>
                  {profile.status === "ACTIVE" ? "Activa" : profile.status}
                </dd>
              </div>
              <div>
                <dt>Miembro desde</dt>
                <dd>
                  {new Intl.DateTimeFormat("es-CO", {
                    dateStyle: "long",
                  }).format(new Date(profile.createdAt))}
                </dd>
              </div>
            </dl>
            <div className="profile-actions">
              {profile.role === "VENUE_MANAGER" && (
                <Link className="secondary-button" href="/center/courts">
                  Administrar mis canchas
                </Link>
              )}
              {profile.role === "PLATFORM_ADMIN" && (
                <Link
                  className="secondary-button"
                  href="/admin/court-characteristics"
                >
                  Administrar etiquetas
                </Link>
              )}
              {profile.role === "PLATFORM_ADMIN" && (
                <Link
                  className="secondary-button"
                  href="/admin/sports-center-tags"
                >
                  Etiquetas de centros
                </Link>
              )}
              <Link className="secondary-button" href="/logout">
                Cerrar sesión
              </Link>
              <Link className="text-link" href="/">
                Volver al inicio
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

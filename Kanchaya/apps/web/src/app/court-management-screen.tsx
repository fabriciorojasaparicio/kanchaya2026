"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";

type CourtStatus = "ENABLED" | "DISABLED" | "MAINTENANCE";
type PublicationStatus = "DRAFT" | "PUBLISHED";
type Characteristic = { id: string; name: string; isActive: boolean };
type CenterTag = { id: string; name: string; isActive: boolean };
type CourtPhoto = {
  id: string;
  url: string;
  contentType: string;
  byteSize: number;
};
type DailyOpeningHours = {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
};
type OpeningHoursDraft = DailyOpeningHours & { isOpen: boolean };
type Court = {
  id: string;
  name: string;
  status: CourtStatus;
  publicationStatus: PublicationStatus;
  hourlyPriceCentimos: number | null;
  characteristics: Characteristic[];
};
type Center = {
  id: string;
  name: string;
  openingHours: DailyOpeningHours[] | null;
  tags: CenterTag[];
  courts: Court[];
};
type CourtFields = {
  name: string;
  status: CourtStatus;
  characteristicIds: string[];
};

const maxPhotoBytes = 5 * 1024 * 1024;
const maxPhotos = 8;
const photoTypes = ["image/jpeg", "image/png", "image/webp"];
const weekdays = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];
const openingTimeOptions = Array.from(
  { length: 24 },
  (_, hour) => `${String(hour).padStart(2, "0")}:00`,
);
const closingTimeOptions = [...openingTimeOptions.slice(1), "24:00"];

const statusLabels: Record<CourtStatus, string> = {
  ENABLED: "Habilitada",
  DISABLED: "Deshabilitada",
  MAINTENANCE: "En mantenimiento",
};

function getMessage(payload: unknown, fallback: string) {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("message" in payload)
  )
    return fallback;
  return typeof payload.message === "string" ? payload.message : fallback;
}

async function readPayload(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

export function CourtManagementScreen() {
  const router = useRouter();
  const [centers, setCenters] = useState<Center[]>([]);
  const [characteristics, setCharacteristics] = useState<Characteristic[]>([]);
  const [centerTagCatalog, setCenterTagCatalog] = useState<CenterTag[]>([]);
  const [centerId, setCenterId] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [editingCourtId, setEditingCourtId] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [fields, setFields] = useState<CourtFields>({
    name: "",
    status: "ENABLED",
    characteristicIds: [],
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hourlyPriceInput, setHourlyPriceInput] = useState("");
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [priceNotice, setPriceNotice] = useState("");
  const [openingHours, setOpeningHours] = useState<OpeningHoursDraft[]>(
    createOpeningHoursDraft(null),
  );
  const [isSavingOpeningHours, setIsSavingOpeningHours] = useState(false);
  const [openingHoursError, setOpeningHoursError] = useState("");
  const [openingHoursNotice, setOpeningHoursNotice] = useState("");
  const [isSavingCenterTags, setIsSavingCenterTags] = useState(false);
  const [centerTagsError, setCenterTagsError] = useState("");
  const [centerTagsNotice, setCenterTagsNotice] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publicationError, setPublicationError] = useState("");
  const [publicationNotice, setPublicationNotice] = useState("");
  const [photos, setPhotos] = useState<CourtPhoto[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoNotice, setPhotoNotice] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [centersResponse, characteristicsResponse, tagsResponse] =
          await Promise.all([
            fetch("/api/auth/sports-centers/managed", { cache: "no-store" }),
            fetch("/api/auth/court-characteristics", { cache: "no-store" }),
            fetch("/api/auth/sports-center-tags", { cache: "no-store" }),
          ]);
        if (
          centersResponse.status === 401 ||
          characteristicsResponse.status === 401 ||
          tagsResponse.status === 401
        ) {
          router.replace("/login");
          return;
        }
        if (
          centersResponse.status === 403 ||
          characteristicsResponse.status === 403 ||
          tagsResponse.status === 403
        ) {
          router.replace("/access-denied");
          return;
        }
        const [centerPayload, characteristicPayload, tagPayload] =
          await Promise.all([
            readPayload(centersResponse),
            readPayload(characteristicsResponse),
            readPayload(tagsResponse),
          ]);
        if (
          !centersResponse.ok ||
          !characteristicsResponse.ok ||
          !tagsResponse.ok
        ) {
          throw new Error(
            getMessage(
              centerPayload,
              "No pudimos cargar la administración de canchas.",
            ),
          );
        }
        if (
          !centerPayload ||
          typeof centerPayload !== "object" ||
          !("centers" in centerPayload) ||
          !Array.isArray(centerPayload.centers) ||
          !characteristicPayload ||
          typeof characteristicPayload !== "object" ||
          !("characteristics" in characteristicPayload) ||
          !Array.isArray(characteristicPayload.characteristics) ||
          !tagPayload ||
          typeof tagPayload !== "object" ||
          !("tags" in tagPayload) ||
          !Array.isArray(tagPayload.tags)
        ) {
          throw new Error(
            "Recibimos una respuesta incompleta. Inténtalo de nuevo.",
          );
        }
        if (!cancelled) {
          const loadedCenters = centerPayload.centers as Center[];
          setCenters(loadedCenters);
          setCenterTagCatalog(tagPayload.tags as CenterTag[]);
          setSelectedTagIds(loadedCenters[0]?.tags.map((tag) => tag.id) ?? []);
          setOpeningHours(
            createOpeningHoursDraft(loadedCenters[0]?.openingHours ?? null),
          );
          setCharacteristics(
            characteristicPayload.characteristics as Characteristic[],
          );
          setCenterId(loadedCenters[0]?.id ?? "");
        }
      } catch (cause) {
        if (!cancelled)
          setError(
            cause instanceof Error
              ? cause.message
              : "No pudimos conectar con KanchaYA.",
          );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [retryKey, router]);

  useEffect(() => {
    if (!editingCourtId || !centerId) return;

    let cancelled = false;
    async function loadPhotos() {
      setIsLoadingPhotos(true);
      setPhotoError("");
      try {
        const response = await fetch(
          `/api/auth/sports-centers/managed/${encodeURIComponent(centerId)}/courts/${encodeURIComponent(editingCourtId)}/photos`,
          { cache: "no-store" },
        );
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (response.status === 403) {
          router.replace("/access-denied");
          return;
        }
        const payload = await readPayload(response);
        if (!response.ok) {
          throw new Error(
            getMessage(payload, "No pudimos cargar las fotos de esta cancha."),
          );
        }
        if (
          !payload ||
          typeof payload !== "object" ||
          !("photos" in payload) ||
          !Array.isArray(payload.photos) ||
          !payload.photos.every(isCourtPhoto)
        ) {
          throw new Error(
            "Recibimos una lista de fotos incompleta. Inténtalo de nuevo.",
          );
        }
        if (!cancelled) setPhotos(payload.photos);
      } catch (cause) {
        if (!cancelled) {
          setPhotoError(
            cause instanceof Error
              ? cause.message
              : "No pudimos conectar con KanchaYA.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingPhotos(false);
      }
    }
    void loadPhotos();
    return () => {
      cancelled = true;
    };
  }, [centerId, editingCourtId, router]);

  const selectedCenter = centers.find((center) => center.id === centerId);
  const selectedCourt = selectedCenter?.courts.find(
    (court) => court.id === editingCourtId,
  );
  const currentOpeningHours = openingHours
    .filter((day) => day.isOpen)
    .map(({ dayOfWeek, opensAt, closesAt }) => ({
      dayOfWeek,
      opensAt,
      closesAt,
    }));
  const isCourtDirty = Boolean(
    selectedCourt &&
    (selectedCourt.name !== fields.name ||
      selectedCourt.status !== fields.status ||
      !sameStringSet(
        selectedCourt.characteristics.map((item) => item.id),
        fields.characteristicIds,
      )),
  );
  const isPriceDirty = Boolean(
    selectedCourt &&
    parseSolesToCentimos(hourlyPriceInput) !==
      selectedCourt.hourlyPriceCentimos,
  );
  const isOpeningHoursDirty = Boolean(
    selectedCenter &&
    !sameOpeningHours(selectedCenter.openingHours, currentOpeningHours),
  );
  const areCenterTagsDirty = Boolean(
    selectedCenter &&
    !sameStringSet(
      selectedCenter.tags.map((tag) => tag.id),
      selectedTagIds,
    ),
  );
  const publicationRequirements =
    selectedCenter && selectedCourt
      ? [
          {
            label: "El centro tiene nombre",
            complete: selectedCenter.name.trim().length > 0,
          },
          {
            label: "La cancha tiene nombre y está habilitada",
            complete:
              selectedCourt.name.trim().length > 0 &&
              selectedCourt.status === "ENABLED",
          },
          {
            label: "Hay al menos una foto publicada",
            complete: photos.length > 0,
          },
          {
            label: "El precio por hora es mayor que S/ 0",
            complete:
              selectedCourt.hourlyPriceCentimos !== null &&
              selectedCourt.hourlyPriceCentimos > 0,
          },
          {
            label: "Hay al menos un día con horario válido",
            complete: hasPublishableOpeningHours(selectedCenter.openingHours),
          },
          {
            label: "El centro tiene una etiqueta disponible",
            complete: selectedCenter.tags.some((tag) => tag.isActive),
          },
        ]
      : [];

  function beginCreate() {
    setEditingCourtId("");
    setShowPreview(false);
    setFields({ name: "", status: "ENABLED", characteristicIds: [] });
    setError("");
    setNotice("");
    setHourlyPriceInput("");
    setPriceError("");
    setPriceNotice("");
    setPhotos([]);
    setPhotoError("");
    setPhotoNotice("");
  }

  function beginEdit(court: Court) {
    setEditingCourtId(court.id);
    setShowPreview(false);
    setHourlyPriceInput(formatSolesInput(court.hourlyPriceCentimos));
    setPriceError("");
    setPriceNotice("");
    setPhotos([]);
    setPhotoError("");
    setPhotoNotice("");
    setFields({
      name: court.name,
      status: court.status,
      characteristicIds: court.characteristics.map((item) => item.id),
    });
    setError("");
    setNotice("");
  }

  function toggleCharacteristic(id: string) {
    setFields((current) => ({
      ...current,
      characteristicIds: current.characteristicIds.includes(id)
        ? current.characteristicIds.filter((selectedId) => selectedId !== id)
        : [...current.characteristicIds, id],
    }));
  }

  async function saveCourt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCenter) return;
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const endpoint = `/api/auth/sports-centers/managed/${selectedCenter.id}/courts${editingCourtId ? `/${editingCourtId}` : ""}`;
      const response = await fetch(endpoint, {
        method: editingCourtId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/access-denied");
        return;
      }
      const payload = await readPayload(response);
      if (!response.ok)
        throw new Error(
          getMessage(
            payload,
            "No pudimos guardar la cancha. Revisa los datos e inténtalo de nuevo.",
          ),
        );
      const savedCourtId = getManagedCourtId(payload);
      if (!savedCourtId) {
        throw new Error(
          "La cancha se guardó, pero no recibimos su identificador. Actualiza la lista antes de continuar.",
        );
      }
      const savedCourt: Court = {
        id: savedCourtId,
        name: fields.name.trim().replace(/\s+/g, " "),
        status: fields.status,
        publicationStatus: selectedCourt?.publicationStatus ?? "DRAFT",
        hourlyPriceCentimos: selectedCourt?.hourlyPriceCentimos ?? null,
        characteristics: fields.characteristicIds.flatMap((id) => {
          const item = characteristics.find(
            (characteristic) => characteristic.id === id,
          );
          return item ? [item] : [];
        }),
      };
      setCenters((current) =>
        current.map((center) =>
          center.id !== selectedCenter.id
            ? center
            : {
                ...center,
                courts: editingCourtId
                  ? center.courts.map((court) =>
                      court.id === savedCourtId ? savedCourt : court,
                    )
                  : [...center.courts, savedCourt],
              },
        ),
      );
      setEditingCourtId(savedCourtId);
      setFields({
        name: savedCourt.name,
        status: savedCourt.status,
        characteristicIds: savedCourt.characteristics.map((item) => item.id),
      });
      if (editingCourtId) {
        setNotice("La cancha se actualizó correctamente.");
      } else {
        setHourlyPriceInput("");
        setPriceNotice("Indica el precio por hora para completar la ficha.");
        setNotice("La cancha se creó correctamente.");
      }
      setShowPreview(false);
      setRetryKey((key) => key + 1);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos conectar con KanchaYA.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function toggleCenterTag(id: string) {
    setSelectedTagIds((current) => {
      if (current.includes(id)) return current.filter((tagId) => tagId !== id);
      if (current.length >= 10) {
        setCenterTagsError("Un centro puede usar hasta 10 etiquetas.");
        return current;
      }
      return [...current, id];
    });
    setCenterTagsNotice("");
  }

  async function saveCenterTags(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCenter) return;
    setIsSavingCenterTags(true);
    setCenterTagsError("");
    setCenterTagsNotice("");
    try {
      const response = await fetch(
        `/api/auth/sports-centers/managed/${encodeURIComponent(selectedCenter.id)}/tags`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds: selectedTagIds }),
        },
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/access-denied");
        return;
      }
      const payload = await readPayload(response);
      if (
        !response.ok ||
        !payload ||
        typeof payload !== "object" ||
        !("tagIds" in payload) ||
        !Array.isArray(payload.tagIds) ||
        !payload.tagIds.every((id) => typeof id === "string")
      ) {
        throw new Error(
          getMessage(payload, "No pudimos guardar las etiquetas del centro."),
        );
      }
      const savedIds = payload.tagIds as string[];
      if (!sameStringSet(savedIds, selectedTagIds)) {
        throw new Error(
          "La confirmación de etiquetas no coincide con tu selección. Actualiza la página.",
        );
      }
      const savedTags = savedIds.flatMap((id) => {
        const tag = centerTagCatalog.find((item) => item.id === id);
        return tag ? [tag] : [];
      });
      setCenters((current) =>
        current.map((center) =>
          center.id === selectedCenter.id
            ? { ...center, tags: savedTags }
            : center,
        ),
      );
      setCenterTagsNotice("Las etiquetas del centro se guardaron.");
      setRetryKey((key) => key + 1);
    } catch (cause) {
      setCenterTagsError(
        cause instanceof Error
          ? cause.message
          : "No pudimos conectar con KanchaYA.",
      );
    } finally {
      setIsSavingCenterTags(false);
    }
  }

  async function updatePublication() {
    if (!selectedCenter || !selectedCourt) return;
    const isPublished = selectedCourt.publicationStatus === "PUBLISHED";
    if (
      isPublished &&
      !window.confirm(
        "¿Quieres retirar esta ficha del marketplace? Dejará de ser visible para los usuarios.",
      )
    ) {
      return;
    }
    setIsPublishing(true);
    setPublicationError("");
    setPublicationNotice("");
    try {
      const action = isPublished ? "withdraw" : "publish";
      const response = await fetch(
        `/api/auth/sports-centers/managed/${encodeURIComponent(selectedCenter.id)}` +
          `/courts/${encodeURIComponent(selectedCourt.id)}/${action}`,
        { method: "POST" },
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/access-denied");
        return;
      }
      const payload = await readPayload(response);
      const expectedStatus: PublicationStatus = isPublished
        ? "DRAFT"
        : "PUBLISHED";
      if (
        !response.ok ||
        !payload ||
        typeof payload !== "object" ||
        !("publicationStatus" in payload) ||
        payload.publicationStatus !== expectedStatus
      ) {
        throw new Error(
          getMessage(
            payload,
            isPublished
              ? "No pudimos retirar la ficha del marketplace."
              : "No pudimos publicar la ficha.",
          ),
        );
      }
      setCenters((current) =>
        current.map((center) =>
          center.id !== selectedCenter.id
            ? center
            : {
                ...center,
                courts: center.courts.map((court) =>
                  court.id === selectedCourt.id
                    ? { ...court, publicationStatus: expectedStatus }
                    : court,
                ),
              },
        ),
      );
      setPublicationNotice(
        isPublished
          ? "La ficha se retiró del marketplace."
          : "La ficha ya está publicada en el marketplace.",
      );
      setShowPreview(false);
      setRetryKey((key) => key + 1);
    } catch (cause) {
      setPublicationError(
        cause instanceof Error
          ? cause.message
          : "No pudimos conectar con KanchaYA.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  async function saveHourlyPrice() {
    if (!selectedCenter || !editingCourtId) return;
    const hourlyPriceCentimos = parseSolesToCentimos(hourlyPriceInput);
    if (hourlyPriceCentimos === null) {
      setPriceError(
        "Escribe un importe mayor que S/ 0, con hasta dos decimales.",
      );
      setPriceNotice("");
      return;
    }

    setIsSavingPrice(true);
    setPriceError("");
    setPriceNotice("");
    try {
      const response = await fetch(
        `/api/auth/sports-centers/managed/${encodeURIComponent(selectedCenter.id)}` +
          `/courts/${encodeURIComponent(editingCourtId)}/price`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hourlyPriceCentimos }),
        },
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/access-denied");
        return;
      }
      const payload = await readPayload(response);
      if (!response.ok) {
        throw new Error(
          getMessage(payload, "No pudimos guardar el precio por hora."),
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("hourlyPriceCentimos" in payload) ||
        payload.hourlyPriceCentimos !== hourlyPriceCentimos
      ) {
        throw new Error(
          "Recibimos una confirmación de precio inválida. Inténtalo de nuevo.",
        );
      }
      setCenters((current) =>
        current.map((center) =>
          center.id !== selectedCenter.id
            ? center
            : {
                ...center,
                courts: center.courts.map((court) =>
                  court.id === editingCourtId
                    ? { ...court, hourlyPriceCentimos }
                    : court,
                ),
              },
        ),
      );
      setPriceNotice("El precio por hora se guardó correctamente.");
    } catch (cause) {
      setPriceError(
        cause instanceof Error
          ? cause.message
          : "No pudimos conectar con KanchaYA.",
      );
    } finally {
      setIsSavingPrice(false);
    }
  }

  function updateOpeningHours(
    dayOfWeek: number,
    changes: Partial<OpeningHoursDraft>,
  ) {
    setOpeningHours((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...changes } : day,
      ),
    );
  }

  async function saveCenterOpeningHours(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCenter) return;
    const hours = openingHours
      .filter((day) => day.isOpen)
      .map(({ dayOfWeek, opensAt, closesAt }) => ({
        dayOfWeek,
        opensAt,
        closesAt,
      }));
    if (hours.some((day) => !day.opensAt || !day.closesAt)) {
      setOpeningHoursError(
        "Selecciona la hora de apertura y de cierre para cada día abierto.",
      );
      setOpeningHoursNotice("");
      return;
    }
    if (hours.some((day) => day.closesAt <= day.opensAt)) {
      setOpeningHoursError(
        "La hora de cierre debe ser posterior a la apertura y dentro del mismo día.",
      );
      setOpeningHoursNotice("");
      return;
    }

    setIsSavingOpeningHours(true);
    setOpeningHoursError("");
    setOpeningHoursNotice("");
    try {
      const response = await fetch(
        `/api/auth/sports-centers/managed/${encodeURIComponent(selectedCenter.id)}/opening-hours`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hours }),
        },
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/access-denied");
        return;
      }
      const payload = await readPayload(response);
      if (!response.ok) {
        throw new Error(
          getMessage(payload, "No pudimos guardar el horario del centro."),
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("openingHours" in payload) ||
        !Array.isArray(payload.openingHours) ||
        !payload.openingHours.every(isDailyOpeningHours) ||
        JSON.stringify(payload.openingHours) !== JSON.stringify(hours)
      ) {
        throw new Error(
          "Recibimos una confirmación de horario inválida. Inténtalo de nuevo.",
        );
      }
      const savedHours = payload.openingHours as DailyOpeningHours[];
      setCenters((current) =>
        current.map((center) =>
          center.id === selectedCenter.id
            ? { ...center, openingHours: savedHours }
            : center,
        ),
      );
      setOpeningHours(createOpeningHoursDraft(savedHours));
      setOpeningHoursNotice(
        "El horario del centro se guardó y se aplicará a sus canchas.",
      );
    } catch (cause) {
      setOpeningHoursError(
        cause instanceof Error
          ? cause.message
          : "No pudimos conectar con KanchaYA.",
      );
    } finally {
      setIsSavingOpeningHours(false);
    }
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selectedCenter || !editingCourtId || files.length === 0) return;
    if (photos.length + files.length > maxPhotos) {
      setPhotoError(`Puedes publicar hasta ${maxPhotos} fotos por cancha.`);
      return;
    }

    setIsUploadingPhotos(true);
    setPhotoError("");
    setPhotoNotice("");
    let uploadedCount = 0;
    try {
      for (const file of files) {
        if (!photoTypes.includes(file.type)) {
          throw new Error(`${file.name}: usa el formato JPG, PNG o WebP.`);
        }
        if (file.size === 0 || file.size > maxPhotoBytes) {
          throw new Error(
            `${file.name}: cada foto debe pesar entre 1 byte y 5 MB.`,
          );
        }

        const photoBase =
          `/api/auth/sports-centers/managed/${encodeURIComponent(selectedCenter.id)}` +
          `/courts/${encodeURIComponent(editingCourtId)}/photos`;
        const uploadResponse = await fetch(`${photoBase}/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: file.type, byteSize: file.size }),
        });
        if (uploadResponse.status === 401) {
          router.replace("/login");
          return;
        }
        if (uploadResponse.status === 403) {
          router.replace("/access-denied");
          return;
        }
        const uploadPayload = await readPayload(uploadResponse);
        if (!uploadResponse.ok) {
          throw new Error(
            getMessage(
              uploadPayload,
              "No pudimos preparar la carga de la foto.",
            ),
          );
        }
        if (!isCourtPhotoUpload(uploadPayload)) {
          throw new Error(
            "Recibimos una dirección de carga inválida. Inténtalo de nuevo.",
          );
        }

        const formData = new FormData();
        for (const [name, value] of Object.entries(uploadPayload.fields)) {
          formData.append(name, value);
        }
        formData.append("file", file);
        const objectResponse = await fetch(uploadPayload.uploadUrl, {
          method: "POST",
          body: formData,
        });
        if (!objectResponse.ok) {
          throw new Error(
            `${file.name}: no pudimos transferir la foto. Inténtalo de nuevo.`,
          );
        }

        const completeResponse = await fetch(
          `${photoBase}/${encodeURIComponent(uploadPayload.id)}/complete`,
          {
            method: "POST",
          },
        );
        if (completeResponse.status === 401) {
          router.replace("/login");
          return;
        }
        if (completeResponse.status === 403) {
          router.replace("/access-denied");
          return;
        }
        const completePayload = await readPayload(completeResponse);
        if (!completeResponse.ok) {
          throw new Error(
            getMessage(
              completePayload,
              `${file.name}: no pudimos publicar la foto.`,
            ),
          );
        }
        if (!isCourtPhoto(completePayload)) {
          throw new Error(
            `${file.name}: recibimos una respuesta de publicación inválida.`,
          );
        }
        setPhotos((current) => [...current, completePayload]);
        uploadedCount += 1;
      }
      setPhotoNotice(
        uploadedCount === 1
          ? "La foto se cargó y ya está publicada para los usuarios."
          : `${uploadedCount} fotos se cargaron y ya están publicadas para los usuarios.`,
      );
    } catch (cause) {
      setPhotoError(
        cause instanceof Error ? cause.message : "No pudimos cargar las fotos.",
      );
      if (uploadedCount > 0) {
        setPhotoNotice(
          `${uploadedCount} fotos se publicaron antes de encontrar un problema.`,
        );
      }
    } finally {
      setIsUploadingPhotos(false);
    }
  }

  async function removePhoto(photo: CourtPhoto) {
    if (!selectedCenter || !editingCourtId) return;
    if (
      !window.confirm("¿Quitar esta foto? Dejará de mostrarse a los usuarios.")
    )
      return;
    setDeletingPhotoId(photo.id);
    setPhotoError("");
    setPhotoNotice("");
    try {
      const response = await fetch(
        `/api/auth/sports-centers/managed/${encodeURIComponent(selectedCenter.id)}` +
          `/courts/${encodeURIComponent(editingCourtId)}/photos/${encodeURIComponent(photo.id)}`,
        { method: "DELETE" },
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403) {
        router.replace("/access-denied");
        return;
      }
      const payload = await readPayload(response);
      if (!response.ok) {
        throw new Error(
          getMessage(payload, "No pudimos quitar la foto. Inténtalo de nuevo."),
        );
      }
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setPhotoNotice("La foto se quitó de la publicación.");
    } catch (cause) {
      setPhotoError(
        cause instanceof Error
          ? cause.message
          : "No pudimos conectar con KanchaYA.",
      );
    } finally {
      setDeletingPhotoId("");
    }
  }

  if (isLoading)
    return (
      <p aria-live="polite" className="loading-line">
        Cargando las canchas de tus centros…
      </p>
    );

  if (error && centers.length === 0) {
    return (
      <div className="court-empty-state" role="alert">
        <p>{error}</p>
        <button
          className="secondary-button"
          onClick={() => setRetryKey((key) => key + 1)}
          type="button"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }

  if (centers.length === 0) {
    return (
      <div className="court-empty-state" role="status">
        <h2>Aún no tienes un centro asignado</h2>
        <p>
          Cuando la administración te asigne un centro, podrás crear y mantener
          sus canchas desde aquí.
        </p>
        <Link className="secondary-button" href="/profile">
          Volver a mi perfil
        </Link>
      </div>
    );
  }

  return (
    <div className="court-management">
      <div className="court-management-toolbar">
        <div>
          <p className="directory-kicker">Administración del centro</p>
          <h2>Oferta de canchas</h2>
        </div>
        {centers.length > 1 && (
          <div className="field court-center-select">
            <label htmlFor="managed-center">Centro deportivo</label>
            <select
              disabled={
                isUploadingPhotos ||
                !!deletingPhotoId ||
                isSavingPrice ||
                isSavingOpeningHours ||
                isSavingCenterTags ||
                isPublishing
              }
              id="managed-center"
              onChange={(event) => {
                const nextCenterId = event.target.value;
                setCenterId(nextCenterId);
                setOpeningHours(
                  createOpeningHoursDraft(
                    centers.find((center) => center.id === nextCenterId)
                      ?.openingHours ?? null,
                  ),
                );
                setOpeningHoursError("");
                setOpeningHoursNotice("");
                setSelectedTagIds(
                  centers
                    .find((center) => center.id === nextCenterId)
                    ?.tags.map((tag) => tag.id) ?? [],
                );
                setCenterTagsError("");
                setCenterTagsNotice("");
                beginCreate();
              }}
              value={centerId}
            >
              {centers.map((center) => (
                <option key={center.id} value={center.id}>
                  {center.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

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

      {selectedCenter && (
        <section
          aria-labelledby="center-opening-hours-title"
          className="center-opening-hours"
        >
          <div className="court-panel-heading">
            <div>
              <h3 id="center-opening-hours-title">Horario de atención</h3>
              <p>
                Define la apertura y el cierre de {selectedCenter.name}. Todas
                sus canchas publicarán estos mismos horarios.
              </p>
            </div>
          </div>
          <form onSubmit={saveCenterOpeningHours}>
            <fieldset
              className="center-opening-hours-days"
              disabled={isSavingOpeningHours}
            >
              <legend>Horario semanal</legend>
              {openingHours.map((day) => (
                <div className="center-opening-hours-row" key={day.dayOfWeek}>
                  <label className="center-opening-day">
                    <input
                      checked={day.isOpen}
                      onChange={(event) =>
                        updateOpeningHours(day.dayOfWeek, {
                          isOpen: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    <span>{weekdays[day.dayOfWeek - 1]}</span>
                  </label>
                  {day.isOpen ? (
                    <div className="center-opening-times">
                      <label htmlFor={`center-opens-${day.dayOfWeek}`}>
                        Abre
                      </label>
                      <select
                        id={`center-opens-${day.dayOfWeek}`}
                        onChange={(event) =>
                          updateOpeningHours(day.dayOfWeek, {
                            opensAt: event.target.value,
                          })
                        }
                        value={day.opensAt}
                      >
                        <option disabled value="">
                          Selecciona
                        </option>
                        {openingTimeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                      <label htmlFor={`center-closes-${day.dayOfWeek}`}>
                        Cierra
                      </label>
                      <select
                        id={`center-closes-${day.dayOfWeek}`}
                        onChange={(event) =>
                          updateOpeningHours(day.dayOfWeek, {
                            closesAt: event.target.value,
                          })
                        }
                        value={day.closesAt}
                      >
                        <option disabled value="">
                          Selecciona
                        </option>
                        {closingTimeOptions.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span className="center-opening-closed">Cerrado</span>
                  )}
                </div>
              ))}
            </fieldset>
            <p className="field-hint">
              Usa la hora local del centro y horas exactas; cada tramo debe
              durar al menos una hora y no puede cruzar la medianoche. Cerrar a
              las 24:00 indica el final del día.
            </p>
            {openingHoursError && (
              <p
                aria-live="polite"
                className="form-message form-error"
                role="alert"
              >
                {openingHoursError}
              </p>
            )}
            {openingHoursNotice && (
              <p
                aria-live="polite"
                className="form-message form-success"
                role="status"
              >
                {openingHoursNotice}
              </p>
            )}
            <button
              className="secondary-button"
              disabled={isSavingOpeningHours}
              type="submit"
            >
              {isSavingOpeningHours ? "Guardando…" : "Guardar horario"}
            </button>
          </form>
        </section>
      )}

      {selectedCenter && (
        <section
          aria-labelledby="center-tags-title"
          className="center-tags-editor"
        >
          <div className="court-panel-heading">
            <div>
              <h3 id="center-tags-title">Etiquetas del centro</h3>
              <p>
                Elige hasta 10 etiquetas del catálogo de KanchaYA. Se mostrarán
                junto a todas las canchas de este centro.
              </p>
            </div>
          </div>
          <form onSubmit={saveCenterTags}>
            <fieldset
              className="court-characteristic-fieldset"
              disabled={isSavingCenterTags}
            >
              <legend>Etiquetas disponibles</legend>
              <div className="court-characteristic-options">
                {centerTagCatalog
                  .filter(
                    (tag) => tag.isActive || selectedTagIds.includes(tag.id),
                  )
                  .map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <label
                        className={`court-characteristic-option${selected ? " is-selected" : ""}`}
                        key={tag.id}
                      >
                        <input
                          checked={selected}
                          onChange={() => toggleCenterTag(tag.id)}
                          type="checkbox"
                        />
                        <span>
                          {tag.name}
                          {!tag.isActive ? " · archivada" : ""}
                        </span>
                      </label>
                    );
                  })}
                {centerTagCatalog.filter((tag) => tag.isActive).length ===
                  0 && (
                  <span className="field-hint">
                    Todavía no hay etiquetas disponibles. Solicita a la
                    administración que agregue opciones al catálogo.
                  </span>
                )}
              </div>
              <p className="field-hint">
                {selectedTagIds.length}/10 seleccionadas. Las etiquetas
                archivadas se conservan mientras estén asignadas.
              </p>
            </fieldset>
            {centerTagsError && (
              <p
                aria-live="polite"
                className="form-message form-error"
                role="alert"
              >
                {centerTagsError}
              </p>
            )}
            {centerTagsNotice && (
              <p
                aria-live="polite"
                className="form-message form-success"
                role="status"
              >
                {centerTagsNotice}
              </p>
            )}
            <button
              className="secondary-button"
              disabled={isSavingCenterTags || !areCenterTagsDirty}
              type="submit"
            >
              {isSavingCenterTags ? "Guardando…" : "Guardar etiquetas"}
            </button>
          </form>
        </section>
      )}

      <div className="court-management-grid">
        <section
          aria-labelledby="court-list-title"
          className="court-list-panel"
        >
          <div className="court-panel-heading">
            <div>
              <p className="court-panel-overline">{selectedCenter?.name}</p>
              <h3 id="court-list-title">Canchas registradas</h3>
            </div>
            <span className="court-count">
              {selectedCenter?.courts.length ?? 0}
            </span>
          </div>
          {selectedCenter?.courts.length ? (
            <ul className="managed-court-list">
              {selectedCenter.courts.map((court) => (
                <li className="managed-court" key={court.id}>
                  <div className="managed-court-copy">
                    <strong>{court.name}</strong>
                    <span
                      className={`court-status court-status-${court.status.toLowerCase()}`}
                    >
                      {statusLabels[court.status]}
                    </span>
                    <span
                      className={`court-status ${court.publicationStatus === "PUBLISHED" ? "court-status-enabled" : "court-status-disabled"}`}
                    >
                      {court.publicationStatus === "PUBLISHED"
                        ? "Publicada"
                        : "Borrador"}
                    </span>
                    <span className="court-hourly-price">
                      {court.hourlyPriceCentimos === null
                        ? "Precio por hora pendiente"
                        : `${formatSoles(court.hourlyPriceCentimos)} / hora`}
                    </span>
                    <span className="court-opening-hours">
                      {formatOpeningHours(selectedCenter.openingHours)}
                    </span>
                    {court.characteristics.length > 0 && (
                      <span className="court-tag-list">
                        {court.characteristics.map((item) => (
                          <span
                            className={`court-tag${item.isActive ? "" : " court-tag-inactive"}`}
                            key={item.id}
                          >
                            {item.name}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  <button
                    className="court-edit-button"
                    disabled={
                      isUploadingPhotos || !!deletingPhotoId || isSavingPrice
                    }
                    onClick={() => beginEdit(court)}
                    type="button"
                  >
                    Editar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="court-list-empty">
              <p>Este centro todavía no tiene canchas registradas.</p>
              <span>Añade la primera para que su oferta quede lista.</span>
            </div>
          )}
        </section>

        <form
          aria-label={editingCourtId ? "Editar cancha" : "Crear cancha"}
          className="court-form-panel"
          onSubmit={saveCourt}
        >
          <div className="court-panel-heading">
            <div>
              <p className="court-panel-overline">
                {editingCourtId ? "Actualizar oferta" : "Nueva oferta"}
              </p>
              <h3>{editingCourtId ? "Editar cancha" : "Añadir cancha"}</h3>
            </div>
          </div>
          <fieldset className="court-form-fields" disabled={isSaving}>
            <div className="field">
              <label htmlFor="court-name">Nombre de la cancha</label>
              <input
                autoComplete="off"
                id="court-name"
                maxLength={80}
                minLength={2}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Ej. Cancha sintética 1"
                required
                value={fields.name}
              />
              <span className="field-hint">Entre 2 y 80 caracteres.</span>
            </div>
            <div className="field">
              <label htmlFor="court-status">Estado de la cancha</label>
              <select
                id="court-status"
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    status: event.target.value as CourtStatus,
                  }))
                }
                value={fields.status}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                El estado indica si la cancha está disponible para la oferta del
                centro.
              </span>
            </div>
            <fieldset className="court-characteristic-fieldset">
              <legend>Características</legend>
              <p>
                Selecciona las etiquetas administradas por KanchaYA para
                describir esta cancha.
              </p>
              <div className="court-characteristic-options">
                {characteristics
                  .filter(
                    (item) =>
                      item.isActive ||
                      fields.characteristicIds.includes(item.id),
                  )
                  .map((item) => {
                    const selected = fields.characteristicIds.includes(item.id);
                    return (
                      <label
                        className={`court-characteristic-option${selected ? " is-selected" : ""}`}
                        key={item.id}
                      >
                        <input
                          checked={selected}
                          disabled={!item.isActive && !selected}
                          onChange={() => toggleCharacteristic(item.id)}
                          type="checkbox"
                        />
                        <span>
                          {item.name}
                          {!item.isActive ? " · archivada" : ""}
                        </span>
                      </label>
                    );
                  })}
                {characteristics.filter((item) => item.isActive).length ===
                  0 && (
                  <span className="field-hint">
                    Todavía no hay características disponibles. Solicita al
                    administrador que agregue etiquetas.
                  </span>
                )}
              </div>
            </fieldset>
          </fieldset>
          {editingCourtId && (
            <section
              aria-labelledby="court-price-title"
              className="court-price-editor"
            >
              <div className="court-photos-heading">
                <div>
                  <h4 id="court-price-title">Precio de alquiler</h4>
                  <p>El importe se publica en soles peruanos por hora.</p>
                </div>
              </div>
              <div className="court-price-row">
                <div className="field">
                  <label htmlFor="court-hourly-price">
                    Precio por hora (S/)
                  </label>
                  <input
                    autoComplete="off"
                    id="court-hourly-price"
                    inputMode="decimal"
                    maxLength={11}
                    onChange={(event) =>
                      setHourlyPriceInput(event.target.value)
                    }
                    placeholder="Ej. 75.00"
                    type="text"
                    value={hourlyPriceInput}
                  />
                  <span className="field-hint">
                    Mayor que cero; puedes usar hasta dos decimales.
                  </span>
                </div>
                <button
                  className="secondary-button"
                  disabled={
                    isSavingPrice ||
                    isSaving ||
                    isUploadingPhotos ||
                    !!deletingPhotoId
                  }
                  onClick={() => void saveHourlyPrice()}
                  type="button"
                >
                  {isSavingPrice ? "Guardando…" : "Guardar precio"}
                </button>
              </div>
              {priceError && (
                <p
                  aria-live="polite"
                  className="form-message form-error"
                  role="alert"
                >
                  {priceError}
                </p>
              )}
              {priceNotice && (
                <p
                  aria-live="polite"
                  className="form-message form-success"
                  role="status"
                >
                  {priceNotice}
                </p>
              )}
            </section>
          )}
          {editingCourtId && (
            <section
              aria-labelledby="court-photos-title"
              className="court-photos-panel"
            >
              <div className="court-photos-heading">
                <div>
                  <h4 id="court-photos-title">Fotos para usuarios</h4>
                  <p>
                    Al terminar de cargarlas, se publican en la página de esta
                    cancha.
                  </p>
                </div>
                <span className="court-photo-count">
                  {photos.length}/{maxPhotos}
                </span>
              </div>
              <label className="court-photo-upload">
                <span>
                  {isUploadingPhotos ? "Cargando fotos…" : "Seleccionar fotos"}
                </span>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  disabled={isUploadingPhotos || photos.length >= maxPhotos}
                  multiple
                  onChange={uploadPhotos}
                  type="file"
                />
              </label>
              <p className="field-hint">
                JPG, PNG o WebP · hasta 5 MB cada una · carga secuencial para no
                saturar la página.
              </p>
              {isLoadingPhotos ? (
                <p aria-live="polite" className="field-hint">
                  Cargando fotos…
                </p>
              ) : photos.length ? (
                <ul className="court-photo-list">
                  {photos.map((photo) => (
                    <li key={photo.id}>
                      <Image
                        alt={`Foto publicada de ${fields.name || "la cancha"}`}
                        decoding="async"
                        height={120}
                        loading="lazy"
                        src={photo.url}
                        unoptimized
                        width={180}
                      />
                      <button
                        className="court-photo-remove"
                        disabled={
                          isUploadingPhotos || deletingPhotoId === photo.id
                        }
                        onClick={() => void removePhoto(photo)}
                        type="button"
                      >
                        {deletingPhotoId === photo.id
                          ? "Quitando…"
                          : "Quitar foto"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="court-photo-empty">
                  Todavía no hay fotos publicadas para esta cancha.
                </p>
              )}
              {photoError && (
                <p
                  aria-live="polite"
                  className="form-message form-error"
                  role="alert"
                >
                  {photoError}
                </p>
              )}
              {photoNotice && (
                <p
                  aria-live="polite"
                  className="form-message form-success"
                  role="status"
                >
                  {photoNotice}
                </p>
              )}
            </section>
          )}
          {editingCourtId && selectedCenter && selectedCourt && (
            <section
              aria-labelledby="publication-review-title"
              className="publication-review-panel"
            >
              <div className="court-photos-heading">
                <div>
                  <h4 id="publication-review-title">
                    Publicación en marketplace
                  </h4>
                  <p>
                    Revisa la ficha tal como la verán los usuarios antes de
                    publicarla.
                  </p>
                </div>
                <span
                  className={`court-status ${selectedCourt.publicationStatus === "PUBLISHED" ? "court-status-enabled" : "court-status-disabled"}`}
                >
                  {selectedCourt.publicationStatus === "PUBLISHED"
                    ? "Publicada"
                    : "Borrador"}
                </span>
              </div>
              <button
                className="secondary-button"
                disabled={
                  isLoadingPhotos ||
                  isSaving ||
                  isSavingPrice ||
                  isSavingOpeningHours ||
                  isSavingCenterTags ||
                  isUploadingPhotos ||
                  !!deletingPhotoId ||
                  isCourtDirty ||
                  isPriceDirty ||
                  isOpeningHoursDirty ||
                  areCenterTagsDirty
                }
                onClick={() => {
                  setPublicationError("");
                  setPublicationNotice("");
                  setShowPreview((visible) => !visible);
                }}
                type="button"
              >
                {showPreview ? "Ocultar vista previa" : "Revisar vista previa"}
              </button>
              {(isCourtDirty ||
                isPriceDirty ||
                isOpeningHoursDirty ||
                areCenterTagsDirty) && (
                <p className="field-hint">
                  Guarda primero los cambios de la cancha, el precio, el horario
                  y las etiquetas para revisar la ficha actualizada.
                </p>
              )}
              {publicationNotice && (
                <p
                  aria-live="polite"
                  className="form-message form-success"
                  role="status"
                >
                  {publicationNotice}
                </p>
              )}
              {publicationError && (
                <p
                  aria-live="polite"
                  className="form-message form-error"
                  role="alert"
                >
                  {publicationError}
                </p>
              )}
              {showPreview && (
                <div className="publication-review-content">
                  <article className="publication-preview-card">
                    <div className="publication-preview-heading">
                      <div>
                        <h5>{selectedCourt.name}</h5>
                        <p>{selectedCenter.name}</p>
                      </div>
                      <strong>
                        {selectedCourt.hourlyPriceCentimos === null
                          ? "Precio pendiente"
                          : `${formatSoles(selectedCourt.hourlyPriceCentimos)} / hora`}
                      </strong>
                    </div>
                    <p className="court-opening-hours">
                      {formatOpeningHours(selectedCenter.openingHours)}
                    </p>
                    {selectedCenter.tags.length > 0 && (
                      <div
                        aria-label="Etiquetas del centro"
                        className="court-tag-list"
                      >
                        {selectedCenter.tags
                          .filter((tag) => tag.isActive)
                          .map((tag) => (
                            <span className="court-tag" key={tag.id}>
                              {tag.name}
                            </span>
                          ))}
                      </div>
                    )}
                    {selectedCourt.characteristics.length > 0 && (
                      <div
                        aria-label="Características de la cancha"
                        className="court-tag-list"
                      >
                        {selectedCourt.characteristics
                          .filter((item) => item.isActive)
                          .map((item) => (
                            <span className="court-tag" key={item.id}>
                              {item.name}
                            </span>
                          ))}
                      </div>
                    )}
                    {photos.length > 0 && (
                      <ul className="publication-preview-photos">
                        {photos.map((photo) => (
                          <li key={photo.id}>
                            <Image
                              alt={`Foto de ${selectedCourt.name}`}
                              height={120}
                              loading="lazy"
                              src={photo.url}
                              unoptimized
                              width={180}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                  <div className="publication-requirements">
                    <h5>Antes de publicar</h5>
                    <ul>
                      {publicationRequirements.map((requirement) => (
                        <li
                          className={
                            requirement.complete
                              ? "publication-requirement-complete"
                              : "publication-requirement-pending"
                          }
                          key={requirement.label}
                        >
                          <span>
                            {requirement.complete ? "Listo" : "Pendiente"}
                          </span>
                          {requirement.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="court-form-actions">
                    {selectedCourt.publicationStatus === "PUBLISHED" ? (
                      <button
                        className="secondary-button"
                        disabled={isPublishing}
                        onClick={() => void updatePublication()}
                        type="button"
                      >
                        {isPublishing
                          ? "Retirando…"
                          : "Retirar del marketplace"}
                      </button>
                    ) : (
                      <button
                        className="primary-button"
                        disabled={
                          isPublishing ||
                          !publicationRequirements.every(
                            (requirement) => requirement.complete,
                          )
                        }
                        onClick={() => void updatePublication()}
                        type="button"
                      >
                        {isPublishing ? "Publicando…" : "Publicar ficha"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
          <div className="court-form-actions">
            {editingCourtId && (
              <button
                className="secondary-button"
                disabled={
                  isSaving ||
                  isSavingPrice ||
                  isUploadingPhotos ||
                  !!deletingPhotoId
                }
                onClick={beginCreate}
                type="button"
              >
                Cancelar
              </button>
            )}
            <button
              className="primary-button"
              disabled={
                isSaving ||
                isSavingPrice ||
                isUploadingPhotos ||
                !!deletingPhotoId
              }
              type="submit"
            >
              {isSaving
                ? "Guardando…"
                : editingCourtId
                  ? "Guardar cambios"
                  : "Crear cancha"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function isCourtPhoto(value: unknown): value is CourtPhoto {
  if (!value || typeof value !== "object") return false;
  const photo = value as Record<string, unknown>;
  return (
    typeof photo.id === "string" &&
    typeof photo.url === "string" &&
    typeof photo.contentType === "string" &&
    typeof photo.byteSize === "number"
  );
}

function isCourtPhotoUpload(
  value: unknown,
): value is { id: string; uploadUrl: string; fields: Record<string, string> } {
  if (!value || typeof value !== "object") return false;
  const upload = value as Record<string, unknown>;
  return (
    typeof upload.id === "string" &&
    typeof upload.uploadUrl === "string" &&
    !!upload.fields &&
    typeof upload.fields === "object" &&
    Object.values(upload.fields).every((field) => typeof field === "string")
  );
}

function parseSolesToCentimos(value: string): number | null {
  const match = /^(\d{1,8})(?:[.,](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const centimos =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(centimos) &&
    centimos > 0 &&
    centimos <= 2_147_483_647
    ? centimos
    : null;
}

function formatSolesInput(centimos: number | null): string {
  if (centimos === null) return "";
  const soles = Math.floor(centimos / 100);
  const remainder = String(centimos % 100).padStart(2, "0");
  return `${soles}.${remainder}`;
}

function formatSoles(centimos: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centimos / 100);
}

function createOpeningHoursDraft(
  hours: DailyOpeningHours[] | null,
): OpeningHoursDraft[] {
  const byDay = new Map((hours ?? []).map((entry) => [entry.dayOfWeek, entry]));
  return weekdays.map((_, index) => {
    const dayOfWeek = index + 1;
    const hoursForDay = byDay.get(dayOfWeek);
    return {
      dayOfWeek,
      isOpen: !!hoursForDay,
      opensAt: hoursForDay?.opensAt ?? "",
      closesAt: hoursForDay?.closesAt ?? "",
    };
  });
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

function formatOpeningHours(hours: DailyOpeningHours[] | null): string {
  if (hours === null) return "Horario por confirmar";
  if (hours.length === 0) return "Sin atención programada";
  return hours
    .slice()
    .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
    .map(
      ({ dayOfWeek, opensAt, closesAt }) =>
        `${weekdays[dayOfWeek - 1].slice(0, 3)} ${opensAt}–${closesAt}`,
    )
    .join(" · ");
}

function sameStringSet(left: string[], right: string[]) {
  return (
    left.length === right.length && left.every((value) => right.includes(value))
  );
}

function sameOpeningHours(
  saved: DailyOpeningHours[] | null,
  current: DailyOpeningHours[],
) {
  const normalize = (hours: DailyOpeningHours[]) =>
    hours
      .slice()
      .sort((left, right) => left.dayOfWeek - right.dayOfWeek)
      .map(({ dayOfWeek, opensAt, closesAt }) => ({
        dayOfWeek,
        opensAt,
        closesAt,
      }));
  return (
    JSON.stringify(normalize(saved ?? [])) ===
    JSON.stringify(normalize(current))
  );
}

function hasPublishableOpeningHours(hours: DailyOpeningHours[] | null) {
  return Boolean(
    hours?.length &&
    hours.every(isDailyOpeningHours) &&
    new Set(hours.map((day) => day.dayOfWeek)).size === hours.length,
  );
}

function getManagedCourtId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("court" in payload)) {
    return null;
  }
  const court = payload.court;
  if (!court || typeof court !== "object" || !("id" in court)) return null;
  return typeof court.id === "string" ? court.id : null;
}

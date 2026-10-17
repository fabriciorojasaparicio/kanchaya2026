import { IsIn, IsInt, IsPositive, Max } from 'class-validator';

export const COURT_PHOTO_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export const MAX_COURT_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_COURT_PHOTOS = 8;

export class CreateCourtPhotoUploadDto {
  @IsIn(COURT_PHOTO_TYPES, { message: 'Usa una foto JPG, PNG o WebP.' })
  contentType!: (typeof COURT_PHOTO_TYPES)[number];

  @IsInt({ message: 'El tamaño del archivo no es válido.' })
  @IsPositive({ message: 'El archivo está vacío.' })
  @Max(MAX_COURT_PHOTO_BYTES, { message: 'Cada foto puede pesar hasta 5 MB.' })
  byteSize!: number;
}

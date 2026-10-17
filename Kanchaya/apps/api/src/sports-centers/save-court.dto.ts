import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsUUID,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CourtStatus } from './court-status';

export class SaveCourtDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value))
  @IsString({ message: 'Escribe un nombre válido para la cancha.' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres.' })
  @MaxLength(80, { message: 'El nombre no puede superar los 80 caracteres.' })
  name!: string;

  @IsEnum(CourtStatus, { message: 'Selecciona un estado válido para la cancha.' })
  status!: CourtStatus;

  @IsArray({ message: 'Selecciona características válidas.' })
  @ArrayMaxSize(20, { message: 'Una cancha puede tener hasta 20 características.' })
  @ArrayUnique({ message: 'No repitas características.' })
  @IsUUID('all', { each: true, message: 'Una característica seleccionada no es válida.' })
  characteristicIds!: string[];
}

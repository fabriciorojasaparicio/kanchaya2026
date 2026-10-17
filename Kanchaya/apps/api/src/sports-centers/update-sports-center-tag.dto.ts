import { Transform } from 'class-transformer';
import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSportsCenterTagDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  @IsString({ message: 'Escribe una etiqueta válida.' })
  @MinLength(2, { message: 'La etiqueta debe tener al menos 2 caracteres.' })
  @MaxLength(30, { message: 'La etiqueta no puede superar los 30 caracteres.' })
  name!: string;

  @IsBoolean({ message: 'Selecciona si la etiqueta está disponible.' })
  isActive!: boolean;
}

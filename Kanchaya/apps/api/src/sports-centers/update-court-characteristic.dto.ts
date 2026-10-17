import { Transform } from 'class-transformer';
import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCourtCharacteristicDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value))
  @IsString({ message: 'Escribe una característica válida.' })
  @MinLength(2, { message: 'La característica debe tener al menos 2 caracteres.' })
  @MaxLength(40, { message: 'La característica no puede superar los 40 caracteres.' })
  name!: string;

  @IsBoolean({ message: 'Selecciona si la característica está habilitada.' })
  isActive!: boolean;
}

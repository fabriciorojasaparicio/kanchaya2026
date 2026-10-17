import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class DailyOpeningHoursDto {
  @IsInt({ message: 'Selecciona un día de la semana válido.' })
  @Min(1, { message: 'El lunes corresponde al día 1.' })
  @Max(7, { message: 'El domingo corresponde al día 7.' })
  dayOfWeek!: number;

  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):00$/, {
    message: 'La hora de apertura debe ser una hora exacta.',
  })
  opensAt!: string;

  @IsString()
  @Matches(/^(?:(?:[01]\d|2[0-3]):00|24:00)$/, {
    message: 'La hora de cierre debe ser una hora exacta.',
  })
  closesAt!: string;
}

export class UpdateCenterOpeningHoursDto {
  @IsArray({ message: 'Indica los horarios de atención por día.' })
  @ArrayMaxSize(7, { message: 'Indica como máximo un horario por día.' })
  @ArrayUnique((entry: DailyOpeningHoursDto) => entry.dayOfWeek, {
    message: 'No repitas el mismo día de la semana.',
  })
  @ValidateNested({ each: true })
  @Type(() => DailyOpeningHoursDto)
  hours!: DailyOpeningHoursDto[];
}

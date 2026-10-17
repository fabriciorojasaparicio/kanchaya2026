import { IsInt, Max, Min } from 'class-validator';

export class UpdateCourtPriceDto {
  @IsInt({ message: 'Escribe un precio válido en céntimos de sol.' })
  @Min(1, { message: 'El precio por hora debe ser mayor que cero.' })
  @Max(2_147_483_647, { message: 'El precio supera el máximo permitido.' })
  hourlyPriceCentimos!: number;
}

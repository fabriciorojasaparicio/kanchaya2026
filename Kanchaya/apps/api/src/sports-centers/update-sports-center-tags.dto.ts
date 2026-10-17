import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class UpdateSportsCenterTagsDto {
  @IsArray({ message: 'Selecciona una lista válida de etiquetas.' })
  @ArrayMaxSize(10, { message: 'Un centro puede usar hasta 10 etiquetas.' })
  @ArrayUnique({ message: 'No repitas etiquetas.' })
  @IsUUID('all', { each: true, message: 'Selecciona etiquetas válidas.' })
  tagIds!: string[];
}

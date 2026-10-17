import { Controller, Get, Header, Param, ParseUUIDPipe } from '@nestjs/common';
import { SportsCentersService } from './sports-centers.service';

@Controller('sports-centers')
export class SportsCentersController {
  constructor(private readonly sportsCenters: SportsCentersService) {}

  @Get()
  @Header(
    'Cache-Control',
    'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
  )
  list() {
    return this.sportsCenters.list();
  }

  @Get(':centerId/courts/:courtId')
  @Header(
    'Cache-Control',
    'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
  )
  getCourt(
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Param('courtId', ParseUUIDPipe) courtId: string,
  ) {
    return this.sportsCenters.getPublicCourt(centerId, courtId);
  }
}

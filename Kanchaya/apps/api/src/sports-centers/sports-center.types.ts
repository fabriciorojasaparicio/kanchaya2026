export interface DailyOpeningHours {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}

export interface SportsCenterCourt {
  id: string;
  name: string;
  hourlyPriceCentimos: number | null;
  openingHours: DailyOpeningHours[] | null;
  characteristics: string[];
}

export interface SportsCenterTagSummary {
  id: string;
  name: string;
}

export interface SportsCenterSummary {
  id: string;
  name: string;
  courtCount: number;
  courts: SportsCenterCourt[];
  tags: SportsCenterTagSummary[];
  isFeatured: boolean;
}

export interface SportsCenterListResponse {
  centers: SportsCenterSummary[];
}

export interface PublicCourtDetail {
  center: {
    id: string;
    name: string;
    tags: SportsCenterTagSummary[];
  };
  court: SportsCenterCourt;
}

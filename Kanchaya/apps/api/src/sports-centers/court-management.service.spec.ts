import { BadRequestException } from '@nestjs/common';
import { DailyOpeningHoursDto } from './update-center-opening-hours.dto';
import {
  hasValidPublishedHours,
  validateOpeningHours,
} from './court-management.service';

describe('validateOpeningHours', () => {
  it('accepts whole-hour ranges with at least one hour, including midnight close', () => {
    const hours: DailyOpeningHoursDto[] = [
      { dayOfWeek: 1, opensAt: '08:00', closesAt: '09:00' },
      { dayOfWeek: 7, opensAt: '23:00', closesAt: '24:00' },
    ];

    expect(() => validateOpeningHours(hours)).not.toThrow();
  });

  describe('hasValidPublishedHours', () => {
    it('requires at least one valid weekly time range', () => {
      expect(
        hasValidPublishedHours([
          { dayOfWeek: 1, opensAt: '08:00', closesAt: '09:00' },
        ]),
      ).toBe(true);
      expect(hasValidPublishedHours([])).toBe(false);
      expect(hasValidPublishedHours(null)).toBe(false);
    });

    it('rejects malformed, duplicate, and shorter-than-one-hour ranges', () => {
      expect(
        hasValidPublishedHours([
          { dayOfWeek: 1, opensAt: '08:30', closesAt: '09:00' },
        ]),
      ).toBe(false);
      expect(
        hasValidPublishedHours([
          { dayOfWeek: 1, opensAt: '08:00', closesAt: '09:00' },
          { dayOfWeek: 1, opensAt: '10:00', closesAt: '11:00' },
        ]),
      ).toBe(false);
      expect(
        hasValidPublishedHours([
          { dayOfWeek: 1, opensAt: '08:00', closesAt: '25:00' },
        ]),
      ).toBe(false);
    });

    it('accepts midnight as the end of a same-day interval', () => {
      expect(
        hasValidPublishedHours([
          { dayOfWeek: 7, opensAt: '23:00', closesAt: '24:00' },
        ]),
      ).toBe(true);
    });
  });

  it('allows a center to be closed all week', () => {
    expect(() => validateOpeningHours([])).not.toThrow();
  });

  it.each([
    { dayOfWeek: 1, opensAt: '08:00', closesAt: '08:00' },
    { dayOfWeek: 1, opensAt: '09:00', closesAt: '08:00' },
    { dayOfWeek: 1, opensAt: '08:30', closesAt: '10:00' },
    { dayOfWeek: 1, opensAt: '08:00', closesAt: '08:30' },
  ])('rejects invalid same-day ranges: %o', (entry) => {
    expect(() => validateOpeningHours([entry])).toThrow(BadRequestException);
  });

  it('rejects duplicate weekdays', () => {
    const hours: DailyOpeningHoursDto[] = [
      { dayOfWeek: 2, opensAt: '08:00', closesAt: '12:00' },
      { dayOfWeek: 2, opensAt: '13:00', closesAt: '17:00' },
    ];

    expect(() => validateOpeningHours(hours)).toThrow(BadRequestException);
  });

  it('rejects day numbers outside the Monday-to-Sunday range', () => {
    const hours: DailyOpeningHoursDto[] = [
      { dayOfWeek: 0, opensAt: '08:00', closesAt: '12:00' },
    ];

    expect(() => validateOpeningHours(hours)).toThrow(BadRequestException);
  });
});

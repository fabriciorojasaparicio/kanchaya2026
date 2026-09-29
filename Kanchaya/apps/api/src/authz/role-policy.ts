import { Permission } from "./permissions";
import { Role } from "./roles";

export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  [Role.PLAYER]: [
    Permission.AUTH_REGISTER,
    Permission.AUTH_LOGIN,

    Permission.PROFILE_READ_SELF,
    Permission.PROFILE_UPDATE_SELF,

    Permission.COURT_READ,

    Permission.RESERVATION_CREATE,
    Permission.RESERVATION_MANAGE,

    Permission.REVIEW_CREATE,
  ],

  [Role.VENUE_MANAGER]: [
    Permission.AUTH_LOGIN,

    Permission.PROFILE_READ_SELF,
    Permission.PROFILE_UPDATE_SELF,

    Permission.COURT_READ,
    Permission.COURT_CREATE,
    Permission.COURT_UPDATE,

    Permission.SCHEDULE_MANAGE,
    Permission.PRICE_MANAGE,

    Permission.RESERVATION_CREATE,
    Permission.RESERVATION_MANAGE,
  ],

  [Role.TOURNAMENT_ORGANIZER]: [
    Permission.AUTH_LOGIN,

    Permission.PROFILE_READ_SELF,
    Permission.PROFILE_UPDATE_SELF,

    Permission.COURT_READ,

    Permission.TOURNAMENT_CREATE,
    Permission.TEAM_MANAGE,
    Permission.REGISTRATION_MANAGE,
    Permission.RESULT_RECORD,
  ],

  [Role.PLATFORM_ADMIN]: [
    Permission.AUTH_LOGIN,

    Permission.PROFILE_READ_SELF,
    Permission.PROFILE_UPDATE_SELF,

    Permission.COURT_READ,
    Permission.COURT_CREATE,
    Permission.COURT_UPDATE,

    Permission.SCHEDULE_MANAGE,
    Permission.PRICE_MANAGE,

    Permission.RESERVATION_CREATE,
    Permission.RESERVATION_MANAGE,

    Permission.TOURNAMENT_CREATE,
    Permission.TEAM_MANAGE,
    Permission.REGISTRATION_MANAGE,
    Permission.RESULT_RECORD,

    Permission.REVIEW_CREATE,

    Permission.USER_MANAGE,
    Permission.ROLE_MANAGE,
    Permission.AUDIT_READ,
  ],
} as const;

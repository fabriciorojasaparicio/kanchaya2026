export enum Permission {
  AUTH_REGISTER = "auth:register",
  AUTH_LOGIN = "auth:login",

  PROFILE_READ_SELF = "profile:read:self",
  PROFILE_UPDATE_SELF = "profile:update:self",

  COURT_READ = "court:read",
  COURT_CREATE = "court:create",
  COURT_UPDATE = "court:update",

  SCHEDULE_MANAGE = "schedule:manage",
  PRICE_MANAGE = "price:manage",

  RESERVATION_CREATE = "reservation:create",
  RESERVATION_MANAGE = "reservation:manage",

  TOURNAMENT_CREATE = "tournament:create",
  TEAM_MANAGE = "team:manage",
  REGISTRATION_MANAGE = "registration:manage",
  RESULT_RECORD = "result:record",

  REVIEW_CREATE = "review:create",

  USER_MANAGE = "user:manage",
  ROLE_MANAGE = "role:manage",
  AUDIT_READ = "audit:read",
}

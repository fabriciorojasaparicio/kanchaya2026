import { AuthorizationScope } from "./scopes";
import { Permission } from "./permissions";
import { ROLE_PERMISSIONS } from "./role-policy";
import { Role } from "./roles";
import { UserStatus } from "./user-status";
import { canInitiateActions } from "./user-status-policy";
import type {
  AuthorizationContext,
  ResourceOwnership,
} from "./authorization.types";

export function hasPermission(
  role: Role,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessScope(
  context: AuthorizationContext,
  ownership: ResourceOwnership,
): boolean {
  switch (context.scope) {
    case AuthorizationScope.ANY:
      return true;

    case AuthorizationScope.SELF:
      return ownership.ownerUserId === context.userId;

    case AuthorizationScope.OWN_VENUE:
      return ownership.venueOwnerUserId === context.userId;

    case AuthorizationScope.OWN_TOURNAMENT:
      return ownership.tournamentOwnerUserId === context.userId;

    default:
      return false;
  }
}

export function authorize(
  context: AuthorizationContext,
  ownership: ResourceOwnership = {},
): boolean {
  if (!canInitiateActions(context.status)) {
    return false;
  }

  if (!hasPermission(context.role, context.permission)) {
    return false;
  }

  return canAccessScope(context, ownership);
}
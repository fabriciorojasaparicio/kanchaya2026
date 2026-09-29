import { AuthorizationScope } from "./scopes";
import { Permission } from "./permissions";
import { Role } from "./roles";
import { UserStatus } from "./user-status";

export interface AuthorizationContext {
  userId: string;
  role: Role;
  status: UserStatus;
  permission: Permission;
  scope: AuthorizationScope;
}

export interface ResourceOwnership {
  ownerUserId?: string;
  venueOwnerUserId?: string;
  tournamentOwnerUserId?: string;
}
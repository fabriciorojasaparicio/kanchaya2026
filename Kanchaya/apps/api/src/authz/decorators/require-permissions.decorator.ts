import { SetMetadata } from "@nestjs/common";
import { AuthorizationScope } from "../scopes";
import { Permission } from "../permissions";

export const AUTHORIZATION_KEY = "authorization";

export interface RequiredPermission {
  permission: Permission;
  scope: AuthorizationScope;
}

export const RequirePermissions = (
  ...permissions: RequiredPermission[]
) => SetMetadata(AUTHORIZATION_KEY, permissions);

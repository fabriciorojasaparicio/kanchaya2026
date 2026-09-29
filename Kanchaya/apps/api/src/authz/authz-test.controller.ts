import { Controller, Get, UseGuards } from "@nestjs/common";
import { RequirePermissions } from "./decorators/require-permissions.decorator";
import { AuthorizationScope } from "./scopes";
import { Permission } from "./permissions";
import { PermissionsGuard } from "./guards/permissions.guard";

@Controller("authz-test")
@UseGuards(PermissionsGuard)
export class AuthzTestController {
  @Get("reservation")
  @RequirePermissions({
    permission: Permission.RESERVATION_CREATE,
    scope: AuthorizationScope.ANY,
  })
  createReservationTest() {
    return {
      ok: true,
      message: "Reservation permission granted",
    };
  }

  @Get("profile")
  @RequirePermissions({
    permission: Permission.PROFILE_READ_SELF,
    scope: AuthorizationScope.SELF,
  })
  readProfileTest() {
    return {
      ok: true,
      message: "Profile permission granted",
    };
  }

  @Get("admin")
  @RequirePermissions({
    permission: Permission.USER_MANAGE,
    scope: AuthorizationScope.ANY,
  })
  adminTest() {
    return {
      ok: true,
      message: "Admin permission granted",
    };
  }
}
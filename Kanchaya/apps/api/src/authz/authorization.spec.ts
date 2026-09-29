import { authorize, canAccessScope, hasPermission } from "./authorization";
import { Permission } from "./permissions";
import { AuthorizationScope } from "./scopes";
import { Role } from "./roles";
import { UserStatus } from "./user-status";
import type { AuthorizationContext } from "./authorization.types";

describe("authorization", () => {
  it("allows PLAYER to create reservations", () => {
    expect(
      hasPermission(Role.PLAYER, Permission.RESERVATION_CREATE),
    ).toBe(true);
  });

  it("does not allow PLAYER to manage users", () => {
    expect(
      hasPermission(Role.PLAYER, Permission.USER_MANAGE),
    ).toBe(false);
  });

  it("allows a user to access their own resource", () => {
    expect(
      canAccessScope(
        {
          userId: "user-1",
          role: Role.PLAYER,
          status: UserStatus.ACTIVE,
          permission: Permission.RESERVATION_MANAGE,
          scope: AuthorizationScope.SELF,
        },
        {
          ownerUserId: "user-1",
        },
      ),
    ).toBe(true);
  });

  it("denies access to another user's resource", () => {
    expect(
      canAccessScope(
        {
          userId: "user-1",
          role: Role.PLAYER,
          status: UserStatus.ACTIVE,
          permission: Permission.RESERVATION_MANAGE,
          scope: AuthorizationScope.SELF,
        },
        {
          ownerUserId: "user-2",
        },
      ),
    ).toBe(false);
  });

  it("allows a venue manager to access their own venue", () => {
    expect(
      authorize(
        {
          userId: "manager-1",
          role: Role.VENUE_MANAGER,
          status: UserStatus.ACTIVE,
          permission: Permission.RESERVATION_MANAGE,
          scope: AuthorizationScope.OWN_VENUE,
        },
        {
          venueOwnerUserId: "manager-1",
        },
      ),
    ).toBe(true);
  });

  it("denies a venue manager access to another venue", () => {
    expect(
      authorize(
        {
          userId: "manager-1",
          role: Role.VENUE_MANAGER,
          status: UserStatus.ACTIVE,
          permission: Permission.RESERVATION_MANAGE,
          scope: AuthorizationScope.OWN_VENUE,
        },
        {
          venueOwnerUserId: "manager-2",
        },
      ),
    ).toBe(false);
  });

  it("allows an organizer to access their own tournament", () => {
    expect(
      authorize(
        {
          userId: "organizer-1",
          role: Role.TOURNAMENT_ORGANIZER,
          status: UserStatus.ACTIVE,
          permission: Permission.RESULT_RECORD,
          scope: AuthorizationScope.OWN_TOURNAMENT,
        },
        {
          tournamentOwnerUserId: "organizer-1",
        },
      ),
    ).toBe(true);
  });

  it("denies an organizer access to another tournament", () => {
    expect(
      authorize(
        {
          userId: "organizer-1",
          role: Role.TOURNAMENT_ORGANIZER,
          status: UserStatus.ACTIVE,
          permission: Permission.RESULT_RECORD,
          scope: AuthorizationScope.OWN_TOURNAMENT,
        },
        {
          tournamentOwnerUserId: "organizer-2",
        },
      ),
    ).toBe(false);
  });

  it("allows PLATFORM_ADMIN to access any resource", () => {
    expect(
      authorize(
        {
          userId: "admin-1",
          role: Role.PLATFORM_ADMIN,
          status: UserStatus.ACTIVE,
          permission: Permission.USER_MANAGE,
          scope: AuthorizationScope.ANY,
        },
        {
          ownerUserId: "another-user",
        },
      ),
    ).toBe(true);
  });

  it("denies a role that does not have the requested permission", () => {
    expect(
      authorize(
        {
          userId: "player-1",
          role: Role.PLAYER,
          status: UserStatus.ACTIVE,
          permission: Permission.USER_MANAGE,
          scope: AuthorizationScope.ANY,
        },
      ),
    ).toBe(false);
  });

  it("denies suspended users", () => {
    const context: AuthorizationContext = {
      userId: "user-1",
      role: Role.PLAYER,
      status: UserStatus.SUSPENDED,
      permission: Permission.RESERVATION_CREATE,
      scope: AuthorizationScope.ANY,
    };

    expect(authorize(context)).toBe(false);
  });
});

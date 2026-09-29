import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "./permissions.guard";
import { Permission } from "../permissions";
import { Role } from "../roles";
import { AuthorizationScope } from "../scopes";
import { UserStatus } from "../user-status";

describe("PermissionsGuard", () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  function createContext(
    user?: { id?: string; role?: Role; status?: UserStatus },
    resource?: {
      ownerUserId?: string;
      venueOwnerUserId?: string;
      tournamentOwnerUserId?: string;
    },
    permission: Permission = Permission.PROFILE_READ_SELF,
    scope: AuthorizationScope = AuthorizationScope.SELF,
  ): ExecutionContext {
    const handler = () => undefined;
    const controller = class TestController {};

    Reflect.defineMetadata(
      "authorization",
      [
        {
          permission,
          scope,
        },
      ],
      handler,
    );

    return {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          resource,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it("allows authenticated user with required permission", () => {
    const context = createContext({
      id: "user-1",
      role: Role.PLAYER,
      status: UserStatus.ACTIVE,
    }, undefined, Permission.PROFILE_READ_SELF, AuthorizationScope.ANY);

    expect(guard.canActivate(context)).toBe(true);
  });

  it("rejects unauthenticated user", () => {
    const context = createContext();

    expect(() => guard.canActivate(context)).toThrow(
      UnauthorizedException,
    );
  });

  it("rejects user without required permission", () => {
    const context = createContext({
      id: "admin-1",
      role: Role.VENUE_MANAGER,
      status: UserStatus.ACTIVE,
    }, undefined, Permission.USER_MANAGE, AuthorizationScope.ANY);

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it("allows SELF access to own resource", () => {
    const context = createContext(
      {
        id: "user-1",
        role: Role.PLAYER,
        status: UserStatus.ACTIVE,
      },
      {
        ownerUserId: "user-1",
      },
    );

    expect(guard.canActivate(context)).toBe(true);
  });

  it("rejects SELF access to another user's resource", () => {
    const context = createContext(
      {
        id: "user-1",
        role: Role.PLAYER,
        status: UserStatus.ACTIVE,
      },
      {
        ownerUserId: "user-2",
      },
    );

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });

  it("rejects suspended user", () => {
    const context = createContext({
      id: "user-1",
      role: Role.PLAYER,
      status: UserStatus.SUSPENDED,
    });

    expect(() => guard.canActivate(context)).toThrow(
      ForbiddenException,
    );
  });
});
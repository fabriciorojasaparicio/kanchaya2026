import { RoleRequestService } from "./role-request.service";
import { Role } from "./roles";
import { AuditService } from "../audit/audit.service";
import { RoleRequestStatus } from "./role-request";

describe("RoleRequestService", () => {
  let service: RoleRequestService;
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
    service = new RoleRequestService(auditService);
  });

  it("allows a user to request an elevated role", () => {
    const request = service.requestRole(
      "user-1",
      Role.VENUE_MANAGER,
    );

    expect(request.status).toBe(
      RoleRequestStatus.PENDING,
    );

    expect(request.requesterUserId).toBe("user-1");
    expect(request.requestedRole).toBe(
      Role.VENUE_MANAGER,
    );
  });

  it("rejects requests for PLAYER", () => {
    expect(() =>
      service.requestRole("user-1", Role.PLAYER),
    ).toThrow();
  });

  it("allows PLATFORM_ADMIN to approve", () => {
    const request = service.requestRole(
      "user-1",
      Role.TOURNAMENT_ORGANIZER,
    );

    const approved = service.approveRole(
      request.id,
      "admin-1",
      Role.PLATFORM_ADMIN,
    );

    expect(approved.status).toBe(
      RoleRequestStatus.APPROVED,
    );

    expect(approved.resolvedByUserId).toBe("admin-1");

    expect(auditService.getAll()).toHaveLength(1);
    expect(auditService.getAll()[0].type).toBe(
      "ROLE_ASSIGNED",
    );
  });

  it("rejects approval by non-admin", () => {
    const request = service.requestRole(
      "user-1",
      Role.VENUE_MANAGER,
    );

    expect(() =>
      service.approveRole(
        request.id,
        "user-2",
        Role.PLAYER,
      ),
    ).toThrow();
  });

  it("rejects duplicate pending requests", () => {
    service.requestRole(
      "user-1",
      Role.VENUE_MANAGER,
    );

    expect(() =>
      service.requestRole(
        "user-1",
        Role.VENUE_MANAGER,
      ),
    ).toThrow();
  });
});
import { AuditService } from "./audit.service";
import { AuditEventType } from "./audit-events";
import { Role } from "../authz/roles";

describe("AuditService", () => {
  let service: AuditService;

  beforeEach(() => {
    service = new AuditService();
  });

  it("records a role change", () => {
    const event = service.record({
      type: AuditEventType.ROLE_CHANGED,
      actorUserId: "admin-1",
      targetUserId: "user-1",
      previousRole: Role.PLAYER,
      newRole: Role.VENUE_MANAGER,
    });

    expect(event.eventId).toBeDefined();
    expect(event.timestamp).toBeInstanceOf(Date);

    expect(event.type).toBe(
      AuditEventType.ROLE_CHANGED,
    );

    expect(event.previousRole).toBe(Role.PLAYER);
    expect(event.newRole).toBe(Role.VENUE_MANAGER);
  });

  it("records user suspension", () => {
    const event = service.record({
      type: AuditEventType.USER_SUSPENDED,
      actorUserId: "admin-1",
      targetUserId: "user-1",
    });

    expect(event.type).toBe(
      AuditEventType.USER_SUSPENDED,
    );

    expect(event.actorUserId).toBe("admin-1");
    expect(event.targetUserId).toBe("user-1");
  });

  it("keeps recorded events", () => {
    service.record({
      type: AuditEventType.USER_SUSPENDED,
      actorUserId: "admin-1",
      targetUserId: "user-1",
    });

    service.record({
      type: AuditEventType.USER_REACTIVATED,
      actorUserId: "admin-1",
      targetUserId: "user-1",
    });

    expect(service.getAll()).toHaveLength(2);
  });
});
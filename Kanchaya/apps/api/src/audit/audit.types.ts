import { AuditEventType } from "./audit-events";
import { Permission } from "../authz/permissions";
import { Role } from "../authz/roles";

export interface AuditEvent {
  eventId: string;
  type: AuditEventType;

  actorUserId: string;
  targetUserId: string;

  previousRole?: Role;
  newRole?: Role;

  permission?: Permission;

  timestamp: Date;

  metadata?: Record<string, unknown>;
}
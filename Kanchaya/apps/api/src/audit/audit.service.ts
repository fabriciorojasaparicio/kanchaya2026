import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AuditEvent } from "./audit.types";

@Injectable()
export class AuditService {
  private readonly events: AuditEvent[] = [];

  record(event: Omit<AuditEvent, "eventId" | "timestamp">): AuditEvent {
    const auditEvent: AuditEvent = {
      ...event,
      eventId: randomUUID(),
      timestamp: new Date(),
    };

    this.events.push(auditEvent);

    return auditEvent;
  }

  getAll(): readonly AuditEvent[] {
    return this.events;
  }
}
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Role } from "./roles";
import {
  RoleRequest,
  RoleRequestStatus,
} from "./role-request";
import { AuditService } from "../audit/audit.service";
import { AuditEventType } from "../audit/audit-events";

@Injectable()
export class RoleRequestService {
  private readonly requests: RoleRequest[] = [];

  constructor(
    private readonly auditService: AuditService,
  ) {}

  requestRole(
    requesterUserId: string,
    requestedRole: Role,
  ): RoleRequest {
    if (
      requestedRole !== Role.VENUE_MANAGER &&
      requestedRole !== Role.TOURNAMENT_ORGANIZER
    ) {
      throw new BadRequestException(
        "Only elevated roles can be requested",
      );
    }

    const existingPending = this.requests.find(
      (request) =>
        request.requesterUserId === requesterUserId &&
        request.requestedRole === requestedRole &&
        request.status === RoleRequestStatus.PENDING,
    );

    if (existingPending) {
      throw new BadRequestException(
        "A pending request already exists",
      );
    }

    const request: RoleRequest = {
      id: randomUUID(),
      requesterUserId,
      requestedRole,
      status: RoleRequestStatus.PENDING,
      createdAt: new Date(),
    };

    this.requests.push(request);

    return request;
  }

  approveRole(
    requestId: string,
    adminUserId: string,
    currentRole: Role,
  ): RoleRequest {
    if (currentRole !== Role.PLATFORM_ADMIN) {
      throw new ForbiddenException(
        "Only platform admins can approve roles",
      );
    }

    const request = this.requests.find(
      (item) => item.id === requestId,
    );

    if (!request) {
      throw new NotFoundException("Role request not found");
    }

    if (request.status !== RoleRequestStatus.PENDING) {
      throw new BadRequestException(
        "Role request is already resolved",
      );
    }

    request.status = RoleRequestStatus.APPROVED;
    request.resolvedAt = new Date();
    request.resolvedByUserId = adminUserId;

    this.auditService.record({
      type: AuditEventType.ROLE_ASSIGNED,
      actorUserId: adminUserId,
      targetUserId: request.requesterUserId,
      newRole: request.requestedRole,
    });

    return request;
  }

  rejectRole(
    requestId: string,
    adminUserId: string,
    currentRole: Role,
  ): RoleRequest {
    if (currentRole !== Role.PLATFORM_ADMIN) {
      throw new ForbiddenException(
        "Only platform admins can reject roles",
      );
    }

    const request = this.requests.find(
      (item) => item.id === requestId,
    );

    if (!request) {
      throw new NotFoundException("Role request not found");
    }

    if (request.status !== RoleRequestStatus.PENDING) {
      throw new BadRequestException(
        "Role request is already resolved",
      );
    }

    request.status = RoleRequestStatus.REJECTED;
    request.resolvedAt = new Date();
    request.resolvedByUserId = adminUserId;

    return request;
  }
}
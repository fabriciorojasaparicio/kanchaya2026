import { Role } from "./roles";

export enum RoleRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface RoleRequest {
  id: string;
  requesterUserId: string;
  requestedRole: Role;
  status: RoleRequestStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedByUserId?: string;
}
import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { RoleRequestService } from "./role-request.service";

@Module({
  imports: [AuditModule],
  providers: [RoleRequestService],
  exports: [RoleRequestService],
})
export class AuthzModule {}
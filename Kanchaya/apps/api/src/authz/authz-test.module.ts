import { Module } from "@nestjs/common";
import { AuthzTestController } from "./authz-test.controller";
import { PermissionsGuard } from "./guards/permissions.guard";

@Module({
  controllers: [AuthzTestController],
  providers: [PermissionsGuard],
})
export class AuthzTestModule {}
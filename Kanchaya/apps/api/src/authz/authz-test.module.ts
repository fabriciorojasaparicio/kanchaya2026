import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthzTestController } from "./authz-test.controller";
import { PermissionsGuard } from "./guards/permissions.guard";

@Module({
  imports: [AuthModule],
  controllers: [AuthzTestController],
  providers: [PermissionsGuard],
})
export class AuthzTestModule {}

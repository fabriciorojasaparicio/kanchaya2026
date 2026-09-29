import { UserStatus } from "./user-status";

export function canInitiateActions(status: UserStatus): boolean {
  return status === UserStatus.ACTIVE;
}
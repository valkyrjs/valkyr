import type { RoleData, RolesProvider } from "../../../mod.ts";
import type { Permissions } from "../permissions.ts";
import type { Session } from "../session.ts";

const roles = new Map<string, RoleData<Permissions>>();
const assigned = new Map<string, RoleData<Permissions>[]>();

export const mockRolesProvider = new (class MockRolesProvider implements RolesProvider<Permissions, Session> {
  async add(role: RoleData<Permissions>) {
    roles.set(role.id, {
      id: role.id,
      name: role.name,
      permissions: role.permissions,
    });
  }

  async getById(roleId: string) {
    return roles.get(roleId);
  }

  async getBySession({ accountId }: Session) {
    return assigned.get(accountId) ?? [];
  }

  async setPermissions() {}

  async delete(roleId: string) {
    roles.delete(roleId);
  }

  async assign(roleId: string, accountId: string): Promise<void> {
    const roleData = await this.getById(roleId);
    if (roleData !== undefined) {
      const target = assigned.get(accountId);
      if (target !== undefined) {
        assigned.set(accountId, [...target, roleData]);
      } else {
        assigned.set(accountId, [roleData]);
      }
    }
  }
})();

await mockRolesProvider.add({
  id: "admin",
  name: "Admin",
  permissions: {
    account: ["create", "read", "update", "delete"],
  },
});

await mockRolesProvider.add({
  id: "moderator",
  name: "Moderator",
  permissions: {
    account: ["read", "update", "delete"],
  },
});

await mockRolesProvider.add({
  id: "user",
  name: "User",
  permissions: {
    account: ["read", "update"],
  },
});

await mockRolesProvider.assign("admin", "account-a");
await mockRolesProvider.assign("moderator", "account-b");
await mockRolesProvider.assign("user", "account-b");

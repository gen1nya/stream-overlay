import { addVip, removeVip, addModerator, removeModerator, getUserRoles, UserRoles } from '../authorizedHelixApi';

interface StoredUser {
  username: string;
  roles: UserRoles;
  timer: NodeJS.Timeout;
}

export default class RoleRestoreManager {
  private muted: Map<string, StoredUser> = new Map();

  async prepareMute(userId: string, username: string, duration: number): Promise<boolean> {
    try {
      const roles = await getUserRoles(userId);
      const timer = setTimeout(() => {
        this.restoreRoles(userId).catch(err => console.error('Failed to restore roles', err));
      }, duration);
      this.muted.set(userId, { username, roles, timer });
      return true;
    } catch (e) {
      console.error('Failed to prepare mute:', (e as any).message);
      return false;
    }
  }

  async restoreRoles(userId: string): Promise<void> {
    const data = this.muted.get(userId);
    if (!data) return;
    this.muted.delete(userId);
    const { roles } = data;
    try {
      if (roles.isModerator) await addModerator(userId);
      if (roles.isVip) await addVip(userId);
    } catch (e) {
      console.error('Failed to restore roles for', userId, (e as any).message);
    }
  }
}

import { addVip, removeVip, addModerator, removeModerator, UserRoles } from '../twitch/authorizedHelixApi';
import {ChatRoles} from "../twitch/messageParser";
import {LogService} from "../logService";

interface StoredUser {
  username: string;
  roles: UserRoles;
  timer: NodeJS.Timeout;
}

export default class RoleRestoreManager {
  private muted: Map<string, StoredUser> = new Map();
  private logService: LogService;

  constructor(logService: LogService) {
    this.logService = logService;
  }


  async prepareMute(
      userId: string,
      username: string,
      duration: number,
      chatRoles: ChatRoles
  ): Promise<boolean> {
    try {
      const roles = await this.getUserRoles(userId, chatRoles);
      const timer = setTimeout(() => {
        this.restoreRoles(userId).catch(err => console.error('Failed to restore roles', err));
      }, duration + 1000); // +1 second to ensure roles are restored after mute
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
      //if (roles.isVip) await addVip(userId); // this role will be restored automatically by Twitch
      this.logService.log({
          timestamp: new Date().toISOString(),
          message: `Роли пользователя восстановлены (mod: ${roles.isModerator}, vip: ${roles.isVip})`,
          userId,
          userName: data.username
      });
    } catch (e) {
      this.logService.log({
        timestamp: new Date().toISOString(),
        message: `Ошибка при восстановлении ролей пользователя. Было: mod: ${roles.isModerator}, vip: ${roles.isVip}`,
        userId,
        userName: data.username
      });
      console.error('Failed to restore roles for', userId, (e as any).message);
    }
  }

  async getUserRoles(
      user_id: string,
      chatRoles: ChatRoles
  ): Promise<UserRoles> {
    return {
      isVip: chatRoles.isVip,
      isModerator: chatRoles.isModerator,
    }
  }
}

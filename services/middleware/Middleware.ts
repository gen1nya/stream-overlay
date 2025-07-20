import {BotConfig} from "./MiddlewareProcessor";
import {AppEvent} from "../messageParser";

export default class Middleware {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async processMessage(message: AppEvent): Promise<{ message: any; actions: any[]; accepted: boolean }> {
    throw new Error('processMessage not implemented');
  }

  updateConfig(config: BotConfig): void {
    throw new Error('updateConfig not implemented');
  }
}

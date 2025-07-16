import {BotConfig} from "./MiddlewareProcessor";

export default class Middleware {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  processMessage(message: any): { message: any; actions: any[]; accepted: boolean } {
    throw new Error('processMessage not implemented');
  }
  updateConfig(config: BotConfig): void {
    throw new Error('updateConfig not implemented');
  }
}

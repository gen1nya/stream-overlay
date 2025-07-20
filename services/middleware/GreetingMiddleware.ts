import { ActionTypes } from './ActionTypes';
import Middleware from './Middleware';
import {applyRandomInt, BotConfig} from './MiddlewareProcessor';
import {AppEvent} from "../messageParser";

interface CompiledCommand {
  enabled: boolean;
  name: string;
  triggerType: "exact" | "start" | "contains";
  triggers: ((msg: string) => boolean)[];
  responses: string[];
}

export default class GreetingMiddleware extends Middleware {
  private commands: CompiledCommand[] = [];
  private enabled = true;

  async processMessage(message: AppEvent) {
    if (!this.enabled) {
      console.log('⏩ GreetingMiddleware is disabled, skipping message processing');
      return { message, actions: [], accepted: false };
    }
    if (message.type !== 'chat') {
      console.warn('❌ GreetingMiddleware only processes chat messages, skipping:', message.type);
      return { message, actions: [], accepted: false };
    }
    const text = message.htmlMessage?.trim();
    if (!text) {
      return { message, actions: [], accepted: false };
    }

    const actions: any = [];

    for (const command of this.commands) {
      console.log('🔍 Checking command:', command.name, 'for text:', text);
      if (!command.enabled) {
        console.warn(`⚠️ Command "${command.name}" is disabled, skipping`);
        continue;
      } else {
        console.log(`✅ Command "${command.name}" is enabled`);
      }

      const matched = command.triggers.some(test => test(text));
      if (matched) {
        console.log('✅ Command matched:', command.name);
        const response = this.pickRandom(
            command.responses,
            message.userName || 'user',
            message.htmlMessage || ''
        );
        actions.push(
          {
            type: ActionTypes.SEND_MESSAGE,
            payload: { message: response, forwardToUi: true }
          }
        );
      } else {
        console.log('❌ Command did not match:', command.name);
      }
    }

    return { accepted: actions.length > 0, message: { ...message }, actions };
  }

  updateConfig(config: BotConfig): void {
    const pingpong = config.pingpong;
    console.log('✅ GreetingMiddleware config updated:', pingpong);

    this.enabled = pingpong.enabled;
    if (!this.enabled) {
      this.commands = [];
      return;
    }

    const rawCommands = pingpong.commands ?? [];
    this.commands = rawCommands.map(cmd => ({
      enabled: cmd.enabled,
      name: cmd.name,
      triggerType: cmd.triggerType,
      responses: cmd.responses,
      triggers: cmd.triggers.map(tr => this.buildTrigger(tr, cmd.triggerType))
    }));
  }

  private buildTrigger(
      trigger: { type: string; value: string; flags?: string },
      type: "exact" | "start" | "contains"
  ): (msg: string) => boolean {
    if (trigger.type === "regex") {
      const regex = new RegExp(trigger.value, trigger.flags);

      if (type === "exact") {
        return (msg: string) => regex.test(msg.trim());
      }

      if (type === "start") {
        return (msg: string) => {
          const firstWord = msg.trim().split(/\s+/)[0];
          return regex.test(firstWord);
        };
      }

      if (type === "contains") {
        return (msg: string) => {
          const words = msg.trim().split(/\s+/);
          return words.some(word => regex.test(word));
        };
      }
    }

    if (trigger.type === "text") {
      return (msg: string) => {
        const target = msg.trim();
        if (type === "exact") return target === trigger.value;
        if (type === "start") return target.startsWith(trigger.value);
        return target.includes(trigger.value);
      };
    }

    return () => false;
  }

  private pickRandom(
      arr: string[],
      username: string,
      lastMessage: string = ''
  ): string {
    const template = arr[Math.floor(Math.random() * arr.length)];
    const cleanedMessage = lastMessage.replace(/[\r\n]+/g, ' ').trim();
    const words = cleanedMessage.split(/\s+/).slice(0, 10).join(' ');
    let shortMessage = words.length > 100 ? words.slice(0, 100).trim() : words;

    if (shortMessage.length < cleanedMessage.length) {
      shortMessage += '...';
    }

    let result = template.replace(/\$\{user\}/g, username)
        .replace(/\$\{last_message\}/g, shortMessage)

    return applyRandomInt(result);
  }
}

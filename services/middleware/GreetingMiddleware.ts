import { ActionTypes } from './ActionTypes';
import Middleware from './Middleware';

export default class GreetingMiddleware extends Middleware {
  private greetingsPattert: RegExp[];
  constructor() {
    super();
    this.greetingsPattert = [
      /^((здравствуй|здравствуйте|здорово|здарова|даров|дарова)[\p{P}\s]*|^здр[\p{P}\s]*)/iu,
      /^(прив(ет|етик|етикос|етищ|етос)?)[\p{P}\s]*$/iu,
      /^хай(ка|ушки|чик)?[\p{P}\s]*/iu,
      /^добрый\s+(день|вечер|утро)/iu,
      /^доброго\s+(времени|дня|вечера|утра)/iu,
      /^hello\b/i,
      /^hi\b/i,
      /^hey\b/i,
    ];
  }

  processMessage(message: any) {
    if (this.isGreeting(message.htmlMessage)) {
      return {
        message,
        actions: [
          { type: ActionTypes.SEND_MESSAGE, payload: { message: 'Привет... чем могу помочь?', forwardToUi: true } },
        ],
        accepted: true,
      };
    }
    return { message, actions: [], accepted: false };
  }

  private isGreeting(message: string): boolean {
    const firstWord = message.trim().split(/\s+/)[0];
    return this.greetingsPattert.some((regex) => regex.test(firstWord));
  }
}

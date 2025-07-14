import RouletteService from './RouletteService';
import GreetingMiddleware from './GreetingMiddleware';
import { ActionType } from './ActionTypes';

export class MiddlewareProcessor {
  private applyAction: (action: { type: ActionType; payload: any }) => Promise<void>;
  private middlewares = [new RouletteService(), new GreetingMiddleware()];

  constructor(applyAction: (action: { type: ActionType; payload: any }) => Promise<void>) {
    this.applyAction = applyAction;
  }

  async processMessage(message: any): Promise<any> {
    const actions: { type: ActionType; payload: any }[] = [];
    let currentMessage = message;
    for (const middleware of this.middlewares) {
      const result = middleware.processMessage(currentMessage);
      if (result.message !== undefined) currentMessage = result.message;
      if (result.actions?.length) actions.push(...result.actions);
      if (result.accepted) break;
    }
    for (const action of actions) {
      await this.applyAction(action);
    }
    return currentMessage;
  }

  onThemeUpdated(botConfig: any): void {
    console.log('Updating middlewares with new theme config', botConfig);
  }
}

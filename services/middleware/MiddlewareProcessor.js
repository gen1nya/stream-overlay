
// a controller to process middlewares

const RouletteService = require("./RouletteService");
const GreetingMiddleware = require("./GreetingMiddleware");

class MiddlewareProcessor {
  constructor(
      applyAction
  ) {
    this.applyAction = applyAction;
    this.middlewares = [
        new RouletteService(),
        new GreetingMiddleware()
    ];
  }

    // Process a message through all middlewares
    async processMessage(message) {
      const actions = [];
      let currentMessage = message;
        for (const middleware of this.middlewares) {
            const result = middleware.processMessage(currentMessage);

            if (result.message !== undefined) {
                currentMessage = result.message;
            }

            if (result.actions?.length) {
                actions.push(...result.actions);
            }

            if (result.accepted) {
                break;
            }
        }

        for (const action of actions) {
            await this.applyAction(action);
        }

        return currentMessage
    }

    onThemeUpdated(botConfig) {
        console.log("Updating middlewares with new theme config", botConfig);
    }

}

module.exports = {
    MiddlewareProcessor
}
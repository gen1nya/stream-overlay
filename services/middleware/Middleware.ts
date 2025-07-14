export default class Middleware {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  processMessage(message: any): { message: any; actions: any[]; accepted: boolean } {
    throw new Error('processMessage not implemented');
  }
}

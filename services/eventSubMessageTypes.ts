export const MESSAGE_TYPES = {
  NOTIFICATION: 'notification',
  SESSION_WELCOME: 'session_welcome',
  SESSION_KEEPALIVE: 'session_keepalive',
  SESSION_RECONNECT: 'session_reconnect',
  REVOCATION: 'revocation',
} as const;

export default MESSAGE_TYPES;

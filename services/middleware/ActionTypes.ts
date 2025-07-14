export const ActionTypes = {
  SEND_MESSAGE: 'SEND_MESSAGE',
  MUTE_USER: 'MUTE_USER',
} as const;

export type ActionType = (typeof ActionTypes)[keyof typeof ActionTypes];

export const ActionTypes = {
  // Existing actions
  SEND_MESSAGE: 'SEND_MESSAGE',
  MUTE_USER: 'MUTE_USER',

  // New trigger system actions
  DELETE_MESSAGE: 'DELETE_MESSAGE',
  ADD_VIP: 'ADD_VIP',
  REMOVE_VIP: 'REMOVE_VIP',
  ADD_MOD: 'ADD_MOD',
  REMOVE_MOD: 'REMOVE_MOD',
} as const;

export type ActionType = (typeof ActionTypes)[keyof typeof ActionTypes];

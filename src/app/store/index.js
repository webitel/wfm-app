import webSocketClientController from '@webitel/ui-sdk/src/api/websocket/WebSocketClientController.js';
import { createStore } from 'vuex';

import userinfo from '../../modules/userinfo/store/deprecated/userinfo';
import instance from '../api/instance';

export default createStore({
  state: {
    router: null,
    client: webSocketClientController,
  },
  getters: {
    CLIENT: (state) => state.client,
  },
  actions: {
    OPEN_SESSION: async (context) => {
      await context.dispatch(
        'userinfo/OPEN_SESSION',
        { instance },
        { root: true },
      );
    },
  },
  mutations: {
    SET_ROUTER: (state, router) => {
      state.router = router;
    },
  },
  modules: {
    userinfo,
  },
});

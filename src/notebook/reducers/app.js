import * as constants from '../constants';
import { handleActions } from 'redux-actions';

import {
  shutdownKernel,
} from '../api/kernel';

function cleanupKernel(state) {
  const kernel = {
    channels: state.channels,
    spawn: state.spawn,
    connectionFile: state.connectionFile,
  };
  shutdownKernel(kernel);

  return state.withMutations(ctx =>
    ctx.set('channels', null)
       .set('spawn', null)
       .set('connectionFile', null)
       .set('kernelSpecName', null)
       .set('executionState', 'not connected')
  );
}

function clearFuture(state) {
  return {
    ...state,
    future: state.future.clear(),
  };
}

export default handleActions({
  [constants.NEW_KERNEL]: function newKernel(state, action) {
    return cleanupKernel(state)
      .withMutations(ctx =>
        ctx.set('channels', action.channels)
           .set('connectionFile', action.connectionFile)
           .set('spawn', action.spawn)
           .set('kernelSpecName', action.kernelSpecName)
           .set('executionState', 'starting')
    );
  },
  [constants.EXIT]: function exit(state) {
    return cleanupKernel(state);
  },
  [constants.KILL_KERNEL]: cleanupKernel,
  [constants.INTERRUPT_KERNEL]: function interruptKernel(state) {
    if (process.platform === 'win32') {
      console.error('Windows support for kernel interrupt not avaiable yet.');
    } else {
      state.spawn.kill('SIGINT');
    }
    return state;
  },
  [constants.START_SAVING]: function startSaving(state) {
    return state.set('isSaving', true);
  },
  [constants.ERROR_KERNEL_NOT_CONNECTED]: function alertKernelNotConnected(state) {
    return state.set('error', 'Error: We\'re not connected to a runtime!');
  },
  [constants.SET_EXECUTION_STATE]: function setExecutionState(state, action) {
    return state.set('executionState', action.executionState);
  },
  [constants.DONE_SAVING]: function doneSaving(state) {
    return state.set('isSaving', false);
  },
  [constants.SET_NOTIFICATION_SYSTEM]: function setNotificationsSystem(state, action) {
    return state.set('notificationSystem', action.notificationSystem);
  },
  [constants.SET_FORWARD_CHECKPOINT]: function setForwardCheckpoint(state, action) {
    const { documentState } = action;
    return {
      ...state,
      future: state.future.push(documentState),
    };
  },
  [constants.SET_BACKWARD_CHECKPOINT]: function setBackwardCheckpoint(state, action) {
    const {documentState, clearFutureStack} = action;
    if (clearFutureStack) {
      return clearFuture({
        ...state,
        past: state.past.push(documentState),
      });
    } else {
      return {
        ...state,
        past: state.past.push(documentState),
      };
    }
  },
  [constants.CLEAR_FUTURE]: clearFuture,
  [constants.UNDO]: function undo(state) {
    if (state.past.size == 0) {
      return false;
    } else {
      const undone = state.past.last();
      return {
        ...state,
        undone,
        past: state.past.pop(),
      };
    }
  },
  [constants.REDO]: function redo(state) {
    if (state.future.size == 0) {
      return false;
    } else {
      const redone = state.future.last();
      return {
        ...state,
        redone,
        future: state.future.pop(),
      };
    }
  },
}, {});

import { AppState, AsyncStorage } from "react-native";
import { sync } from "react-native-code-push";

import { eventChannel, delay } from "redux-saga"
import { call, race, take } from "redux-saga/effects"

/**
 * Constructs a Saga channel that allows subscribers
 * to be notified whenever the app is resumed.
 *
 * @param Name of the action to dispatch on resume.
 */
function resumeChannel(syncActionName) {
  return eventChannel(listener => {
    const onAppStateChange = (newState) => {
      newState === "active" && listener(syncActionName);
    }

    AppState.addEventListener("change", onAppStateChange);

    return () => AppState.removeEventListener("change", onAppStateChange);
  });
}

/**
 * Delays calling sync until the app is ready for it. This allows
 * apps to "throttle" calling sync until after an initial onboarding time period,
 * so that end-users are interrupted too soon.
 *
 * @param delayByInterval Number of seconds to delay calling sync
 * @param delayByAction Name of a Redux action to wait for being dispatched before calling sync.
 */
function* delaySync(delayByInterval, delayByAction) {
  const codePushDelayKey = "CODE_PUSH_DELAY_KEY";
  const key = yield call(AsyncStorage.getItem, codePushDelayKey);

  if (!key) {
    yield call(AsyncStorage.setItem, codePushDelayKey, "VALUE");

    let delayEvents = {
      interval: call(delay, delayByInterval * 1000)
    };

    // If the consumer specified an action to cancel the delay
    // period, then add the take effect to the race conditions.
    if (delayByAction) {
      delayEvents.action = take(delayByAction);
    }

    yield race(delayEvents);
  }
}

/**
 * Redux Saga that handles synchronizing a React Native
 * app with the CodePush server at configurable events.
 *
 * @param options Options to configure when to call sync.
 */
export default function* codePushSaga(options = {}) {
  options = {
    syncActionName: "SYNC",
    syncOnResume: true,
    syncOnInterval: 0,
    syncOnStart: true,

    delayByInterval: 0,
    delayByAction: null,

    syncOptions: null,

    ...options
  };

  // Check whether we need to delay the first
  // call to sync, and if so, then perform the delay.
  if (options.delayByInterval > 0 || options.delayByAction) {
    yield call(delaySync, options.delayByInterval, options.delayByAction);
  }

  // If we're supposed to sync on app start,
  // then run an initial sync before kicking
  // off the "event loop".
  if (options.syncOnStart) {
    try {
      yield call(sync, options.syncOptions, options.codePushStatusDidChange, options.codePushDownloadDidProgress);
    } catch (e) {
      console.log(e);
    }
  }

  let syncEvents = {
    request: take(options.syncActionName)
  };

  // If the caller requested sync to be triggered
  // on app resume, then create the event channel
  // and add it to our race conditions.
  if (options.syncOnResume) {
    const chan = yield call(resumeChannel, options.syncActionName);
    syncEvents.resume = take(chan);
  }

  if (options.syncOnInterval > 0) {
    syncEvents.interval = call(delay, options.syncOnInterval * 1000);
  }

  // Kick off the "event loop" that will continue
  // to watch for any of the requested sync points.
  while (yield race(syncEvents)) {
    try {
      yield call(sync, options.syncOptions, options.codePushStatusDidChange, options.codePushDownloadDidProgress);
    } catch (e) {
      console.log(e);
    }
  }
}

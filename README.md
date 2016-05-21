# Redux Saga for CodePush

This module provides a "saga" for React Native apps that already use [Redux](http://reduxjs.org) and Redux Saga for modeling asynchronous behavior, and want to integrate code sychronization with the [CodePush
service](http://codepush.tools) via a simple, declarative solution.

## Getting Started

1. If you haven't already, install and setup the [React Native module for CodePush](http://github.com/Microsoft/react-native-code-push)

2. Install the CodePush Redux Saga via NPM

    ```shell
    npm i --save react-native-code-push-saga@latest
    ``` 

3. Within your app's main saga, import the saga module

    ```javascript
    import codePushSaga from "react-native-code-push-saga";
    ```

4. Spawn/fork an instance of the CodePush saga

    ```javascript
    yield spawn(codePushSaga);
    ```

And that's it! By default, your app will now synchronize with CodePush on start, resume, and any time you dispatch a `SYNC` action to your Redux store. If you want to customize the "sync points" (e.g. on a timer interval), delay syncing after the initial app store installation, or modify the options that are used when a sync occurs, you can pass additional parameters to the saga when spawning/forking. The following example illustrate some of the possibilities:

```javascript
// Disable syncing on resume, but synchronize
// with CodePush every 5 minutes.
yield spawn(codePushSaga, {
    syncOnResume: false,
    syncOnInterval: 5 * 60
});

// Don't disrupt the user with an update after
// initially installing the app, until either 10
// minutes have passed or when the "ONBOARDING_COMPLETE"
// action is dispatched.
yield spawn(codePushSaga, {
    delayByInterval: 10 * 60,
    delayByAction: "ONBOARDING_COMPLETE"
});

// Customize the install mode of updates
// to occur when the app next resumes.
yield spawn(codePushSaga, {
    syncOptions: {
        installMode: codePush.InstallMode.ON_NEXT_RESUME
    }
});

// Synchronize with CodePush anytime
// a Redux action named "NAVIGATE_HOME" is dispatched.
yield spawn(codePushSaga, {
   syncActionName: "NAVIGATE_HOME" 
});
```
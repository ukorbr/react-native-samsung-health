import { NativeModules, DeviceEventEmitter } from "react-native";

import {
  EXERCISE_TYPES as RNSH_EXERCISE_TYPES,
  PERMISSIONS as RNSH_PERMISSIONS,
} from "./constants";

const samsungHealth = NativeModules.RNSamsungHealth;

function formatDate(date) {
  const year = date.getFullYear();
  const month = `00${date.getMonth() + 1}`.slice(-2);
  const day = `00${date.getDate()}`.slice(-2);
  return [year, month, day].join("-");
}

function buildDailySteps(data) {
  const stepsByDate = data.reduce((acc, cur) => {
    const { count, start_time: startTime } = cur;
    const timestamp = formatDate(new Date(startTime));
    const { [timestamp]: currentCount = 0 } = acc;
    return Object.assign({}, acc, { [timestamp]: currentCount + count });
  }, {});

  // Transform to array of { date, steps } object
  return Object.keys(stepsByDate).map(date => ({
    date,
    steps: stepsByDate[date],
  }));
}

function buildDailyExercises(data) {
  return data.map(obj => {
    const {
      duration,
      exercise_type: exerciseTypeCode = 0,
      start_time: startTime,
    } = obj;

    return {
      exerciseTypeCode,
      date: formatDate(new Date(startTime)),
      duration: duration / 1000,
      exerciseTypeName: RNSH_EXERCISE_TYPES[exerciseTypeCode],
      startTime: new Date(startTime).toISOString(),
    };
  });
}

class RNSamsungHealth {
  EXERCISE_TYPES = RNSH_EXERCISE_TYPES;
  PERMISSIONS = RNSH_PERMISSIONS;

  authorize(permissions, callback) {
    samsungHealth.connect(
      permissions,
      message => callback(message, undefined),
      results => callback(undefined, results)
    );
  }

  stop() {
    samsungHealth.disconnect();
  }

  unsubscribeListeners() {
    DeviceEventEmitter.removeAllListeners();
  }

  getDailyStepCountSamples(options, callback) {
    const startDate =
      options.startDate != null
        ? Date.parse(options.startDate)
        : new Date().setHours(0, 0, 0, 0);
    const endDate =
      options.endDate != null
        ? Date.parse(options.endDate)
        : new Date().valueOf();

    samsungHealth.readStepCount(
      startDate,
      endDate,
      message => callback(message, false),
      results => {
        if (results.length <= 0) {
          callback(undefined, []);
          return;
        }

        const flattenResults = results
          .map(({ data }) => data)
          .reduce((acc, cur) => [...acc, ...cur], []);
        const stepCountSamples = buildDailySteps(flattenResults);

        callback(undefined, stepCountSamples);
      }
    );
  }

  getExerciseSamples(options, callback) {
    const startDate =
      options.startDate != null
        ? Date.parse(options.startDate)
        : new Date().setHours(0, 0, 0, 0);
    const endDate =
      options.endDate != null
        ? Date.parse(options.endDate)
        : new Date().valueOf();

    samsungHealth.readExercises(
      startDate,
      endDate,
      message => callback(message, undefined),
      results => {
        if (results.length <= 0) {
          callback(undefined, []);
          return;
        }

        const flattenResults = results
          .map(({ data }) => data)
          .reduce((acc, cur) => [...acc, ...cur], []);
        const exerciseSamples = buildDailyExercises(flattenResults);

        callback(undefined, exerciseSamples);
      }
    );
  }

  getWeightSamples(options, callback) {
    const startDate =
      options.startDate != null
        ? Date.parse(options.startDate)
        : new Date().setHours(0, 0, 0, 0);
    const endDate =
      options.endDate != null
        ? Date.parse(options.endDate)
        : new Date().valueOf();

    samsungHealth.readWeight(
      startDate,
      endDate,
      message => callback(message, undefined),
      results => callback(undefined, results)
    );
  }
}

export default new RNSamsungHealth();

/* vim :set ts=4 sw=4 sts=4 et : */

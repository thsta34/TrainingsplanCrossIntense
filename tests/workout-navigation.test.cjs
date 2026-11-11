const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const functionSource = source.match(/function navigateWorkoutEntry\(event\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(functionSource, 'navigateWorkoutEntry must exist');

const inputs = Array.from({ length: 4 }, (_, index) => ({
  index,
  blurred: false,
  closest(selector) { return selector === 'input[data-workout-entry]' ? this : null; },
  blur() { this.blurred = true; },
}));
const focused = [];
const context = {
  workoutKeyboardNavigationActive: false,
  workoutEntryInputs: () => inputs,
  isCurrentWorkoutTarget: () => true,
  focusWorkoutEntry: input => focused.push(input.index),
  window: { setTimeout: callback => callback() },
};
vm.createContext(context);
vm.runInContext(functionSource, context);

function event(target, key, shiftKey = false) {
  return {
    target,
    key,
    shiftKey,
    isComposing: false,
    prevented: false,
    preventDefault() { this.prevented = true; },
  };
}

let action = event(inputs[0], 'Tab');
context.navigateWorkoutEntry(action);
assert.equal(action.prevented, true);
assert.equal(focused.at(-1), 1, 'Tab moves forward');

action = event(inputs[2], 'Tab', true);
context.navigateWorkoutEntry(action);
assert.equal(action.prevented, true);
assert.equal(focused.at(-1), 1, 'Shift+Tab moves backward');

action = event(inputs[2], 'Enter');
context.navigateWorkoutEntry(action);
assert.equal(action.prevented, true);
assert.equal(focused.at(-1), 3, 'Enter continues from a manually selected field');

action = event(inputs[3], 'Enter');
context.navigateWorkoutEntry(action);
assert.equal(action.prevented, true);
assert.equal(inputs[3].blurred, true, 'Enter closes the final field');

action = event(inputs[3], 'Tab');
context.navigateWorkoutEntry(action);
assert.equal(action.prevented, false, 'Tab can leave the final field normally');

assert.match(source, /data-workout-entry data-reps/);
assert.match(source, /data-workout-entry data-band-extra/);
assert.match(source, /data-workout-entry data-kettlebell-weight/);
assert.match(source, /data-workout-entry data-bar/);
assert.match(source, /enterKeyHint = index === inputs\.length - 1 \? "done" : "next"/);

console.log('PASS: Tab, Shift+Tab and Enter navigate from the current workout field; the final field completes normally.');

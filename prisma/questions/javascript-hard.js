module.exports = {
  skill: 'JavaScript',
  difficulty: 'HARD',
  questions: [
    {
      prompt: `console.log('A'); setTimeout(() => console.log('B'), 0); Promise.resolve().then(() => console.log('C')); console.log('D'); — in what order do A, B, C, D print?`,
      options: ['A, B, C, D', 'A, D, C, B', 'A, D, B, C', 'C, A, D, B'],
      correct: 1,
    },
    {
      prompt: `What happens when you access a let variable declared later in the same scope, before its declaration line executes?`,
      options: ['It returns undefined', 'It throws a ReferenceError (the temporal dead zone)', 'It returns null', 'It returns the global value'],
      correct: 1,
    },
    {
      prompt: `What is ('b' + 'a' + +'a' + 'a').toLowerCase()?`,
      options: ['"ba aa"', '"banana"', '"baa"', '"baNAnA"'],
      correct: 1,
    },
    {
      prompt: `Calling g.next() on a generator returns an object of what shape?`,
      options: ['{ result, cancelled }', '{ value, done }', '{ output, finished }', '{ data, hasNext }'],
      correct: 1,
    },
    {
      prompt: `Which statement about WeakMap is true?`,
      options: ['Keys must be objects, and entries are garbage-collected when the key is no longer referenced', 'Keys can be any primitive value', 'WeakMap is iterable with for...of', 'WeakMap entries are never removed'],
      correct: 0,
    },
    {
      prompt: `How does Promise.allSettled behave when one of its input promises rejects?`,
      options: ['It rejects immediately with that error', 'It waits for every promise to settle, then resolves with an array of status objects', 'It ignores the rejected promise and resolves with the rest', 'It never settles'],
      correct: 1,
    },
    {
      prompt: `What does Object.is(NaN, NaN) return?`,
      options: ['false, same as NaN === NaN', 'true, unlike NaN === NaN', 'undefined', 'It throws a TypeError'],
      correct: 1,
    },
    {
      prompt: `What does Object.keys({ 10: 'a', 2: 'b', c: 'd' }) return?`,
      options: ['["10", "2", "c"]', '["2", "10", "c"]', '["10", "c", "2"]', '["c", "2", "10"]'],
      correct: 1,
    },
    {
      prompt: `Inside const obj = { name: 'x', say: () => this }, which "this" does the arrow method capture?`,
      options: ['obj', 'The lexical "this" of the scope where obj was defined', 'undefined always, in every mode', 'A new object created at call time'],
      correct: 1,
    },
    {
      prompt: 'For a tagged template like tag`Hello ${name}`, what is the first argument passed to tag?',
      options: ['The string "Hello"', 'An array of the static string parts of the template', 'The value of name', 'A concatenated template object'],
      correct: 1,
    },
    {
      prompt: `What does a "get" trap on a Proxy intercept?`,
      options: ['Deleting properties', 'Reading (accessing) properties', 'Creating the target object', 'Calling Object.keys on the proxy'],
      correct: 1,
    },
    {
      prompt: `When does the executor function passed to new Promise((resolve) => {...}) run?`,
      options: ['Synchronously, as part of the new Promise call', 'On the next macrotask tick', 'When .then is first called', 'After all synchronous code finishes'],
      correct: 0,
    },
    {
      prompt: `foo(); function foo() { console.log('hi'); } — what happens when this code runs at the top level of a module?`,
      options: ['ReferenceError, because foo is used before declaration', 'It logs "hi", because function declarations are hoisted with their body', 'TypeError, because foo is undefined', 'It logs "undefined"'],
      correct: 1,
    },
    {
      prompt: `What is the result of [] + {} in JavaScript?`,
      options: ['""', '"[object Object]"', '0', 'NaN'],
      correct: 1,
    },
    {
      prompt: `Which of these expressions evaluates to true for the value [] (an empty array)?`,
      options: ['[] === []', 'typeof [] === "array"', '[] instanceof Array', 'Object.getPrototypeOf([]) === null'],
      correct: 2,
    },
  ],
};

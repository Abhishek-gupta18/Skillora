module.exports = {
  skill: 'JavaScript',
  difficulty: 'MEDIUM',
  questions: [
    {
      prompt: `What does console.log(typeof null) print in standard JavaScript?`,
      options: ['"null"', '"object"', '"undefined"', 'It throws an error'],
      correct: 1,
    },
    {
      prompt: `What does [1, 2, 3].map(x => x * 2) return?`,
      options: ['[2, 4, 6]', '[1, 2, 3]', '[2, 4, 8]', 'undefined'],
      correct: 0,
    },
    {
      prompt: `What does 0.1 + 0.2 === 0.3 evaluate to, and why?`,
      options: ['true, because both sides are equal numbers', 'false, because of floating-point representation error', 'true, because JavaScript rounds to integers', 'false, because === cannot compare numbers'],
      correct: 1,
    },
    {
      prompt: `What does 1 + true evaluate to?`,
      options: ['1', '2', 'NaN', '"1true"'],
      correct: 1,
    },
    {
      prompt: `What is new Set([1, 1, 2, 3]).size?`,
      options: ['2', '3', '4', '0'],
      correct: 1,
    },
    {
      prompt: `What does [10, 9, 33].sort() return with no arguments?`,
      options: ['[9, 10, 33]', '[10, 33, 9]', '[9, 33, 10]', 'The array is not modified'],
      correct: 1,
    },
    {
      prompt: `What is a closure in JavaScript?`,
      options: ['A function that is frozen with Object.freeze', 'A function that retains access to the scope in which it was defined', 'A variable declared inside a block', 'A function that has no return value'],
      correct: 1,
    },
    {
      prompt: `for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 0); } — what does this print?`,
      options: ['0, 1, 2', '3, 3, 3', 'undefined, undefined, undefined', 'Nothing — setTimeout never fires'],
      correct: 1,
    },
    {
      prompt: `Object.freeze(obj) makes obj non-mutable. What does it do to nested objects inside obj?`,
      options: ['It also freezes all nested objects deeply', 'It does nothing — nested objects stay mutable', 'It removes nested objects', 'It throws an error if nested objects exist'],
      correct: 1,
    },
    {
      prompt: `What does JSON.parse('{"a": 1}') return?`,
      options: ['A JSON string', 'The object { a: 1 }', 'An array [1]', 'It throws a SyntaxError'],
      correct: 1,
    },
    {
      prompt: `How is "this" determined inside an arrow function?`,
      options: ['By how the function is called', 'Lexically, by the surrounding scope where the arrow function is defined', 'Always "undefined" in strict mode', 'Always the global object'],
      correct: 1,
    },
    {
      prompt: `What does the optional chaining operator (?.) do when the object before it is null or undefined?`,
      options: ['Throws a TypeError', 'Returns undefined', 'Returns null', 'Returns an empty object'],
      correct: 1,
    },
    {
      prompt: `When does the callback passed to Promise.prototype.finally run?`,
      options: ['Only when the promise resolves', 'Only when the promise rejects', 'When the promise is settled, whether it resolved or rejected', 'Only if the promise is cancelled'],
      correct: 2,
    },
    {
      prompt: `const a = { nested: { x: 1 } }; const b = { ...a }; b.nested.x = 2; — what is a.nested.x?`,
      options: ['1', '2', 'undefined', 'It throws an error'],
      correct: 1,
    },
    {
      prompt: `In the event loop, when does the callback passed to Promise.then run relative to setTimeout(fn, 0)?`,
      options: ['After all setTimeout callbacks', 'Before any setTimeout callback, because promise callbacks are microtasks', 'In the same order they were scheduled', 'It depends on the browser version'],
      correct: 1,
    },
  ],
};

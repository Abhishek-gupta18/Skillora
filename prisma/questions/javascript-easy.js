module.exports = {
  skill: 'JavaScript',
  difficulty: 'EASY',
  questions: [
    {
      prompt: `What does typeof "hello" return?`,
      options: ['"string"', '"text"', '"char"', '"varchar"'],
      correct: 0,
    },
    {
      prompt: `Which keyword declares a block-scoped variable in JavaScript?`,
      options: ['var', 'let', 'function', 'variable'],
      correct: 1,
    },
    {
      prompt: `What does Array.isArray([1, 2, 3]) return?`,
      options: ['true', 'false', 'undefined', 'It throws an error'],
      correct: 0,
    },
    {
      prompt: `What is the result of 5 + "5" in JavaScript?`,
      options: ['10 (a number)', '55 (a number)', '"55" (a string)', 'NaN'],
      correct: 2,
    },
    {
      prompt: `Which method adds a new element to the end of an array?`,
      options: ['pop()', 'shift()', 'push()', 'join()'],
      correct: 2,
    },
    {
      prompt: `Which operator compares both value and type?`,
      options: ['=', '==', '===', '=>'],
      correct: 2,
    },
    {
      prompt: `What is "hello".length?`,
      options: ['4', '5', '6', 'undefined'],
      correct: 1,
    },
    {
      prompt: `Which method converts a string to all uppercase letters?`,
      options: ['upperCase()', 'toUpper()', 'toUpperCase()', 'toUppercase()'],
      correct: 2,
    },
    {
      prompt: `What is Boolean("") in JavaScript?`,
      options: ['true', 'false', '-1', 'undefined'],
      correct: 1,
    },
    {
      prompt: `Which of these values is NOT falsy?`,
      options: ['0', '"" (empty string)', '"false"', 'null'],
      correct: 2,
    },
    {
      prompt: `What does document.getElementById("missing") return when no element has that id?`,
      options: ['undefined', 'null', 'An empty string', 'It throws an error'],
      correct: 1,
    },
    {
      prompt: `Which loop statement always executes its body at least once?`,
      options: ['for', 'while', 'do...while', 'forEach'],
      correct: 2,
    },
    {
      prompt: `What is the result of typeof null?`,
      options: ['"null"', '"object"', '"undefined"', '"none"'],
      correct: 1,
    },
    {
      prompt: `Which array method creates a new array containing only the elements that pass a given test?`,
      options: ['map()', 'filter()', 'reduce()', 'forEach()'],
      correct: 1,
    },
    {
      prompt: `What is the value of a variable declared with let but not initialized?`,
      options: ['null', 'undefined', '0', 'NaN'],
      correct: 1,
    },
  ],
};

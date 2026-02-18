module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'vitest related --run'],
  '*.{json,md}': ['prettier --write'],
};

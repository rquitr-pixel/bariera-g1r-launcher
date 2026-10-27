// Publiczna wersja (instalator NSIS): bez plików testowych i kopii.
// Użycie: npm run dist:win:public -> dist-public/Bariera-Launcher-Setup.exe + .blockmap + latest.yml
const base = require('./package.json').build;
module.exports = {
  ...base,
  directories: { output: 'dist-public' },
  files: [...base.files, '!**/*.bak*', '!**/test*', '!**/*.md'],
};

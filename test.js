let Htu21d = require('./htu21d.js');

let htu = new Htu21d(1, 1000);

htu.start();

htu.on('fertig', (data) => {
  console.log(data);
});

let Htu21d = require('./htu21d.js');

let htu = new Htu21d(1, 1000);

htu.start();

htu.on('readout-complete', (data) => {
  console.log(data);
});

htu.on('error', (error) => {
  console.log(error);
});

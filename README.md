## Synopsis
Library to read out a HTU21d humidity/temperature sensor connected via I2C. It depends on the "i2c-bus" library and is tested on a Raspberry Pi 3.

## Code Example
```javascript
let Htu21d = require('./htu21d.js');
let htu = new Htu21d(1, 1000);
htu.start();

htu.on('readout-complete', (data) => {
  console.log(data);    // e.g. { temperature: "26.39", humidity: "16.45" }
});

htu.on('error', (error) => {
  console.log(error);
});
```

## Motivation
The HTU21d is capable of measuring humidity with a resolution of 0.04 %rel and temperature with a resolution of 0.01 °C.

## Installation
npm install sensor-htu21d

## Tests
node test.js

## Contributors
Mejsel (marcel.indlekofer@gmail.com)

## License
GPL license.

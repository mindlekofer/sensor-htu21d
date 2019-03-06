const i2c = require('i2c-bus');
const events = require('events');
const util = require('util');

const HTU21_ADDRESS = 0x40;
const HTU21_CMD_TRIGGER_TEMP_MEAS_HOLD    = 0xe3;
const HTU21_CMD_TRIGGER_HUM_MEAS_HOLD     = 0xe5;
const HTU21_CMD_TRIGGER_TEMP_MEAS_NO_HOLD = 0xf3;
const HTU21_CMD_TRIGGER_HUM_MEAS_NO_HOLD  = 0xf5;
const HTU21_CMD_WRITE_USER_REGISTER       = 0xe6;
const HTU21_CMD_READ_USER_REGISTER        = 0xe7;
const HTU21_CMD_SOFT_RESET                = 0xfe;

//console.log("start of program");

let delay = (ms) => {
  return new Promise( (resolve) => {
    setTimeout(() => resolve(), ms);
  })
};

let bufferToTemperature= (buf) => {
    let tRaw = (buf[0] << 8) + (buf[1] & 0xfc);
    let temperature = (tRaw*175.72/65536)-46.85;
    return temperature.toFixed(2);
};

let bufferToHumidity = (buf) => {
    let hRaw = (buf[0] << 8) + (buf[1] & 0xf0);
    let humidity = (hRaw*125.0/65536)-6.0;
    return humidity.toFixed(2);
};

let sendByte = (i2cDev, byte) => {
    return new Promise( (resolve) => {
        i2cDev.sendByte(0x40, byte, (err) => {
          resolve();
        });
    });
};

let readBuffer = (i2cDev, buffer) => {
    return new Promise( (resolve) => {
        i2cDev.i2cRead(0x40, 3, buffer, (err, bytesRead, buffer) => {
          resolve();
        });
    });
};

var Htu21d = function(i2cNr, period) {
    util.inherits(Htu21d, events.EventEmitter);

    this.i2cNr = i2cNr;
    this.period = period;
    this.timer = null;
    this.data = {
        time: null,
        temperature: null,
        humidity: null
    };
    this.i2cBus = null;

    this.start = () => {
        this.i2cBus = i2c.open(this.i2cNr, (err) => {
            console.log(err);
            this.emit('error', err);
        });
        this.timer = setInterval(this.readout, this.period);
    };

    this.stop = () => {
        clearInterval(this.timer);
        this.i2cBus.closeSync();
    };

    this.readout = async () => {
        try {
            let buf = Buffer.alloc(3);
            await sendByte(this.i2cBus, HTU21_CMD_TRIGGER_TEMP_MEAS_NO_HOLD);
            await delay(40);
            await readBuffer(this.i2cBus, buf);
            let temperature = bufferToTemperature(buf);
            await sendByte(this.i2cBus, HTU21_CMD_TRIGGER_HUM_MEAS_NO_HOLD);
            await delay(60);
            await readBuffer(this.i2cBus, buf);
            let humidity = bufferToHumidity(buf);
            this.data.temperature = temperature;
            this.data.humidity = humidity;
            this.emit('readout-complete', this.data);
        } catch (error) {
            this.emit('error', error);
            console.log(errror);
        }
    };

}

module.exports = Htu21d;

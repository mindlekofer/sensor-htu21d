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

console.log("start of program");

let delay = (ms) => {
  return new Promise( (resolve) => {
    setTimeout(() => resolve(), ms);
})};

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

var Htu21d = function(i2cNr, period) {
    console.log('htu21d constructor');
    this.i2cNr = i2cNr;
    this.period = period;
    let buf = Buffer.alloc(3);
    this.data = {
        time: null,
        temperature: null,
        humidity: null
    };
    this.timer = null;

    util.inherits(Htu21d, events.EventEmitter);

    this.reset = () => {
        const i2c1 = i2c.openSync(this.i2cNr);
        i2c1.sendByteSync(0x40, HTU21_CMD_SOFT_RESET);
        i2c1.closeSync();
    };

    this.readout = async () => {
        const i2c1 = i2c.openSync(this.i2cNr);

        i2c1.sendByteSync(0x40, HTU21_CMD_TRIGGER_TEMP_MEAS_NO_HOLD);
        await delay(100);
        i2c1.i2cReadSync(0x40, 3, buf);
        let temperature = bufferToTemperature(buf);

        i2c1.sendByteSync(0x40, HTU21_CMD_TRIGGER_HUM_MEAS_NO_HOLD);
        await delay(100);
        i2c1.i2cReadSync(0x40, 3, buf);
        let humidity = bufferToHumidity(buf);

        this.data.time = Date.now();
        this.data.temperature = temperature;
        this.data.humidity = humidity;

        this.emit('fertig', this.data);

        i2c1.closeSync();
    };

    this.start = () => {
        this.timer = setInterval(this.readout, this.period);
    };

    this.stop = () => {
        clearInterval(this.timer);
    };
}


module.exports = Htu21d;

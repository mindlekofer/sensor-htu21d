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

var crc8 = (buffer) => {
  var poly = 0x98800000;
  var reg = (buffer[0]<<24 | buffer[1]<<16 | buffer[2]<<8);
  var shift = 0;
  for (shift=0; shift<24; shift++) {
    if (reg & 0x80000000)
      reg ^= poly;
      reg <<= 1;
  }
  console.log(reg);
}

let verifyBuffer = (buffer) => {
  if (buffer[0] == 0 && buffer[1] == 0) {
    return "open circuit condition";
  } else if (buffer[0] == 0xff && buffer[1] == 0xff) {
    return "short circuit condition";
  } else if (crc8(buffer)) {
    return "crc error";
  }
};

let verifyTemperture = (buffer) => {
  if (buffer[1] & 0b11 != 0b00) {
    return "invalid temperature data";
  } 
};

let verifyHumidity = (buffer) => {
  if (buffer[1] & 0b11 != 0b10) {
    return "invalid humidity data";
  } 
};


var Htu21d = function(i2cNr, period) {
    util.inherits(Htu21d, events.EventEmitter);

    this.i2cNr = i2cNr;
    this.period = period;
    this.timer = null;
    this.data = {
        temperature: null,
        humidity: null
    };

    this.i2cBus = i2c.open(this.i2cNr, (err) => {
        if (err) {
          console.log("Error opening I2C bus ", err);
          this.emit('error', err);
        }
    });

    this.readout = async () => {
        try {
            let buf = Buffer.alloc(3);
            await sendByte(this.i2cBus, HTU21_CMD_TRIGGER_TEMP_MEAS_NO_HOLD);
            await delay(100);
            await readBuffer(this.i2cBus, buf);

            console.log(buf); 
            (err) = verifyTemperture(buf);
            (err) = verifyBuffer(buf);
            if (err) {
              this.emit('error', "error reading temperature");
              return;
            }

            let temperature = bufferToTemperature(buf);
            await sendByte(this.i2cBus, HTU21_CMD_TRIGGER_HUM_MEAS_NO_HOLD);
            await delay(100);
            await readBuffer(this.i2cBus, buf);
            let humidity = bufferToHumidity(buf);

            console.log(buf);
            (err) = verifyTemperture(buf);
            (err) = verifyBuffer(buf);
            if (err) {
              this.emit('error', "error reading humidity");
              return;
            }

            if (buf[1] & 0b11 != 0b10) {
              console.log("this is not humidity data");
              this.emit('error', 'invalid humidity data');
            }

            this.data.temperature = Number(temperature);
            this.data.humidity = Number(humidity);
            this.emit('readout-complete', this.data);
        } catch (error) {
            this.emit('error', error);
            console.log(error);
        }
    };

    this.start = () => {
        this.timer = setInterval(this.readout, this.period);
    };

    this.stop = () => {
        clearInterval(this.timer);
        this.i2cBus.closeSync();
    };


}

module.exports = Htu21d;

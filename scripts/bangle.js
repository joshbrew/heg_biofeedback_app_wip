//Program to run PPG, Accelerometer, and Magnetometer with efficient packet updates
import { state } from "react-scomponent";
import { ByteParser } from "device-decoder/src/util/ByteParser";

export function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

//for generic string output
export function strdecoder(data) {
    const str = ab2str(data.output);
    state.setState({ bangle:str });
    return str;
}



// Function to convert a 24-bit signed integer
function bytesToInt24(x0, x1, x2) {
    let int24 = ((0xFF & x0) << 16) | ((0xFF & x1) << 8) | (0xFF & x2);
    if ((int24 & 0x800000) > 0) {
        int24 |= 0xFF000000; // js ints are 32 bit
    } else {
        int24 &= 0x00FFFFFF;
    }
    return int24;
}

// Function to convert a 16-bit signed integer
function bytesToInt16(x0, x1) {
    let int16 = ((0xFF & x0) << 8) | (0xFF & x1);
    if ((int16 & 0x8000) > 0) {
        int16 |= 0xFFFF0000; // js ints are 32 bit
    } else {
        int16 &= 0x0000FFFF;
    }
    return int16;
}

function genTimestamps(ct, sps, from) {
    let now = from ? from : Date.now();
    let toInterp = [now - ct * 1000 / sps, now];
    return ByteParser.upsample(toInterp, ct);
}

//State will be set,
//subscribe via state.subscribeEvent('ppg',(ppg:{raw:number[],filt:number[]})=>{})

//All Events:
//ppg:{raw, filt}
//hr:{bpm, hrv, confidence}
//accel:{x, y, z}
//compass:{x,y,z,dx,dy,dz,heading}
//env:{temperature, pressure, altitude}
//gps:{}?

export const BANGLE_SAMPLE_RATE = 25;//Hz


let lasthr = 0;

let lastPPG = 0;

export function decodeSensorData(data) {
    data = data.output;

    const HRM_PACKET_SIZE = 8; // Size of each HRM packet
    const ACCEL_PACKET_SIZE = 6; // Size of each accelerometer packet
    const MAG_PACKET_SIZE = 14; // Size of each magnetometer packet
    const PRESSURE_PACKET_SIZE = 8; // Size of each pressure packet

    const MAX_BUFFER_SIZE = 128 - 3; //3 for char code leading and two termination bytes

    const MAX_BUFFER_SIZE_HRM = Math.floor(MAX_BUFFER_SIZE / HRM_PACKET_SIZE) * HRM_PACKET_SIZE; // Each HRM packet is 8 bytes
    const MAX_BUFFER_SIZE_ACCEL = Math.floor(MAX_BUFFER_SIZE / ACCEL_PACKET_SIZE) * ACCEL_PACKET_SIZE; // Each accel packet is 6 bytes
    const MAX_BUFFER_SIZE_MAG = Math.floor(MAX_BUFFER_SIZE / MAG_PACKET_SIZE) * MAG_PACKET_SIZE; // Each mag packet is 14 bytes
    const MAX_BUFFER_SIZE_PRESSURE = Math.floor(MAX_BUFFER_SIZE / PRESSURE_PACKET_SIZE) * PRESSURE_PACKET_SIZE; // Each pressure packet is 8 bytes

    const uint8Array = new Uint8Array(data);
    const dataType = String.fromCharCode(uint8Array[0]);
    const payload = uint8Array.slice(1, -2); // exclude termination bytes

  
    let parsedData = {};

    //we're receiving one sample set at a time from different sensors so we will parse the expected buffer
    if (dataType === 'H') {
        if(!state.data.detectedPPG) state.data.detectedPPG = true;
        const packetCount = MAX_BUFFER_SIZE_HRM / HRM_PACKET_SIZE;
        const ppg = new Float32Array(packetCount);
        const ppgfilt = new Float32Array(packetCount);
        const bpm = [];
        const bpm_conf = [];
        const hrv = [];
        const bpm_timestamp = [];


        let now = Date.now();
        let timestamp = genTimestamps(ppg.length, BANGLE_SAMPLE_RATE, now - 1000*ppg.length/BANGLE_SAMPLE_RATE);

        for (let i = 0, index = 0; i < MAX_BUFFER_SIZE_HRM; i += HRM_PACKET_SIZE, index++) {
            const raw = bytesToInt24(payload[i], payload[i + 1], payload[i + 2]);
            const filt = bytesToInt24(payload[i + 3], payload[i + 4], payload[i + 5]);
            const _bpm = payload[i + 6];
            const confidence = payload[i + 7];

            if(raw > 0) lastPPG = raw;
            ppg[index] = raw || lastPPG; //should be in the 1-2000 range
            ppgfilt[index] = filt;
            if(!isNaN(_bpm) && _bpm > 0) {
                if(lasthr === 0) lasthr = _bpm;
                let dhr = Math.abs(_bpm - lasthr); // Change in heart rate
                if(lasthr != _bpm) {
                    lasthr = _bpm;
                    bpm.push(_bpm);
                    hrv.push(dhr); //only report changes so we can keep the reporting clean
                    bpm_conf.push(confidence);
                    bpm_timestamp.push(timestamp[i]);
                }
            }
        }

        parsedData = { 
            ppg: { raw: ppg, filt: ppgfilt, timestamp }, 
            heg:{ heg: ppg.map(v=>v/2000), timestamp } 
        };

        if(bpm.length > 0)
            parsedData.hr = { hr: bpm, hrv: hrv, timestamp:bpm_timestamp, confidence: bpm_conf };

        state.setState(parsedData);

        return { dataType, parsedData };

    } else if (dataType === 'A') {
        if(!state.data.detectedAccel) state.data.detectedAccel = true;
        const packetCount = MAX_BUFFER_SIZE_ACCEL / ACCEL_PACKET_SIZE;
        const x = new Float32Array(packetCount);
        const y = new Float32Array(packetCount);
        const z = new Float32Array(packetCount);

        for (let i = 0, index = 0; i < MAX_BUFFER_SIZE_ACCEL; i += ACCEL_PACKET_SIZE, index++) {
            const _x = bytesToInt16(payload[i], payload[i + 1]);
            const _y = bytesToInt16(payload[i + 2], payload[i + 3]);
            const _z = bytesToInt16(payload[i + 4], payload[i + 5]);

            x[index] = _x / 1024; // Rescale back to g
            y[index] = _y / 1024;
            z[index] = _z / 1024;
        }

        let now = Date.now();
        let timestamp = genTimestamps(x.length, BANGLE_SAMPLE_RATE, now - 1000*x.length/BANGLE_SAMPLE_RATE);
        parsedData = { x: x, y: y, z: z, timestamp };
        state.setState({ accel: parsedData });

        return { dataType, parsedData };

    } else if (dataType === 'M') {
        if(!state.data.detectedCompass) state.data.detectedCompass = true;
        const packetCount = MAX_BUFFER_SIZE_MAG / MAG_PACKET_SIZE;
        const x = new Float32Array(packetCount);
        const y = new Float32Array(packetCount);
        const z = new Float32Array(packetCount);
        const dx = new Float32Array(packetCount);
        const dy = new Float32Array(packetCount);
        const dz = new Float32Array(packetCount);
        const heading = new Float32Array(packetCount);

        for (let i = 0, index = 0; i < MAX_BUFFER_SIZE_MAG; i += MAG_PACKET_SIZE, index++) {
            const _x = bytesToInt16(payload[i], payload[i + 1]);
            const _y = bytesToInt16(payload[i + 2], payload[i + 3]);
            const _z = bytesToInt16(payload[i + 4], payload[i + 5]);
            const _dx = bytesToInt16(payload[i + 6], payload[i + 7]);
            const _dy = bytesToInt16(payload[i + 8], payload[i + 9]);
            const _dz = bytesToInt16(payload[i + 10], payload[i + 11]);
            const _heading = (payload[i + 12] << 8) | payload[i + 13];

            //uT
            x[index] = _x;
            y[index] = _y;
            z[index] = _z;
            dx[index] = _dx;
            dy[index] = _dy;
            dz[index] = _dz;
            heading[index] = _heading;
        }

        let now = Date.now();
        let timestamp = genTimestamps(x.length, BANGLE_SAMPLE_RATE, now - 1000*x.length/BANGLE_SAMPLE_RATE);
        parsedData = { x: x, y: y, z: z, dx: dx, dy: dy, dz: dz, heading: heading, timestamp };
        state.setState({ compass: parsedData });

        return { dataType, parsedData };

    } else if (dataType === 'P') {
        if(!state.data.detectedEnv) state.data.detectedEnv = true;
        const packetCount = MAX_BUFFER_SIZE_PRESSURE / PRESSURE_PACKET_SIZE;
        const temperature = new Float32Array(packetCount);
        const pressure = new Float32Array(packetCount);
        const altitude = new Float32Array(packetCount);

        for (let i = 0, index = 0; i < MAX_BUFFER_SIZE_PRESSURE; i += PRESSURE_PACKET_SIZE, index++) {
            const _temperature = bytesToInt16(payload[i], payload[i + 1]);
            const _pressure = bytesToInt24(payload[i + 2], payload[i + 3], payload[i + 4]);
            const _altitude = bytesToInt24(payload[i + 5], payload[i + 6], payload[i + 7]);

            temperature[index] = _temperature / 100; // Rescale
            pressure[index] = _pressure;
            altitude[index] = _altitude;
        }

        let now = Date.now();
        let timestamp = genTimestamps(temperature.length, 1, now - 1000*temperature.length/BANGLE_SAMPLE_RATE); //I think it's 1sps
        parsedData = { temperature: temperature, pressure: pressure, altitude: altitude, timestamp };
        state.setState({ env: parsedData });

        return { dataType, parsedData };
    }
}

//this runs on the BangleJS independent of all code in the js app. 
//The code gets minified by our bundler too so you can leave plenty of comments.

//Reference Materials:
//https://www.espruino.com/Bangle.js+Getting+Started
//https://www.espruino.com/ReferenceBANGLEJS2
//https://github.com/espruino/BangleApps/blob/master/apps/sensible/sensible.js
//https://github.com/espruino/BangleApps/tree/master/apps/hrmmar
//https://github.com/espruino/Espruino/blob/master/boards/BANGLEJS2.py


//placeholder application, we need to wrap this in an actual app on the device. We can pack a lot of code in thanks to the esbuild minification
function bangleCode() {

Bluetooth.println("BEGIN"); //send start signal

const USEHRM = true;
const USEACCEL = false;
const USEMAG = false;
const USEENV = false;
const USEGPS = false;

// Precompute the maximum buffer size for each sensor type
const HRM_PACKET_SIZE = 8; // Size of each HRM packet
const ACCEL_PACKET_SIZE = 6; // Size of each accelerometer packet
const MAG_PACKET_SIZE = 14; // Size of each magnetometer packet
const PRESSURE_PACKET_SIZE = 8; // Size of each pressure packet

const MAX_BUFFER_SIZE = 128 - 3; //3 for char code leading and two termination bytes

const MAX_BUFFER_SIZE_HRM = 120;//Math.floor(MAX_BUFFER_SIZE / HRM_PACKET_SIZE) * HRM_PACKET_SIZE; // Each HRM packet is 8 bytes
const MAX_BUFFER_SIZE_ACCEL = 120;//Math.floor(MAX_BUFFER_SIZE / ACCEL_PACKET_SIZE) * ACCEL_PACKET_SIZE; // Each accel packet is 6 bytes
const MAX_BUFFER_SIZE_MAG = 112;//Math.floor(MAX_BUFFER_SIZE / MAG_PACKET_SIZE) * MAG_PACKET_SIZE; // Each mag packet is 14 bytes
const MAX_BUFFER_SIZE_PRESSURE = 120;//Math.floor(MAX_BUFFER_SIZE / PRESSURE_PACKET_SIZE) * PRESSURE_PACKET_SIZE; // Each pressure packet is 8 bytes

// Pre-sized buffers, most efficient send structure to bundle all readings up to the max nrf52 buffer size or near it, keeps bluetooth more infrequent so we can pump more data out
const hrmBuffer = new Uint8Array(MAX_BUFFER_SIZE_HRM + 3); // +3 for char code and termination bytes
let hrmIndex = 1; // Start filling after the char code

const accelBuffer = new Uint8Array(MAX_BUFFER_SIZE_ACCEL + 3); // +3 for char code and termination bytes
let accelIndex = 1; // Start filling after the char code

const magBuffer = new Uint8Array(MAX_BUFFER_SIZE_MAG + 3); // +3 for char code and termination bytes
let magIndex = 1; // Start filling after the char code

const pressureBuffer = new Uint8Array(MAX_BUFFER_SIZE_PRESSURE + 3); // +3 for char code and termination bytes
let pressureIndex = 1; // Start filling after the char code

//const gpsBuffer = new Uint8Array();
//let gpsIndex = 1;

//const healthBuffer = new Uint8Array();
//let healthIndex = 1;

hrmBuffer[0] = "H".charCodeAt(0); // First byte for the HRM char code
accelBuffer[0] = "A".charCodeAt(0); // First byte for the accelerometer char code
magBuffer[0] = "M".charCodeAt(0); // First byte for the magnetometer char code
pressureBuffer[0] = "P".charCodeAt(0); // First byte for the pressure char code
//gpsBuffer[0] = "G".charCodeAt(0);
//healthBuffer[0] = "S".charCodeAt(0); //maybe S for summary idk it does not matter that much

function sendBuffer(buffer, lastIndex) {
    buffer[lastIndex] = 0x0D; // Termination byte 1 \r
    buffer[lastIndex + 1] = 0x0A; // Termination byte 2 \n
    Bluetooth.write(buffer); // Send the used portion of the buffer // https://forum.espruino.com/conversations/335236/
}

if(USEHRM)
Bangle.on('HRM-raw', function withHRM(hrm) {
    let value = hrm.vcPPG;
    let filt = hrm.filt;
    let bpm = hrm.bpm;
    let confidence = hrm.confidence;

    hrmBuffer[hrmIndex] =   (value >> 16) & 0xFF;
    hrmBuffer[hrmIndex+1] = (value >> 8) & 0xFF;
    hrmBuffer[hrmIndex+2] = value & 0xFF;
    hrmBuffer[hrmIndex+3] = (filt >> 16) & 0xFF;
    hrmBuffer[hrmIndex+4] = (filt >> 8) & 0xFF;
    hrmBuffer[hrmIndex+5] = filt & 0xFF;
    hrmBuffer[hrmIndex+7] = confidence;
    hrmBuffer[hrmIndex+6] = bpm;
    hrmIndex += 8;

    if (hrmIndex >= MAX_BUFFER_SIZE_HRM) {
        sendBuffer(hrmBuffer, hrmIndex);
        hrmIndex = 1; // Reset index after char code
    }
});



if(USEACCEL)
Bangle.on('accel', function withAccel(a) {
    let x = a.x * 1024;
    let y = a.y * 1024;
    let z = a.z * 1024;

    accelBuffer[accelIndex] = (x >> 8) & 0xFF;
    accelBuffer[accelIndex+1] = x & 0xFF;
    accelBuffer[accelIndex+2] = (y >> 8) & 0xFF;
    accelBuffer[accelIndex+3] = y & 0xFF;
    accelBuffer[accelIndex+4] = (z >> 8) & 0xFF;
    accelBuffer[accelIndex+5] = z & 0xFF;
    accelIndex += 6;

    if (accelIndex >= MAX_BUFFER_SIZE_ACCEL) {
        sendBuffer(accelBuffer, accelIndex);
        accelIndex = 1; // Reset index after char code
    }
});

//units should be in Gauss/Micro Teslas
if(USEMAG)
Bangle.on('mag', function withMag(m) {
    let x = m.x;
    let y = m.y;
    let z = m.z;
    let dx = m.dx; // Assuming dx, dy, dz are provided
    let dy = m.dy;
    let dz = m.dz;
    let heading = m.heading; // 0 to 360

    magBuffer[magIndex] = (x >> 8) & 0xFF;
    magBuffer[magIndex+1] = x & 0xFF;
    magBuffer[magIndex+2] = (y >> 8) & 0xFF;
    magBuffer[magIndex+3] = y & 0xFF;
    magBuffer[magIndex+4] = (z >> 8) & 0xFF;
    magBuffer[magIndex+5] = z & 0xFF;
    magBuffer[magIndex+6] = (dx >> 8) & 0xFF;
    magBuffer[magIndex+7] = dx & 0xFF;
    magBuffer[magIndex+8] = (dy >> 8) & 0xFF;
    magBuffer[magIndex+9] = dy & 0xFF;
    magBuffer[magIndex+10] = (dz >> 8) & 0xFF;
    magBuffer[magIndex+11] = dz & 0xFF;
    magBuffer[magIndex+12] = (heading >> 8) & 0xFF;
    magBuffer[magIndex+13] = heading & 0xFF;
    magIndex += 14;

    //remain synced
    let a = Bangle.getAccel();
    withAccel(a);

    if (magIndex >= MAX_BUFFER_SIZE_MAG) {
        sendBuffer(magBuffer, magIndex);
        magIndex = 1; // Reset index after char code
    }
});

// Pressure sensor, should be 1sps
if(USEENV)
Bangle.on('pressure', function withPressure(e) {
    let temperature = e.temperature * 100; // 16-bit signed int with 2 decimal places
    let pressure = e.pressure;
    let altitude = e.altitude;

    pressureBuffer[pressureIndex] = (temperature >> 8) & 0xFF;
    pressureBuffer[pressureIndex+1] = temperature & 0xFF;
    pressureBuffer[pressureIndex+2] = (pressure >> 16) & 0xFF;
    pressureBuffer[pressureIndex+3] = (pressure >> 8) & 0xFF;
    pressureBuffer[pressureIndex+4] = pressure & 0xFF;
    pressureBuffer[pressureIndex+5] = (altitude >> 16) & 0xFF;
    pressureBuffer[pressureIndex+6] = (altitude >> 8) & 0xFF;
    pressureBuffer[pressureIndex+7] = altitude & 0xFF;
    pressureIndex += 8;

    if (pressureIndex >= MAX_BUFFER_SIZE_PRESSURE) {
        sendBuffer(pressureBuffer, pressureIndex);
        pressureIndex = 1; // Reset index after char code
    }
});

// Enable sensors
if(USEHRM) Bangle.setHRMPower(true);
if(USEMAG) Bangle.setCompassPower(true);
if(USEENV) Bangle.setBarometerPower(true);
//Bangle.setLCDPower(false); //turn off for now

Bangle.setOptions({ powerSave:false });
Bangle.setPollInterval(40); // Poll accel, mag sensors at 40ms (25Hz)
Bangle.setOptions({ hrmPollInterval: 40 });



//if(USEGPS) {
//Bangle.setGPSPower(true);
//Bangle.on('GPS', function withGPS(data) { 
    //lat,lon,alt,speed,course,time,satellites,fix,hdop
//});
//}

//Bangle.on('health',function withHealth(info) { //10 min summary 
    //movement, steps, bpm, bpmConfidence
//})
//Bangle.getStepCount();
//

//Bangle.setBackLight(true); //todo: graphics

//todo, add proper connect/disconnect infrastructure for persistent watch usage, can use local storage too for backup
NRF.on('disconnect', function() 
{
    Bangle.setHRMPower(false);
    Bangle.setCompassPower(false);
    Bangle.setBarometerPower(false);
    Bangle.setLCDPower(true); //turn back on
    reset();
});


//Bluetooth.on('data', function(data) {}); //e.g. command interface //more info https://www.espruino.com/BLE+Security

}

const str = bangleCode.toString();

//upload to banglejs 
export const code = str.substring(str.indexOf('{')+1,str.lastIndexOf('}'))


function test() {
Bangle.setCompassPower(true);
Bangle.setOptions({ powerSave:false });
Bangle.setPollInterval(40); // Poll accel, mag sensors at 40ms (25Hz)
Bangle.setOptions({ hrmPollInterval: 40 });
Bangle.on('mag',function(a) {
    var d = JSON.stringify(a);
    Bluetooth.println(d);
});
}


const testcodestr = test.toString()
export const testCode = testcodestr.substring(testcodestr.indexOf('{')+1,testcodestr.lastIndexOf('}'))

function test2() {
    Bangle.setHRMPower(true);
    Bangle.setOptions({ powerSave:false });
    Bangle.setPollInterval(40); // Poll accel, mag sensors at 40ms (25Hz)
    Bangle.setOptions({ hrmPollInterval: 40 });
    Bangle.on('HRM-raw',function(h) {
        var d = JSON.stringify(h);
        Bluetooth.println(d);
    });
}


const testcodestr2 = test2.toString()
export const testCode2 = testcodestr2.substring(testcodestr2.indexOf('{')+1,testcodestr2.lastIndexOf('}'))
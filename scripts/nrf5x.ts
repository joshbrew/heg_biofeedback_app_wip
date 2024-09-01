import { state } from "react-scomponent"; //just an EventHandler instance
import { ByteParser } from 'device-decoder/src/util/ByteParser';

function genTimestamps(ct, sps, from?) {
    let now = from ? from : Date.now();
    let toInterp = [now - ct * 1000 / sps, now];
    return ByteParser.upsample(toInterp, ct);
}


//for reference
export let sps = {
    ppg:100,
    imu:100,
    compass:100,
    emg:250,
    ecg:250, //part of the EMG chip
    env:3
}

export let serviceCharacteristic = '0000cafe-b0ba-8bad-f00d-deadbeef0000';

//todo: check data isn't out of range for running the algos, and report moving averages for heartrate
export let characteristicCallbacks = {
    // emg:{characteristic:'0002cafe-b0ba-8bad-f00d-deadbeef0000', callback:(data: { //ads131m08 (main)
    //     timestamp:number,
    //     [key: string]: number|number[]
    // }) => {
    //     if(!state.data.detectedEMG) state.setState({detectedEMG:true});
    //     //interpolate timestamps inferred from time-of-arrival timestamp provided by the driver
    //     data.timestamp = genTimestamps((data[0] as number[]).length, sps.emg, data.timestamp - 1000*((data[0] as number[]).length)/sps.emg) as any;
    //     state.setValue('emg', data); //these values are now subscribable 
    //     state.setValue('ecg', {5:data[5], timestamp:data.timestamp});
    // }},
    ppg:{characteristic:'0003cafe-b0ba-8bad-f00d-deadbeef0000', callback:(data: { //max30102
        red: number[],
        ir: number[],
        max_dietemp: number,
        timestamp: number
    }) => {
        if(!state.data.detectedPPG) state.setState({detectedPPG:true});
        data.timestamp = genTimestamps(data.red.length, sps.ppg, data.timestamp - 1000*(data.red.length)/sps.ppg) as any;
        (data as any).heg = new Array(data.red.length);
        for(let i = 0; i < data.red.length; i++) {
            (data as any).heg[i] = data.red[i]/data.ir[i]; //this is represents your 
        }
        
        state.setValue('ppg2', data);
        
        //let d = Object.assign({}, data);
        
        // hrworker?.post('hr', d);
        // brworker?.post('breath', d);

    }},
    imu:{characteristic:'0004cafe-b0ba-8bad-f00d-deadbeef0000', callback:(data: { //mpu6050
        ax: number[],
        ay: number[],
        az: number[],
        gx: number[],
        gy: number[],
        gz: number[],
        mpu_dietemp: number,
        timestamp: number
    }) => {
        if(!state.data.detectedIMU) state.setState({detectedIMU:true});
        data.timestamp = genTimestamps((data.ax as number[]).length, sps.imu, data.timestamp - 1000*((data.ax as number[]).length)/sps.imu) as any;
        state.setValue('imu', data);
    }},
    env:{characteristic:'0002cafe-b0ba-8bad-f00d-deadbeef0000', callback:(data: { //bme280
        temp: number[],
        pressure: number[],
        humidity: number[], //if using BME, not available on BMP
        altitude: number[],
        timestamp: number
    }) => {
        if(!state.data.detectedENV) state.setState({detectedENV:true});
        data.timestamp = genTimestamps(data.temp.length, sps.env, data.timestamp - 1000*(data.temp.length/sps.env)) as any;
        state.setValue('env', data);
    }},
    emg2:{characteristic:'0005cafe-b0ba-8bad-f00d-deadbeef0000', callback:(data: { //extra ads131 (if plugged in)
        timestamp:number,
        [key: string]: number|number[]
    }) => {
        if(!state.data.detectedEMG2) state.setState({detectedEMG2:true});
        data.timestamp = genTimestamps((data[0] as number[]).length, sps.emg, data.timestamp - 1000*((data[0] as number[]).length)/sps.emg) as any;
        state.setValue('emg2', data);
    }}
}

export let ondecoded = {}  as any;

for(const key in characteristicCallbacks) {
    ondecoded[characteristicCallbacks[key].characteristic] = characteristicCallbacks[key].callback;
}
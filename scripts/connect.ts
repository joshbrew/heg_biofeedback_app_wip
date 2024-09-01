import {Devices, initDevice, InitDeviceOptions, BiquadChannelFilterer, espruinoNames, uploadEspruinoFile} from 'device-decoder'
import {ondecoded as nrfOndecoded} from '../scripts/nrf5x'
import { state } from 'react-scomponent';
import { BANGLE_SAMPLE_RATE, code, decodeSensorData, strdecoder, testCode2 } from './bangle';

//import './hacktimer/HackTimer.min.js'

let selectable = {
    BLE:{
        espruino:Devices.BLE.espruino, //when selecting espruino we need to provide the list of names to filter for as an additional selector
        hegduino:Devices.BLE.hegduino,
        hegduino1:Devices.BLE.hegduinoV1,
        nRFCustom:Devices.BLE.nrf5x,
        statechanger:Devices.BLE.statechanger,
        blueberry:Devices.BLE.blueberry,
        blueberry2:Devices.BLE.blueberry2,
        nrf5x:Devices.BLE.nrf5x
    },
    USB:{
        peanut:Devices.USB.peanut,
        hegduino:Devices.USB.hegduino,
        hegduinoV1:Devices.USB.hegduinoV1,
        nrf5x:Devices.USB.nrf5x,
        statechanger:Devices.USB.statechanger
    }
};

//this value is set by device metadata we have, defaulting to BangleJS presets
let currentSPS = BANGLE_SAMPLE_RATE;

let bangleDecodeMode = 0;

//apply these as connect options into initDevice
//this will link things into the app state
let deviceSettings = {
    nrf5x:{ //specific rules
        ondecoded:nrfOndecoded
    },
    espruino:{
        onconnect:(device)=>{
             //This is our custom program for BangleJS
            //console.log(code);
            uploadEspruinoFile(
                device, 
                code,  //testcodestr,
                undefined, 50, 
                (progress)=>{console.log((progress*100).toFixed(2)+'% uploaded.');}, 
                'app.js', true
            );
        },
        ondecoded:(data:any)=>{
            if(bangleDecodeMode === 0) {
                    
                const result = strdecoder(data);
                
                if(result.includes('BEGIN') && !result.includes('println(')) bangleDecodeMode = 1;

                console.log('BANGLE:',result);
                
                state.setState({espruino:result});
            
            } else if (bangleDecodeMode === 1) {

                const result = decodeSensorData(data);
                
                state.setState({espruino:result});

            }
        },
        ondisconnect:()=>{
            bangleDecodeMode = 0; //reset
        }
    },
    others:{
        ondecoded:(data:{
            red?:number,
            ir?:number,
            heg?:number,
            timestamp?:number
        })=>{
            if(data.red || data.heg) {
                //we have heg data from the supported devices
                state.setState({heg:data})
            }
        }
    }
}

//initDevice(selectable.BLE.nrf5x,deviceSettings.nrf5x);

//Devices.BLE.espruino.namePrefix = 'Bangle.js'; //espruinoNames options from device-decoder lib
//initDevice(selectable.BLE.espruino,deviceSettings.espruino);

//initDevice(selectable.BLE.hegduino,deviceSettings.other);


//we are dealing with different sample rates but it is timestamped so we can sort data that way the devices have sample rates assigned but they might not be perfectly accurate and banglejs is variable

//for HEGs we'll decode the heg data, 
//but for the PPGs on bangle and nrf we'll use the ppg data
//todo: custom heg routine using ADS131 output

//TODO: add a heart rate algorithm for the raw data from the non espruino sources, we have one we just need to refine it

state.subscribeEvent('ppg', (data:{raw:number[],filt:number[], timestamp:[]}|{red:number[],ir:number[],timestamp:number[]}) => {
    if('raw' in data) {
        //bangle ppg data array
        //the raw we will treat as heg. assuming it is not DC
    } else if ('red' in data) {
        //nrf ppg data array
        
    }
    console.log("PPG Event", data);
});

state.subscribeEvent('hr',(data:{hr:number[], hrv:number[], timestamp:number[]})=>{
    //banglejs heart rate data
    console.log("HR Event", data);
}); 


state.subscribeEvent('heg', (data:{heg:number, timestamp:number, [key:string]:any}|{heg:number[], timestamp:number[], [key:string]:any}) => { 
 
    //heg data mapped from a device, now apply additional processes
    if(data.heg) {
        let result = {} as any;
        if(Array.isArray(data.heg) || ArrayBuffer.isView(data.heg)) { //peanut might be array I forget
            //array
            let fastAvg = (data.heg as any).map((v) => calculateMovingAverage('fastAvg', v, currentSPS, 2)); //2 second average
            let slowAvg = (data.heg as any).map((v) => calculateMovingAverage('slowAvg', v, currentSPS, 4)); //4 second average
            
            let currentScore = state.data.currentScore || 0;
            
            let scores = new Array((data.heg as any).length);
            let fastMinSlow = fastAvg.map((v,i) => {  //simplistic scoring just to display "effort"
                let gain = v - slowAvg[i]; 
                currentScore += gain; 
                scores[i] = currentScore;
                return gain; 
            });

            result.heg = data.heg;
            result.hegAvg2s = fastAvg;
            result.hegAvg4s = slowAvg;
            result.hegEffort = fastMinSlow;
            result.hegScore = scores;
            result.timestamp = data.timestamp;
            state.data.currentScore = currentScore;
            state.setState({'heg_processed':result});
            //subscribable in state
            schedulePlayback('heg_playback', result, currentSPS); //use this for live feed interactivity, just will be delayed a little    
        
        } else {
            //number
            let fastAvg = calculateMovingAverage('fastAvg', data.heg, currentSPS, 2); //2 second average
            let slowAvg = calculateMovingAverage('slowAvg', data.heg, currentSPS, 4); //4 second average
            
            let currentScore = state.data.hegScore || 0;
            
            let fastMinSlow = fastAvg - slowAvg; //simplistic scoring just to display "effort"
            currentScore += fastMinSlow;

            result.heg = data.heg;
            result.hegAvg2s = fastAvg;
            result.hegAvg4s = slowAvg;
            result.hegEffort = fastMinSlow;
            result.hegScore = currentScore;
            result.timestamp = data.timestamp;
            state.data.currentScore = currentScore;
            state.setState({'heg_processed':result});
            //subscribable in state
            schedulePlayback('heg_playback', result, currentSPS); //use this for live feed interactivity, just will be delayed a little
            
        }


        console.log('HEG Event', data);
    }
    
});


export function resetHEGScore() {
    state.data.hegScore = 0;
}

/**
 * heg_playback
 */

export function subscribeHEGPlayback(
    ondata:(data:{ 
        heg:number[], 
        hegAvg2s:number[], 
        hegAvg4s:number[],
        hegEffort:number[],
        hegScore:number[],
        timestamp:number[]
    })=>void //use this to interact with your application
) {
    return state.subscribeEvent('heg_playback', ondata); //return state number, 
}

//if number not provided it clears all subs(!)
export function unsubscribeHEGPlayback(sub?:number) { return state.unsubscribeEvent('heg_playback', sub); }

let pb = {} as any;

// Playback buffers on animation frame, according to sample rate
export function schedulePlayback(tag, bufferInputDict, sampleRate = currentSPS) {
    // Hidden state initialization
    if (!pb.buffers) pb.buffers = {};
    if (!pb.playing) pb.playing = false;
    if (!pb.frameCounts) pb.frameCounts = {};
    if (!pb.sampleRates) pb.sampleRates = {};

    // Initialize buffers and frame count for the main tag if they don't exist
    if (!pb.buffers[tag]) {
        pb.buffers[tag] = {}; // Initialize as an object for sub-tags
        pb.frameCounts[tag] = 0; // Single frame count for the entire buffer group
        pb.sampleRates[tag] = sampleRate; // Store the sample rate for this tag
    }

    // Initialize buffers for each sub-tag in the dictionary
    Object.keys(bufferInputDict).forEach(subTag => {
        if (!pb.buffers[tag][subTag]) {
            pb.buffers[tag][subTag] = [];
        }

        // Add single value or multiple values to the buffer for each sub-tag
        const bufferInput = bufferInputDict[subTag];
        if (Array.isArray(bufferInput) || ArrayBuffer.isView(bufferInput)) {
            pb.buffers[tag][subTag].push(...(bufferInput as any));
        } else {
            pb.buffers[tag][subTag].push(bufferInput);
        }
    });

    // If playback is not already scheduled, start the animation loop
    if (!pb.playing) {
        let lastFrameTime = performance.now();
        let frameDuration = 1000 / 60; // Assume 60 FPS initially

        const onsample = () => {
            const currentTime = performance.now();
            const elapsed = currentTime - lastFrameTime;
            lastFrameTime = currentTime;

            frameDuration = elapsed; // Adjust based on actual frame duration
            const framesPerSecond = 1000 / frameDuration;

            // Iterate through each tag to process independently
            Object.keys(pb.buffers).forEach(currentTag => {
                const currentSampleRate = pb.sampleRates[currentTag];

                // Calculate how many frames should be skipped between samples for this tag
                const frameSkip = Math.floor(framesPerSecond / currentSampleRate);

                // Increment frame count for this tag
                pb.frameCounts[currentTag]++;

                // Dictionary to store the samples for this frame for the current tag
                const samplesForState = {};

                // Process each buffer in the pb.buffers object for the current tag
                if (pb.frameCounts[currentTag] >= frameSkip) {
                    Object.keys(pb.buffers[currentTag]).forEach(subTag => {
                        const buffer = pb.buffers[currentTag][subTag];
                        if (buffer.length > 0) {
                            const samplesPerFrame = Math.max(1, Math.round(currentSampleRate / framesPerSecond));

                            // Collect samples for this frame
                            const samplesToProcess = buffer.splice(0, samplesPerFrame);
                            samplesForState[subTag] = samplesToProcess; // Store in state dictionary

                            // Check if the buffer is empty after processing the samples
                            if (buffer.length === 0) {
                                delete pb.buffers[currentTag][subTag]; // Remove empty buffer
                            }
                        }
                    });

                    // Reset the frame count after processing
                    pb.frameCounts[currentTag] = 0;
                }

                // Update state with all samples for the current frame under the current tag
                if (Object.keys(samplesForState).length > 0) {
                    state.setState({ [currentTag]: samplesForState }); // subscribe with the current tag
                }

                // Check if there are any remaining buffers to process for the current tag
                if (Object.keys(pb.buffers[currentTag]).length === 0) {
                    delete pb.buffers[currentTag]; // Remove empty tag
                    delete pb.frameCounts[currentTag];
                    delete pb.sampleRates[currentTag];
                }
            });

            // Check if there are any remaining tags to process
            if (Object.keys(pb.buffers).length > 0) {
                pb.playing = requestAnimationFrame(onsample);
            } else {
                pb.playing = false; // Stop if no more buffers
            }
        };

        pb.playing = requestAnimationFrame(onsample);
    }
}

let ma = {} as any;

export function calculateMovingAverage(
    tag: string,
    bufferInput: number | number[] | Float32Array | Int16Array | Uint8Array, // Accept single numbers, regular arrays, and typed arrays
    sps: number,
    maxTimeToAverage: number
) {
    // Hidden state
    if (!ma.buffers) ma.buffers = {};

    // Calculate maximum buffer length based on sps and maxTimeToAverage
    const maxLength = Math.ceil(sps * maxTimeToAverage);

    // Initialize buffer if it doesn't exist
    if (!ma.buffers[tag]) {
        ma.buffers[tag] = [];
    }

    // Add input(s) to the buffer and maintain rolling buffer behavior
    const buffer = ma.buffers[tag];

    // Process input depending on whether it's a single number, regular array, or typed array
    if (Array.isArray(bufferInput) || ArrayBuffer.isView(bufferInput)) {
        // Typed arrays and regular arrays both fall into this case
        buffer.push(...bufferInput);
    } else if (typeof bufferInput === 'number') {
        // Add single numeric input to the buffer
        buffer.push(bufferInput);
    } else {
        console.warn(`Invalid input for tag ${tag}:`, bufferInput);
    }

    // If buffer exceeds maxLength, remove the oldest samples
    while (buffer.length > maxLength) {
        buffer.shift();
    }

    // Safeguard for empty buffer
    if (buffer.length === 0) {
        return 0; // Or handle this case as needed
    }

    // Calculate the moving average
    const sum = buffer.reduce((total, value) => total + value, 0);
    const average = sum / buffer.length;

    return average;
}

export function createDeviceSelector(parentElement=document.body) {

    // Container where we will insert the HTML
    const container = document.createElement('div');

    // Insert BLE device selector
    container.insertAdjacentHTML('beforeend', `
        <h3>Select a BLE Device:</h3>
        <select id="ble-device-selector">
            <option value="">--Select BLE Device--</option>
            <option value="espruino" selected>espruino</option>
            <option value="hegduino">hegduino V2</option>
            <option value="hegduino1">hegduino V1</option>
            <option value="nRFCustom">nRFCustom</option>
            <option value="statechanger">statechanger</option>
            <option value="blueberry">blueberry</option>
            <option value="blueberry2">blueberry2</option>
            <option value="nrf5x">nrf5x</option>
        </select>
    `);

    // Insert Espruino names selector (initially hidden)
    container.insertAdjacentHTML('beforeend', `
        <div id="espruino-name-container" style="">
            <h4>Select Espruino Name:</h4>
            <select id="espruino-name-selector">
                <option value="">--Select Espruino Device--</option>
                ${espruinoNames.map((name, i)=> {return `<option value="${name}" ${i === 0 ? "selected" : ""}>${name}</option>`})}
            </select>
        </div>
    `);

    // Insert USB device selector
    container.insertAdjacentHTML('beforeend', `
        <h3>Or select a USB Device:</h3>
        <select id="usb-device-selector">
            <option value="">--Select USB Device--</option>
            <option value="peanut">peanut</option>
            <option value="hegduino">hegduino</option>
            <option value="hegduinoV1">hegduinoV1</option>
            <option value="nrf5x">nrf5x</option>
            <option value="statechanger">statechanger</option>
        </select>
    `);

    // Insert the button to trigger initDevice
    container.insertAdjacentHTML('beforeend', `
        <button id="init-device-button">Initialize Device</button>
    `);

    parentElement.appendChild(container);

    // Event listener for BLE device selection
    (document.getElementById('ble-device-selector') as HTMLElement).addEventListener('change', (event:any) => {
        const selectedDevice = event.target.value;
        const espruinoNameContainer = document.getElementById('espruino-name-container') as HTMLElement;

        // Show or hide the Espruino name selector based on the selected device
        if (selectedDevice === 'espruino') {
            espruinoNameContainer.style.display = 'block';
        } else {
            espruinoNameContainer.style.display = 'none';
        }
    });

    // Event listener for initializing the device
    (document.getElementById('init-device-button') as HTMLElement).addEventListener('click', async () => {
        const selectedBLEDevice = (document.getElementById('ble-device-selector') as HTMLSelectElement).value;
        const selectedUSBDevice = (document.getElementById('usb-device-selector') as HTMLSelectElement).value;
        const selectedEspruinoName = (document.getElementById('espruino-name-selector') as HTMLSelectElement).value;

        let device;
        let settings;

        if (selectedBLEDevice) {
            device = selectable.BLE[selectedBLEDevice];
            
            currentSPS = selectable.BLE[selectedBLEDevice].sps;
            settings = deviceSettings[selectedBLEDevice];
            if (selectedBLEDevice === 'espruino') {
                device.namePrefix = selectedEspruinoName;
                currentSPS = BANGLE_SAMPLE_RATE; //40ms, adjust 
            }
        } else if (selectedUSBDevice) {
            device = selectable.USB[selectedUSBDevice];
            settings = deviceSettings[selectedUSBDevice];
            currentSPS = selectable.USB[selectedUSBDevice].sps;
        }

        if (device && settings) {
            let deviceStream = await initDevice(device, settings);
            state.setState({device:deviceStream});
        } else {
            console.error('No device selected or invalid settings');
        }
    });

}




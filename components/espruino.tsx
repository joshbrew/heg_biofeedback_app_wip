import React, { Component, createRef } from 'react';
import {
    initDevice,
    Devices,
    //ab2str,
    uploadEspruinoFile,
    writeEspruinoCommand,
    espruinoNames,
} from 'device-decoder';

import { code, decodeSensorData, testcodestr, strdecoder } from '../scripts/bangle';

import Logger from './logger/logger';
import { state } from 'react-scomponent';

interface AppState {
    selectedDevice: string;
    input: string;
    commandType: string;
}

interface AppProps { 
    showLogger?:boolean 
}


let decodeMode = 0; //string decoding, 1 for sensor decoding
let lastBuf:Uint8Array;
let curBuf:Uint8Array;

class Espruino extends Component<AppProps, AppState> {
    loggerRef = createRef<Logger>();
    sendHandler?: () => void;
    resetHandler?: () => void;
    showLogger = true;

    constructor(props: AppProps) {
        super(props);
        this.state = {
            selectedDevice: 'Bangle.js',
            input: '',
            commandType: 'a',
        };
        if(props.showLogger) this.showLogger = true;
    }

    handleConnect = () => {
        initDevice(Devices.BLE.espruino, {
            onconnect: (device) => {
                this.loggerRef.current?.log('Connected!');

                //This is our custom program for BangleJS
                console.log(code);
                uploadEspruinoFile(
                    device, 
                    code,  //testcodestr,
                    undefined, 50, 
                    (progress)=>{console.log((progress*100).toFixed(2)+'% uploaded.');}, 
                    'app.js', true);

                this.sendHandler = () => {
                    if (this.state.input.length < 1) return;
                    if (this.state.commandType === 'a') {
                        writeEspruinoCommand(device, this.state.input);
                    }
                    if (this.state.commandType === 'b') {
                        uploadEspruinoFile(device, this.state.input, undefined, 50, undefined, 'app.js', true);
                    }
                };

                this.resetHandler = () => {
                    writeEspruinoCommand(device, 'reset();');
                };
            },
            ondecoded: (data) => {
                if(decodeMode === 0) {
                    
                    let result = strdecoder(data);
                    if(this.showLogger && result) this.loggerRef.current?.log(result);//.parsedData));
                    
                    if(result.includes('BEGIN') && !result.includes('println(')) decodeMode = 1;
                    
                    state.setState({});
                
                } else if (decodeMode === 1) {

                    const result = decodeSensorData(data);

                    if(this.showLogger && result?.parsedData) this.loggerRef.current?.log(JSON.stringify(result.parsedData));

                    //for rolling buffers with termination bytes
                    // //this.loggerRef.current?.log(data.output);
                    // //console.log(data.output.length, data.output[0], data.output[data.output.length-2],data.output[data.output.length - 1 ]);
                    // if(curBuf && !lastBuf) {
                    //     lastBuf = curBuf;
                    // }

                    // if(lastBuf) {
                    //     const concatenatedArray = new Uint8Array(lastBuf.length + data.output.length);
                    //     concatenatedArray.set(lastBuf, 0);
                    //     concatenatedArray.set(data.output, lastBuf.length);
                    //     curBuf = concatenatedArray;
                    // } else {
                    //     curBuf = data.output;
                    // }

                    // if(curBuf[curBuf.length-2] === 0x0D && curBuf[curBuf.length-1] === 0x0A) { //contains endline /r/n or 0x0D, 0x0A
                    //     //endline
                    //     const result = decodeSensorData({output:curBuf});
                    //     this.loggerRef.current?.log(JSON.stringify(result?.parsedData));
                    //     lastBuf = undefined as any; curBuf = undefined as any;
                    // } else {
                    //     //continue
                    //     lastBuf = curBuf;
                    // }
                }

            }
        });
    };

    render() {
        return (
            <div>
                <button onClick={this.handleConnect}>Connect</button>
                <select
                    value={this.state.selectedDevice}
                    onChange={(e) => {
                        this.setState({ selectedDevice: e.target.value });
                        Devices.BLE.espruino.namePrefix = e.target.value;
                    }}
                >
                    {espruinoNames.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
                {
                    this.showLogger ? <>
                        <Logger ref={this.loggerRef} maxMessages={100} scrollable />
                        <textarea
                            value={this.state.input}
                            onChange={(e) => this.setState({ input: e.target.value })}
                            placeholder="reset(); etc..."
                        />
                        <select
                            value={this.state.commandType}
                            onChange={(e) => this.setState({ commandType: e.target.value })}
                        >
                            <option value="a">Command</option>
                            <option value="b">Program</option>
                        </select>
                        <button onClick={this.sendHandler}>Send</button>
                        <button onClick={this.resetHandler}>Reset</button>
                    </> : null 
                }
            </div>
        );
    }
}

export default Espruino;

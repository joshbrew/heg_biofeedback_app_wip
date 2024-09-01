import React from 'react'
import {sComponent, state as stateHandler} from 'react-scomponent'

import { WGLPlotter } from './plotter/plotter';

import { WebglLineProps } from 'webgl-plot-utils';
import { Widget } from '../util/Widget';

type SensorType = 'heg_playback' | 'heg' | 'emg' | 'ppg' | 'ppg2' | 'breath' | 'hr' | 'accel' | 'compass' | 'env' | 'ecg';

interface ChartProps {
    height?: number | string;
    width?: number | string;
    lines?: { [key: string]: WebglLineProps };
    presets?: SensorType[];
    streamId?: string;
    title?: string;
}

interface ChartState {
    deviceConnected: boolean;
    device?: any;
}



export class Chart extends sComponent<ChartProps, ChartState> {
    
    state = { //synced with global state
        deviceConnected:false,
        device:undefined
    }

    canvas = document.createElement('canvas');
    overlay = document.createElement('canvas');
    plotter:WGLPlotter;
    subscriptions={} as any;
    remote = false;

    lines?:{[key:string]:WebglLineProps};
    presets?:SensorType[];
    streamId?:string;
    title?:string;

    width:any = '100%';
    height:any = '300px';
    sps:number=25;


    constructor(props:{
        height?:number|string,
        width?:number|string
        lines?:{[key:string]:WebglLineProps},
        presets?:SensorType[],
        streamId?:string,
        title?:string,
        sps?:number
    }) {
        super(props as any);

        if(props.height) this.height = props.height;
        if(props.width) this.width = props.width;
        if(props.sps) this.sps = props.sps;
        this.lines = props.lines;
        this.presets = props.presets;
        this.streamId = props.streamId;
        this.title = props.title;
        
    }

    componentDidMount = () => {
        
        this.canvas.className = 'chartMain'
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.backgroundColor = 'black';
        this.overlay.className = 'chartOverlay'
        this.overlay.width = 800;
        this.overlay.height = 600;
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.transform = 'translateY(-100%)';

        let lines = this.lines ? this.lines : this.presets ? {} : {
            hr: { sps: 1, nSec: 10, units: 'bpm' },
            hrv: { sps: 1, nSec: 10, units: 'bpm' },
            breath: { sps: 1, nSec: 10, units: 'bpm' },
            brv: { sps: 1, nSec: 10, units: 'bpm' }
        };

        const updateFreq = this.sps;

        if(this.presets) {
            if(this.presets.includes('heg')) { 
                Object.assign(lines,{
                    heg: { sps: updateFreq, nSec: 10, units: 'heg' }
                });
            }
            if(this.presets.includes('heg_playback')) {
                Object.assign(lines,{
                    heg: { sps: updateFreq, nSec: 10, units: 'heg' },
                    hegAvg4s: { sps: updateFreq, nSec: 10, units: 'heg' },
                    hegEffort: { sps: updateFreq, nSec: 10, units: 'effort' },
                    hegScore: { sps: updateFreq, nSec: 10, units: 'effort' }
                });
            }
            if(this.presets.includes('ppg')) { 
                Object.assign(lines,{
                    raw: { sps: updateFreq, nSec: 10, units: 'ppg' },
                    filt: { sps: updateFreq, nSec: 10, units: 'ppg' },
                });
            }
            if(this.presets.includes('ppg2')) {  //todo: merge with regular ppg
                Object.assign(lines,{
                    red: { sps: updateFreq, nSec: 10, units: 'ppg' },
                    ir: { sps: updateFreq, nSec: 10, units: 'ppg' }
                });
            }
            if(this.presets.includes('accel')) { 
                Object.assign(lines,{
                    x: { sps: updateFreq, nSec: 10, units: 'g' },
                    y: { sps: updateFreq, nSec: 10, units: 'g' },
                    z: { sps: updateFreq, nSec: 10, units: 'g' }
                });
            }
            if(this.presets.includes('compass')) { 
                Object.assign(lines,{
                    //'world' orientation changes
                    x: { sps: updateFreq, nSec: 10, units: 'uT' },
                    y: { sps: updateFreq, nSec: 10, units: 'uT' },
                    z: { sps: updateFreq, nSec: 10, units: 'uT' },
                    dx: { sps: updateFreq, nSec: 10, units: 'uT' },
                    dy: { sps: updateFreq, nSec: 10, units: 'uT' },
                    dz: { sps: updateFreq, nSec: 10, units: 'uT' },
                    heading: { sps: updateFreq, nSec: 10, units: 'deg' }
                });
            }
            if(this.presets.includes('hr')) {
                Object.assign(lines,{
                    hr: { sps: updateFreq, nSec: 10, units: 'bpm' },
                    hrv: { sps: updateFreq, nSec: 10, units: 'bpm' }
                });
            }
            if(this.presets.includes('breath')) {
                Object.assign(lines,{
                    breath: { sps: 1, nSec: 10, units: 'bpm' },
                    brv: { sps: 1, nSec: 10, units: 'bpm' }
                });
            }
            if(this.presets.includes('env')) {
                Object.assign(lines,{
                    temperature: { sps: 1, nSec: 10, units: 'C' },
                    pressure: { sps: 1, nSec: 10, units: 'kPa' },
                    altitude: { sps: 1, nSec: 10, units: 'm' }
                });
            }
        }

        //console.log('making chart with lines', lines);

        //we are appending the canvas and overlay this way so they only need to be transferred once to the plotter thread 
        this.plotter = new WGLPlotter({
            _id:`${Math.floor(Math.random()*10000000)}`,
            canvas:this.canvas,
            overlay:this.overlay,
            lines, //will render all lines unless specified
            generateNewLines:false,
            cleanGeneration:false,
            worker:true,
            mode:  (this.presets?.includes('hr') ||  this.presets?.includes('breath')) ? undefined : 'sweep',
            sweepColor:'green'
        });

        if(this.presets)
            for(let key of this.presets) {
                this.subscriptions[key] = stateHandler.subscribeEvent(this.streamId ? this.streamId+key : key, (data) => {
                    this.plotter.__operator(data);
                    //console.log(key, data);
                });
            }

    }

    componentWillUnmount = () => {
        for(const key in this.subscriptions) {
            stateHandler.unsubscribeEvent(this.streamId ? this.streamId+key : key, this.subscriptions[key]);
        }
        (this.plotter.options.worker as Worker)?.terminate();
        //console.log('unmounted',this.plotter.options)
    }
    
    render() {

        return (
            <Widget
                title={this.title}
                content={
                <div>
                    <div>
                        <div ref={ (ref) => {
                            ref?.appendChild(this.canvas); 
                            ref?.appendChild(this.overlay);
                            /*this is an example of weird reactjs crap*/
                        }}  style={ { height:this.height, width:this.width, maxHeight:this.height, minHeight:this.height, overflow:'hidden' }}>
                    </div>
                    </div>
                </div>
                }
            />
            
        )
    }
}
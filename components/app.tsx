import React, {Component} from 'react'
import Espruino from './espruino'
import { SpotifyControl } from './players/spotify'
import { SoundCloudPlayer } from './players/soundcloud'
import { YouTubePlayer } from './players/youtube'
import {Chart} from './chart/Chart'
import { ShaderPlayer } from './threejs/threeshader'
import { HEGscore } from './hegscore'

export class App extends Component<{},{}> {
    
    render() {
        return (<>
            {/* <Espruino showLogger={false}/> */}
            {/* <SpotifyControl/> */}
            {/* <SoundCloudPlayer/>
            <YouTubePlayer/> */}
            <HEGscore/>
            <ShaderPlayer/>
            <Chart presets={['heg_playback']}/>
            <Chart presets={['hr']}/>
            <Chart presets={['ppg']}/>
        </>)
    }
}
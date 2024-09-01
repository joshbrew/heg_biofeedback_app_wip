import React, {Component, createRef, RefObject} from 'react'
import { THREEShaderHelper, Sounds } from 'threeshaderhelper';

import { subscribeHEGPlayback, unsubscribeHEGPlayback } from '../../scripts/connect';


// Define the types for props and state
interface ShaderPlayerProps {
    canvasWidth?: number;
    canvasHeight?: number;
}
  
interface ShaderPlayerState {
    selectedGeometry: 'plane'|'sphere'|'halfsphere'|'circle'|'vrscreen';
    canvasWidth: number;
    canvasHeight: number;
}

export class ShaderPlayer extends Component<ShaderPlayerProps, ShaderPlayerState> {
    canvasRef: RefObject<HTMLCanvasElement>;
    shaderHelper: THREEShaderHelper;
    sounds: Sounds;

    stateSub:number;
  
    constructor(props: ShaderPlayerProps) {
      super(props);
  
      this.state = {
        selectedGeometry: 'plane',
        canvasWidth: props.canvasWidth || 512,
        canvasHeight: props.canvasHeight || 512,
      };
  
      this.canvasRef = createRef<HTMLCanvasElement>();
      this.sounds = new Sounds();
    }
  
    volume = 100;

    componentDidMount() {
      this.initializeCanvas();

      this.stateSub = subscribeHEGPlayback((data)=>{
        this.volume += data.hegEffort[0];
        if(this.volume > 100) this.volume = 100;
        else if (this.volume < 0) this.volume = 0;
        if((this.shaderHelper.uniforms as any).iHEG) (this.shaderHelper.uniforms as any).iHEG.value = 2*data.heg[0];
        this.sounds.sourceList.forEach((v,i) => {this.sounds.setVolume(i,this.volume/100);});  
      });

    }

    componentWillUnmount(): void {
        unsubscribeHEGPlayback(this.stateSub);
    }
  
    initializeCanvas = () => {
      const canvas = this.canvasRef.current;
      if (!canvas) return; // Early return if ref is not attached yet
  
      canvas.width = this.state.canvasWidth;
      canvas.height = this.state.canvasHeight;
  
      // Instantiate the THREEShaderHelper with the canvas
      this.shaderHelper = new THREEShaderHelper(
        canvas,
        this.sounds,
        THREEShaderHelper.defaultFragment,
        THREEShaderHelper.defaultVertex
      );
  
      this.shaderHelper.createRenderer();
    };
  
    handleGeometryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedGeometry = event.target.value as ShaderPlayerState["selectedGeometry"];
      this.setState({ selectedGeometry });
      this.shaderHelper?.setMeshGeometry(selectedGeometry);
    };
  
    handlePlaySound = () => {
      this.sounds.decodeLocalAudioFile((sourceListIdx) => {
        this.sounds.playSound(sourceListIdx);
      });
    };
  
    render() {
      return (
        <div>
          <button onClick={this.handlePlaySound}>Play Sound</button>
  
          <select
            value={this.state.selectedGeometry}
            onChange={this.handleGeometryChange}
          >
            {['plane', 'sphere', 'halfsphere', 'circle', 'vrscreen'].map(
              (option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              )
            )}
          </select>
  
          <br />
  
          <canvas
            ref={this.canvasRef}
            style={{
              width: `${this.state.canvasWidth}px`,
              height: `${this.state.canvasHeight}px`,
            }}
          ></canvas>
        </div>
      );
    }
  }
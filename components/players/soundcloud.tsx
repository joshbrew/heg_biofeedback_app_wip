import React, { Component, createRef } from 'react';
import { subscribeHEGPlayback, unsubscribeHEGPlayback } from '../../scripts/connect';

interface SoundCloudPlayerProps {
    url?: string;
    autoPlay?: boolean;
    color?: string;
    startTime?: number;
    hideRelated?: boolean;
    showComments?: boolean;
    showUser?: boolean;
    showReposts?: boolean;
    showTeaser?: boolean;
    visual?: boolean;
}

interface SoundCloudPlayerState {
    widget: any;
    volume: number;
    soundCloudUrl: string;
}

export class SoundCloudPlayer extends Component<SoundCloudPlayerProps, SoundCloudPlayerState> {
    private iframeRef = createRef<HTMLIFrameElement>();

    static defaultProps = {
        url: 'https://soundcloud.com/jet5etta/sets/people-under-the-stairs-o-s-t',
        autoPlay: false,
        color: '#ff5500',
        startTime: 0,
        hideRelated: false,
        showComments: true,
        showUser: true,
        showReposts: false,
        showTeaser: true,
        visual: true,
    };

    stateSub:number;

    state: SoundCloudPlayerState = {
        widget: null,
        volume: 100, // Default volume set to 100%
        soundCloudUrl: this.props.url || '',
    };

    componentDidMount() {
        // Initial widget initialization
        this.initializeWidget();

        
        this.stateSub = subscribeHEGPlayback((data)=>{
            this.state.volume += data.hegEffort[0];
            if(this.state.volume > 100) this.state.volume = 100;
            else if (this.state.volume < 0) this.state.volume = 0;
            if(this.state.widget) this.state.widget.setVolume(this.state.volume);
        });
        
    }

    componentWillUnmount() {
        if (this.state.widget) {
            this.state.widget.unbindAll();
        }

        unsubscribeHEGPlayback(this.stateSub);
    }

    initializeWidget = () => {
        const { soundCloudUrl } = this.state;

        if (this.iframeRef.current) {
            this.iframeRef.current.src = this.generateEmbedUrl() || '';

            if ((window as any).SC && typeof (window as any).SC.Widget === 'function') {
                const SCWidget = (window as any).SC.Widget(this.iframeRef.current);
                this.setState({ widget: SCWidget });

                SCWidget.bind((window as any).SC.Widget.Events.READY, () => {
                    const { autoPlay = false, startTime = 0 } = this.props;
                    if (autoPlay) {
                        SCWidget.play();
                    }
                    if (startTime > 0) {
                        SCWidget.seekTo(startTime * 1000);
                    }
                    SCWidget.setVolume(this.state.volume);

                });

                SCWidget.bind((window as any).SC.Widget.Events.FINISH, () => {
                    SCWidget.play(); // Auto-replay on finish if desired
                });
            } else {
                console.error('SC.Widget is not available');
            }
        }
    };

    handlePlay = () => {
        if (this.state.widget) {
            this.state.widget.play();
        }
    };

    handlePause = () => {
        if (this.state.widget) {
            this.state.widget.pause();
        }
    };

    handleSeekTo = (milliseconds: number) => {
        if (this.state.widget) {
            this.state.widget.seekTo(milliseconds);
        }
    };

    handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const volume = parseInt(event.target.value, 10);
        this.setState({ volume });
        if (this.state.widget) {
            this.state.widget.setVolume(volume);
        }
    };

    handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ soundCloudUrl: event.target.value });
    };

    generateEmbedUrl = (): string | null => {
        const {
            color,
            autoPlay,
            hideRelated,
            showComments,
            showUser,
            showReposts,
            showTeaser,
            visual,
        } = this.props;

        const { soundCloudUrl } = this.state;
        const baseUrl = 'https://w.soundcloud.com/player/';
        const encodedUrl = encodeURIComponent(soundCloudUrl);

        return `${baseUrl}?url=${encodedUrl}&color=${encodeURIComponent(color || '#ff5500')}&auto_play=${autoPlay}&hide_related=${hideRelated}&show_comments=${showComments}&show_user=${showUser}&show_reposts=${showReposts}&show_teaser=${showTeaser}&visual=${visual}`;
    };

    render() {
        return (
            <div>
                <input 
                    type="text" 
                    value={this.state.soundCloudUrl} 
                    onChange={this.handleUrlChange} 
                    placeholder="Enter SoundCloud URL" 
                />
                <button onClick={this.initializeWidget}>
                    Load
                </button>
                <iframe 
                    ref={this.iframeRef}
                    width="100%" 
                    height="300"  
                    allow="autoplay" 
                    src={''}  // Initially empty, set dynamically on Load
                ></iframe>
                <div>
                    <button onClick={this.handlePlay}>Play</button>
                    <button onClick={this.handlePause}>Pause</button>
                    <button onClick={() => this.handleSeekTo(30000)}>Seek to 30s</button>
                    <div>
                        <label>
                            Volume: {this.state.volume}%
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={this.state.volume} 
                                onChange={this.handleVolumeChange} 
                            />
                        </label>
                    </div>
                </div>
            </div>
        );
    }
}

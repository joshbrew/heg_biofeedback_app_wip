import React, { Component } from 'react';
import { subscribeHEGPlayback } from '../../scripts/connect';

interface YouTubePlayerProps {
    initialUrl?: string;
    height?: string;
    width?: string;
}

interface YouTubePlayerState {
    player?: any; // We are no longer using the YT.Player type
    done: boolean;
    videoId: string;
    urlInput: string;
    volume: number;
}

declare global {
    interface Window {
        onYouTubeIframeAPIReady: () => void;
        YT: any;
    }
}

export class YouTubePlayer extends Component<YouTubePlayerProps, YouTubePlayerState> {
    stateSub:number;
    static defaultProps = {
        height: '390',
        width: '640',
        initialUrl: 'https://www.youtube.com/watch?v=EO5FZDctsoI', // Default URL
    };

    state = {
        player: undefined as any,
        done: false,
        videoId: '',
        urlInput: '',
        volume: 100, // Initial volume set to 50
    };

    constructor(props: YouTubePlayerProps) {
        super(props);
        
        if(this.props.initialUrl) this.state.urlInput = this.props.initialUrl;
        const videoId = this.extractVideoId(this.props.initialUrl || '');
        this.state.videoId = videoId;

    }

    componentDidMount() {
        if (!window.YT) {
            this.loadYouTubeAPI();
        } else {
            this.onYouTubeIframeAPIReady();
        }

        this.stateSub = subscribeHEGPlayback((data)=>{
            this.state.volume += data.hegEffort[0];
            if(this.state.volume > 100) this.state.volume = 100;
            else if (this.state.volume < 0) this.state.volume = 0;
            if(this.state.player) this.state.player.setVolume(this.state.volume);
        });
    }

    componentDidUpdate(prevProps: YouTubePlayerProps, prevState: YouTubePlayerState) {
        if (prevState.videoId !== this.state.videoId && this.state.player) {
            this.state.player.loadVideoById(this.state.videoId);
        }
        if (prevState.volume !== this.state.volume && this.state.player) {
            this.state.player.setVolume(this.state.volume);
        }
    }

    loadYouTubeAPI = () => {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        window.onYouTubeIframeAPIReady = this.onYouTubeIframeAPIReady;
    }

    onYouTubeIframeAPIReady = () => {
        const { height, width } = this.props;
        const { videoId } = this.state;
        const player = new window.YT.Player('player', {
            height,
            width,
            videoId,
            playerVars: {
                'playsinline': 1,
            },
            events: {
                'onReady': this.onPlayerReady,
                'onStateChange': this.onPlayerStateChange,
            },
        });
        this.setState({ player });
    }

    onPlayerReady = (event: any) => {
        // event.target.playVideo();
        event.target.setVolume(this.state.volume); // Set initial volume when player is ready
    }

    onPlayerStateChange = (event: any) => {
        // if (event.data === window.YT.PlayerState.PLAYING && !this.state.done) {
        //     setTimeout(this.stopVideo, 6000);
        //     this.setState({ done: true });
        // } //e.g.
    }

    stopVideo = () => {
        this.state.player?.stopVideo();
    }

    extractVideoId = (url: string): string => {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
            return urlObj.searchParams.get('v') || '';
        } else if (urlObj.hostname === 'youtu.be') {
            return urlObj.pathname.substring(1);
        }
        return '';
    }

    handleUrlInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({ urlInput: event.target.value });
    }

    handleLoadVideo = () => {
        const videoId = this.extractVideoId(this.state.urlInput);
        this.setState({ videoId });
    }

    handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const volume = parseInt(event.target.value, 10);
        this.setState({ volume });
    }

    render() {
        return (
            <div>
                <input
                    type="text"
                    value={this.state.urlInput}
                    onChange={this.handleUrlInputChange}
                    placeholder="Enter YouTube URL"
                />
                <button onClick={this.handleLoadVideo}>Load Video</button>
                <div id="player"></div>
                <button onClick={() => this.state.player?.playVideo()}>Play</button>
                <button onClick={this.stopVideo}>Stop</button>
                <div>
                    <label htmlFor="volume-control">Volume: {this.state.volume}</label>
                    <input
                        id="volume-control"
                        type="range"
                        min="0"
                        max="100"
                        value={this.state.volume}
                        onChange={this.handleVolumeChange}
                    />
                </div>
            </div>
        );
    }
}

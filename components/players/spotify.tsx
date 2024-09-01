import React, { useState } from 'react';
import { sComponent, state } from 'react-scomponent';

let frame;
let controller;

let getter = new Promise((res,rej) => {
    (window as any).onSpotifyIframeApiReady = (IFrameAPI) => {
        frame = IFrameAPI;
        console.log('Spotify IFrame API ready:', frame);
        res(true);
    }; 
});

// Insert the Spotify IFrame API script by default (not functioning for some reason)
// document.body.insertAdjacentHTML('beforeend', `
//     <script src="https://open.spotify.com/embed/iframe-api/v1"></script>
// `);


export class SpotifyControl extends sComponent {

    state = {
        spotifyUrl: '',
    };

    constructor(props) {
        super(props);
    }

    async componentDidMount() {
        await getter;
        if (frame) {
            const element = document.getElementById('embed-iframe');
            const options = {
                width: '100%',
                height: '160',
                uri: 'spotify:episode:7makk4oTQel546B0PZlDM5', // Default URI
            };
            const callback = (EmbedController) => {
                controller = EmbedController;
                console.log('EmbedController:', controller);
            };
            frame.createController(element, options, callback);
        }
    }

    componentWillUnmount() {
        (window as any).onSpotifyIframeApiReady = null;
    }

    handleSubmit = (e) => {
        e.preventDefault();
        if (controller && this.state.spotifyUrl) {
            const uri = this.convertUrlToUri(this.state.spotifyUrl);
            if (uri) {
                controller.loadUri(uri);
                console.log(`Loading URI: ${uri}`);
            } else {
                console.error('Invalid Spotify URL');
            }
        }
    }

    convertUrlToUri(url) {
        const match = url.match(/https:\/\/open\.spotify\.com\/(track|album|playlist|episode|show)\/(\w+)/);
        if (match) {
            return `spotify:${match[1]}:${match[2]}`;
        }
        return null;
    }

    handleChange = (e) => {
        this.setState({ spotifyUrl: e.target.value });
    }

    render() {
        return (
            <>
                <form onSubmit={this.handleSubmit}>
                    <input
                        type="text"
                        value={this.state.spotifyUrl}
                        onChange={this.handleChange}
                        placeholder="Enter Spotify URL"
                    />
                    <button type="submit">Load</button>
                </form>
                <div id="embed-iframe"></div>
            </>
        );
    }
}

import React, {Component, createRef, RefObject} from 'react'
import { resetHEGScore, subscribeHEGPlayback, unsubscribeHEGPlayback } from '../scripts/connect';

export class HEGscore extends Component {
    currentRef:RefObject<HTMLSpanElement>;
    sub:number;
    constructor(props) {
        super(props);
        this.currentRef = createRef<HTMLSpanElement>();
    }

    componentDidMount(): void {
        this.sub = subscribeHEGPlayback((data)=>{
            if(this.currentRef.current) this.currentRef.current.innerText = `${data.hegScore[0]}`;
        });
    }

    componentWillUnmount(): void {
        unsubscribeHEGPlayback(this.sub);
    }

    reset() {
        resetHEGScore();
    }

    render() {
        return (
            <>
                <span>Current Score: <span ref={this.currentRef}></span>&nbsp;<button onClick={this.reset}>Reset</button></span>
            </>
        );
    }
}
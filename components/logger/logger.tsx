import React, { Component } from 'react';

//esbuild will compile this into a master css file
import './logger.css'

interface LoggerProps {
    maxMessages?: number;
    scrollable?: boolean;
}

class Logger extends Component<LoggerProps> {
    static defaultProps = {
        maxMessages: 20,
        scrollable: true,
    };

    private tbodyRef: React.RefObject<HTMLTableSectionElement>;

    constructor(props: LoggerProps) {
        super(props);
        this.tbodyRef = React.createRef();
    }

    log = (message: string) => {
        const { maxMessages } = this.props;
        const tbody = this.tbodyRef.current;
        
        if (tbody) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.textContent = message;
            tr.appendChild(td);
            
            tbody.appendChild(tr);
            
            if (maxMessages && tbody.children.length > maxMessages) {
                tbody.removeChild(tbody.children[0]);
            }
            
            if (this.props.scrollable && this.props.scrollable === true) {
                tbody.parentElement?.scrollTo(0, tbody.scrollHeight);
            }
        }
    };

    render() {
        return (
            <div style={{ overflowY: this.props.scrollable ? 'auto' : 'hidden' }} className="loggerscroll">
                <table>
                    <tbody ref={this.tbodyRef}>
                        {/* Messages will be added dynamically */}
                    </tbody>
                </table>
            </div>
        );
    }
}

export default Logger;

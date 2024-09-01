import React, {Component} from 'react'
import { Card } from 'react-bootstrap'

export class Widget extends Component<{
    className?:string,
    content?:any, 
    style?:any
    title?:any,
    header?:any,
    subtitle?:any
}> {
    
    render() {
        return (
            <Card style={ this.props.style } className={ this.props.className }>
                { this.props.header ? <Card.Header>{this.props.header}</Card.Header> : null}
                <Card.Body style={{padding:'5px'}}>
                { this.props.title ? <Card.Title>{this.props.title}</Card.Title> : null}
                { this.props.subtitle ? <Card.Subtitle >{this.props.subtitle}</Card.Subtitle > : null}
                { this.props.content }
                </Card.Body>
            </Card>
        )
    }
}
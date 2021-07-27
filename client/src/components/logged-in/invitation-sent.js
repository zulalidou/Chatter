import React from 'react'
import "../../styles/invitation-sent.css"


class InvitationSent extends React.Component {
    constructor(props) {
        super(props)
    }


    render() {
        return (
            <div className="invitation-sent-container">
                {/* The purpose of the div immediately below is to provide a slightly dark background for when this component becomes visible */}
                <div className="dark-background" onClick={this.props.closeComponent}>
                </div>

                <form className="invitation-sent-form">
                    <div className="is-form-top">
                        <div className="is-form-title">
                            <h2>Invitation Sent</h2>
                        </div>

                        <div className="is-form-closer">
                            <button className="is-close-form-btn" type="button" onClick={this.props.closeComponent}>&#10006;</button>
                        </div>
                    </div>

                    <hr/>

                    <div className="is-form-middle">
                        <p>An invitation has been sent to <strong>{this.props.recipient}</strong></p>
                    </div>

                    <div className="is-form-bottom">
                        <div className="is-form-bottom-container">
                            <button className="is-form-bottom-btn" type="button" onClick={this.props.closeComponent}>Close</button>
                        </div>
                    </div>
                </form>
            </div>
        )
    }
}


export default InvitationSent

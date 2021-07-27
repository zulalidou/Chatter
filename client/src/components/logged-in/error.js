import React from "react"
import "../../styles/error.css"


class Error extends React.Component {
    constructor() {
        super()
    }

    render() {
        return (
            <div className="error-container-div">
                <div className="dark-background">
                </div>

                <div className="error-container">
                    <div className="ec-top">
                        <div className="ec-title">
                            <h3>Internal Error</h3>
                        </div>

                        <div className="ec-closer">
                            <button className="ec-close-container-btn" type="button" onClick={this.props.closeComponent}>&#10006;</button>
                        </div>
                    </div>

                    <hr/>

                    <div className="ec-middle">
                        <p>An unexpected problem was encountered. Here are a few things you can try:</p>
                        <p><span className="bullet-point-span">&#8226;</span> Reload the page</p>
                        <p><span className="bullet-point-span">&#8226;</span> If you're logged into your account, try logging out and logging back in</p>
                        <p><span className="bullet-point-span">&#8226;</span> Wait and try again later</p>
                    </div>

                    <div className="ec-bottom">
                        <div className="ec-bottom-container">
                            <button className="ec-bottom-btn" type="button" onClick={this.props.closeComponent}>Close</button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}


export default Error

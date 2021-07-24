import React from "react"
import { Redirect } from "react-router-dom"

import "../../styles/password-successfully-reset.css"


class PasswordSuccessfullyReset extends React.Component {
    constructor() {
        super()

        this.state = {
            redirect: null
        }
    }


    render() {
        if (this.state.redirect)
            return <Redirect to='/login'/>

        return (
            <div className="password-successfully-reset-container">
                <div className="psr-title-container">
                    <h2>Your password has been reset</h2>
                </div>

                <div className="psr-body">
                    <p>Your password has been successfully reset. You can now log in with it.</p>
                    <button onClick={() => this.setState({redirect: '/login'})}>Log in</button>
                </div>
            </div>
        )
    }
}


export default PasswordSuccessfullyReset

import React from 'react'
import { Redirect } from "react-router-dom"
import SetNewPassword from "./set-new-password.js"
import PasswordSuccessfullyReset from "./password-successfully-reset.js"

import Error from "../logged-in/error.js"
import Cookies from "js-cookie"
import "../../styles/reset-password.css"


class ResetPassword extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            showDefaultComponent: true,
            showSetNewPasswordComponent: false,
            showPasswordSuccessfullyResetComponent: false,
            displayError: false
        }

        console.log('Reset PASSWORD')
        this.verifyCode = this.verifyCode.bind(this)
        this.hideErrorMessages = this.hideErrorMessages.bind(this)
        this.resendCode = this.resendCode.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
        this.setPasswordResetSuccessful = this.setPasswordResetSuccessful.bind(this)
        this.handleKeyPress = this.handleKeyPress.bind(this)
    }


    async verifyCode() {
        console.log('verify()')
        this.hideErrorMessages()

        const code = document.getElementById('rp-code-input').value
        console.log(code)

        if (code === '') {
            document.getElementById('rp-error-message').innerHTML = "This field is required"
            document.getElementById('rp-error-message').style.visibility = "visible"
            return
        }


        const response = await fetch(`/api/verify-password-reset-code?email=${this.props.location.state.email}&code=${code}`)
        const result = await response.text()

        console.log(result)

        if (result === 'Failure') {
            document.getElementById('rp-error-message').innerHTML = "Please enter the code sent to your email address"
            document.getElementById('rp-error-message').style.visibility = "visible"
        }
        else
            this.setState({showSetNewPasswordComponent: true, showDefaultComponent: false})
    }


    hideErrorMessages() {
        console.log('hideErrorMessages()')
        document.getElementById('rp-error-message').style.visibility = "hidden"
    }


    resendCode() {
        document.getElementById("code-sent-div").style.visibility = "visible"

        fetch('/api/send-password-reset-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({email: this.props.location.state.email})
        })

        setTimeout(() => {document.getElementById("code-sent-div").style.visibility = "hidden"}, 3000)
    }


    toggleErrorComponent() {
        console.log("toggleErrorComponent()")
        this.setState({displayError: !this.state.displayError})
    }


    setPasswordResetSuccessful() {
        this.setState({showPasswordSuccessfullyResetComponent: true, showSetNewPasswordComponent: false})
    }


    handleKeyPress(event) {
        if (event.key === 'Enter') {
            event.preventDefault()
            this.verifyCode()
        }
    }


    render() {
        console.log(this.state)

        if (Cookies.get("jwtHP") !== undefined) {
            console.log("yeet")
            return <Redirect to="/home"/>
        }

        if (this.props.location.state === undefined)
            return <Redirect to="/forgot-password"/>

        return (
            <div className="reset-password-container">
                <form className="rp-form">
                    {
                        this.state.showDefaultComponent &&

                        <div>
                            <div className="rp-title-container">
                                <h2>Reset Your Password</h2>
                            </div>

                            <div className="rp-body">
                                <p>A code has been sent to <strong>{this.props.location.state.email}</strong>.
                                Please enter that code into the box below in order to reset you password.</p>

                                <input className="rp-input" id='rp-code-input' type="number" placeholder="Enter the code" onKeyPress={this.handleKeyPress}/>
                                <p id='rp-error-message'>Please fill in this field</p>


                                <button className="resend-rp-code-btn" type="button" onClick={this.resendCode}>
                                    Didn't get the email? Click here to resend it
                                </button>

                                <div id="code-sent-div">Another code has been sent to your email address</div>

                                <button className="rp-btn" type="button" onClick={this.verifyCode}>Submit</button>
                            </div>
                        </div>
                    }

                    {
                        this.state.showSetNewPasswordComponent &&

                        <SetNewPassword email={this.props.location.state.email} displayError={this.toggleErrorComponent} setPasswordResetSuccessful={this.setPasswordResetSuccessful}/>
                    }

                    {
                        this.state.showPasswordSuccessfullyResetComponent &&

                        <PasswordSuccessfullyReset/>
                    }
                </form>

                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent}/>}
            </div>
        )
    }
}


export default ResetPassword

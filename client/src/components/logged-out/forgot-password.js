import React from 'react'
import { Redirect } from "react-router-dom"
import Cookies from "js-cookie"

import "../../styles/forgot-password.css"


class ForgotPassword extends React.Component {
    constructor(props) {
        super(props)

        console.log('FORGOT PASSWORD')
        this.sendPasswordResetEmail = this.sendPasswordResetEmail.bind(this)
        this.hideErrorMessages = this.hideErrorMessages.bind(this)
        this.isValid = this.isValid.bind(this)
        this.handleKeyPress = this.handleKeyPress.bind(this)
    }


    async sendPasswordResetEmail() {
        console.log('sendPasswordResetEmail()')
        this.hideErrorMessages()

        const email = document.getElementById('fp-email-input').value
        console.log(email)

        if (email === '') {
            document.getElementById('fp-error-msg').innerHTML = "This field is required"
            document.getElementById('fp-error-msg').style.visibility = "visible"
            return
        }

        if (!this.isValid(email)) {
            document.getElementById('fp-error-msg').innerHTML = "This is not a valid email address"
            document.getElementById('fp-error-msg').style.visibility = "visible"
            return
        }


        fetch('/api/send-password-reset-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({email: email})
        })

        this.props.history.push({
            pathname: '/reset-password',
            state: {
                email: email
            }
        })
    }


    hideErrorMessages() {
        document.getElementById("fp-error-msg").style.visibility = "hidden"
    }


    isValid(email) {
        const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        return re.test(email)
    }


    handleKeyPress(event) {
        if (event.key === 'Enter') {
            event.preventDefault()
            this.sendPasswordResetEmail()
        }
    }


    render() {
        if (Cookies.get("jwtHP") !== undefined) {
            console.log("yeet")
            return <Redirect to="/home"/>
        }
        
        return (
            <div className="forgot-password-container">
                <form className="fp-form">
                    <div className="fp-title-container">
                        <h2>Forgot Your Password?</h2>
                    </div>

                    <div className="fp-body">
                        <label htmlFor="fp-email-input">Enter your email address</label>
                        <input type="email" id="fp-email-input" onKeyPress={this.handleKeyPress} required/>
                        <p id='fp-error-msg'>This field is required</p>
                        <button className="fp-btn" type="button" onClick={this.sendPasswordResetEmail}>Send code</button>
                    </div>
                </form>
            </div>
        )
    }
}


export default ForgotPassword

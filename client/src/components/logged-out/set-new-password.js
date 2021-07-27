import React from "react"

import "../../styles/set-new-password.css"


class SetNewPassword extends React.Component {
    constructor() {
        super()

        this.resetPassword = this.resetPassword.bind(this)
        this.hideErrorMessages = this.hideErrorMessages.bind(this)
    }


    async resetPassword() {
        this.hideErrorMessages()

        const password1 = document.getElementById('snp-password-input-1').value
        const password2 = document.getElementById('snp-password-input-2').value

        if (password1 === "") {
            document.getElementById('snp-error-message-1').innerHTML = "This field is required"
            document.getElementById('snp-error-message-1').style.visibility = 'visible'
        }

        if (password2 === "") {
            document.getElementById('snp-error-message-2').innerHTML = "This field is required"
            document.getElementById('snp-error-message-2').style.visibility = 'visible'
        }

        if (password1 === "" || password2 === "")
            return


        if (password1.length < 8) {
            document.getElementById('snp-error-message-1').innerHTML = "Needs to be at least 8 characters"
            document.getElementById('snp-error-message-1').style.visibility = 'visible'
            return
        }

        if (password2.length < 8) {
            document.getElementById('snp-error-message-2').innerHTML = "Needs to be at least 8 characters"
            document.getElementById('snp-error-message-2').style.visibility = 'visible'
            return
        }


        if (password1 !== password2) {
            document.getElementById('snp-error-message-2').innerHTML = "The passwords do not match"
            document.getElementById('snp-error-message-2').style.visibility = 'visible'
            return
        }


        const response = await fetch('/api/set-new-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({password: password1, email: this.props.email})
        })

        if (response.status !== 200) {
            this.props.displayError()
            return
        }

        this.props.setPasswordResetSuccessful()
    }


    hideErrorMessages() {
        document.getElementById('snp-error-message-1').style.visibility = "hidden"
        document.getElementById('snp-error-message-2').style.visibility = "hidden"
    }


    render() {
        return (
            <div className="set-new-password-form">
                <div className="snp-title-container">
                    <h2>Enter your new password</h2>
                </div>

                <div className="snp-body">
                    <label htmlFor="snp-password-input-1">Enter your new password</label>
                    <input className="snp-input" id="snp-password-input-1" type="password"/>
                    <p className="snp-error-message" id="snp-error-message-1">Please fill in this field</p>

                    <label htmlFor="snp-password-input-2">Re-enter your new password</label>
                    <input className="snp-input" id="snp-password-input-2" type="password" />
                    <p className="snp-error-message" id="snp-error-message-2">Please fill in this field</p>

                    <button className="snp-btn" type="button" onClick={this.resetPassword}>Submit</button>
                </div>
            </div>
        )
    }
}


export default SetNewPassword

import React from "react"
import { Redirect } from "react-router-dom"
import Cookies from "js-cookie"

import Error from "../logged-in/error.js"
import "../../styles/activate-account.css"


class ActivateAccount extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            accountActivated: false,
            redirect: null,
            displayError: false
        }

        console.log(this.props)

        this.resendCode = this.resendCode.bind(this)
        this.verifyCode = this.verifyCode.bind(this)
        this.hideErrorMessages = this.hideErrorMessages.bind(this)
        this.handleKeyPress = this.handleKeyPress.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    async resendCode() {
        document.getElementById("aa-code-sent-div").style.visibility = "visible"

        const response = await fetch('/api/send-account-activation-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({email: this.props.location.state.email})
        })


        if (response.status !== 200) {
            this.setState({displayError: true})
            return
        }

        setTimeout(() => {document.getElementById("aa-code-sent-div").style.visibility = "hidden"}, 3000)
    }


    async verifyCode() {
        console.log('verify()')
        this.hideErrorMessages()

        const code = document.getElementById('aa-code-input').value.trim()

        if (code === '') {
            document.getElementById('aa-error-message').innerHTML = "This field is required"
            document.getElementById('aa-error-message').style.visibility = "visible"
            return
        }


        console.log(this.props.location.state.email)
        console.log(code)

        const response = await fetch(`/api/verify-account-activation-code?email=${this.props.location.state.email}&code=${code}`)
        console.log(response)

        if (response.status !== 200) {
            const errorMsg = await response.text()

            if (errorMsg === "An error occurred")
                this.setState({displayError: true})
            else {
                document.getElementById('aa-error-message').innerHTML = "Please enter the code sent to your email"
                document.getElementById('aa-error-message').style.visibility = "visible"
            }
        }
        else
            this.setState({accountActivated: true})
    }


    hideErrorMessages() {
        document.getElementById('aa-error-message').style.visibility = "hidden"
    }


    handleKeyPress(event) {
        if (event.key === 'Enter') {
            event.preventDefault()
            this.verifyCode()
        }
    }


    toggleErrorComponent() {
        console.log("toggleErrorComponent()")
        this.setState({displayError: !this.state.displayError})
    }


    render() {
        if (Cookies.get("jwtHP") !== undefined) {
            console.log("yeet")
            return <Redirect to="/home"/>
        }

        if (this.state.redirect) {
            return <Redirect to={{
                pathname: '/login'
            }} />
        }

        if (this.props.location.state === undefined)
            return <Redirect to="/signup"/>

        return (
            <div className="activate-account-container">
                <form className="aa-form">
                    {
                        this.state.accountActivated === true ?

                        <div className="aa-form-inner-container-1">
                            <div className="title-container">
                                <h2>Account activated</h2>
                            </div>

                            <div className="aa-form-inner-container-1-body">
                                <p>Your new account with Chatter has been created! Use your email and password to log into your account.</p>
                                <button className="aa-btn" onClick={() => this.setState({redirect: '/login'})}>Log In</button>
                            </div>
                        </div>

                        :

                        <div className="aa-form-inner-container-2">
                            <div className="title-container">
                                <h2>Enter the activation code</h2>
                            </div>

                            <div className="aa-form-inner-container-2-body">
                                <p>A code has been sent to <strong>{this.props.location.state.email}</strong>.
                                   Please enter that code into the box below in order to complete the registration process.</p>

                                <input id='aa-code-input' type="number" placeholder="Enter the code" autoComplete="off" onKeyPress={this.handleKeyPress}/> <br/>
                                <p id='aa-error-message'>Please fill in this field</p>


                                <button className="resend-aa-code-btn" type="button" onClick={this.resendCode}>
                                    Didn't get the email? Click here to resend it
                                </button>

                                <div id="aa-code-sent-div">Another code has been sent to your email address</div>

                                <button className="aa-btn" type="button" onClick={this.verifyCode}>Activate</button>
                            </div>
                        </div>
                    }

                </form>

                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent}/>}
            </div>
        )
    }
}


export default ActivateAccount

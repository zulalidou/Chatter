import React from "react"
import { Link, Redirect } from "react-router-dom"

import Error from "../logged-in/error.js"
import Cookies from "js-cookie"

import "../../styles/signup.css"


class Signup extends React.Component {
    constructor() {
        super()

        this.state = {
            displayError: false
        }

        console.log('Sign up component called')
        this.validateForm = this.validateForm.bind(this)
        this.hideErrorMessages = this.hideErrorMessages.bind(this)
        this.isEmpty = this.isEmpty.bind(this)
        this.isValid = this.isValid.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    async validateForm() {
        this.hideErrorMessages()

        const name = document.getElementById("signup-name-input").value
        const username = document.getElementById("signup-username-input").value
        const email = document.getElementById("signup-email-input").value.toLowerCase()
        const password = document.getElementById("signup-password-input").value

        const nameEmpty = this.isEmpty(name, "signup-error-msg-1")
        const usernameEmpty = this.isEmpty(username, "signup-error-msg-2")
        const emailEmpty = this.isEmpty(email, "signup-error-msg-3")
        const passwordEmpty = this.isEmpty(password, "signup-error-msg-4")

        console.log(name)
        console.log(username)
        console.log(email)
        console.log(password)

        if (nameEmpty || usernameEmpty || emailEmpty || passwordEmpty)
            return


        if (username.length < 6) {
            document.getElementById('signup-error-msg-2').innerHTML = "Needs to be at least 6 characters"
            document.getElementById('signup-error-msg-2').style.visibility = "visible"
            return
        }

        if (!this.isValid(email)) {
            document.getElementById('signup-error-msg-3').innerHTML = "This is not a valid email address"
            document.getElementById('signup-error-msg-3').style.visibility = "visible"
            return
        }

        if (password.length < 8) {
            document.getElementById('signup-error-msg-4').innerHTML = "The password must be at least 8 characters long"
            document.getElementById('signup-error-msg-4').style.visibility = "visible"
            return
        }



        const response = await fetch("/api/signup", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({name: name, username: username, email: email, password: password})
        })


        console.log(response)
        const responseMsg = await response.text()
        console.log(responseMsg)

        if (response.status !== 200) {
            if (responseMsg === "Username taken") {
                document.getElementById('signup-error-msg-2').innerHTML = "This username is already taken"
                document.getElementById('signup-error-msg-2').style.visibility = "visible"
                return
            }

            if (responseMsg === "Email taken") {
                document.getElementById('signup-error-msg-3').innerHTML = "This email is already taken"
                document.getElementById('signup-error-msg-3').style.visibility = "visible"
                return
            }

            this.setState({displayError: true})
            return
        }


        this.props.history.push({
            pathname: '/activate-account',
            state: {
                email: email
            }
        })
    }


    hideErrorMessages() {
        document.getElementById("signup-error-msg-1").style.visibility = "hidden"
        document.getElementById("signup-error-msg-2").style.visibility = "hidden"
        document.getElementById("signup-error-msg-3").style.visibility = "hidden"
        document.getElementById("signup-error-msg-4").style.visibility = "hidden"
    }


    isEmpty(value, containerName) {
        if (value === "") {
            document.getElementById(containerName).style.visibility = "visible"
            return true
        }

        return false
    }


    isValid(email) {
        const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        return re.test(email)
    }


    toggleErrorComponent() {
        console.log("toggleErrorComponent()")
        this.setState({displayError: !this.state.displayError})
    }


    render() {
        console.log('render() called')

        if (Cookies.get("jwtHP") !== undefined) {
            console.log("yeet")
            return <Redirect to="/home"/>
        }

        return (
            <div className="signup-container">
                <form className="signup-form">
                    <div className="sf-title-container">
                        <h2>Create an account</h2>
                    </div>

                    <div className="sf-body">
                        <div className="sf-name-container">
                            <label htmlFor="signup-name-input">Your name</label>
                            <br/>
                            <input type="text" className="signup-input" id="signup-name-input" autoComplete="off" required/>
                            <div id="signup-error-msg-1">Please fill out this field</div>
                        </div>

                        <div className="sf-username-container">
                            <label htmlFor="signup-username-input">Username</label>
                            <br/>
                            <input type="text" className="signup-input" id="signup-username-input" autoComplete="off" required/>
                            <div id="signup-error-msg-2">Please fill out this field</div>
                        </div>

                        <div className="sf-email-container">
                            <label htmlFor="signup-email-input">Email</label>
                            <br/>
                            <input type="email" className="signup-input" id="signup-email-input" autoComplete="off" required/>
                            <div id="signup-error-msg-3">Please fill out this field</div>
                        </div>

                        <div className="sf-password-container">
                            <label htmlFor="signup-password-input">Password</label>
                            <br/>
                            <input type="password" className="signup-input" id="signup-password-input" autoComplete="off" required/>
                            <div id="signup-error-msg-4">Please fill out this field</div>
                        </div>

                        <button className="signup-btn" type="button" onClick={this.validateForm}>Sign Up</button>

                        <hr/>

                        <div className="center-item">
                            <Link to="/login" className="signup-form-link">Already have an account? Log in here</Link>
                        </div>
                    </div>
                </form>

                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent}/>}
            </div>
        )
    }
}

export default Signup

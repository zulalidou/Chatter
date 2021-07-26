import React from 'react'
import { Link, Redirect } from "react-router-dom"
import Cookies from "js-cookie"

import "../../styles/login.css"


class Login extends React.Component {
    constructor(props) {
        super(props)
        this.login = this.login.bind(this)
        this.hideErrorMessages = this.hideErrorMessages.bind(this)
    }


    async login() {
        this.hideErrorMessages()

        const email = document.getElementById("lf-email-input").value
        const password = document.getElementById("lf-password-input").value

        let isFormFilled = true

        if (email === "") {
            isFormFilled = false
            document.getElementById('login-error-msg-1').style.visibility = "visible"
        }

        if (password === "") {
            isFormFilled = false
            document.getElementById('login-error-msg-2').style.visibility = "visible"
            document.getElementById('login-error-msg-2').innerText = "This field is required"
        }

        if (!isFormFilled)
            return



        // const headers = new Headers()
        // headers.append('Content-Type', 'application/json')
        // headers.append('Accept', 'application/json')

        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({email: email, password: password})
        })

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            document.getElementById('login-error-msg-2').style.visibility = "visible"
            document.getElementById('login-error-msg-2').innerText = "Incorrect email and/or password"
            return
        }

        console.log(response)
        console.log(document.cookie)
        console.log(Cookies.get("jwtHP"))
        console.log("about to head to the /home page")

        this.props.history.push("/home")
    }


    hideErrorMessages() {
        document.getElementById('login-error-msg-1').style.visibility = "hidden"
        document.getElementById('login-error-msg-2').style.visibility = "hidden"
    }


    render() {
        if (Cookies.get("jwtHP") !== undefined) {
            console.log("yeet")
            return <Redirect to="/home"/>
        }

        return (
            <div className="login-container">
                <form className="login-form">
                    <div className="lf-title-container">
                        <h2>Log In</h2>
                    </div>

                    <div className="lf-body">
                        <div className="lf-email-container">
                            <label htmlFor="lf-email-input">Email</label>
                            <br/>
                            <input type="email" name="email" className="login-input" id="lf-email-input" required/>
                            <p id="login-error-msg-1">This field is required</p>
                        </div>

                        <div className="lf-password-container">
                            <label htmlFor="lf-password-input">Password</label>
                            <br/>
                            <input type="password" name="password" className="login-input" id="lf-password-input" required/>
                            <p id="login-error-msg-2">This field is required</p>
                            <Link to="/forgot-password" className="login-form-link">Forgot Password?</Link>
                        </div>

                        <button type="button" className="login-btn" onClick={this.login}>Log In</button>

                        <hr/>

                        <div className="center-item">
                            <Link to="/signup" className="login-form-link">Create an account</Link>
                        </div>
                    </div>
                </form>
            </div>
        )
    }
}


export default Login

import React from 'react'
import { v4 as uuidv4 } from 'uuid'
import "../../styles/modify-profile-info.css"


class ModifyProfileInfo extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            showPopupMenu: false
        }

        console.log('ModifyProfileInfo component')
        this.modifyInfo = this.modifyInfo.bind(this)
        this.hideErrorMessages = this.hideErrorMessages.bind(this)
        this.inputIsValid = this.inputIsValid.bind(this)
        this.passwordIsValid = this.passwordIsValid.bind(this)
        this.setUserInfo = this.setUserInfo.bind(this)
        this.togglePopupMenu = this.togglePopupMenu.bind(this)
    }


    async modifyInfo(attribute) {
        console.log('modifyInfo() called')
        this.hideErrorMessages()

        const newValue = document.getElementById("newValue-input").value.trim()
        const password = document.getElementById("password-input").value

        if (!this.inputIsValid(attribute, newValue, password))
            return


        const passwordValid = await this.passwordIsValid(password)

        if (passwordValid === "ERROR-OCCURRED" || !passwordValid)
            return


        const result = await this.setUserInfo(attribute, newValue)

        if (result === "ERROR-OCCURRED")
            return


        if (attribute !== "password")
            this.props.updateInfo(attribute, newValue)

        this.setState({showPopupMenu: false})
    }


    hideErrorMessages() {
        document.getElementById("mpi-attribute-label").innerText = this.props.attribute.toUpperCase()
        document.getElementById("mpi-password-label").innerText = "CURRENT PASSWORD"
    }


    inputIsValid(attribute, newValue, password) {
        console.log(attribute)
        console.log(newValue)
        console.log(password)

        if (newValue === "") {
            const errorTag = document.createElement("span")
            const text = document.createTextNode(" - This field is required")
            errorTag.className = "error-message-profile"
            errorTag.appendChild(text)

            document.getElementById("mpi-attribute-label").innerHTML = attribute.toUpperCase() + errorTag.outerHTML
            return false
        }

        if (attribute === "password" && newValue.length < 8) {
            const errorTag = document.createElement("span")
            const text = document.createTextNode(" - Needs to be at least 8 characters")
            errorTag.className = "error-message-profile"
            errorTag.appendChild(text)

            document.getElementById("mpi-attribute-label").innerHTML = "PASSWORD" + errorTag.outerHTML
            return false
        }

        if (password === "") {
            const errorTag = document.createElement("span")
            const text = document.createTextNode(" - Password is incorrect")
            errorTag.className = "error-message-profile"
            errorTag.appendChild(text)

            document.getElementById("mpi-password-label").innerHTML = "CURRENT PASSWORD" + errorTag.outerHTML
            return false
        }

        return true
    }


    async passwordIsValid(password) {
        const response = await fetch(`/api/verify-password?userID=${this.props.userID}&password=${password}`, {credentials: "include"})

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }


        const status = await response.text()

        if (status === "Failure") {
            console.log("Password is incorrect")

            const errorTag = document.createElement("span")
            const text = document.createTextNode(" - Password is incorrect")
            errorTag.className = "error-message-profile"
            errorTag.appendChild(text)

            document.getElementById("mpi-password-label").innerHTML = "CURRENT PASSWORD" + errorTag.outerHTML
            return false
        }

        return true
    }


    async setUserInfo(attribute, newValue) {
        console.log(attribute)
        console.log(newValue)

        const response = await fetch('/api/set-user-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: "include",
            body: JSON.stringify({userID: this.props.userID, email: this.props.email, attribute: attribute, value: newValue})
        })

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        return "Success"
    }


    togglePopupMenu() {
        console.log('togglePopupMenu')
        this.setState({showPopupMenu: !this.state.showPopupMenu})
    }


    render() {
        console.log(this.props)

        return (
            <div className="profile-container" key={uuidv4()}>
                <div className="profile-info">
                    <label>{this.props.attribute.toUpperCase()}</label>
                    <p>{this.props.value}</p>
                </div>

                <div className="modify-profile-info">
                    <button className="edit-btn" onClick={this.togglePopupMenu}>EDIT</button>
                </div>

                {
                    this.state.showPopupMenu &&

                    <div>
                        {/* The purpose of the div immediately below is to provide a slightly dark background for when this component becomes visible */}
                        <div className="dark-background" onClick={this.togglePopupMenu}>

                        </div>

                        <form className="modify-profile-info-form">
                            <div className="mpi-form-top">
                                <div className="mpi-form-title">
                                    <h2>Change your {this.props.attribute}</h2>
                                </div>

                                <div className="mpi-form-closer">
                                    <button className="mpi-close-form-btn" type="button" onClick={this.togglePopupMenu}>&#10006;</button>
                                </div>
                            </div>

                            <hr/>

                            <div className="mpi-form-middle">
                                <p>Enter a new {this.props.attribute} and your existing password.</p>

                                <label id="mpi-attribute-label" htmlFor="newValue-input">{this.props.attribute.toUpperCase()}</label>
                                {this.props.attribute === "name" && <input type="text" id="newValue-input"/>}
                                {this.props.attribute === "password" && <input type="password" id="newValue-input"/>}
                                <br/>
                                <br/>

                                <label id="mpi-password-label" htmlFor="password-input">CURRENT PASSWORD</label>
                                <input type="password" id="password-input"/>
                            </div>

                            <div className="mpi-form-bottom">
                                <div className="mpi-form-bottom-container">
                                    <button className="mpi-form-bottom-btn update-profile-info-btn-1" type="button" onClick={this.togglePopupMenu}>Cancel</button>
                                    <button className="mpi-form-bottom-btn update-profile-info-btn-2" type="button" onClick={() => this.modifyInfo(this.props.attribute)}>Change</button>
                                </div>
                            </div>
                        </form>
                    </div>
                }
            </div>
        )
    }
}


export default ModifyProfileInfo

import React from 'react'
import { v4 as uuidv4 } from 'uuid'

import "../../styles/invite-user.css"
import Error from './error'
import Cookies from "js-cookie"


class InviteUser extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            displayError: false
        }

        this.validateForm = this.validateForm.bind(this)
        this.hideErrorMessage = this.hideErrorMessage.bind(this)
        this.usernameIsValid = this.usernameIsValid.bind(this)
        this.getUserID = this.getUserID.bind(this)
        this.userExists = this.userExists.bind(this)
        this.userAlreadyReceivedInvite = this.userAlreadyReceivedInvite.bind(this)
        this.sendInvitation = this.sendInvitation.bind(this)
        this.getDate = this.getDate.bind(this)
        this.getTime = this.getTime.bind(this)

        this.handleKeyPress = this.handleKeyPress.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    async validateForm() {
        this.hideErrorMessage()

        const recipientUsername = document.getElementById("username-input").value.trim()

        if (!this.usernameIsValid(recipientUsername))
            return


        const recipientID = await this.getUserID(recipientUsername)

        if (recipientID === "ERROR-OCCURRED")
            return


        if (!this.userExists(recipientID))
            return


        const userReceivedInvite = await this.userAlreadyReceivedInvite(recipientID)

        if (userReceivedInvite === "ERROR-OCCURRED")
            return

        if (userReceivedInvite === true || userReceivedInvite === undefined)
            return


        const status = await this.sendInvitation(recipientID)

        if (status === "ERROR-OCCURRED")
            return

        this.props.invitationSent(recipientUsername)
    }


    hideErrorMessage() {
        document.getElementById("iu-error-message").style.visibility = "hidden"
    }


    usernameIsValid(username) {
        if (username === "") {
            document.getElementById("iu-error-message").innerHTML = "This field is required"
            document.getElementById("iu-error-message").style.visibility = "visible"
            return false
        }


        // Checks to see if the user is inviting themselves
        if (this.props.groupMembers[this.props.sender] === username) {
            document.getElementById("iu-error-message").innerHTML = "You're already a member of this group :)"
            document.getElementById("iu-error-message").style.visibility = "visible"
            return false
        }


        // Checks to see if the username of the user provided is already a member
        for (const key in this.props.groupMembers) {
            if (this.props.groupMembers[key] === username) {
                document.getElementById("iu-error-message").innerHTML = "This user is already a member"
                document.getElementById("iu-error-message").style.visibility = "visible"
                return false
            }
        }

        return true
    }


    async getUserID(username) {
        const response = await fetch(`/api/get-user-id?username=${username}`)

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        const id = await response.text()
        return id
    }


    userExists(userID) {
        if (userID === "") {
            document.getElementById("iu-error-message").innerHTML = "This user doesn't exist"
            document.getElementById("iu-error-message").style.visibility = "visible"
            return false
        }

        return true
    }


    // Checks to see if the user already received the notification
    async userAlreadyReceivedInvite(recipientID) {
        const response = await fetch(`/api/notification-check?userID=${recipientID}&type=group-invitation&attribute=groupID&value=${this.props.groupID}`)

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        const result = await response.text()

        if (result === "USER-RECEIVED-NOTIFICATION") {
            document.getElementById("iu-error-message").innerHTML = "An invitation has already been sent to this user"
            document.getElementById("iu-error-message").style.visibility = "visible"
            return true
        }
        return false
    }


    async sendInvitation(recipient) {
        const token = Cookies.get("XSRF-Token")

        const response = await fetch('/api/send-notification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'XSRF-Token': token
            },
            body: JSON.stringify({
                id: uuidv4(),
                type: "group-invitation",
                message: `${this.props.groupMembers[this.props.sender]} invited you to join their group ${this.props.groupName}`,
                sender: this.props.sender,
                recipient: recipient,
                groupID: this.props.groupID,
                groupName: this.props.groupName,
                date: this.getDate(),
                time: this.getTime(),
                timeToLive: Math.ceil(this.getTime() / 1000) + (60 * 60 * 24 * 7) // 7 days from now (in seconds)
            })
        })


        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        return "SUCCESS"
    }


    getDate() {
      const dateObj = new Date();

      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];

      return `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
    }


    getTime() {
        const today = new Date()
        return today.getTime()
    }


    handleKeyPress(event) {
        if (event.key === 'Enter') {
            event.preventDefault()
            this.validateForm()
        }
    }


    toggleErrorComponent() {
        this.setState({displayError: !this.state.displayError})
    }


    render() {
        return (
            <div className="invite-user-container">
                {/* The purpose of the div immediately below is to provide a slightly dark background for when this component becomes visible */}
                <div className="dark-background" onClick={this.props.closeComponent}>
                </div>

                <form className="invite-user-form">
                    <div className="iu-form-top">
                        <div className="iu-form-title">
                            <h2>Invite User</h2>
                        </div>

                        <div className="iu-form-closer">
                            <button className="iu-close-form-btn" type="button" onClick={this.props.closeComponent}>&#10006;</button>
                        </div>
                    </div>

                    <hr/>

                    <div className="iu-form-middle">
                        <label>Username</label> <br/>
                        <input id="username-input" autoComplete="off" onKeyPress={this.handleKeyPress}/> <br/>
                        <p id="iu-error-message">This field is required</p>
                        <br/><br/>
                    </div>

                    <div className="iu-form-bottom">
                        <div className="iu-form-bottom-container">
                            <button className="iu-form-bottom-btn iu-btn-1" type="button" onClick={this.props.closeComponent}>Cancel</button>
                            <button className="iu-form-bottom-btn iu-btn-2" type="button" onClick={this.validateForm}>Send Invitation</button>
                        </div>
                    </div>
                </form>

                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent}/>}
            </div>
        )
    }
}


export default InviteUser

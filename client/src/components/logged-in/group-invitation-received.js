import React from "react"
import "../../styles/group-invitation-received.css"

import jwt_decode from "jwt-decode"
import Cookies from "js-cookie"
import Error from "./error"


class GroupInvitationReceived extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            userID: (Cookies.get("jwtHP") === undefined) ? null : jwt_decode(Cookies.get("jwtHP")).userID,
            displayError: false
        }

        this.handleDecision = this.handleDecision.bind(this)
        this.acceptInvitation = this.acceptInvitation.bind(this)
        this.deleteNotification = this.deleteNotification.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    async handleDecision(decision) {
        if (decision === "Accept") {
            const status = this.acceptInvitation()

            if (status === "ERROR-OCCURRED")
                return
        }


        const status = this.deleteNotification()

        if (status === "ERROR-OCCURRED")
            return

        this.props.closeComponent(decision)
    }


    async acceptInvitation() {
        console.log("acceptInvitation() called")
        console.log(this.props.groupID)

        const response = await fetch("/api/accept-group-invitation", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            // credentials: "include",
            body: JSON.stringify({
                userID: this.state.userID,
                groupID: this.props.groupID
            })
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


    async deleteNotification() {
        console.log("acceptInvitation() called")
        console.log(this.props.groupID)

        const response = await fetch(`/api/delete-notification?userID=${this.state.userID}&groupID=${this.props.groupID}`)//, {credentials: "include"})

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


    toggleErrorComponent() {
        console.log("toggleErrorComponent()")
        this.setState({displayError: !this.state.displayError})
    }


    render() {
        console.log(this.props)

        return (
            <div>
                {/* The purpose of the div immediately below is to provide a slightly dark background for when this component becomes visible */}
                <div className="dark-background">
                </div>

                <form className="group-invitation-received-form">
                    <div className="gir-form-top">
                        <div className="gir-form-title">
                            <h3>You have received a group invitation</h3>
                        </div>
                    </div>

                    <hr/>

                    <div className="gir-form-middle">
                        <p>You have received an invitation to become a member of the group <strong>{this.props.groupName}</strong>. Would you like to join them?</p>
                    </div>

                    <div className="gir-form-bottom">
                        <div className="gir-form-bottom-container">
                            <button className="gir-form-bottom-btn gir-decline-btn" type="button" onClick={() => this.handleDecision("Decline")}>Decline</button>
                            <button className="gir-form-bottom-btn gir-accept-btn" type="button" onClick={() => this.handleDecision("Accept")}>Accept</button>
                        </div>
                    </div>
                </form>

                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent} />}
            </div>
        )
    }
}


export default GroupInvitationReceived

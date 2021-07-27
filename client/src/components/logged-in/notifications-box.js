import React from 'react'
import { withRouter } from "react-router-dom"

import Error from "./error"
import Loading from "./loading"

import groupInvitationIcon from "../../images/group-invitation.png"
import "../../styles/notifications-box.css"


class NotificationsBox extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            notificationsFetched: false,
            notifications: [],
            displayError: false,
            stateLoaded: false
        }

        this.handleNotification = this.handleNotification.bind(this)
        this.deleteNotification = this.deleteNotification.bind(this)
        this.convertTime = this.convertTime.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    async componentDidMount() {
        if (!this.state.notificationsFetched) {
            const response = await fetch(`/api/get-notifications?userID=${this.props.userID}`)

            try {
                if (response.status !== 200)
                    throw "ERROR-OCCURRED"
            } catch (e) {
                this.setState({displayError: true})
                return
            }

            const notifications = await response.json()
            this.setState({notifications: notifications, notificationsFetched: true, stateLoaded: true})
        }
    }


    async handleNotification(notification) {
        if (notification.type === "group-invitation") {
            this.props.history.push({
                pathname: `/group/${notification.groupID}/main`,
                state: {
                    groupName: notification.groupName,
                    groupID: notification.groupID,
                    currentRoomName: "main",
                    userReceivedInvitation: true
                }
            })
        }
        else if (notification.type === "group-room-message") {
            const status = await this.deleteNotification(notification.id)

            if (status === "ERROR-OCCURRED")
                return

            this.props.history.push({
                pathname: `/group/${notification.groupID}/${notification.roomName}`,
                state: {
                    groupName: notification.groupName,
                    groupID: notification.groupID,
                    currentRoomName: `${notification.roomName}`
                }
            })
        }
        else  { // random-room-message
            const status = await this.deleteNotification(notification.id)

            if (status === "ERROR-OCCURRED")
                return

            this.props.history.push({
                pathname: "/random-chat",
                state: {
                    roomID: `${notification.roomID}`,
                    roomName: `${notification.roomName}`,
                    user2: `${notification.senderID}`
                }
            })
        }

        this.props.closeComponent()
    }


    async deleteNotification(notificationID) {
        const response = await fetch(`/api/delete-notification-2?notificationID=${notificationID}`)

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        return "Success"
    }


    convertTime(epochTime) {
        let currentDate = new Date(epochTime).toLocaleString()
        currentDate = currentDate.split(",")

        const seconds = currentDate[1].substring(currentDate[1].lastIndexOf(":"), currentDate[1].lastIndexOf(":") + 3)
        const time = currentDate[1].replace(seconds, "")
        return time
    }


    toggleErrorComponent() {
        this.setState({displayError: !this.state.displayError})
    }


    render() {
        if (!this.state.stateLoaded)
            return <Loading/>

        return (
            <div className="notifications-container">
                <h3>
                    <strong>Notifications</strong>
                </h3>

                {(this.state.notificationsFetched && this.state.notifications.length > 0) ?

                    this.state.notifications.map(notification =>

                        <div key={notification.id} className="notification"  onClick={() => this.handleNotification(notification)}>
                            <div className="notification-top">
                                <img className="rounded" src={groupInvitationIcon} alt="group invitation"/>

                                <div className="notification-message">
                                    {notification.message}
                                </div>
                            </div>

                            <div className="notification-bottom">
                                <strong>{notification.date} &middot; {this.convertTime(notification.time)}</strong>
                            </div>
                        </div>
                    )

                    :

                    <div className="notification">
                        There are no notifications.
                    </div>
                }

                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent} />}
            </div>
        )
    }
}


export default withRouter(NotificationsBox)

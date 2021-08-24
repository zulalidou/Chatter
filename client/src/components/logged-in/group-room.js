import React from 'react'
import { v4 as uuidv4 } from 'uuid'

import MessageBox from './message-box'
import Loading from "./loading"
import Cookies from "js-cookie"
import "../../styles/group-room.css"


class GroupRoom extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            roomMessages: [],
            stateLoaded: false
        }

        this.getRoomMessages = this.getRoomMessages.bind(this)
        this.subscribeToRoom = this.subscribeToRoom.bind(this)
        this.sendMessage = this.sendMessage.bind(this)
        this.getDate = this.getDate.bind(this)
        this.getTime = this.getTime.bind(this)
        this.getUserInfo = this.getUserInfo.bind(this)
        this.convertTime = this.convertTime.bind(this)
        this.handleKeyPress = this.handleKeyPress.bind(this)
        this.showLatestMessages = this.showLatestMessages.bind(this)
    }


    async componentDidMount() {
        // 1. Get the messages for this room
        const messages = await this.getRoomMessages(this.props.roomID)

        // error occurred
        if (messages === "ERROR-OCCURRED") {
            this.props.displayError()
            return
        }

        this.subscribeToRoom(this.props.roomID)

        this.setState({roomMessages: messages, stateLoaded: true})
    }


    componentDidUpdate() {
        const messagesContainer = document.getElementById("grc-messages-container")
        this.showLatestMessages()
    }


    async getRoomMessages(roomID) {
        const response = await fetch(`/api/get-room-messages?roomID=${this.props.roomID}`)

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            return "ERROR-OCCURRED"
        }

        const messages = await response.json()
        return messages
    }


    subscribeToRoom(roomID) {
        this.props.socket.emit("join-room", roomID)

        // Every time a message gets posted in the room that we're subscribed in, the function below will get executed.
        this.props.socket.on(roomID, async data => {
            let roomMessagesUpdated = this.state.roomMessages
            roomMessagesUpdated.push(data)

            this.setState({roomMessages: roomMessagesUpdated})
        })
    }


    async sendMessage() {
        const message = document.getElementById("grc-message-input").value.trim()
        if (message === "")
            return

        document.getElementById("grc-message-input").value = ""


        // ***********************************************************************************************
        // Send the message to the server, and then have the server paste the message in the room

        const date = this.getDate()
        const time = this.getTime()

        this.props.socket.emit("send-message-to-group-room", {
            senderID: this.props.userID,
            message: message,
            roomID: this.props.roomID,
            roomName: this.props.roomName,
            groupID: this.props.groupID,
            groupName: this.props.groupName,
            date: date,
            time: time
        })



        const userInfo = await this.getUserInfo()

        if (userInfo === "ERROR-OCCURRED") {
            this.props.displayError()
            return
        }


        const token = Cookies.get("XSRF-Token")

        const response = await fetch("/api/save-message-to-db", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "XSRF-Token": token
            },
            body: JSON.stringify({
                id: uuidv4(),
                senderID: this.props.userID,
                username: userInfo.username,
                message: message,
                roomID: this.props.roomID,
                groupID: this.props.groupID,
                date: date,
                time: time
            })
        })


        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            return
        }
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


    convertTime(epochTime) {
        let currentDate = new Date(epochTime).toLocaleString()
        currentDate = currentDate.split(",")

        const seconds = currentDate[1].substring(currentDate[1].lastIndexOf(":"), currentDate[1].lastIndexOf(":") + 3)
        const time = currentDate[1].replace(seconds, "")
        return time
    }


    async getUserInfo() {
        const response = await fetch(`/api/get-profile-info?userID=${this.props.userID}`)

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            return "ERROR-OCCURRED"
        }

        const userInfo = await response.json()
        return userInfo
    }


    handleKeyPress(event) {
        if (event.key === 'Enter') {
            event.preventDefault()
            this.sendMessage()
        }
    }


    showLatestMessages() {
        // The purpose of the two lines below is to make sure that when a new message is displayed, the scrollbar is
        // automatically scrolled all the way to the bottom
        const messagesContainer = document.getElementById("grc-messages-container")
        messagesContainer.scrollTop = messagesContainer.scrollHeight
    }


    render() {
        return (
            <div className="group-room-container">
                <h3 className="group-chat-header">
                    Group Chat
                </h3>

                <div className="grc-title">
                    {this.props.roomName}
                </div>

                <div id="grc-messages-container">
                    { this.state.stateLoaded ?

                        this.state.roomMessages.map(
                            (item, idx) => {
                                if (idx >= 1 && this.state.roomMessages[idx-1].senderID === this.state.roomMessages[idx].senderID && this.state.roomMessages[idx-1].date === this.state.roomMessages[idx].date)
                                    return <MessageBox key={idx} message={item.message} time={this.convertTime(item.time)}/>
                                return <MessageBox key={idx} avatarString={item.avatarString} username={item.username} message={item.message} date={item.date} time={this.convertTime(item.time)}/>
                            }
                        )

                        :

                        <Loading/>
                    }
                </div>

                <div className="grc-bottom-container">
                    <form className="grc-bottom-container-form">
                        <input id="grc-message-input" type="text" placeholder="Type message" autoComplete="off" onKeyPress={this.handleKeyPress}/>

                        <button id="grc-send-msg-btn" type="button" onClick={this.sendMessage}>
                            SEND
                        </button>
                    </form>
                </div>
            </div>
        )
    }
}


export default GroupRoom

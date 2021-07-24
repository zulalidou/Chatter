import React from 'react'
import { v4 as uuidv4 } from 'uuid'

import MessageBox from './message-box'
import Loading from "./loading"
import "../../styles/random-room.css"


class RandomRoom extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            roomID: this.props.roomID,
            roomName: this.props.roomName,
            roomMessages: [],
            messagesRetrieved: false,

            user1ID: this.props.user1ID,
            user1username: this.props.user1username,
            user1avatarString: null,
            user2ID: this.props.user2ID,
            user2username: this.props.user2username,
            user2avatarString: null
        }

        console.log('RANDOM-ROOM')

        this.checkIfRoomExists = this.checkIfRoomExists.bind(this)
        this.createRoom = this.createRoom.bind(this)
        this.getDate = this.getDate.bind(this)
        this.getTime = this.getTime.bind(this)
        this.setRoomID = this.setRoomID.bind(this)
        this.subscribeToRoom = this.subscribeToRoom.bind(this)
        this.getRoomMessages = this.getRoomMessages.bind(this)
        this.getAvatarString = this.getAvatarString.bind(this)
        this.handleKeyPress = this.handleKeyPress.bind(this)
        this.sendMessage = this.sendMessage.bind(this)
        this.showLatestMessages = this.showLatestMessages.bind(this)
        this.getUserInfo = this.getUserInfo.bind(this)
        this.convertTime = this.convertTime.bind(this)
    }


    async componentDidMount() {
        console.log('componentDidMount() called')

        const roomExists = await this.checkIfRoomExists(this.state.roomID)

        if (roomExists === "ERROR-OCCURRED") {
            this.props.showError()
            return
        }

        if (!roomExists) {
            const roomCreated = await this.createRoom(this.state.roomID)

            if (roomCreated === "ERROR-OCCURRED") {
                this.props.showError()
                return
            }
        }


        const roomIdSet = await this.setRoomID(this.state.roomID)

        if (roomIdSet === "ERROR-OCCURRED") {
            this.props.showError()
            return
        }


        this.subscribeToRoom(this.state.roomID)


        const messages = await this.getRoomMessages(this.state.roomID)

        if (messages === null) {
            this.props.showError()
            return
        }


        const avatarString1 = await this.getAvatarString(this.state.user1ID)

        if (avatarString1 === "ERROR-OCCURRED")
            return


        const avatarString2 = await this.getAvatarString(this.state.user2ID)

        if (avatarString2 === "ERROR-OCCURRED")
            return


        if (avatarString1 === null || avatarString2 === null) {
            this.props.showError()
            return
        }

        this.setState({
            roomMessages: messages,
            messagesRetrieved: true,
            user1avatarString: avatarString1,
            user2avatarString: avatarString2
        })
    }


    componentDidUpdate() {
        console.log("componentDidUpdate()")
        this.showLatestMessages()
    }


    async checkIfRoomExists(roomID) {
        const response = await fetch(`/check-if-room-exists?roomID=${roomID}`, {credentials: "include"})

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            return "ERROR-OCCURRED"
        }

        const roomExists = await response.json()

        if (roomExists)
            return true
        return false
    }


    async createRoom(roomID) {
        console.log(roomID)

        const response = await fetch("/create-room", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                id: roomID,
                groupID: "null",
                name: "null", // this is bc for each user, the name of the room will be the other user's username
                purpose: "null",
                user1ID: this.state.user1ID,
                user2ID: this.state.user2ID,
                date: this.getDate(),
                time: this.getTime(),
                groupRoom: false
            })
        })


        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            return "ERROR-OCCURRED"
        }

        return "Success"
    }


    getDate() {
        let dateObj = new Date()
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        return months[dateObj.getMonth()] + " " + dateObj.getDate() + ", " + dateObj.getFullYear()
    }


    getTime() {
        let dateObj = new Date()
        return dateObj.getTime()
    }


    async setRoomID(roomID) {
        const response = await fetch('/set-user-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: "include",
            body: JSON.stringify({
                userID: this.props.user1ID,
                attribute: 'currentRoomOpen',
                value: roomID
            })
        })

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            return "ERROR-OCCURRED"
        }

        return "Success"
    }


    subscribeToRoom(roomID) {
        this.props.socket.emit('join-room', roomID)

        // this is to receive messages from current room
        this.props.socket.on(roomID, async data => {
            console.log(data)
            console.log(this.state)

            let roomMessagesUpdated = this.state.roomMessages
            roomMessagesUpdated.push(data)

            if (data.senderID === "N/A" && data.message === "THE OTHER USER HAS DISCONNECTED.") {
                this.props.socket.emit("leave-room", this.state.roomID)

                console.log(document.getElementById("message-input"))
                console.log(document.getElementById("send-btn"))

                document.getElementById("message-input").setAttribute("disabled", "disabled")
                document.getElementById("send-btn").setAttribute("disabled", "disabled")
            }

            this.setState({roomMessages: roomMessagesUpdated})
        })
    }


    async getRoomMessages(roomID) {
        console.log(roomID)

        const response = await fetch(`/get-room-messages?roomID=${roomID}`, {credentials: "include"})

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            return "ERROR-OCCURRED"
        }

        const messages = await response.json()
        return messages
    }


    async getAvatarString(userID) {
        const response = await fetch(`/get-user-field-info?userID=${userID}&attribute=avatarString`, {credentials: "include"})

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            return "ERROR-OCCURRED"
        }

        const avatarString = await response.text()
        return avatarString
    }


    handleKeyPress(event) {
        if (event.key === "Enter") {
            event.preventDefault()
            this.sendMessage()
        }
    }


    async sendMessage() {
        const message = document.getElementById("message-input").value.trim()
        console.log(message)

        if (message === "")
            return

        document.getElementById("message-input").value = ""


        // ***********************************************************************************************
        // Send the message to the server, and then have the server paste the message in the room

        const date = this.getDate()
        const time = this.getTime()

        this.props.socket.emit("send-message-to-random-room", {
            senderID: this.state.user1ID,
            message: message,
            roomID: this.state.roomID,
            groupID: "null",
            date: date,
            time: time,
            recipientID: this.state.user2ID,
            username: this.state.user1username
        })



        const userInfo = await this.getUserInfo()

        if (userInfo === "ERROR-OCCURRED") {
            this.props.displayError()
            return
        }


        const response = await fetch("/save-message-to-db", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                id: uuidv4(),
                senderID: this.props.user1ID,
                username: userInfo.username,
                message: message,
                roomID: this.state.roomID,
                groupID: "null",
                date: date,
                time: time
            })
        })


        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.props.displayError()
        }
    }


    showLatestMessages() {
        console.log("showLatestMessages()")
        const messagesContainer = document.getElementById("messages-container")
        messagesContainer.scrollTop = messagesContainer.scrollHeight
    }


    async getUserInfo() {
        const response = await fetch(`/get-profile-info?userID=${this.props.user1ID}`, {credentials: "include"})

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            return "ERROR-OCCURRED"
        }

        const userInfo = await response.json()
        console.log(userInfo)
        return userInfo
    }


    convertTime(epochTime) {
        let currentDate = new Date(epochTime).toLocaleString()
        currentDate = currentDate.split(",")

        const seconds = currentDate[1].substring(currentDate[1].lastIndexOf(":"), currentDate[1].lastIndexOf(":") + 3)
        const time = currentDate[1].replace(seconds, "")
        return time
    }


    render() {
        console.log(this.props)
        console.log(this.state)


        return (
            <div id="random-room-container" key={this.props.childKey}>
                <h3 id="random-chat-header">
                    Random Chat
                </h3>

                <div id="room-title">
                    {this.props.roomName}
                </div>

                <div id = "messages-container">
                    { this.state.messagesRetrieved === true ?

                        this.state.roomMessages.map(
                            (item, idx) => {
                                if (this.state.roomMessages[idx].senderID === "N/A")
                                    return <MessageBox key={idx} message={item.message} senderID="N/A"/>
                                else if (idx >= 1 && this.state.roomMessages[idx-1].senderID === this.state.roomMessages[idx].senderID && this.state.roomMessages[idx-1].date === this.state.roomMessages[idx].date)
                                    return <MessageBox key={idx} message={item.message} time={this.convertTime(item.time)}/>
                                return <MessageBox key={idx} avatarString={item.avatarString} username={item.username} message={item.message} date={item.date} time={this.convertTime(item.time)}/>
                            }
                        )

                        :

                        <Loading/>
                    }
                </div>

                <div id="bottom-container">
                    <form id="form">
                        <input id="message-input" type="text" placeholder="Type message" autoComplete="off" onKeyPress={this.handleKeyPress}/>

                        <button id="send-btn" type="button" onClick={this.sendMessage}>
                            SEND
                        </button>
                    </form>
                </div>
            </div>
        )
    }
}


export default RandomRoom

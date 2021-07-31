import React from 'react'
import { Redirect } from "react-router-dom"

import Cookies from 'js-cookie'
import UsersOnline from './users-online'
import RandomRoom from './random-room'
import Loading from "./loading"
import Error from './error'

import jwt_decode from 'jwt-decode'
import io from "socket.io-client"
import { v4 as uuidv4 } from 'uuid'

import "../../styles/random-chat.css"


class RandomChat extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            isLoggedIn: true,
            user1ID: (Cookies.get("jwtHP") === undefined) ? null : jwt_decode(Cookies.get("jwtHP")).userID,
            user1username: (Cookies.get("jwtHP") === undefined) ? null : jwt_decode(Cookies.get("jwtHP")).username,
            user2ID: null,
            user2username: null,
            loggedInUsers: null,

            currentRoomID: null,
            currentRoomName: null,
            openRoom: false,
            dataFetched: false,

            displayError: false,
            socket: io(''),
            stateLoaded: false,
            childKey: null // makes it so that when <RandomRoom/> component gets new props, it re-renders
        }

        this.getLoggedInUsers = this.getLoggedInUsers.bind(this)
        this.setStateValues = this.setStateValues.bind(this)
        this.setRoomID = this.setRoomID.bind(this)
        this.getRoomID = this.getRoomID.bind(this)
        this.isRandomRoom = this.isRandomRoom.bind(this)
        this.getUser2Data = this.getUser2Data.bind(this)
        this.openRoom = this.openRoom.bind(this)
        this.getUserID = this.getUserID.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    async componentDidMount() {
        if (Cookies.get('jwtHP') === undefined) {
            this.setState({isLoggedIn: false})
            return
        }


        const loggedInUsers = await this.getLoggedInUsers()

        if (loggedInUsers === "ERROR-OCCURRED") {
            this.setState({stateLoaded: true})
            return
        }

        this.setStateValues(loggedInUsers)
    }


    componentWillUnmount() {
        if (this.state.currentRoomID !== null) {
            this.state.socket.emit('leave-room', this.state.currentRoomID)
            this.setRoomID(null)
        }
    }


    async getLoggedInUsers() {
        let response = await fetch(`/api/get-logged-in-users?userID=${this.state.user1ID}`)

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }


        const users = await response.json()
        return users
    }


    async setStateValues(loggedInUsers) {
        if (this.props.location.state !== undefined) {
            const status = await this.setRoomID(this.props.location.state.roomID)

            if (status === "ERROR-OCCURRED")
                return

            this.setState({
                user2ID: this.props.location.state.user2,
                user2username: this.props.location.state.roomName,
                loggedInUsers: loggedInUsers,

                currentRoomID: this.props.location.state.roomID,
                currentRoomName: this.props.location.state.roomName,
                openRoom: true,
                dataFetched: true,
                stateLoaded: true,

                childKey: uuidv4()
            })

            return
        }



        let roomID = await this.getRoomID()

        if (roomID === "ERROR-OCCURRED")
            return


        const idBelongsToRandomRoom = await this.isRandomRoom(roomID)

        if (roomID === "ERROR-OCCURRED")
            return


        if (roomID === null || !idBelongsToRandomRoom) {
            const status = await this.setRoomID(null)

            if (status === "ERROR-OCCURRED")
                return


            this.setState({
                user2ID: null,
                user2username: null,
                loggedInUsers: loggedInUsers,

                currentRoomID: null,
                currentRoomName: null,
                openRoom: false,
                dataFetched: true,
                stateLoaded: true,

                childKey: uuidv4()
            })
        }
        else {
            const user2Data = await this.getUser2Data(roomID)

            if (user2Data === "ERROR-OCCURRED")
                return

            this.setState({
                user2ID: user2Data.id,
                user2username: user2Data.username,
                loggedInUsers: loggedInUsers,

                currentRoomID: roomID,
                currentRoomName: user2Data.username,
                openRoom: true,
                dataFetched: true,
                stateLoaded: true,

                childKey: uuidv4()
            })
        }
    }


    async setRoomID(roomID) {
        const token = Cookies.get("CSRF-Token")

        const response = await fetch('/api/set-user-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': token
            },
            body: JSON.stringify({
                userID: this.state.user1ID,
                attribute: 'currentRoomOpen',
                value: roomID
            })
        })

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        return true
    }


    async getRoomID() {
        let response = await fetch(`/api/get-user-field-info?userID=${this.state.user1ID}&attribute=currentRoomOpen`)

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        const roomID = await response.text()

        if (roomID === "")
            return null
        return roomID
    }


    async isRandomRoom(roomID) {
        const response = await fetch(`/api/is-random-room?roomID=${roomID}`)

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        const isRandomRoom = await response.json()
        return isRandomRoom
    }


    async getUser2Data(roomID) {
        const response = await fetch(`/api/get-user2-data?user1ID=${this.state.user1ID}&roomID=${roomID}`)

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        const user2Data = await response.json()
        return user2Data
    }


    async openRoom(user2username) {
        if (user2username === this.state.user2username)
            return

        const loggedInUsersDivs = document.getElementsByClassName("logged-in-user")

        for (let i = 0; i < loggedInUsersDivs.length; i++) {
            if (loggedInUsersDivs[i].innerText === user2username)
                loggedInUsersDivs[i].classList.add("active")
            else
                loggedInUsersDivs[i].classList.remove("active")
        }


        if (this.state.currentRoomID !== null)
            this.state.socket.emit('leave-room', this.state.currentRoomID)



        const user2ID = await this.getUserID(user2username)

        if (user2ID === "ERROR-OCCURRED")
            return


        const ids = [this.state.user1ID, user2ID].sort()
        const newRoomID = ids[0] + ids[1]

        const status = await this.setRoomID(newRoomID)

        if (status === "ERROR-OCCURRED")
            return


        this.setState({
            user2ID: user2ID,
            user2username: user2username,

            currentRoomID: newRoomID,
            currentRoomName: user2username,
            openRoom: true,

            childKey: uuidv4()
        })
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


    toggleErrorComponent() {
        this.setState({displayError: !this.state.displayError})
    }


    render() {
        if (!this.state.isLoggedIn)
            return <Redirect to="/login"/>

        if (!this.state.stateLoaded)
            return <Loading/>

        return (
            <div className="body">
                <div className="left-container">
                    <div className="lc-outer-container">
                        <div className="lc-inner-container">
                            <h1>Random Chat</h1>

                            {
                                this.state.loggedInUsers &&
                                <UsersOnline loggedInUsers={this.state.loggedInUsers} user2username={this.state.user2username} openRoom={this.openRoom}/>
                            }
                        </div>
                    </div>
                </div>

                <div className="right-container">
                    {
                        this.state.dataFetched && (

                            this.state.openRoom ?

                            <RandomRoom key={this.state.childKey} socket={this.state.socket} roomID={this.state.currentRoomID} roomName={this.state.currentRoomName} user1ID={this.state.user1ID} user1username={this.state.user1username} user2ID={this.state.user2ID} user2username={this.state.user2username} showError={this.toggleErrorComponent}/>

                            :

                            <div>
                                <div id="random-chat-message">
                                    <p>
                                        <span className="bullet-point-span">&#8226;</span> In this mode, you can start a conversation with any other user that's online by clicking on their username.
                                    </p>
                                    <p>
                                        <span className="bullet-point-span">&#8226;</span> When you click on a user, you create a room where both of you are the only members.
                                    </p>
                                    <p>
                                        <span className="bullet-point-span">&#8226;</span> <strong>WARNING:</strong> If at any point you log out (or your session ends), all your conversations in this mode will immediately be deleted.
                                    </p>
                                </div>

                                <UsersOnline loggedInUsers={this.state.loggedInUsers} user2username={this.state.user2username} openRoom={this.openRoom}/>
                            </div>
                        )
                    }
                </div>

                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent} />}
            </div>
        )
    }
}


export default RandomChat

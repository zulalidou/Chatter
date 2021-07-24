import React from "react"
import { Link, Redirect } from "react-router-dom"
import Loading from "./loading"
import Error from './error'

import "../../styles/home.css"


import jwt_decode from "jwt-decode"
import Cookies from "js-cookie"


class Home extends React.Component {
    constructor() {
        super()

        this.state = {
            isLoggedIn: true,
            groupNumber: "-",
            loggedInUsersNumber: "-",
            displayError: false,
            stateLoaded: false,

            // isProfilePageOpen: false,
            // isGroupsPageOpen: false,
            // isRandomChatPageOpen: false,
            userID: (Cookies.get("jwtHP") === undefined) ? null : jwt_decode(Cookies.get("jwtHP")).userID
        }

        console.log('HOME')

        this.getRoomID = this.getRoomID.bind(this)
        this.setRoomID = this.setRoomID.bind(this)
        this.getGroupNumber = this.getGroupNumber.bind(this)
        this.getLoggedInUsersNumber = this.getLoggedInUsersNumber.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    async componentDidMount() {
        console.log('componentDidMount()')

        if (Cookies.get("jwtHP") === undefined) {
            this.setState({isLoggedIn: false})
            return
        }


        ////////////////////////////////////////////////////
        let currentRoomOpen = await this.getRoomID()

        if (currentRoomOpen === "ERROR-OCCURRED") {
            this.setState({stateLoaded: true})
            return
        }

        if (currentRoomOpen !== '') {
            const status = await this.setRoomID(null)

            if (status === "ERROR-OCCURRED") {
                this.setState({stateLoaded: true})
                return
            }
        }
        ////////////////////////////////////////////////////


        const groupNumber = await this.getGroupNumber(this.state.userID)

        if (groupNumber === "ERROR-OCCURRED") {
            this.setState({stateLoaded: true})
            return
        }


        const loggedInUsersNumber = await this.getLoggedInUsersNumber(this.state.userID)
        console.log(loggedInUsersNumber)

        if (loggedInUsersNumber === "ERROR-OCCURRED") {
            this.setState({stateLoaded: true})
            return
        }


        console.log("hola")

        this.setState({
            groupNumber: groupNumber,
            loggedInUsersNumber: loggedInUsersNumber,
            stateLoaded: true
        })
    }


    componentWillUnmount() {
        console.log("componentWillUnmount() has been called")
    }


    async getRoomID() {
        console.log("getRoomID()")

        let response = await fetch(`/get-user-field-info?userID=${this.state.userID}&attribute=currentRoomOpen`, {credentials: "include"})
        console.log(response)

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        const roomID = await response.text()
        return roomID
    }


    async setRoomID(roomID) {
        console.log("setRoomID()")

        const response = await fetch('/set-user-info', {
            method: 'POST',
            credentials: "include",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({userID: this.state.userID, attribute: 'currentRoomOpen', value: roomID})
        })

        console.log(response)

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


    async getGroupNumber(userID) {
        console.log("getGroupNumber()")
        const response = await fetch(`/get-group-number?userID=${userID}`, {credentials: "include"})
        console.log(response)

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        const groupNumber = await response.text()
        return groupNumber
    }


    async getLoggedInUsersNumber(userID) {
        console.log("getLoggedInUsersNumber()")
        const response = await fetch(`/get-logged-in-users?userID=${userID}`, {credentials: "include"})
        console.log(response)

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        console.log("hey hey hey")
        const loggedInUsers = await response.json()

        console.log(loggedInUsers)
        return loggedInUsers.length
    }


    toggleErrorComponent() {
        console.log("toggleErrorComponent()")
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
                    <Link to="/profile" style={{textDecoration: "none"}}>
                        <div className="left-container-link">
                            Profile
                        </div>
                    </Link>

                    <Link to="/groups" style={{textDecoration: "none"}}>
                        <div className="left-container-link">
                            Groups
                        </div>
                    </Link>

                    <Link to="/random-chat" style={{textDecoration: "none"}}>
                        <div className="left-container-link">
                            Random Chat
                        </div>
                    </Link>
                </div>

                <div className="right-container">
                    <div className="main-menu-items-container">
                        <div className="group-number-container">
                            <div className="number-container">
                                {this.state.groupNumber}
                            </div>

                            <div className="label-container">
                                <strong>Groups</strong>
                            </div>
                        </div>

                        <div className="users-online-container">
                            <div className="number-container">
                                {this.state.loggedInUsersNumber}
                            </div>

                            <div className="label-container">
                                <strong>Users Online</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent} />}
            </div>
        )
    }
}


export default Home

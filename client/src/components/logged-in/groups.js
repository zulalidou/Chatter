import React from 'react'
import { Redirect } from "react-router-dom"

import jwt_decode from 'jwt-decode'
import Cookies from 'js-cookie'
import { v4 as uuidv4 } from 'uuid'

import ShowGroups from './show-groups' //'../logged-in/show-groups'
import CreateGroup from './create-group' //'../logged-in/create-group'
import Loading from "./loading"
import Error from "./error"

import "../../styles/groups.css"


class Groups extends React.Component {
    constructor() {
        super()

        this.state = {
            isLoggedIn: true,
            userID: (Cookies.get("jwtHP") === undefined) ? null : jwt_decode(Cookies.get("jwtHP")).userID,
            groups: [],
            showCreateGroupComponent: false,
            stateLoaded: false,
            displayError: false
        }

        console.log('GROUPS')

        this.getRoomID = this.getRoomID.bind(this)
        this.setRoomID = this.setRoomID.bind(this)
        this.getGroups = this.getGroups.bind(this)
        this.toggleCreateGroupComponent = this.toggleCreateGroupComponent.bind(this)
        this.addNewGroup = this.addNewGroup.bind(this)
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

        if (currentRoomOpen !== "")
            this.setRoomID(null)
        ////////////////////////////////////////////////////


        const groups = await this.getGroups(this.state.userID)

        if (groups === "ERROR-OCCURRED") {
            this.setState({stateLoaded: true})
            return
        }


        groups.sort((a, b) => (a.time < b.time) ? -1 : 1)
        this.setState({groups: groups, showCreateGroupComponent: false, stateLoaded: true})
    }


    async getRoomID() {
        let response = await fetch(`/get-user-field-info?userID=${this.state.userID}&attribute=currentRoomOpen`, {credentials: "include"})

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
        const response = await fetch('/set-user-info', {
            method: 'POST',
            credentials: "include",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({userID: this.state.userID, attribute: 'currentRoomOpen', value: roomID})
        })

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
        }
    }


    async getGroups(userID) {
        const response = await fetch(`/get-groups?userID=${userID}`, {credentials: "include"})

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        const groups = await response.json()
        return groups
    }


    toggleCreateGroupComponent() {
        console.log('toggleCreateGroupComponent()')
        this.setState({showCreateGroupComponent: !this.state.showCreateGroupComponent})
    }


    async addNewGroup() {
        console.log('addNewGroup()')

        const groups = await this.getGroups(this.state.userID)

        if (groups === "ERROR-OCCURRED")
            return

        groups.sort((a, b) => (a.time < b.time) ? -1 : 1)

        this.setState({showCreateGroupComponent: false, groups: groups})
    }


    toggleErrorComponent() {
        console.log("toggleErrorComponent()")
        this.setState({displayError: !this.state.displayError})
    }


    render() {
        console.log('render() called')
        console.log(this.state)

        if (!this.state.isLoggedIn)
            return <Redirect to="/login"/>

        if (!this.state.stateLoaded)
            return <Loading/>

        return (
            <div className="body">
                <div className="left-container">
                    <h1>Groups</h1>
                    <button className="create-group-btn" onClick={this.toggleCreateGroupComponent}>Create a group</button>
                </div>

                <div className="right-container">
                    <h3 id="groups-header">
                        Groups
                    </h3>

                    <button className="create-group-btn" onClick={this.toggleCreateGroupComponent}>
                        Create a group
                    </button>

                    <h3 id="user-groups-header">
                        Your groups
                    </h3>



                    {this.state.groups.length === 0 ?
                        <div className="groups-container">
                            Whoops! It looks like you're not part of any group. Start by creating a group, and invite your friends and family to it!
                        </div>

                        :

                        <div>
                            {
                                this.state.groups.map(group => <ShowGroups key={uuidv4()} group={group} userID={this.state.userID} />)
                            }
                        </div>
                    }

                    {this.state.showCreateGroupComponent && <CreateGroup userID={this.state.userID} addNewGroup={this.addNewGroup} closeComponent={this.toggleCreateGroupComponent} />}
                    {this.state.displayError && <Error closeComponent={this.toggleErrorComponent}/>}
                </div>
            </div>
        )
    }
}


export default Groups

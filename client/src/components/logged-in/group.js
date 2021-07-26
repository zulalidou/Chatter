import React from "react"
import { Redirect } from "react-router-dom"

import GroupRoom from "./group-room"
import BecomeAdmin from "./become-admin"

import CreateRoom from "./create-room"
import InviteUser from "./invite-user"
import InvitationSent from "./invitation-sent"
import LeaveGroup from "./leave-group"
import PageNotFound from "../page-not-found"
import AccessGroupDenied from "./access-group-denied"
import GroupInvitationReceived from "./group-invitation-received"
import Loading from "./loading"
import Error from "./error"

import "../../styles/group.css"
import io from "socket.io-client"
import jwt_decode from "jwt-decode"
import Cookies from "js-cookie"
import { v4 as uuidv4 } from "uuid"


class Group extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            socket: io(''),
            isLoggedIn: true,
            userID: (Cookies.get("jwtHP") === undefined) ? null : jwt_decode(Cookies.get("jwtHP")).userID,

            groupName: null,//this.props.location.state.groupName,
            groupID: null,//this.props.location.state.groupID,
            groupMembers: null,
            groupRooms: [],
            groupAdmin: null,
            currentRoomName: null,//this.props.location.state.currentRoomName,
            currentRoomID: null,

            showGroup: true,
            roomFound: true,

            showCreateRoomComponent: false,
            showBecomeAdminComponent: false,
            showInviteUserComponent: false,
            showInvitationSentComponent: false,
            showLeaveGroupComponent: false,
            showUserReceivedGroupInvitation: false,

            userInvited: null,
            displayError: false,
            stateLoaded: false,

            // Makes it so that when the <GroupRoom/> component gets new props, it gets destroyed and gets recreated
            childKey: uuidv4()
        }


        console.log('GROUP COMPONENT HERE')

        this.userReceivedGroupInvitation = this.userReceivedGroupInvitation.bind(this)
        this.userIsGroupMember = this.userIsGroupMember.bind(this)
        this.getGroupInfo = this.getGroupInfo.bind(this)
        this.getGroupMembers = this.getGroupMembers.bind(this)
        this.getGroupRooms = this.getGroupRooms.bind(this)
        this.setRoomID = this.setRoomID.bind(this)
        this.openRoom = this.openRoom.bind(this)
        this.toggleCreateRoomComponent = this.toggleCreateRoomComponent.bind(this)
        this.toggleBecomeAdminComponent = this.toggleBecomeAdminComponent.bind(this)
        this.toggleInviteUserComponent = this.toggleInviteUserComponent.bind(this)
        this.toggleLeaveGroupComponent = this.toggleLeaveGroupComponent.bind(this)
        this.closeGIRcomponent = this.closeGIRcomponent.bind(this)
        this.invitationSent = this.invitationSent.bind(this)
        this.toggleInvitationSentComponent = this.toggleInvitationSentComponent.bind(this)
        this.updateGroupAdmin = this.updateGroupAdmin.bind(this)
        this.goToNewRoom = this.goToNewRoom.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    // 1. Make a fetch request to get the current group room opened
    //    i. On the server:
    //      - if value is null, save main into the DB and return it
    //      - else, return the value
    // 2. Set the value returned into this.currentRoomOpen

    async componentDidMount() {
        console.log('componentDidMount()')

        if (Cookies.get("jwtHP") === undefined) {
            this.setState({isLoggedIn: false})
            return
        }


        let groupID = null
        let currentRoomName = null
        let userReceivedGroupInvitation = false

        // This is for when we navigate to this component using the address bar
        if (this.props.location.state === undefined) {
            console.log("Option - A")

            let urlData = this.props.location.pathname.substring(this.props.location.pathname.indexOf("/group") + 7)
            urlData = urlData.split("/")

            groupID = urlData[0]
            currentRoomName = urlData[1]


            userReceivedGroupInvitation = await this.userReceivedGroupInvitation(groupID)

            // an error occurred
            if (userReceivedGroupInvitation === undefined)
                return

            if (!userReceivedGroupInvitation) {
                const userIsMember = await this.userIsGroupMember(this.state.userID, groupID)

                // an error occurred
                if (userIsMember === undefined)
                    return

                if (!userIsMember) {
                    this.setState({showGroup: false})
                    return
                }
            }
        }
        // This is for when we navigate to this component using a link
        else {
            console.log("Option - B12")
            groupID = this.props.location.state.groupID
            currentRoomName = this.props.location.state.currentRoomName

            userReceivedGroupInvitation = await this.userReceivedGroupInvitation(groupID)

            // an error occurred
            if (userReceivedGroupInvitation === undefined)
                return
        }



        const group = await this.getGroupInfo(groupID)
        console.log(group)

        // an error occurred
        if (group === undefined)
            return


        const groupAdmin = group.admin
        const groupMembers = await this.getGroupMembers(groupID)

        // an error occurred
        if (groupMembers === undefined)
            return


        const groupRooms = await this.getGroupRooms(groupID)

        // an error occurred
        if (groupRooms === undefined)
            return


        let currentRoomID = null

        for (let i = 0; i < groupRooms.length; i++) {
            if (groupRooms[i].name === currentRoomName) {
                currentRoomID = groupRooms[i].id
                break
            }
        }

        if (currentRoomID === null) {
            this.setState({roomFound: false})
            return
        }


        const status = await this.setRoomID(currentRoomID)

        if (status === undefined)
            return

        this.setState({
            groupName: group.name,
            groupID: groupID,
            groupMembers: groupMembers,
            groupRooms: groupRooms,
            groupAdmin: groupAdmin,
            currentRoomName: currentRoomName,
            currentRoomID: currentRoomID,
            showUserReceivedGroupInvitation: userReceivedGroupInvitation,
            stateLoaded: true,
            childKey: uuidv4()
        })
    }


    async componentWillUnmount() {
        console.log('componentWillUnmount() -- from group.js')
        console.log(this.state.currentRoomID)
        await this.setRoomID(null)

        if (this.state.currentRoomID !== null)
            this.state.socket.emit('leave-room', this.state.currentRoomID)
    }


    async componentDidUpdate() {
        console.log('componentDidUpdate')
        console.log(this.state)

        const urlRoomName = window.location.href.substring(window.location.href.lastIndexOf('/') + 1)
        console.log(urlRoomName)
        console.log(this.state.currentRoomName)


        if (urlRoomName !== this.state.currentRoomName) {
            const groupRooms = await this.getGroupRooms(this.state.groupID)

            // an error occurred
            if (groupRooms === undefined)
                return


            let newRoomID = null

            for (let i = 0; i < groupRooms.length; i++) {
                if (groupRooms[i].name === urlRoomName) {
                    newRoomID = groupRooms[i].id
                    break
                }
            }


            this.setRoomID(newRoomID)

            this.setState({
                showCreateRoomComponent: false,
                currentRoomName: urlRoomName,
                currentRoomID: newRoomID,
                groupRooms: groupRooms,
                childKey: uuidv4()
            })
        }
    }


    async userReceivedGroupInvitation(groupID) {
        console.log("userReceivedGroupInvitation()")

        const response = await fetch(`api/did-user-receive-invite?userID=${this.state.userID}&groupID=${groupID}`, {credentials: "include"})

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.setState({displayError: true, stateLoaded: true})
            return undefined
        }

        const userReceivedGroupInvitation = await response.json()
        return userReceivedGroupInvitation
    }


    async userIsGroupMember(userID, groupID) {
        const response = await fetch(`api/is-user-group-member?userID=${userID}&groupID=${groupID}`, {credentials: "include"})

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.setState({displayError: true, stateLoaded: true})
            return undefined
        }

        const userIsMember = await response.json()
        return userIsMember
    }


    async getGroupInfo(groupID) {
        let response = await fetch(`api/get-group?groupID=${groupID}`, {credentials: "include"})

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.setState({displayError: true, stateLoaded: true})
            return undefined
        }

        const groupInfo = await response.json()
        return groupInfo
    }


    async getGroupMembers(groupID) {
        const response = await fetch(`api/get-group-members?groupID=${groupID}`, {credentials: "include"})

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.setState({displayError: true, stateLoaded: true})
            return undefined
        }

        const memberUsernames = await response.json()
        return memberUsernames
    }


    async getGroupRooms(groupID) {
        let response = await fetch(`api/get-group-rooms?groupID=${groupID}`, {credentials: "include"})

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.setState({displayError: true, stateLoaded: true})
            return undefined
        }

        const rooms = await response.json()
        return rooms
    }


    async setRoomID(roomID) {
        const response = await fetch('api/set-user-info', {
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
            console.log(e)
            this.setState({displayError: true, stateLoaded: true})
            return undefined
        }

        return "Success"
    }


    async openRoom(newRoomName) {
        console.log('openRoom()')
        console.log(newRoomName)
        console.log(this.state.currentRoomName)

        if (newRoomName === this.state.currentRoomName)
            return


        this.state.socket.emit('leave-room', this.state.currentRoomID)

        let newRoomID = null

        for (let i = 0; i < this.state.groupRooms.length; i++) {
            if (this.state.groupRooms[i].name === newRoomName) {
                newRoomID = this.state.groupRooms[i].id
                break
            }
        }

        console.log(newRoomID)
        this.props.history.push(`/group/${this.state.groupID}/${newRoomName}`, {currentRoomName: newRoomName, groupID: this.state.groupID, groupName: this.state.groupName})
    }


    toggleCreateRoomComponent() {
        console.log('toggleCreateRoomComponent() called')
        this.setState({showCreateRoomComponent: !this.state.showCreateRoomComponent})
    }


    toggleBecomeAdminComponent() {
        console.log('toggleBecomeAdminComponent() called')
        this.setState({showBecomeAdminComponent: !this.state.showBecomeAdminComponent})
    }


    toggleInviteUserComponent() {
        console.log('toggleInviteUserComponent() called')
        this.setState({showInviteUserComponent: !this.state.showInviteUserComponent})
    }


    toggleLeaveGroupComponent() {
        console.log('toggleLeaveGroupComponent() called')
        this.setState({showLeaveGroupComponent: !this.state.showLeaveGroupComponent})
    }


    // GIR = Group Invitation Received
    closeGIRcomponent(decision) {
        console.log("closeGIRcomponent() called")

        if (decision === "Decline")
            this.props.history.push("/groups")

        this.setState({showUserReceivedGroupInvitation: false})
    }


    invitationSent(userInvited) {
        console.log('invitationSent() called')
        this.setState({showInviteUserComponent: false, showInvitationSentComponent: true, userInvited: userInvited})
    }


    toggleInvitationSentComponent() {
        console.log('toggleInvitationSentComponent() called')
        this.setState({showInvitationSentComponent: !this.state.showInvitationSentComponent})
    }


    updateGroupAdmin(status, groupAdmin) {
        console.log('updateGroupAdmin() called')
        console.log(status)
        console.log(groupAdmin)

        if (status === "SUCCESS")
            this.setState({showBecomeAdminComponent: false, groupAdmin: groupAdmin})
        else
            this.setState({showBecomeAdminComponent: false})
    }


    async goToNewRoom(newRoom) {
        console.log('goToNewRoom() called')
        console.log(newRoom)

        this.state.socket.emit('leave-room', this.state.currentRoomID)
        this.props.history.push(`/group/${this.state.groupID}/${newRoom.name}`)
    }


    toggleErrorComponent() {
        console.log("toggleErrorComponent()")
        this.setState({displayError: !this.state.displayError})
    }


    render() {
        console.log(this.state)

        if (!this.state.stateLoaded)
            return <Loading/>


        if (!this.state.showGroup) {
            return (
                <AccessGroupDenied/>
            )
        }

        if (!this.state.roomFound) {
            return (
                <PageNotFound/>
            )
        }

        if (!this.state.isLoggedIn)
            return <Redirect to="/login"/>

        return (
            <div className="body">
                <div className="left-container">
                    <div className="lc-outer-container">
                        <div className="lc-inner-container">
                            <h3>{this.state.groupName}</h3>
                            <hr/>

                            <div className="group-roomnames" key={uuidv4()}>
                                <h5><strong>Rooms</strong></h5>

                                {
                                    this.state.groupRooms.map(room => {
                                        if (room.name === this.state.currentRoomName)
                                            return (
                                                <div className="current-group-room-link" key={room.name}>
                                                    {room.name}
                                                </div>
                                            )
                                        else
                                            return (
                                                <div className="new-group-room-link" key={room.name} onClick={() => this.openRoom(room.name)}>
                                                    {room.name}
                                                </div>
                                            )
                                    })
                                }

                                <button onClick={this.toggleCreateRoomComponent}>Create a room</button>
                            </div>

                            <div className="group-admin-container">
                                <h5><strong>Admin</strong></h5>

                                {
                                    (this.state.groupAdmin !== null) ?

                                    <div className="admin-exists-container">
                                        {this.state.groupMembers[this.state.groupAdmin]}
                                    </div>

                                    :

                                    <div className="admin-missing-container">
                                        <p><em>None</em></p>
                                        <button onClick={this.toggleBecomeAdminComponent}>Become Admin</button>
                                    </div>
                                }
                            </div>


                            <div className="invite-users-category">
                                <button onClick={this.toggleInviteUserComponent}>+ Invite User</button>
                            </div>

                            <div className="leave-group-category">
                                <button onClick={this.toggleLeaveGroupComponent}>Leave Group</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="right-container">
                    <GroupRoom key={this.state.childKey} roomName={this.state.currentRoomName} roomID={this.state.currentRoomID} groupName={this.state.groupName} groupID={this.state.groupID} roomMembers={this.state.groupMembers} userID={this.state.userID} socket={this.state.socket} displayError={this.toggleErrorComponent}/>
                </div>

                {this.state.showUserReceivedGroupInvitation && <GroupInvitationReceived groupID={this.state.groupID} groupName={this.state.groupName} closeComponent={this.closeGIRcomponent}/>}
                {this.state.showInviteUserComponent && <InviteUser sender={this.state.userID} groupID={this.state.groupID} groupName={this.state.groupName} groupMembers={this.state.groupMembers} closeComponent={this.toggleInviteUserComponent} invitationSent={this.invitationSent}/>}
                {this.state.showInvitationSentComponent && <InvitationSent recipient={this.state.userInvited} closeComponent={this.toggleInvitationSentComponent}/>}
                {this.state.showLeaveGroupComponent && <LeaveGroup userID={this.state.userID} groupName={this.state.groupName} groupID={this.state.groupID} closeComponent={this.toggleLeaveGroupComponent}/>}
                {this.state.showBecomeAdminComponent && <BecomeAdmin groupName={this.state.groupName} groupID={this.state.groupID} userID={this.state.userID} closeComponent={this.toggleBecomeAdminComponent} updateGroupAdmin={this.updateGroupAdmin}/>}
                {this.state.showCreateRoomComponent && <CreateRoom groupID={this.state.groupID} rooms={this.state.groupRooms} roomMembers={this.state.groupMembers} creator={this.state.userID} closeComponent={this.toggleCreateRoomComponent} goToNewRoom={this.goToNewRoom}/>}
                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent} />}
            </div>
        )
    }
}


export default Group

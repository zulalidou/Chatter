import React from 'react'
import { Redirect } from "react-router-dom"
import ModifyProfileInfo from './modify-profile-info'
import DeleteAccount from './delete-account'
import Error from './error'
import Loading from "./loading"
import "../../styles/profile.css"

import jwt_decode from 'jwt-decode'
import Cookies from 'js-cookie'
import { generateFromString } from 'generate-avatar'
import { v4 as uuidv4 } from 'uuid'


class Profile extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            isLoggedIn: true,
            userID: (Cookies.get("jwtHP") === undefined) ? null : jwt_decode(Cookies.get("jwtHP")).userID,
            username: (Cookies.get("jwtHP") === undefined) ? null : jwt_decode(Cookies.get("jwtHP")).username,
            profileInfo: null,

            showModificationComponent: false,
            showDeleteAccountComponent: false,
            infoToChange: null,

            stateLoaded: false,
            displayError: false
        }

        this.getRoomID = this.getRoomID.bind(this)
        this.setRoomID = this.setRoomID.bind(this)
        this.getProfileInfo = this.getProfileInfo.bind(this)
        this.changeAvatar = this.changeAvatar.bind(this)
        this.toggleComponent = this.toggleComponent.bind(this)
        this.updateInfo = this.updateInfo.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    async componentDidMount() {
        if (Cookies.get("jwtHP") === undefined) {
            this.setState({isLoggedIn: false})
            return
        }



        let currentRoomOpen = await this.getRoomID()

        if (currentRoomOpen === "ERROR-OCCURRED") {
            this.setState({stateLoaded: true})
            return
        }

        if (currentRoomOpen !== "") {
            const status = await this.setRoomID(null)

            if (status === "ERROR-OCCURRED") {
                this.setState({stateLoaded: true})
                return
            }
        }


        const profileInfo = await this.getProfileInfo(this.state.userID)

        if (profileInfo === "ERROR-OCCURRED") {
            this.setState({stateLoaded: true})
            return
        }


        this.setState({profileInfo: profileInfo, stateLoaded: true})
    }


    async getRoomID() {
        let response = await fetch(`/api/get-user-field-info?userID=${this.state.userID}&attribute=currentRoomOpen`)

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        const roomID = await response.text()
        return roomID
    }


    async setRoomID(roomID) {
        const token = Cookies.get("XSRF-Token")

        const response = await fetch('/api/set-user-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'XSRF-Token': token
            },
            body: JSON.stringify({userID: this.state.userID, attribute: 'currentRoomOpen', value: roomID})
        })

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        return "Success"
    }


    async getProfileInfo(userID) {
        const response = await fetch(`/api/get-profile-info?userID=${userID}`)
        const profileInfo = await response.json()

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return "ERROR-OCCURRED"
        }

        return profileInfo
    }


    async changeAvatar() {
        const newAvatarString = uuidv4()

        const token = Cookies.get("XSRF-Token")

        const response = await fetch('/api/set-user-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'XSRF-Token': token
            },
            body: JSON.stringify({userID: this.state.userID, attribute: 'avatarString', value: newAvatarString})
        })

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return
        }


        let modifiedProfileInfo = this.state.profileInfo
        modifiedProfileInfo.avatarString = newAvatarString
        this.setState({profileInfo: modifiedProfileInfo})
    }


    toggleComponent(component) {
        if (component === 'ModifyProfileInfo')
            this.setState({showModificationComponent: !this.state.showModificationComponent})
        else
            this.setState({showDeleteAccountComponent: !this.state.showDeleteAccountComponent})
    }


    updateInfo(attribute, value) {
        let newProfileInfo = this.state.profileInfo
        newProfileInfo[attribute] = value

        this.setState({profileInfo: newProfileInfo})
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
                    <h1>Profile</h1>
                </div>

                <div className="right-container">
                    <h3 id="profile-header">
                        Profile
                    </h3>

                    <div className="user-info-container">
                        <div className="user-info-top">
                            <div>
                                <div id="avatar-div">
                                    <img id="avatar-img" src={`data:image/svg+xml;utf8,${this.state.profileInfo && generateFromString(this.state.profileInfo.avatarString)}`} alt="user profile avatar"/>
                                </div>

                                <div id="username-and-userid">
                                    <h4>{this.state.username}</h4>
                                    <p>{this.state.userID}</p>
                                </div>
                            </div>

                            <div id="change-avatar-container">
                                <button id="change-avatar-btn" onClick={this.changeAvatar}>CHANGE AVATAR</button>
                            </div>
                        </div>

                        <div className="user-info-bottom">
                            <ModifyProfileInfo userID={this.state.userID} email={this.state.profileInfo && this.state.profileInfo.email} attribute="name" value={this.state.profileInfo && this.state.profileInfo.name} updateInfo={this.updateInfo} displayError={this.toggleErrorComponent}/>
                            <ModifyProfileInfo id="password-change-container" userID={this.state.userID} email={this.state.profileInfo && this.state.profileInfo.email} attribute="password" value="**********" updateInfo={this.updateInfo} displayError={this.toggleErrorComponent}/>
                        </div>
                    </div>

                    <br/>
                    <hr id="line-separator"/>
                    <br/>

                    <div id="delete-account-container">
                        <h3>ACCOUT REMOVAL</h3>

                        <div>
                            <p>Performing this action will permanently delete your account.</p>
                            <button type="button" onClick={() => this.toggleComponent("DeleteAccount")}>Delete Account</button>
                        </div>
                    </div>
                </div>

                {this.state.showDeleteAccountComponent && <DeleteAccount userID={this.state.profileInfo.id} email={this.state.profileInfo && this.state.profileInfo.email} closeComponent={this.toggleComponent} history={this.props.history} displayError={this.toggleErrorComponent}/>}
                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent} />}
            </div>
        )
    }
}


export default Profile

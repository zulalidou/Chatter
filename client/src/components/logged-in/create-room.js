import React from "react"
import { v4 as uuidv4 } from "uuid"
import { withRouter } from "react-router-dom"

import Error from "./error"
import Cookies from "js-cookie"
import "../../styles/create-room.css"


class CreateRoom extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            displayError: false
        }

        this.createRoom = this.createRoom.bind(this)
        this.hideErrorMessages = this.hideErrorMessages.bind(this)
        this.getDate = this.getDate.bind(this)
        this.getTime = this.getTime.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    async createRoom() {
        this.hideErrorMessages()

        const roomName = document.getElementById("cr-room-name-input").value.trim()
        const roomPurpose = document.getElementById("cr-room-purpose-input").value.trim()

        if (roomName.trim() === '') {
            document.getElementById("cr-error-message").innerHTML = "This field is required"
            document.getElementById("cr-error-message").style.visibility = "visible"
            return
        }
        else {
            // check to see if the room name provided already exists
            for (let i = 0; i < this.props.rooms.length; i++) {
                if (this.props.rooms[i].name === roomName) {
                    document.getElementById("cr-error-message").innerHTML = "This room already exists. Try a different name."
                    document.getElementById("cr-error-message").style.visibility = "visible"
                    return
                }
            }


            const newRoom = {
                id: uuidv4(),
                name: roomName,
                purpose: roomPurpose,
                groupID: this.props.groupID,
                creator: this.props.creator,
                date: this.getDate(),
                time: this.getTime(),
                groupRoom: true
            }


            const token = Cookies.get("XSRF-Token")

            const response = await fetch("/api/create-room", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "XSRF-Token": token
                },
                body: JSON.stringify(newRoom)
            })


            try {
                if (response.status !== 200)
                    throw "ERROR-OCCURRED"
            } catch (e) {
                this.setState({displayError: true})
                return
            }


            this.props.goToNewRoom(newRoom)
        }
    }


    hideErrorMessages() {
        document.getElementById("cr-error-message").style.visibility = "hidden"
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
        let dateObj = new Date()
        return dateObj.getTime()
    }


    toggleErrorComponent() {
        this.setState({displayError: !this.state.displayError})
    }


    render() {
        return (
            <div>
                {/* The purpose of the div immediately below is to provide a slightly dark background for when this component becomes visible */}
                <div className="dark-background" onClick={this.props.closeComponent}>
                </div>

                <form className="create-room-form">
                    <div className="cr-form-top">
                        <div className="cr-form-title">
                            <h3>Create a room</h3>
                        </div>

                        <div className="cr-form-closer">
                            <button className="cr-close-form-btn" type="button" onClick={this.props.closeComponent}>&#10006;</button>
                        </div>
                    </div>

                    <hr/>

                    <div className="cr-form-middle">
                        <label>Name</label> <br/>
                        <input id="cr-room-name-input" placeholder="e.g. games" autoComplete="off"/> <br/>
                        <p id="cr-error-message">This field is required</p>
                        <br/>

                        <label>Purpose (optional)</label> <br/>
                        <input id="cr-room-purpose-input" autoComplete="off"/>
                    </div>

                    <div className="cr-form-bottom">
                        <div className="cr-form-bottom-container">
                            <button className="cr-form-bottom-btn cr-btn-1" type="button" onClick={this.props.closeComponent}>Cancel</button>
                            <button className="cr-form-bottom-btn cr-btn-2" type="button" onClick={this.createRoom}>Create</button>
                        </div>
                    </div>
                </form>

                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent}/>}
            </div>
        )
    }
}


export default withRouter(CreateRoom)

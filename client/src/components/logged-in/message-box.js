import React from 'react'
import "../../styles/message-box.css"
import { generateFromString } from "generate-avatar"


class MessageBox extends React.Component {
    constructor() {
        super()

        console.log("Message Box component called")
    }


    render() {
        // console.log(this.props)
        console.log(this.props)


        /* This is a container returned to a user to let them know that the other user they're chatting with has disconnected -
           in other words, they've either logged out, or their session ended*/
        if (this.props.senderID === "N/A") {
            console.log("1")

            return (
                <div id="user-disconnected-container">
                    {this.props.message.toUpperCase()}
                </div>
            )
        }


        /* This contains the time at which a user sent a message, along with their actual message. */
        else if (this.props.avatarString === undefined) {
            console.log("2")

            return (
                <div className="message-container">
                    <div id="time-container">
                        {this.props.time}
                    </div>

                    <div className="text-container">
                        {this.props.message}
                    </div>
                </div>
            )
        }


        console.log("3")



        /* This returns the user's profile img, along with a container containing their username and the date and time at which
           they sent their message, and finally a container that contains their actual message*/
        return (
            <div className="message-container">
                <div id="avatar-container">
                    <img id="avatar-img" src={`data:image/svg+xml;utf8,${generateFromString(this.props.avatarString)}`} alt="user profile avatar"/>
                </div>

                <div id="username-and-text-container">
                    <div id="username-container">
                        <div>
                            <strong>{this.props.username}</strong>
                        </div>

                        <div id="date-and-time-container">
                            {this.props.date} - {this.props.time}
                        </div>
                    </div>

                    <div className="text-container">
                        {this.props.message}
                    </div>
                </div>
            </div>
        )
    }
}


export default MessageBox

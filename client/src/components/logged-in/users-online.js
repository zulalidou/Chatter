import React from "react"
import "../../styles/users-online.css"


class UsersOnline extends React.Component {
    constructor(props) {
        super(props)
        console.log("USERS-ONLINE constructor called")
        console.log(this.props)
    }

    render() {
        return (
            <div id="users-online-container">
                <div id="users-online-container-header">
                    <div>
                        <strong id="users-online-label">Users online: {this.props.loggedInUsers.length}</strong>
                    </div>
                </div>

                <div id="users-online-container-body">
                    {
                        this.props.loggedInUsers.map((username, idx) => {
                            if (username === this.props.user2username)
                                return (<div key={idx} className="logged-in-user active" onClick={() => this.props.openRoom(username)}>
                                            {username}
                                        </div>)

                            return (<div key={idx} className="logged-in-user" onClick={() => this.props.openRoom(username)}>
                                        {username}
                                    </div>)
                        })
                    }
                </div>
            </div>
        )
    }
}

export default UsersOnline

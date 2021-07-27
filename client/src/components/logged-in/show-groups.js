import React from 'react'
import { Link } from "react-router-dom"

import "../../styles/show-groups.css"


class ShowGroups extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            groupInfo: null
        }
    }


    render() {
        return (
            <div>
                { this.props.group &&

                    <button className="group-btn">
                        <Link to={{
                            pathname: `/group/${this.props.group.id}/main`,
                            state: {
                                groupName: this.props.group.name,
                                groupID: this.props.group.id,
                                currentRoomName: "main"
                            }

                        }} style={{textDecoration: "none"}}>

                            <div className="group-container">
                                <div className="group-name-container">
                                    {this.props.group.name}
                                </div>

                                <div className="group-date-container">
                                    {this.props.group.date}
                                </div>
                            </div>
                        </Link>
                    </button>
                }
            </div>
        )
    }
}


export default ShowGroups

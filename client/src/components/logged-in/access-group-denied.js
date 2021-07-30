import React from "react"
import { Link } from "react-router-dom"

import AccessDeniedIcon from "../../images/access-denied.png"
import "../../styles/access-group-denied.css"


class AccessGroupDenied extends React.Component {
    constructor() {
        super()
    }


    render() {
        return (
            <div className="access-group-denied-container">
                <h3>Stop right there!</h3>
                <p>
                    This is a private group, which means that you can only view its contents <strong><em>if</em></strong> you're
                    personally invited by one of its members.
                </p>

                <div className="access-group-denied-icon-container">
                    <img className="access-group-denied-icon" src={AccessDeniedIcon} alt="access denied"/>
                </div>

                <br/>

                <div className="access-group-denied-container-link access-group-denied-btn1">
                    <Link to="/home" className="agd-link">
                        Home
                    </Link>
                </div>

                <div className="access-group-denied-container-link">
                    <Link to="/groups" className="agd-link">
                        Groups
                    </Link>
                </div>
            </div>
        )
    }
}


export default AccessGroupDenied

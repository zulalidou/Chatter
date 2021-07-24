import React from "react"
import { Link } from "react-router-dom"
import "../../styles/navbar-menu.css"


class NavbarMenu extends React.Component {
    render() {
        return (
            <div className="navbar-menu">
                <Link to="/profile" onClick={this.props.close} style={{color: "black", textDecoration: "none"}}>
                    <div className="item" id="first-item">
                        Profile
                    </div>
                </Link>

                <button className="item" id="last-item" onClick={this.props.logout} style={{padding: "0"}}>
                    <div className="item" id="last-item">
                        Logout
                    </div>
                </button>
            </div>
        )
    }
}

export default NavbarMenu

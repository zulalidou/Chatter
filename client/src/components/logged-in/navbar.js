import React from 'react'
import { Link } from "react-router-dom"
import Cookies from 'js-cookie'

import logoIcon from "../../images/logo.png"
import notificationIcon from "../../images/bell.png"
import hamburgerIcon from "../../images/hamburger.png"
import closeIcon from "../../images/close.png"
import profile2Icon from "../../images/profile-2.png"

import "../../styles/navbar.css"
import jwt_decode from 'jwt-decode'

import NotificationsBox from "./notifications-box"
import NavbarMenu from "./navbar-menu"
import Error from "./error"


class Navbar extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            showSidebar: false,
            showNotificationsBox: false,
            showNavbarMenuItems: false,
            userID: (Cookies.get("jwtHP") === undefined) ? null : jwt_decode(Cookies.get("jwtHP")).userID,
            displayError: false,
            isLoggedIn: false,
            timerID: null
        }

        this.logUserOut = this.logUserOut.bind(this)
        this.toggleNotificationsBox = this.toggleNotificationsBox.bind(this)
        this.showNavbarMenu = this.showNavbarMenu.bind(this)
        this.goToPage = this.goToPage.bind(this)
        this.logout = this.logout.bind(this)
        this.openSidebar = this.openSidebar.bind(this)
        this.close = this.close.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    componentDidUpdate() {
        if (Cookies.get("jwtHP") !== undefined && this.state.timerID === null) {
            const timerID = setInterval(async () => {
                if (Cookies.get("jwtHP") === undefined) {
                    clearInterval(timerID)
                    return
                }

                const sessionExpirationTime = jwt_decode(Cookies.get("jwtHP")).expirationTime
                this.setState({timerID: timerID, isLoggedIn: true})


                // Logging the user out early (60 seconds to be precise). This is because in order to log out a user, the /logout route
                // needs to be called, and for it to be called and run successfully, the cookie can't have expired yet. Hence the reason why
                // the user is logged out 1 min earlier before the cookie/session expires.
                // - Also, the cookie/session is set to expire 1 hour and 1 min after the user logs in, so calling the /logout route 1 min early
                //   just means that each user's session lasts an hour, so there's no harm done.
                if (Math.ceil(Date.now()/1000) >= sessionExpirationTime - 60) {
                    await this.logUserOut(timerID)
                }
            }, 1000)
        }
    }


    async logUserOut(timerID) {
        const response = await fetch("/api/logout", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                userID: jwt_decode(Cookies.get("jwtHP")).userID,
                sessionEnded: true
            })
        })

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return
        }


        // deletes the cookies
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })


        if (timerID !== null) {
            clearInterval(timerID)
        }


        this.setState({isLoggedIn: false})

        this.props.history.push("/login")
    }


    toggleNotificationsBox() {
        this.setState({showNotificationsBox: !this.state.showNotificationsBox})
    }


    showNavbarMenu() {
        this.setState({showNavbarMenuItems: true})
    }


    goToPage(route) {
        this.close()
        this.props.history.push(route)
    }


    toggleErrorComponent() {
        this.setState({displayError: !this.state.displayError})
    }


    async logout() {
        this.close()

        const response = await fetch("/api/logout", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userID: jwt_decode(Cookies.get("jwtHP")).userID,
                sessionEnded: false
            })
        })

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            this.setState({displayError: true})
            return
        }


        // deletes the cookies
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })


        clearInterval(this.state.timerID)

        this.props.history.push("/login")
    }


    openSidebar() {
        this.setState({showSidebar: true})
        document.getElementById("sidebar").style.width = "75%"
    }


    close() {
        this.setState({showSidebar: false, showNotificationsBox: false, showNavbarMenuItems: false})
        document.getElementById("sidebar").style.width = "0"
    }


    render() {
        if (this.state.timerID !== null && Cookies.get("jwtHP") === undefined)
            clearInterval(this.state.timerID)

        if (Cookies.get("jwtHP") === undefined)
            return null

        return (
            <nav className="navbar-container">
                <div className="navbar">
                    <button className="nav-hamburger" onClick={this.openSidebar}>
                        <img className="nav-img" src={hamburgerIcon} alt="Hamburger icon"/>
                    </button>

                    <button className="nav-logo" onClick={() => this.goToPage("/home")}>
                        <img className="nav-img" src={logoIcon} alt="Logo icon"/>
                    </button>

                    <button className="nav-item" id="notifications-btn" onClick={this.toggleNotificationsBox}>
                        <img className="nav-img" src={notificationIcon} alt="Notification icon"/>
                    </button>

                    <button className="nav-item" id="navbar-menu-btn" onClick={this.showNavbarMenu}>
                        <img className="nav-img" src={profile2Icon} alt="Profile icon"/>
                    </button>
                </div>


                {
                    (this.state.showSidebar || this.state.showNotificationsBox || this.state.showNavbarMenuItems) &&

                    <div className="dark-background" onClick={this.close}>
                    </div>
                }


                <div id="sidebar">
                    <div className="sidebar-header">
                        <button className="nav-close" onClick={this.close}>
                            <img className="nav-img" src={closeIcon} alt="Close icon"/>
                        </button>
                    </div>

                    <div className="sidebar-body">
                        <Link to="/home" onClick={this.close} style={{color: "black", textDecoration: "none"}}>
                            <div className="sidebar-link">
                                Home
                            </div>
                        </Link>

                        <Link to="/profile" onClick={this.close} style={{color: "black", textDecoration: "none"}}>
                            <div className="sidebar-link">
                                Profile
                            </div>
                        </Link>

                        <Link to="/groups" onClick={this.close} style={{color: "black", textDecoration: "none"}}>
                            <div className="sidebar-link">
                                Groups
                            </div>
                        </Link>

                        <Link to="/random-chat" onClick={this.close} style={{color: "black", textDecoration: "none"}}>
                            <div className="sidebar-link">
                                Random Chat
                            </div>
                        </Link>

                        <button className="border-0" onClick={this.logout} style={{backgroundColor: "green", width: "100%", padding: "0"}}>
                            <div className="sidebar-link" style={{textAlign: "left", width: "100%"}}>
                                Logout
                            </div>
                        </button>
                    </div>
                </div>

                {
                    this.state.showNotificationsBox &&

                    <NotificationsBox userID={this.state.userID} closeComponent={this.toggleNotificationsBox}/>
                }


                {
                    this.state.showNavbarMenuItems &&

                    <NavbarMenu close={this.close} logout={this.logout}/>
                }

                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent}/>}
            </nav>
        )
    }
}


export default Navbar

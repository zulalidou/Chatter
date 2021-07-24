import React from 'react'
import { Link } from "react-router-dom"

import Cookies from 'js-cookie'
import PageNotFoundIcon from "../images/page-not-found.png"
import "../styles/page-not-found.css"


class PageNotFound extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            isLoggedIn: (Cookies.get("jwtHP") === undefined) ? false : true
        }

        console.log("PAGE-NOT-FOUND component")
    }


    render() {
        console.log(this.state.isLoggedIn)

        if (this.state.isLoggedIn)
            return (
                <div className="pnfc1-contents">
                    <h2>This page isn't available</h2>
                    <p>The link you followed may be broken, or the page may have been removed.</p>

                    <div className="page-not-found-icon-container">
                        <img className="page-not-found-icon" src={PageNotFoundIcon} alt="page not found"/>
                    </div>

                    <br/>

                    <Link to="/home" style={{textDecoration: "none", color: "black"}}>
                        <div className="pnfc-contents-link">
                            Home
                        </div>
                    </Link>
                </div>
            )

        return (
            <div className="page-not-found-container-2">
                <div className="pnfc2-contents">
                    <h2>This page isn't available</h2>
                    <p>The link you followed may be broken, or the page may have been removed.</p>

                    <div className="page-not-found-icon-container">
                        <img className="page-not-found-icon" src={PageNotFoundIcon} alt="page not found"/>
                    </div>

                    <br/>

                    <Link to="/login" style={{textDecoration: "none", color: "black"}}>
                        <div className="pnfc-contents-link">
                            Log in
                        </div>
                    </Link>
                </div>
            </div>
        )
    }
}


export default PageNotFound

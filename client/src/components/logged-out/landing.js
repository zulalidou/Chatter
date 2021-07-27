import React from 'react'
import { Link, Redirect } from "react-router-dom"
import Cookies from "js-cookie"
import Logo from "../../images/logo.png"


import "../../styles/landing.css"


class Landing extends React.Component {
    render() {
        if (Cookies.get("jwtHP") !== undefined) {
            return <Redirect to="/home"/>
        }

        return (
            <div className="landing-page-body-container">
                <div className="lp-content-container">
                    <img src = {Logo} alt="logo" />

                    <p>A place to meet new people and keep in touch with your friends and family.</p>

                    <div className="buttons-container">
                        <Link to="/signup">
                            <button type="button" id="bc-btn-1">
                                    Sign Up
                            </button>
                        </Link>

                        <Link to="/login">
                            <button type="button" id="bc-btn-2">
                                    Log In
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        )
    }
}

export default Landing

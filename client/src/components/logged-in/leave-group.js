import React from 'react'
import { Redirect } from "react-router-dom"

import Error from "./error"
import "../../styles/leave-group.css"


class LeaveGroup extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            leftGroup: false,
            displayError: false
        }

        console.log("LEAVE-GROUP COMPONENT CALLED")
        this.leaveGroup = this.leaveGroup.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    async leaveGroup() {
        console.log("leaveGroup() called")

        const response = await fetch("/api/leave-group", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: "include",
            body: JSON.stringify({userID: this.props.userID, groupID: this.props.groupID})
        })

        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.setState({displayError: true})
            return
        }

        this.setState({leftGroup: true})
    }


    toggleErrorComponent() {
        console.log("toggleErrorComponent()")
        this.setState({displayError: !this.state.displayError})
    }


    render() {
        if (this.state.leftGroup) {
            return (
                <Redirect to="/groups"/>
            )
        }

        return (
            <div className="leave-group-container">
                {/* The purpose of the div immediately below is to provide a slightly dark background for when this component becomes visible */}
                <div className="dark-background" onClick={this.props.closeComponent}>
                </div>

                <form className="leave-group-form">
                    <div className="lg-form-top">
                        <div className="lg-form-title">
                            <h2>Leave <em>{this.props.groupName}</em></h2>
                        </div>

                        <div className="lg-form-closer">
                            <button className="lg-close-form-btn" type="button" onClick={this.props.closeComponent}>&#10006;</button>
                        </div>
                    </div>

                    <hr/>

                    <div className="lg-form-middle">
                        <p>Are you sure you want to leave the group? You'll no longer have access to any of the data and features associated with it.</p>
                    </div>

                    <div className="lg-form-bottom">
                        <div className="lg-form-bottom-container">
                            <button className="lg-form-bottom-btn lg-btn-1" type="button" onClick={this.props.closeComponent}>Cancel</button>
                            <button className="lg-form-bottom-btn lg-btn-2" type="button" onClick={this.leaveGroup}>Leave Group</button>
                        </div>
                    </div>
                </form>

                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent}/>}
            </div>
        )
    }
}


export default LeaveGroup

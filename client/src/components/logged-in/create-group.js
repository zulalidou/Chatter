import React from 'react'

import Error from './error'
import "../../styles/create-group.css"


class CreateGroup extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            isLoggedIn: true,
            displayError: false
        }

        console.log(this.props)
        this.createNewGroup = this.createNewGroup.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    async createNewGroup() {
        console.log('createNewGroup()')

        const name = document.getElementById('name-input').value.trim()

        if (name === "") {
            document.getElementById("error-message-create-group").style.visibility = "visible"
            return
        }

        const purpose = document.getElementById('group-purpose-input').value.trim()


        const response = await fetch('/api/create-group', {
            method: 'POST',
            // credentials: "include",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                purpose: purpose,
                admin: this.props.userID
            })
        })


        if (response.status !== 200) {
            console.log("error occurred")
            this.setState({displayError: true})
            return
        }

        console.log("all clear")
        this.props.addNewGroup()
        this.props.closeComponent()
    }


    toggleErrorComponent() {
        console.log("toggleErrorComponent()")
        this.setState({displayError: !this.state.displayError})
    }


    render() {
        return (
            <div>
                {/* The purpose of the div immediately below is to provide a slightly dark background for when this component becomes visible */}
                <div className="dark-background" onClick={this.props.closeComponent}>
                </div>

                <form id="create-group-form">
                    <div id="create-group-form-top">
                        <div id="form-title">
                            <h3>Create A Group</h3>
                        </div>

                        <div id="form-closer">
                            <button id="close-form-btn" type="button" onClick={this.props.closeComponent}>&#10006;</button>
                        </div>
                    </div>

                    <hr/>

                    <div id="create-group-form-middle">
                        <label id="name-input-label" htmlFor="name-input">Group Name</label>
                        <br/>
                        <input id="name-input" autoComplete="off"/>
                        <p id="error-message-create-group">This field is required</p>
                        <br/>

                        <label id="group-purpose-label" htmlFor="group-purpose-input">Purpose (optional)</label>
                        <br/>
                        <input id="group-purpose-input" autoComplete="off"/>
                    </div>

                    <div id="create-group-form-bottom">
                        <div id="bottom-form-btn-container">
                            <button id="one" className="bottom-form-btn" type="button" onClick={this.props.closeComponent}>Cancel</button>
                            <button id="two" className="bottom-form-btn" type="button" onClick={this.createNewGroup}>Create</button>
                        </div>
                    </div>
                </form>

                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent} />}
            </div>
        )
    }
}


export default CreateGroup

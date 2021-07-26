import React from "react"
import "../../styles/become-admin.css"
import Error from "./error"


class BecomeAdmin extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            displayError: false
        }

        console.log("BECOME-ADMIN COMPONENT")
        this.becomeAdmin = this.becomeAdmin.bind(this)
        this.toggleErrorComponent = this.toggleErrorComponent.bind(this)
    }


    async becomeAdmin() {
        console.log("becomeAdmin()")
        console.log(this.props)

        const response = await fetch("/api/become-admin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({groupID: this.props.groupID, userID: this.props.userID})
        })


        try {
            if (response.status !== 200)
                throw "ERROR-OCCURRED"
        } catch (e) {
            console.log(e)
            this.setState({displayError: true})
            return
        }

        const status = await response.text()
        this.props.updateGroupAdmin(status, this.props.userID)
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

                <form className="become-admin-form">
                    <div className="ba-form-top">
                        <div className="ba-form-title">
                            <h2>Become admin</h2>
                        </div>

                        <div className="ba-form-closer">
                            <button className="ba-close-form-btn" type="button" onClick={this.props.closeComponent}>&#10006;</button>
                        </div>
                    </div>

                    <hr/>

                    <div className="ba-form-middle">
                        <p>By being the admin of the group, you make sure that everything runs well and everyone behaves in a respectful manner.</p>
                    </div>

                    <div className="ba-form-bottom">
                        <div className="ba-form-bottom-container">
                            <button className="ba-form-bottom-btn ba-btn-1" type="button" onClick={this.props.closeComponent}>Cancel</button>
                            <button className="ba-form-bottom-btn ba-btn-2" type="button" onClick={this.becomeAdmin}>Confirm</button>
                        </div>
                    </div>
                </form>

                {this.state.displayError && <Error closeComponent={this.toggleErrorComponent}/>}
            </div>
        )
    }
}


export default BecomeAdmin

import React from 'react'
import "../../styles/delete-account.css"


class DeleteAccount extends React.Component {
    constructor(props) {
        super(props)

        console.log('DeleteAccount called')

        this.hideErrorMessages = this.hideErrorMessages.bind(this)
        this.deleteAccount = this.deleteAccount.bind(this)
        this.passwordIsValid = this.passwordIsValid.bind(this)
        this.delete = this.delete.bind(this)
        this.handleKeyPress = this.handleKeyPress.bind(this)
    }


    hideErrorMessages() {
        document.getElementById("da-password-label").innerText = "PASSWORD"
    }


    async deleteAccount() {
        console.log("deleteAccount() called")
        this.hideErrorMessages()

        const password = document.getElementById("da-password-input").value
        console.log(password)


        const passwordValid = await this.passwordIsValid(password)

        if (passwordValid === null || !passwordValid)
            return


        const status = await this.delete()

        if (status === null)
            return


        console.log('exiting now..')
        this.props.history.push("/signup")
    }


    async passwordIsValid(password) {
        if (password === "") {
            const errorTag = document.createElement("span")
            const text = document.createTextNode(" - This field is required")
            errorTag.className = "error-message-delete-account"
            errorTag.appendChild(text)

            document.getElementById("da-password-label").innerHTML = "PASSWORD" + errorTag.outerHTML
            return false
        }

        const response = await fetch(`/verify-password?userID=${this.props.userID}&password=${password}`, {credentials: "include"})

        console.log(response)


        const status = await response.text()
        console.log(status)

        if (status === "Failure") {
            console.log("password not valid")

            const errorTag = document.createElement("span")
            const text = document.createTextNode(" - Password is incorrect")
            errorTag.className = "error-message-delete-account"
            errorTag.appendChild(text)

            document.getElementById("da-password-label").innerHTML = "PASSWORD" + errorTag.outerHTML
            return false
        }

        return true
    }


    async delete() {
        const response = await fetch('/delete-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({id: this.props.userID})
        })

        if (response.status !== 200) {
            this.props.displayError()
            return null
        }

        return "Success"
    }


    handleKeyPress(event) {
        if (event.key === 'Enter') {
            event.preventDefault()
            this.deleteAccount()
        }
    }


    render() {
        console.log(this.props)

        return (
            <div>
                <div className="dark-background" onClick={this.props.closeComponent}>
                </div>

                <form className="delete-account-form">
                    <div className="da-form-top">
                        <div className="da-form-title">
                            <h3>Delete your account</h3>
                        </div>

                        <div className="da-form-closer">
                            <button className="da-close-form-btn" type="button" onClick={this.props.closeComponent}>&#10006;</button>
                        </div>
                    </div>

                    <hr/>

                    <div className="da-form-middle">
                        <p>Proceed with caution. Once you go through with this action, your entire account will get deleted!</p>

                        <label id="da-password-label" htmlFor="da-password-input">PASSWORD</label>
                        <input id="da-password-input" type="password" onKeyPress={this.handleKeyPress}/>
                    </div>

                    <div className="da-form-bottom">
                        <div className="da-form-bottom-container">
                            <button className="da-form-bottom-btn close-delete-form-btn" type="button" onClick={this.props.closeComponent}>Cancel</button>
                            <button className="da-form-bottom-btn delete-account-btn" type="button" onClick={this.deleteAccount}>Delete</button>
                        </div>
                    </div>
                </form>
            </div>
        )
    }
}


export default DeleteAccount

import React from 'react'
import {BrowserRouter as Router, Switch, Route} from "react-router-dom"

import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/js/bootstrap.bundle.min"

import Landing from "./components/logged-out/landing"
import Login from "./components/logged-out/login"
import Signup from "./components/logged-out/signup"
import ActivateAccount from "./components/logged-out/activate-account"
import ForgotPassword from "./components/logged-out/forgot-password"
import ResetPassword from "./components/logged-out/reset-password"
import SetNewPassword from "./components/logged-out/set-new-password"
import PasswordSuccessfullyReset from "./components/logged-out/password-successfully-reset"


import Navbar from "./components/logged-in/navbar"
import Home from "./components/logged-in/home"
import Groups from "./components/logged-in/groups"
import Group from "./components/logged-in/group"
import RandomRoom from "./components/logged-in/random-room"
import UsersOnline from "./components/logged-in/users-online"
import GroupRoom from "./components/logged-in/group-room"
import CreateRoom from "./components/logged-in/create-room"
import CreateGroup from "./components/logged-in/create-group"
import ShowGroups from "./components/logged-in/show-groups"
import ShowNoGroups from "./components/logged-in/show-no-groups"
import RandomChat from "./components/logged-in/random-chat"
import Profile from "./components/logged-in/profile"
import InviteUser from "./components/logged-in/invite-user"
import MessageBox from "./components/logged-in/message-box"

import NotificationsBox from "./components/logged-in/notifications-box"
import NavbarMenu from "./components/logged-in/navbar-menu"


import BecomeAdmin from "./components/logged-in/become-admin"
import LeaveGroup from "./components/logged-in/leave-group"

import DeleteAccount from "./components/logged-in/delete-account"
import PageNotFound from "./components/page-not-found"
import Error from "./components/logged-in/error"


class App extends React.Component {
    render() {
        return (
            <Router>
                <Route path="/" component={Navbar} />

                <Switch>
                    <Route exact path="/" component={Landing} />

                    <Route exact path="/login" component={Login} />
                    <Route exact path="/signup" component={Signup} />
                    <Route exact path="/activate-account" component={ActivateAccount} />
                    <Route exact path="/forgot-password" component={ForgotPassword} />
                    <Route exact path="/reset-password" component={ResetPassword} />

                    <Route exact path="/profile" component={Profile} />

                    <Route exact path="/home" component={Home} />
                    <Route exact path="/random-chat" component={RandomChat} />

                    <Route exact path="/groups" component={Groups} />
                    <Route exact path="/group/:id/:room_name" component={Group} />

                    <Route component={PageNotFound} />
                </Switch>
            </Router>
        )
    }
}


export default App

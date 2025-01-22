import * as express from "express"
import path from "path"
import {
	Dav,
	Auth,
	UsersController,
	SessionsController,
	Environment
} from "dav-js"
require("dotenv").config()

class App {
	public express
	auth: Auth

	constructor() {
		this.express = express.default()

		this.express.use(express.urlencoded())
		this.mountRoutes()

		// Generate the auth token
		this.auth = new Auth({
			apiKey: process.env.DAV_API_KEY,
			secretKey: process.env.DAV_SECRET_KEY,
			uuid: process.env.DAV_UUID
		})

		// Init dav-js
		new Dav({
			environment:
				process.env.ENV == "production"
					? Environment.Production
					: Environment.Development,
			server: true
		})
	}

	private mountRoutes(): void {
		const router = express.Router()

		router.post("/login", async (req, res) => {
			// Get the app id, api key and redirect url from the params
			var appId = Number(req.query.appId)
			var apiKey = req.query.apiKey as string
			var redirectUrl = req.query.redirectUrl as string

			// Get the email and password from the body
			var email = req.body.email as string
			var password = req.body.password as string

			if (appId == 0 || apiKey == null || redirectUrl == null) {
				// Redirect to login page with error
				let errorMessage = "Required url param missing!"
				res.redirect(`/login?error=${errorMessage}`)
				return
			}

			// Do the api request
			let response = await SessionsController.createSession(`accessToken`, {
				auth: this.auth,
				email,
				password,
				appId,
				apiKey: process.env.DAV_API_KEY,
				deviceName: "Unknown",
				deviceOs: "Windows 11"
			})

			if (!Array.isArray(response)) {
				// Redirect to the redirect url
				res.redirect(
					`${decodeURIComponent(redirectUrl).trim()}?accessToken=${
						response.accessToken
					}`
				)
			} else {
				// Redirect back to the login page with the appropriate error message
				let errorMessage = ""

				if (email.length == 0) {
					errorMessage = "Please enter your email"
				} else if (password.length == 0) {
					errorMessage = "Please enter your password"
				} else if (
					response.includes("PASSWORD_INCORRECT") ||
					response.includes("USER_DOES_NOT_EXIST")
				) {
					errorMessage = "Login failed"
				} else if (response.length > 0) {
					errorMessage = `Unexpected error (${response[0]})`
				}

				res.redirect(
					`/login?appId=${appId}&apiKey=${apiKey}&redirectUrl=${redirectUrl}&email=${email}&error=${errorMessage}`
				)
			}
		})

		router.post("/signup", async (req, res) => {
			// Get the app id, api key and redirect url from the params
			var appId = Number(req.query.appId)
			var apiKey = req.query.apiKey as string
			var redirectUrl = req.query.redirectUrl as string

			// Get the firstName, email, password and passwordConfirmation from the body
			var firstName = req.body.firstName as string
			var email = req.body.email as string
			var password = req.body.password as string
			var passwordConfirmation = req.body.passwordConfirmation as string

			if (appId == 0 || apiKey == null || redirectUrl == null) {
				// Redirect to signup page with error
				let errorMessage = "Required url param missing!"
				res.redirect(`/signup?error=${errorMessage}`)
				return
			}

			// Check if the password matches the password confirmation
			if (password != passwordConfirmation) {
				// Redirect to signup page with error
				let errorMessage =
					"Your password doesn't match the password confirmation"
				res.redirect(
					`/signup?appId=${appId}&apiKey=${apiKey}&redirectUrl=${redirectUrl}&firstName=${firstName}&password=${password}&email=${email}&error=${errorMessage}`
				)
				return
			}

			// Do the api request
			let response = await UsersController.createUser(`accessToken`, {
				auth: this.auth,
				email,
				firstName,
				password,
				appId,
				apiKey,
				deviceName: "Unknown",
				deviceOs: "Windows 11"
			})

			if (!Array.isArray(response)) {
				// Redirect to the redirect url
				res.redirect(
					`${decodeURIComponent(redirectUrl).trim()}?accessToken=${
						response.accessToken
					}`
				)
			} else {
				// Redirect back to the signup page with the appropriate error message
				let errorMessage = ""
				let removePassword = false

				if (firstName.length == 0) {
					errorMessage = "Please enter your name"
				} else if (email.length == 0) {
					errorMessage = "Please enter your email"
				} else if (password.length == 0) {
					errorMessage = "Please enter a password"
				} else if (response.includes("NAME_TOO_SHORT")) {
					errorMessage = "The name is too short"
				} else if (response.includes("PASSWORD_TOO_SHORT")) {
					errorMessage = "Your password is too short"
					removePassword = true
				} else if (response.includes("FIRST_NAME_TOO_LONG")) {
					errorMessage = "The name is too long"
				} else if (response.includes("PASSWORD_TOO_LONG")) {
					errorMessage = "Your password is too long"
					removePassword = true
				} else if (response.includes("EMAIL_INVALID")) {
					errorMessage = "Your email is invalid"
				} else if (response.includes("EMAIL_ALREADY_IN_USE")) {
					errorMessage = "This email address is already in use"
				} else if (response.length > 0) {
					errorMessage = `Unexpected error (${response[0]})`
				}

				let params = `appId=${appId}&apiKey=${apiKey}&redirectUrl=${redirectUrl}&firstName=${firstName}&email=${email}&error=${errorMessage}`

				if (!removePassword) {
					params += `&password=${password}`
				}

				res.redirect(`/signup?${params}`)
			}
		})

		router.get("/login", (req, res) => {
			res.sendFile(path.join(__dirname, "../public/login.html"))
		})

		router.get("/signup", (req, res) => {
			res.sendFile(path.join(__dirname, "../public/signup.html"))
		})

		router.get("/assets/dav-logo.png", (req, res) => {
			res.sendFile(path.join(__dirname, "../public/assets/dav-logo.png"))
		})

		router.get("/", (req, res) => {
			res.send("Nothing to see here")
		})
		this.express.use("/", router)
	}
}

export default new App().express

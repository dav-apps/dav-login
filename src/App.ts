import * as express from 'express'
import path from 'path'
import {
	Dav,
	Auth,
	UsersController,
	SessionsController,
	Environment,
	ErrorCodes
} from 'dav-js'
require('dotenv').config()

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
			environment: process.env.ENV == "production" ? Environment.Production : Environment.Development,
			server: true
		})
	}

	private mountRoutes(): void {
		const router = express.Router()

		router.post('/login', async (req, res) => {
			// Get the app id, api key and redirect url from the params
			var appId = +req.query.appId
			var apiKey = req.query.apiKey
			var redirectUrl = req.query.redirectUrl as string

			// Get the email and password from the body
			var email = req.body.email
			var password = req.body.password

			if (appId == 0 || apiKey == null || redirectUrl == null) {
				// Redirect to login page with error
				let errorMessage = "Required url param missing!"
				res.redirect(`/login?error=${errorMessage}`)
				return
			}

			// Do the api request
			let response = await SessionsController.CreateSession({
				auth: this.auth,
				email,
				password,
				appId,
				apiKey: process.env.DAV_API_KEY,
				deviceName: "Unknown",
				deviceType: "Unknown",
				deviceOs: "Windows 10"
			})

			if (response.status == 201) {
				// Redirect to the redirect url
				res.redirect(`${decodeURIComponent(redirectUrl).trim()}?accessToken=${response.data.accessToken}`)
			} else {
				// Redirect back to the login page with the appropriate error message
				let errors = response.errors
				let errorMessage = "An unexpected error occured. Please try it again."

				if (errors.length > 0) {
					let errorCode = errors[0].code

					switch (errorCode) {
						case ErrorCodes.IncorrectPassword:
							errorMessage = "Login failed"
							break
						case ErrorCodes.EmailMissing:
							errorMessage = "Please enter your email"
							break
						case ErrorCodes.PasswordMissing:
							errorMessage = "Please enter your password"
							break
						case ErrorCodes.UserDoesNotExist:
							errorMessage = "Login failed"
							break
						default:
							errorMessage = `Unexpected error (${errorCode})`
							break
					}
				}

				res.redirect(`/login?appId=${appId}&apiKey=${apiKey}&redirectUrl=${redirectUrl}&email=${email}&error=${errorMessage}`)
			}
		})

		router.post('/signup', async (req, res) => {
			// Get the app id, api key and redirect url from the params
			var appId = +req.query.appId
			var apiKey = req.query.apiKey
			var redirectUrl = req.query.redirectUrl as string

			// Get the firstName, email, password and passwordConfirmation from the body
			var firstName = req.body.firstName
			var email = req.body.email
			var password = req.body.password
			var passwordConfirmation = req.body.passwordConfirmation

			if (appId == 0 || apiKey == null || redirectUrl == null) {
				// Redirect to signup page with error
				let errorMessage = "Required url param missing!"
				res.redirect(`/signup?error=${errorMessage}`)
				return
			}

			// Check if the password matches the password confirmation
			if (password != passwordConfirmation) {
				// Redirect to signup page with error
				let errorMessage = "Your password doesn't match the password confirmation"
				res.redirect(`/signup?appId=${appId}&apiKey=${apiKey}&redirectUrl=${redirectUrl}&firstName=${firstName}&password=${password}&email=${email}&error=${errorMessage}`)
				return
			}

			// Do the api request
			let response = await UsersController.Signup({
				auth: this.auth,
				email,
				firstName,
				password,
				appId,
				apiKey,
				deviceName: "Unknown",
				deviceType: "Unknown",
				deviceOs: "Windows 10"
			})

			if (response.status == 201) {
				// Redirect to the redirect url
				res.redirect(`${decodeURIComponent(redirectUrl).trim()}?accessToken=${response.data.accessToken}`)
			} else {
				// Redirect back to the signup page with the appropriate error message
				let errors = response.errors
				let errorMessage = "An unexpected error occured. Please try it again."
				let removePassword = false

				if (errors.length > 0) {
					let errorCode = errors[0].code

					switch (errorCode) {
						case ErrorCodes.FirstNameMissing:
							errorMessage = "Please enter your name"
							break
						case ErrorCodes.EmailMissing:
							errorMessage = "Please enter your email"
							break
						case ErrorCodes.PasswordMissing:
							errorMessage = "Please enter a password"
							break
						case ErrorCodes.FirstNameTooShort:
							errorMessage = "The name is too short"
							break
						case ErrorCodes.PasswordTooShort:
							errorMessage = "Your password is too short"
							removePassword = true
							break
						case ErrorCodes.FirstNameTooLong:
							errorMessage = "The name is too long"
							break
						case ErrorCodes.PasswordTooLong:
							errorMessage = "Your password is too long"
							removePassword = true
							break
						case ErrorCodes.EmailInvalid:
							errorMessage = "Your email is invalid"
							break
						case ErrorCodes.EmailAlreadyInUse:
							errorMessage = "This email address is already in use"
							break
						default:
							errorMessage = `Unexpected error (${errorCode})`
							break
					}
				}

				let params = `appId=${appId}&apiKey=${apiKey}&redirectUrl=${redirectUrl}&firstName=${firstName}&email=${email}&error=${errorMessage}`

				if (!removePassword) {
					params += `&password=${password}`
				}

				res.redirect(`/signup?${params}`)
			}
		})

		router.get('/login', (req, res) => {
			res.sendFile(path.join(__dirname, '../public/login.html'))
		})

		router.get('/signup', (req, res) => {
			res.sendFile(path.join(__dirname, '../public/signup.html'))
		})

		router.get('/assets/dav-logo.png', (req, res) => {
			res.sendFile(path.join(__dirname, '../public/assets/dav-logo.png'))
		})

		router.get('/', (req, res) => {
			res.send("Nothing to see here")
		})
		this.express.use('/', router)
	}
}

export default new App().express
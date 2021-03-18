import * as express from 'express'
import { Dav, Auth, SessionsController, Environment, ErrorCodes } from 'dav-js'
require('dotenv').config()

class App {
	public express
	auth: Auth

	constructor() {
		this.express = express.default()

		this.express.use(express.static("public"))
		this.express.use(express.urlencoded())
		this.mountRoutes()

		// Generate the auth token
		this.auth = new Auth({
			apiKey: process.env.DAV_API_KEY,
			secretKey: process.env.DAV_SECRET_KEY,
			uuid: process.env.DAV_UUID
		})
	}

	private mountRoutes(): void {
		const router = express.Router()

		router.post('/login.html', async (req, res) => {
			// Get the app id, api key and redirect url from the params
			var appId = +req.query.appId
			var apiKey = req.query.apiKey
			var redirectUrl = req.query.redirectUrl as string

			// Get the email and password from the body
			var email = req.body.email
			var password = req.body.password

			if(appId == 0 || apiKey == null || redirectUrl == null){
				// Redirect to login page with error
				let errorMessage = "Required url param missing!"
				res.redirect(`/login.html?error=${errorMessage}`)
				return
			}

			// Check for the env vars
			if(process.env.API_BASE_URL == null){
				let errorMessage = "Environment variables missing!"
				res.redirect(`/login.html?error=${errorMessage}`)
				return
			}

			// Init dav-js
			new Dav({
				environment: process.env.ENV == "production" ? Environment.Production : Environment.Development,
				server: true
			})

			// Do the api request
			let response = await SessionsController.CreateSession({
				auth: this.auth,
				email,
				password,
				appId: +process.env.DAV_APPS_APP_ID,
				apiKey: process.env.DAV_API_KEY,
				deviceName: "Unknown",
				deviceType: "Unknown",
				deviceOs: "Windows 10"
			})
			
			if(response.status == 201){
				// Redirect to the redirect url
				res.redirect(`${decodeURIComponent(redirectUrl).trim()}?accessToken=${response.data.accessToken}`)
			}else{
				// Redirect back to the login page with the appropriate error message
				let errors = response.errors
				var errorMessage = "An unexpected error occured. Please try it again."

				if(errors.length > 0){
					let errorCode = errors[0].code

					switch(errorCode){
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

				res.redirect(`/login.html?appId=${appId}&apiKey=${apiKey}&redirectUrl=${redirectUrl}&email=${email}&error=${errorMessage}`)
			}
		})

		router.get('/', (req, res) => {
			res.send("Nothing to see here")
		})
		this.express.use('/', router)
	}
}

export default new App().express
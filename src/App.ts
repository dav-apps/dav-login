import * as express from 'express'
import path from 'path'

class App {
	public express

	constructor() {
		this.express = express.default()

		this.express.use(express.static("public"))
		this.mountRoutes()
	}

	private mountRoutes(): void {
		const router = express.Router()

		router.post('/login.html', (req, res) => {
			//res.send("Hello")
			let errorMessage = "There was an error"

			res.redirect(`/login.html?error=${errorMessage}`)
		})

		/*
		router.get('/login', (req, res) => {
			res.sendFile(path.join(__dirname, '../public/login.html'))
		})
		*/

		router.get('/', (req, res) => {
			res.end()
		})
		this.express.use('/', router)
	}
}

export default new App().express
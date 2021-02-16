// const http = require("http")
const https = require("https")
const express = require('express')
const app = express()
const fs = require("fs");
const port = 3000
// const ws = require('ws');
// let users = {}
let servers = {}

// app.use(express.static('www'))
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'pug')

// const server = http.createServer(app);
// const wss = new ws.Server({ server });

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));

// wss.on('connection', socket => {
//   socket.on('message', message => console.log(message));
//   sendUsers();
//   getServerInfo();
// });

function getServerInfo() {
	https.get("https://api.steampowered.com/IGameServersService/GetServerList/v1/?filter=\\gameaddr\\"+config.serverip+"&key="+config.steamkey, (res) =>{
		let body = "";

		res.on("data", (chunk) => {
			body += chunk;
		});

		res.on("end", () => {
			try{
				let json = JSON.parse(body);
				// console.log("JSON: " + json.response.servers)
				servers = json.response.servers
			} catch (error) {
				console.log(error.message)
			}
		});
	}).on("error", (error) => {
		console.error(error.message)
	});
}

function sendUsers() {
	fs.readFile(config.log, "utf8", (err, data) => {
		if (err) {
			console.log(err)
			process.exit(1)
		} else {
			let lines = data.split("\n");

			let lastUser;
			for (let line of lines) {
				let handshake = line.match(/(handshake from client )(\d+)/);
				let user = line.match(/(Got character ZDOID from )(\w+)/);
				let disconnected = line.match(/(Closing socket )(\d\d+)/)
				if (handshake) {
					let id = handshake[2];
					let time = new Date(line.match(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/));
					users[id] = {connected: time, disconnected: undefined, user: undefined};
					lastUser = id;
				}
				if (disconnected) {
					let id = disconnected[2];
					let user = users[id];
					let time = new Date(line.match(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/));
					user.disconnected = time;
				}
				if (user) {
					if (lastUser) {
						users[lastUser].user = user[2];
						lastUser = undefined;
					}
				}
			}
			wss.clients.forEach((client) => {
				let msg = {};
				msg.users = users;
				msg.serverName = config.serverName;
				client.send(JSON.stringify(msg));
			});
		}
	});
}

// setInterval(sendUsers, config.freq);

// server.listen(config.port, () => {
//   console.log(`Valheim status at http://localhost:${config.port}`)
// })

app.get('/', function(req, res) {
	getServerInfo()
	// res.json(servers);
	res.render('index', {
		title: 'Valheim Server Status',
		servers: servers
	})
});

app.listen(port, () => {
	console.log('Valheim Status at http://localhost:'+port)
})
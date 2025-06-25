const { Server } = require("socket.io");
const express = require('express')
const { createServer } = require('node:http');
const { execSync, spawn, exec } = require("child_process")
const app = express()
const server = createServer(app);
const io = new Server(server);
const port = 3010
const { registerWatchRoutes } = require("pixelroutemagic");
const { existsSync, fstat } = require("node:fs");
registerWatchRoutes("./routes", app)

/* let setCache = function (req, res, next) {
  // here you can define period in second, this one is 5 minutes
  const period = 60 * 60 * 24

  // you only want to cache for GET requests
  if (req.method == 'GET') {
    var contype = req.url
    console.log(contype)
    if (contype.endsWith(".css") || contype == "/themes.json") {
      res.set('Cache-control', `public, max-age=${period}`)
    }
    //res.set('Cache-control', `public, max-age=${period}`)
  } else {
    // for the other requests set strict no caching parameters
    //res.set('Cache-control', `no-store`)
  }

  // remember to call next() to pass on the request
  next()
} */

// now call the new middleware function in your app

/* app.use(setCache) */

app.use(express.static('public', {maxAge: "1d"}))

io.on('connection', async (socket) => {
  console.log('a user connected');
  var startTime = new Date().getTime()
  let services = await getServiceList()
  console.log((new Date().getTime() - startTime)/1000)
  socket.emit("services", services)
});

const journalctl = spawn(`journalctl`, [`-n`, `0`, `-f`, `-o`, `json`, `-all`]);

journalctl.on('error', (error) => {
  console.log(`error: ${error.message}`);
});

function acceptLine(json) {
  var { JOB_TYPE, MESSAGE, JOB_RESULT, _SYSTEMD_UNIT, UNIT, MESSAGE_ID } = json
  var unit = UNIT || _SYSTEMD_UNIT

  json.unit = unit

  if (unit == "nodejsProjects@systemdControl.service") return

  //console.log(json.MESSAGE)
  ///console.log(unit)

  if (!unit) return

  if (!unit.endsWith(".service")) return

  io.sockets.emit("journal", json)

  // console.log(json.MESSAGE)

  if (!JOB_TYPE) return
  //console.log(json)
  //console.log(MESSAGE)
  //console.log(JOB_RESULT)
  //console.log("EMIT!")
  io.sockets.emit("serviceUpdate", {
    service: unit,
    JOB_TYPE,
    JOB_RESULT,
    MESSAGE_ID
  })
}

var lineBuffer = "";
journalctl.stdout.on("data", data => {
  lineBuffer += data.toString();

  var lines = lineBuffer.split("\n");

  for (var i = 0; i < lines.length - 1; i++) {

    var line = lines[i];

    var json = JSON.parse(line)

    acceptLine(json)
  }

  lineBuffer = lines[lines.length - 1];

});

journalctl.on("close", code => {
  console.log(`child process exited with code ${code}`);
});


server.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

const servRegex = /(\S*)(?: *)(\S*)(?: *)(\S*)(?: *)(\S*)(?: *)(.*)/
const othRegex = /(\S*)(?: *)(\S*)(?: *)(\S*)/

async function getServiceList() {
  var services = []

  var raw = execSync(`systemctl list-unit-files --type service --full --all --plain --no-legend --no-pager`).toString().trim()
  raw.split("\n").forEach(e => {
    var [, unit, state, vendor] = e.match(othRegex)
    services.push({ unit, state })
  })

  var raw = execSync(`systemctl list-units -t service --full --all --plain --no-legend --no-pager`).toString().trim()
  raw.split("\n").forEach(e => {
    var [, unit, load, active, sub, description] = e.match(servRegex)
    //console.log(unit)
    var svice = services.find(s => s.unit == unit)
    if (svice) {
      svice.load = load
      svice.active = active
      svice.sub = sub
      svice.description = description
    } else {
      var state = "disabled"
      var guessState = existsSync(`/etc/systemd/system/multi-user.target.wants/${unit}`)
      if (guessState) state = "enabled"
      services.push({ unit, load, active, sub, description, state })
    }
  })

  units = services
  services = services.filter(e => !e.unit.endsWith("@.service"))

  /* for (const service of services) {
    console.log(service)
  } */

  return services
}

var chokidar = require('chokidar');

chokidar.watch('/etc/systemd/system/multi-user.target.wants/', { ignoreInitial: true }).on('all', (event, path) => {
  var service = path.split("/").at(-1)
  if (existsSync(path)) {
    console.log(service, "has been enabled")
    io.sockets.emit("serviceEnabledChanged", {
    service,
    enabled: true
  })
  } else {
    console.log(service, "has been disabled")
    io.sockets.emit("serviceEnabledChanged", {
    service,
    enabled: false
  })
  }
});

chokidar.watch('/etc/systemd/system/multi-user.target.wants/', { ignoreInitial: true }).on('all', (event, path) => {
  var service = path.split("/").at(-1)
  if (existsSync(path)) {
    console.log(service, "has been enabled")
    io.sockets.emit("serviceEnabledChanged", {
    service,
    enabled: true
  })
  } else {
    console.log(service, "has been disabled")
    io.sockets.emit("serviceEnabledChanged", {
    service,
    enabled: false
  })
  }
});

/* chokidar.watch('/etc/systemd/system/', { ignoreInitial: true }).on('all', async (event, path) => {
  if (path == "/etc/systemd/system/samba-ad-dc.service") return
  console.log(path, "WAS CHANGED")
  var startTime = new Date().getTime()
  let services = await getServiceList()
  console.log((new Date().getTime() - startTime)/1000)
  io.sockets.emit("services", services)
}); */

module.exports = {

}
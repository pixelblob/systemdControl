const { execSync, spawn, exec } = require("child_process")
const express = require("express");


var router = express.Router({ mergeParams: true });
module.exports = router;

router.get('/', async (req, res) => {
    var { service } = req.params
    console.log(service)
    exec(`journalctl -u ${service} -o json -n 300`, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }
        var lines = []
        stdout.split("\n").forEach(e => {
            var line = e

            if (line == "") return
            //console.log(JSON.parse(line).MESSAGE)
            var json = JSON.parse(line)
            if (typeof json.MESSAGE == "object") json.MESSAGE = String.fromCharCode.apply(null, json.MESSAGE)
            lines.push(json)
        })
        res.json(lines)
    });
})


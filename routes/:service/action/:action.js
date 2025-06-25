const { execSync, spawn, exec } = require("child_process")
const express = require("express");
const actions = ["start", "stop", "restart", "enable", "disable", "kill", "reset-failed"]

var router = express.Router({ mergeParams: true });
module.exports = router;

router.get('/', async (req, res) => {
    var { service, action } = req.params
    console.log(service, action)
    if (!actions.includes(action)) return res.status(400).end()
    exec(`systemctl ${action} ${service}`, (err, stdout, stderr) => {
        if (err) {
            return res.status(400).end(err.toString())
        }

        res.end(stdout)
    });
})


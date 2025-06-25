const { execSync, spawn, exec } = require("child_process")
const express = require("express");
const fs = require("fs")


var router = express.Router({ mergeParams: true });
module.exports = router;

router.get('/', async (req, res) => {
    var { service } = req.params
    console.log(service)
    exec(`systemctl show -p FragmentPath ${service}`, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return res.status(400).end();
        }
        var path = stdout.split("=")[1].trim()
        var text = fs.readFileSync(path)
        res.end(text)
    });
})


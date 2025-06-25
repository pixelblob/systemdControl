const socket = io({ transports: ["websocket"], path: "/control/socket.io" });
const consoleLineContainer = document.getElementById("consoleLineContainer")
const serviceDescriptionSpan = document.getElementById("serviceDescription")
const consoleContainer = document.getElementById("consoleContainer")
const serviceContainer = document.getElementById("serviceContainer");
const noresultssearch = document.getElementById("noresultssearch")
const serviceSearch = document.getElementById("serviceSearch")
const serviceName = document.getElementById("serviceName")

const ansi_up = new AnsiUp;

var last_SYSTEMD_INVOCATION_ID
var triggered = false


var pagingCursor = null


var timeSinceLastLine
var currentFragment
var lastLineTimeout
var bufferCount = 0
const consoleLineBufferTime = 100
function addConsoleLine(json, bottom = true) {
    var { _SYSTEMD_INVOCATION_ID, JOB_TYPE, SYSLOG_IDENTIFIER, JOB_RESULT, __CURSOR } = json
    var message = json.MESSAGE
    var currentEpoch = new Date().getTime()

    if (!pagingCursor) pagingCursor = json["__CURSOR"]

    message = ansi_up.ansi_to_html(message)
    //consoleLineContainer.insertAdjacentHTML(bottom ? `beforeend` : `afterbegin`, `<span id="consoleLine" class="consoleLine">${message}</span`)

    var consoleLine = document.createElement("span");
    consoleLine.id = "consoleLine"
    consoleLine.classList.add("consoleLine")
    consoleLine.innerHTML = message

    if (SYSLOG_IDENTIFIER == "systemd") consoleLine.dataset.type = "systemd"
    if (JOB_TYPE) consoleLine.dataset.jobtype = JOB_TYPE
    if (JOB_RESULT) consoleLine.dataset.jobresult = JOB_RESULT

    //console.log(currentEpoch - timeSinceLastLine)
    if (timeSinceLastLine && (currentEpoch - timeSinceLastLine) < consoleLineBufferTime) {
        if (!currentFragment) currentFragment = new DocumentFragment();

        if (bottom) currentFragment.append(consoleLine)
        else currentFragment.prepend(consoleLine)
        bufferCount++

        clearTimeout(lastLineTimeout)
        lastLineTimeout = setTimeout(() => {
            flushConsoleLineBuffer()
        }, consoleLineBufferTime);

    } else {
        if (bottom) consoleLineContainer.append(consoleLine)
        else consoleLineContainer.prepend(consoleLine)

        timeSinceLastLine = currentEpoch
        flushConsoleLineBuffer()
    }


    //var linesCount = Array.from(consoleLineContainer.querySelectorAll("#consoleLine")).length
    //if (linesCount > ) consoleLineContainer.querySelector("#consoleLine").remove()
}

function flushConsoleLineBuffer() {
    var shouldScrollDown = scrollHeightCheck()
    if (currentFragment) consoleLineContainer.append(currentFragment)
    currentFragment = null
    console.log("Buffered: ", bufferCount)
    bufferCount = 0
    if (shouldScrollDown) consoleLineContainer.scrollTop = consoleLineContainer.scrollHeight;
}

function resetSearch() {
    serviceSearch.value = ""
    serviceSearch.oninput()
}

serviceSearch.oninput = function () {
    var text = serviceSearch.value
    console.log(text)
    const MIN_DISTANCE = 3;

    var searchTerm = text.toLowerCase().trim()

    if (!searchTerm || searchTerm == "") {
        return serviceContainer.classList.remove("filtering")
    }

    serviceContainer.classList.add("filtering")

    for (const service of Array.from(document.querySelectorAll('#serviceContainer > #service.filtered'))) {
        service.classList.remove("filtered")
    }

    var servicesFiltered = Array.from(document.querySelectorAll("#serviceContainer > #service")).filter((d) => {
        const distance = levenshtein(d.dataset.name.toLowerCase().replace(".service", ""), searchTerm);
        console.log(distance)
        return d.dataset.name.toLowerCase().includes(searchTerm) || distance <= MIN_DISTANCE;
    })


    servicesFiltered.forEach(service => {
        service.classList.add("filtered")
    })

    if (servicesFiltered.length == 0) {
        noresultssearch.style.display = "block"
    } else {
        noresultssearch.style.display = "none"
    }
}

//var journals = {}

socket.on("journal", json => {
    let { unit } = json
    if (typeof json.MESSAGE == "object") json.MESSAGE = String.fromCharCode.apply(null, json.MESSAGE)
    //console.log(json.MESSAGE)
    console.log(json)
    if (unit == document.body.dataset.service) {

    } else {

    }

    /* if (!journals[unit]) {
        console.log(unit)

        return console.log("NOTHING!")
    } */

    var serviceElm = document.querySelector(`[data-name="${unit}"]`)
    serviceElm.dataset.lastactivity = new Date().getTime()

    //journals[unit].rows.push(json)
    if (unit == document.body.dataset.service) {

        //console.log(json)
        addConsoleLine(json)
        tryAutoScroll()


    } else {
        //console.log(unit)
        //console.log(json.MESSAGE)


        const newactivity = serviceElm.querySelector("#newactivity")
        newactivity.style.display = "inline-block"
    }

    sortServiceList()

})
function scrollHeightCheck() {
    return consoleLineContainer.scrollTop + consoleLineContainer.offsetHeight >= consoleLineContainer.scrollHeight - 300;
}

function scrollDown() {
    consoleLineContainer.scrollTop = consoleLineContainer.scrollHeight;
}


function sortServiceList() {
    switch (document.body.dataset.sorttype) {
        case "abc":

            break;
        case "activity":
            var serviceElm = document.querySelector(`[data-name="${currentService}"]`)
            Array.from(document.querySelectorAll("#service[data-lastactivity]")).sort((a, b) => b.dataset.lastactivity - a.dataset.lastactivity).reverse().forEach(e => {
                //console.log(e)
                e.parentElement.prepend(e)
                if (e == serviceElm) {
                    console.log("Focused Elm Moved!")
                    serviceElm.scrollIntoView({ block: "center" });
                }
            })
            break;
        default:
            break;
    }



}

function tryAutoScroll() {
    var shouldScrollDown = scrollHeightCheck()
    if (shouldScrollDown) {
        consoleLineContainer.scrollTop = consoleLineContainer.scrollHeight;
    }
}

var loadingLines = false
consoleLineContainer.onscroll = async function () {
    var shouldScrollDown = scrollHeightCheck()
    //console.log(shouldScrollDown)
    document.body.dataset.scrolledDown = shouldScrollDown

    if (shouldScrollDown) {
        //console.log("REMOVE STAR")
        var serviceElm = document.querySelector(`[data-name="${currentService}"]`)
        const newactivity = serviceElm.querySelector("#newactivity")
        //console.log(serviceElm)
        //console.log(newactivity)
        newactivity.style.display = "none"
    }

    if (consoleLineContainer.scrollTop - consoleLineContainer.offsetHeight <= 300 && loadingLines === false) {
        console.log("Load More Lines")
        loadingLines = true

        /* let oldLines = await getLinesBeforeCursor(currentService, pagingCursor)
        pagingCursor = oldLines.at(-1)["__CURSOR"]
        console.log(pagingCursor)
        oldLines.forEach(oldLine=>{
            addConsoleLine(oldLine, false)
        }) */
        //loadingLines=false
    }
}

socket.on("serviceEnabledChanged", update => {
    var { service, enabled } = update
    console.log(service, enabled)
    var serviceElm = document.querySelector(`[data-name="${service}"]`)
    serviceElm.dataset.state = enabled ? "enabled" : "disabled"
})

socket.on("serviceUpdate", update => {
    console.log("SERVICE UDPATE!")
    var { service, JOB_TYPE, JOB_RESULT, MESSAGE_ID } = update

    console.log(service)

    if (!service) return

    console.log(update)
    var serviceElm = document.querySelector(`[data-name="${service}"]`)

    if (!serviceElm) {
        return console.log("Missing:", service)
    }

    function setServiceState(state) {
        serviceElm.dataset.active = state
        if (service == currentService) document.body.dataset.active = state
    }

    if (JOB_TYPE == "start") {
        if (JOB_RESULT == "failed") {
            setServiceState("failed")
        } /* else if (JOB_RESULT == "done" && MESSAGE_ID == "39f53479d3a045ac8e11786248231fbf") {
            setServiceState("inactive")
        } */ else if (JOB_RESULT == "done") {
            setServiceState("active")
        }
    } else if (JOB_TYPE == "stop") {
        if (JOB_RESULT == "done") {
            setServiceState("inactive")
        } else if (!JOB_RESULT) {
            setServiceState("deactivating")
        }
    }
})

async function getOldLines(service) {
    let json = await (await fetch(`${service}/lines`)).json()
    return json
}

async function getLinesBeforeCursor(service, cursor) {
    let json = await (await fetch(`${service}/linesHistory?cursor=${cursor}`)).json()
    return json
}

var currentService

async function setService(service) {

    console.log("Setting Service To:", service)

    var oldServiceElm = document.querySelector(`#service.active`)
    if (oldServiceElm) oldServiceElm.classList.remove("active")

    if (!service) {
        document.body.dataset.extended = false

        const url = new URL(location);
        url.searchParams.delete("service");
        history.pushState({}, "", url);

        return
    }

    var serviceElm = document.querySelector(`[data-name="${service}"]`)

    if (!serviceElm) {
        document.body.dataset.extended = false

        const url = new URL(location);
        url.searchParams.delete("service");
        history.pushState({}, "", url);

        return
    }

    console.log("e")

    document.body.dataset.service = service
    document.body.dataset.extended = true



    serviceDescriptionSpan.textContent = serviceElm.dataset.description || ""
    serviceName.textContent = service.replace(".service", "")

    console.log("ELM", serviceElm)

    serviceElm.classList.add("active")

    if (currentService != service) {
        currentService = service


        var oldLines = await getOldLines(service)
        pagingCursor = null

        while (consoleLineContainer.lastElementChild && consoleLineContainer.lastElementChild.classList.contains("consoleLine")) {
            consoleLineContainer.lastElementChild.remove()
        }

        for (const row of oldLines) {
            addConsoleLine(row)
        }

        /* var rows = journals[service].rows
        for (const row of rows) {
            addConsoleLine(row)
        } */

        consoleLineContainer.scrollTop = consoleLineContainer.scrollHeight;

    }


}

let params = (new URL(document.location)).searchParams;
var service = params.get("service")



window.addEventListener("popstate", (event) => {
    console.log(event)
    let params = (new URL(document.location)).searchParams;
    var service = params.get("service")
    if (service) {
        setService(service)
        var serviceElm = document.querySelector(`[data-name="${service}"]`)
        console.log(serviceElm)
        serviceElm.scrollIntoView({ block: "center" });
    }
})

var cachedServices = localStorage.getItem("services")

/* if (cachedServices) {
    try {
        var json = JSON.parse(cachedServices)
        loadServices(json)
    } catch (error) {
        console.log("FAILED TO LOAD CACHED SERVICES")
        console.log(error)
    }
} */

function loadServices(services) {
    console.log(services)
    localStorage.setItem("services", JSON.stringify(services))
    /* while (serviceContainer.firstElementChild) {
        serviceContainer.firstElementChild.remove()
    } */
    //document.body.dataset.service = services[0].unit

    for (const service of services) {
        //if (!journals[service.unit]) journals[service.unit] = { rows: [] }

        let name = service.unit.split(".service")[0]
        var serviceElm = document.querySelector(`[data-name="${service.unit}"]`)

        if (!serviceElm) {
            serviceContainer.insertAdjacentHTML("beforeend", `
            <div id="service" data-name="${service.unit}" data-description="${service.description}">

                <div id="newactivity"><i class="fa-solid fa-star"></i></div>

                <span class="dot"></span>
                <div id="nameWrap">
                    ${name.split("@")[1] ? `<span id="serviceNameParent">${name.split("@")[0]}</span>` : ``}
                    <span id="serviceName">${name.split("@")[1] || name}</span>
                </div>

                <div id="extra">
                    <div id="actionButtons">
                        <div class="button" title="Reset Failed" id="reset" onclick="resetFailedService('${name}')"><i class="fas fa-undo"></i></div>
                        <div class="button" title="Kill" id="kill"><i class="fa-solid fa-skull"></i></div>
                        <div class="button" title="Start" id="start"><i class="fas fa-power-off"></i></div>
                        <div class="button" title="Stop" id="stop"><i class="fas fa-power-off"></i></div>
                        <div class="button" title="Restart" id="restart"><i class="fas fa-refresh"></i></div>
                        <div class="button" title="Enable" id="enable"><i class="fas fa-toggle-off"></i></div>
                        <div class="button" title="Disable" id="disable"><i class="fas fa-toggle-on"></i></div>
                    <div>
                </div>
                
            </div>
            `)
            serviceElm = serviceContainer.lastElementChild
        }

        serviceElm.onclick = function (e) {
            /* if (e.target !== this && e.target.id != "serviceName") return */
            document.body.dataset.extended = true
            setService(service.unit)
            const url = new URL(location);
            url.searchParams.set("service", service.unit);
            history.pushState({}, "", url);
            if (serviceSearch.value) {
                resetSearch()
                var serviceElm = document.querySelector(`[data-name="${service.unit}"]`)
                serviceElm.scrollIntoView({ block: "center" });
            }

        }

        if (service.active) serviceElm.dataset.active = service.active
        if (service.state) serviceElm.dataset.state = service.state

        if (service.unit == currentService) {
            document.body.dataset.active = service.active
            document.body.dataset.state = service.state
        }

        serviceElm.querySelector("#actionButtons").onclick = async function (e) {
            e.stopPropagation();
            var target = e.target
            while (!target?.classList?.contains?.("button")) {
                target = target.parentNode
                if (target.id == "extra") {
                    target = null
                    break
                }
            }
            if (!target) return
            fetch(`${service.unit}/action/${target.id}`)
        }
    }


    if (service && document.querySelector(`[data-name="${service}"]`)) {
        setService(service)
        var serviceElm = document.querySelector(`[data-name="${service}"]`)
        console.log(serviceElm)
        serviceElm.scrollIntoView({ block: "center" });
    } else if (!navigator.userAgentData.mobile) {
        setService(services[0].unit)

    }
}

async function runServiceAction(service, action) {
    await fetch(`${service}/action/${action}`)
}

async function resetFailedService(service) {
    runServiceAction(service, "reset-failed")
}
async function killService(service) {
    runServiceAction(service, "kill")
}
async function startService(service) {
    runServiceAction(service, "start")
}
async function stopService(service) {
    runServiceAction(service, "stop")
}
async function restartService(service) {
    runServiceAction(service, "restart")
}
async function enableService(service) {
    runServiceAction(service, "enable")
}
async function disableService(service) {
    runServiceAction(service, "disable")
}

var clickTimeout
document.getElementById("consoleContainer").onclick = function (e) {
    if (!navigator.userAgentData.mobile) return
    var time = new Date().getTime()

    if (clickTimeout) {
        if (time - clickTimeout < 200) {
            console.log(time - clickTimeout)
            setService(null)
        }
    }


    clickTimeout = time
}

socket.on("services", async services => {
    loadServices(services)
})

function toggleWordWrap() {
    document.body.dataset.textwrap = document.body.dataset.textwrap == "true" ? false : true
}


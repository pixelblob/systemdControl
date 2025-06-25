var themes = []
var currentTheme = 0
function cycleTheme() {
    currentTheme = (currentTheme +1) % themes.length
    var theme = themes[currentTheme]
    localStorage.setItem("theme", theme.name)
    document.getElementById("themestylesheet").href = `styles/themes/${theme.name}.css`
}

function setTheme(theme) {
    var themeIdx = themes.map(t=>t.name).indexOf(theme)
    console.log("THEME INDEX", themeIdx)
    if (themeIdx < 0) return
    currentTheme = themeIdx

    var theme = themes[themeIdx]

    document.getElementById("themestylesheet").href = `styles/themes/${theme.name}.css`
}



(async ()=>{
    themes = await (await fetch("./themes.json")).json()
    console.log(themes)

    if (localStorage.getItem("theme")) {
        setTheme(localStorage.getItem("theme"))
    };
})()
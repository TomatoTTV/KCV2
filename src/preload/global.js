const { ipcRenderer, remote } = require('electron');
const { badge_checker } = require('../features/badges')
const Store = require("electron-store");
const events = require('events');
const { gameLoaded } = require('../features/const')
const config = new Store();
const fixwebm  = require('../recorder/fix')
const os = require('os');
const path = require('path');
const fs = require('fs');
const getBlobDuration = require('get-blob-duration')

let badges;
let leftIcons;
let framesPerSeconddiv = null;
let pingdiv = null;
let mediaRecorder = null;
let filepath = '';	
let starttime;
let pausetime;
let pause;
let totalPause = 0;
let recordedChunks = [];
let recording = false;
let paused = false;
let chatFocus = false;
let chatState = true;
let chatForce = true;
let logDir = path.join(os.homedir(), '/Documents/KClient2.0')

if (!fs.existsSync(logDir)) fs.promises.mkdir(logDir, { recursive: true })

let oldState;
window.addEventListener('DOMContentLoaded', (event) => {
    setInterval(() => {
        let newState = currentState();
        if (oldState != newState) {
            oldState = newState;
            doOnLoad();
        }
    }, 1000)
})

function doOnLoad() {
    resetVars();
    let html = `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css">
    <style>

    #show-clientNotif{
        position: absolute;
        transform: translate(-50%,-50%);
        top: 50%;
        left: 50%;
        background-color: #101020;
        color: #ffffff;
        padding: 20px;
        border-radius: 5px;
        cursor: pointer;
    }
    #clientNotif{
        width: 380px;
        height: 80px;
        padding-left: 20px;
        background-color: #ffffff;
        box-shadow: 0 10px 20px rgba(75, 50, 50, 0.05);
        border-left: 8px solid #47d764;
        border-radius: 7px;
        display: grid;
        grid-template-columns: 1.2fr 6fr 0.5fr;
        transform: translate(-400px);
        transition: 1s;
    }
    .container-1,.container-2{
        align-self: center;
    }
    .container-1 i{
        font-size: 40px;
        color: #47d764;
    }
    .container-2 {
        text-shadow: 0px 0px #000000;
        font-size: 18px;
        border: none;
        text-align: left;
        padding: 0;
        margin: 0;
        box-sizing: border-box;
    }
    .container-2 p:first-child{
        color: #101020;
    }
    .container-2 p:last-child{
        color: #656565;
    }
    #clientNotif button{
        align-self: flex-start;
        background-color: transparent;
        font-size: 25px;
        line-height: 0;
        color: #656565;
        cursor: pointer;
    }
    </style>
    <div class="wrapper" style="width: 420px;
    padding: 30px 20px;
    position: absolute;
    bottom: 50px;
    left: 0;
    overflow: hidden;">
    <div id="clientNotif">
        <div class="container-1">
        </div>
        <div class="container-2">
        </div>
    </div>
    </div>`
    let state = currentState()
    console.log('DOM Content loaded for:', state)
    let promo;
    let div = document.createElement('div')
    div.className = 'clientNotifDIV'
    div.innerHTML = html;

    function setPromo() {
        promo = document.getElementsByClassName("info")[0];
        if (promo === undefined) {
            setTimeout(setPromo, 1000)
            return;
        }
        promo.appendChild(div);

        let kirkaChat = document.getElementById("WMNn")
        kirkaChat.addEventListener('focusout', (event) => {
            chatFocus = false;
            //setChatState(chatState, chatForce);
        });

        kirkaChat.addEventListener('focusin', (event) => {
            chatFocus = true;
            //setChatState(chatState, chatForce);
        });
    }

    switch (state) {
        case 'home':
            promo = document.getElementsByClassName("left-interface")[0];
            promo.appendChild(div);

            let settings = document.getElementById("clientSettings")
            if (settings === null || settings === undefined) {
                let canvas = document.getElementsByClassName("left-icons")[0]
                canvas = canvas.children[0];
                if (canvas === undefined) return;
                canvas.insertAdjacentHTML('beforeend',`<div data-v-4f66c13e="" data-v-6be9607e="" id="clientSettings" class="icon-btn text-1" style="--i:3;"><div data-v-4f66c13e="" class="wrapper"><img data-v-b8de1e14="" data-v-4f66c13e="" src="https://media.discordapp.net/attachments/868890525871247450/875360498701447248/Pngtreelaptop_setting_gear_icon_vector_3664021.png" width="100%" height="auto"><div data-v-4f66c13e="" class="text-icon">CLIENT</div></div></div>`)
                settings = document.getElementById("clientSettings")
                settings.onclick = () => {
                    ipcRenderer.send('show-settings')
                }
            }

            break;
        case 'game':
            setPromo();
            break;
    }
    
    

    if (state != "game") return;
    if (config.get("showPing", true)) pingDisplay();
    
    setInterval(() => {
        let ele = document.querySelector("#app > div.interface.text-2 > div.team-section > div.player > div > div.head-right > div.nickname");
        if (ele === null) return;
        config.set("user", ele.innerText);
    }, 3500);  
    
    const url = config.get("customScope", "");
    if (url != "") {
        setInterval(function () {
            let x = document.getElementsByClassName("sniper-mwNMW")[0];
            if (x) {
                if (x.src != url) {
                    x.src = url;
                    x.width = config.get("scopeSize", 200)
                    x.height = config.get("scopeSize", 200)
                    x.removeAttribute("class");
                }
            }
        }, 1000);
    }
}

function resetVars() {
    pingdiv = null;
    framesPerSeconddiv = null;
}

ipcRenderer.on('chat', (event, state, force) => {
    setChatState(state, force);
})

function setChatState(state, force) {
    let chat = document.getElementsByClassName("chat chat-position")[0];
    if (chat === undefined) {
        if (force) setTimeout(() => {setChatState(state, force)}, 1000);
        return;
    };
    if (state) {
        chat.style = "display: flex;";
    } else {
        chat.style = "display: none;";
    }
}

function showNotification(){
    let x = document.getElementById("clientNotif")
    clearTimeout(x);
    let toast = document.getElementById("clientNotif");
    toast.style.transform = "translateX(0)";
    x = setTimeout(()=>{
        toast.style.transform = "translateX(-400px)"
    }, 3000);
}

function createBalloon(text, error=false) {
    let border = '';
    let style = '';
    if (error) {
        border = '<i class="fas fa-times-circle" style="color: #ff355b;"></i>'
        style = 'border-left: 8px solid #ff355b;';
    }
    else {
        border = '<i class="fas fa-check-square"></i>'
        style = 'border-left: 8px solid #47D764;';
    }
    
    let d1 = document.getElementsByClassName("container-1")[0];
    d1.innerHTML = border;
    let toast = document.getElementById("clientNotif");
    toast.style = style;
    let d2 = document.getElementsByClassName("container-2")[0];
    d2.innerHTML = `<p>${text}</p>`;
    showNotification();
}

window.addEventListener('keydown', function(event) {
    switch(event.key) {
        case 'F1':
            startRecording();
            break;
        case 'F2':
            stopRecording(true);
            break;
        case 'F3':
            stopRecording(false);
            break;
    }
});

let ping;
const times = [];
let fps = 0;

function pingDisplay() {
    console.log("Starting Ping")
    setInterval(() => {
        let t1= Date.now()
        fetch('https://www.kirka.io/')
        .then((res) => {
            ping = Date.now() - t1
        })
    }, 2500)

    refreshLoop()
}

function refreshLoop() {
    updateFPS(fps);

    window.requestAnimationFrame(() => {
        const now = performance.now();
        while (times.length > 0 && times[0] <= now - 1000) {
            times.shift();
        }
        times.push(now);
        fps = times.length;

        refreshLoop();
    });
}
function refreshLoop() {
    updatePing(ping);

    window.requestAnimationFrame(() => {
        const now = performance.now();
        while (times.length > 0 && times[0] <= now - 1000) {
            times.shift();
        }
        times.push(now);
        fps = times.length;

        refreshLoop();
    });
}

function updateFPS(fps) {
    leftIcons = document.querySelector('.state-cont');
    if (leftIcons === null) return;
    if (framesPerSeconddiv === null) {
        framesPerSeconddiv = document.createElement('div');
        leftIcons.appendChild(framesPerSeconddiv);
    }
    if (!config.get("showFPS", true)) {
        framesPerSeconddiv.innerText = ``
    } else {
        pingdiv.innerText = `FPS: ${fps}`
    }
}
function updatePing(ping) {
    leftIcons = document.querySelector('.state-cont');
    if (leftIcons === null) return;
    if (pingdiv === null) {
        pingdiv = document.createElement('div');
        leftIcons.appendChild(pingdiv);
    }
    if (!config.get("showPing", true)) {
        pingdiv.innerText = ``
    } else {
        pingdiv.innerText = `Ping: ${ping}`
    }
}

window.addEventListener("mouseup", (e) => {
   if (e.button === 3 || e.button === 4)
      e.preventDefault();
});

window.addEventListener('load', () => {
    setInterval(() => {
        let allpossible = [];
        let all_nickname = document.getElementsByClassName('nickname');
        allpossible.push(...all_nickname);

        for (let key in allpossible) {
            let nickname = allpossible[key];
            if (nickname.innerText === undefined) continue;
            let user = nickname.innerText.toString();
            if (user.slice(-1) === " ") {
                user = user.slice(0, -1)
            }
            badges = badge_checker(user);
            if (badges[0].start) {
                nickname.innerText = user + " ";
            }
            
            for (let badge_ in badges) {
                let badge =  badges[badge_];
                if (badge == undefined) {return}
                if (badge.start) {
                    nickname.insertAdjacentHTML('beforeend', `<img src="${badge.url}" class="KirkaHomeBadge" width="25px" height=auto title=${badge.role}>`);
                }
            }
        }
    }, 750)
});

async function configMR() {
    let clientWindow = remote.getCurrentWindow().getMediaSourceId();
    const constraints = {
        audio:{
                mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: clientWindow,
                }
            },
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: clientWindow,
                minWidth: 1280,
                maxWidth: 1920,
                minHeight: 720,
                maxHeight: 1080,
                minFrameRate: 60
            }
        }
    };
    const options = {
        videoBitsPerSecond: 3000000,
        mimeType: 'video/webm; codecs=vp9'
    };
    let mediaRecorder;
    return new Promise((resolve, reject) => {
        navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream, options);
            console.log("mR", mediaRecorder);
            mediaRecorder.ondataavailable = handleDataAvailable;
            mediaRecorder.onstop = handleStop;
            mediaRecorder.onstart = () => { console.log("started recording"); recording=true };
            mediaRecorder.onpause = () => { paused=true };
            mediaRecorder.onresume = () => { paused=false };
            resolve(mediaRecorder);
        })
        .catch(err => {
            console.error("getUserMedia failed with error: ", err);
            reject(err);
        });
    })
}

function handleDataAvailable(e) {
    recordedChunks.push(e.data);
}

async function handleStop(e) {
    recording = false;
    if(starttime === undefined) return;
    const blob = new Blob(recordedChunks, {
        type: 'video/mp4;'
    });
    console.log("handeling stop. starttime:", starttime, "Date.now():", Date.now(), "pause:", totalPause, "duration", Date.now() - starttime - totalPause)
    fixwebm(blob, Date.now() - starttime - totalPause, saveRecording)
}

function startRecording() {
    if (mediaRecorder === null) {
        console.log('First Time: Configuring mR');
        configMR()
        .then((rs) => {
            console.log('Configurated!', rs);
            mediaRecorder = rs;
            startrec();
        })
        .catch((err) => {
            console.error(err);
        })
    } else {
        if (recording) {
            if (paused) {
                resumeRecording()
            } else {
                pauseRecording()
            }
        } else {
            startrec()
        }
    }
}

function pauseRecording() {
    console.log("mR is paused!")
    pausetime = Date.now() - starttime - totalPause
    try {
        mediaRecorder.pause();
        createBalloon("Recording Paused!")
    }catch(e) {
        console.error(e)
    }
    pause = Date.now();
}

function resumeRecording() {
    console.log("mR is resumed!")
    try {
        mediaRecorder.resume();
        createBalloon("Recording Resumed!")
    }catch(e) {
        console.error(e)
    }
    totalPause += Date.now() - pause;
}
let shouldSave = false;
function stopRecording(save) {
    if (!recording) {
        createBalloon('No recording in progress!', true)
        return;
    }
    if(mediaRecorder === undefined || mediaRecorder === null) return;
    if (save) {
        let folderPath = path.join(logDir, 'videos');
        console.log(folderPath);
        if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath);
        filepath = path.join(folderPath, `kirka-${Date.now()}.mp4`);
    }
    shouldSave = save;
    try {
        if(paused) {
            mediaRecorder.resume();
        }
        mediaRecorder.stop();
    }catch(e) {
        console.error(e)
    }
}

async function startrec() {
    console.log("mR state:", mediaRecorder.state);
    recordedChunks = [];
    try {
        mediaRecorder.start(500);
    }catch(e) {
        console.error(e)
    }
    createBalloon("Recording started!")
    starttime = Date.now();
    pause = 0;
    totalPause = 0;
    console.log("New mR state:", mediaRecorder.state);
}

function saveRecording (blob) {
    console.log("In saveRecording")
    getBlobDuration.default(blob).then(function(duration) {
        console.log(duration + ' seconds');
        if (isNaN(parseFloat(duration))) {
            console.error("Broken duration detected, attempting fix...")
            fixwebm(blob, 300000, saveRecording);
            return;
        } else {
            blob.arrayBuffer().then(buf => {
                const buffer = Buffer.from(buf)
                console.log("Filepath:", filepath)
                if (filepath !== '') fs.writeFileSync(filepath, buffer);
                if (shouldSave) createBalloon("Recording Saved!");
                else createBalloon('Recording Cancelled', true);
                console.log('Saved!');
            })
        }
    })
}

function genChatMsg(text) {
    console.log(text);
    let chatHolder = document.getElementsByClassName('messages messages-cont')[0]
    if (chatHolder === undefined) return;

    let chatItem = document.createElement('div');
    let chatUser = document.createElement('span');
    let chatMsg = document.createElement('span');

    chatItem.className = 'message';
    chatMsg.className = 'chatMsg_client';
    chatMsg.innerText = text;
    chatUser.className = 'name';
    chatUser.innerText = "[KClient2.0]";

    chatItem.appendChild(chatUser);
    chatItem.appendChild(chatMsg);
    chatHolder.appendChild(chatItem);

    console.log('generated message');
    return chatMsg;
}

function currentState() {
    let gameUrl = window.location.href;
    if (gameUrl.includes('games')) {
        return 'game'
    } else {
        return 'home'
    }
};

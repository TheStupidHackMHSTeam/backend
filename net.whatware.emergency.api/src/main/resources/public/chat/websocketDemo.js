// small helper function for selecting element by id
let id = id => document.getElementById(id);

function error(text) {
	id("error").innerHTML = text;
	id("error").style.display = 'block';
}

const urlParams = new URLSearchParams(window.location.search);
const user = urlParams.get('user');
if (!user) {
	alert("Missing username in URL!");
	throw new Error("Missing username in URL!");
}

//Establish the WebSocket connection and set up event handlers
let ws = new WebSocket("ws://" + location.hostname + ":" + location.port + "/chat/" + user);
ws.onmessage = msg => updateChat(msg);
ws.onclose = function () {
	error("WebSocket connection closed");
	id("message").disabled = true;
	alert("WebSocket connection closed");
}

// Add event listeners to button and input field
id("send").addEventListener("click", () => sendAndClear(id("message").value));
id("message").addEventListener("keypress", function (e) {
    if (e.keyCode === 13) { // Send message if enter is pressed in input field
        sendAndClear(e.target.value);
    }
});

function sendAndClear(message) {
    if (message !== "") {
        ws.send(message);
        id("message").value = "";
    }
}

function updateChat(msg) { // Update chat-panel and list of connected users
	if (msg.data == "^^^^^^^PONG^^^") {
		console.log("rx pong");
		return;
	}
    let data = JSON.parse(msg.data);
    id("anchor").insertAdjacentHTML("beforebegin", data.userMessage);
    document.getElementById("anchor").scrollIntoView();

}

setInterval(() => {
	ws.send("^^^^^^^PING^^^");
}, 5000);
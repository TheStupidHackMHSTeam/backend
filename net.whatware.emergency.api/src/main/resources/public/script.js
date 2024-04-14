const disconnectedModal = new bootstrap.Modal('#disconnectedModal');
const disconnectedBanner = document.getElementById('disconnectedBanner');
const eventModal = new bootstrap.Modal('#eventModal');
const mapsEmbed = document.getElementById('mapsEmbed');
const chatModal = new bootstrap.Modal('#chatModal');
const chatbox = document.getElementById('chatbox');
const emergenciesTable = document.getElementById('emergenciesTable');
const registeredDevicesTable = document.getElementById('registeredDevicesTable');

let users = new Set();
let eventModalUser;

function connect() {
  let pingInterval;

  let ws = new WebSocket("ws://" + location.hostname + ":" + location.port + "/dashsocket");
  ws.onmessage = msg => handlePacket(msg);
  ws.onopen = () => {
    document.getElementById('loader').style.display = 'none';
    disconnectedModal.hide();
    disconnectedBanner.style.display = 'none';
    pingInterval = setInterval(() => {
      ws.send('ping');
    }, 5000);
  };
  ws.onclose = () => {
    setTimeout(() => {
      document.getElementById('loader').style.display = 'none';
      disconnectedModal.show();
      disconnectedBanner.style.display = 'flex';
      clearInterval(pingInterval);
    }, 200);
  };
  return ws;
}
let ws = connect();

function attemptReconnect() {
  disconnectedModal.hide();
  disconnectedBanner.style.display = 'none';
  document.getElementById('loader').style.display = 'flex';
  ws = connect();
  chatWS = connectChat();
}

function connectChat() {
  let pingInterval;

  let ws = new WebSocket("ws://" + location.hostname + ":" + location.port + "/chat/Staff");
  ws.onmessage = msg => updateChat(msg);
  ws.onopen = function() {
    document.getElementById('chatInput').disabled = false;
    pingInterval = setInterval(() => {
      ws.send('^^^^^^^PING^^^');
    }, 5000);
  };
  ws.onclose = function() {
    document.getElementById('chatInput').disabled = true;
    setTimeout(() => {
      document.getElementById('loader').style.display = 'none';
      disconnectedModal.show();
      disconnectedBanner.style.display = 'flex';
      clearInterval(pingInterval);
    }, 200);
  };
  return ws;
}
let chatWS = connectChat();

document.getElementById("sendMessage").addEventListener("click", () => sendChatMessage(document.getElementById("chatInput").value));
document.getElementById("chatInput").addEventListener("keypress", function(e) {
  if (e.keyCode === 13) { // Send message if enter is pressed in input field
    sendChatMessage(e.target.value);
  }
});

function updateChat(msg) { // Update chat-panel and list of connected users
  if (msg.data == "^^^^^^^PONG^^^") {
    console.log("rx pong");
    return;
  }
  // if (msg.data == "connected") {
  // return;
  // }
  let data = JSON.parse(msg.data);
  document.getElementById("anchor").insertAdjacentHTML("beforebegin", data.userMessage);
  document.getElementById("anchor").scrollIntoView();
}

function sendChatMessage(message) {
  if (message !== "") {
    chatWS.send(message);
    document.getElementById("chatInput").value = "";
  }
}


const testData = [
  {
    "name": "John Doe",
    "lat": 37.7749,
    "lng": -122.4194,
    "timestamp": 1712966938
  },
  {
    "name": "John Doe",
    "lat": 37.7749,
    "lng": -122.4194,
    "timestamp": 1713043338
  }
];

function getGraphData(data) {
  const graphData = {};
  data.forEach((item) => {
    const date = new Date(new Date(item.timestamp * 1000).toDateString());
    if ((graphTimeSelector.value == "week" && date >= new Date(new Date().setDate(new Date().getDate() - 7))) ||
      (graphTimeSelector.value == "month" && date >= new Date(new Date().setMonth(new Date().getMonth() - 1))) ||
      (graphTimeSelector.value == "year" && date >= new Date(new Date().setFullYear(new Date().getFullYear() - 1))) ||
      graphTimeSelector.value == "all") {
      if (graphData[date]) {
        graphData[date]++;
      } else {
        graphData[date] = 1;
      }
    }
  });
  return graphData;
}

const graphTimeSelector = document.getElementById('graphTimeSelector');

function getGraphLabels(timeSelection = "") {
  if (timeSelection == "") {
    timeSelection = graphTimeSelector.value;
  }

  const labels = [];
  const currentDate = new Date();
  if (timeSelection == "week") {
    const currentDay = currentDate.getDay();
    const daysUntilSunday = 0 - currentDay;
    const sundayDate = new Date(currentDate);
    sundayDate.setDate(currentDate.getDate() + daysUntilSunday);
    for (let i = 0; i < 7; i++) {
      const day = new Date(sundayDate);
      day.setDate(sundayDate.getDate() + i);
      labels.push(day);
    }
    graph.options.scales.x.time.displayFormats.day = 'dddd MM/DD/yyyy';
  } else if (timeSelection == "month") {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const day = new Date(currentYear, currentMonth, i);
      labels.push(day);
    }
    graph.options.scales.x.time.displayFormats.day = 'MM/DD/yyyy';
  } else if (timeSelection == "year") {
    const currentYear = currentDate.getFullYear();
    for (let i = 0; i < 12; i++) {
      const firstDayOfMonth = new Date(currentYear, i, 1);
      labels.push(firstDayOfMonth);
    }
    graph.options.scales.x.time.displayFormats.day = 'MM/DD/yyyy';
  } else {
    const dates = Object.keys(graphData);
    dates.sort(function(a, b) {
      return new Date(b) - new Date(a);
    }).reverse();

    const earliestDate = new Date(dates[0]);
    if ((currentDate - earliestDate) / (1000 * 60 * 60 * 24) <= 7) {
      return getGraphLabels("week");
    } else if ((currentDate - earliestDate) / (1000 * 60 * 60 * 24) <= 30) {
      return getGraphLabels("month");
    } else if ((currentDate - earliestDate) / (1000 * 60 * 60 * 24) <= 365) {
      return getGraphLabels("year");
    }

    const earliestYear = earliestDate.getFullYear();
    const currentYear = currentDate.getFullYear();
    for (let i = earliestYear; i < currentYear; i++) {
      const firstDayOfYear = new Date(i, 0, 1);
      labels.push(firstDayOfYear);
    }
    graph.options.scales.x.time.displayFormats.day = 'MM/DD/yyyy';
  }
  return labels;
}

function generateTestSeries() {
  let series = [];
  var val = 0;

  let start = new Date(2021, 10, 15, 15);
  let end = new Date(2021, 10, 15, 16);

  while (start < end) {
    val += Math.floor(Math.random() * 11) - 5;

    series.push({
      "x": start,
      "y": val,
    });

    start = new Date(start.getTime() + 60000);
  }

  return series;
}

let graphData;
let graph = new Chart(
  document.getElementById('eventsGraph'),
  {
    type: 'line',
    data: {
      labels: [
      ],
      datasets: [
        {
          label: 'Reported Emergencies',
          data: generateTestSeries()
        }
      ]
    },
    options: {
      scales: {
        x: {
          type: 'time',
          ticks: {
            source: 'labels'
          },
          time: {
            minUnit: 'day',
            displayFormats: {
              day: 'MM/DD/yyyy',
              week: 'MM/DD/yyyy',
              month: 'MMMM yyyy',
              year: 'yyyy'
            }
          }
        },
        y: {
          beginAtZero: true
        }
      }
    }
  }
);

function updateGraphTimeSelector() {
  graph.data.labels = getGraphLabels();
  graph.data.datasets[0].data = Object.values(graphData);
  graph.update();
}

function addTableData(data) {
  users = new Set();

  emergenciesTable.innerHTML = "";
  data.forEach((dataPoint) => {
    const mapURL = `https://maps.google.com/maps?ll=${dataPoint.lat},${dataPoint.lng}&z=16&t=m&hl=en-US&gl=US&q=${dataPoint.lat},${dataPoint.lng}`;
    const row = emergenciesTable.insertRow(-1);
    const timeCell = row.insertCell(0);
    const nameCell = row.insertCell(1);
    const locationCell = row.insertCell(2);
    timeCell.innerHTML = new Date(dataPoint.timestamp * 1000).toLocaleString();
    nameCell.innerHTML = `<div onclick="openUserChat('${dataPoint.name}')">${dataPoint.name}</div>`;
    locationCell.innerHTML = `<a href="${mapURL}" target="_blank">${dataPoint.lat},${dataPoint.lng}</a>`;

    users.add(dataPoint.name);
  });

  registeredDevicesTable.innerHTML = "";
  users.forEach((user) => {
    const row = registeredDevicesTable.insertRow(-1);
    const nameCell = row.insertCell(0);
    nameCell.innerHTML = `<div onclick="openUserChat('${user}')">${user}</div>`;
  });
}

function addDataPoint(dataPoint) {
  const date = new Date(new Date(dataPoint.timestamp * 1000).toDateString());
  if (graphData[date]) {
    graphData[date]++;
  } else {
    graphData[date] = 1;
  }
  graph.data.labels = getGraphLabels();
  graph.data.datasets[0].data = Object.values(graphData);
  graph.update();

  {
    const mapURL = `https://maps.google.com/maps?ll=${dataPoint.lat},${dataPoint.lng}&z=16&t=m&hl=en-US&gl=US&q=${dataPoint.lat},${dataPoint.lng}`;
    const row = emergenciesTable.insertRow(-1);
    const timeCell = row.insertCell(0);
    const nameCell = row.insertCell(1);
    const locationCell = row.insertCell(2);
    timeCell.innerHTML = new Date(dataPoint.timestamp * 1000).toLocaleString();
    nameCell.innerHTML = `<div onclick="openUserChat('${dataPoint.name}')">${dataPoint.name}</div>`;
    locationCell.innerHTML = `<a href="${mapURL}" target="_blank">${dataPoint.lat},${dataPoint.lng}</a>`;
  }

  {
    let length = users.size;
    users.add(dataPoint.name);
    if (users.size > length) {
      const row = registeredDevicesTable.insertRow(-1);
      const nameCell = row.insertCell(0);
      nameCell.innerHTML = `<div onclick="openUserChat('${dataPoint.name}')">${dataPoint.name}</div>`;
    }
  }

  eventModalUser = dataPoint.name;
  mapsEmbed.innerHTML = `
<div
  style="
    text-decoration: none;
    overflow: hidden;
    max-width: 100%;
    width: 500px;
    height: 500px;
  "
>
  <div
    id="display-google-map"
    style="height: 100%; width: 100%; max-width: 100%"
  >
    <iframe
      style="height: 100%; width: 100%; border: 0"
      frameborder="0"
      src="https://www.google.com/maps/embed/v1/place?q=${dataPoint.lat},${dataPoint.lng}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8"
    ></iframe>
  </div>
  <a
    class="from-embedmap-code"
    rel="nofollow"
    href="https://kbj9qpmy.com/bp"
    id="enable-map-data"
    >Internet Provider</a
  ><style>
    #display-google-map .text-marker{}.map-generator{max-width: 100%; max-height: 100%; background: none;
  </style>
</div>
  `;
  eventModal.show();
}

function openChat() {
  document.getElementById('chatModalLabel').innerText = `Chat with ${eventModalUser}`;
  // TODO: Load chat messages
  chatModal.show();
}

function openUserChat(user) {
  eventModalUser = user;
  openChat();
}

function handlePacket(msg) {
  if (msg.data === "ping" || msg.data === 'pong') {
    return;
  }

  const packet = JSON.parse(msg.data);
  if (Array.isArray(packet)) {
    graphData = getGraphData(packet);
    graph.data.labels = getGraphLabels();
    graph.data.datasets[0].data = Object.values(graphData);
    graph.update();
    addTableData(packet);
  } else {
    addDataPoint(packet);
  }
  console.log(packet);
  console.log(graphData);
}

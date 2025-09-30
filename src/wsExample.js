const messages = document.getElementById('messages');
const message = document.getElementById('message');
const send = document.getElementById('send');
send.addEventListener('click', () => {
        sendMessage(message.value);
    }
);
let socket;
let reconnectInterval;

connect();


function addMessage(message, type = 'message', t) {
    const mes_container = document.createElement('div');
    const new_message = document.createElement('p');
    new_message.textContent = message;

    const time = document.createElement('small');
    time.textContent = t;

    mes_container.appendChild(new_message);
    mes_container.appendChild(time);

    messages.appendChild(mes_container);
}

function sendMessage(message, type = 'message') {
    socket.send(JSON.stringify({ type: type, message: message, t: new Date() }));
}


function connect() {
    socket = new WebSocket("ws://localhost");


    socket.onopen = function(event) {
        console.log('Соединение установлено');
        sendMessage('User connected', 'connect', new Date())
    };



    socket.onmessage = function(event) {
        console.log('Получено сообщение:', event.data);
        const {type, message, t} = JSON.parse(event.data);
        if (type == 'message') {
            addMessage(message, type, t)
        } else if (type == 'connect') {
            const new_message = document.createElement('p');
            new_message.textContent = message;
            messages.appendChild(new_message);
        }

    };

    socket.onerror = function(event) {
        console.error('Ошибка:', event);
    };

    socket.onclose = function(event) {
        console.log('Соединение закрыто');
        reconnectInterval = setTimeout(connect, 1000);
     };
    }

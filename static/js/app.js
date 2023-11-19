let currentRecipient = '';
let chatInput = $('#chat-input');
let chatButton = $('#btn-send');
let userList = $('#user-list');
let messageList = $('#messages');

function updateUserList() {
    $.getJSON('api/v1/user/', function (data) {
        userList.children('.user').remove();
        for (let i = 0; i < data.length; i++) {
            const userItem = `<a class="list-group-item user">${data[i]['username']}</a>`;
            $(userItem).appendTo('#user-list');
        }
        $('.user').click(function () {
            userList.children('.active').removeClass('active');
            let selected = event.target;
            $(selected).addClass('active');
            setCurrentRecipient(selected.text);
            createWebSocket(currentUser, currentRecipient)
        });
    });
}

function drawMessage(message) {
    let position = 'left';
    const date = new Date(message.timestamp);
    if (message.user === currentUser) position = 'right';

    const messageItem = `
            <li class="message ${position}">
                <div class="avatar">${message.user}</div>
                    <div class="text_wrapper">
                        <div class="text">${message.body}<br>
                            <span class="small">${date}</span>
                    </div>
                </div>
            </li>`;
    $(messageItem).appendTo('#messages');
}

function getConversation(recipient) {
    $.getJSON(`/api/v1/message/?target=${recipient}`, function (data) {
        messageList.children('.message').remove();
        for (let i = data['results'].length - 1; i >= 0; i--) {
            drawMessage(data['results'][i]);
        }
        messageList.animate({ scrollTop: messageList.prop('scrollHeight') });
    });

}
// ! unused
function getMessageById(message) {
    id = JSON.parse(message).id
    $.getJSON(`/api/v1/message/${id}/`, function (data) {
        if (data.user === currentRecipient ||
            (data.recipient === currentRecipient && data.user == currentUser)) {
            drawMessage(data);
        }
        messageList.animate({ scrollTop: messageList.prop('scrollHeight') });
    });
}



function setCurrentRecipient(username) {
    currentRecipient = username;
    getConversation(currentRecipient);
    enableInput();
}


function enableInput() {
    chatInput.prop('disabled', false);
    chatButton.prop('disabled', false);
    chatInput.focus();
}

function disableInput() {
    chatInput.prop('disabled', true);
    chatButton.prop('disabled', true);
}

function createWebSocket(currentUser, recipent) {
    var socket = new WebSocket('ws://' + window.location.host + '/ws/' + currentUser + '/' + recipent + '/');

    chatInput.keypress(function (e) {
        if (e.keyCode == 13)
            chatButton.click();
    });

    chatButton.click(function () {
        if (chatInput.val().length > 0) {
            socket.send(JSON.stringify({
                'message': chatInput.val(),
                'recipient': recipent,
            }));

            messageList.animate({ scrollTop: messageList.prop('scrollHeight') });
            chatInput.val('');

        }
    });

    socket.onmessage = function (e) {
        // Process the received message
        let message = JSON.parse(e.data);
        drawMessage({
            'user': message.user,
            'body': message.body,
            'timestamp': message.timestamp,
        });
        messageList.animate({ scrollTop: messageList.prop('scrollHeight') });


    };
}


$(document).ready(function () {
    updateUserList();
    disableInput();


});




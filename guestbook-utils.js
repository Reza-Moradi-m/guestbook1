// guestbook-utils.js

let messages = JSON.parse(localStorage.getItem('guestbookMessages')) || [];

export function saveMessage(message) {
    return new Promise((resolve) => {
        messages.push(message);
        localStorage.setItem('guestbookMessages', JSON.stringify(messages));
        resolve();
    });
}

export function getMessages() {
    return new Promise((resolve) => {
        resolve(messages);
    });
}

export function removeMessage(id) {
    return new Promise((resolve) => {
        messages = messages.filter(message => message.id !== id);
        localStorage.setItem('guestbookMessages', JSON.stringify(messages));
        resolve();
    });
}

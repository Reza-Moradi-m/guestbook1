window.db = firebase.firestore();

const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get("chatId");
const chatMessagesContainer = document.getElementById("chatroom-messages");
const messageField = document.getElementById("message-field");
const sendButton = document.getElementById("send-message");

if (!chatId) {
  alert("No chat specified!");
  window.location.href = "messenger.html";
}

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    loadChatMessages(user.uid);
    setupMessageSending(user.uid);
  } else {
    alert("Please log in to view this chat.");
    window.location.href = "auth.html";
  }
});

async function loadChatMessages(userId) {
  const chatRef = window.db.collection("messages").doc(chatId);
  const chatDoc = await chatRef.get();

  if (!chatDoc.exists) {
    alert("Chat not found.");
    window.location.href = "messenger.html";
    return;
  }

  chatMessagesContainer.innerHTML = "";

  chatRef.collection("messages").orderBy("timestamp").onSnapshot((snapshot) => {
    chatMessagesContainer.innerHTML = "";
    snapshot.forEach((doc) => {
      const messageData = doc.data();
      const messageDiv = document.createElement("div");
      messageDiv.className = `message ${
        messageData.sender === userId ? "user" : "other"
      }`;
      messageDiv.textContent = messageData.text;
      chatMessagesContainer.appendChild(messageDiv);
    });
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  });
}

function setupMessageSending(userId) {
  sendButton.addEventListener("click", async () => {
    const text = messageField.value.trim();
    if (!text) return;

    try {
      const chatRef = window.db.collection("messages").doc(chatId);
      await chatRef.collection("messages").add({
        text,
        sender: userId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
      messageField.value = "";
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  });
}
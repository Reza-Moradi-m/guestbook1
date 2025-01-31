window.db = firebase.firestore();

const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get("chatId");
const chatMessagesContainer = document.getElementById("chatroom-messages");
const messageField = document.getElementById("message-field");
const sendButton = document.getElementById("send-message");

const backButton = document.getElementById("back-button");

if (!chatId) {
  alert("No chat specified!");
  window.location.href = "messenger.html";
}

backButton.addEventListener("click", () => {
  window.location.href = "messenger.html";
});

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    loadChatHeader(user.uid);
    loadChatMessages(user.uid);
    setupMessageSending(user.uid);
  } else {
    alert("Please log in to view this chat.");
    window.location.href = "auth.html";
  }
});

async function loadChatHeader(userId) {
  const chatRef = window.db.collection("messages").doc(chatId);
  const chatDoc = await chatRef.get();
  const participants = chatDoc.data().participants;

  const otherParticipantId = participants.find((id) => id !== userId);
  const userRef = window.db.collection("users").doc(otherParticipantId);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    const { username, profilePicture } = userDoc.data();
    const chatHeader = document.getElementById("chatroom-header");
    chatHeader.innerHTML = `
      <img src="${profilePicture || 'default-avatar.png'}" alt="Profile Picture" class="profile-picture">
      <span>${username || 'Unknown User'}</span>
    `;
  }
}

async function loadChatMessages(userId) {
  const chatRef = window.db.collection("messages").doc(chatId);

  try {
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) {
      alert("Chat not found.");
      window.location.href = "messenger.html";
      return;
    }

    const participants = chatDoc.data()?.participants || [];
    console.log("Participants Array (from Firestore):", participants);

    if (!Array.isArray(participants)) {
      console.error("Participants field is invalid:", participants);
      alert("Chat participants data is invalid.");
      window.location.href = "messenger.html";
      return;
    }

    if (!participants.includes(userId)) {
      alert("You are not authorized to send messages in this chat.");
      return;
    }

    chatMessagesContainer.innerHTML = "";

    // Load messages from the nested collection
    chatRef.collection("chatMessages").orderBy("timestamp").onSnapshot((snapshot) => {
      chatMessagesContainer.innerHTML = "";
      snapshot.forEach((doc) => {
        const messageData = doc.data();
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${messageData.sender === userId ? "user" : "other"
          }`;

        messageDiv.innerHTML = `
            <p>${messageData.text || ''}</p>
            ${messageData.fileUrl ? `<a href="${messageData.fileUrl}" target="_blank">View File</a>` : ''}
            <small>${messageData.timestamp ? new Date(messageData.timestamp.toDate()).toLocaleString() : 'Unknown time'}</small>
          `;
        chatMessagesContainer.appendChild(messageDiv);
      });
      chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    });
  } catch (error) {
    console.error("Error loading chat messages:", error);
    alert("Failed to load chat messages. Please try again.");
  }
}

function setupMessageSending(userId) {
  sendButton.addEventListener("click", async () => {
    const text = messageField.value.trim();
    if (!text) return;

    const fileInput = document.getElementById("file-input");
    const file = fileInput?.files?.[0];
    if (fileInput && !file) {
      alert("Please select a valid file.");
      return;
    }
    let fileUrl = "";

    if (file) {
      const storageRef = firebase.storage().ref(`uploads/${file.name}`);
      const snapshot = await storageRef.put(file);
      fileUrl = await snapshot.ref.getDownloadURL();
    }

    try {
      const chatRef = window.db.collection("messages").doc(chatId);
      await chatRef.collection("chatMessages").add({
        text,
        fileUrl,
        sender: userId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
      messageField.value = "";
      if (fileInput) fileInput.value = ""; // Reset the file input
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  });
}


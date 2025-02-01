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
    const chatHeaderContent = document.getElementById("chatroom-header-content");

    chatHeaderContent.innerHTML = `
      <button id="back-button" class="back-button">Back</button>
      <img src="${profilePicture || 'default-avatar.png'}" alt="Profile Picture" class="profile-picture">
      <span>${username || 'Unknown User'}</span>
    `;

    // Add the event listener for the dynamically created Back button
    const backButton = document.getElementById("back-button");
    backButton.addEventListener("click", () => {
      window.location.href = "messenger.html";
    });
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

        // Determine the best way to display the file
        let fileContent = "";
        if (messageData.fileUrl) {
          const fileExtension = messageData.fileUrl.split(".").pop().toLowerCase();
          if (["jpg", "jpeg", "png", "gif"].includes(fileExtension)) {
            // Display images inline
            fileContent = `<img src="${messageData.fileUrl}" alt="Image" class="chat-image" onclick="window.open('${messageData.fileUrl}', '_blank')">`;
          } else if (["mp4", "webm", "ogg"].includes(fileExtension)) {
            // Display videos inline
            fileContent = `<video controls class="chat-video" onclick="window.open('${messageData.fileUrl}', '_blank')">
                     <source src="${messageData.fileUrl}" type="video/${fileExtension}">
                     Your browser does not support the video tag.
                   </video>`;
          } else {
            // Display a link for other file types
            fileContent = `<a href="${messageData.fileUrl}" target="_blank">View File</a>`;
          }
        }

        // Add message text and file content
        messageDiv.innerHTML = `
  <p>${messageData.text || ""}</p>
  ${fileContent}
  <small>${messageData.timestamp ? new Date(messageData.timestamp.toDate()).toLocaleString() : "Unknown time"}</small>
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
    const fileInput = document.getElementById("file-input");
    const file = fileInput?.files?.[0];

    if (!text && !file) {
      alert("Please enter a message or select a file.");
      return;
    }

    let fileUrl = "";
    if (file) {
      try {
        const storageRef = firebase.storage().ref(`uploads/${file.name}`);
        const snapshot = await storageRef.put(file);
        fileUrl = await snapshot.ref.getDownloadURL();
      } catch (error) {
        console.error("Error uploading file:", error);
        alert("Failed to upload file. Please try again.");
        return;
      }
    }

    try {
      const chatRef = window.db.collection("messages").doc(chatId);
      await chatRef.collection("chatMessages").add({
        text: text || null, // Support sending files without text
        fileUrl: fileUrl || null, // Support sending messages without files
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


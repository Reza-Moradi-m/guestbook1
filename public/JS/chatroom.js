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

function loadChatHeader(userId) {
  const chatRef = window.db.collection("messages").doc(chatId);

  chatRef.onSnapshot(async (chatDoc) => {
    if (!chatDoc.exists) return;

    const participants = chatDoc.data().participants;
    const otherParticipantId = participants.find((id) => id !== userId);
    const userRef = window.db.collection("users").doc(otherParticipantId);

    userRef.onSnapshot((userDoc) => {
      if (userDoc.exists) {
        const { username, profilePicture } = userDoc.data();
        const chatHeaderContent = document.getElementById("chatroom-header-content");

        chatHeaderContent.innerHTML = `
          <button id="back-button" class="back-button">Back</button>
          <img src="${profilePicture || 'default-avatar.png'}" alt="Profile Picture" class="profile-picture">
          <a href="userProfile.html?userId=${otherParticipantId}" class="chat-username-link">${username || 'Unknown User'}</a>
        `;

        // Add the event listener for the dynamically created Back button
        document.getElementById("back-button").addEventListener("click", () => {
          window.location.href = "messenger.html";
        });
      }
    });
  });
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

    // Load messages from the nested collection and reverse their order
    chatRef.collection("chatMessages").orderBy("timestamp").onSnapshot((snapshot) => {
      const unreadMessages = [];
      chatMessagesContainer.innerHTML = "";

      // Reverse the messages array so that the newest messages appear at the bottom
      const reversedMessages = snapshot.docs.slice().reverse();

      const fetchMessages = async () => {
        for (const doc of reversedMessages) {
          const messageData = doc.data();
          const messageDiv = document.createElement("div");
          messageDiv.className = `message ${messageData.sender === userId ? "user" : "other"}`;

          let fileContent = "";
          if (messageData.fileUrl) {
            try {
              const response = await fetch(messageData.fileUrl, { method: "HEAD" });
              const contentType = response.headers.get("Content-Type");

              if (contentType.startsWith("image/")) {
                fileContent = `
                  <img src="${messageData.fileUrl}" alt="Image" class="chat-image"
                    onclick="window.open('${messageData.fileUrl}', '_blank')">
                `;
              } else if (contentType.startsWith("video/")) {
                fileContent = `
                  <video controls class="chat-video"
                    ondblclick="window.open('${messageData.fileUrl}', '_blank')"
                    onclick="handleVideoClick(event)">
                    <source src="${messageData.fileUrl}" type="${contentType}">
                    Your browser does not support the video tag.
                  </video>
                `;
              } else {
                fileContent = `
                  <a href="${messageData.fileUrl}" target="_blank" class="chat-generic-link">
                    Download File
                  </a>
                `;
              }
            } catch (error) {
              console.error("Error fetching file metadata:", error);
              fileContent = `
                <a href="${messageData.fileUrl}" target="_blank" class="chat-generic-link">
                  Download File
                </a>
              `;
            }
          }

          // Add message text and file content
          messageDiv.innerHTML = `
            <p>${messageData.text || ""}</p>
            ${fileContent}
            <small>${messageData.timestamp ? new Date(messageData.timestamp.toDate()).toLocaleString() : "Unknown time"}</small>
          `;
          chatMessagesContainer.appendChild(messageDiv);

          if (!messageData.readBy?.includes(userId)) {
            unreadMessages.push(doc.id);
          }
        }
        // Scroll to the bottom of the container after messages are rendered
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;

        // Batch update all unread messages at once
        if (unreadMessages.length > 0) {
          const batch = window.db.batch();
          unreadMessages.forEach((messageId) => {
            const messageRef = chatRef.collection("chatMessages").doc(messageId);
            batch.update(messageRef, {
              readBy: firebase.firestore.FieldValue.arrayUnion(userId),
            });
          });
          try {
            await batch.commit();
            console.log("✅ Messages marked as read successfully.");
            // Remove user from unreadBy after marking messages as read
            await chatRef.update({
              unreadBy: firebase.firestore.FieldValue.arrayRemove(userId),
            });
          } catch (error) {
            console.error("🚨 Failed to update read status:", error);
            alert("Error updating message status. Please check your Firestore rules and try again.");
          }
        }
      };

      fetchMessages();
    });
  } catch (error) {
    console.error("Error loading chat messages:", error);
    alert("Failed to load chat messages. Please try again.");
  }
}

// Function to handle video click: play on single tap, open in new tab on double tap
function handleVideoClick(event) {
  if (event.target.paused) {
    event.target.play(); // Play video on single tap
  } else {
    event.target.pause(); // Pause if already playing
  }
}

function setupMessageSending(userId) {
  sendButton.removeEventListener("click", sendMessageHandler); // Ensure only one listener exists
  sendButton.addEventListener("click", sendMessageHandler);

  async function sendMessage(chatId, text, fileUrl) {
    const user = firebase.auth().currentUser;
    if (!user) {
      alert("You must be signed in to send messages.");
      window.location.href = "auth.html";
      return;
    }

    const chatRef = window.db.collection("messages").doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      alert("Chat does not exist.");
      return;
    }

    const participants = chatDoc.data().participants;
    if (!participants.includes(user.uid)) {
      alert("You don’t have permission to send messages in this chat.");
      return;
    }

    const otherParticipant = participants.find(id => id !== user.uid);
    if (!otherParticipant) {
      alert("No other participant found.");
      return;
    }

    try {
      await chatRef.collection("chatMessages").add({
        text: text || null,
        fileUrl: fileUrl || null,
        sender: user.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        readBy: [user.uid]
      });

      await chatRef.update({
        lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
        unreadBy: firebase.firestore.FieldValue.arrayUnion(otherParticipant)
      });
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message: " + error.message);
    }
  }
}
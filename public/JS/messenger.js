window.db = firebase.firestore();
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    displayChatList(user.uid);
    setupNewChatCreation(user.uid);
  } else {
    alert("Please sign in to access Messenger.");
    window.location.href = "auth.html";
  }
});

// Display the list of chats for the logged-in user
async function displayChatList(userId) {
  const chatListDiv = document.createElement("div");
  chatListDiv.id = "chat-list";
  document.body.appendChild(chatListDiv);

  const chatRef = window.db.collection("messages");
  const chatSnapshot = await chatRef.where("participants", "array-contains", userId).get();

  chatSnapshot.forEach(async (doc) => {
    const chatMessagesRef = chatRef.doc(doc.id).collection("chatMessages");
    const messagesSnapshot = await chatMessagesRef.get();

    if (!messagesSnapshot.empty) {
      displayChat(doc.id, messagesSnapshot.docs);
    }
  });

  chatListDiv.innerHTML = "";
  for (const doc of chatSnapshot.docs) {
    const data = doc.data();
    const otherParticipant = data.participants.find((id) => id !== userId);

    // Create the chatDiv element first
    const chatDiv = document.createElement("div");
    chatDiv.classList.add("chat-entry");

    // Fetch the username of the other participant
    const userRef = window.db.collection("users").doc(otherParticipant);
    const userDoc = await userRef.get();
    async function displayChatList(userId) {
      const chatListDiv = document.createElement("div");
      chatListDiv.id = "chat-list";
      document.body.appendChild(chatListDiv);

      const chatRef = window.db.collection("messages");
      chatRef.where("participants", "array-contains", userId).onSnapshot(async (snapshot) => {
        chatListDiv.innerHTML = "";

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const otherParticipant = data.participants.find((id) => id !== userId);

          const chatDiv = document.createElement("div");
          chatDiv.classList.add("chat-entry");

          // Fetch username of other participant
          const userRef = window.db.collection("users").doc(otherParticipant);
          const userDoc = await userRef.get();
          chatDiv.textContent = userDoc.exists ? userDoc.data().username || "Unknown User" : "Unknown User";

          // Check for unread messages
          const chatMessagesRef = chatRef.doc(doc.id).collection("chatMessages");
          const unreadMessages = await chatMessagesRef.where("readBy", "not-in", [userId]).get();
          if (!unreadMessages.empty) {
            chatDiv.innerHTML += ' <span class="unread-badge">🔴</span>';
            chatDiv.classList.add("unread");
          }

          // Open chat on click
          chatDiv.addEventListener("click", async () => {
            window.location.href = `chatroom.html?chatId=${doc.id}`;

            // Mark messages as read
            unreadMessages.forEach((message) => {
              chatMessagesRef.doc(message.id).update({
                readBy: firebase.firestore.FieldValue.arrayUnion(userId),
              });
            });
          });

          chatListDiv.appendChild(chatDiv);
        }
      });
    }

    // Add event listener to open the chatroom
    chatDiv.addEventListener("click", () => {
      window.location.href = `chatroom.html?chatId=${doc.id}`;
    });

    // Append the chatDiv to the chatListDiv
    chatListDiv.appendChild(chatDiv);
  }
}

async function createOrGetChatRoom(currentUserId, targetUserId) {
  const chatRef = window.db.collection("messages");

  // Check if a chat already exists
  const existingChat = await chatRef
    .where("participants", "array-contains", currentUserId)
    .where("participants", "array-contains", targetUserId)
    .get();

  if (!existingChat.empty) {
    return existingChat.docs[0].id;
  }

  // Create a new chat room if none exists
  try {
    const newChat = await chatRef.add({
      participants: [currentUserId, targetUserId],
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return newChat.id;
  } catch (error) {
    console.error("Error creating chat:", error);
    alert("Error creating a chat. Please check your permissions.");
    return null;
  }
}

// Set up functionality to create a new individual or group chat
function setupNewChatCreation(userId) {
  const createChatButton = document.getElementById("new-chat-button");

  createChatButton.addEventListener("click", async () => {
    const username = prompt("Enter the username to chat with:");
    if (!username) return;

    try {
      // Find the target user by username
      const usersRef = window.db.collection("users");
      const userSnapshot = await usersRef.where("username", "==", username).get();

      if (userSnapshot.empty) {
        alert("User not found.");
        return;
      }

      const targetUserId = userSnapshot.docs[0].id;

      // Create or get a chat room
      const chatId = await createOrGetChatRoom(userId, targetUserId);
      window.location.href = `chatroom.html?chatId=${chatId}`;
    } catch (error) {
      console.error("Error creating new chat:", error);
      alert("Failed to create a new chat. Please try again.");
    }
  });
}
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    console.error("No user is signed in.");
    alert("You need to sign in to perform this action.");
    window.location.href = "auth.html"; // Redirect to login
  } else {
    console.log("Current user ID:", user.uid);
  }
});
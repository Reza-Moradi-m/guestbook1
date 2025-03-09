window.db = firebase.firestore();

// Handle authentication state changes
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
  const chatListDiv = document.getElementById("chat-list");
  if (!chatListDiv) {
    console.error("Chat list container not found!");
    return;
  }

  const chatRef = window.db.collection("messages");

  chatRef.where("participants", "array-contains", userId).onSnapshot(async (snapshot) => {
    snapshot.forEach(async (doc) => {
      const data = doc.data();
      const otherParticipant = data.participants.find((id) => id !== userId) || null;

      let chatDiv = document.getElementById(`chat-${doc.id}`);
      if (!chatDiv) {
        chatDiv = document.createElement("div");
        chatDiv.id = `chat-${doc.id}`;
        chatDiv.classList.add("chat-entry");
        chatListDiv.appendChild(chatDiv);
      }

      // Fetch username of the other participant
      if (otherParticipant) {
        const userRef = window.db.collection("users").doc(otherParticipant);
        userRef.get().then((userDoc) => {
          chatDiv.textContent = userDoc.exists ? userDoc.data().username : "Unknown User";
        });
      } else {
        console.warn(`No other participant found in chat ${doc.id}.`);
        chatDiv.textContent = "Unknown User";
      }

      // ✅ Check for unread messages BEFORE opening the chat
      const chatMessagesRef = chatRef.doc(doc.id).collection("chatMessages");
      try {
        const unreadMessages = await chatMessagesRef.where("readBy", "not-in", [userId]).get();
        
        if (!unreadMessages.empty) {
          chatDiv.innerHTML += ' <span class="unread-badge">🟢</span>'; // ✅ Green indicator for unread messages
          chatDiv.classList.add("unread");
        } else {
          chatDiv.classList.remove("unread");
          chatDiv.querySelector(".unread-badge")?.remove();
        }
      } catch (error) {
        console.error("Error fetching unread messages:", error);
      }

      // ✅ Open chat on click and update read status
      chatDiv.onclick = async () => {
        window.location.href = `chatroom.html?chatId=${doc.id}`;

        try {
          const unreadMessages = await chatMessagesRef.where("readBy", "not-in", [userId]).get();

          if (!unreadMessages.empty) {
            const batch = window.db.batch();
            unreadMessages.forEach((message) => {
              const messageRef = chatMessagesRef.doc(message.id);
              batch.update(messageRef, {
                readBy: firebase.firestore.FieldValue.arrayUnion(userId),
              });
            });

            await batch.commit();
            console.log("✅ Messages marked as read.");

            // ✅ Remove green indicator from UI immediately
            chatDiv.classList.remove("unread");
            chatDiv.querySelector(".unread-badge")?.remove();
          }
        } catch (error) {
          console.error("🚨 Failed to update read status:", error);
        }
      };
    });
  });
}

// Function to create or get a chat room
async function createOrGetChatRoom(currentUserId, targetUserId) {
  const chatRef = window.db.collection("messages");

  const existingChat = await chatRef
    .where("participants", "array-contains", currentUserId)
    .where("participants", "array-contains", targetUserId)
    .get();

  if (!existingChat.empty) {
    return existingChat.docs[0].id;
  }

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

// Set up functionality to create a new chat
function setupNewChatCreation(userId) {
  const createChatButton = document.getElementById("new-chat-button");

  createChatButton.addEventListener("click", async () => {
    const username = prompt("Enter the username to chat with:");
    if (!username) return;

    try {
      const usersRef = window.db.collection("users");
      const userSnapshot = await usersRef.where("username", "==", username).get();

      if (userSnapshot.empty) {
        alert("User not found.");
        return;
      }

      const targetUserId = userSnapshot.docs[0].id;
      const chatId = await createOrGetChatRoom(userId, targetUserId);
      window.location.href = `chatroom.html?chatId=${chatId}`;
    } catch (error) {
      console.error("Error creating new chat:", error);
      alert("Failed to create a new chat. Please try again.");
    }
  });
}

// Ensure users are authenticated
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    console.error("No user is signed in.");
    alert("You need to sign in to perform this action.");
    window.location.href = "auth.html";
  } else {
    console.log("Current user ID:", user.uid);
  }
});
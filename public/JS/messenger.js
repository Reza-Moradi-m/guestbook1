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
    snapshot.docChanges().forEach(async (change) => {
      const doc = change.doc;
      const data = doc.data();
      const otherParticipant = data.participants.find((id) => id !== userId);

      if (!otherParticipant) {
        console.warn("No other participant found in this chat.");
        return;
      }

      // Check if chat entry already exists
      // Check if chat entry already exists
      let chatDiv = document.getElementById(`chat-${doc.id}`);
      if (!chatDiv) {
        chatDiv = document.createElement("div");
        chatDiv.id = `chat-${doc.id}`;
        chatDiv.classList.add("chat-entry");

        // ✅ ONLY APPEND IF THE USERNAME IS VALID
        const userRef = window.db.collection("users").doc(otherParticipant);
        userRef.get().then((userDoc) => {
          if (userDoc.exists && userDoc.data().username) {
            chatDiv.textContent = userDoc.data().username;
            chatListDiv.appendChild(chatDiv);
          } else {
            console.warn("Skipping empty chat entry.");
          }
        });
      }

      // Fetch username of the other participant
      // Fetch username of the other participant
      const userRef = window.db.collection("users").doc(otherParticipant);
      userRef.get().then((userDoc) => {
        if (userDoc.exists && userDoc.data().username) {
          chatDiv.textContent = userDoc.data().username;
        } else {
          console.warn(`User ID ${otherParticipant} not found in database.`);
          chatDiv.remove(); // ✅ REMOVE BLANK SPACES INSTEAD OF SHOWING "Unknown User"
        }
      }).catch(error => {
        console.error("Error fetching user details:", error);
        chatDiv.remove(); // ✅ REMOVE INVALID ENTRIES
      });

      // Check for unread messages
      // Check for unread messages
      const chatMessagesRef = chatRef.doc(doc.id).collection("chatMessages");
      try {
        const unreadMessages = await chatMessagesRef.where("readBy", "not-in", [userId]).get();

        // ✅ ONLY SHOW GREEN CIRCLE IF THERE'S A NEW MESSAGE
        if (!unreadMessages.empty) {
          chatDiv.innerHTML += ' <span class="unread-badge">🟢</span>';
          chatDiv.classList.add("unread");
        } else {
          // ✅ REMOVE ANY INDICATOR IF ALL MESSAGES ARE READ
          chatDiv.classList.remove("unread");
          chatDiv.querySelector(".unread-badge")?.remove();
        }
      } catch (error) {
        console.error("Error fetching unread messages:", error);
      }

      // Open chat on click
      chatDiv.onclick = async () => {
        window.location.href = `chatroom.html?chatId=${doc.id}`;

        // Mark messages as read
        try {
          const unreadMessages = await chatMessagesRef.where("readBy", "not-in", [userId]).get();
          unreadMessages.forEach((message) => {
            chatMessagesRef.doc(message.id).update({
              readBy: firebase.firestore.FieldValue.arrayUnion(userId),
            });
          });
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      };
    });
  });
}

// Function to create or get a chat room
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

// Ensure users are authenticated
firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    console.error("No user is signed in.");
    alert("You need to sign in to perform this action.");
    window.location.href = "auth.html"; // Redirect to login
  } else {
    console.log("Current user ID:", user.uid);
  }
});
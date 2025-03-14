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

  chatRef
    .where("participants", "array-contains", userId)
    .orderBy("lastMessageAt", "desc")
    .onSnapshot(async (snapshot) => {
      chatListDiv.innerHTML = ""; // Clear the list
      const chatPromises = snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const otherParticipant = data.participants.find((id) => id !== userId) || null;
        const unreadBy = data.unreadBy || [];

        const chatDiv = document.createElement("div");
        chatDiv.id = `chat-${doc.id}`;
        chatDiv.classList.add("chat-entry");

        if (otherParticipant) {
          const userRef = window.db.collection("users").doc(otherParticipant);
          const userDoc = await userRef.get();
          const userData = userDoc.exists ? userDoc.data() : {};
          chatDiv.textContent = userData.username || userData.name || "Unknown User";
        } else {
          chatDiv.textContent = "Unknown User";
        }

        if (unreadBy.includes(userId)) {
          chatDiv.innerHTML += ' <span class="unread-badge">🟢</span>';
          chatDiv.classList.add("unread");
        }

        chatDiv.onclick = () => {
          window.location.href = `chatroom.html?chatId=${doc.id}`;
        };

        return chatDiv;
      });

      const chatDivs = await Promise.all(chatPromises);
      chatDivs.forEach((chatDiv) => chatListDiv.appendChild(chatDiv));
    }, (error) => {
      console.error("Error fetching chats:", error);
      alert("Failed to load chats: " + error.message);
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
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(), // Initialize with creation time
      unreadBy: [], // Initialize unreadBy as empty for new chats
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
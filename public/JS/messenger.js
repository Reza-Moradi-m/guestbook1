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

  const chatRef = window.db.collection("messages").where("participants", "array-contains", userId);
  const chatSnapshot = await chatRef.get();

  chatListDiv.innerHTML = "";
  chatSnapshot.forEach((doc) => {
    const data = doc.data();
    const otherParticipant = data.participants.find((id) => id !== userId);

    const chatDiv = document.createElement("div");
    chatDiv.classList.add("chat-entry");
    chatDiv.textContent = `Chat with User: ${otherParticipant}`;
    chatDiv.addEventListener("click", () => {
      window.location.href = `messenger.html?chatId=${doc.id}`;
    });

    chatListDiv.appendChild(chatDiv);
  });
}

async function createOrGetChatRoom(currentUserId, targetUserId) {
    const chatRef = window.db.collection("messages");
  
    // Check if a chat already exists
    const existingChat = await chatRef
  .where("participants", "array-contains", currentUserId)
  .get();

for (const doc of existingChat.docs) {
  const data = doc.data();
  if (data.participants.includes(targetUserId)) {
    return doc.id; // Return the existing chat ID
  }
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
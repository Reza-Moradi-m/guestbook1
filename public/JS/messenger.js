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
  const chatListDiv = document.getElementById("chat-list");  // ✅ Use the existing chat list in messenger.html
  if (!chatListDiv) {
    console.error("Chat list container not found!");  // ✅ Prevents script from failing if #chat-list is missing
    return;
  }

  const chatRef = window.db.collection("messages");
  const chatSnapshot = await chatRef.where("participants", "array-contains", userId).get();





  // Define the function to display a chat in the chat list
  function displayChat(chatId, messages) {
    const chatListDiv = document.getElementById("chat-list");

    // Create a chat entry if it doesn't exist
    let chatDiv = document.getElementById(`chat-${chatId}`);
    if (!chatDiv) {
      chatDiv = document.createElement("div");
      chatDiv.id = `chat-${doc.id}`;
      chatDiv.classList.add("chat-entry");
      chatListDiv.appendChild(chatDiv);
    }
  }
}

chatSnapshot.forEach(async (doc) => {
  const chatMessagesRef = chatRef.doc(doc.id).collection("chatMessages");
  const messagesSnapshot = await chatMessagesRef.get();

  if (!messagesSnapshot.empty) {
    displayChat(doc.id, messagesSnapshot.docs);  // ✅ No more ReferenceError since function is now defined
  }
});

chatListDiv.innerHTML = "";
for (const doc of chatSnapshot.docs) {
  const data = doc.data();
  const participants = data.participants || [];  // ✅ Ensure it exists
  const otherParticipant = participants.length > 1 ? participants.find((id) => id !== userId) : null;

  const chatDiv = document.createElement("div");
  chatDiv.classList.add("chat-entry");

  if (!otherParticipant) {
    console.warn("No other participant found in this chat.");
    chatDiv.textContent = "Unknown User";  // ✅ chatDiv is now defined before setting textContent
    continue;
  }


  // Fetch the username of the other participant
  const userRef = window.db.collection("users").doc(otherParticipant);
  const userDoc = await userRef.get();


  
  // Check for unread messages
  
  try {
    const unreadMessages = await chatMessagesRef.where("readBy", "not-in", [userId]).get();
    if (!unreadMessages.empty) {
      chatDiv.innerHTML += ' <span class="unread-badge">🔴</span>';
      chatDiv.classList.add("unread");
    }
  } catch (error) {
    console.error("Error fetching unread messages:", error);
  }

  chatRef.where("participants", "array-contains", userId).onSnapshot(async (snapshot) => {

    const existingChat = document.getElementById(`chat-${doc.id}`);
    if (!existingChat) {
      chatListDiv.appendChild(chatDiv);
    }

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const otherParticipant = data.participants.find((id) => id !== userId);

      const chatDiv = document.createElement("div");
      chatDiv.classList.add("chat-entry");

      // Fetch username of other participant

      const userRefInner = window.db.collection("users").doc(otherParticipant);
      userRefInner.get().then(async (userDoc) => {
        if (userDoc.exists) {
          chatDiv.textContent = userDoc.data().username || "Unknown User";
        } else {
          chatDiv.textContent = "Unknown User";
        }
      });

      // Check for unread messages
      
      try {
        const unreadMessages = await chatMessagesRef.where("readBy", "not-in", [userId]).get();
        if (!unreadMessages.empty) {
          chatDiv.innerHTML += ' <span class="unread-badge">🔴</span>';
          chatDiv.classList.add("unread");
        }
      } catch (error) {
        console.error("Error fetching unread messages:", error);
      }
      // Open chat on click
      chatDiv.onclick = async () => {
        window.location.href = `chatroom.html?chatId=${doc.id}`;

        // Mark messages as read
        unreadMessages.forEach((message) => {
          chatMessagesRef.doc(message.id).update({
            readBy: firebase.firestore.FieldValue.arrayUnion(userId),
          });
        });
      };

      chatListDiv.appendChild(chatDiv);
    }
  });
}

// Add event listener to open the chatroom
chatDiv.addEventListener("click", async () => {
  window.location.href = `chatroom.html?chatId=${doc.id}`;

  // Mark messages as read
  unreadMessages.forEach((message) => {
    chatMessagesRef.doc(message.id).update({
      readBy: firebase.firestore.FieldValue.arrayUnion(userId),
    });
  });
});

// Append the chatDiv to the chatListDiv



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
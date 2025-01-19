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

// Set up functionality to create a new individual or group chat
function setupNewChatCreation(userId) {
  const createChatButton = document.createElement("button");
  createChatButton.textContent = "New Chat";
  createChatButton.addEventListener("click", async () => {
    const username = prompt("Enter the username to chat with:");
    if (!username) return;

    // Find the user by username
    const usersRef = window.db.collection("users");
    const userSnapshot = await usersRef.where("username", "==", username).get();

    if (userSnapshot.empty) {
      alert("User not found.");
      return;
    }

    const targetUserId = userSnapshot.docs[0].id;
    const chatId = await createOrGetChatRoom(userId, targetUserId);
    window.location.href = `messenger.html?chatId=${chatId}`;
  });

  document.body.appendChild(createChatButton);
}
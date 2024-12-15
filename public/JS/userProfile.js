const userId = new URLSearchParams(window.location.search).get("userId");

async function loadUserProfile() {
  const profileContainer = document.getElementById("profile-container");
  const postsContainer = document.getElementById("user-posts");

  const userDoc = await db.collection("users").doc(userId).get();
  const userData = userDoc.data();

  profileContainer.innerHTML = `
    <img src="${userData.profilePicture || "images/default-avatar.png"}" alt="Profile Picture">
    <h2>${userData.name}</h2>
    <p>Username: ${userData.username}</p>
  `;

  const snapshot = await db.collection("guestbook").where("userId", "==", userId).get();

  snapshot.forEach((doc) => {
    const data = doc.data();
    const postElement = document.createElement("div");

    postElement.innerHTML = `
      <p>${data.message}</p>
      <a href="${data.fileURL}" target="_blank">View Attachment</a>
    `;
    postsContainer.appendChild(postElement);
  });
}

loadUserProfile();

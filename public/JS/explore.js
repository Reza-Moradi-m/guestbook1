// Attach Firestore and Storage to `window` for global access
window.db = firebase.firestore();
window.storage = firebase.storage();

// DOM Elements
const searchInput = document.getElementById("search-input");
const searchType = document.getElementById("search-type");
const searchButton = document.getElementById("search-button");
const resultsList = document.getElementById("results-list");
const randomPostsContainer = document.getElementById("random-posts-container");

// Event listener for the search button
searchButton.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  const type = searchType.value;

  if (!query) {
    alert("Please enter a search term.");
    return;
  }

  // Clear previous results
  resultsList.innerHTML = "";

  try {
    let results = [];

    if (type === "name") {
      results = await searchByName(query);
    } else if (type === "username") {
      results = await searchByUsername(query);
    } else if (type === "postText") {
      results = await searchByPostText(query);
    }

    displayResults(results, type);
  } catch (error) {
    console.error("Error during search:", error);
    alert("Failed to perform the search. Try again.");
  }
});

// Search by name
async function searchByName(query) {
  const querySnapshot = await db
    .collection("users")
    .where("nameLower", ">=", query.toLowerCase())
    .where("nameLower", "<=", query.toLowerCase() + "\uf8ff")
    .get();
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "user" }));
}

// Search by username
async function searchByUsername(query) {
  const querySnapshot = await db
    .collection("users")
    .where("username", ">=", query.toLowerCase())
    .where("username", "<=", query.toLowerCase() + "\uf8ff")
    .get();
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "user" }));
}

// Search by post text
async function searchByPostText(query) {
  const querySnapshot = await db
    .collection("guestbook")
    .where("message", ">=", query.toLowerCase())
    .where("message", "<=", query.toLowerCase() + "\uf8ff")
    .get();
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data(), type: "post" }));
}

// Display search results
function displayResults(results, type) {
  if (results.length === 0) {
    resultsList.innerHTML = "<li>No results found.</li>";
    return;
  }

  results.forEach((result) => {
    const listItem = document.createElement("li");
    listItem.classList.add("result-item");

    if (type === "name" || type === "username") {
      listItem.innerHTML = `
        <strong>${result.name}</strong>
        <a href="userProfile.html?userId=${result.id}">View Profile</a>
      `;
    } else if (type === "postText") {
      listItem.innerHTML = `
        <p>${result.message}</p>
        <a href="post.html?postId=${result.id}">View Post</a>
      `;
    }

    resultsList.appendChild(listItem);
  });
}

// Fetch and display random posts
async function displayRandomPosts() {
  try {
    const querySnapshot = await db.collection("guestbook").limit(10).get();
    randomPostsContainer.innerHTML = "";

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const postId = doc.id;

      const postDiv = document.createElement("div");
      postDiv.classList.add("post");
      postDiv.innerHTML = `
        <p><strong>${data.name || "Unknown"} (${data.username || "NoUsername"})</strong></p>
        <p>${data.message}</p>
        <a href="post.html?postId=${postId}" class="post-link">View Post</a>
      `;

      randomPostsContainer.appendChild(postDiv);
    });
  } catch (error) {
    console.error("Error fetching random posts:", error);
    randomPostsContainer.innerHTML = "<p>Failed to load random posts.</p>";
  }
}

// Load random posts on page load
window.onload = displayRandomPosts;
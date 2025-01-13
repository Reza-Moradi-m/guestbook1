// Attach Firestore and Auth to global variables
const db = firebase.firestore();
const auth = firebase.auth();

// DOM Elements
const searchInput = document.getElementById("search-input");
const searchType = document.getElementById("search-type");
const searchButton = document.getElementById("search-button");
const resultsList = document.getElementById("results-list");

// Add event listener for the search button
searchButton.addEventListener("click", async () => {
  const query = searchInput.value.trim();
  const type = searchType.value;

  if (!query) {
    alert("Please enter a search term!");
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
    console.error("Error performing search:", error);
    alert("Error searching. Please try again later.");
  }
});

// Function to search by name
async function searchByName(query) {
  const querySnapshot = await db.collection("users").where("name", ">=", query).where("name", "<=", query + "\uf8ff").get();
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: "user" }));
}

// Function to search by username
async function searchByUsername(query) {
  const querySnapshot = await db.collection("users").where("username", ">=", query).where("username", "<=", query + "\uf8ff").get();
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: "user" }));
}

// Function to search by post text
async function searchByPostText(query) {
  const querySnapshot = await db.collection("guestbook").where("message", ">=", query).where("message", "<=", query + "\uf8ff").get();
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: "post" }));
}

// Function to display results
function displayResults(results, type) {
  if (results.length === 0) {
    resultsList.innerHTML = "<li>No results found.</li>";
    return;
  }

  results.forEach(result => {
    const listItem = document.createElement("li");
    listItem.classList.add("result-item");

    if (type === "name" || type === "username") {
      listItem.innerHTML = `
        <div>
          <strong>${result.name || result.username || "Unknown User"}</strong>
          <a href="userProfile.html?userId=${result.id}">View Profile</a>
        </div>
      `;
    } else if (type === "postText") {
      listItem.innerHTML = `
        <div>
          <p>${result.message}</p>
          <a href="post.html?postId=${result.id}">View Post</a>
        </div>
      `;
    }

    resultsList.appendChild(listItem);
  });
}
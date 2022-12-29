var shareImageButton = document.querySelector("#share-image-button");
var createPostArea = document.querySelector("#create-post");
var closeCreatePostModalButton = document.querySelector(
  "#close-create-post-modal-btn"
);
var sharedMomentsArea = document.querySelector("#shared-moments");
var form = document.querySelector("form");
var titleInput = document.querySelector("#title");
var locationInput = document.querySelector("#location");

function openCreatePostModal() {
  createPostArea.style.display = "block";

  if (deferredPrompt) {
    deferredPrompt.prompt();

    deferredPrompt.userChoice.then(function (choiceResult) {
      console.log(choiceResult);

      if (choiceResult.outcome === "dismissed") {
        console.log("User cancelled installation");
      } else {
        console.log("User added to home screen");
      }
    });

    deferredPrompt = null;
  }

  //   if ("serviceWorker" in navigator) {
  //     navigator.serviceWorker.getRegistrations().then(function (registrations) {
  //       for (var i = 0; i < registrations.length; i++) {
  //         registrations[i].unregister();
  //       }
  //     });
  //   }
}

function closeCreatePostModal() {
  createPostArea.style.display = "none";
}

shareImageButton.addEventListener("click", openCreatePostModal);

closeCreatePostModalButton.addEventListener("click", closeCreatePostModal);

// Currently not in use, allows to save assets in cache on demand otherwise
function onSaveButtonClicked(event) {
  console.log("Clicked");
}

function clearCards() {
  while (sharedMomentsArea.hasChildNodes()) {
    sharedMomentsArea.removeChild(sharedMomentsArea.lastChild);
  }
}

function createCard(data) {
  var cardWrapper = document.createElement("div");
  cardWrapper.className = "shared-moment-card mdl-card mdl-shadow--2dp";
  var cardTitle = document.createElement("div");
  cardTitle.className = "mdl-card__title";
  cardTitle.style.backgroundImage = "url(" + data.image + ")";
  cardTitle.style.backgroundSize = "cover";
  cardTitle.style.height = "180px";
  cardWrapper.appendChild(cardTitle);
  var cardTitleTextElement = document.createElement("h2");
  cardTitleTextElement.className = "mdl-card__title-text";
  cardTitleTextElement.textContent = data.title;
  cardTitle.appendChild(cardTitleTextElement);
  var cardSupportingText = document.createElement("div");
  cardSupportingText.className = "mdl-card__supporting-text";
  cardSupportingText.textContent = data.location;
  cardSupportingText.style.textAlign = "center";
  //   var cardSaveButton = document.createElement("button");
  //   cardSaveButton.textContent = "Save";
  //   cardSaveButton.addEventListener("click", onSaveButtonClicked);
  //   cardSupportingText.appendChild(cardSaveButton);
  cardWrapper.appendChild(cardSupportingText);
  componentHandler.upgradeElement(cardWrapper);
  sharedMomentsArea.appendChild(cardWrapper);
}

var url =
  "https://pwagram-7071e-default-rtdb.asia-southeast1.firebasedatabase.app/posts.json";
var networkDataReceived = false;

function updateUI(data) {
  clearCards();
  for (var i = 0; i < data.length; i++) {
    createCard(data[i]);
  }
}

fetch(url)
  .then(function (res) {
    return res.json();
  })
  .then(function (data) {
    networkDataReceived = true;
    console.log("From web:", data);
    var dataArr = [];
    for (var key in data) {
      dataArr.push(data[key]);
    }
    updateUI(dataArr);
  });

if ("indexedDB" in window) {
  readAllData("posts").then((data) => {
    if (!networkDataReceived) {
      console.log("From cache:", data);
      updateUI(data);
    }
  });
}

// if ("caches" in window) {
//   caches
//     .match(url)
//     .then(function (response) {
//       if (response) {
//         return response.json();
//       }
//     })
//     .then(function (data) {
//       console.log("From cache:", data);
//       if (!networkDataReceived) {
//         var dataArr = [];
//         for (var key in data) {
//           dataArr.push(data[key]);
//         }
//         updateUI(dataArr);
//       }
//     });
// }

function sendData() {
  fetch(
    "https://pwagram-7071e-default-rtdb.asia-southeast1.firebasedatabase.app/posts.json",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        id: new Date().toISOString(),
        title: titleInput.value,
        location: locationInput.value,
        image:
          "https://firebasestorage.googleapis.com/v0/b/pwagram-7071e.appspot.com/o/sf-boat.jpg?alt=media&token=e54e0794-661f-493c-af85-61e5e7e0769d",
      }),
    }
  ).then((res) => {
    console.log("Send data:", res);
    updateUI();
  });
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (titleInput.value.trim() === "" || locationInput.value.trim() === "") {
    alert("Please enter valid data");
    return;
  }

  closeCreatePostModal();

  if ("serviceWorker" in navigator && "SyncManager" in window) {
    navigator.serviceWorker.ready.then((sw) => {
      var post = {
        id: new Date().toISOString(),
        title: titleInput.value,
        location: locationInput.value,
      };

      writeData("sync-posts", post)
        .then(() => {
          return sw.sync.register("sync-new-post");
        })
        .then(() => {
          var snackbarContainer = document.querySelector("#confirmation-toast");
          var data = { message: "Your post was saved for syncing!" };
          snackbarContainer.MaterialSnackbar.showSnackbar(data);
        })
        .catch((err) => {
          console.log(err);
        });
    });
  } else {
    sendData();
  }
});

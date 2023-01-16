var shareImageButton = document.querySelector("#share-image-button");
var createPostArea = document.querySelector("#create-post");
var closeCreatePostModalButton = document.querySelector(
  "#close-create-post-modal-btn"
);
var sharedMomentsArea = document.querySelector("#shared-moments");
var form = document.querySelector("form");
var titleInput = document.querySelector("#title");
var locationInput = document.querySelector("#location");
var videoPlayer = document.querySelector("#player");
var canvasElement = document.querySelector("#canvas");
var captureBtn = document.querySelector("#capture-btn");
var imagePicker = document.querySelector("#image-picker");
var imagePickerArea = document.querySelector("#pick-image");
var picture;
var locationBtn = document.querySelector("#location-btn");
var locationLoader = document.querySelector("#location-loader");
var fetchedLocation = { lat: 0, lng: 0 };

locationBtn.addEventListener("click", (e) => {
  if (!("geolocation" in navigator)) {
    return;
  }

  var alertPrompted = false;

  locationBtn.style.display = "none";
  locationLoader.style.display = "block";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      locationLoader.style.display = "none";
      locationBtn.style.display = "inline";
      fetchedLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      locationInput.value = "In Vietnam";
      document.querySelector("#manual-location").classList.add("is-focused");
    },
    (err) => {
      console.log(err);
      locationLoader.style.display = "none";
      locationBtn.style.display = "inline";
      if (!alertPrompted) {
        alert("Couldn't fetch location, please enter manually");
        alertPrompted = true;
      }
      fetchedLocation = { lat: 0, lng: 0 };
    },
    { timeout: 60000 }
  );
});

function initializeLocation() {
  if (!("geolocation" in navigator)) {
    locationBtn.style.display = "none";
  }
}

function initializeMedia() {
  // polyfill "MediaDevices.getUserMedia()"
  if (!("mediaDevices" in navigator)) {
    navigator.mediaDevices = {};
  }

  if (!("getUserMedia" in navigator.mediaDevices)) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      var getUserMedia =
        navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      if (!getUserMedia) {
        return Promise.reject(new Error("getUserMedia is not implemented!"));
      }

      return new Promise((resolve, reject) => {
        // bind to navigator and call
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }

  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      videoPlayer.srcObject = stream;
      videoPlayer.style.display = "block";
    })
    .catch((err) => {
      imagePickerArea.style.display = "block";
    });
}

captureBtn.addEventListener("click", () => {
  canvasElement.style.display = "block";
  videoPlayer.style.display = "none";
  captureBtn.style.display = "none";
  var context = canvasElement.getContext("2d");
  context.drawImage(
    videoPlayer,
    0,
    0,
    canvas.width,
    videoPlayer.videoHeight / (videoPlayer.videoWidth / canvas.width)
  );

  videoPlayer.srcObject.getVideoTracks().forEach((track) => track.stop());

  picture = base64DataURItoBlob(canvasElement.toDataURL());
});

imagePicker.addEventListener("change", (e) => {
  picture = e.target.files[0];
});

function openCreatePostModal() {
  createPostArea.style.display = "block";

  initializeMedia();
  initializeLocation();

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
  imagePickerArea.style.display = "none";
  videoPlayer.style.display = "none";
  canvasElement.style.display = "none";
  captureBtn.style.display = "inline";

  // close video stream if camera is opened
  if (videoPlayer.srcObject) {
    videoPlayer.srcObject.getVideoTracks().forEach((track) => track.stop());
  }

  locationBtn.style.display = "inline";
  locationLoader.style.display = "none";
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
  var id = new Date().toISOString();
  var postData = new FormData();
  postData.append("id", id);
  postData.append("title", titleInput.value);
  postData.append("location", locationInput.value);
  postData.append("rawLocationLat", fetchedLocation.lat);
  postData.append("rawLocationLng", fetchedLocation.lng);
  postData.append("imageFile", picture, id + ".png");

  fetch(
    // "https://pwagram-7071e-default-rtdb.asia-southeast1.firebasedatabase.app/posts.json"
    "endpoint_on_server_or_cloud_function_to_store_post_as_form_data",
    {
      method: "POST",
      body: postData,
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
        picture: picture,
        rawLocation: fetchedLocation,
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

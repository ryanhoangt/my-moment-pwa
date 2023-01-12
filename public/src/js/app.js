var deferredPrompt;
var enableNotificationBtns = document.querySelectorAll(".enable-notifications");

if (!window.Promise) {
  window.Promise = Promise;
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(() => {
    console.log("Service worker registered!");
  });
}

window.addEventListener("beforeinstallprompt", function (event) {
  console.log("beforeinstallprompt fired!");
  event.preventDefault();
  deferredPrompt = event;
  return false;
});

function displayConfirmNotification() {
  if ("serviceWorker" in navigator) {
    var options = {
      body: "You successfully subscribed to our Notification service.",
      icon: "/src/images/icons/app-icon-96x96.png",
      image: "/src/images/sf-boat.jpg",
      dir: "ltr",
      lang: "en-US",
      vibrate: [100, 50, 200], // vibrate, pause, vibrate...
      badge: "/src/images/icons/app-icon-96x96.png",
      tag: "confirm-notification",
      renotify: true,
      actions: [
        {
          action: "confirm",
          title: "Okay",
          icon: "/src/images/icons/app-icon-96x96.png",
        },
        {
          action: "cancel",
          title: "Cancel",
          icon: "/src/images/icons/app-icon-96x96.png",
        },
      ],
    };

    navigator.serviceWorker.ready.then((swRegistration) => {
      swRegistration.showNotification("[SW] Successfully subscribed!", options);
    });
  }

  // Show notification using client side JS
  //   new Notification("Successfully subscribed!", options);
}

function configurePushSubscription() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  var reg;
  navigator.serviceWorker.ready
    .then((swRegistration) => {
      reg = swRegistration;
      return swRegistration.pushManager.getSubscription();
    })
    .then((sub) => {
      if (sub == null) {
        // create new subscription
        var vapidPublicKey = "vapidpubkeygeneratedonserver";
        var convertedVapidPubKey = urlBase64ToUint8Array(vapidPublicKey);

        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidPubKey,
        });
      } else {
        // already have a subscription
      }
    })
    .then((newSub) => {
      // persist subscription to database
      /* NOTE: if we UNREGISTER the service worker
        (manually or implicitly CLEAR SITE DATA), the
        subscription cannot be used anymore (to clean up,
        maybe we should delete the subscription in db)
       */
      return fetch(
        "https://pwagram-7071e-default-rtdb.asia-southeast1.firebasedatabase.app/subscriptions.json",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(newSub),
        }
      );
    })
    .then((res) => {
      if (res.ok) {
        displayConfirmNotification();
      }
    })
    .catch((err) => {
      console.log(err);
    });
}

function askForNotificationPermission() {
  Notification.requestPermission((res) => {
    if (res !== "granted") {
      console.log("No notification permission granted!");
    } else {
      //   displayConfirmNotification();
      configurePushSubscription();
    }
  });
}

if ("Notification" in window && "serviceWorker" in navigator) {
  for (var i = 0; i < enableNotificationBtns.length; i++) {
    enableNotificationBtns[i].style.display = "inline-block";
    enableNotificationBtns[i].addEventListener(
      "click",
      askForNotificationPermission
    );
  }
}

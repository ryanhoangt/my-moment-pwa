importScripts("/src/js/idb.js");
importScripts("/src/js/util.js");

var CACHE_STATIC_NAME = "static-v26";
var CACHE_DYNAMIC_NAME = "dynamic-v3";
var STATIC_FILES = [
  "/",
  "/index.html",
  "/offline.html",
  "/src/js/app.js",
  "/src/js/feed.js",
  "/src/js/idb.js",
  "/src/js/util.js",
  "/src/js/promise.js",
  "/src/js/fetch.js",
  "/src/js/material.min.js",
  "/src/css/app.css",
  "/src/css/feed.css",
  "/src/images/main-image.jpg",
  "https://fonts.googleapis.com/css?family=Roboto:400,700",
  "https://fonts.googleapis.com/icon?family=Material+Icons",
  "https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css",
];

// function trimCache(cacheName, maxItemsRemaining) {
//   caches.open(cacheName).then(function (cache) {
//     return cache.keys().then(function (keys) {
//       if (keys.length > maxItems) {
//         cache.delete(keys[0]).then(trimCache(cacheName, maxItems));
//       }
//     });
//   });
// }

self.addEventListener("install", function (event) {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME).then(function (cache) {
      console.log("[SW] Precaching App Shell...");
      cache.addAll(STATIC_FILES);
    })
  );
});

self.addEventListener("activate", function (event) {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches.keys().then(function (keyList) {
      return Promise.all(
        keyList.map((keyElem) => {
          if (keyElem !== CACHE_STATIC_NAME && keyElem !== CACHE_DYNAMIC_NAME) {
            console.log("[SW] Removing old cache:", keyElem);
            return caches.delete(keyElem);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

const isInArray = (requestURL, cacheArr) =>
  cacheArr.some((url) => url === requestURL.replace(self.origin, ""));

self.addEventListener("fetch", function (event) {
  // both implicitly-triggerred fetches and js fetches
  var url =
    "https://pwagram-7071e-default-rtdb.asia-southeast1.firebasedatabase.app/posts";

  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(
      fetch(event.request).then(function (res) {
        var resClone = res.clone();
        clearAllData("posts")
          .then(() => {
            return resClone.json();
          })
          .then((data) => {
            for (var key in data) {
              writeData("posts", data[key]);
            }
          });
        return res;
      })
    );
  } else if (
    /**
     * Strategy: cache only
     * we may apply this strategy here because every time sw pumps
     * to new version, all the static files are updated consequently.
     */
    // new RegExp("\\b" + STATIC_FILES.join("\\b|\\b") + "\\b").test(
    //   event.request.url
    // )
    isInArray(event.request.url, STATIC_FILES)
  ) {
    event.respondWith(caches.match(event.request));
  } else {
    event.respondWith(
      caches.match(event.request).then(function (response) {
        if (response) {
          // find a match in the cache
          return response;
        } else {
          return fetch(event.request)
            .then(function (res) {
              return caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
                // trimCache(CACHE_DYNAMIC_NAME, 6);
                cache.put(event.request.url, res.clone()); // not consume the original response
                return res; // return response back after putting it to cache
              });
            })
            .catch(function (err) {
              return caches.open(CACHE_STATIC_NAME).then(function (cache) {
                if (event.request.headers.get("accept").includes("text/html"))
                  return cache.match("/offline.html");
              });
            });
        }
      })
    );
  }
});

/**
 * Strategy: cache first, network fallback, with dynamic caching
 */
// self.addEventListener("fetch", function (event) {
//   event.respondWith(
//     caches.match(event.request).then(function (response) {
//       if (response) {
//         // find a match in the cache
//         return response;
//       } else {
//         return fetch(event.request)
//           .then(function (res) {
//             return caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
//               cache.put(event.request.url, res.clone()); // not consume the original response
//               return res; // return response back after putting it to cache
//             });
//           })
//           .catch(function (err) {
//             return caches.open(CACHE_STATIC_NAME).then(function (cache) {
//               return cache.match("/offline.html");
//             });
//           });
//       }
//     })
//   );
// });

/**
 * Strategy: network first, cache fallback, with dynamic caching
 */
// self.addEventListener("fetch", function (event) {
//   event.respondWith(
//     fetch(event.request)
//       .then(function (res) {
//         return caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
//           cache.put(event.request.url, res.clone());
//           return res;
//         });
//       })
//       .catch(function (err) {
//         // cannot fetch due to network issues
//         return caches.match(event.request);
//       })
//   );
// });

self.addEventListener("sync", (event) => {
  console.log("[SW] Background syncing:", event);

  if (event.tag === "sync-new-post") {
    console.log("[SW] Syncing new posts...");
    event.waitUntil(
      readAllData("sync-posts").then((data) => {
        for (var savedPost of data) {
          //   const savedPostClone = { ...savedPost }; // closure issue with variables in outer loop

          var postData = new FormData();
          postData.append("id", postData.id);
          postData.append("title", postData.title);
          postData.append("location", postData.location);
          postData.append("rawLocationLat", postData.rawLocation.lat);
          postData.append("rawLocationLng", postData.rawLocation.lng);
          postData.append("imageFile", postData.picture, postData.id + ".png");

          fetch(
            // "https://pwagram-7071e-default-rtdb.asia-southeast1.firebasedatabase.app/posts.json",
            "endpoint_on_server_or_cloud_function_to_store_post_as_form_data",
            {
              method: "POST",
              body: postData,
            }
          )
            .then((res) => {
              console.log("Send data:", res);

              // clear posts in indexedDB
              if (res.ok) {
                deleteItemFromData("sync-posts", savedPostClone.id);
              }
            })
            .catch((err) => {
              console.log("Error while trying to sending data:", err);
            });
        }
      })
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  var notification = event.notification;
  var action = event.action;

  //   console.log(notification);

  if (action === "confirm") {
    console.log("Confirm was chosen!");

    // OPEN NEW PAGE
    event.waitUntil(
      self.clients.matchAll().then(
        // for all clients of the SW
        (clis) => {
          var client = clis.find((cli) => cli.visibilityState === "visible");

          // there is a tab openning
          if (client !== undefined) {
            client.navigate(notification.data.openUrl);
            client.focus();
          } else {
            // open a new tab
            self.clients.openWindow(notification.data.openUrl);
          }
        }
      )
    );
  } else {
    console.log(action); // cancel + any other events
  }

  notification.close();
});

// triggers when the user actively dismisses the notification
// useful to send analytical infomation (why users ignore...)
self.addEventListener("notificationclose", (event) => {
  console.log("Notification was closed:", event);
});

// ==================================================
// Before listening to push noti, make sure to
// implement push noti feature on server side.
// ==================================================

self.addEventListener("push", (event) => {
  // console.log("Push notification received!");

  var data = { title: "New!", content: "Something happened!", toOpenUrl: "/" };

  if (event.data) {
    data = JSON.parse(event.data.text());
  }

  // send notification to user's browser
  var options = {
    body: data.content,
    icon: "/src/images/icons/app-icon-96x96.png", // this can be received through noti payload as image url
    badge: "/src/images/icons/app-icon-96x96.png",
    data: {
      openUrl: data.toOpenUrl,
    },
  };

  event.waitUntil(
    // get the registration to show noti, not the sw itself. The SW is listening to event.
    self.registration.showNotification(data.title, options)
  );
});

// REMINDER: make sure not to CLEAR SITE DATA as it will invalidate the subsciption.

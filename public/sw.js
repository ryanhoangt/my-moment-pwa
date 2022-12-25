var CACHE_STATIC_NAME = "static-v13";
var CACHE_DYNAMIC_NAME = "dynamic-v2";
var STATIC_FILES = [
  "/",
  "/index.html",
  "/offline.html",
  "/src/js/app.js",
  "/src/js/feed.js",
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
  var url = "https://httpbin.org/get";

  if (event.request.url.indexOf(url) > -1) {
    event.respondWith(
      caches.open(CACHE_DYNAMIC_NAME).then(function (cache) {
        return fetch(event.request).then(function (res) {
          //   trimCache(CACHE_DYNAMIC_NAME, 6);
          cache.put(event.request, res.clone());
          return res;
        });
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

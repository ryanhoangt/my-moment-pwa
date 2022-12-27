var dbPromise = idb.open("posts-store", 1, function (db) {
  if (!db.objectStoreNames.contains("posts")) {
    db.createObjectStore("posts", {
      keyPath: "id",
    });
  }
});

function writeData(storeName, data) {
  dbPromise.then(function (db) {
    var tx = db.transaction(storeName, "readwrite");
    var store = tx.objectStore(storeName);
    store.put(data);
    return tx;
  });
}

function readAllData(storeName) {
  return dbPromise.then((db) => {
    var tx = db.transaction(storeName, "readonly");
    var store = tx.objectStore(storeName);
    return store.getAll();
  });
}

function clearAllData(storeName) {
  return dbPromise.then((db) => {
    var tx = db.transaction(storeName, "readwrite");
    var store = tx.objectStore(storeName);
    store.clear();
    return tx.complete;
  });
}

// function deleteItemFromData(storeName, id) {
//   return dbPromise
//     .then((db) => {
//       var tx = db.transaction(storeName, "readwrite");
//       var store = tx.objectStore(storeName);
//       store.delete(id);
//       return tx.complete;
//     })
//     .then(() => {
//       console.log("Item deleted");
//     });
// }

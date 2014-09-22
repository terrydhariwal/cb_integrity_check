function (doc, meta) {
  var handle
  if(doc.type === "user") {
    emit(meta.id, ["$isSource", doc.email, doc.twitter]);
  } else {
    handle = meta.id.split(":")[1]
    emit(doc.id, [handle])
  }
}

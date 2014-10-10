function (doc, meta) {
  var handle
  if(doc.type === "user") {
    emit(meta.id, ["$isSource", doc.email, doc.twitter, doc.blog]);
  } else if(doc.id) {
    handle = meta.id.split(":")[1]
    if(!handle)
      emit(doc.id, [meta.id]);
    else
      emit(doc.id, [handle]);
  }
}
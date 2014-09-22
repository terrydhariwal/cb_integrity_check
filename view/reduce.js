function (keys, values, rereduce) {
  var groups = {};
  var k;
  if(rereduce) {
    // values now contains groups
    // { values: ["jj"], key: "main3", main: ["joel@basho.com", "joeljacobson"] }
    // we need to merge them to further process them
    values.forEach(function(e) {
      if(!groups[e.key]) {
        // nothing to merge
        groups[e.key] = e;
      } else {
        groups[e.key].key = e.key;
        // merge the values, there shouldn't be duplicates
        group.values.concat(e.values);
        // main is either null or the same
        groups[e.key].main = groups[e.key].main || e.main
        // merge the missmatch and matched counts
        groups[e.key].miss += e.miss
        groups[e.key].matched += e.matched
      }
    })
  } else {
    // Create the groups acording to the keys

    // The groups look like this:
    // { values: ["jj"], key: "main3", main: ["joel@basho.com", "joeljacobson"] }
    // in case the view is queried in a grouped way there will only be one key
    // if they are queried un grouped ther will be N
    var ck;
    var group;
    for(k = 0; k < keys.length; k++) {
      // process the keys in groups
      if(keys[k] != ck) {
        ck = keys[k];
        groups[ck] = {values: [], key: ck, main: null, miss: 0, matched: 0};
        group = groups[ck];
      }
      if(values[k][0] == "$isSource"){
        values[k].shift();
        group.main = values[k];
      } else {
        group.values.push(values[k][0]);
      }
    }
  }

  // now reduce the groups down to the missmatches
  // anytime there is no missmatch nothing needs to be stored, the end result is
  // and index which contains just the missmatches globally. Depending on the
  // number of missmatches it's probably a good idea to query it grouped and paged
  // if you expect many.

  // The result is a structure like this:
  // {"values":[],"key":"main1","main":["philipp.fehre@gmail.com","ischi"],"miss":0,"matched":1,"missmatches":1}
  //
  // values: indicate all references which should not be present because they are not present in the main document
  // key: the key of the main document
  // main: all the references that were checked, if main is null the main document is missing
  // missmatches: the number if incorrect references, either missing or wrong

  // miss: the number of times a refence key was not matched in the main (internal)
  // matched: the number of times a refece key was matched to the main (internal)

  var curr;
  var res = [];
  var miss;
  var matched;

  for(k in groups) {

    curr = groups[k];

    if(!curr.main) {
      // the main document is missing, needs to be checked!
      curr.missmatches = "all";
      res.push(curr);
    } else {
      var indexesToRemove = [];
      curr.values.forEach(function(e, idx) {
        if(curr.main.indexOf(e) == -1) {
          curr.miss++;
          curr.matched++;
        } else {
          indexesToRemove.push(idx);
          curr.matched++;
        }
      });
      // remove all the items we have matched from the values
      indexesToRemove.forEach(function(idx) {
        curr.values.splice(idx, 1);
      })
      curr.missmatches = curr.miss + (curr.main.length - curr.matched);
      if(curr.missmatches != 0) {
        res.push(curr);
      }
    }
  }
  return res;
}

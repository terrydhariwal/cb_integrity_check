function (keys, values, rereduce) {
  var groups = {};
  var k;
  if(rereduce) {
    // values now contains groups
    // { orphaned_lookup_keys: ["jj"], parent_key: "main3", valid_lookups: ["joel@basho.com", "joeljacobson"] }
    // we need to merge them to further process them
    values.forEach(function(e) {
      if(!groups[e.parent_key]) {
        // nothing to merge
        groups[e.parent_key] = e;
      } else {
        groups[e.parent_key].parent_key = e.parent_key;
        
        // merge the orphaned_lookup_keys, there shouldn't be duplicates
        group.all_matched_lookup_keys.concat(e.all_matched_lookup_keys);
        group.orphaned_lookup_keys.concat(e.orphaned_lookup_keys);
        group.missing_lookup_keys.concat(e.missing_lookup_keys);



        // valid_lookups is either null or the same
        groups[e.parent_key].valid_lookups = groups[e.parent_key].valid_lookups || e.valid_lookups
        
      }
    });
  } else {
    // Create the groups acording to the keys

    // The groups look like this:
    // { orphaned_lookup_keys: ["jj"], parent_key: "main3", valid_lookups: ["joel@basho.com", "joeljacobson"] }
    // in case the view is queried in a grouped way there will only be one parent_key
    // if they are queried un grouped ther will be N
    var ck;
    var group;
    for(k = 0; k < keys.length; k++) {
      // process the keys in groups
      if(keys[k] != ck) {
        ck = keys[k];
        //groups[ck] = {all_matched_lookup_keys : [], orphaned_lookup_keys: [], parent_key: ck, valid_lookups: null, missing_lookup_keys: null, num_orphaned_lookup_keys: 0};
        groups[ck] = {parent_key: ck, all_matched_lookup_keys : [], valid_lookups: null, orphaned_lookup_keys: [], missing_lookup_keys: null, 
          num_matched_lookups : 0, num_valid_lookups : 0, num_orphaned_lookup_keys : 0, num_missing_lookups : 0};
          
        group = groups[ck];
      }
      //if $isSource exists - then this is the main document - 
      ///therefore $isSource and break
      if(values[k][0] == "$isSource"){
        values[k].shift();
        group.valid_lookups = values[k];     
        //initialise missing keys with valid_lookups  
        group.missing_lookup_keys = group.valid_lookups.slice(0);

      }
      //then the result is a lookup - add it to the group's orphaned_lookup_keys array
      else {
        //add lookup to stake keys - for later processing
        group.orphaned_lookup_keys.push(values[k][0]);
        //no need to add to missing_lookup_keys - because that already initisalised to all valid keys
        //but need to add to all_matched_lookup_keys
        group.all_matched_lookup_keys.push(values[k][0]);
      }
    }
  }

  // now reduce the groups down to the missmatches
  // anytime there is no missmatch nothing needs to be stored, the end result is
  // and index which contains just the missmatches globally. Depending on the
  // number of missmatches it's probably a good idea to query it grouped and paged
  // if you expect many.

  // The result is a structure like this:
  // {"values":[],"parent_key":"main1","valid_lookups":["philipp.fehre@gmail.com","ischi"],"num_matched_lookups":0, "num_orphaned_lookup_keys":0, "num_valid_lookups":0, "num_missing_lookups":0 ,"missmatches":1}
  //
  // orphaned_lookup_keys: indicate all references which should not be present because they are not present in the main document
  // parent_key: the parent_key of the main document
  // main: all the references that were checked, if main is null the main document is missing
  // missmatches: the number if incorrect references, either missing or wrong

  var curr;
  var res = [];
  var num_orphaned_lookup_keys = 0;

  var debug = false;
  var output = "|"; for(o in groups) { output += groups[o].orphaned_lookup_keys; } output += "|"; 

  function removeA(arr) {
    var what, a = arguments, L = a.length, ax;
    while (L > 1 && arr.length) {
        what = a[--L];
        while ((ax= arr.indexOf(what)) !== -1) {
            arr.splice(ax, 1);
        }
    }
    return arr;
  }

  for(k in groups) {
    for(o in groups) { output += groups[o].orphaned_lookup_keys; } output += "|"; 
    curr = groups[k];

    if(!curr.valid_lookups) {
      // the main document is missing, needs to be checked!
      curr.missmatches = "all";
      res.push(curr);
    } else {
      //var indexesToRemoveFrom_stale_lookup_keys_by_idx = [];
      var indexesToRemoveFrom_stale_lookup_keys_by_val = [];
      var indexesToRemoveFrom_missing_lookup_keys_by_val = [];
      curr.orphaned_lookup_keys.forEach(function(e, idx) {
        //if the value does not exist in the valid_lookups array - then this lookup is stale
        if(curr.valid_lookups.indexOf(e) == -1) {
          curr.num_orphaned_lookup_keys++;
        } 
        //if value exists in the valid_lookups array - then all is good - therefore, we can remove this from the orphaned_lookup_keys
        else {
          //indexesToRemoveFrom_stale_lookup_keys_by_idx.push(idx);
          indexesToRemoveFrom_stale_lookup_keys_by_val.push(e);
          //output += "idx=" + idx + ", e=" + e + "|";
        }

      });
      curr.missing_lookup_keys.forEach(function(e, idx) {
        //if the value matches - then it exists in the all_matched_lookup_keys array - then this lookup is NOT missing
        if(curr.all_matched_lookup_keys.indexOf(e) != -1) {
          //curr.num_orphaned_lookup_keys++;
          indexesToRemoveFrom_missing_lookup_keys_by_val.push(e);
        } 

      });
      // remove all the items we have matched from the orphaned_lookup_keys
      /*indexesToRemoveFrom_stale_lookup_keys_by_idx.forEach(function(idx) {
        //curr.orphaned_lookup_keys.splice(idx, 1);
        curr.orphaned_lookup_keys.splice(idx, 1);
      });*/
      for(var skey in indexesToRemoveFrom_stale_lookup_keys_by_val) {
        output += "skey=" + indexesToRemoveFrom_stale_lookup_keys_by_val[skey] + "|";
        removeA(curr.orphaned_lookup_keys, indexesToRemoveFrom_stale_lookup_keys_by_val[skey]);
      };
      for(var mkey in indexesToRemoveFrom_missing_lookup_keys_by_val) {
        output += "mkey=" + indexesToRemoveFrom_missing_lookup_keys_by_val[mkey] + "|";
        removeA(curr.missing_lookup_keys, indexesToRemoveFrom_missing_lookup_keys_by_val[mkey]);
      };      

      curr.num_matched_lookups = curr.all_matched_lookup_keys.length;
      curr.num_valid_lookups = curr.valid_lookups.length;
      curr.num_orphaned_lookup_keys = curr.orphaned_lookup_keys.length;
      curr.num_missing_lookups = curr.missing_lookup_keys.length;

      //curr.missmatches = curr.num_orphaned_lookup_keys + (curr.valid_lookups.length - curr.matched);
      //curr.missmatches = curr.num_valid_lookups - curr.num_matched_lookups;      
      if(curr.num_orphaned_lookup_keys > 0 || curr.num_missing_lookups > 0) curr.missmatches = -1;
      else curr.missmatches = 0;

      if(curr.missmatches != 0) {
        res.push(curr);
      }
    }
  }
  for(o in groups) { output += groups[o].orphaned_lookup_keys; } output += "|";  
  if(debug)
  return output;
  return res;
}
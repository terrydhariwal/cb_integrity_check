Handle inconsistencies with referential documents in Couchbase
==============================================================

In Couchbase a common pattern to access data is to create referential keys to
those documents. For example if a user should be able to login via his email and
twitter handle we create a document for each, and let it point back to the
original user document

```
main1: {
  type: "user",
  email: "me@example.com"
  twitter: "example"
}
```

```
em:me@example.com: "main1"
tw:example: "main1"
```

Since the creation of those keys is handled inside the application it can go out
of sync. The included views check for this.

When you query the view it will tell you any inconsistency which you can then
fix.

```
{
rows: [{
  key: null,
  value: [
    {
      values: [ "me@example.com" ],
      key: "main99",
      main: null,
      miss: 0,
      matched: 0,
      missmatches: "all"
    },
    {
      values: [ "jj" ],
      key: "main3",
      main: [ "joel@basho.com", "joeljacobson" ],
      miss: 1,
      matched: 2,
      missmatches: 1
    },
    {
      values: [ ],
      key: "main1",
      main: [ "philipp.fehre@gmail.com", "ischi" ],
      miss: 0,
      matched: 1,
      missmatches: 1
    },
    {
      values: [ ],
      key: "main0",
      main: [ "foo@bar.com", "foo" ],
      miss: 0,
      matched: 0,
      missmatches: 2
    }
  ]
}]
}
```

* The _missmatches_ field indicates the number of errors in the referential keys
  related to the document. A value of "all" means the main document is missing.
* The _key_ field indicates the key of the main document where the referential keys
  point to.
* The _values_ field indicate any referential keys that are invalid.
* The _main_ field indicates all the referential keys that should be present.

Any documents that do not contain errors are not present in the full reduce.

## Usage
Query the view with full reduce, and fix any error according to the description
above. In case there are a lot of errors it might be a good idea to crawl the
view group by one level and search for any not empty values.

## Install sample data
The included sample data shows how to work with it install it via

```
cbrestore ./sample_data/2014-09-22T082005Z http://localhost:8091 my_bucket
```


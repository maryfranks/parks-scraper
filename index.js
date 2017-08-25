const fs = require('fs');
const Nightmare = require('nightmare');
const nm = Nightmare({show: true});
const baseUrl = 'http://www.ontarioparks.com';
let acc = [];

// step 1: gets main park page urls and stores them in array called uniqueParks
nm.goto(`${baseUrl}/parksguide`)
  .evaluate(function() {
    let results = [];
    let parkLinks = document.querySelectorAll('.col-xs-3 a');

    for(let i=0; i < parkLinks.length; i++) {
      results.push(parkLinks[i].getAttribute('href'));
    }

    // parkLinks has some duplicates for sites like Algonquin that have more
    // than one campsite link in the main list
    let uniqueParks = results.filter(function (value, index, self) {
        return self.indexOf(value) === index;
    });

    return uniqueParks;

  }).then(crawl).catch(bail);

  nm.goto(`${baseUrl}/parksguide`)
    .evaluate(function() {
      let results = []
      let parkFeaturesURLs = [];

      let parkLinks = document.querySelectorAll('.col-xs-3 a');

      for(let i=0; i < parkLinks.length; i++) {
        results.push(parkLinks[i].getAttribute('href'));
      }

      // parkLinks has some duplicates for sites like Algonquin that have more
      // than one campsite link in the main list
      let uniqueParks = results.filter(function (value, index, self) {
          return self.indexOf(value) === index;
      });

      uniqueParks.map(function (park) {
        let campingURL = park + '/camping';
        parkFeaturesURLs.push(campingURL);
        let activitiesURL = park + '/activities';
        parkFeaturesURLs.push(activitiesURL);
        let facilitiesURL = park + '/facilities';
        parkFeaturesURLs.push(facilitiesURL);
      });

      return parkFeaturesURLs;

    }).then(crawl).then(write).catch(bail);

// step 2: set of subpages with the real info we want and stores in array parkFeaturesURLs

// recursive function: another way to loop
function crawl(urls) {
  if (urls.length < 2) {
    nm.goto(baseUrl + urls.pop())
      .evaluate(scrape, acc)
      .catch(bail);
  } else {
    nm.goto(baseUrl + urls.pop())
      .evaluate(scrape, acc)
      .then(function(result) {
        acc = result;
        crawl(urls);
      })
      .catch(bail);
  }
}

function scrape(acc) {
  let result = {};

  // get the park name
  result['name'] = document.querySelector('h1').innerText;

  // main park info
  let parkInfo = document.querySelectorAll('.panel-body div');
  result['address'] = parkInfo[1].innerText;
  result['phone'] = parkInfo[0].innerText;

  // get the park features as boolean values from the features URLs
  let keys = document.querySelectorAll('.tab-content h2');
  for (let i = 0; i < keys.length; i++) {
    let words = keys[i].innerText.trim().split(' ')
    let key = words.map(function(w, i) {
      return w.toLowerCase();
    }).join('_');
    result[key] = true;
  }

  acc.push(result);
  return acc;
}

function write(result) {
  acc = result;
  let parks = { ontarioParks: acc };
  // add feature: if file does not exist then create it
  // when it tries to write it throws an error
  fs.writeFileSync('results/ontarioparks.json', JSON.stringify(parks), 'utf8');
  console.log(`Finished scraping ${acc.length} parks to results/ontarioparks.json`);
}

function bail(err) {
  console.error(err);
}

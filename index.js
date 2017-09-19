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

    let uniqueParks = results.filter(function (value, index, self) {
        return self.indexOf(value) === index;
    });

    for (var i = 0; i < uniqueParks.length; i++) {
      if (uniqueParks[i] === "/park/thepinery") {
        uniqueParks[i] = "/park/pinery"
      }
    }

    uniqueParks.map(function (park) {
      let campingURL = park + '/camping';
      uniqueParks.push(campingURL);
      let activitiesURL = park + '/activities';
      uniqueParks.push(activitiesURL);
      let facilitiesURL = park + '/facilities';
      uniqueParks.push(facilitiesURL);
    });

    return uniqueParks;

  }).then(crawl).catch(bail);

// recursive function: another way to loop
function crawl(urls) {
  if (urls.length < 2) {
    nm.goto(baseUrl + urls.pop())
      .evaluate(scrape, acc)
      .end()
      .then(function(result) {
        acc = result;
        let parks = { ontarioParks: acc };
        // add feature: if file does not exist then create it
        // when it tries to write it throws an error
        fs.writeFileSync('results/ontarioparks.json', JSON.stringify(parks), 'utf8');
        console.log(`Finished scraping ${acc.length} parks to results/ontarioparks.json`);
      })
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

  // get the park name (probably from both types of pages)
  result['name'] = document.querySelector('h1').innerText;
  result['url'] = document.URL

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

function bail(err) {
  console.error(err);
}

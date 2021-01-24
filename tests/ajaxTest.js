const https = require('https');

let manifest
let jsonWorldContent

let baseURL = 'https://www.bungie.net';
let apiRoot = baseURL + '/Platform';
let endpointPath = '/Destiny2/Manifest/';

https.get(apiRoot + endpointPath, {
    
})

// $.ajax({
//     type: 'GET',
//     url: apiRoot + endpointPath,
//     headers: {
//         'X-API-Key': 'cd4e01bd37b74c789af6a1479fa62801'
//     }
// }).then((res) => {
//     manifest = res;
// });

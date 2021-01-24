const https = require('https');

let manifest
let jsonWorldContent

let baseURL = 'https://www.bungie.net';
let apiRoot = baseURL + '/Platform';
let endpointPath = '/Destiny2/Manifest/';

https.get(apiRoot + endpointPath, { headers: { 'X-API-Key': 'cd4e01bd37b74c789af6a1479fa62801' } }, (res) => {
    console.log(res.statusCode);

    res.on('data', d => { manifest += d });

    // res.on('end', () => { manifest = JSON.parse(manifest); console.log(manifest); });
}).on('finish', () => { console.log(manifest); });

// $.ajax({
//     type: 'GET',
//     url: apiRoot + endpointPath,
//     headers: {
//         'X-API-Key': 'cd4e01bd37b74c789af6a1479fa62801'
//     }
// }).then((res) => {
//     manifest = res;
// });

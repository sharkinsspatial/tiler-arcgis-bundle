var Tiler = require('../index'),
    fs = require('fs'),
    assert = require('assert');

var tiler = new Tiler(__dirname+'/sample');

tiler.getTile(0xd50, 0x971, 2, function(error, tile) {
    if (error) {
        throw error;
    }
    assert.ok(tile);
    assert.ok(!isNaN(Date.parse(tile.lastModified)));
    assert.deepEqual(tile.data, fs.readFileSync(__dirname + '/tile.png'));
    console.log('success!');
});

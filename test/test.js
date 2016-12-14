var Tiler = require('../index'),
    fs = require('fs'),
    assert = require('assert'),
    rimraf = require('rimraf');

var tiler = new Tiler(__dirname+'/sample');
var testtmp = '/testtmp';
var sink = new Tiler(__dirname + testtmp);

tiler.getTile(0xd50, 0x971, 2, function(error, tile) {
    if (error) {
        throw error;
    }
    assert.ok(tile);
    assert.ok(!isNaN(Date.parse(tile.lastModified)));
    assert.deepEqual(tile.data, fs.readFileSync(__dirname + '/tile.png'));
    console.log('success!');
});

var x = 0xd50;
var y = 0x971;
var z = 2;
tiler.getTile(x, y, z, function(error, tile, headers) {
    if (error) {
        throw error;
    }
    sink.putTile(x, y, z, tile.data, function(err) {
        if (error) {
            rimraf(__dirname + testtmp, function(err) {
                console.log('Tmp removed');
            });
            throw error;
        }
        sink.getTile(x, y, z, function(err, tile) {
            if (error) {
                throw error;
            }
            var origTile = fs.readFileSync(__dirname + '/tile.png');
            assert.deepEqual(tile.data, origTile);
            console.log('putTile success!');
            sink.getTile(0xD51, y, z, function(err, emptyTile) {
                if (error) {
                    throw error;
                }
                assert.equal(emptyTile.data.length, 0);
                rimraf(__dirname + testtmp, function(err) {
                    console.log('testtmp removed');
                });
            });
        });
    });
});

/* eslint no-console: ["error", { allow: ["warn", "error", "log"] }] */
var Tiler = require('../index');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var rimraf = require('rimraf');
var tiler = new Tiler(path.join(__dirname, 'sample'));
var sampleTile = path.join(__dirname, 'tile.png');
var testtmp = path.join(__dirname, 'testtmp');
var sink = new Tiler(testtmp);

tiler.getTile(0xd50, 0x971, 2, function (error, tile) {
    if (error) {
        throw error;
    }
    assert.ok(tile);
    assert.ok(!isNaN(Date.parse(tile.lastModified)));
    assert.deepEqual(tile.data, fs.readFileSync(sampleTile));
    console.log('success!');
});

var x = 0xd50;
var y = 0x971;
var z = 2;

tiler.getTile(x, y, z, function (error, tile) {
    if (error) {
        throw error;
    }
    sink.putTile(x, y, z, tile.data, function (putError) {
        if (putError) {
            rimraf(testtmp, function () {
                console.log('Tmp removed');
            });
            throw putError;
        }
        sink.getTile(x, y, z, function (getError, newTile) {
            if (getError) {
                throw getError;
            }
            var origTile = fs.readFileSync(sampleTile);
            assert.deepEqual(newTile.data, origTile);
            console.log('putTile success!');
            sink.getTile(0xD51, y, z, function (emptyError, emptyTile) {
                if (emptyError) {
                    throw error;
                }
                assert.equal(emptyTile.data.length, 0);
                //fs.open(__dirname + testtmp + '_allLayers/L02/R0900C0d00.bundle',
                        //'r', function(err, fd) {
                        //});
                rimraf(testtmp, function (removeErr) {
                    if (removeErr) {
                        throw removeErr;
                    }
                    console.log('testtmp removed');
                });
            });
        });
    });
});

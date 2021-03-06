var os = require('os');
var fs = require('fs');
var util = require('util');
var path = require('path');
var mkdirp = require('mkdirp');

/**
 * Constructor for the tiler-arcgis-bundle
 *
 * @param {String} root - the root folder of ArcGIS bundle tiles, where the Conf.xml stands.
 * @param {Number} packSize - the pack size of images in the bundle.
 * @class
 */
function tiler(root, packSize) {
    this.root = root;
    if (!packSize) {
        this.packSize = 128;
    } else {
        this.packSize = packSize;
    }
}

/**
 * Get a tile, Schema is XYZ.
 * Structure of the result tile is :
 * {
 *  lastModified : {Date} Time when tile file last modified
 *  data         : {Buffer}
 * }
 * @param {Number} x - tile x coordinate.
 * @param {Number} y - tile y coordinate.
 * @param {Number} z - tile z coordinate.
 * @param {Function(error, tile)} callback - tile x coordinate.
 * @return  {Object} tile data.
 */
tiler.prototype.getTile = function getTile(x, y, z, callback) {
    var packSize = this.packSize;
    var rGroup = parseInt(packSize * parseInt(y / packSize));
    var cGroup = parseInt(packSize * parseInt(x / packSize));
    var bundleBase = getBundlePath(this.root, z, rGroup, cGroup);
    var bundlxFileName = bundleBase + '.bundlx';
    var bundleFileName = bundleBase + '.bundle';
    var index = 128 * (x - cGroup) + (y - rGroup);
    fs.stat(bundleFileName, function (err, stats) {
        if (err) {
            callback(err);
            return;
        }
        readTileFromBundle(bundlxFileName, bundleFileName, index,
                           function (tileError, bytesRead, buffer) {
                               if (tileError) {
                                   callback(tileError);
                                   return;
                               }
                               callback(null, {
                                   'lastModified': stats.mtime,
                                   'data': buffer
                               });
                           });
    });
};

function readTileFromBundle(bundlxFileName, bundleFileName, index, callback) {
    //  get tile's offset in bundleFile from bundlxFile
    var buffer = new Buffer(5);
    fs.open(bundlxFileName, 'r', function (err, lxfd) {
        if (err) {
            callback(err);
            return;
        }
        fs.read(lxfd, buffer, 0, buffer.length, 16 + 5 * index,
                function (indexError, bytesRead, indexBuffer) {
                    fs.closeSync(lxfd);
                    if (indexError) {
                        callback(indexError);
                        return;
                    }
                    // offset for tile data in bundleFile
                    var offset = (indexBuffer[0] & 0xff)
                    + (indexBuffer[1] & 0xff)
                    * 256
                    + (indexBuffer[2] & 0xff)
                    * 65536
                    + (indexBuffer[3] & 0xff)
                    * 16777216
                    + (indexBuffer[4] & 0xff)
                    * 4294967296;
                    readTile(bundleFileName, offset, callback);
                });
    });
}

function readTile(bundleFileName, offset, callback) {
    fs.open(bundleFileName, 'r', function (err, fd) {
        if (err) {
            callback(err);
            return;
        }
        // the start 4 bytes are the length of the tile data.
        var lengthBytes = new Buffer(4);
        fs.read(fd, lengthBytes, 0, lengthBytes.length, offset,
                function (lengthError, bytesRead, buffer) {
                    if (lengthError) {
                        fs.closeSync(fd);
                        callback(lengthError);
                        return;
                    }
                    var length = (buffer[0] & 0xff)
                    + (buffer[1] & 0xff)
                    * 256
                    + (buffer[2] & 0xff)
                    * 65536
                    + (buffer[3] & 0xff)
                    * 16777216;
                    var tileData = new Buffer(length);
                    fs.read(fd, tileData, 0, tileData.length, offset + 4,
                            function (tileError, bytes, tileBuffer) {
                                fs.closeSync(fd);
                                callback(tileError, bytes, tileBuffer);
                            });
                });
    });
}

tiler.prototype.putTile = function (x, y, z, tile, callback) {
    var packSize = this.packSize;
    var rGroup = parseInt(packSize * parseInt(y / packSize));
    var cGroup = parseInt(packSize * parseInt(x / packSize));
    var bundleBase = getBundlePath(this.root, z, rGroup, cGroup);
    var bundlxFileName = bundleBase + '.bundlx';
    var bundleFileName = bundleBase + '.bundle';
    var index = 128 * (x - cGroup) + (y - rGroup);

    writeTileToBundleSync(bundlxFileName, bundleFileName, tile, index, callback);
};

function writeTileToBundleSync(bundlxFileName, bundleFileName, tile,
                               index, callback) {
    var length = new Buffer(4);
    length.writeUIntBE(tile.length, 0, 4);
    var writeBuffer = Buffer.concat([length.reverse(), tile]);

    checkBundleSync(bundleFileName);

    var stats = fs.statSync(bundleFileName);
    var offset = stats.size;

    fs.appendFileSync(bundleFileName, writeBuffer);
    updateHeader(bundleFileName, offset, tile.length);
    writeToBundlxSync(bundlxFileName, offset, index, callback);
}

function checkBundleSync(bundleFileName) {
    if (!fsExistsSync(bundleFileName)) {
        mkdirp.sync(path.dirname(bundleFileName));
        var header = new Buffer(60);
        // Write header values from https://github.com/mapproxy/

        header.writeUInt32LE(3, 0); // 0, fixed
        header.writeUInt32LE(16384, 4); // 1, max number tiles
        header.writeUInt32LE(16, 8); // 2, size of largest tile
        header.writeUInt32LE(5, 12); // 3, fixed
        header.writeUInt32LE(0, 16); // 4, number of tiles in bundle
        header.writeUInt32LE(0, 20); // 5, fixed
        header.writeUInt32LE(0, 24); // 6, bundle size
        header.writeUInt32LE(0, 28); // 7, fixed
        header.writeUInt32LE(40, 32); // 8, fixed
        header.writeUInt32LE(0, 36);  // 9, fixed
        header.writeUInt32LE(16, 40); // 10, fixed
        header.writeUInt32LE(0, 44);  // 11, x0
        header.writeUInt32LE(127, 48); // 12, x1
        header.writeUInt32LE(0, 52); // 13, y0
        header.writeUInt32LE(127, 56); // 14, y1

        fs.appendFileSync(bundleFileName, header);

        // Write empty tile immediately after header
        var length = new Buffer(4);
        length.writeUIntBE(0, 0, 4);

        // Empty buffer necessary for tile readers.
        var emptyBuffer = new Buffer(0);
        emptyBuffer.fill(0);
        // Image length is reversed.
        var writeBuffer = Buffer.concat([length.reverse(), emptyBuffer]);
        fs.appendFileSync(bundleFileName, writeBuffer);
    }
}

function updateHeader(bundleFileName, bundleSize, tileSize) {
    var fd = fs.openSync(bundleFileName, 'r+');

    // Update bundle size
    var bundleSizeBuffer = new Buffer(4);
    bundleSizeBuffer.writeUInt32LE(bundleSize, 0);
    fs.writeSync(fd, bundleSizeBuffer, 0, 4, 24);

    // Update total number of tiles.
    var numberOfTilesBuffer = new Buffer(4);
    fs.readSync(fd, numberOfTilesBuffer, 0, 4, 16);
    var numberOfTiles = numberOfTilesBuffer.readUInt32LE(0);
    var currentNumberOfTilesBuffer = new Buffer(4);
    currentNumberOfTilesBuffer.writeUInt32LE(numberOfTiles++, 0);
    fs.writeSync(fd, currentNumberOfTilesBuffer, 0, 4, 16);

    // Update largest tile value
    var largestTileBuffer = new Buffer(4);
    fs.readSync(fd, largestTileBuffer, 0, 4, 8);
    var largestTileSize = largestTileBuffer.readUInt32LE(0);
    if (tileSize > largestTileSize) {
        var newLargestTileBuffer = new Buffer(4);
        newLargestTileBuffer.writeUInt32LE(tileSize, 0);
        fs.writeSync(fd, newLargestTileBuffer, 0, 4, 8);
    }

    fs.fsyncSync(fd);
    fs.closeSync(fd);
}

function fsExistsSync(dir) {
    try {
        fs.accessSync(dir);
        return true;
    } catch (e) {
        return false;
    }
}

function writeToBundlxSync(bundlxFileName, offset, index, callback) {
    // Bundle offset is first 5 bytes.
    var offsetBuffer = new Buffer(5);
    offsetBuffer.fill(0);
    if (os.endianness() === 'BE') {
        offsetBuffer.writeUInt32BE(offset, 0);
    } else {
        offsetBuffer.writeUInt32LE(offset, 0);
    }
    var position = 16 + 5 * index;

    if (!fsExistsSync(bundlxFileName)) {
        var buffer = new Buffer(81952);
        // Use offset of 60 for empty tile.
        var emptyOffset = new Buffer(5);
        emptyOffset.fill(0);
        if (os.endianness() === 'BE') {
            emptyOffset.writeUInt32BE(60, 0);
        } else {
            emptyOffset.writeUInt32LE(60, 0);
        }
        // Account for 16 Byte header and footer when
        // filling with empty offset pointers
        buffer.fill(0, 0, 16);
        buffer.fill(emptyOffset, 16, 81936);
        buffer.fill(0, 81936, 81952);

        fs.appendFileSync(bundlxFileName, buffer);
    }
    // r+ flag necessary for writing on Linux as a+ is not handled by kernel.
    var fd = fs.openSync(bundlxFileName, 'r+');
    fs.writeSync(fd, offsetBuffer, 0, offsetBuffer.length, position);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    callback(null);
}

function getBundlePath(root, level, rGroup, cGroup) {
    var bundlesDir = root;
    var l = level.toString();
    var lLength = l.length;
    var i;
    if (lLength < 2) {
        for (i = 0; i < 2 - lLength; i++) {
            l = '0' + l;
        }
    }
    l = 'L' + l;

    var r = parseInt(rGroup, 10).toString(16);
    var rLength = r.length;
    if (rLength < 4) {
        for (i = 0; i < 4 - rLength; i++) {
            r = '0' + r;
        }
    }
    r = 'R' + r;

    var c = parseInt(cGroup, 10).toString(16);
    var cLength = c.length;
    if (cLength < 4) {
        for (i = 0; i < 4 - cLength; i++) {
            c = '0' + c;
        }
    }
    c = 'C' + c;
    var bundlePath = util.format('%s/_alllayers/%s/%s%s', bundlesDir, l, r, c);
    return bundlePath;
}

exports = module.exports = tiler;

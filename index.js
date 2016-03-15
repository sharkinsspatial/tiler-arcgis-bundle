var fs = require('fs'),
    util = require('util');

var gridRowCnt = 128;
var gridColCnt = 128;

/**
 * Constructor for the tiler-arcgis-xyz
 * 
 * @param {String} root - the root folder of ArcGIS compact tiles, where the Conf.xml stands.
 * @class
 */
function tiler(root) {
    this.root = root;
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
tiler.prototype.getTile=function(x, y, z, callback) {
		var rGroup = parseInt(gridRowCnt * parseInt(y / gridRowCnt));
		var cGroup = parseInt(gridColCnt * parseInt(x / gridColCnt));
		var bundleBase = getBundlePath(this.root, z, rGroup, cGroup);
		var bundlxFileName = bundleBase + ".bundlx";
		var bundleFileName = bundleBase + ".bundle";
		var index = 128 * (x - cGroup) + (y - rGroup);

        fs.stat(bundleFileName, function(err, stats) {
            if (err) {
                callback(err);
                return;
            }    
            readTileFromBundle(bundlxFileName, bundleFileName, index, function(err, bytesRead, buffer) {
                if (err) {
                    callback(err);
                    return;
                }
                callback(null, {
                    'lastModified' : stats.mtime,
                    'data'         : buffer 
                })
            });
        });      	
}

function readTileFromBundle(bundlxFileName, bundleFileName, index, callback) {
    //get tile's offset in bundleFile from bundlxFile
    var buffer = new Buffer(5);
    fs.open(bundlxFileName,'r',function(err, lxfd) {
        if (err) {
            callback(err);
            return;
        }
        fs.read(lxfd, buffer, 0, buffer.length, 16 + 5 * index, function(err, bytesRead, buffer) {
            fs.closeSync(lxfd);           
            if (err) {
                callback(err);
                return;
            }
            //offset for tile data in bundleFile
            var offset = (buffer[0] & 0xff)
                    + (buffer[1] & 0xff)
                    * 256
                    + (buffer[2] & 0xff)
                    * 65536
                    + (buffer[3] & 0xff)
                    * 16777216
                    + (buffer[4] & 0xff)
                    * 4294967296;
            readTile(bundleFileName, offset, callback);
        });		
    });
    
}

function readTile(bundleFileName, offset, callback) {
    fs.open(bundleFileName,'r',function(err, fd){
        if (err) {
            callback(err);
            return;
        }
       //the start 4 bytes are the length of the tile data.
        var lengthBytes = new Buffer(4);
        fs.read(fd, lengthBytes, 0, lengthBytes.length, offset, function(err, bytesRead, buffer) {
            if (err) {
                fs.closeSync(fd);
                callback(err);
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
            fs.read(fd, tileData, 0, tileData.length, offset + 4, function(err, bytesRead, buffer) {
                fs.closeSync(fd);
                callback(err, bytesRead, buffer);
            });
        });
    });
            
}

function getBundlePath(root, level, rGroup, cGroup) {
		var bundlesDir = root;
		var l = level.toString();
		var lLength = l.length;
		if (lLength < 2) {
			for (var i = 0; i < 2 - lLength; i++) {
				l = "0" + l;
			}
		}
		l = "L" + l;

		var r = parseInt(rGroup,10).toString(16);
		var rLength = r.length;
		if (rLength < 4) {
			for (var i = 0; i < 4 - rLength; i++) {
				r = "0" + r;
			}
		}
		r = "R" + r;

		var c = parseInt(cGroup,10).toString(16);
		var cLength = c.length;
		if (cLength < 4) {
			for (var i = 0; i < 4 - cLength; i++) {
				c = "0" + c;
			}
		}
		c = "C" + c;
		var bundlePath = util.format("%s/_alllayers/%s/%s%s", bundlesDir,
				l, r, c);
		return bundlePath;
	}

exports = module.exports = tiler;
# tiler-arcgis-compact

[![Circle CI](https://circleci.com/gh/FuZhenn/tiler-arcgis-compact.svg?style=svg)](https://circleci.com/gh/FuZhenn/tiler-arcgis-compact)

A map tile reader for compact tiles by ESRI ArcGIS.

## Introduction
[ArcGIS Compact Tile](https://server.arcgis.com/zh-cn/server/latest/publish-services/windows/inside-the-compact-cache-storage-format.htm) is a tile format since ArcGIS version 10.

It bundles exploded tile files into a .bundlx and a .bundle file and really reduces number of tile files.

This library is a reader for the bundles.

PLEASE NOTICE: this library is not available for the improved compact format introduced in ArcGIS 10.3, And we are working on the upgrade. 

## See Also
[tiler-xyz](https://github.com/FuZhenn/tiler-xyz):
a nodejs map tile file reader coordinating by X,Y,Z

[tiler-mbtiles](https://github.com/FuZhenn/tiler-mbtiles):
a nodejs map tile reader for mapbox mbtiles format.

[tiler-arcgis-xyz](https://github.com/FuZhenn/tiler-arcgis-xyz):
a nodejs map tile reader for exploded tiles by ESRI ArcGIS

## Install

```bash
npm install tiler-arcgis-compact
```

## Usage

```javascript
var Tiler = require('tiler-arcgis-compact');
//root folder of the tiles, where the Conf.xml stands
var tiler = new Tiler('/home/foo/compact_tiles/');
//tile's x,y,z
tiler.getTile(3408, 2417, 2, function(error, tile) {
    if (error) {
        throw error;
    }
    console.log(tile.lastModified);
    fs.writeFileSync('foo.png', tile.data);
});
```
